import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, entitiesTable, assetsTable, relationshipsTable, researchSessionsTable } from "@workspace/db";
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

  // ── Algorithm 2: Hybrid Search (BM25 + TF-IDF + RRF) ────────────────────
  // Find entities semantically related to the target — surfaces soft neighbours
  // that may not have hard graph edges yet, enriching the MCTS context.
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

  // ── Algorithm 4: MCTS (UCT, 120 simulations) ────────────────────────────
  const mctsResult = runMcts(graph, targetVertexId, bestBfsPath, depth);

  // ── Algorithm 5: Agent Critique summary ──────────────────────────────────
  // Lightweight — summarises the path quality without full orchestration overhead.
  const pathNodes = mctsResult.winningPath.length;
  const hasGatekeeper = mctsResult.winningPath.some((p) => p.role === "GATEKEEPER");
  const critiqueNote = pathNodes > 1 && hasGatekeeper
    ? `Path validated — ${pathNodes} nodes, gatekeeper identified.`
    : pathNodes === 1
      ? "Isolated entity — no relationship edges. Enrich via Companies House first."
      : `${pathNodes}-hop path found — no confirmed gatekeeper. Expand graph for better results.`;

  // ── Algorithm pipeline record (returned in response, not persisted) ──────
  const algorithmPipeline = [
    {
      algo: "Bayesian-UCB",
      contribution: `Score: ${(targetEntity.bayesianScore ?? 0).toFixed(3)} → ${updatedScore.toFixed(3)}`,
      status: "done",
    },
    {
      algo: "Hybrid Search (BM25 + TF-IDF + RRF)",
      contribution: hybridCount > 0
        ? `${hybridCount} related entities surfaced (${hybridMeta.durationMs}ms)`
        : "No related entities found — entity may be isolated",
      status: "done",
    },
    {
      algo: "BFS Graph Engine",
      contribution: bestBfsPath
        ? `Warm path: ${bestBfsPath.length} hops to target`
        : "No gatekeeper path — entity graph is empty",
      status: "done",
    },
    {
      algo: "MCTS (UCT · 120 rollouts)",
      contribution: `Path score: ${(mctsResult.pathScore * 100).toFixed(0)}/100 · ${mctsResult.mctsSteps.length} step${mctsResult.mctsSteps.length !== 1 ? "s" : ""}`,
      status: "done",
    },
    {
      algo: "Agent Critique",
      contribution: critiqueNote,
      status: "done",
    },
  ];

  // Persist research session
  const [session] = await db
    .insert(researchSessionsTable)
    .values({
      targetEntityId: entityId,
      winningPath: JSON.stringify(mctsResult.winningPath),
      mctsSteps: JSON.stringify(mctsResult.mctsSteps),
      crmStatus: mctsResult.crmStatus,
      bayesianScoreAtRuntime: updatedScore,
      pathScore: mctsResult.pathScore,
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

export default router;
