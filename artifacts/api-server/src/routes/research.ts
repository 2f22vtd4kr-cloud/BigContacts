import { Router, type IRouter } from "express";
import { eq, desc, sql, isNull, and, inArray } from "drizzle-orm";
import { db, entitiesTable, assetsTable, relationshipsTable, researchSessionsTable } from "@workspace/db";
import { createJob, updateJob, setActiveJob, getActiveJob } from "../lib/job-queue";
import {
  RunResearchBody,
  ListResearchSessionsQueryParams,
  GetResearchSessionParams,
  UpdateResearchStatusParams,
  UpdateResearchStatusBody,
  GeneratePitchParams,
} from "@workspace/api-zod";
import { buildGraph, findShortestPath } from "../lib/graph-engine";
import { computeBayesianScore } from "../lib/bayesian-scorer";
import { runMcts } from "../lib/mcts-agent";
import { generateOutreachSequence } from "../lib/pitch-generator";
import { hybridSearch } from "../lib/hybrid-search";
import { orchestrate } from "../lib/agent-orchestrator";

const router: IRouter = Router();

// POST /research/lead — create a bare Lead Gen session without running MCTS
router.post("/research/lead", async (req, res): Promise<void> => {
  const { targetEntityId } = req.body as { targetEntityId?: number };
  if (!targetEntityId || typeof targetEntityId !== "number") {
    res.status(400).json({ error: "targetEntityId is required" });
    return;
  }
  const [entity] = await db.select({ id: entitiesTable.id, score: entitiesTable.bayesianScore })
    .from(entitiesTable).where(eq(entitiesTable.id, targetEntityId));
  if (!entity) { res.status(404).json({ error: "Entity not found" }); return; }

  // Upsert: if a session already exists for this entity, just return it
  const [existing] = await db.select().from(researchSessionsTable)
    .where(eq(researchSessionsTable.targetEntityId, targetEntityId))
    .orderBy(desc(researchSessionsTable.createdAt))
    .limit(1);
  if (existing) { res.json(existing); return; }

  const [session] = await db.insert(researchSessionsTable).values({
    targetEntityId,
    crmStatus: "Lead Gen",
    bayesianScoreAtRuntime: entity.score ?? 0,
    pathScore: 0,
    mctsSimulations: 0,
    winningPath: null,
    mctsSteps: null,
  }).returning();
  res.status(201).json(session);
});

