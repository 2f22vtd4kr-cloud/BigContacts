import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import {
  db,
  entitiesTable,
  researchCaseEventsTable,
  researchCasesTable,
} from "@workspace/db";
import {
  AddResearchCaseDirectiveBody,
  AddResearchCaseDirectiveParams,
  AdvanceResearchCaseParams,
  GetResearchCaseParams,
  ListResearchCaseEventsParams,
  ListResearchCaseEventsQueryParams,
  OpenResearchCaseBody,
  GetBureauCaseParams,
  OpenBureauDiscoveryCaseBody,
  PromoteBureauCaseTargetBody,
  PromoteBureauCaseTargetParams,
  RecordBureauInitialResearchBody,
  RecordBureauInitialResearchParams,
} from "@workspace/api-zod";
import {
  advanceCaseFile,
  buildBossOpeningPrompt,
  buildDiscoveryCaseFile,
  buildInitialCaseFile,
  GEMINI_BOSS_MODEL,
  parseDiscoveryCaseFile,
  parseCaseFile,
  DEFAULT_DISCOVERY_MOTIVATION,
  DEFAULT_DISCOVERY_OBJECTIVE,
} from "../../lib/case-bureau";

const router = Router();

function serializeCase(
  row: typeof researchCasesTable.$inferSelect,
  entity: { name: string; type: string } | null,
) {
  return {
    ...row,
    targetEntityName: entity?.name ?? null,
    targetEntityType: entity?.type ?? null,
    lastDecisionAt: row.lastDecisionAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeBureauCase(
  row: typeof researchCasesTable.$inferSelect,
  entity: { name: string; type: string } | null,
) {
  return serializeCase(row, entity);
}

async function findCase(entityId: number) {
  const [row] = await db.select().from(researchCasesTable).where(eq(researchCasesTable.targetEntityId, entityId)).limit(1);
  return row ?? null;
}

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
  const [created] = await db.insert(researchCasesTable).values({
    targetEntityId: null,
    caseType: "discovery",
    status: "ready",
    directorMode: "gemini_boss_pending",
    directorProvider: "gemini",
    directorModel: GEMINI_BOSS_MODEL,
    objective,
    motivation,
    openingPrompt,
    caseFile: JSON.stringify(caseFile),
    currentAction: caseFile.initialAction.id,
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
    summary: "Discovery case opened; Boss opening brief is ready for Gemini public-web research.",
    payload: JSON.stringify({
      caseType: "discovery",
      directorProvider: "gemini",
      directorModel: GEMINI_BOSS_MODEL,
      openingPromptReady: true,
    }),
  });
  res.status(201).json(serializeBureauCase(created, null));
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
  res.json(serializeBureauCase(row.case, row.entityName ? { name: row.entityName, type: row.entityType ?? "Unknown" } : null));
});

router.get("/research/bureau/cases/:caseId", async (req, res): Promise<void> => {
  const params = GetBureauCaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select({
    case: researchCasesTable,
    entityName: entitiesTable.name,
    entityType: entitiesTable.type,
  }).from(researchCasesTable)
    .leftJoin(entitiesTable, eq(researchCasesTable.targetEntityId, entitiesTable.id))
    .where(eq(researchCasesTable.id, params.data.caseId))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Bureau case not found" });
    return;
  }
  res.json(serializeBureauCase(row.case, row.entityName ? { name: row.entityName, type: row.entityType ?? "Unknown" } : null));
});

router.post("/research/bureau/cases/:caseId/initial-research", async (req, res): Promise<void> => {
  const params = RecordBureauInitialResearchParams.safeParse(req.params);
  const body = RecordBureauInitialResearchBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [current] = await db.select().from(researchCasesTable)
    .where(eq(researchCasesTable.id, params.data.caseId))
    .limit(1);
  if (!current) {
    res.status(404).json({ error: "Bureau case not found" });
    return;
  }
  const file = parseDiscoveryCaseFile(current.caseFile);
  if (!file) {
    res.status(409).json({ error: "Initial research can only be recorded on a discovery case" });
    return;
  }
  const now = new Date();
  const updatedFile = {
    ...file,
    initialResearch: {
      status: "recorded" as const,
      researchResponse: body.data.researchResponse.trim(),
      bossCommentary: body.data.bossCommentary?.trim() || null,
      sourceUrls: body.data.sourceUrls ?? [],
      recordedAt: now.toISOString(),
    },
    lastUpdatedBy: "gemini-boss-review",
  };
  const [updated] = await db.update(researchCasesTable).set({
    caseFile: JSON.stringify(updatedFile),
    currentAction: "boss-review-initial-research",
    status: "active",
    iteration: current.iteration + 1,
    lastDecisionAt: now,
    updatedAt: now,
  }).where(eq(researchCasesTable.id, current.id)).returning();
  await db.insert(researchCaseEventsTable).values({
    caseId: current.id,
    iteration: current.iteration + 1,
    actorRole: "head_investigator",
    eventType: "observation",
    summary: "Broad initial research response recorded for Boss review and candidate extraction.",
    payload: JSON.stringify({
      researchResponse: body.data.researchResponse,
      bossCommentary: body.data.bossCommentary ?? null,
      sourceUrls: body.data.sourceUrls ?? [],
    }),
  });
  res.json(serializeBureauCase(updated!, null));
});

