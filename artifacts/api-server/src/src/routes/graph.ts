import { Router, type IRouter } from "express";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db, entitiesTable, assetsTable, relationshipsTable } from "@workspace/db";
import { GetEntityGraphParams, GetEntityGraphQueryParams, GetConnectionPathQueryParams } from "@workspace/api-zod";
import {
  buildGraph,
  extractSubgraph,
  findShortestPath,
  computeCentrality,
  type GraphVertex,
  type GraphArc,
  type EntityRow,
  type AssetRow,
  type RelationshipRow,
} from "../lib/graph-engine";

const router: IRouter = Router();

/** Hard caps so a pathological dense hub cannot OOM the API. */
const MAX_GRAPH_ENTITIES = 400;
const MAX_GRAPH_ASSETS = 400;
const MAX_GRAPH_RELATIONSHIPS = 1200;
const MAX_PATH_HOPS = 6;

function vertexToNode(v: GraphVertex, centralSet: Set<string>, targetId: string) {
  return {
    id: v.id,
    label: v.label,
    nodeType: v.nodeType,
    bayesianScore: v.bayesianScore ?? null,
    estimatedValue: v.estimatedValue ?? null,
    metadata: v.metadata ?? null,
    nationality: v.nationality ?? null,
    contactConfidence: v.contactConfidence ?? null,
    contactEmail: v.contactEmail ?? null,
    contactPhone: v.contactPhone ?? null,
    contactOutcome: v.contactOutcome ?? null,
    isTarget: v.id === targetId,
    isCentral: centralSet.has(v.id),
  };
}

function arcToEdge(arc: GraphArc) {
  return {
    id: arc.id.replace("_rev", ""),
    source: arc.source,
    target: arc.target,
    label: arc.label,
    strength: arc.strength ?? null,
    provenanceScore: arc.provenanceScore ?? null,
    citationCount: arc.citationCount ?? 0,
    freshnessScore: arc.freshnessScore ?? null,
    evidenceStatus: arc.evidenceStatus ?? "review",
  };
}

function toEntityRow(e: typeof entitiesTable.$inferSelect): EntityRow {
  return {
    id: e.id,
    name: e.name,
    type: e.type,
    bayesianScore: e.bayesianScore ?? 0,
    nationality: e.nationality,
    estimatedNetWorth: e.estimatedNetWorth,
    metadata: e.metadata,
    contactEmail: e.email,
    contactPhone: e.phone,
    contactConfidence: e.contactConfidence,
    phoneSource: e.phoneSource ?? null,
    contactOutcome: e.contactOutcome ?? null,
  };
}

function toAssetRow(a: typeof assetsTable.$inferSelect): AssetRow {
  return {
    id: a.id,
    category: a.category,
    identifier: a.identifier,
    jurisdiction: a.jurisdiction ?? "",
    estimatedValue: a.estimatedValue,
    ownerEntityId: a.ownerEntityId,
  };
}

function toRelRow(r: typeof relationshipsTable.$inferSelect): RelationshipRow {
  return {
    id: r.id,
    sourceEntityId: r.sourceEntityId,
    targetId: r.targetId,
    targetType: r.targetType,
    relationshipType: r.relationshipType,
    strength: r.strength,
    notes: r.notes,
  };
}

/**
 * Load only the neighborhood of a center entity up to `depth` hops.
 * Avoids full-table scans that OOM / stall on large registries.
 */