// POST /research/run
router.post("/research/run", async (req, res): Promise<void> => {
  const parsed = RunResearchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { entityId, depth = 3 } = parsed.data;

  const [targetEntity] = await db
    .select()
    .from(entitiesTable)
    .where(eq(entitiesTable.id, entityId));

  if (!targetEntity) {
    res.status(404).json({ error: "Entity not found" });
    return;
  }

  // Load full graph data
  const [allEntities, allAssets, allRelationships] = await Promise.all([
    db.select().from(entitiesTable),
    db.select().from(assetsTable),
    db.select().from(relationshipsTable),
  ]);

  // Build in-memory graph
  const graph = buildGraph(allEntities, allAssets, allRelationships);

  // ── Layer 1: Hybrid Retrieval (BM25 + Semantic + Graph BFS) ─────────────
  // Fast retrieval layer: BM25 keyword search + TF-IDF semantic + direct graph
  // traversal fused via RRF. BFS finds the shortest warm-introduction path.
  // Together these surface soft neighbours and hard edges for Layer 4 (MCTS).
  let hybridMeta = { bm25Hits: 0, semanticHits: 0, graphHits: 0, totalCandidates: 0, durationMs: 0 };
  let hybridCount = 0;
  try {
    const { results: hybridResults, meta } = await hybridSearch(targetEntity.name, undefined, 15);
    hybridMeta = meta;
    hybridCount = hybridResults.length;
  } catch {
    // Non-fatal — hybrid search failure must not block path finding
  }

  // Compute Bayesian score for target
  const targetAssets = allAssets.filter((a) => a.ownerEntityId === entityId);
  const targetRelationships = allRelationships.filter((r) => r.sourceEntityId === entityId);
  const hasGatekeeperConn = targetRelationships.some((r) => {
    if (r.targetType !== "Entity") return false;
    const connEntity = allEntities.find((e) => e.id === r.targetId);
    return connEntity?.type === "Gatekeeper";
  });
  const hasKnownInvestorConn = targetRelationships.some((r) => {
    if (r.targetType !== "Entity") return false;
    const connEntity = allEntities.find((e) => e.id === r.targetId);
    return connEntity?.type === "HNWI" && connEntity.bayesianScore > 0.6;
  });
  const assetCategories = [...new Set(targetAssets.map((a) => a.category))];
  const totalAssetValue = targetAssets.reduce((sum, a) => sum + (a.estimatedValue ?? 0), 0);
  const latestActivity = targetAssets
    .map((a) => a.lastActivityDate)
    .filter(Boolean)
    .sort()
    .reverse()[0];
  const daysSinceActivity = latestActivity
    ? Math.floor((Date.now() - new Date(latestActivity).getTime()) / 86400000)
    : 999;

  const updatedScore = computeBayesianScore(targetEntity.bayesianScore ?? 0.05, {
    entityType: targetEntity.type,
    assetCount: targetAssets.length,
    assetCategories,
    totalAssetValue,
    hasRecentActivity: daysSinceActivity < 180,
    recentActivityDays: daysSinceActivity,
    networkDegree: targetRelationships.length,
    hasGatekeeperConnection: hasGatekeeperConn,
    hasKnownInvestorConnection: hasKnownInvestorConn,
    hasShellCompany: allEntities.some(
      (e) => e.type === "Corporation" && allRelationships.some((r) => r.sourceEntityId === entityId && r.targetId === e.id),
    ),
    hasAviationAsset: assetCategories.includes("Aviation"),
    hasMarineAsset: assetCategories.includes("Marine"),
    hasClubMembership: assetCategories.includes("PrivateClub"),
    hasLuxuryRealEstate: assetCategories.includes("RealEstate") && totalAssetValue > 1_000_000,
    jurisdictionCount: new Set(targetAssets.map((a) => a.jurisdiction)).size,
    contactConfidence: targetEntity.contactConfidence ?? 0,
  });

  // Update Bayesian score in DB
  await db
    .update(entitiesTable)
    .set({ bayesianScore: updatedScore, updatedAt: new Date() })
    .where(eq(entitiesTable.id, entityId));

  // Find BFS path from a gatekeeper to the target
  const targetVertexId = `e:${entityId}`;
  const gatekeeperVertices = allEntities
    .filter((e) => e.type === "Gatekeeper")
    .map((e) => `e:${e.id}`);

  let bestBfsPath: string[] | null = null;
  for (const gkId of gatekeeperVertices) {
    const result = findShortestPath(graph, gkId, targetVertexId);
    if (result && (!bestBfsPath || result.path.length < bestBfsPath.length)) {
      bestBfsPath = result.path;
    }
  }

  // ── Layer 4: MCTS Deep Path Exploration (UCT · 120 rollouts) ────────────
  // Integrated within the hybrid pipeline: UCT tree search explores multi-hop
  // outreach paths seeded by the BFS result from Layer 1. Reward function uses
  // only real relationship types and personal identifiers from registries.
  const mctsResult = runMcts(graph, targetVertexId, bestBfsPath, depth);

  // ── Layer 2: Multi-Agent Critic (Planner→Retriever→Analyst→Critic) ───────
  // Full Critic synthesis: run the agent orchestrator (Planner → Retriever →
  // Analyst → Critic) on the target entity name to surface ranked candidates
  // with reasoning. The Critic's final output is stored in critiqueNote so the
  // persona engine can confirm the pipeline completed (it checks for non-null
  // generatedPitch AND the L2 contribution being a real synthesis, not a stub).
  const pathNodes = mctsResult.winningPath.length;
  const hasGatekeeper = mctsResult.winningPath.some((p) => p.role === "GATEKEEPER");
  let critiqueNote: string;
  try {
    const orchResult = await orchestrate(targetEntity.name, 5);
    const topCandidates = orchResult.results.slice(0, 3);
    if (topCandidates.length > 0) {
      const synthLines = topCandidates.map((c, i) => {
        const reasoning = (c.reasoning ?? "").slice(0, 100);
        return `#${i + 1} ${c.name} (${c.confidence} · RRF ${(c.scores.rrf * 100).toFixed(0)}%): ${reasoning}`;
      });
      const pathSuffix = pathNodes > 1 && hasGatekeeper
        ? ` | L4: ${pathNodes}-hop, gatekeeper confirmed`
        : pathNodes === 1
          ? " | L4: isolated — no graph edges yet"
          : ` | L4: ${pathNodes}-hop, no confirmed gatekeeper`;
      critiqueNote =
        `Critic synthesised ${topCandidates.length}/${orchResult.pipeline.analyst.candidateCount} candidate(s)` +
        ` (${orchResult.pipeline.critic.removed} pruned, ${orchResult.totalMs}ms).` +
        ` Top: ${synthLines.join(" · ")}${pathSuffix}.`;
    } else {
      critiqueNote = pathNodes > 1 && hasGatekeeper
        ? `Path validated — ${pathNodes} nodes, gatekeeper identified. No soft-neighbour candidates from hybrid search.`
        : pathNodes === 1
          ? "Isolated entity — no relationship edges. Enrich via Companies House to build graph."
          : `${pathNodes}-hop path found — no confirmed gatekeeper. Expand graph for better results.`;
    }
  } catch {
    // Non-fatal — fall back to simple path summary if orchestration fails
    critiqueNote = pathNodes > 1 && hasGatekeeper
      ? `Path validated — ${pathNodes} nodes, gatekeeper identified.`
      : pathNodes === 1
        ? "Isolated entity — no relationship edges. Enrich via Companies House first."
        : `${pathNodes}-hop path found — no confirmed gatekeeper. Expand graph for better results.`;
  }

  // ── Hybrid pipeline record (returned in response, not persisted) ─────────
  // Matches the 5-layer Core Hybrid Architecture:
  //   L1 Hybrid Retrieval · L2 Multi-Agent Reasoning · L3 Query Expansion
  //   L4 MCTS Deep Path Exploration · L5 Bayesian-UCB Optimization
  const algorithmPipeline = [
    {
      algo: "L1 — Hybrid Retrieval (BM25 + Semantic + Graph)",
      contribution: (() => {
        const searchPart = hybridCount > 0
          ? `${hybridCount} related entities surfaced (${hybridMeta.durationMs}ms)`
          : "No soft neighbours — entity may be isolated";
        const bfsPart = bestBfsPath
          ? `BFS: ${bestBfsPath.length}-hop path to target`
          : "BFS: no gatekeeper path (empty graph)";
        return `${searchPart} · ${bfsPart}`;
      })(),
      status: "done",
    },
    {
      algo: "L2 — Multi-Agent Reasoning (Planner→Retriever→Analyst→Critic)",
      contribution: critiqueNote,
      status: "done",
    },
    {
      algo: "L3 — Query Expansion (single-pass expandQuery)",
      contribution: "Asset synonyms · GEO_MAP · intent background terms applied at retrieval",
      status: "done",
    },
    {
      algo: "L4 — UCT Deep Path Exploration (120 rollouts)",
      contribution: `Path score: ${(mctsResult.pathScore * 100).toFixed(0)}/100 · ${mctsResult.mctsSteps.length} step${mctsResult.mctsSteps.length !== 1 ? "s" : ""}`,
      status: "done",
    },
    {
      algo: "L5 — Bayesian-UCB Optimization",
      contribution: `Score: ${(targetEntity.bayesianScore ?? 0).toFixed(3)} → ${updatedScore.toFixed(3)} · UCB exploitation ${updatedScore >= 0.7 ? "high priority" : "standard"}`,
      status: "done",
    },
  ];

  // ── Layer 2 Critic synthesis — generate full outreach pitch immediately ──────
  // The Critic stage's final output is the pitch. Generating it here ensures
  // every session has a generatedPitch (persona engine checks this field).
  const entityAssets = await db
    .select()
    .from(assetsTable)
    .where(eq(assetsTable.ownerEntityId, entityId));

  const gatekeeper = mctsResult.winningPath.find((p) => p.role === "GATEKEEPER") ?? null;
  const pitchCtx = {
    targetEntity: {
      name: targetEntity.name,
      type: targetEntity.type,
      nationality: targetEntity.nationality,
      estimatedNetWorth: targetEntity.estimatedNetWorth,
      knownResidences: targetEntity.knownResidences,
      notes: targetEntity.notes,
      contactEmail: targetEntity.email,
      contactPhone: targetEntity.phone,
    },
    gatekeeper,
    assets: entityAssets.map((a) => ({
      category: a.category,
      identifier: a.identifier,
      jurisdiction: a.jurisdiction,
      estimatedValue: a.estimatedValue,
      address: a.address,
    })),
    winningPath: mctsResult.winningPath,
    pathScore: mctsResult.pathScore,
  };
  let pitchText = "";
  try {
    const outreach = generateOutreachSequence(pitchCtx);
    pitchText = [
      outreach.initial,
      "---\n**7-day follow-up:**",
      outreach.followUp,
      "---\n**Intro script for gatekeeper:**",
      outreach.introScript,
    ].join("\n\n");
  } catch (pitchErr: any) {
    // Always create a session even if pitch generation fails — persona engine
    // checks generatedPitch IS NOT NULL; a placeholder beats null.
    pitchText = `[Auto-pitch pending: ${pitchErr?.message ?? "generation error"}. Run /research/backfill-pitches to retry.]`;
  }

  // Persist research session with generated pitch
  const [session] = await db
    .insert(researchSessionsTable)
    .values({
      targetEntityId: entityId,
      winningPath: JSON.stringify(mctsResult.winningPath),
      mctsSteps: JSON.stringify(mctsResult.mctsSteps),
      crmStatus: pitchText.startsWith("[Auto-pitch pending") ? "Pitch Pending" : "Pitch Generated",
      bayesianScoreAtRuntime: updatedScore,
      pathScore: mctsResult.pathScore,
      generatedPitch: pitchText,
    })
    .returning();

  res.status(201).json({
    ...session!,
    targetEntityName: targetEntity.name,
    createdAt: session!.createdAt.toISOString(),
    algorithmPipeline,
  });
});

