import { Router } from "express";
import { desc, eq, sql } from "drizzle-orm";
import {
  db,
  entitiesTable,
  contactEvidenceTable,
  researchCaseEventsTable,
  researchCasesTable,
} from "@workspace/db";
import {
  collectDiscoveryContactsForTarget,
  expandSecondaryPublicSurface,
  persistBureauContactsForEntity,
} from "../../lib/bureau-contact-persist";
import {
  filterDiscoveryCandidatesByFitness,
  rankDiscoveryReviewCandidates,
} from "../../lib/discovery-intake";
import { computeDiscoveryQualityMetrics, evaluateDiscoveryStop } from "../../lib/discovery-metrics";
import { buildLanesHonestySnapshot } from "../../lib/lanes-honesty";
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
  AdmitBureauCaseCandidateBody,
  PromoteBureauCaseTargetBody,
  PromoteBureauCaseTargetParams,
  RecordBureauInitialResearchBody,
  RecordBureauInitialResearchParams,
  RunBureauCaseDiscoveryParams,
  RunBureauCaseDiscoveryResponse,
  RunBureauCaseNextPassParams,
  RunBureauCaseBossReviewParams,
  RunBureauCaseNextPassResponse,
  RunBureauCaseBossReviewResponse,
} from "@workspace/api-zod";
import { isWebSpecialistAction, runBureauAgenticWebPass } from "../../lib/bureau-agentic-pass";
import {
  advanceCaseFile,
  applyGeminiBossPlan,
  buildBossOpeningPrompt,
  buildDiscoveryCaseFile,
  appendDiscoveryReport,
  buildDiscoveryProgressSnapshot,
  buildInitialCaseFile,
  contactEvidenceToRoutes,
  mergeContactRoutes,
  GEMINI_BOSS_MODEL_PENDING,
  parseDiscoveryCaseFile,
  parseCaseFile,
  recordRightHandAdvice,
  recordGeminiBossPlan,
  runGeminiBossDiscovery,
  resolveGeminiBossModel,
  DEFAULT_DISCOVERY_MOTIVATION,
  DEFAULT_DISCOVERY_OBJECTIVE,
  runMistralWebSearch,
  runNvidiaNimCaseReasoning,
  runNvidiaNimDiscoveryAdvice,
  runGeminiBossPlan,
} from "../../lib/case-bureau";
import { runBroadDiscovery } from "../../lib/enrichment/broad-discovery";
import { searchRegistry, type RegistryId } from "../../lib/registry-client";
import {
  appendJobLog,
  clearActiveJobIfOwned,
  createJob,
  getActiveJob,
  getJob,
  setActiveJob,
  updateJob,
} from "../../lib/job-queue";

const router = Router();

/** C residual: load durable contact_evidence into case-file route shape (non-rejected only). */
async function loadEntityContactRoutes(entityId: number) {
  const rows = await db
    .select({
      vectorType: contactEvidenceTable.vectorType,
      value: contactEvidenceTable.value,
      sourceUrl: contactEvidenceTable.sourceUrl,
      validationStatus: contactEvidenceTable.validationStatus,
      metadata: contactEvidenceTable.metadata,
    })
    .from(contactEvidenceTable)
    .where(eq(contactEvidenceTable.entityId, entityId))
    .limit(80);
  const items = rows
    .filter((row) => row.validationStatus !== "rejected" && row.value?.trim())
    .map((row) => {
      let scope: string | null = null;
      try {
        const meta = JSON.parse(row.metadata || "{}") as Record<string, unknown>;
        scope = typeof meta.scope === "string" ? meta.scope : typeof meta.personScope === "string" ? meta.personScope : null;
      } catch {
        scope = null;
      }
      return {
        vectorType: row.vectorType,
        value: row.value,
        scope,
        sourceUrls: row.sourceUrl ? [row.sourceUrl] : [],
        state: row.validationStatus === "verified" ? "verified" : "candidate",
        note: `From contact_evidence (${row.validationStatus})`,
      };
    });
  return contactEvidenceToRoutes(items);
}

/** D residual: stamp discovery jobs with lane honesty + registry-shallow risk. */
async function stampDiscoveryJobHonesty(jobId: string, message?: string): Promise<void> {
  const lanes = buildLanesHonestySnapshot();
  await updateJob(jobId, {
    message: message
      ?? (lanes.registryShallowRisk
        ? "Registry-shallow risk: no active web-search provider slots"
        : undefined),
    result: JSON.stringify({
      lanesHonesty: lanes,
      registryShallowRisk: lanes.registryShallowRisk,
    }),
  });
}



function serializeCase(
  row: typeof researchCasesTable.$inferSelect,
  entity: { name: string; type: string } | null,
) {
  let progressSummary: {
    coverageRatio: number;
    foundAnyCount: number;
    foundPersonalCount: number;
    pendingVectors: string[];
    noProgressStreak: number | null;
    bossOutcome: string | null;
    progressAssessment: string | null;
    lanesHonesty: Record<string, unknown> | null;
  } | null = null;
  let discoveryQuality: ReturnType<typeof computeDiscoveryQualityMetrics> | null = null;
  try {
    const parsed = JSON.parse(row.caseFile) as Record<string, unknown>;
    const progress = parsed.investigationProgress as
      | {
          coverageRatio?: number;
          foundAnyCount?: number;
          foundPersonalCount?: number;
          pendingVectors?: string[];
        }
      | undefined;
    const bossPlan = parsed.bossPlan as
      | {
          outcome?: string;
          progressAssessment?: string | null;
          rightHandDisposition?: string | null;
          rightHandNote?: string | null;
        }
      | undefined;
    const lanesHonesty = (parsed.lastLanesHonesty as Record<string, unknown> | undefined) ?? null;
    if (progress || bossPlan || lanesHonesty) {
      progressSummary = {
        coverageRatio: progress?.coverageRatio ?? 0,
        foundAnyCount: progress?.foundAnyCount ?? 0,
        foundPersonalCount: progress?.foundPersonalCount ?? 0,
        pendingVectors: progress?.pendingVectors ?? [],
        noProgressStreak: typeof parsed.noProgressStreak === "number" ? parsed.noProgressStreak : null,
        bossOutcome: bossPlan?.outcome ?? null,
        progressAssessment: bossPlan?.progressAssessment ?? null,
        rightHandDisposition: bossPlan?.rightHandDisposition ?? null,
        rightHandNote: bossPlan?.rightHandNote ?? null,
        lanesHonesty,
      };
    }
    const candidates = parsed.discoveredCandidates;
    if (Array.isArray(candidates) && candidates.length > 0) {
      discoveryQuality = computeDiscoveryQualityMetrics(
        candidates as Array<{
          name: string;
          type?: string | null;
          relevance?: string | null;
          reachability?: string | null;
          contactEvidence?: Array<{ value?: string | null }> | null;
        }>,
      );
    }
  } catch {
    progressSummary = null;
    discoveryQuality = null;
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

function serializeBureauCase(
  row: typeof researchCasesTable.$inferSelect,
  entity: { name: string; type: string } | null,
) {
  return serializeCase(row, entity);
}

function candidateTypeToEntityType(type: string): "HNWI" | "Corporation" | "Trust" | "Gatekeeper" {
  const normalized = type.toLowerCase();
  if (normalized.includes("person") || normalized.includes("individual") || normalized.includes("investor")) return "HNWI";
  if (normalized.includes("intermediary") || normalized.includes("gatekeeper") || normalized.includes("advisor")) return "Gatekeeper";
  if (normalized.includes("trust") || normalized.includes("foundation")) return "Trust";
  return "Corporation";
}

function mergeContactEvidence(
  ...groups: Array<Array<{
    vectorType: string;
    value: string;
    scope: string;
    personName: string | null;
    role: string | null;
    sourceUrls: string[];
    note: string | null;
  }> | undefined>
) {
  return groups.flatMap((group) => group ?? [])
    .filter((item) => item.value.trim())
    .filter((item, index, all) => all.findIndex((other) =>
      other.vectorType === item.vectorType
      && other.value.toLowerCase() === item.value.toLowerCase()
      && (other.personName ?? "").toLowerCase() === (item.personName ?? "").toLowerCase(),
    ) === index)
    .slice(0, 20);
}

type DiscoveryCandidate = ReturnType<typeof parseDiscoveryCaseFile> extends infer T
  ? Exclude<T, null>["discoveredCandidates"][number]
  : never;

function mergeDiscoveryCandidates(
  existing: DiscoveryCandidate[],
  additions: DiscoveryCandidate[],
): DiscoveryCandidate[] {
  const merged = new Map<string, DiscoveryCandidate>();
  for (const candidate of [...existing, ...additions]) {
    const key = candidate.name.trim().toLowerCase();
    if (!key) continue;
    const prior = merged.get(key);
    if (!prior) {
      merged.set(key, candidate);
      continue;
    }
    merged.set(key, {
      ...prior,
      type: prior.type || candidate.type,
      relevance: candidate.relevance || prior.relevance,
      reachability: candidate.reachability || prior.reachability,
      sourceUrls: [...new Set([...prior.sourceUrls, ...candidate.sourceUrls])].slice(0, 20),
      contactEvidence: mergeContactEvidence(prior.contactEvidence, candidate.contactEvidence),
      admittedEntityId: prior.admittedEntityId ?? candidate.admittedEntityId ?? null,
    });
  }
  // Fame-only trophies out; person-first ranking; shells kept only with reframe annotation.
  return rankDiscoveryReviewCandidates(
    filterDiscoveryCandidatesByFitness([...merged.values()]),
  ).slice(0, 80);
}

/**
 * Phase A visibility floor: materialize non-trash discovery review candidates
 * into durable review entities + contact_evidence so the entity ledger /
 * "People worth knowing" is never stuck at zero after candidate-producing runs.
 *
 * - Never invents contacts or marks Personal.
 * - Does not auto-promote to target cases.
 * - Skips candidates that already have admittedEntityId.
 * - Requires a non-empty name; prefers candidates with sourceUrls or contactEvidence.
 */
async function materializeDiscoveryReviewCandidates(input: {
  caseId: number;
  candidates: DiscoveryCandidate[];
  sourceTag?: string;
  expandSecondary?: boolean;
}): Promise<{ materialized: number; secondaryExpanded: number; candidates: DiscoveryCandidate[] }> {
  const sourceTag = input.sourceTag ?? "case-bureau-discovery";
  const nowIso = new Date().toISOString();
  let materialized = 0;
  let secondaryExpanded = 0;
  const updated: DiscoveryCandidate[] = [];
  const secondaryQueue: Array<{ entityId: number; name: string; entityType: string }> = [];

  for (const candidate of input.candidates) {
    const name = String(candidate.name ?? "").trim();
    if (!name) {
      updated.push(candidate);
      continue;
    }
    if (candidate.admittedEntityId) {
      updated.push(candidate);
      continue;
    }

    const hasSurface =
      (Array.isArray(candidate.sourceUrls) && candidate.sourceUrls.length > 0)
      || (Array.isArray(candidate.contactEvidence) && candidate.contactEvidence.length > 0)
      || Boolean(String(candidate.relevance ?? "").trim())
      || Boolean(String(candidate.reachability ?? "").trim());
    // Keep named person-shaped or registry anchors even when surface is thin —
    // empty-name / pure noise already filtered by mergeDiscoveryCandidates.
    if (!hasSurface && !name.includes(" ")) {
      updated.push(candidate);
      continue;
    }

    // Dedup against existing entities with the same name (case-insensitive).
    const existing = await db
      .select({ id: entitiesTable.id })
      .from(entitiesTable)
      .where(sql`lower(btrim(${entitiesTable.name})) = ${name.toLowerCase()}`)
      .limit(1);

    let entityId = existing[0]?.id ?? null;
    const entityType = candidateTypeToEntityType(String(candidate.type ?? "review_candidate"));
    if (!entityId) {
      try {
        const [entity] = await db.insert(entitiesTable).values({
          name,
          type: entityType,
          bayesianScore: 0.05,
          contactConfidence: 0,
          contactOutcome: "evidence_only",
          isHot: false,
          isStarred: false,
          isHidden: false,
          sourceRegistries: JSON.stringify(["Case Bureau discovery"]),
          notes: `Auto-materialized as review-only from Case Bureau discovery (case ${input.caseId}). Not promoted to target; Personal mark requires verified evidence.`,
          metadata: JSON.stringify({
            reviewOnly: true,
            admission: "case-bureau-discovery-auto",
            caseId: input.caseId,
            materializedAt: nowIso,
            candidate: {
              name,
              type: candidate.type,
              relevance: candidate.relevance,
              reachability: candidate.reachability,
              sourceUrls: candidate.sourceUrls ?? [],
              contactEvidence: candidate.contactEvidence ?? [],
            },
          }),
        }).returning();
        entityId = entity?.id ?? null;
      } catch {
        // Race or unique constraint — leave candidate without entity id.
        entityId = null;
      }
    }

    if (!entityId) {
      updated.push(candidate);
      continue;
    }

    const contacts = collectDiscoveryContactsForTarget(name, input.candidates);
    const evidence = contacts.length
      ? contacts
      : (candidate.contactEvidence ?? []);
    // Also persist source profile URLs as website/social candidate vectors.
    const urlEvidence = (candidate.sourceUrls ?? [])
      .filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u))
      .slice(0, 8)
      .map((url) => ({
        vectorType: /linkedin\.com/i.test(url) ? "linkedin" : "website",
        value: url,
        scope: "candidate",
        personName: name,
        role: null,
        sourceUrls: [url],
        note: "Profile / source URL from discovery review candidate",
        tier: "candidate",
        state: "review_only",
      }));
    await persistBureauContactsForEntity(
      entityId,
      [...evidence, ...urlEvidence],
      sourceTag,
    );

    // Queue person-shaped (and a few corp shells) for bounded secondary expansion.
    // Runs even when LinkedIn is already present so Signal/crt/claims still fire.
    const personShaped =
      entityType === "HNWI"
      || entityType === "Gatekeeper"
      || (name.includes(" ") && !/llc|ltd|inc|corp|plc|gmbh|sa\b|bv\b|nv\b/i.test(name));
    const corpShaped = entityType === "Corporation" || entityType === "Trust"
      || /llc|ltd|inc|corp|plc|gmbh|sa\b|bv\b|nv\b/i.test(name);
    if ((personShaped || corpShaped) && secondaryQueue.length < 8) {
      secondaryQueue.push({ entityId, name, entityType });
    }

    materialized += 1;
    updated.push({ ...candidate, admittedEntityId: entityId });
  }

  if (input.expandSecondary !== false) {
    for (const item of secondaryQueue) {
      try {
        const result = await expandSecondaryPublicSurface(item);
        if (result.linkedin || result.email || result.phone || result.signal || result.website) secondaryExpanded += 1;
      } catch {
        // non-fatal
      }
    }
    // Registry officer expansion: corp anchors → named people as review entities.
    try {
      const officerAdds = await expandRegistryOfficersFromCandidates({
        caseId: input.caseId,
        candidates: updated,
        limit: 6,
      });
      if (officerAdds.materialized > 0) {
        materialized += officerAdds.materialized;
        const byName = new Map(updated.map((c) => [c.name.trim().toLowerCase(), c]));
        for (const oc of officerAdds.candidates) {
          const key = oc.name.trim().toLowerCase();
          if (!byName.has(key)) {
            byName.set(key, oc);
            updated.push(oc);
          }
        }
      }
    } catch {
      // non-fatal
    }
  }

  return { materialized, secondaryExpanded, candidates: updated };
}