async function loadNeighborhood(centerEntityId: number, depth: number): Promise<{
  entities: EntityRow[];
  assets: AssetRow[];
  relationships: RelationshipRow[];
  truncated: boolean;
}> {
  const entityIds = new Set<number>([centerEntityId]);
  const assetIds = new Set<number>();
  const seenRelIds = new Set<number>();
  const relationships: RelationshipRow[] = [];
  let truncated = false;

  let frontier = new Set<number>([centerEntityId]);

  for (let d = 0; d < depth; d++) {
    if (frontier.size === 0) break;
    const frontierIds = [...frontier];
    // Chunk IN clauses for safety
    const chunkSize = 200;
    const batchRels: (typeof relationshipsTable.$inferSelect)[] = [];

    for (let i = 0; i < frontierIds.length; i += chunkSize) {
      const chunk = frontierIds.slice(i, i + chunkSize);
      const rows = await db
        .select()
        .from(relationshipsTable)
        .where(
          or(
            inArray(relationshipsTable.sourceEntityId, chunk),
            and(
              inArray(relationshipsTable.targetId, chunk),
              eq(relationshipsTable.targetType, "Entity"),
            ),
          ),
        )
        .limit(MAX_GRAPH_RELATIONSHIPS);
      batchRels.push(...rows);
    }

    const nextFrontier = new Set<number>();
    for (const r of batchRels) {
      if (seenRelIds.has(r.id)) continue;
      if (relationships.length >= MAX_GRAPH_RELATIONSHIPS) {
        truncated = true;
        break;
      }
      seenRelIds.add(r.id);
      relationships.push(toRelRow(r));

      entityIds.add(r.sourceEntityId);
      if (r.targetType === "Entity") {
        entityIds.add(r.targetId);
        if (!frontier.has(r.targetId) && r.targetId !== centerEntityId) {
          nextFrontier.add(r.targetId);
        }
        if (!frontier.has(r.sourceEntityId) && r.sourceEntityId !== centerEntityId) {
          nextFrontier.add(r.sourceEntityId);
        }
      } else if (r.targetType === "Asset") {
        assetIds.add(r.targetId);
      }
    }

    // Also pull entity→asset ownership edges for entities already in the set
    // (depth still advances only for entity hops via nextFrontier)
    if (entityIds.size > 0 && assetIds.size < MAX_GRAPH_ASSETS) {
      const entList = [...entityIds];
      for (let i = 0; i < entList.length; i += chunkSize) {
        const chunk = entList.slice(i, i + chunkSize);
        const assetRels = await db
          .select()
          .from(relationshipsTable)
          .where(
            and(
              inArray(relationshipsTable.sourceEntityId, chunk),
              eq(relationshipsTable.targetType, "Asset"),
            ),
          )
          .limit(MAX_GRAPH_ASSETS);
        for (const r of assetRels) {
          if (seenRelIds.has(r.id)) continue;
          if (relationships.length >= MAX_GRAPH_RELATIONSHIPS) {
            truncated = true;
            break;
          }
          seenRelIds.add(r.id);
          relationships.push(toRelRow(r));
          assetIds.add(r.targetId);
        }
      }
    }

    // Bound entity growth
    for (const id of nextFrontier) {
      if (entityIds.size >= MAX_GRAPH_ENTITIES) {
        truncated = true;
        nextFrontier.clear();
        break;
      }
      entityIds.add(id);
    }
    frontier = nextFrontier;
  }

  const entityIdList = [...entityIds].slice(0, MAX_GRAPH_ENTITIES);
  if (entityIds.size > MAX_GRAPH_ENTITIES) truncated = true;

  const entities =
    entityIdList.length === 0
      ? []
      : (
          await db.select().from(entitiesTable).where(inArray(entitiesTable.id, entityIdList))
        ).map(toEntityRow);

  const assetIdList = [...assetIds].slice(0, MAX_GRAPH_ASSETS);
  if (assetIds.size > MAX_GRAPH_ASSETS) truncated = true;

  const assets =
    assetIdList.length === 0
      ? []
      : (
          await db.select().from(assetsTable).where(inArray(assetsTable.id, assetIdList))
        ).map(toAssetRow);

  return { entities, assets, relationships, truncated };
}

/**
 * Expand a connected component between two entities up to MAX_PATH_HOPS
 * without loading the full registry graph.
 */