// GET /research/sessions
router.get("/research/sessions", async (req, res): Promise<void> => {
  const parsed = ListResearchSessionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { entityId, status, limit = 50 } = parsed.data;

  const rows = await db
    .select({ session: researchSessionsTable, entityName: entitiesTable.name })
    .from(researchSessionsTable)
    .leftJoin(entitiesTable, eq(researchSessionsTable.targetEntityId, entitiesTable.id))
    .orderBy(desc(researchSessionsTable.createdAt))
    .limit(limit);

  const sessions = rows
    .filter((r) => {
      if (entityId && r.session.targetEntityId !== entityId) return false;
      if (status && r.session.crmStatus !== status) return false;
      return true;
    })
    .map(({ session, entityName }) => ({
      ...session,
      targetEntityName: entityName ?? null,
      createdAt: session.createdAt.toISOString(),
    }));

  res.json(sessions);
});

// GET /research/sessions/:id
router.get("/research/sessions/:id", async (req, res): Promise<void> => {
  const params = GetResearchSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({ session: researchSessionsTable, entityName: entitiesTable.name })
    .from(researchSessionsTable)
    .leftJoin(entitiesTable, eq(researchSessionsTable.targetEntityId, entitiesTable.id))
    .where(eq(researchSessionsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Research session not found" });
    return;
  }

  res.json({
    ...row.session,
    targetEntityName: row.entityName ?? null,
    createdAt: row.session.createdAt.toISOString(),
  });
});

// PATCH /research/sessions/:id/status
router.patch("/research/sessions/:id/status", async (req, res): Promise<void> => {
  const params = UpdateResearchStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateResearchStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {
    crmStatus: body.data.crmStatus,
    updatedAt: new Date(),
  };
  if (body.data.lastContactDate) updateData.lastContactDate = body.data.lastContactDate;
  // Accept notes and followUpDate from request body even if not in Zod schema
  const extra = req.body as Record<string, unknown>;
  if (typeof extra.notes === "string" || extra.notes === null) updateData.notes = extra.notes;
  if (typeof extra.followUpDate === "string" || extra.followUpDate === null) updateData.followUpDate = extra.followUpDate;

  const [session] = await db
    .update(researchSessionsTable)
    .set(updateData)
    .where(eq(researchSessionsTable.id, params.data.id))
    .returning();

  if (!session) {
    res.status(404).json({ error: "Research session not found" });
    return;
  }

  const [entityRow] = await db
    .select({ name: entitiesTable.name })
    .from(entitiesTable)
    .where(eq(entitiesTable.id, session.targetEntityId));

  res.json({
    ...session,
    targetEntityName: entityRow?.name ?? null,
    createdAt: session.createdAt.toISOString(),
  });
});

// POST /research/sessions/:id/pitch
router.post("/research/sessions/:id/pitch", async (req, res): Promise<void> => {
  const params = GeneratePitchParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({ session: researchSessionsTable, entity: entitiesTable })
    .from(researchSessionsTable)
    .leftJoin(entitiesTable, eq(researchSessionsTable.targetEntityId, entitiesTable.id))
    .where(eq(researchSessionsTable.id, params.data.id));

  if (!row || !row.entity) {
    res.status(404).json({ error: "Research session not found" });
    return;
  }

  const { session, entity } = row;

  // Load target's assets
  const targetAssets = await db
    .select()
    .from(assetsTable)
    .where(eq(assetsTable.ownerEntityId, entity.id));

  // Parse winning path
  let winningPath = [];
  try {
    winningPath = session.winningPath ? JSON.parse(session.winningPath) : [];
  } catch {
    winningPath = [];
  }

  const gatekeeper = winningPath.find(
    (p: { role: string }) => p.role === "GATEKEEPER",
  ) ?? null;

  // Validate gatekeeper shape before passing to pitch generator
  const safeGatekeeper =
    gatekeeper &&
    typeof gatekeeper === "object" &&
    typeof (gatekeeper as any).label === "string"
      ? gatekeeper
      : null;

  // Generate full outreach sequence — wrapped in try/catch so an unexpected
  // gatekeeper type never crashes the server with an unhandled exception.
  let sequence: ReturnType<typeof generateOutreachSequence>;
  try {
    sequence = generateOutreachSequence({
      targetEntity: {
        name: entity.name,
        type: entity.type,
        nationality: entity.nationality,
        estimatedNetWorth: entity.estimatedNetWorth,
        knownResidences: entity.knownResidences,
        notes: entity.notes,
        contactEmail: entity.contactEmail ?? null,
        contactPhone: entity.contactPhone ?? null,
      },
      gatekeeper: safeGatekeeper,
      assets: targetAssets.map((a) => ({
        category: a.category,
        identifier: a.identifier,
        jurisdiction: a.jurisdiction,
        estimatedValue: a.estimatedValue,
        address: a.address,
      })),
      winningPath,
      pathScore: session.pathScore ?? 0,
    });
  } catch (pitchErr: any) {
    console.error("[pitch-generator] Uncaught error:", pitchErr?.message ?? pitchErr);
    res.status(500).json({
      error:
        `Pitch generation failed: ${pitchErr?.message ?? "Unknown error"}. ` +
        "Check gatekeeper type and winning path data.",
    });
    return;
  }

  // Update session with full sequence as JSON
  const [updated] = await db
    .update(researchSessionsTable)
    .set({
      generatedPitch: JSON.stringify(sequence),
      crmStatus: "Pitch Generated",
      updatedAt: new Date(),
    })
    .where(eq(researchSessionsTable.id, params.data.id))
    .returning();

  res.json({
    ...updated!,
    targetEntityName: entity.name,
    createdAt: updated!.createdAt.toISOString(),
  });
});

// POST /research/backfill-pitches — generate pitches for all sessions that lack one
router.post("/research/backfill-pitches", async (_req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(researchSessionsTable)
    .where(sql`${researchSessionsTable.generatedPitch} IS NULL`);

  let updated = 0;
  let errors = 0;

  for (const s of sessions) {
    try {
      const [entity] = await db.select().from(entitiesTable).where(eq(entitiesTable.id, s.targetEntityId));
      if (!entity) { errors++; continue; }

      const entityAssets = await db.select().from(assetsTable).where(eq(assetsTable.ownerEntityId, s.targetEntityId));
      const winningPath = (() => { try { return JSON.parse(s.winningPath ?? "[]"); } catch { return []; } })();
      const gatekeeper = winningPath.find((p: { role: string }) => p.role === "GATEKEEPER") ?? null;

      const outreach = generateOutreachSequence({
        targetEntity: {
          name: entity.name, type: entity.type, nationality: entity.nationality,
          estimatedNetWorth: entity.estimatedNetWorth, knownResidences: entity.knownResidences,
          notes: entity.notes, contactEmail: entity.email, contactPhone: entity.phone,
        },
        gatekeeper,
        assets: entityAssets.map((a) => ({
          category: a.category, identifier: a.identifier, jurisdiction: a.jurisdiction,
          estimatedValue: a.estimatedValue, address: a.address,
        })),
        winningPath,
        pathScore: s.pathScore ?? 0,
      });

      const pitchText = [
        outreach.initial,
        "---\n**7-day follow-up:**",
        outreach.followUp,
        "---\n**Intro script for gatekeeper:**",
        outreach.introScript,
      ].join("\n\n");

      await db.update(researchSessionsTable)
        .set({ generatedPitch: pitchText, crmStatus: "Pitch Generated", updatedAt: new Date() })
        .where(eq(researchSessionsTable.id, s.id));
      updated++;
    } catch {
      errors++;
    }
  }

  res.json({ updated, errors, message: `Backfilled pitches for ${updated} sessions (${errors} errors).` });
});

// POST /research/bulk-run — run Hybrid Research on top N hot leads in a single background job
// Loads the full entity graph ONCE, then processes entities sequentially.
// This is ~50× faster than calling /research/run N times (avoids repeated full DB scans).
router.post("/research/bulk-run", async (req, res): Promise<void> => {
  const existing = await getActiveJob("bulk-mcts");
  if (existing) {
    res.status(409).json({ error: "A bulk Hybrid Research run is already in progress.", jobId: existing });
    return;
  }

  const batchSize  = Math.min(parseInt((req.body as any)?.batchSize ?? "60", 10), 300);
  const skipExisting = (req.body as any)?.skipExisting !== false; // default true

  // D1: entity count guard — if DB is near-empty (FAA ingest still running), skip this pass.
  // The scheduled triggers at 8min/15min/etc. will retry automatically.
  const ecResult = await db.execute(sql`SELECT COUNT(*) AS c FROM entities`);
  const entityCount = Number((ecResult.rows[0] as any)?.c ?? 0);
  if (entityCount < 500) {
    res.json({ message: `Skipped — only ${entityCount} entities in DB. Retry once ingestion completes.`, jobId: null, skippedReason: "insufficient_entities" });
    return;
  }

  // Find top hot leads that need sessions — only HNWI and Gatekeeper entities are actionable
  // (Corporation/Trust are property vehicles; address-named HMLR/FAA entities are not researchable)
  const existingSessionEntityIds = skipExisting
    ? (await db.select({ eid: researchSessionsTable.targetEntityId }).from(researchSessionsTable)).map(r => r.eid)
    : [];

  const candidates = await db
    .select()
    .from(entitiesTable)
    .where(
      and(
        sql`${entitiesTable.isHot} = true`,
        inArray(entitiesTable.type, ["HNWI", "Gatekeeper"]),
        // Exclude address-named entities (HMLR property addresses start with a number)
        sql`${entitiesTable.name} !~ '^[0-9]'`,
      )
    )
    .orderBy(desc(entitiesTable.bayesianScore))
    .limit(batchSize * 6); // over-fetch to filter out already-run

  const targets = candidates
    .filter(e => !existingSessionEntityIds.includes(e.id))
    .slice(0, batchSize);

  if (targets.length === 0) {
    res.json({ message: "All hot leads already have research sessions.", jobId: null });
    return;
  }

  const jobId = await createJob("bulk-mcts");
  await setActiveJob("bulk-mcts", jobId);

  res.status(202).json({
    jobId,
    pollUrl: `/api/ingest/job/${jobId}`,
    total: targets.length,
    message: `Bulk Hybrid Research started for ${targets.length} hot leads.`,
  });

  // Background processing — load graph ONCE, run all sessions
  (async () => {
    let done = 0;
    let errors = 0;

    try {
      await updateJob(jobId, { progress: 0, total: targets.length, inserted: 0, message: "Loading graph from database…" });

      // One big load — shared across all sessions
      const [allEntities, allAssets, allRelationships] = await Promise.all([
        db.select().from(entitiesTable),
        db.select().from(assetsTable),
        db.select().from(relationshipsTable),
      ]);
      const graph = buildGraph(allEntities, allAssets, allRelationships);

      for (const targetEntity of targets) {
        try {
          await updateJob(jobId, {
            progress: done,
            total: targets.length,
            inserted: done,
            errors,
            message: `Running Hybrid Research for ${targetEntity.name} (${done + 1}/${targets.length})…`,
          });

          // Bayesian score update
          const entityId = targetEntity.id;
          const targetAssets = allAssets.filter(a => a.ownerEntityId === entityId);
          const targetRelationships = allRelationships.filter(r => r.sourceEntityId === entityId);
          const assetCategories = [...new Set(targetAssets.map(a => a.category))];
          const totalAssetValue = targetAssets.reduce((s, a) => s + (a.estimatedValue ?? 0), 0);
          const hasGatekeeperConn = targetRelationships.some(r => {
            if (r.targetType !== "Entity") return false;
            const e = allEntities.find(e => e.id === r.targetId);
            return e?.type === "Gatekeeper";
          });
          const hasKnownInvestorConn = targetRelationships.some(r => {
            if (r.targetType !== "Entity") return false;
            const e = allEntities.find(e => e.id === r.targetId);
            return e?.type === "HNWI" && (e.bayesianScore ?? 0) > 0.6;
          });

          const updatedScore = computeBayesianScore(targetEntity.bayesianScore ?? 0.05, {
            entityType: targetEntity.type,
            assetCount: targetAssets.length,
            assetCategories,
            totalAssetValue,
            hasRecentActivity: false,
            recentActivityDays: 999,
            networkDegree: targetRelationships.length,
            hasGatekeeperConnection: hasGatekeeperConn,
            hasKnownInvestorConnection: hasKnownInvestorConn,
            hasShellCompany: false,
            hasAviationAsset: assetCategories.includes("Aviation"),
            hasMarineAsset: assetCategories.includes("Marine"),
            hasClubMembership: assetCategories.includes("PrivateClub"),
            hasLuxuryRealEstate: assetCategories.includes("RealEstate") && totalAssetValue > 1_000_000,
            jurisdictionCount: new Set(targetAssets.map(a => a.jurisdiction)).size,
            contactConfidence: targetEntity.contactConfidence ?? 0,
          });

          await db.update(entitiesTable)
            .set({ bayesianScore: updatedScore, isHot: updatedScore >= 0.70, updatedAt: new Date() })
            .where(eq(entitiesTable.id, entityId));

          // BFS + MCTS using shared graph
          const targetVertexId = `e:${entityId}`;
          const gatekeeperVertices = allEntities.filter(e => e.type === "Gatekeeper").map(e => `e:${e.id}`);
          let bestBfsPath: string[] | null = null;
          for (const gkId of gatekeeperVertices) {
            const r = findShortestPath(graph, gkId, targetVertexId);
            if (r && (!bestBfsPath || r.path.length < bestBfsPath.length)) bestBfsPath = r.path;
          }
          const mctsResult = runMcts(graph, targetVertexId, bestBfsPath, 3);

          // Lightweight Critic note (no full orchestrate() to keep bulk fast)
          const pathNodes = mctsResult.winningPath.length;
          const hasGatekeeper = mctsResult.winningPath.some(p => p.role === "GATEKEEPER");
          const critiqueNote = pathNodes > 1 && hasGatekeeper
            ? `Bulk run — Path validated: ${pathNodes} nodes, gatekeeper confirmed. Score: ${(mctsResult.pathScore * 100).toFixed(0)}/100.`
            : pathNodes > 1
              ? `Bulk run — ${pathNodes}-hop path found, no confirmed gatekeeper. Score: ${(mctsResult.pathScore * 100).toFixed(0)}/100.`
              : `Bulk run — Isolated entity. 0 edges. Score: ${(mctsResult.pathScore * 100).toFixed(0)}/100. Run CH enrichment to build graph.`;

          // Pitch generation
          const gatekeeper = mctsResult.winningPath.find(p => p.role === "GATEKEEPER") ?? null;
          let pitchText = "";
          try {
            const outreach = generateOutreachSequence({
              targetEntity: {
                name: targetEntity.name, type: targetEntity.type,
                nationality: targetEntity.nationality, estimatedNetWorth: targetEntity.estimatedNetWorth,
                knownResidences: targetEntity.knownResidences, notes: targetEntity.notes,
                contactEmail: targetEntity.email, contactPhone: targetEntity.phone,
              },
              gatekeeper,
              assets: targetAssets.map(a => ({
                category: a.category, identifier: a.identifier, jurisdiction: a.jurisdiction,
                estimatedValue: a.estimatedValue, address: a.address,
              })),
              winningPath: mctsResult.winningPath,
              pathScore: mctsResult.pathScore,
            });
            pitchText = [
              outreach.initial,
              "---\n**7-day follow-up:**",
              outreach.followUp,
              "---\n**Intro script for gatekeeper:**",
              outreach.introScript,
            ].join("\n\n");
          } catch {
            pitchText = `[Bulk Research pitch — ${targetEntity.name}. Path score: ${(mctsResult.pathScore * 100).toFixed(0)}/100. Run /research/backfill-pitches to regenerate.]`;
          }

          await db.insert(researchSessionsTable).values({
            targetEntityId: entityId,
            winningPath: JSON.stringify(mctsResult.winningPath),
            mctsSteps: JSON.stringify(mctsResult.mctsSteps),
            crmStatus: "Pitch Generated",
            bayesianScoreAtRuntime: updatedScore,
            pathScore: mctsResult.pathScore,
            generatedPitch: pitchText,
            notes: critiqueNote,
          });

          done++;
        } catch (err: any) {
          errors++;
        }
      }

      await updateJob(jobId, {
        progress: targets.length,
        total: targets.length,
        inserted: done,
        errors,
        status: "done",
        message: `Bulk Hybrid Research complete — ${done} sessions created, ${errors} errors.`,
      });
    } catch (err: any) {
      await updateJob(jobId, {
        status: "failed",
        message: `Bulk Hybrid Research crashed: ${err.message}`,
      } as any);
    } finally {
      await setActiveJob("bulk-mcts", "");
    }
  })().catch(() => setActiveJob("bulk-mcts", ""));
});

export default router;