/**
 * Corp/registry anchors → named officers as review-only entities + evidence.
 * Bounded; never invents; never Personal.
 */
async function expandRegistryOfficersFromCandidates(input: {
  caseId: number;
  candidates: DiscoveryCandidate[];
  limit?: number;
}): Promise<{ materialized: number; candidates: DiscoveryCandidate[] }> {
  const limit = input.limit ?? 6;
  const out: DiscoveryCandidate[] = [];
  let materialized = 0;
  if (!process.env.COMPANIES_HOUSE_API_KEY) return { materialized: 0, candidates: out };

  const corpAnchors = input.candidates
    .filter((c) => {
      const t = String(c.type ?? "").toLowerCase();
      const n = String(c.name ?? "");
      return t.includes("corp") || t.includes("company") || /llc|ltd|inc|plc|gmbh/i.test(n);
    })
    .slice(0, 4);

  try {
    const { searchRegistry } = await import("../../lib/registry-client");
    for (const anchor of corpAnchors) {
      if (out.length >= limit) break;
      let results: Array<{ name: string; type?: string; metadata?: string; notes?: string }> = [];
      try {
        results = await searchRegistry({
          query: anchor.name,
          registry: "companies-house",
          limit: 5,
        });
      } catch {
        continue;
      }
      for (const r of results) {
        if (out.length >= limit) break;
        const personName = String(r.name ?? "").trim();
        if (!personName || personName.toLowerCase() === anchor.name.trim().toLowerCase()) continue;
        const looksPerson = personName.includes(" ") && !/llc|ltd|inc|plc|gmbh|limited/i.test(personName);
        if (!looksPerson) continue;

        const existing = await db
          .select({ id: entitiesTable.id })
          .from(entitiesTable)
          .where(sql`lower(btrim(${entitiesTable.name})) = ${personName.toLowerCase()}`)
          .limit(1);
        let entityId = existing[0]?.id ?? null;
        if (!entityId) {
          try {
            const [entity] = await db.insert(entitiesTable).values({
              name: personName,
              type: "HNWI",
              bayesianScore: 0.05,
              contactConfidence: 0,
              contactOutcome: "evidence_only",
              isHot: false,
              isStarred: false,
              isHidden: false,
              sourceRegistries: JSON.stringify(["Companies House officers"]),
              notes: `Registry officer expanded from corp anchor "${anchor.name}" (case ${input.caseId}). Review-only; not Personal.`,
              metadata: JSON.stringify({
                reviewOnly: true,
                admission: "registry-officer-expansion",
                caseId: input.caseId,
                parentCorp: anchor.name,
                candidate: { name: personName, type: r.type, notes: r.notes },
              }),
            }).returning();
            entityId = entity?.id ?? null;
          } catch {
            entityId = null;
          }
        }
        if (!entityId) continue;

        let sourceUrls: string[] = [];
        try {
          const meta = r.metadata ? JSON.parse(r.metadata) as Record<string, unknown> : {};
          if (typeof meta.url === "string") sourceUrls = [meta.url];
        } catch { /* ignore */ }

        await persistBureauContactsForEntity(entityId, [{
          vectorType: "website",
          value: sourceUrls[0] ?? `companies-house:${personName}`,
          scope: "candidate",
          personName,
          role: "officer",
          sourceUrls,
          note: `Companies House officer related to ${anchor.name}`,
          tier: "candidate",
          state: "review_only",
        }], "registry-officer-expansion");

        materialized += 1;
        out.push({
          name: personName,
          type: "review_candidate",
          relevance: `Officer expanded from registry for corp anchor ${anchor.name}`,
          reachability: "Registry officer record; secondary surface may still be incomplete.",
          sourceUrls,
          contactEvidence: [],
          state: "review_only",
          admittedEntityId: entityId,
        } as DiscoveryCandidate);
      }
    }
  } catch {
    // non-fatal
  }
  return { materialized, candidates: out };
}

async function persistDiscoveryCheckpoint(
  caseId: number,
  iteration: number,
  file: ReturnType<typeof parseDiscoveryCaseFile> extends infer T ? Exclude<T, null> : never,
  report: Parameters<typeof appendDiscoveryReport>[1],
  summary: string,
) {
  const updatedFile = appendDiscoveryReport(file, report);
  await db.update(researchCasesTable).set({
    caseFile: JSON.stringify(updatedFile),
    updatedAt: new Date(),
  }).where(eq(researchCasesTable.id, caseId));
  await db.insert(researchCaseEventsTable).values({
    caseId,
    iteration,
    actorRole: report.lane === "nvidia-right-hand" ? "right_hand_advisor" : report.lane === "gemini-boss" ? "head_investigator" : "specialist",
    eventType: "observation",
    summary,
    payload: JSON.stringify({
      provider: report.provider,
      lane: report.lane,
      status: report.status,
      reportId: updatedFile.investigatorReports.at(-1)?.id ?? null,
      candidateNames: report.candidateNames,
      sourceUrls: report.sourceUrls,
      nextQuestions: report.nextQuestions,
      contactEvidence: report.contactEvidence ?? [],
      error: report.error,
    }),
  });
  return updatedFile;
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
    summary: "Discovery case opened; Boss opening brief is ready for text-only Gemini review.",
    payload: JSON.stringify({
      caseType: "discovery",
      directorProvider: "gemini",
      directorModel: bossModel.model,
      modelSelectionStatus: bossModel.status,
      modelCandidateCount: bossModel.candidateCount,
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
  res.json(rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  })));
});

/**
 * Run one bounded discovery-first investigation:
 * 1. GLM right-hand advice and Gemini Boss text planning open the case context.
 * 2. The existing mixed-source discovery/admission runner searches the public
 *    web without requiring an existing entity.
 * 3. A small registry mix adds independent review-only company anchors.
 *
 * This route intentionally does not run Atlas-wide ingestion or promote any
 * candidate into a target case.
 */