async function loadPathNeighborhood(sourceId: number, targetId: number): Promise<{
  entities: EntityRow[];
  assets: AssetRow[];
  relationships: RelationshipRow[];
}> {
  // Bidirectional expansion: grow from both ends until they meet or hop cap.
  const left = new Set<number>([sourceId]);
  const right = new Set<number>([targetId]);
  const allEntityIds = new Set<number>([sourceId, targetId]);
  const seenRelIds = new Set<number>();
  const relationships: RelationshipRow[] = [];

  let leftFrontier = new Set<number>([sourceId]);
  let rightFrontier = new Set<number>([targetId]);

  for (let hop = 0; hop < MAX_PATH_HOPS; hop++) {
    const expand = async (frontier: Set<number>, side: Set<number>) => {
      if (frontier.size === 0) return new Set<number>();
      const ids = [...frontier];
      const rows = await db
        .select()
        .from(relationshipsTable)
        .where(
          or(
            inArray(relationshipsTable.sourceEntityId, ids),
            and(
              inArray(relationshipsTable.targetId, ids),
              eq(relationshipsTable.targetType, "Entity"),
            ),
          ),
        )
        .limit(800);

      const next = new Set<number>();
      for (const r of rows) {
        if (seenRelIds.has(r.id)) continue;
        seenRelIds.add(r.id);
        relationships.push(toRelRow(r));
        if (r.targetType !== "Entity") continue;
        allEntityIds.add(r.sourceEntityId);
        allEntityIds.add(r.targetId);
        if (!side.has(r.sourceEntityId)) next.add(r.sourceEntityId);
        if (!side.has(r.targetId)) next.add(r.targetId);
        side.add(r.sourceEntityId);
        side.add(r.targetId);
      }
      return next;
    };

    leftFrontier = await expand(leftFrontier, left);
    // Early exit if frontiers intersect
    for (const id of left) {
      if (right.has(id) && id !== sourceId && id !== targetId) {
        leftFrontier = new Set();
        rightFrontier = new Set();
        break;
      }
    }
    if (left.has(targetId) || right.has(sourceId)) break;

    rightFrontier = await expand(rightFrontier, right);
    for (const id of right) {
      if (left.has(id)) {
        leftFrontier = new Set();
        rightFrontier = new Set();
        break;
      }
    }
    if (left.has(targetId) || right.has(sourceId)) break;
    if (allEntityIds.size >= MAX_GRAPH_ENTITIES) break;
  }

  const entityIdList = [...allEntityIds].slice(0, MAX_GRAPH_ENTITIES);
  const entities =
    entityIdList.length === 0
      ? []
      : (
          await db.select().from(entitiesTable).where(inArray(entitiesTable.id, entityIdList))
        ).map(toEntityRow);

  return { entities, assets: [], relationships };
}

// GET /graph/hub-entity — well-connected entity for graph default
router.get("/graph/hub-entity", async (_req, res): Promise<void> => {
  try {
    const geoRows = await db.execute<{ id: number; cnt: string }>(sql`
      SELECT source_entity_id AS id, COUNT(*) AS cnt
      FROM relationships
      WHERE relationship_type = 'PROPERTY_AREA_PEER'
      GROUP BY source_entity_id
      HAVING COUNT(*) BETWEEN 5 AND 80
      ORDER BY cnt DESC
      LIMIT 1
    `);
    const geoId = (geoRows as any).rows?.[0]?.id ?? (geoRows as any)[0]?.id;
    if (geoId) {
      res.json({ entityId: Number(geoId) });
      return;
    }

    const fallbackRows = await db.execute<{ id: number; cnt: string }>(sql`
      SELECT from_e AS id, COUNT(*) AS cnt
      FROM (
        SELECT source_entity_id AS from_e FROM relationships
        UNION ALL
        SELECT target_id AS from_e FROM relationships WHERE target_type = 'Entity'
      ) t
      GROUP BY from_e
      HAVING COUNT(*) BETWEEN 10 AND 150
      ORDER BY cnt DESC
      LIMIT 1
    `);
    const fallbackId = (fallbackRows as any).rows?.[0]?.id ?? (fallbackRows as any)[0]?.id;
    if (fallbackId) {
      res.json({ entityId: Number(fallbackId) });
      return;
    }

    // Last resort: any existing entity — never invent id 1 when DB is empty/sparse
    const [anyEntity] = await db
      .select({ id: entitiesTable.id })
      .from(entitiesTable)
      .orderBy(entitiesTable.id)
      .limit(1);
    res.json({ entityId: anyEntity?.id ?? null });
  } catch {
    res.json({ entityId: null });
  }
});

