import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, entitiesTable, assetsTable, relationshipsTable, researchSessionsTable } from "@workspace/db";
import { RunResearchBody } from "@workspace/api-zod";
import { buildGraph, findShortestPath } from "../../lib/graph-engine";
import { computeBayesianScore } from "../../lib/bayesian-scorer";
import { runMcts } from "../../lib/mcts-agent";
import { generateOutreachSequence } from "../../lib/pitch-generator";
import { hybridSearch } from "../../lib/hybrid-search";
import { orchestrate } from "../../lib/agent-orchestrator";

const router = Router();

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

  const [allEntities, allAssets, allRelationships] = await Promise.all([
    db.select().from(entitiesTable),
    db.select().from(assetsTable),
    db.select().from(relationshipsTable),
  ]);

  const graph = buildGraph(allEntities, allAssets, allRelationships);

  // ── Layer 1: Hybrid Retrieval ─────────────────────────────────────────────
  let hybridMeta = { bm25Hits: 0, semanticHits: 0, graphHits: 0, totalCandidates: 0, durationMs: 0 };
  let hybridCount = 0;
  try {
    const { results: hybridResults, meta } = await hybridSearch(targetEntity.name, undefined, 15);
    hybridMeta = meta;
    hybridCount = hybridResults.length;
  } catch {
    // Non-fatal
  }

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

  await db
    .update(entitiesTable)
    .set({ bayesianScore: updatedScore, updatedAt: new Date() })
    .where(eq(entitiesTable.id, entityId));

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

  // ── Layer 4: MCTS (120 rollouts) ──────────────────────────────────────────
  const mctsResult = runMcts(graph, targetVertexId, bestBfsPath, depth);

  // ── Layer 2: Multi-Agent Critic ───────────────────────────────────────────
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
    critiqueNote = pathNodes > 1 && hasGatekeeper
      ? `Path validated — ${pathNodes} nodes, gatekeeper identified.`
      : pathNodes === 1
        ? "Isolated entity — no relationship edges. Enrich via Companies House first."
        : `${pathNodes}-hop path found — no confirmed gatekeeper. Expand graph for better results.`;
  }

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
    pitchText = `[Auto-pitch pending: ${pitchErr?.message ?? "generation error"}. Run /research/backfill-pitches to retry.]`;
  }

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

export default router;