router.post("/research/bureau/cases/:caseId/run-discovery", async (req, res): Promise<void> => {
  const params = RunBureauCaseDiscoveryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const caseId = params.data.caseId;
  const [current] = await db.select().from(researchCasesTable)
    .where(eq(researchCasesTable.id, caseId))
    .limit(1);
  if (!current) {
    res.status(404).json({ error: "Bureau case not found" });
    return;
  }
  const file = parseDiscoveryCaseFile(current.caseFile);
  if (!file) {
    res.status(409).json({ error: "Only a discovery case can run the preliminary investigation" });
    return;
  }
  // B residual: do not re-burn opening discovery when reports + candidates already exist.
  const openingStop = evaluateDiscoveryStop({
    candidates: file.discoveredCandidates ?? [],
    iteration: current.iteration,
    mode: "run-discovery",
    hasInvestigatorReports: (file.investigatorReports ?? []).length > 0,
  });
  if (openingStop.stop) {
    res.status(409).json({
      error: openingStop.detail,
      stop: true,
      reason: openingStop.reason,
      metrics: openingStop.metrics,
      reportCount: (file.investigatorReports ?? []).length,
    });
    return;
  }
  const existingJobId = await getActiveJob("case-bureau-discovery");
  if (existingJobId) {
    const existing = await getJob(existingJobId);
    if (existing?.status === "running" || existing?.status === "queued") {
      res.status(409).json({ error: "A bureau discovery investigation is already running.", jobId: existingJobId });
      return;
    }
  }

  const jobId = await createJob("case-bureau-discovery");
  await setActiveJob("case-bureau-discovery", jobId);
  await stampDiscoveryJobHonesty(jobId);
  await updateJob(jobId, {
    status: "running",
    progress: 0,
    total: 4,
    message: "Boss opening preliminary web request…",
  });
  await db.update(researchCasesTable).set({
    status: "active",
    currentAction: "boss-opening-web-research",
    updatedAt: new Date(),
  }).where(eq(researchCasesTable.id, caseId));
  await db.insert(researchCaseEventsTable).values({
    caseId,
    iteration: current.iteration,
    actorRole: "head_investigator",
    eventType: "assignment",
    summary: "Boss opening web request assigned before mixed-source discovery.",
    payload: JSON.stringify({ jobId, lanes: ["gemini-boss", "broad-web-discovery", "registry-mix"] }),
  });

  void (async () => {
    const now = () => new Date();
    try {
      await appendJobLog(jobId, "Boss opening web request started.");
      const westernTemplateSets = [1, 2, 3, 4, 5, 6, 7, 10];
      const discoveryTemplateSet = westernTemplateSets[Math.floor(Math.random() * westernTemplateSets.length)] ?? 1;
      let workingFile = file;
      const openingIteration = current.iteration + 1;
      const rightHand = await runNvidiaNimDiscoveryAdvice({
        file: workingFile,
        iteration: openingIteration,
      });
      workingFile = await persistDiscoveryCheckpoint(caseId, openingIteration, workingFile, {
        lane: "nvidia-right-hand",
        provider: `NVIDIA NIM ${rightHand.model}`,
        status: rightHand.status,
        iteration: openingIteration,
        summary: rightHand.decision ?? rightHand.error ?? "Right-hand discovery review unavailable.",
        findings: rightHand.reason ? [rightHand.reason] : [],
        candidateNames: [],
        sourceUrls: [],
        nextQuestions: rightHand.focusLanes,
        error: rightHand.error,
      }, `Right-hand discovery review ${rightHand.status}; shared case context checkpointed.`);
      await appendJobLog(jobId, `GLM right-hand discovery advice ${rightHand.status}; model=${rightHand.model}.`);

      const mistral = await runMistralWebSearch({
        objective: workingFile.humanBrief.objective,
        motivation: workingFile.humanBrief.motivation,
        geography: workingFile.humanBrief.geography,
        exclusions: workingFile.humanBrief.exclusions,
        caseContext: buildDiscoveryProgressSnapshot(workingFile),
        nextDirections: workingFile.currentProgress.openQuestions,
      });
      workingFile = await persistDiscoveryCheckpoint(caseId, openingIteration, workingFile, {
        lane: "mistral-web",
        provider: `Mistral ${mistral.model}`,
        status: mistral.status === "completed" ? "completed" : mistral.status,
        iteration: openingIteration,
        summary: mistral.report ?? mistral.error ?? "Mistral web-search report unavailable.",
        findings: mistral.nextDirections,
        candidateNames: mistral.candidates.map((candidate) => candidate.name),
        sourceUrls: mistral.citations,
        nextQuestions: [...mistral.nextDirections, ...mistral.uncertainties],
        contactEvidence: mistral.candidates.flatMap((candidate) => candidate.contactEvidence ?? []),
        error: mistral.error,
      }, `Mistral web-search ${mistral.status}; report checkpointed into shared case context.`);
      await appendJobLog(jobId, `Mistral web-search ${mistral.status}; model=${mistral.model}; citations=${mistral.citations.length}.`);

      // Agentic ReAct body — same as Atlas secondary; Boss web path is not Mistral-only.
      // Extract a tight person/company target from the human objective when present
      // so the loop behaves like a general agent (not a diluted discovery brief).
      const objText = workingFile.humanBrief.objective || "";
      // Prefer explicit "PERSON / COMPANY" objective form used in bureau cases
      const slashPair = objText.match(
        /\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z'-]+){0,3})\s*\/\s*([A-Z][A-Za-z0-9&.'-]{1,}(?:\s+[A-Z][A-Za-z0-9&.']*){0,5})/,
      );
      const personMatch = slashPair
        ? null
        : objText.match(/\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z'-]+){1,3})\b/);
      const companyMatch = slashPair
        ? null
        : objText.match(/\b([A-Z][A-Za-z0-9&.'-]*(?:\s+[A-Z][A-Za-z0-9&.']*){0,5}\s+(?:Company|Co\.?|Corp\.?|Inc\.?|LLC|LLP|Manufacturing|Products|Holdings|Group|Partners|Capital|Foundation|Advisors?|Management|Investments?))\b/);
      const agenticTargetName = (slashPair?.[1] || personMatch?.[1] || objText.slice(0, 80) || "discovery target").trim();
      const agenticCompanyName = (slashPair?.[2] || companyMatch?.[1] || null)?.trim() || null;
      const agenticDiscovery = await runBureauAgenticWebPass({
        targetName: agenticTargetName,
        companyName: agenticCompanyName,
        objective: [
          workingFile.humanBrief.objective,
          workingFile.humanBrief.motivation,
          workingFile.humanBrief.geography ? `Geography: ${workingFile.humanBrief.geography}` : "",
          agenticCompanyName
            ? `Lock onto ${agenticTargetName} at ${agenticCompanyName}. Search the exact pair first. Recover address, phone, email, EDGAR/officers, related-person surface (visit company /dealer /team after primary contact).`
            : "Multi-hop agentic search. Visit primary pages and related-people pages. Never invent contacts.",
        ].filter(Boolean).join("\n"),
        caseId,
        maxIterations: 12,
      });
      workingFile = await persistDiscoveryCheckpoint(caseId, openingIteration, workingFile, {
        lane: "broad-web",
        provider: `Agentic-ReAct ${agenticDiscovery.model}`,
        status: agenticDiscovery.status === "completed" ? "completed" : agenticDiscovery.status === "unavailable" ? "unavailable" : "failed",
        iteration: openingIteration,
        summary: `Agentic web pass: ${agenticDiscovery.findings.length} findings; searches=${agenticDiscovery.searches}; visits=${agenticDiscovery.visits}`,
        findings: agenticDiscovery.trajectory.slice(-8),
        candidateNames: agenticDiscovery.findings
          .map((f) => f.personName)
          .filter((n): n is string => Boolean(n)),
        sourceUrls: agenticDiscovery.findings.flatMap((f) => f.sourceUrls).slice(0, 20),
        nextQuestions: [],
        contactEvidence: agenticDiscovery.contactEvidence,
        error: agenticDiscovery.error,
      }, `Agentic ReAct web pass ${agenticDiscovery.status}; findings=${agenticDiscovery.findings.length}.`);
      await appendJobLog(jobId, `Agentic ReAct web ${agenticDiscovery.status}; model=${agenticDiscovery.model}; findings=${agenticDiscovery.findings.length}; searches=${agenticDiscovery.searches}.`);

      const boss = await runGeminiBossDiscovery({
          file: workingFile,
          objective: file.humanBrief.objective,
          motivation: file.humanBrief.motivation,
          geography: file.humanBrief.geography,
          exclusions: file.humanBrief.exclusions,
           rightHandAdvice: rightHand,
           startingLane: `Randomized Western-aligned discovery lane ${discoveryTemplateSet}`,
       });
      workingFile = await persistDiscoveryCheckpoint(caseId, openingIteration, workingFile, {
        lane: "gemini-boss",
        provider: `Gemini ${boss.model}`,
        status: boss.status === "completed" ? "completed" : "unavailable",
        iteration: openingIteration,
        summary: boss.report ?? boss.error ?? "Gemini Boss opening unavailable.",
        findings: boss.nextDirections,
        candidateNames: boss.candidates.map((candidate) => candidate.name),
        sourceUrls: boss.citations,
        nextQuestions: [...boss.nextDirections, ...boss.uncertainties],
        contactEvidence: boss.candidates.flatMap((candidate) => candidate.contactEvidence ?? []),
        error: boss.error,
      }, `Gemini Boss opening ${boss.status}; report checkpointed after reading prior lane reports.`);
      await updateJob(jobId, {
        progress: 2,
        message: `Opening context reviewed; ${workingFile.investigatorReports.length} lane report(s) recorded. Mixed discovery starting…`,
      });
      await appendJobLog(jobId, `Gemini Boss opening ${boss.status}; model=${boss.model}; reports-read=${workingFile.investigatorReports.length}.`);

      const bossUnavailable = boss.status !== "completed" || !boss.report;
      if (bossUnavailable) {
        await appendJobLog(
          jobId,
          `Gemini Boss unavailable (${boss.error ?? boss.status}); preserving this provider gap and continuing with free discovery lanes.`,
        );
      }
      if (mistral.status !== "completed") {
        await appendJobLog(
          jobId,
          `Mistral web-search unavailable (${mistral.error ?? mistral.status}); preserving this provider gap and continuing with other discovery lanes.`,
        );
      }

      await updateJob(jobId, {
        progress: 2,
        message: "Mixed-source discovery: bounded public web search and registry anchors…",
      });
       await appendJobLog(jobId, `Mixed-source discovery started from randomized Western-aligned lane ${discoveryTemplateSet}: web admission plus registry review lanes.`);

      // maxEntities=0 is intentional: broad discovery still runs its AI
      // admission gate and returns candidates, but this bureau pass never
      // silently inserts a target before human review.
      const broad = await runBroadDiscovery({
         templateSet: discoveryTemplateSet,
        rotateTemplates: false,
        maxQueries: 3,
        maxEntities: 0,
      });
      // TARGET-LOCKED: query the named person/company, not "geography + family office"
      // (that query is what flooded US cases with irrelevant UK CH family-office shells).
      // Discovery missions (no named person): prefer a short industry+geo query so EDGAR/GLEIF
      // can return real registrant anchors instead of zero hits on a long objective sentence.
      const objForReg = file.humanBrief.objective || "";
      const namedPersonCo = objForReg.match(
        /\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,3})\s*\/\s*([A-Z][A-Za-z0-9&.' -]{2,60})/,
      );
      const namedForRegistry = namedPersonCo
        ? `${namedPersonCo[1]} ${namedPersonCo[2]}`.trim()
        : objForReg
            .replace(/—.*$/, "")
            .replace(/\s+recover\b.*/i, "")
            .replace(/\bFind realistic public contact routes to\b/i, "")
            .replace(/\bwho appear in\b.*/i, "")
            .trim()
            .slice(0, 100);
      const discoveryIndustryQuery = (() => {
        if (namedPersonCo) return null;
        const geo = (file.humanBrief.geography || "United States").split(/[,—]/)[0].trim();
        if (/\bmanufactur/i.test(objForReg)) return `${geo} manufacturing`;
        if (/\bindustrial/i.test(objForReg)) return `${geo} industrial`;
        if (/\bfamily office/i.test(objForReg)) return `${geo} investment`;
        return `${geo} company`;
      })();
      const registryQuery = (namedForRegistry && namedForRegistry.split(/\s+/).length <= 8
        ? namedForRegistry
        : (discoveryIndustryQuery || `${file.humanBrief.geography} company`)).slice(0, 120);
      const geoLower = (file.humanBrief.geography || "").toLowerCase();
      const isUsFocused = /\b(united states|u\.?s\.?a?\.?|america)\b/i.test(geoLower)
        || /\b(CA|NY|TX|MI|FL|WA|IL|MA|CO|Austin|San Francisco|Boston|Hastings)\b/.test(file.humanBrief.objective || "");
      const isUkFocused = /\b(united kingdom|u\.?k\.?|england|scotland|wales|britain)\b/i.test(geoLower);
      const registryIds: RegistryId[] = [
        "gleif",
        "sec-edgar",
        // Companies House only when UK-focused or geography is open (not pure US person+firm)
        ...((process.env.COMPANIES_HOUSE_API_KEY && (!isUsFocused || isUkFocused))
          ? ["companies-house" as RegistryId]
          : []),
      ];
      const registryResults = await Promise.all(registryIds.map(async (registry) => {
        try {
          return { registry, results: await searchRegistry({ query: registryQuery, registry, limit: 3 }), error: null };
        } catch (error) {
          return { registry, results: [], error: error instanceof Error ? error.message : "registry request failed" };
        }
      }));
      const registryErrors = registryResults.filter((entry) => entry.error);
      // Promote agentic CONTACT FACTS into review candidates so findings are not
      // lost between the ReAct loop and the discovery deck (parity gap vs general agent).
      const agenticReviewCandidates: Array<{
        name: string;
        type: string;
        relevance: string;
        reachability: string;
        sourceUrls: string[];
        contactEvidence: Array<{
          vectorType: string;
          value: string;
          scope: string;
          personName: string | null;
          role: string | null;
          sourceUrls: string[];
          note: string;
        }>;
        state: "review_only";
      }> = [];
      {
        const byName = new Map<string, (typeof agenticReviewCandidates)[number]>();
        const isJunkEvidence = (value: string, vectorType: string) => {
          if (!value || value.length < 3) return true;
          if (vectorType === "other" || vectorType === "website") {
            if (/[{};]|rmp-|style=|--columns|standard-menu|Directory Search|\bast-|\buagb-|\bwp-block|\binline-on-mobile/i.test(value))
              return true;
            // Website must look like a URL host, not an address line mis-tagged
            if (vectorType === "website" && !/^https?:\/\//i.test(value) && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value))
              return true;
          }
          return false;
        };

        // Company-lock: when companyName is set, person candidates must not absorb
        // surface from unrelated domains (e.g. same-name "Nathan Miller" at Team Financial
        // when the mission is DYNA Products). Fail-closed: drop rather than invent.
        const FREE_EMAIL_HOSTS = new Set([
          "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "icloud.com",
          "protonmail.com", "mail.com", "live.com", "msn.com",
        ]);
        const TRUSTED_DIR_HOSTS = new Set([
          "bbb.org", "yellowpages.com", "yelp.com", "mapquest.com", "google.com",
          "bing.com", "duckduckgo.com", "opencorporates.com", "sec.gov", "edgar.sec.gov",
          "companieshouse.gov.uk", "dnb.com", "chamberofcommerce.com",
        ]);
        const hostnameOf = (url: string): string | null => {
          try {
            return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
          } catch {
            return null;
          }
        };
        const registrable = (host: string): string => {
          const parts = host.split(".");
          if (parts.length >= 2) return parts.slice(-2).join(".");
          return host;
        };
        const companySlug = (agenticCompanyName || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "")
          .slice(0, 24);
        const companyDomains = new Set<string>();
        if (companySlug.length >= 4) {
          // Seed plausible domains from company name (e.g. dyna-products → dynaproducts / dyna-products)
          const dashed = (agenticCompanyName || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
          if (dashed.length >= 4) {
            companyDomains.add(`${dashed}.com`);
            companyDomains.add(registrable(`${dashed}.com`));
          }
          companyDomains.add(`${companySlug}.com`);
        }
        for (const f of agenticDiscovery.findings ?? []) {
          if (f.vectorType === "website" && f.value) {
            const host = hostnameOf(/^https?:\/\//i.test(f.value) ? f.value : `https://${f.value}`);
            if (host && !FREE_EMAIL_HOSTS.has(registrable(host))) {
              companyDomains.add(registrable(host));
              companyDomains.add(host);
            }
          }
          if (f.vectorType === "email" && f.value?.includes("@")) {
            const host = f.value.split("@")[1]?.toLowerCase().trim();
            if (host && !FREE_EMAIL_HOSTS.has(host) && (f.scope === "organization" || /^(info|contact|office|sales|admin)@/i.test(f.value))) {
              companyDomains.add(host);
              companyDomains.add(registrable(host));
            }
          }
          for (const u of f.sourceUrls ?? []) {
            const host = hostnameOf(u);
            if (!host) continue;
            const reg = registrable(host);
            if (companySlug.length >= 4 && (host.includes(companySlug) || reg.includes(companySlug.slice(0, 8)))) {
              companyDomains.add(reg);
              companyDomains.add(host);
            }
          }
        }

        const sourceAlignedWithCompany = (sourceUrls: string[] | null | undefined): boolean => {
          if (!agenticCompanyName) return true; // no company lock when company unknown
          const urls = (sourceUrls ?? []).filter((u) => typeof u === "string" && /^https?:\/\//i.test(u));
          if (urls.length === 0) return false; // fail-closed: no source → no attach under lock
          for (const u of urls) {
            const host = hostnameOf(u);
            if (!host) continue;
            const reg = registrable(host);
            if (TRUSTED_DIR_HOSTS.has(reg) || [...TRUSTED_DIR_HOSTS].some((d) => host.endsWith(`.${d}`))) return true;
            if (companyDomains.has(host) || companyDomains.has(reg)) return true;
            if (companySlug.length >= 4 && (host.includes(companySlug) || reg.includes(companySlug.slice(0, 8)))) return true;
            // Path/title often embeds company on directories we already allow via TRUSTED
          }
          return false;
        };

        const ensurePersonRow = (pName: string, opts?: { related?: boolean; sourceUrls?: string[] }) => {
          const cleaned = pName.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s+/i, "").trim();
          if (!cleaned || cleaned.split(/\s+/).length < 2) return null;
          if (/directors,\s*officers|shareholders,\s*managers/i.test(cleaned)) return null;
          // Reject person-row names that are actually the company string
          if (agenticCompanyName && cleaned.toLowerCase() === agenticCompanyName.toLowerCase()) return null;
          // Company-lock on person row creation: reject unrelated-domain surface for named company missions
          if (agenticCompanyName && opts?.sourceUrls && opts.sourceUrls.length > 0 && !sourceAlignedWithCompany(opts.sourceUrls)) {
            return null;
          }
          const key = cleaned.toLowerCase();
          let row = byName.get(key);
          if (!row) {
            const isRelated = Boolean(opts?.related) || cleaned.toLowerCase() !== agenticTargetName.toLowerCase();
            row = {
              name: cleaned,
              type: "person",
              relevance: isRelated
                ? "Related contact/officer surfaced by agentic multi-hop with source URL; review-only."
                : "Surfaced by agentic ReAct web pass with source-backed contact fact(s); review-only until dual identity anchors.",
              reachability: "Public web surface recovered; no access claim is made.",
              sourceUrls: [...(opts?.sourceUrls ?? [])].slice(0, 8),
              contactEvidence: [],
              state: "review_only" as const,
            };
            byName.set(key, row);
            agenticReviewCandidates.push(row);
          }
          return row;
        };
        const ensureCompanyRow = (cName: string, sourceUrls?: string[]) => {
          const key = cName.toLowerCase();
          let row = byName.get(key);
          if (!row) {
            row = {
              name: cName,
              type: "company",
              relevance: "Organization surface from agentic web pass; review-only.",
              reachability: "Public web surface recovered; no access claim is made.",
              sourceUrls: [...(sourceUrls ?? [])].slice(0, 8),
              contactEvidence: [],
              state: "review_only" as const,
            };
            byName.set(key, row);
            agenticReviewCandidates.push(row);
          }
          return row;
        };
        const pushEvidence = (
          row: (typeof agenticReviewCandidates)[number],
          f: (typeof agenticDiscovery.findings)[number],
        ) => {
          // Company-lock: do not attach person-scoped evidence from unrelated domains
          if (
            agenticCompanyName
            && row.type === "person"
            && !sourceAlignedWithCompany(f.sourceUrls)
          ) {
            return;
          }
          row.contactEvidence.push({
            vectorType: f.vectorType,
            value: f.value,
            scope: f.scope === "organization" ? "organization" : f.scope === "candidate" ? "unknown" : "person",
            personName: f.personName ?? null,
            role: f.role ?? null,
            sourceUrls: f.sourceUrls ?? [],
            note: f.note ?? "agentic web research",
          });
          for (const u of f.sourceUrls ?? []) {
            if (typeof u === "string" && /^https?:\/\//i.test(u) && !row.sourceUrls.includes(u)) {
              row.sourceUrls.push(u);
            }
          }
          row.sourceUrls = row.sourceUrls.slice(0, 8);
        };

        for (const f of agenticDiscovery.findings ?? []) {
          if (isJunkEvidence(f.value || "", f.vectorType)) continue;
          const person = (f.personName || "").trim().replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s+/i, "");
          const isGenericOrgInbox = /^(info|contact|office|support|sales|admin)@/i.test(f.value || "");
          const isPersonNamedEmail =
            Boolean(person)
            && f.vectorType === "email"
            && !isGenericOrgInbox
            && person.split(/\s+/).length >= 2;
          const isRelatedPerson =
            Boolean(person)
            && person.toLowerCase() !== agenticTargetName.toLowerCase()
            && person.split(/\s+/).length >= 2;
          const isPrimaryPerson =
            Boolean(person)
            && person.toLowerCase() === agenticTargetName.toLowerCase()
            && person.split(/\s+/).length >= 2;

          // Person-attributed facts → that person's row (not the company dump)
          // Company-lock drops unrelated-domain hits before row creation / evidence attach
          if (isRelatedPerson || isPrimaryPerson || isPersonNamedEmail) {
            if (agenticCompanyName && !sourceAlignedWithCompany(f.sourceUrls)) {
              continue;
            }
            const row = ensurePersonRow(person, {
              related: isRelatedPerson,
              sourceUrls: f.sourceUrls,
            });
            if (row) pushEvidence(row, f);
            // Generic org inboxes also stay on company when present
            if (isGenericOrgInbox && agenticCompanyName) {
              const co = ensureCompanyRow(agenticCompanyName, f.sourceUrls);
              pushEvidence(co, f);
            }
            continue;
          }

          // Org surface without a distinct personName → company (or target as person fallback)
          const isOrg =
            f.scope === "organization"
            || isGenericOrgInbox
            || (f.vectorType === "website" && !person)
            || (f.vectorType === "phone" && !person)
            || (f.vectorType === "email" && isGenericOrgInbox);
          if (isOrg && agenticCompanyName) {
            const co = ensureCompanyRow(agenticCompanyName, f.sourceUrls);
            pushEvidence(co, f);
            continue;
          }
          if (person && person.split(/\s+/).length >= 2) {
            if (agenticCompanyName && !sourceAlignedWithCompany(f.sourceUrls)) {
              continue;
            }
            const row = ensurePersonRow(person, { sourceUrls: f.sourceUrls });
            if (row) pushEvidence(row, f);
            continue;
          }
          // Last resort: attach to company or target name
          const fallback = agenticCompanyName || agenticTargetName;
          if (fallback) {
            if (agenticCompanyName) {
              const row = ensureCompanyRow(agenticCompanyName, f.sourceUrls);
              if (row) pushEvidence(row, f);
            } else {
              const row = ensurePersonRow(agenticTargetName, { sourceUrls: f.sourceUrls });
              if (row) pushEvidence(row, f);
            }
          }
        }
      }

      // Agentic evidence-first so person rows keep contactEvidence when Boss returns name-only stubs
      const reviewCandidates = [
        ...agenticReviewCandidates,
        ...boss.candidates.map((candidate) => ({
          name: candidate.name,
          type: candidate.type ?? "review_candidate",
          relevance: candidate.relevance ?? "Returned by the Boss opening request; exact attribution requires review.",
          reachability: candidate.reachability ?? "Unresolved until exact identity and route evidence are checked.",
          sourceUrls: [...new Set([...(candidate.sourceUrls ?? []), ...boss.citations])].slice(0, 8),
          contactEvidence: candidate.contactEvidence ?? [],
          state: "review_only" as const,
        })),
        ...mistral.candidates.map((candidate) => ({
          name: candidate.name,
          type: candidate.type ?? "review_candidate",
          relevance: candidate.relevance ?? "Returned by the Mistral web-search lane; exact attribution requires review.",
          reachability: candidate.reachability ?? "Unresolved until exact identity and route evidence are checked.",
          sourceUrls: [...new Set([...(candidate.sourceUrls ?? []), ...mistral.citations])].slice(0, 8),
          contactEvidence: candidate.contactEvidence ?? [],
          state: "review_only" as const,
        })),
        ...broad.newEntities.map((candidate) => ({
          name: candidate.name,
          type: "review_candidate",
          relevance: "Passed the existing broad-discovery admission gate; retained here without insertion.",
          reachability: "Unresolved; no access claim is made.",
          sourceUrls: [] as string[],
          contactEvidence: [],
          state: "review_only" as const,
        })),
        ...registryResults.flatMap(({ registry, results }) => results.map((result) => ({
          name: result.name,
          type: result.type,
          relevance: `Registry anchor from ${registry}; ownership, wealth, and mission relevance remain unconfirmed.`,
          reachability: "Registry record only; no access claim is made.",
          sourceUrls: [] as string[],
          contactEvidence: [],
          state: "review_only" as const,
        }))),
      ];
      // Final company-lock scrub: strip person evidence/URLs from domains that are not
      // the named company (or trusted directories). Closes same-name pollution that
      // arrives via Boss/mistral/broad lanes or partial agentic attach.
      const lockCompany = agenticCompanyName;
      const scrubPersonSurface = <T extends {
        name: string;
        type?: string;
        sourceUrls?: string[];
        contactEvidence?: Array<{ sourceUrls?: string[]; value?: string; vectorType?: string }>;
      }>(cand: T): T | null => {
        if (!lockCompany) return cand;
        const isPerson = (cand.type === "person" || cand.type === "review_candidate")
          && !/inc\.?|llc|corp|company|products|manufacturing|holdings|group\b/i.test(cand.name)
          && cand.name.split(/\s+/).length >= 2;
        if (!isPerson) return cand;
        const FREE = new Set(["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "icloud.com"]);
        const TRUSTED = new Set([
          "bbb.org", "yellowpages.com", "yelp.com", "mapquest.com", "google.com", "bing.com",
          "opencorporates.com", "sec.gov", "edgar.sec.gov", "companieshouse.gov.uk",
          "chamberofcommerce.com", "dnb.com",
        ]);
        const slug = lockCompany.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24);
        const slugDash = lockCompany.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const hostOk = (url: string): boolean => {
          try {
            const host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
            const parts = host.split(".");
            const reg = parts.length >= 2 ? parts.slice(-2).join(".") : host;
            if (TRUSTED.has(reg) || [...TRUSTED].some((d) => host === d || host.endsWith(`.${d}`))) return true;
            if (slug.length >= 4 && (host.includes(slug) || reg.includes(slug))) return true;
            if (slugDash.length >= 4 && (host.includes(slugDash) || reg.includes(slugDash))) return true;
            // Company email domains often match website; allow *.com when host starts with slug prefix >= 6
            if (slug.length >= 6 && (host.startsWith(slug.slice(0, 6)) || reg.startsWith(slug.slice(0, 6)))) return true;
            return false;
          } catch {
            return false;
          }
        };
        const urls = (cand.sourceUrls ?? []).filter((u) => typeof u === "string" && /^https?:\/\//i.test(u));
        const alignedUrls = urls.filter(hostOk);
        const evidence = (cand.contactEvidence ?? []).filter((ev) => {
          const evUrls = (ev.sourceUrls ?? []).filter((u) => typeof u === "string" && /^https?:\/\//i.test(u));
          if (evUrls.length === 0) return false;
          return evUrls.some(hostOk);
        });
        // Drop person candidate if nothing company-aligned remains (fail-closed on pollution)
        if (alignedUrls.length === 0 && evidence.length === 0) {
          // Keep primary target name as a stub only if it matches agenticTargetName
          if (cand.name.toLowerCase() === agenticTargetName.toLowerCase()) {
            return {
              ...cand,
              sourceUrls: [],
              contactEvidence: [],
              relevance: `Name locked to ${lockCompany}; unrelated-domain surface stripped. Review-only.`,
            };
          }
          return null;
        }
        return {
          ...cand,
          sourceUrls: alignedUrls.slice(0, 8),
          contactEvidence: evidence,
          relevance: (cand as { relevance?: string }).relevance
            ?? `Company-locked to ${lockCompany}; only aligned sources retained.`,
        };
      };

      const companyLockedReview = reviewCandidates
        .map((c) => scrubPersonSurface(c))
        .filter((c): c is NonNullable<typeof c> => c != null);

      const preFilterCount = companyLockedReview.length;
      const mergedReviewCandidates = mergeDiscoveryCandidates([], companyLockedReview);
      const fameDropped = Math.max(0, preFilterCount - mergedReviewCandidates.length);
      if (fameDropped > 0) {
        await appendJobLog(
          jobId,
          `Fitness filter removed ${fameDropped} fame-only or empty candidate(s) from discovery review deck; retained ${mergedReviewCandidates.length}.`,
        );
      }
      if (lockCompany) {
        await appendJobLog(
          jobId,
          `Company-lock scrub applied for "${lockCompany}"; person surface limited to company-aligned domains.`,
        );
      }
      workingFile = {
        ...workingFile,
        discoveredCandidates: mergedReviewCandidates,
        initialResearch: {
          ...workingFile.initialResearch,
          status: "recorded",
          recordedAt: now().toISOString(),
        },
        lastUpdatedBy: "discovery-lanes",
      };
      workingFile = await persistDiscoveryCheckpoint(caseId, openingIteration, workingFile, {
        lane: "broad-web",
        provider: "Tavily/DDG + Groq admission gate",
        status: "completed",
        iteration: openingIteration,
        summary: `Broad discovery searched ${broad.queriesFired} queries and reviewed ${broad.resultsScraped} excerpts.`,
        findings: broad.newEntities.map((candidate) => `${candidate.name}: ${candidate.snippet}`).slice(0, 20),
        candidateNames: broad.newEntities.map((candidate) => candidate.name),
        sourceUrls: [],
        nextQuestions: [
          "Which broad-web candidates can be tied to an exact legal or professional identity?",
          "Which broad-web candidates have attributable wealth or investment evidence?",
        ],
        error: null,
      }, `Broad web discovery completed; ${broad.newEntities.length} admission-gated candidate(s) written to the shared case context.`);
      for (const entry of registryResults) {
        workingFile = await persistDiscoveryCheckpoint(caseId, openingIteration, workingFile, {
          lane: "registry",
          provider: entry.registry,
          status: entry.error ? "failed" : "completed",
          iteration: openingIteration,
          summary: `${entry.registry} returned ${entry.results.length} registry anchor(s).`,
          findings: entry.results.map((result) => `${result.name} (${result.type})`).slice(0, 20),
          candidateNames: entry.results.map((result) => result.name),
          sourceUrls: entry.results.flatMap((result) => {
            try {
              const metadata = result.metadata ? JSON.parse(result.metadata) as Record<string, unknown> : {};
              return typeof metadata.url === "string" ? [metadata.url] : [];
            } catch {
              return [];
            }
          }),
          nextQuestions: [
            `Can ${entry.registry} anchors be linked to a named decision-maker and the mission?`,
          ],
          error: entry.error,
        }, `${entry.registry} registry lane ${entry.error ? "failed" : "completed"}; result written to shared case context.`);
      }
      // Bound post-research reviews so discovery reaches status=done even when NIM/Gemini stall
      const withTimeout = async <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          return await Promise.race([
            p,
            new Promise<T>((resolve) => {
              timer = setTimeout(() => resolve(fallback), ms);
            }),
          ]);
        } finally {
          if (timer) clearTimeout(timer);
        }
      };
      const finalRightHand = await withTimeout(
        runNvidiaNimDiscoveryAdvice({
          file: workingFile,
          iteration: openingIteration + 1,
        }),
        45_000,
        {
          status: "unavailable" as const,
          model: "timeout",
          decision: null,
          reason: "Right-hand post-research timed out; discovery candidates already recorded.",
          focusLanes: [] as string[],
          confidence: 0,
          error: "timeout",
        },
      );
      workingFile = await persistDiscoveryCheckpoint(caseId, openingIteration + 1, workingFile, {
        lane: "nvidia-right-hand",
        provider: `NVIDIA NIM ${finalRightHand.model}`,
        status: finalRightHand.status,
        iteration: openingIteration + 1,
        summary: finalRightHand.decision ?? finalRightHand.error ?? "Right-hand post-research review unavailable.",
        findings: finalRightHand.reason ? [finalRightHand.reason] : [],
        candidateNames: [],
        sourceUrls: [],
        nextQuestions: finalRightHand.focusLanes,
        error: finalRightHand.error,
      }, `Right-hand post-research review ${finalRightHand.status}; refreshed shaft read completed.`);
      const finalBoss = await withTimeout(
        runGeminiBossDiscovery({
          file: workingFile,
          objective: workingFile.humanBrief.objective,
          motivation: workingFile.humanBrief.motivation,
          geography: workingFile.humanBrief.geography,
          exclusions: workingFile.humanBrief.exclusions,
          rightHandAdvice: finalRightHand,
          startingLane: `Post-research rabbit-hole review from randomized lane ${discoveryTemplateSet}`,
        }),
        60_000,
        {
          status: "unavailable" as const,
          model: "timeout",
          report: null,
          candidates: [],
          citations: [],
          nextDirections: [],
          uncertainties: ["Post-research Boss review timed out; review deck already populated from agentic/registry lanes."],
          error: "timeout",
        },
      );
      workingFile = await persistDiscoveryCheckpoint(caseId, openingIteration + 1, workingFile, {
        lane: "gemini-boss",
        provider: `Gemini ${finalBoss.model}`,
        status: finalBoss.status === "completed" ? "completed" : "unavailable",
        iteration: openingIteration + 1,
        summary: finalBoss.report ?? finalBoss.error ?? "Gemini post-research review unavailable.",
        findings: finalBoss.nextDirections,
        candidateNames: finalBoss.candidates.map((candidate) => candidate.name),
        sourceUrls: finalBoss.citations,
        nextQuestions: [...finalBoss.nextDirections, ...finalBoss.uncertainties],
        error: finalBoss.error,
      }, `Gemini Boss post-research review ${finalBoss.status}; next rabbit-hole directions recorded.`);
      workingFile = {
        ...workingFile,
        nextInvestigation: {
          rightHand: {
            status: finalRightHand.status,
            decision: finalRightHand.decision,
            reason: finalRightHand.reason,
            focusLanes: finalRightHand.focusLanes,
            confidence: finalRightHand.confidence,
            error: finalRightHand.error,
            reviewedAt: now().toISOString(),
          },
          boss: {
            status: finalBoss.status === "completed" ? "completed" : "unavailable",
            decision: finalBoss.report,
            candidateNames: finalBoss.candidates.map((candidate) => candidate.name),
            nextDirections: finalBoss.nextDirections,
            uncertainties: finalBoss.uncertainties,
            error: finalBoss.error,
            reviewedAt: now().toISOString(),
          },
        },
        currentProgress: {
          ...workingFile.currentProgress,
          lastReviewedBy: "gemini-boss",
          refreshedAt: now().toISOString(),
        },
        initialResearch: {
          ...workingFile.initialResearch,
          status: "reviewed",
          researchResponse: [
            finalBoss.report ? `Final Boss review:\n${finalBoss.report}` : `Final Boss gap: ${finalBoss.error ?? finalBoss.status}`,
            ...workingFile.investigatorReports.slice(-8).map((report) => `\n[${report.lane}] ${report.summary}`),
          ].join("\n"),
          bossCommentary: finalBoss.nextDirections.length
            ? `Next rabbit-hole directions: ${finalBoss.nextDirections.join("; ")}`
            : "No verified next direction was returned; human review remains required.",
          sourceUrls: [...new Set(workingFile.investigatorReports.flatMap((report) => report.sourceUrls))].slice(0, 80),
          recordedAt: now().toISOString(),
        },
        lastUpdatedBy: "gemini-boss-post-research-review",
      };
      const mixedReport = [
        bossUnavailable
          ? `Boss opening provider gap:\n${boss.error ?? `Gemini Boss returned ${boss.status}.`}`
          : `Boss opening report:\n${boss.report}`,
        mistral.status === "completed"
          ? `\nMistral web-search report:\n${mistral.report ?? "No report returned."}`
          : `\nMistral web-search provider gap:\n${mistral.error ?? `Mistral returned ${mistral.status}.`}`,
        `\nMixed-source discovery summary: ${broad.queriesFired} web queries, ${broad.resultsScraped} web result excerpts, ${broad.newEntities.length} admission-gated web candidate(s) retained without insertion.`,
        `Registry lanes: ${registryResults.map((entry) => `${entry.registry}=${entry.results.length}`).join(", ")}.`,
        registryErrors.length ? `Registry gaps: ${registryErrors.map((entry) => `${entry.registry}: ${entry.error}`).join("; ")}` : "Registry gaps: none reported.",
      ].join("\n");
      // Phase A: materialize non-trash review candidates into entity ledger + contact_evidence.
      // Related/org/candidate stay visible; no Personal mark; no target promotion.
      const materialization = await materializeDiscoveryReviewCandidates({
        caseId,
        candidates: mergedReviewCandidates,
        sourceTag: "case-bureau-discovery",
      });
      const ledgerCandidates = materialization.candidates;
      if (materialization.materialized > 0 || materialization.secondaryExpanded > 0) {
        await appendJobLog(
          jobId,
          `Visibility floor: materialized ${materialization.materialized} review candidate(s) into entity ledger + contact_evidence; secondaryExpanded=${materialization.secondaryExpanded} (not promoted; Personal remains verified-only).`,
        );
      }

      const commentary = [
        bossUnavailable
          ? "The Gemini Boss opening was unavailable, so its provider gap is preserved explicitly."
          : "The Boss opening completed and established the first durable case context.",
        "The remaining bounded public-web and registry lanes ran without treating the unavailable Boss as a fatal case error.",
         `Retain ${ledgerCandidates.length} candidate/anchor record(s) for human review; ${materialization.materialized} written to entity ledger for visibility.`,
        "Next decision: review identity, mission relevance, provenance, and realistic reachability before promoting any candidate into target-scoped research.",
      ].join(" ");
      const updatedFile = {
        ...workingFile,
        initialResearch: {
          ...workingFile.initialResearch,
          status: "reviewed" as const,
          researchResponse: [
            workingFile.initialResearch.researchResponse ?? "",
            mixedReport,
          ].filter(Boolean).join("\n\n").slice(-40_000),
          bossCommentary: [
            workingFile.initialResearch.bossCommentary ?? "",
            commentary,
            finalBoss.nextDirections.length
              ? `Next rabbit-hole directions: ${finalBoss.nextDirections.join("; ")}`
              : "",
          ].filter(Boolean).join(" ").slice(-8_000),
          sourceUrls: [...new Set([...workingFile.initialResearch.sourceUrls, ...boss.citations, ...mistral.citations, ...registryResults.flatMap((entry) => entry.results.flatMap((result) => {
            try {
              const metadata = result.metadata ? JSON.parse(result.metadata) as Record<string, unknown> : {};
              return typeof metadata.url === "string" ? [metadata.url] : [];
            } catch {
              return [];
            }
          }))])].slice(0, 80),
          recordedAt: now().toISOString(),
        },
        rightHandAdvice: {
           provider: "nvidia-nim" as const,
           model: finalRightHand.model,
           status: finalRightHand.status,
           decision: finalRightHand.decision,
           reason: finalRightHand.reason,
           focusLanes: finalRightHand.focusLanes,
           confidence: finalRightHand.confidence,
           error: finalRightHand.error,
           createdAt: now().toISOString(),
         },
         discoveredCandidates: ledgerCandidates,
        decisionLog: [
          ...workingFile.decisionLog,
          {
            iteration: openingIteration + 1,
            decision: finalBoss.nextDirections.length
              ? `Boss reviewed the refreshed case shaft and queued the next rabbit-hole directions: ${finalBoss.nextDirections.join("; ")}`
              : "Boss reviewed the refreshed case shaft and left all candidates in human review.",
            reason: finalBoss.uncertainties.length
              ? `Open uncertainties: ${finalBoss.uncertainties.join("; ")}`
              : "Identity, attribution, provenance, wealth, and practical reachability still require human review.",
            createdAt: now().toISOString(),
          },
        ].slice(-50),
        lastUpdatedBy: "gemini-boss-post-research-review",
      };
      const [updated] = await db.update(researchCasesTable).set({
        caseFile: JSON.stringify(updatedFile),
        status: "review",
        currentAction: "human-review-discovery-candidates",
        iteration: current.iteration + 1,
        lastDecisionAt: now(),
        updatedAt: now(),
      }).where(eq(researchCasesTable.id, caseId)).returning();
      await db.insert(researchCaseEventsTable).values([
        {
          caseId,
          iteration: current.iteration + 1,
          actorRole: "specialist",
          eventType: "observation",
             summary: `Mixed-source discovery completed from randomized lane ${discoveryTemplateSet}: ${reviewCandidates.length} review-only candidate/anchor record(s).`,
          payload: JSON.stringify({
            jobId,
            bossModel: boss.model,
            bossCitations: boss.citations.length,
              rightHand: {
                status: rightHand.status,
                model: rightHand.model,
                focusLanes: rightHand.focusLanes,
              },
              discoveryTemplateSet,
            broad: {
              queriesFired: broad.queriesFired,
              resultsScraped: broad.resultsScraped,
              candidates: broad.newEntities.length,
              inserted: broad.entitiesDiscovered,
            },
            registries: registryResults.map((entry) => ({
              registry: entry.registry,
              results: entry.results.length,
              error: entry.error,
            })),
          }),
        },
        {
          caseId,
          iteration: current.iteration + 1,
          actorRole: "head_investigator",
          eventType: "decision",
          summary: commentary,
          payload: JSON.stringify({
            nextAction: "human-review-discovery-candidates",
            candidateCount: mergedReviewCandidates.length,
            fameDropped,
            discoveryQuality: computeDiscoveryQualityMetrics(
              mergedReviewCandidates,
            ),
          }),
        },
      ]);
      const quality = computeDiscoveryQualityMetrics(
        ledgerCandidates,
      );
      await appendJobLog(
        jobId,
        `Discovery complete; randomized lane=${discoveryTemplateSet}; review candidates=${ledgerCandidates.length}; ledgerMaterialized=${materialization.materialized}; fameDropped=${fameDropped}; personShaped=${quality.personShaped}; evidenceRate=${quality.evidenceRate}; no target promotion.`,
      );
      await updateJob(jobId, {
        status: "done",
        progress: 4,
        total: 4,
        inserted: materialization.materialized,
        skipped: fameDropped,
        errors: registryErrors.length,
        message: `Discovery complete: ${ledgerCandidates.length} review candidate(s); ${materialization.materialized} in entity ledger; fameDropped=${fameDropped}; personShaped=${quality.personShaped}; no target promoted.`,
        result: JSON.stringify({
          caseId,
          bossModel: boss.model,
          bossCitations: boss.citations.length,
          webQueries: broad.queriesFired,
          webResults: broad.resultsScraped,
          reviewCandidates: ledgerCandidates.length,
          ledgerMaterialized: materialization.materialized,
          fameDropped,
          discoveryQuality: quality,
          registryErrors: registryErrors.map((entry) => entry.registry),
          caseStatus: updated?.status ?? "review",
        }),
        finishedAt: now().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bureau discovery failed";
      await appendJobLog(jobId, `Discovery failed: ${message}`);
      await db.update(researchCasesTable).set({
        status: "review",
        currentAction: "discovery-run-failed",
        updatedAt: now(),
      }).where(eq(researchCasesTable.id, caseId));
      await db.insert(researchCaseEventsTable).values({
        caseId,
        iteration: current.iteration,
        actorRole: "head_investigator",
        eventType: "status",
        summary: `Discovery run failed safely: ${message}`,
        payload: JSON.stringify({ jobId }),
      });
      await updateJob(jobId, {
        status: "failed",
        errors: 1,
        message,
        finishedAt: now().toISOString(),
      });
    } finally {
      await clearActiveJobIfOwned("case-bureau-discovery", jobId);
    }
  })();

  const response = {
    caseId,
    jobId,
    pollUrl: `/api/ingest/job/${jobId}`,
    caseUrl: `/api/research/bureau/cases/${caseId}`,
    message: "Boss opening request and bounded mixed-source discovery started; candidates remain review-only.",
  };
  res.status(202).json(RunBureauCaseDiscoveryResponse.parse(response));
});

/**
 * Continue a completed discovery case through the Boss-selected verification
 * directions. This is deliberately a separate bounded pass: the first pass
 * discovers routes, this pass verifies identity/attribution and named access
 * paths. Results remain review-only and are appended to the same case shaft.
 */
router.post("/research/bureau/cases/:caseId/run-next-pass", async (req, res): Promise<void> => {
  const params = RunBureauCaseNextPassParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const caseId = params.data.caseId;
  const [current] = await db.select().from(researchCasesTable)
    .where(eq(researchCasesTable.id, caseId))
    .limit(1);
  if (!current) {
    res.status(404).json({ error: "Bureau case not found" });
    return;
  }
  const file = parseDiscoveryCaseFile(current.caseFile);
  if (!file) {
    res.status(409).json({ error: "Only a discovery case can run the verification pass" });
    return;
  }

  // B residual: shared discovery stop gate (depth + evidence retention).
  const discoveryStop = evaluateDiscoveryStop({
    candidates: file.discoveredCandidates ?? [],
    iteration: current.iteration,
    maxPasses: 4,
    mode: "next-pass",
  });
  if (discoveryStop.stop) {
    res.status(409).json({
      error: discoveryStop.detail,
      stop: true,
      reason: discoveryStop.reason,
      iteration: current.iteration,
      metrics: discoveryStop.metrics,
    });
    return;
  }

  const existingJobId = await getActiveJob("case-bureau-discovery");
  if (existingJobId) {
    const existing = await getJob(existingJobId);
    if (existing?.status === "running" || existing?.status === "queued") {
      res.status(409).json({ error: "A bureau discovery investigation is already running.", jobId: existingJobId });
      return;
    }
  }

  const directions = [
    "For every persisted candidate, perform a dedicated public-contact audit: identify named investment decision-makers, official professional profiles, public personal or organization email/phone routes, and warm-introduction paths. Return an explicit contactEvidence array or explicitly state that no structured route was found.",
    ...(file.nextInvestigation?.boss?.nextDirections ?? []),
    ...(file.currentProgress.openQuestions ?? []),
  ].filter((direction, index, all) => direction.trim() && all.indexOf(direction) === index).slice(0, 8);
  if (directions.length === 0) {
    res.status(409).json({ error: "The Boss has not returned bounded next directions for this case." });
    return;
  }

  const jobId = await createJob("case-bureau-discovery");
  await setActiveJob("case-bureau-discovery", jobId);
  await stampDiscoveryJobHonesty(jobId);
  const iteration = current.iteration + 1;
  await updateJob(jobId, {
    status: "running",
    progress: 0,
    total: 4,
    message: "Boss-directed verification pass starting…",
  });
  await db.update(researchCasesTable).set({
    status: "active",
    currentAction: "boss-directed-verification",
    updatedAt: new Date(),
  }).where(eq(researchCasesTable.id, caseId));
  await db.insert(researchCaseEventsTable).values({
    caseId,
    iteration,
    actorRole: "head_investigator",
    eventType: "assignment",
    summary: "Boss-directed verification pass assigned from the persisted next directions.",
    payload: JSON.stringify({ jobId, directions }),
  });

  void (async () => {
    const now = () => new Date();
    let workingFile = file;
    try {
      await appendJobLog(jobId, `Boss-directed verification pass started; directions=${directions.length}.`);

      const mistral = await runMistralWebSearch({
        objective: workingFile.humanBrief.objective,
        motivation: workingFile.humanBrief.motivation,
        geography: workingFile.humanBrief.geography,
        exclusions: workingFile.humanBrief.exclusions,
        caseContext: buildDiscoveryProgressSnapshot(workingFile),
        nextDirections: directions,
      });
      workingFile = await persistDiscoveryCheckpoint(caseId, iteration, workingFile, {
        lane: "mistral-web",
        provider: `Mistral ${mistral.model}`,
        status: mistral.status === "completed" ? "completed" : mistral.status,
        iteration,
        summary: mistral.report ?? mistral.error ?? "Mistral verification report unavailable.",
        findings: mistral.nextDirections,
        candidateNames: mistral.candidates.map((candidate) => candidate.name),
        sourceUrls: mistral.citations,
        nextQuestions: [...mistral.nextDirections, ...mistral.uncertainties],
        contactEvidence: mistral.candidates.flatMap((candidate) => candidate.contactEvidence ?? []),
        error: mistral.error,
      }, `Mistral verification search ${mistral.status}; report appended to the shared case context.`);

      const agenticVerify = await runBureauAgenticWebPass({
        targetName: directions[0] ?? workingFile.humanBrief.objective.slice(0, 120),
        companyName: null,
        objective: [
          "Boss-directed verification pass — agentic multi-hop web research.",
          ...directions.slice(0, 6),
          "Visit official contact/about/team pages. Never invent contacts.",
        ].join("\n"),
        caseId,
        maxIterations: 8,
      });
      workingFile = await persistDiscoveryCheckpoint(caseId, iteration, workingFile, {
        lane: "broad-web",
        provider: `Agentic-ReAct ${agenticVerify.model}`,
        status: agenticVerify.status === "completed" ? "completed" : agenticVerify.status === "unavailable" ? "unavailable" : "failed",
        iteration,
        summary: `Agentic verification: ${agenticVerify.findings.length} findings`,
        findings: agenticVerify.trajectory.slice(-8),
        candidateNames: agenticVerify.findings.map((f) => f.personName).filter((n): n is string => Boolean(n)),
        sourceUrls: agenticVerify.findings.flatMap((f) => f.sourceUrls).slice(0, 20),
        nextQuestions: [],
        contactEvidence: agenticVerify.contactEvidence,
        error: agenticVerify.error,
      }, `Agentic ReAct verification ${agenticVerify.status}; findings=${agenticVerify.findings.length}.`);
      await appendJobLog(jobId, `Agentic ReAct verification ${agenticVerify.status}; findings=${agenticVerify.findings.length}.`);

      await updateJob(jobId, {
        progress: 1,
        total: 4,
        message: "Named-candidate and decision-maker verification recorded…",
      });

      // Registry searches are intentionally limited to the existing corporate
      // anchors. They provide official cross-references and officer/filing
      // signals without inserting records or claiming beneficial ownership.
      const registryAnchors = workingFile.discoveredCandidates
        .filter((candidate) => candidate.type.toLowerCase().includes("corpor") || candidate.type.toLowerCase() === "hnwi")
        .slice(0, 10);
      const verifyGeo = (workingFile.humanBrief.geography || "").toLowerCase();
      const verifyUs = /\b(united states|u\.?s\.?a?\.?|america)\b/i.test(verifyGeo);
      const registryIds: RegistryId[] = [
        "gleif",
        "sec-edgar",
        ...((process.env.COMPANIES_HOUSE_API_KEY && !verifyUs) ? ["companies-house" as RegistryId] : []),
      ];
      for (const registry of registryIds) {
        const registryResults = (await Promise.all(registryAnchors.map(async (anchor) => {
          try {
            return {
              anchor: anchor.name,
              results: await searchRegistry({ query: anchor.name, registry, limit: 3 }),
              error: null,
            };
          } catch (error) {
            return {
              anchor: anchor.name,
              results: [],
              error: error instanceof Error ? error.message : "registry request failed",
            };
          }
        }))).flatMap((entry) => entry.results.map((result) => ({ ...result, anchor: entry.anchor })));
        const registryErrors = registryAnchors.length > 0
          ? registryAnchors.filter((anchor) => !registryResults.some((result) => result.anchor === anchor.name)).length
          : 0;
        const sourceUrls = registryResults.flatMap((result) => {
          try {
            const metadata = result.metadata ? JSON.parse(result.metadata) as Record<string, unknown> : {};
            return Object.values(metadata).filter((value): value is string => typeof value === "string" && /^https?:\/\//.test(value)).slice(0, 2);
          } catch {
            return [];
          }
        });
        workingFile = await persistDiscoveryCheckpoint(caseId, iteration, workingFile, {
          lane: "registry",
          provider: registry,
          status: "completed",
          iteration,
          summary: `${registry} verification searched ${registryAnchors.length} existing corporate anchor(s) and returned ${registryResults.length} result(s).`,
          findings: registryResults.map((result) => `${result.anchor} → ${result.name}${result.notes ? ` (${result.notes})` : ""}`).slice(0, 30),
          candidateNames: registryResults.map((result) => result.name).slice(0, 30),
          sourceUrls: [...new Set(sourceUrls)].slice(0, 40),
          nextQuestions: [
            "Which returned officer, filing, or legal-entity result has an attributable connection to a named investment decision-maker?",
            ...(registryErrors > 0 ? [`${registryErrors} anchor search(es) returned no result in ${registry}.`] : []),
          ],
          error: null,
        }, `${registry} verification lane completed; official anchor cross-references appended.`);
      }
      await updateJob(jobId, {
        progress: 2,
        total: 4,
        message: "Reviewing refreshed case context with the right hand and Boss…",
      });

      const rightHand = await runNvidiaNimDiscoveryAdvice({
        file: workingFile,
        iteration,
      });
      workingFile = await persistDiscoveryCheckpoint(caseId, iteration, workingFile, {
        lane: "nvidia-right-hand",
        provider: `NVIDIA NIM ${rightHand.model}`,
        status: rightHand.status,
        iteration,
        summary: rightHand.decision ?? rightHand.error ?? "Right-hand verification review unavailable.",
        findings: rightHand.reason ? [rightHand.reason] : [],
        candidateNames: [],
        sourceUrls: [],
        nextQuestions: rightHand.focusLanes,
        error: rightHand.error,
      }, `Right-hand verification review ${rightHand.status}; refreshed shaft checkpointed.`);

      const boss = await runGeminiBossDiscovery({
        file: workingFile,
        objective: workingFile.humanBrief.objective,
        motivation: workingFile.humanBrief.motivation,
        geography: workingFile.humanBrief.geography,
        exclusions: workingFile.humanBrief.exclusions,
        rightHandAdvice: rightHand,
        startingLane: "Boss-directed verification of the previous pass",
      });
      workingFile = await persistDiscoveryCheckpoint(caseId, iteration, workingFile, {
        lane: "gemini-boss",
        provider: `Gemini ${boss.model}`,
        status: boss.status === "completed" ? "completed" : "unavailable",
        iteration,
        summary: boss.report ?? boss.error ?? "Gemini verification review unavailable.",
        findings: boss.nextDirections,
        candidateNames: boss.candidates.map((candidate) => candidate.name),
        sourceUrls: boss.citations,
        nextQuestions: [...boss.nextDirections, ...boss.uncertainties],
        contactEvidence: boss.candidates.flatMap((candidate) => candidate.contactEvidence ?? []),
        error: boss.error,
      }, `Gemini Boss verification review ${boss.status}; next directions refreshed.`);

      const newCandidates = [
        ...mistral.candidates.map((candidate) => ({
          name: candidate.name,
          type: candidate.type ?? "review_candidate",
          relevance: candidate.relevance ?? "Returned by the verification lane; exact attribution requires review.",
          reachability: candidate.reachability ?? "Unresolved until exact identity and route evidence are checked.",
          sourceUrls: [...new Set([...(candidate.sourceUrls ?? []), ...mistral.citations])].slice(0, 8),
          contactEvidence: candidate.contactEvidence ?? [],
          state: "review_only" as const,
        })),
        ...boss.candidates.map((candidate) => ({
          name: candidate.name,
          type: candidate.type ?? "review_candidate",
          relevance: candidate.relevance ?? "Returned by the Boss verification review; exact attribution requires review.",
          reachability: candidate.reachability ?? "Unresolved until exact identity and route evidence are checked.",
          sourceUrls: [...new Set(candidate.sourceUrls ?? [])].slice(0, 8),
          contactEvidence: candidate.contactEvidence ?? [],
          state: "review_only" as const,
        })),
      ];
      const mergedCandidates = mergeDiscoveryCandidates(workingFile.discoveredCandidates, newCandidates);
      // Phase A: materialize any new review candidates into ledger + contact_evidence.
      const materialization = await materializeDiscoveryReviewCandidates({
        caseId,
        candidates: mergedCandidates,
        sourceTag: "case-bureau-verification",
      });
      const ledgerCandidates = materialization.candidates;
      if (materialization.materialized > 0) {
        await appendJobLog(
          jobId,
          `Visibility floor: materialized ${materialization.materialized} verification candidate(s) into entity ledger + contact_evidence.`,
        );
      }
      const finalFile = {
        ...workingFile,
        discoveredCandidates: ledgerCandidates,
        nextInvestigation: {
          rightHand: {
            status: rightHand.status,
            decision: rightHand.decision,
            reason: rightHand.reason,
            focusLanes: rightHand.focusLanes,
            confidence: rightHand.confidence,
            error: rightHand.error,
            reviewedAt: now().toISOString(),
          },
          boss: {
            status: boss.status === "completed" ? "completed" : "unavailable",
            decision: boss.report,
            candidateNames: boss.candidates.map((candidate) => candidate.name),
            nextDirections: boss.nextDirections,
            uncertainties: boss.uncertainties,
            error: boss.error,
            reviewedAt: now().toISOString(),
          },
        },
        currentProgress: {
          ...workingFile.currentProgress,
          lastReviewedBy: "gemini-boss",
          refreshedAt: now().toISOString(),
        },
        initialResearch: {
          ...workingFile.initialResearch,
          status: "reviewed" as const,
          bossCommentary: [
            workingFile.initialResearch.bossCommentary ?? "",
            `Verification pass completed; ${materialization.materialized} candidate(s) written to entity ledger; results remain review-only (no target promotion).`,
            boss.nextDirections.length ? `Next rabbit-hole directions: ${boss.nextDirections.join("; ")}` : "",
          ].filter(Boolean).join(" ").slice(-8_000),
          sourceUrls: [...new Set([
            ...workingFile.initialResearch.sourceUrls,
            ...mistral.citations,
            ...workingFile.investigatorReports.flatMap((report) => report.sourceUrls),
          ])].slice(0, 100),
          recordedAt: now().toISOString(),
        },
        decisionLog: [
          ...workingFile.decisionLog,
          {
            iteration,
            decision: boss.nextDirections.length
              ? `Boss completed the verification pass and queued: ${boss.nextDirections.join("; ")}`
              : "Boss completed the verification pass; human review remains required.",
            reason: boss.uncertainties.length
              ? `Open uncertainties: ${boss.uncertainties.join("; ")}`
              : "Identity, attribution, provenance, wealth, and practical reachability remain review gates.",
            createdAt: now().toISOString(),
          },
        ].slice(-50),
        lastUpdatedBy: "gemini-boss-verification-review",
      };
      const [updated] = await db.update(researchCasesTable).set({
        caseFile: JSON.stringify(finalFile),
        status: "review",
        currentAction: "human-review-discovery-candidates",
        iteration,
        lastDecisionAt: now(),
        updatedAt: now(),
      }).where(eq(researchCasesTable.id, caseId)).returning();
      const verificationQuality = computeDiscoveryQualityMetrics(
        ledgerCandidates,
      );
      await db.insert(researchCaseEventsTable).values({
        caseId,
        iteration,
        actorRole: "head_investigator",
        eventType: "decision",
        summary: `Boss-directed verification pass completed with ${ledgerCandidates.length} review candidate(s); ledgerMaterialized=${materialization.materialized}; personShaped=${verificationQuality.personShaped}; no target promoted.`,
        payload: JSON.stringify({
          jobId,
          mistral: { status: mistral.status, citations: mistral.citations.length, candidates: mistral.candidates.length },
          rightHand: { status: rightHand.status, model: rightHand.model },
          boss: { status: boss.status, candidates: boss.candidates.length, nextDirections: boss.nextDirections },
          candidateCount: ledgerCandidates.length,
          ledgerMaterialized: materialization.materialized,
          discoveryQuality: verificationQuality,
          inserted: materialization.materialized,
          promoted: 0,
        }),
      });
      await appendJobLog(
        jobId,
        `Verification complete; candidates=${ledgerCandidates.length}; ledgerMaterialized=${materialization.materialized}; personShaped=${verificationQuality.personShaped}; evidenceRate=${verificationQuality.evidenceRate}; fameRejected=${verificationQuality.fameRejected}; no target promotion.`,
      );
      await updateJob(jobId, {
        status: "done",
        progress: 4,
        total: 4,
        inserted: materialization.materialized,
        skipped: verificationQuality.fameRejected,
        errors: 0,
        message: `Verification complete: ${ledgerCandidates.length} review candidate(s); ${materialization.materialized} in entity ledger; personShaped=${verificationQuality.personShaped}; no target promoted.`,
        result: JSON.stringify({
          caseId,
          reviewCandidates: ledgerCandidates.length,
          ledgerMaterialized: materialization.materialized,
          discoveryQuality: verificationQuality,
          caseStatus: updated?.status ?? "review",
        }),
        finishedAt: now().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bureau verification pass failed";
      await appendJobLog(jobId, `Verification failed safely: ${message}`);
      await db.update(researchCasesTable).set({
        status: "review",
        currentAction: "verification-pass-failed",
        updatedAt: now(),
      }).where(eq(researchCasesTable.id, caseId));
      await db.insert(researchCaseEventsTable).values({
        caseId,
        iteration,
        actorRole: "head_investigator",
        eventType: "status",
        summary: `Verification pass failed safely: ${message}`,
        payload: JSON.stringify({ jobId }),
      });
      await updateJob(jobId, {
        status: "failed",
        errors: 1,
        message,
        finishedAt: now().toISOString(),
      });
    } finally {
      await clearActiveJobIfOwned("case-bureau-discovery", jobId);
    }
  })();

  const response = {
    caseId,
    jobId,
    pollUrl: `/api/ingest/job/${jobId}`,
    caseUrl: `/api/research/bureau/cases/${caseId}`,
    message: "Boss-directed verification pass started; candidates remain review-only.",
  };
  res.status(202).json(RunBureauCaseNextPassResponse.parse(response));
});

/**
 * Retry only the advisory/Boss closure review over the current durable shaft.
 * This is used when the evidence lanes completed but Gemini was temporarily
 * unavailable; it must not repeat web or registry work.
 */
router.post("/research/bureau/cases/:caseId/run-boss-review", async (req, res): Promise<void> => {
  const params = RunBureauCaseBossReviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const caseId = params.data.caseId;
  const [current] = await db.select().from(researchCasesTable)
    .where(eq(researchCasesTable.id, caseId))
    .limit(1);
  if (!current) {
    res.status(404).json({ error: "Bureau case not found" });
    return;
  }
  const file = parseDiscoveryCaseFile(current.caseFile);
  if (!file) {
    res.status(409).json({ error: "Only a discovery case can retry the Boss review" });
    return;
  }
  // B residual: skip redundant Boss closure when already completed successfully.
  const bossAlreadyDone = file.nextInvestigation?.boss?.status === "completed"
    && !(file.nextInvestigation?.boss?.error);
  const reviewStop = evaluateDiscoveryStop({
    candidates: file.discoveredCandidates ?? [],
    iteration: current.iteration,
    mode: "boss-review",
    bossReviewCompleted: Boolean(bossAlreadyDone),
  });
  if (reviewStop.stop) {
    res.status(409).json({
      error: reviewStop.detail,
      stop: true,
      reason: reviewStop.reason,
      metrics: reviewStop.metrics,
    });
    return;
  }
  const existingJobId = await getActiveJob("case-bureau-discovery");
  if (existingJobId) {
    const existing = await getJob(existingJobId);
    if (existing?.status === "running" || existing?.status === "queued") {
      res.status(409).json({ error: "A bureau discovery investigation is already running.", jobId: existingJobId });
      return;
    }
  }

  const jobId = await createJob("case-bureau-discovery");
  await setActiveJob("case-bureau-discovery", jobId);
  await stampDiscoveryJobHonesty(jobId);
  const iteration = current.iteration + 1;
  await updateJob(jobId, {
    status: "running",
    progress: 0,
    total: 2,
    message: "Retrying Boss closure review over the existing case shaft…",
  });
  await db.update(researchCasesTable).set({
    status: "active",
    currentAction: "boss-closure-review",
    updatedAt: new Date(),
  }).where(eq(researchCasesTable.id, caseId));
  await db.insert(researchCaseEventsTable).values({
    caseId,
    iteration,
    actorRole: "head_investigator",
    eventType: "assignment",
    summary: "Boss closure review retry assigned without repeating evidence lanes.",
    payload: JSON.stringify({ jobId, reportCount: file.investigatorReports.length }),
  });

  void (async () => {
    const now = () => new Date();
    try {
      let workingFile = file;
      const rightHand = await runNvidiaNimDiscoveryAdvice({ file: workingFile, iteration });
      workingFile = await persistDiscoveryCheckpoint(caseId, iteration, workingFile, {
        lane: "nvidia-right-hand",
        provider: `NVIDIA NIM ${rightHand.model}`,
        status: rightHand.status,
        iteration,
        summary: rightHand.decision ?? rightHand.error ?? "Right-hand closure review unavailable.",
        findings: rightHand.reason ? [rightHand.reason] : [],
        candidateNames: [],
        sourceUrls: [],
        nextQuestions: rightHand.focusLanes,
        error: rightHand.error,
      }, `Right-hand closure review ${rightHand.status}; existing evidence shaft preserved.`);
      await updateJob(jobId, {
        progress: 1,
        total: 2,
        message: "Boss reviewing the existing evidence shaft…",
      });

      const boss = await runGeminiBossDiscovery({
        file: workingFile,
        objective: workingFile.humanBrief.objective,
        motivation: workingFile.humanBrief.motivation,
        geography: workingFile.humanBrief.geography,
        exclusions: workingFile.humanBrief.exclusions,
        rightHandAdvice: rightHand,
        startingLane: "Closure review retry after the prior Gemini provider gap",
      });
      workingFile = await persistDiscoveryCheckpoint(caseId, iteration, workingFile, {
        lane: "gemini-boss",
        provider: `Gemini ${boss.model}`,
        status: boss.status === "completed" ? "completed" : "unavailable",
        iteration,
        summary: boss.report ?? boss.error ?? "Gemini Boss closure review unavailable.",
        findings: boss.nextDirections,
        candidateNames: boss.candidates.map((candidate) => candidate.name),
        sourceUrls: boss.citations,
        nextQuestions: [...boss.nextDirections, ...boss.uncertainties],
        error: boss.error,
      }, `Gemini Boss closure review ${boss.status}; existing evidence lanes were not repeated.`);

      const previousBoss = file.nextInvestigation?.boss;
      const bossDirections = boss.status === "completed"
        ? boss.nextDirections
        : previousBoss?.nextDirections ?? [];
      const bossUncertainties = boss.status === "completed"
        ? boss.uncertainties
        : [...(previousBoss?.uncertainties ?? []), boss.error ?? "Gemini Boss closure review unavailable."];
      const finalFile = {
        ...workingFile,
        nextInvestigation: {
          rightHand: {
            status: rightHand.status,
            decision: rightHand.decision,
            reason: rightHand.reason,
            focusLanes: rightHand.focusLanes,
            confidence: rightHand.confidence,
            error: rightHand.error,
            reviewedAt: now().toISOString(),
          },
          boss: {
            status: boss.status === "completed" ? "completed" : "unavailable",
            decision: boss.report ?? previousBoss?.decision ?? null,
            candidateNames: boss.status === "completed"
              ? boss.candidates.map((candidate) => candidate.name)
              : previousBoss?.candidateNames ?? [],
            nextDirections: bossDirections,
            uncertainties: bossUncertainties,
            error: boss.error,
            reviewedAt: now().toISOString(),
          },
        },
        currentProgress: {
          ...workingFile.currentProgress,
          lastReviewedBy: "gemini-boss",
          refreshedAt: now().toISOString(),
        },
        initialResearch: {
          ...workingFile.initialResearch,
          status: "reviewed" as const,
          bossCommentary: [
            workingFile.initialResearch.bossCommentary ?? "",
            boss.status === "completed"
              ? "Boss closure review completed over the existing evidence shaft; all results remain review-only."
              : `Boss closure review remains unavailable: ${boss.error ?? "provider gap"}`,
          ].join(" ").slice(-8_000),
          recordedAt: now().toISOString(),
        },
        decisionLog: [
          ...workingFile.decisionLog,
          {
            iteration,
            decision: boss.status === "completed"
              ? bossDirections.length
                ? `Boss closure review completed and queued: ${bossDirections.join("; ")}`
                : "Boss closure review completed; remaining findings are ready for human review."
              : "Boss closure review could not complete because the Gemini provider remained unavailable.",
            reason: bossUncertainties.join("; ") || "No additional uncertainty returned.",
            createdAt: now().toISOString(),
          },
        ].slice(-50),
        lastUpdatedBy: "gemini-boss-closure-review",
      };
      const [updated] = await db.update(researchCasesTable).set({
        caseFile: JSON.stringify(finalFile),
        status: "review",
        currentAction: boss.status === "completed"
          ? "human-review-discovery-candidates"
          : "boss-closure-review-provider-gap",
        iteration,
        lastDecisionAt: now(),
        updatedAt: now(),
      }).where(eq(researchCasesTable.id, caseId)).returning();
      await db.insert(researchCaseEventsTable).values({
        caseId,
        iteration,
        actorRole: "head_investigator",
        eventType: boss.status === "completed" ? "decision" : "status",
        summary: boss.status === "completed"
          ? `Boss closure review completed over ${workingFile.investigatorReports.length} reports; no target promoted.`
          : `Boss closure review remains blocked by a provider gap; no target promoted.`,
        payload: JSON.stringify({
          jobId,
          status: boss.status,
          error: boss.error,
          reportCount: workingFile.investigatorReports.length,
          inserted: 0,
          promoted: 0,
        }),
      });
      await appendJobLog(jobId, `Boss closure review ${boss.status}; evidence lanes not repeated; no target promotion.`);
      await updateJob(jobId, {
        status: "done",
        progress: 2,
        total: 2,
        inserted: 0,
        skipped: 0,
        errors: boss.status === "completed" ? 0 : 1,
        message: boss.status === "completed"
          ? "Boss closure review complete; candidates remain review-only."
          : `Boss closure review provider gap: ${boss.error ?? "Gemini unavailable"}`,
        result: JSON.stringify({
          caseId,
          caseStatus: updated?.status ?? "review",
          bossStatus: boss.status,
          reports: workingFile.investigatorReports.length,
          promoted: 0,
        }),
        finishedAt: now().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Boss closure review failed";
      await appendJobLog(jobId, `Boss closure review failed safely: ${message}`);
      await db.update(researchCasesTable).set({
        status: "review",
        currentAction: "boss-closure-review-failed",
        updatedAt: now(),
      }).where(eq(researchCasesTable.id, caseId));
      await db.insert(researchCaseEventsTable).values({
        caseId,
        iteration,
        actorRole: "head_investigator",
        eventType: "status",
        summary: `Boss closure review failed safely: ${message}`,
        payload: JSON.stringify({ jobId }),
      });
      await updateJob(jobId, {
        status: "failed",
        errors: 1,
        message,
        finishedAt: now().toISOString(),
      });
    } finally {
      await clearActiveJobIfOwned("case-bureau-discovery", jobId);
    }
  })();

  const response = {
    caseId,
    jobId,
    pollUrl: `/api/ingest/job/${jobId}`,
    caseUrl: `/api/research/bureau/cases/${caseId}`,
    message: "Boss closure review retry started; evidence lanes will not be repeated.",
  };
  res.status(202).json(RunBureauCaseBossReviewResponse.parse(response));
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

router.post("/research/bureau/cases/:caseId/admit-candidate", async (req, res): Promise<void> => {
  const params = GetBureauCaseParams.safeParse(req.params);
  const body = AdmitBureauCaseCandidateBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? params.error.message : body.error.message });
    return;
  }
  const [current] = await db.select().from(researchCasesTable)
    .where(eq(researchCasesTable.id, params.data.caseId))
    .limit(1);
  if (!current) {
    res.status(404).json({ error: "Bureau case not found" });
    return;
  }
  const discoveryFile = parseDiscoveryCaseFile(current.caseFile);
  if (!discoveryFile) {
    res.status(409).json({ error: "Only a discovery case can admit a candidate" });
    return;
  }
  const candidate = discoveryFile.discoveredCandidates.find(
    (item) => item.name.trim().toLowerCase() === body.data.candidateName.trim().toLowerCase(),
  );
  if (!candidate) {
    res.status(409).json({ error: "Candidate is not present in this persisted case file" });
    return;
  }
  if (candidate.admittedEntityId) {
    res.status(409).json({ error: `Candidate has already been admitted as review entity ${candidate.admittedEntityId}` });
    return;
  }

  // Phase 1 fitness gate — do not admit fame-only trophies or pure shells as person targets.
  const { evaluateTargetFitness, shouldRejectTarget, suggestReframe } = await import("../../lib/target-fitness");
  const fitness = evaluateTargetFitness({
    name: candidate.name,
    type: candidate.type,
    snippet: `${candidate.relevance ?? ""} ${candidate.reachability ?? ""}`,
    personScoped: true,
  });
  if (shouldRejectTarget(fitness)) {
    res.status(422).json({
      error: "Target fitness gate rejected this candidate",
      fit: fitness.fit,
      reasons: fitness.reasons,
      reframe: suggestReframe({ name: candidate.name, fit: fitness.fit }),
    });
    return;
  }

  const entityType = candidateTypeToEntityType(candidate.type);
  const now = new Date();
  const [entity] = await db.insert(entitiesTable).values({
    name: candidate.name,
    type: entityType,
    bayesianScore: 0.05,

    contactConfidence: 0,
    contactOutcome: "evidence_only",
    isHot: false,
    isStarred: false,
    isHidden: false,
    sourceRegistries: JSON.stringify(["Case Bureau discovery"]),
    notes: "Admitted manually from a persisted Case Bureau discovery candidate. Identity, attribution, provenance, contactability, and target promotion remain under human review.",
    metadata: JSON.stringify({
      reviewOnly: true,
      admission: "case-bureau-candidate",
      caseId: current.id,
      admittedAt: now.toISOString(),
      candidate: {
        name: candidate.name,
        type: candidate.type,
        relevance: candidate.relevance,
        reachability: candidate.reachability,
        sourceUrls: candidate.sourceUrls,
        contactEvidence: candidate.contactEvidence ?? [],
      },
    }),
  }).returning();
  if (!entity) {
    res.status(500).json({ error: "Unable to admit candidate" });
    return;
  }

  // Related contacts from the discovery brief stay on the HNWI card — not discarded.
  // Pull matching person-named vectors from the whole deck, not only the single candidate row.
  const admitContacts = collectDiscoveryContactsForTarget(
    candidate.name,
    discoveryFile.discoveredCandidates,
  );
  await persistBureauContactsForEntity(
    entity.id,
    admitContacts.length ? admitContacts : (candidate.contactEvidence ?? []),
    "case-bureau-admit",
  );
  // Phase B: secondary public surface on admit — LinkedIn/Signal/claims as leads (never Personal).
  try {
    await expandSecondaryPublicSurface({
      entityId: entity.id,
      name: candidate.name,
      entityType,
    });
  } catch {
    // non-fatal
  }

  const updatedCandidates = discoveryFile.discoveredCandidates.map((item) =>
    item.name.trim().toLowerCase() === candidate.name.trim().toLowerCase()
      ? { ...item, admittedEntityId: entity.id }
      : item,
  );
  const updatedFile = {
    ...discoveryFile,
    discoveredCandidates: updatedCandidates,
    decisionLog: [
      ...discoveryFile.decisionLog,
      {
        iteration: current.iteration + 1,
        decision: `Human admitted ${candidate.name} as review-only entity ${entity.id}.`,
        reason: "Candidate provenance and any contact evidence were copied into review metadata; no target or contact promotion occurred.",
        createdAt: now.toISOString(),
      },
    ].slice(-50),
    lastUpdatedBy: "human-candidate-admission",
  };
  const [updated] = await db.update(researchCasesTable).set({
    caseFile: JSON.stringify(updatedFile),
    status: "review",
    currentAction: "human-review-discovery-candidates",
    iteration: current.iteration + 1,
    lastDecisionAt: now,
    updatedAt: now,
  }).where(eq(researchCasesTable.id, current.id)).returning();
  await db.insert(researchCaseEventsTable).values({
    caseId: current.id,
    iteration: current.iteration + 1,
    actorRole: "human",
    eventType: "decision",
    summary: `Candidate admitted as review-only entity: ${candidate.name}.`,
    payload: JSON.stringify({
      entityId: entity.id,
      entityType,
      candidateName: candidate.name,
      sourceUrls: candidate.sourceUrls,
      contactEvidenceCount: candidate.contactEvidence?.length ?? 0,
      targetPromoted: false,
      contactPromoted: false,
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
  // Fitness gate on promote — fame trophies must not become target-scoped research.
  const { evaluateTargetFitness, shouldRejectTarget, suggestReframe } = await import("../../lib/target-fitness");
  const promoteFitness = evaluateTargetFitness({
    name: entity.name,
    type: entity.type,
    notes: entity.notes ?? null,
    personScoped: true,
  });
  if (shouldRejectTarget(promoteFitness)) {
    res.status(422).json({
      error: "Target fitness gate rejected this entity for target promotion",
      fit: promoteFitness.fit,
      reasons: promoteFitness.reasons,
      reframe: suggestReframe({ name: entity.name, fit: promoteFitness.fit }),
    });
    return;
  }
  const targetFile = buildInitialCaseFile(entity);
  const { computeInvestigationProgress } = await import("../../lib/investigation-progress");
  const now = new Date();
  // C residual: seed contactRoutes from discovery contact evidence so the target
  // case file carries investigator-found vectors, not only entity metadata hierarchy.
  const promoteContacts = collectDiscoveryContactsForTarget(
    entity.name,
    discoveryFile.discoveredCandidates,
  );
  const discoveryRoutes = contactEvidenceToRoutes(promoteContacts);
  const seededRoutes = mergeContactRoutes(targetFile.contactRoutes, discoveryRoutes);
  const promotedFile = {
    ...targetFile,
    contactRoutes: seededRoutes,
    discoveryContext: {
      caseId: current.id,
      humanBrief: discoveryFile.humanBrief,
      bossPremise: discoveryFile.bossPremise,
      initialResearch: discoveryFile.initialResearch,
    },
    investigationProgress: computeInvestigationProgress({
      routes: seededRoutes,
      sourceRegistries: targetFile.evidenceSummary?.sourceRegistries ?? [],
      searchGaps: targetFile.evidenceSummary?.searchGaps ?? [],
      negativeFindings: targetFile.evidenceSummary?.negativeFindings ?? [],
      completedActionIds: [],
    }),
    noProgressStreak: 0,
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

  // Copy discovery + case hierarchy contacts onto the target entity for profile cards.
  await persistBureauContactsForEntity(entity.id, promoteContacts, "case-bureau-promote");
  try {
    await expandSecondaryPublicSurface({
      entityId: entity.id,
      name: entity.name,
      entityType: entity.type,
    });
  } catch {
    // non-fatal
  }
  await persistBureauContactsForEntity(
    entity.id,
    (promotedFile.contactRoutes ?? []).map((route) => ({
      vectorType: route.vectorType,
      value: route.value,
      scope: route.tier,
      personName: route.personName,
      role: route.role,
      sourceUrls: route.sourceUrls,
      note: route.tierLabel,
      tier: route.tier,
      state: route.state,
    })),
    "case-bureau-routes",
  );

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
  const { entityId, objective, motivation } = parsed.data;
  const [entity] = await db.select().from(entitiesTable).where(eq(entitiesTable.id, entityId));
  if (!entity) {
    res.status(404).json({ error: "Entity not found" });
    return;
  }

  // Phase 1 fitness gate — refuse fame-only trophies for person-scoped target cases.
  const { evaluateTargetFitness, shouldRejectTarget, suggestReframe } = await import("../../lib/target-fitness");
  const openFitness = evaluateTargetFitness({
    name: entity.name,
    type: entity.type,
    notes: entity.notes ?? null,
    personScoped: true,
  });
  if (shouldRejectTarget(openFitness)) {
    res.status(422).json({
      error: "Target fitness gate rejected this entity for a person-scoped case",
      fit: openFitness.fit,
      reasons: openFitness.reasons,
      reframe: suggestReframe({ name: entity.name, fit: openFitness.fit }),
    });
    return;
  }

  const existing = await findCase(entityId);
  if (existing) {
    res.status(200).json(serializeCase(existing, entity));
    return;
  }
  const baseCaseFile = buildInitialCaseFile(entity);
  // C residual: merge durable contact_evidence into case routes so cards and progress see truth.
  const evidenceRoutes = await loadEntityContactRoutes(entityId);
  const openRoutes = mergeContactRoutes(baseCaseFile.contactRoutes, evidenceRoutes);
  // Seed mandatory progress map on open so Boss decisions always have progress in/out.
  const { computeInvestigationProgress } = await import("../../lib/investigation-progress");
  const caseFile = {
    ...baseCaseFile,
    contactRoutes: openRoutes,
    investigationProgress: computeInvestigationProgress({
      routes: openRoutes,
      sourceRegistries: baseCaseFile.evidenceSummary?.sourceRegistries ?? [],
      searchGaps: baseCaseFile.evidenceSummary?.searchGaps ?? [],
      negativeFindings: baseCaseFile.evidenceSummary?.negativeFindings ?? [],
      completedActionIds: [],
    }),
    noProgressStreak: 0,
  };
  const bossModel = await resolveGeminiBossModel();
  const [created] = await db.insert(researchCasesTable).values({
    targetEntityId: entityId,
    caseType: "target",

    directorMode: bossModel.status === "resolved" ? "gemini_boss" : "gemini_boss_pending",
    directorProvider: "gemini",
    objective: objective?.trim() || "Find the strongest practical public route to the target and map the surrounding ownership and relationship context.",
    motivation: motivation?.trim() || "Search broadly across public life, organizations, people, venues, digital traces, and relationship paths; return an organized case for human judgment.",
    directorModel: bossModel.model,
    caseFile: JSON.stringify(caseFile),
    currentAction: caseFile.nextBestAction?.id ?? null,
    iteration: 0,
    status: "ready",
  }).returning();
  if (!created) {
    res.status(500).json({ error: "Unable to open research case" });
    return;
  }
  await persistBureauContactsForEntity(
    entityId,
    (caseFile.contactRoutes ?? []).map((route) => ({
      vectorType: route.vectorType,
      value: route.value,
      scope: route.tier,
      personName: route.personName,
      role: route.role,
      sourceUrls: route.sourceUrls,
      note: route.tierLabel,
      tier: route.tier,
      state: route.state,
    })),
    "case-bureau-open",
  );
  // Phase B on single-target open: bounded secondary public surface (leads only).
  try {
    await expandSecondaryPublicSurface({
      entityId,
      name: entity.name,
      entityType: entity.type,
    });
  } catch {
    // non-fatal
  }
  await db.insert(researchCaseEventsTable).values({
    caseId: created.id,
    actorRole: "boss",
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
  // C residual: always surface durable contact_evidence on read so operators
  // never need Redis digs for vectors found after the case was opened.
  let caseRow = row.case;
  if (caseRow.targetEntityId) {
    const file = parseCaseFile(caseRow.caseFile);
    if (file) {
      const evidenceRoutes = await loadEntityContactRoutes(caseRow.targetEntityId);
      const merged = mergeContactRoutes(file.contactRoutes, evidenceRoutes);
      const beforeSig = (file.contactRoutes ?? []).map((r) => `${r.vectorType}|${r.value}`).sort().join(";");
      const afterSig = merged.map((r) => `${r.vectorType}|${r.value}`).sort().join(";");
      if (afterSig !== beforeSig) {
        const refreshed = {
          ...file,
          contactRoutes: merged,
          investigationProgress: (await import("../../lib/investigation-progress")).computeInvestigationProgress({
            routes: merged,
            sourceRegistries: file.evidenceSummary?.sourceRegistries ?? [],
            searchGaps: file.evidenceSummary?.searchGaps ?? [],
            negativeFindings: file.evidenceSummary?.negativeFindings ?? [],
            completedActionIds: (file.actionQueue ?? [])
              .filter((a) => a.status === "complete" || a.status === "active" || a.status === "review")
              .map((a) => a.id),
          }),
          lastUpdatedBy: "contact-evidence-refresh",
        };
        const [updated] = await db.update(researchCasesTable).set({
          caseFile: JSON.stringify(refreshed),
          updatedAt: new Date(),
        }).where(eq(researchCasesTable.id, caseRow.id)).returning();
        if (updated) caseRow = updated;
      }
    }
  }
  res.json(serializeCase(caseRow, row.entityName ? { name: row.entityName, type: row.entityType ?? "Unknown" } : null));
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
  let file = parseCaseFile(current.caseFile);
  if (!file) {
    res.status(500).json({ error: "Research case file is invalid" });
    return;
  }
  // Already rejected/reframed by Boss — do not burn more provider budget.
  const alreadyRejected = (file.decisionLog ?? []).some((entry) =>
    /^reject_target:|^reframe:/i.test(String(entry.decision ?? "")),
  );
  if (alreadyRejected) {
    res.status(409).json({
      error: "Case was already rejected or reframed by Boss; open a new case or reframe the target instead of advancing.",
      status: current.status,
    });
    return;
  }
  const nextIteration = current.iteration + 1;

  // Phase 2: recompute mandatory progress map + deterministic stop gate.
  const {
    computeInvestigationProgress,
    evaluateInvestigationStop,
  } = await import("../../lib/investigation-progress");
  const { resolveResearchDepth } = await import("../../lib/research-depth");
  const { publishBureauEvent } = await import("../../lib/bureau-live-log");
  const { evaluateTargetFitness, shouldRejectTarget } = await import("../../lib/target-fitness");

  // C residual: refresh contactRoutes from durable evidence before progress/stop.
  const evidenceRoutes = await loadEntityContactRoutes(params.data.entityId);
  file = {
    ...file,
    contactRoutes: mergeContactRoutes(file.contactRoutes, evidenceRoutes),
  };

  const depthCfg = resolveResearchDepth({ explicit: file.researchDepth ?? null });
  const priorFoundAny = file.investigationProgress?.foundAnyCount ?? 0;
  const progress = computeInvestigationProgress({
    routes: file.contactRoutes ?? [],
    sourceRegistries: file.evidenceSummary?.sourceRegistries ?? [],
    searchGaps: file.evidenceSummary?.searchGaps ?? [],
    negativeFindings: file.evidenceSummary?.negativeFindings ?? [],
    completedActionIds: (file.actionQueue ?? [])
      .filter((a) => a.status === "complete" || a.status === "active" || a.status === "review")
      .map((a) => a.id),

  });
  const foundIncreased = progress.foundAnyCount > priorFoundAny;
  const noProgressStreak = foundIncreased ? 0 : (file.noProgressStreak ?? 0) + 1;
  const fitness = evaluateTargetFitness({
    name: file.target?.name ?? "",
    type: file.target?.type ?? null,
    personScoped: true,
  });
  const stopDecision = evaluateInvestigationStop({
    progress,
    iteration: nextIteration,
    maxActions: depthCfg.adaptiveMaxActions,
    noProgressStreak,
    noProgressLimit: depthCfg.noProgressLimit,
    fitnessReject: shouldRejectTarget(fitness),
    queuedActionCount: (file.actionQueue ?? []).filter((a) => a.status === "queued").length,
  });

  let workingFile = {
    ...file,
    investigationProgress: progress,
    researchDepth: depthCfg.depth,
    noProgressStreak,
  };

  // Deterministic stop: do not burn right-hand / Boss provider calls when already done.
  if (stopDecision.stop) {
    const now = new Date();
    const stopFile = {
      ...workingFile,
      nextBestAction: null,
      decisionLog: [
        ...(workingFile.decisionLog ?? []),
        {
          iteration: nextIteration,
          decision: `stop:${stopDecision.reason}`,
          reason: stopDecision.detail,
          createdAt: now.toISOString(),
        },
      ].slice(-50),
      lastUpdatedBy: "stop-gate",
    };
    const [updated] = await db.update(researchCasesTable).set({
      caseFile: JSON.stringify(stopFile),
      currentAction: null,
      iteration: nextIteration,
      status: "review",
      lastDecisionAt: now,
      updatedAt: now,
    }).where(eq(researchCasesTable.id, current.id)).returning();
    await db.insert(researchCaseEventsTable).values({
      caseId: current.id,
      iteration: nextIteration,
      actorRole: "head_investigator",
      eventType: "decision",
      summary: `Bureau stop: ${stopDecision.reason} — ${stopDecision.detail}`,
      payload: JSON.stringify({
        stop: true,
        reason: stopDecision.reason,
        evidenceSufficient: stopDecision.evidenceSufficient,
        stalled: stopDecision.stalled,
        progress,
        depth: depthCfg.depth,
      }),
    });
    void publishBureauEvent({
      actor: "boss",
      kind: "decision",
      title: `Stop · ${stopDecision.reason}`,
      caseId: String(current.id),
      targetName: file.target?.name,
      why: stopDecision.detail,
      ask: "No further investigator action — surface evidence for human review",
      responseSummary: `OUT: stop (${stopDecision.reason}); personal=${progress.foundPersonalCount}; any=${progress.foundAnyCount}`,
      level: stopDecision.reason === "fitness_reject" ? "warn" : "info",
    });
    const [entity] = await db.select().from(entitiesTable).where(eq(entitiesTable.id, params.data.entityId)).limit(1);
    res.json(serializeCase(updated!, entity ? { name: entity.name, type: entity.type } : null));
    return;
  }

  const reasoning = await runNvidiaNimCaseReasoning({
    file: workingFile,
    iteration: nextIteration,
  });
  // Boss remains the Head Investigator and owns the final queue decision.
  // GLM is a right-hand advisor: preserve its recommendation in case context,
  // but never let it directly select or activate the Boss's action.
  const advisedFile = recordRightHandAdvice(workingFile, {
    model: reasoning.model,
    status: reasoning.status,
    actionId: reasoning.actionId,
    decision: reasoning.decision,
    reason: reasoning.reason,
    confidence: reasoning.confidence,
    error: reasoning.error,
  });
  void publishBureauEvent({
    actor: "right_hand",
    kind: "plan",
    title: "Right-hand advisory",
    caseId: String(current.id),
    targetName: file.target?.name,
    provider: reasoning.model,
    why: reasoning.reason ?? "Advisory pass",
    ask: reasoning.decision ?? "Recommend next queued action",
    responseSummary: `OUT: ${reasoning.status}; actionId=${reasoning.actionId ?? "none"}`,
  });
  const bossPlan = await runGeminiBossPlan({
    file: advisedFile,
    rightHandAdvice: advisedFile.rightHandAdvice,
    iteration: nextIteration,
  });
  void publishBureauEvent({
    actor: "boss",
    kind: "decision",
    title: `Boss · ${bossPlan.outcome ?? "proceed"}`,
    caseId: String(current.id),
    targetName: file.target?.name,
    provider: bossPlan.model,
    why: bossPlan.reason ?? "Boss plan",
    ask: bossPlan.decision ?? "Select or reject",
    responseSummary: `OUT: ${bossPlan.status}; outcome=${bossPlan.outcome}; actionId=${bossPlan.actionId ?? "none"}; rh=${bossPlan.rightHandDisposition ?? "unknown"}; progress=${bossPlan.progressAssessment ? "yes" : "no"}; reprioritize=${(bossPlan.reprioritize ?? []).length}`,
    detail: bossPlan.rightHandNote ?? undefined,
    level: bossPlan.outcome === "reject_target" ? "warn" : bossPlan.rightHandDisposition === "override" ? "warn" : "info",
  });
  const bossDecisionFile =
    bossPlan.status === "completed" && bossPlan.decision && bossPlan.reason
      ? (bossPlan.outcome === "reject_target" || bossPlan.outcome === "reframe"
          ? applyGeminiBossPlan(advisedFile, {
              outcome: bossPlan.outcome,
              actionId: null,
              decision: bossPlan.decision,
              reason: bossPlan.reason,
              suggestedScope: bossPlan.suggestedScope,
              progressAssessment: bossPlan.progressAssessment,
              iteration: nextIteration,
            }) ?? advanceCaseFile(advisedFile, nextIteration)
          : bossPlan.actionId
            ? applyGeminiBossPlan(advisedFile, {
                outcome: "proceed",
                actionId: bossPlan.actionId,
                decision: bossPlan.decision,
                reason: bossPlan.reason,
                progressAssessment: bossPlan.progressAssessment,
                reprioritize: bossPlan.reprioritize,
                iteration: nextIteration,
              }) ?? advanceCaseFile(advisedFile, nextIteration)
            : advanceCaseFile(advisedFile, nextIteration))
      : advanceCaseFile(advisedFile, nextIteration);


  const providerLanes = buildLanesHonestySnapshot();
  const lanesHonestyPreview = {
    rightHand: reasoning.status,
    boss: bossPlan.status,
    bossOutcome: bossPlan.outcome ?? "proceed",
    progressAssessment: bossPlan.progressAssessment ?? null,
    rightHandDisposition: bossPlan.rightHandDisposition ?? "unknown",
    rightHandNote: bossPlan.rightHandNote ?? null,
    rightHandActionId: reasoning.actionId ?? null,
    reprioritize: bossPlan.reprioritize ?? [],
    noProgressStreak,
    researchDepth: depthCfg.depth,
    registryShallowRisk: providerLanes.registryShallowRisk,
    webSearchActive: providerLanes.webSearchActive,
    perplexity: providerLanes.perplexity,
    tavily: providerLanes.tavily,
    exa: providerLanes.exa,
  };
  const updatedFile = {
    ...recordGeminiBossPlan(bossDecisionFile, bossPlan),
    investigationProgress: progress,
    researchDepth: depthCfg.depth,
    noProgressStreak,
    lastLanesHonesty: lanesHonestyPreview,
  };
  const now = new Date();
  const [updated] = await db.update(researchCasesTable).set({
    caseFile: JSON.stringify(updatedFile),
    currentAction: updatedFile.nextBestAction?.id ?? null,
    iteration: nextIteration,
    status: updatedFile.nextBestAction ? "active" : "review",
    lastDecisionAt: now,
    updatedAt: now,
  }).where(eq(researchCasesTable.id, current.id)).returning();

  await persistBureauContactsForEntity(
    params.data.entityId,
    (updatedFile.contactRoutes ?? []).map((route) => ({
      vectorType: route.vectorType,
      value: route.value,
      scope: route.tier,
      personName: route.personName,
      role: route.role,
      sourceUrls: route.sourceUrls,
      note: route.tierLabel,
      tier: route.tier,
      state: route.state,
    })),
    "case-bureau-advance",
  );

  // Boss-selected web/contact/footprint: full Atlas secondary cascade + Boss-guided agentic
  const action = updatedFile.nextBestAction;
  if (action && isWebSpecialistAction(action.specialistId)) {
    try {
      const [ent] = await db.select({
        name: entitiesTable.name,
        type: entitiesTable.type,
        metadata: entitiesTable.metadata,
        notes: entitiesTable.notes,
      }).from(entitiesTable).where(eq(entitiesTable.id, params.data.entityId)).limit(1);
      let companyName: string | null = null;
      try {
        const meta = ent?.metadata ? JSON.parse(ent.metadata) as Record<string, unknown> : {};
        companyName = typeof meta.companyName === "string" ? meta.companyName : null;
      } catch { companyName = null; }
      if (!companyName && ent?.notes) {
        const fromNotes = String(ent.notes).match(/Company:\s*([^\.\n]+)/i)
          || String(ent.notes).match(/connected to\s+([A-Z][^\.\n]{3,80})/i)
          || String(ent.notes).match(/\b([A-Z][A-Za-z0-9&.,' -]{2,60}\s+(?:Manufacturing|Holdings|Corporation|Company|Inc\.?|LLC|Ltd\.?|Co\.?|LLP|PLC|AG|SA)\b)/);
        if (fromNotes?.[1]) companyName = fromNotes[1].trim().slice(0, 120);
      }
      const targetName = updatedFile.target?.name ?? ent?.name ?? "target";

      // 1) Full Atlas secondary surface (enrichEntityOsint + directories + CT + Wayback + EDGAR + agentic)
      const secondary = await expandSecondaryPublicSurface({
        entityId: params.data.entityId,
        name: targetName,
        entityType: ent?.type ?? updatedFile.target?.type ?? "HNWI",
        companyName,
      });
      let companySecondary: typeof secondary | null = null;
      if (companyName && companyName.toLowerCase() !== targetName.toLowerCase()) {
        companySecondary = await expandSecondaryPublicSurface({
          entityId: params.data.entityId,
          name: companyName,
          entityType: "Corporation",
          companyName,
        }).catch(() => null);
      }

      // 2) Extra Boss-guided agentic pass (investigatorPrompt steers multi-hop — secondary's agentic is generic)
      const agenticAdv = await runBureauAgenticWebPass({
        targetName,
        companyName,
        objective: [
          bossPlan.investigatorPrompt ?? action.purpose,
          action.rationale,
          "Boss-selected web action — agentic multi-hop on top of Atlas secondary tools. Never invent contacts.",
        ].filter(Boolean).join("\n"),
        caseId: current.id,
        entityId: params.data.entityId,
        persist: true,
        maxIterations: 8,
      });

      await db.insert(researchCaseEventsTable).values({
        caseId: current.id,
        iteration: nextIteration,
        actorRole: "specialist",
        eventType: "observation",
        summary: `Atlas secondary + Agentic (${action.specialistId}): secondary li=${secondary.linkedin} email=${secondary.email} web=${secondary.website} related=${secondary.relatedPeople}; agentic findings=${agenticAdv.findings.length} searches=${agenticAdv.searches} visits=${agenticAdv.visits}`,
        payload: JSON.stringify({
          lane: "atlas-secondary+agentic-react",
          actionId: action.id,
          specialistId: action.specialistId,
          companyName,
          secondary,
          companySecondary,
          agentic: {
            status: agenticAdv.status,
            model: agenticAdv.model,
            findings: agenticAdv.contactEvidence,
            trajectory: agenticAdv.trajectory.slice(-12),
            error: agenticAdv.error ?? null,
          },
        }),
      });
    } catch (err: any) {
      // non-fatal — Boss plan still stands
    }
  }
  await db.insert(researchCaseEventsTable).values({
    caseId: current.id,
    iteration: nextIteration,
    actorRole: "right_hand_advisor",
    eventType: "decision",
    summary: reasoning.status === "completed"
      ? `GLM right-hand advisory recommendation: ${reasoning.actionId ?? "none"}. Boss decision remains authoritative.`
      : "GLM right-hand advisor unavailable; Boss used the local planning fallback.",
    payload: JSON.stringify({
      advisor: updatedFile.rightHandAdvice,
    }),
  });
  const progressSnap = updatedFile.investigationProgress;
  const progressBits = progressSnap
    ? `coverage=${Math.round((progressSnap.coverageRatio ?? 0) * 100)}% foundAny=${progressSnap.foundAnyCount} personal=${progressSnap.foundPersonalCount} pending=${(progressSnap.pendingVectors ?? []).length}`
    : "progress=none";
  const bossOutcome = updatedFile.bossPlan?.outcome ?? bossPlan.outcome ?? "proceed";
  const lanesHonesty = {
    rightHand: reasoning.status,
    boss: bossPlan.status,
    bossOutcome,
    progressAssessment: updatedFile.bossPlan?.progressAssessment ?? bossPlan.progressAssessment ?? null,
    reprioritize: updatedFile.bossPlan?.reprioritize ?? bossPlan.reprioritize ?? [],
    noProgressStreak: updatedFile.noProgressStreak ?? 0,
    researchDepth: updatedFile.researchDepth ?? null,
  };
  await db.insert(researchCaseEventsTable).values({
    caseId: current.id,
    iteration: nextIteration,
    actorRole: "boss",
    eventType: "decision",
    summary: action
      ? `Boss assigned ${action.title} to ${action.specialistId} (${progressBits}; rightHand=${reasoning.status}; boss=${bossPlan.status}).`
      : `Boss left no queued action; case is ready for review (${progressBits}; rightHand=${reasoning.status}; boss=${bossPlan.status}; outcome=${bossOutcome}).`,
    payload: JSON.stringify({
      action,
      decision: updatedFile.decisionLog.at(-1),
      bossPlan: updatedFile.bossPlan,
      advisorConsulted: reasoning.status === "completed",
      investigationProgress: progressSnap ?? null,
      lanes: lanesHonesty,
    }),
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
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
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