// GET /graph/entity/:id
router.get("/graph/entity/:id", async (req, res): Promise<void> => {
  const params = GetEntityGraphParams.safeParse(req.params);
  const query = GetEntityGraphQueryParams.safeParse(req.query);

  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const depth = Math.min(Math.max(query.success ? (query.data.depth ?? 2) : 2, 1), 4);
  const entityId = params.data.id;

  const [entity] = await db.select().from(entitiesTable).where(eq(entitiesTable.id, entityId));
  if (!entity) {
    res.status(404).json({ error: "Entity not found" });
    return;
  }

  const { entities, assets, relationships, truncated } = await loadNeighborhood(entityId, depth);
  const graph = buildGraph(entities, assets, relationships);
  const centerVertexId = `e:${entityId}`;
  const { nodes: subNodes, edges: subEdges } = extractSubgraph(graph, centerVertexId, depth);

  // Centrality within the loaded neighborhood (not global full-graph)
  const centralityRanking = computeCentrality(graph);
  const topCentral = new Set(centralityRanking.slice(0, 5).map((c) => c.vertexId));

  const seenEdgeIds = new Set<string>();
  const uniqueEdges: typeof subEdges = [];
  for (const e of subEdges) {
    const baseId = e.id.replace("_rev", "");
    if (!seenEdgeIds.has(baseId)) {
      seenEdgeIds.add(baseId);
      uniqueEdges.push(e);
    }
  }

  res.json({
    nodes: subNodes.map((v) => vertexToNode(v, topCentral, centerVertexId)),
    edges: uniqueEdges.map(arcToEdge),
    centralNodeId: centerVertexId,
    depth,
    truncated: truncated || undefined,
  });
});

// GET /graph/path
router.get("/graph/path", async (req, res): Promise<void> => {
  const parsed = GetConnectionPathQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { sourceId, targetId } = parsed.data;

  const [sourceEntity, targetEntity] = await Promise.all([
    db.select().from(entitiesTable).where(eq(entitiesTable.id, sourceId)).then((r) => r[0]),
    db.select().from(entitiesTable).where(eq(entitiesTable.id, targetId)).then((r) => r[0]),
  ]);

  if (!sourceEntity || !targetEntity) {
    res.status(404).json({ error: "One or both entities not found" });
    return;
  }

  if (sourceId === targetId) {
    res.json({
      found: true,
      path: [
        vertexToNode(
          {
            id: `e:${sourceId}`,
            label: sourceEntity.name,
            nodeType: sourceEntity.type,
            bayesianScore: sourceEntity.bayesianScore,
          },
          new Set(),
          `e:${targetId}`,
        ),
      ],
      edges: [],
      hops: 0,
      pathScore: 1,
      recommendation: "Source and target are the same entity.",
    });
    return;
  }

  const { entities, assets, relationships } = await loadPathNeighborhood(sourceId, targetId);
  const graph = buildGraph(entities, assets, relationships);
  const sourceVId = `e:${sourceId}`;
  const targetVId = `e:${targetId}`;

  const pathResult = findShortestPath(graph, sourceVId, targetVId);

  if (!pathResult) {
    res.json({
      found: false,
      path: [],
      edges: [],
      hops: 0,
      pathScore: null,
      recommendation:
        "No connection path found within searchable neighborhood. Expand the entity registry or run Hybrid Research to discover indirect routes via asset cross-ownership.",
    });
    return;
  }

  const centralityRanking = computeCentrality(graph);
  const topCentral = new Set(centralityRanking.slice(0, 5).map((c) => c.vertexId));

  const pathNodes = pathResult.path
    .map((vId) => graph.vertices.get(vId))
    .filter((v): v is GraphVertex => v !== undefined)
    .map((v) => vertexToNode(v, topCentral, targetVId));

  const pathEdges = pathResult.arcs.map(arcToEdge);

  const hops = pathResult.path.length - 1;
  // Path score: hop penalty + average edge provenance
  const avgProv =
    pathEdges.length > 0
      ? pathEdges.reduce((s, e) => s + (e.provenanceScore ?? 0.35), 0) / pathEdges.length
      : 1;
  const pathScore = Math.max(0.05, Math.min(1, (1 - hops * 0.12) * (0.55 + 0.45 * avgProv)));

  const gatekeeperNode = pathNodes.find((n) => n.nodeType === "Gatekeeper");
  const recommendation = gatekeeperNode
    ? `Optimal path via ${gatekeeperNode.label}. Approach vector: professional introduction via gatekeeper. Path confidence: ${(pathScore * 100).toFixed(0)}%.`
    : `${hops}-hop path identified. Run Hybrid Research for gatekeeper identification and optimal approach strategy.`;

  res.json({
    found: true,
    path: pathNodes,
    edges: pathEdges,
    hops,
    pathScore: parseFloat(pathScore.toFixed(3)),
    recommendation,
  });
});

export default router;