router.post("/research/bureau/cases/:caseId/promote-target", async (req, res): Promise<void> => {
  const params = PromoteBureauCaseTargetParams.safeParse(req.params);
  const body = PromoteBureauCaseTargetBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [current] = await db.select().from(researchCasesTable)
    .where(eq(researchCasesTable.id, params.data.caseId))
    .limit(1);
  const [entity] = await db.select().from(entitiesTable).where(eq(entitiesTable.id, body.data.entityId)).limit(1);
  if (!current || !entity) {
    res.status(404).json({ error: !current ? "Bureau case not found" : "Entity not found" });
    return;
  }
  const discoveryFile = parseDiscoveryCaseFile(current.caseFile);
  if (!discoveryFile) {
    res.status(409).json({ error: "Only a discovery case can be promoted to a target" });
    return;
  }
  const targetFile = buildInitialCaseFile(entity);
  const now = new Date();
  const promotedFile = {
    ...targetFile,
    discoveryContext: {
      caseId: current.id,
      humanBrief: discoveryFile.humanBrief,
      bossPremise: discoveryFile.bossPremise,
      initialResearch: discoveryFile.initialResearch,
    },
    lastUpdatedBy: "boss-target-promotion",
  };
  const [updated] = await db.update(researchCasesTable).set({
    targetEntityId: entity.id,
    caseType: "target",
    status: "ready",
    caseFile: JSON.stringify(promotedFile),
    currentAction: promotedFile.nextBestAction?.id ?? null,
    iteration: current.iteration + 1,
    lastDecisionAt: now,
    updatedAt: now,
  }).where(eq(researchCasesTable.id, current.id)).returning();
  await db.insert(researchCaseEventsTable).values({
    caseId: current.id,
    iteration: current.iteration + 1,
    actorRole: "head_investigator",
    eventType: "status",
    summary: `Discovery candidate promoted to target case: ${entity.name}.`,
    payload: JSON.stringify({ entityId: entity.id, entityName: entity.name }),
  });
  res.json(serializeBureauCase(updated!, entity));
});

router.post("/research/cases", async (req, res): Promise<void> => {
  const parsed = OpenResearchCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { entityId, objective, motivation, directorModel } = parsed.data;
  const [entity] = await db.select().from(entitiesTable).where(eq(entitiesTable.id, entityId));
  if (!entity) {
    res.status(404).json({ error: "Entity not found" });
    return;
  }
  const existing = await findCase(entityId);
  if (existing) {
    res.status(200).json(serializeCase(existing, entity));
    return;
  }
  const caseFile = buildInitialCaseFile(entity);
  const [created] = await db.insert(researchCasesTable).values({
    targetEntityId: entityId,
    caseType: "target",
    directorMode: "local_planner",
    directorProvider: "gemini",
    objective: objective?.trim() || "Find the strongest practical public route to the target and map the surrounding ownership and relationship context.",
    motivation: motivation?.trim() || "Search broadly across public life, organizations, people, venues, digital traces, and relationship paths; return an organized case for human judgment.",
    // Keep legacy target-case creation on the same cost-safe Boss policy.
    // The old request field remains accepted for client compatibility but no
    // longer permits an expensive model to become the default silently.
    directorModel: GEMINI_BOSS_MODEL,
    caseFile: JSON.stringify(caseFile),
    currentAction: caseFile.nextBestAction?.id ?? null,
    iteration: 0,
    status: "ready",
  }).returning();
  if (!created) {
    res.status(500).json({ error: "Unable to open research case" });
    return;
  }
  await db.insert(researchCaseEventsTable).values({
    caseId: created.id,
    actorRole: "head_investigator",
    eventType: "case_opened",
    summary: "Case opened with a target-scoped bureau roster and initial action queue.",
    payload: JSON.stringify({ actionCount: caseFile.actionQueue.length, specialistCount: caseFile.specialistRoster.length }),
  });
  res.status(201).json(serializeCase(created, entity));
});

