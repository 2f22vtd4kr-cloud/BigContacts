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
  GEMINI_BOSS_MODEL_PENDING,
  parseDiscoveryCaseFile,
  parseCaseFile,
  runGeminiBossDiscovery,
  resolveGeminiBossModel,
  DEFAULT_DISCOVERY_MOTIVATION,
  DEFAULT_DISCOVERY_OBJECTIVE,
  runMistralWebSearch,
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
    summary: "Discovery case opened; Boss opening brief is ready for Gemini public-web research.",
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

/**
 * Run one bounded discovery-first investigation:
 * 1. Gemini Boss opens the web-grounded case context.
 * 2. The existing mixed-source discovery/admission runner searches the public
 *    web without requiring an existing entity.
 * 3. A small registry mix adds independent review-only company anchors.
 *
 * This route intentionally does not run Atlas-wide ingestion or promote any
 * candidate into a target case.
 */
router.post("/research/bureau/cases/:caseId/run-discovery", async (req, res): Promise<void> => {
  const caseId = Number(req.params.caseId);
  if (!Number.isInteger(caseId) || caseId <= 0) {
    res.status(400).json({ error: "Invalid bureau case ID" });
    return;
  }
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
      const [boss, mistral] = await Promise.all([
        runGeminiBossDiscovery({
          objective: file.humanBrief.objective,
          motivation: file.humanBrief.motivation,
          geography: file.humanBrief.geography,
          exclusions: file.humanBrief.exclusions,
        }),
        runMistralWebSearch({
          objective: file.humanBrief.objective,
          motivation: file.humanBrief.motivation,
          geography: file.humanBrief.geography,
          exclusions: file.humanBrief.exclusions,
        }),
      ]);
      await updateJob(jobId, {
        progress: 1,
        message: boss.status === "completed" || mistral.status === "completed"
          ? `Provider opening complete with ${boss.candidates.length + mistral.candidates.length} review-only candidate(s); mixed discovery starting…`
          : `Provider opening unavailable; continuing with independent discovery lanes…`,
      });
      await appendJobLog(jobId, `Boss opening ${boss.status}; model=${boss.model}; citations=${boss.citations.length}.`);
      await appendJobLog(jobId, `Mistral web-search ${mistral.status}; model=${mistral.model}; citations=${mistral.citations.length}.`);

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
      await appendJobLog(jobId, "Mixed-source discovery started: web admission plus registry review lanes.");

      // maxEntities=0 is intentional: broad discovery still runs its AI
      // admission gate and returns candidates, but this bureau pass never
      // silently inserts a target before human review.
      const broad = await runBroadDiscovery({
        templateSet: 1,
        rotateTemplates: false,
        maxQueries: 3,
        maxEntities: 0,
      });
      const registryQuery = `${file.humanBrief.geography} investment family office`.slice(0, 120);
      const registryIds: RegistryId[] = [
        "gleif",
        "sec-edgar",
        ...(process.env.COMPANIES_HOUSE_API_KEY ? ["companies-house" as RegistryId] : []),
      ];
      const registryResults = await Promise.all(registryIds.map(async (registry) => {
        try {
          return { registry, results: await searchRegistry({ query: registryQuery, registry, limit: 3 }), error: null };
        } catch (error) {
          return { registry, results: [], error: error instanceof Error ? error.message : "registry request failed" };
        }
      }));
      const registryErrors = registryResults.filter((entry) => entry.error);
      const reviewCandidates = [
        ...boss.candidates.map((candidate) => ({
          name: candidate.name,
          type: candidate.type ?? "review_candidate",
          relevance: candidate.relevance ?? "Returned by the Boss opening request; exact attribution requires review.",
          reachability: candidate.reachability ?? "Unresolved until exact identity and route evidence are checked.",
          sourceUrls: [...new Set([...(candidate.sourceUrls ?? []), ...boss.citations])].slice(0, 8),
          state: "review_only" as const,
        })),
        ...mistral.candidates.map((candidate) => ({
          name: candidate.name,
          type: candidate.type ?? "review_candidate",
          relevance: candidate.relevance ?? "Returned by the Mistral web-search lane; exact attribution requires review.",
          reachability: candidate.reachability ?? "Unresolved until exact identity and route evidence are checked.",
          sourceUrls: [...new Set([...(candidate.sourceUrls ?? []), ...mistral.citations])].slice(0, 8),
          state: "review_only" as const,
        })),
        ...broad.newEntities.map((candidate) => ({
          name: candidate.name,
          type: "review_candidate",
          relevance: "Passed the existing broad-discovery admission gate; retained here without insertion.",
          reachability: "Unresolved; no access claim is made.",
          sourceUrls: [] as string[],
          state: "review_only" as const,
        })),
        ...registryResults.flatMap(({ registry, results }) => results.map((result) => ({
          name: result.name,
          type: result.type,
          relevance: `Registry anchor from ${registry}; ownership, wealth, and mission relevance remain unconfirmed.`,
          reachability: "Registry record only; no access claim is made.",
          sourceUrls: [] as string[],
          state: "review_only" as const,
        }))),
      ].filter((candidate, index, all) =>
        candidate.name && all.findIndex((other) => other.name.toLowerCase() === candidate.name.toLowerCase()) === index
      ).slice(0, 50);
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
      const commentary = [
        bossUnavailable
          ? "The Gemini Boss opening was unavailable, so its provider gap is preserved explicitly."
          : "The Boss opening completed and established the first durable case context.",
        "The remaining bounded public-web and registry lanes ran without treating the unavailable Boss as a fatal case error.",
        `Retain ${reviewCandidates.length} candidate/anchor record(s) for human review only.`,
        "Next decision: review identity, mission relevance, provenance, and realistic reachability before promoting any candidate into target-scoped research.",
      ].join(" ");
      const updatedFile = {
        ...file,
        initialResearch: {
          status: "recorded" as const,
          researchResponse: mixedReport,
          bossCommentary: commentary,
          sourceUrls: [...new Set([...boss.citations, ...registryResults.flatMap((entry) => entry.results.flatMap((result) => {
            try {
              const metadata = result.metadata ? JSON.parse(result.metadata) as Record<string, unknown> : {};
              return typeof metadata.url === "string" ? [metadata.url] : [];
            } catch {
              return [];
            }
          }))])].slice(0, 80),
          recordedAt: now().toISOString(),
        },
        discoveredCandidates: reviewCandidates,
        decisionLog: [
          ...file.decisionLog,
          {
            iteration: current.iteration + 1,
            decision: "Run one bounded mixed-source discovery pass and hold all candidates for human review.",
            reason: bossUnavailable && mistral.status !== "completed"
              ? "The Gemini and Mistral opening providers were unavailable; continue with independent discovery lanes while preserving both gaps. Promotion still requires exact identity, attribution, provenance, and reachability review."
              : "The opening provider lanes supplied preliminary web context; promotion requires exact identity, attribution, provenance, and reachability review.",
            createdAt: now().toISOString(),
          },
        ].slice(-50),
        lastUpdatedBy: bossUnavailable ? "mixed-source-discovery-gemini-gap" : "gemini-boss-mixed-source-discovery",
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
          summary: `Mixed-source discovery completed: ${reviewCandidates.length} review-only candidate/anchor record(s).`,
          payload: JSON.stringify({
            jobId,
            bossModel: boss.model,
            bossCitations: boss.citations.length,
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
          payload: JSON.stringify({ nextAction: "human-review-discovery-candidates", candidateCount: reviewCandidates.length }),
        },
      ]);
      await appendJobLog(jobId, `Discovery complete; review-only candidates=${reviewCandidates.length}; no entity insertion.`);
      await updateJob(jobId, {
        status: "done",
        progress: 4,
        total: 4,
        inserted: 0,
        skipped: 0,
        errors: registryErrors.length,
        message: `Discovery complete: ${reviewCandidates.length} review-only candidate/anchor record(s); no target promoted.`,
        result: JSON.stringify({
          caseId,
          bossModel: boss.model,
          bossCitations: boss.citations.length,
          webQueries: broad.queriesFired,
          webResults: broad.resultsScraped,
          reviewCandidates: reviewCandidates.length,
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

  res.status(202).json({
    caseId,
    jobId,
    pollUrl: `/api/ingest/job/${jobId}`,
    caseUrl: `/api/research/bureau/cases/${caseId}`,
    message: "Boss opening request and bounded mixed-source discovery started; candidates remain review-only.",
  });
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
    directorModel: (await resolveGeminiBossModel()).model,
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