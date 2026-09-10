import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db, entitiesTable, researchCaseEventsTable, researchCasesTable } from "@workspace/db";
import { OpenBureauDiscoveryCaseBody, GetBureauCaseParams, ListResearchCaseEventsQueryParams } from "@workspace/api-zod";
import {
  buildDiscoveryCaseFile,
  buildBossOpeningPrompt,
  DEFAULT_DISCOVERY_MOTIVATION,
  DEFAULT_DISCOVERY_OBJECTIVE,
  resolveGeminiBossModel,
} from "../../lib/case-bureau";
import { computeDiscoveryQualityMetrics } from "../../lib/discovery-metrics";

const router = Router();

function serializeCase(
  row: typeof researchCasesTable.$inferSelect,
  entity: { name: string; type: string } | null,
) {
  let progressSummary: Record<string, unknown> | null = null;
  let discoveryQuality: ReturnType<typeof computeDiscoveryQualityMetrics> | null = null;
  try {
    const parsed = JSON.parse(row.caseFile) as Record<string, unknown>;
    const progress = parsed.investigationProgress as Record<string, unknown> | undefined;
    const bossPlan = parsed.bossPlan as Record<string, unknown> | undefined;
    const lanesHonesty = (parsed.lastLanesHonesty as Record<string, unknown> | undefined) ?? null;
    if (progress || bossPlan || lanesHonesty) {
      progressSummary = {
        coverageRatio: typeof progress?.coverageRatio === "number" ? progress.coverageRatio : 0,
        foundAnyCount: typeof progress?.foundAnyCount === "number" ? progress.foundAnyCount : 0,
        foundPersonalCount: typeof progress?.foundPersonalCount === "number" ? progress.foundPersonalCount : 0,
        pendingVectors: Array.isArray(progress?.pendingVectors) ? progress.pendingVectors : [],
        noProgressStreak: typeof parsed.noProgressStreak === "number" ? parsed.noProgressStreak : null,
        bossOutcome: typeof bossPlan?.outcome === "string" ? bossPlan.outcome : null,
        progressAssessment: typeof bossPlan?.progressAssessment === "string" ? bossPlan.progressAssessment : null,
        rightHandDisposition: typeof bossPlan?.rightHandDisposition === "string" ? bossPlan.rightHandDisposition : null,
        rightHandNote: typeof bossPlan?.rightHandNote === "string" ? bossPlan.rightHandNote : null,
        lanesHonesty,
      };
    }
    const candidates = parsed.discoveredCandidates;
    if (Array.isArray(candidates) && candidates.length > 0) {
      discoveryQuality = computeDiscoveryQualityMetrics(candidates as Array<{
        name: string;
        type?: string | null;
        relevance?: string | null;
        reachability?: string | null;
        contactEvidence?: Array<{ value?: string | null }> | null;
      }>);
    }
  } catch {
    // A malformed historical case file must not make the read endpoint crash.
  }
  return {
    ...row,
    targetEntityName: entity?.name ?? null,
    targetEntityType: entity?.type ?? null,
    lastDecisionAt: row.lastDecisionAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    progressSummary,
    discoveryQuality,
  };
}

async function loadCase(caseId: number) {
  const [row] = await db.select({
    case: researchCasesTable,
    entityName: entitiesTable.name,
    entityType: entitiesTable.type,
  }).from(researchCasesTable)
    .leftJoin(entitiesTable, eq(researchCasesTable.targetEntityId, entitiesTable.id))
    .where(eq(researchCasesTable.id, caseId))
    .limit(1);
  return row ?? null;
}

// Case creation is data-plane work only. It establishes durable context; it does not
// execute research, choose a research lane, or force an Investigator action.
router.post("/research/bureau/cases", async (req, res): Promise<void> => {
  const parsed = OpenBureauDiscoveryCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const objective = parsed.data.objective.trim() || DEFAULT_DISCOVERY_OBJECTIVE;
  const motivation = parsed.data.motivation.trim() || DEFAULT_DISCOVERY_MOTIVATION;
  const caseFile = buildDiscoveryCaseFile({
    objective,
    motivation,
    geography: parsed.data.geography,
    exclusions: parsed.data.exclusions,
  });
  const openingPrompt = buildBossOpeningPrompt({
    objective,
    motivation,
    geography: parsed.data.geography,
    exclusions: parsed.data.exclusions,
  });
  const bossModel = await resolveGeminiBossModel();
  const [created] = await db.insert(researchCasesTable).values({
    targetEntityId: null,
    caseType: "discovery",
    status: "ready",
    directorMode: "gemini_boss_pending",
    directorProvider: "gemini",
    directorModel: bossModel.model,
    objective,
    motivation,
    openingPrompt,
    caseFile: JSON.stringify(caseFile),
    currentAction: "awaiting_boss_control",
    iteration: 0,
  }).returning();
  if (!created) {
    res.status(500).json({ error: "Unable to open discovery case" });
    return;
  }
  await db.insert(researchCaseEventsTable).values({
    caseId: created.id,
    actorRole: "head_investigator",
    eventType: "case_opened",
    summary: "Discovery case opened; durable context created without executing research.",
    payload: JSON.stringify({
      caseType: "discovery",
      directorProvider: "gemini",
      directorModel: bossModel.model,
      modelSelectionStatus: bossModel.status,
      modelCandidateCount: bossModel.candidateCount,
    }),
  });
  res.status(201).json(serializeCase(created, null));
});

router.get("/research/bureau/cases/latest", async (_req, res): Promise<void> => {
  const [row] = await db.select({
    case: researchCasesTable,
    entityName: entitiesTable.name,
    entityType: entitiesTable.type,
  }).from(researchCasesTable)
    .leftJoin(entitiesTable, eq(researchCasesTable.targetEntityId, entitiesTable.id))
    .where(eq(researchCasesTable.caseType, "discovery"))
    .orderBy(desc(researchCasesTable.updatedAt))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "No discovery case exists" });
    return;
  }
  res.json(serializeCase(row.case, row.entityName ? { name: row.entityName, type: row.entityType ?? "Unknown" } : null));
});

router.get("/research/bureau/cases/:caseId", async (req, res): Promise<void> => {
  const params = GetBureauCaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const row = await loadCase(params.data.caseId);
  if (!row) {
    res.status(404).json({ error: "Bureau case not found" });
    return;
  }
  res.json(serializeCase(row.case, row.entityName ? { name: row.entityName, type: row.entityType ?? "Unknown" } : null));
});

router.get("/research/bureau/cases/:caseId/events", async (req, res): Promise<void> => {
  const caseId = Number(req.params.caseId);
  const query = ListResearchCaseEventsQueryParams.safeParse(req.query);
  if (!Number.isInteger(caseId) || caseId <= 0) {
    res.status(400).json({ error: "Invalid bureau case ID" });
    return;
  }
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const [current] = await db.select({ id: researchCasesTable.id })
    .from(researchCasesTable)
    .where(eq(researchCasesTable.id, caseId))
    .limit(1);
  if (!current) {
    res.status(404).json({ error: "Bureau case not found" });
    return;
  }
  const rows = await db.select().from(researchCaseEventsTable)
    .where(eq(researchCaseEventsTable.caseId, current.id))
    .orderBy(desc(researchCaseEventsTable.createdAt))
    .limit(query.data.limit);
  res.json(rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })));
});

export default router;