router.get("/research/cases/:entityId", async (req, res): Promise<void> => {
  const params = GetResearchCaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select({
    case: researchCasesTable,
    entityName: entitiesTable.name,
    entityType: entitiesTable.type,
  }).from(researchCasesTable)
    .leftJoin(entitiesTable, eq(researchCasesTable.targetEntityId, entitiesTable.id))
    .where(eq(researchCasesTable.targetEntityId, params.data.entityId))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Research case not found" });
    return;
  }
  res.json(serializeCase(row.case, row.entityName ? { name: row.entityName, type: row.entityType ?? "Unknown" } : null));
});

router.post("/research/cases/:entityId/advance", async (req, res): Promise<void> => {
  const params = AdvanceResearchCaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const current = await findCase(params.data.entityId);
  if (!current) {
    res.status(404).json({ error: "Research case not found" });
    return;
  }
  const file = parseCaseFile(current.caseFile);
  if (!file) {
    res.status(500).json({ error: "Research case file is invalid" });
    return;
  }
  const nextIteration = current.iteration + 1;
  const updatedFile = advanceCaseFile(file, nextIteration);
  const now = new Date();
  const [updated] = await db.update(researchCasesTable).set({
    caseFile: JSON.stringify(updatedFile),
    currentAction: updatedFile.nextBestAction?.id ?? null,
    iteration: nextIteration,
    status: updatedFile.nextBestAction ? "active" : "review",
    lastDecisionAt: now,
    updatedAt: now,
  }).where(eq(researchCasesTable.id, current.id)).returning();
  const action = updatedFile.nextBestAction;
  await db.insert(researchCaseEventsTable).values({
    caseId: current.id,
    iteration: nextIteration,
    actorRole: "head_investigator",
    eventType: "decision",
    summary: action ? `Assigned ${action.title} to ${action.specialistId}.` : "No queued action remains; case is ready for review.",
    payload: JSON.stringify({ action, decision: updatedFile.decisionLog.at(-1) }),
  });
  const [entity] = await db.select({ name: entitiesTable.name, type: entitiesTable.type }).from(entitiesTable).where(eq(entitiesTable.id, params.data.entityId));
  res.json(serializeCase(updated!, entity ?? null));
});

router.post("/research/cases/:entityId/directive", async (req, res): Promise<void> => {
  const params = AddResearchCaseDirectiveParams.safeParse(req.params);
  const body = AddResearchCaseDirectiveBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const current = await findCase(params.data.entityId);
  if (!current) {
    res.status(404).json({ error: "Research case not found" });
    return;
  }
  const file = parseCaseFile(current.caseFile);
  if (!file) {
    res.status(500).json({ error: "Research case file is invalid" });
    return;
  }
  const directive = body.data.directive.trim();
  const updatedFile = {
    ...file,
    humanDirectives: [...file.humanDirectives, directive].slice(-30),
    lastUpdatedBy: "human-operator",
  };
  const now = new Date();
  const [updated] = await db.update(researchCasesTable).set({
    caseFile: JSON.stringify(updatedFile),
    updatedAt: now,
  }).where(eq(researchCasesTable.id, current.id)).returning();
  await db.insert(researchCaseEventsTable).values({
    caseId: current.id,
    iteration: current.iteration,
    actorRole: "human_operator",
    eventType: "directive",
    summary: directive,
    payload: JSON.stringify({ directive }),
  });
  const [entity] = await db.select({ name: entitiesTable.name, type: entitiesTable.type }).from(entitiesTable).where(eq(entitiesTable.id, params.data.entityId));
  res.json(serializeCase(updated!, entity ?? null));
});

router.get("/research/cases/:entityId/events", async (req, res): Promise<void> => {
  const params = ListResearchCaseEventsParams.safeParse(req.params);
  const query = ListResearchCaseEventsQueryParams.safeParse(req.query);
  if (!params.success || !query.success) {
    res.status(400).json({ error: !params.success ? params.error.message : query.error.message });
    return;
  }
  const current = await findCase(params.data.entityId);
  if (!current) {
    res.status(404).json({ error: "Research case not found" });
    return;
  }
  const rows = await db.select().from(researchCaseEventsTable)
    .where(eq(researchCaseEventsTable.caseId, current.id))
    .orderBy(desc(researchCaseEventsTable.createdAt))
    .limit(query.data.limit);
  res.json(rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  })));
});

export default router;