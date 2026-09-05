/**
 * Shared graph data loaders — neighborhood and path expansion without full-table scans.
 */
import { and, eq, inArray, or } from "drizzle-orm";
import { db, entitiesTable, assetsTable, relationshipsTable } from "@workspace/db";
import type { EntityRow, AssetRow, RelationshipRow } from "./graph-engine";

export const MAX_GRAPH_ENTITIES = 400;
export const MAX_GRAPH_ASSETS = 400;
export const MAX_GRAPH_RELATIONSHIPS = 1200;
export const MAX_PATH_HOPS = 6;

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
 */
export async function loadNeighborhood(centerEntityId: number, depth: number): Promise<{
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
  const expanded = new Set<number>();

  for (let d = 0; d < depth; d++) {
    if (frontier.size === 0) break;
    const frontierIds = [...frontier];
    for (const id of frontierIds) expanded.add(id);
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
        if (!expanded.has(r.targetId)) nextFrontier.add(r.targetId);
        if (!expanded.has(r.sourceEntityId)) nextFrontier.add(r.sourceEntityId);
      } else if (r.targetType === "Asset") {
        assetIds.add(r.targetId);
      }
    }

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
      : (await db.select().from(entitiesTable).where(inArray(entitiesTable.id, entityIdList))).map(toEntityRow);

  const assetIdList = [...assetIds].slice(0, MAX_GRAPH_ASSETS);
  if (assetIds.size > MAX_GRAPH_ASSETS) truncated = true;

  const assets =
    assetIdList.length === 0
      ? []
      : (await db.select().from(assetsTable).where(inArray(assetsTable.id, assetIdList))).map(toAssetRow);

  return { entities, assets, relationships, truncated };
}

/**
 * Expand a connected component between two entities up to MAX_PATH_HOPS.
 */
export async function loadPathNeighborhood(sourceId: number, targetId: number): Promise<{
  entities: EntityRow[];
  assets: AssetRow[];
  relationships: RelationshipRow[];
}> {
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
    if (left.has(targetId) || right.has(sourceId)) break;
    for (const id of left) {
      if (right.has(id)) {
        leftFrontier = new Set();
        rightFrontier = new Set();
        break;
      }
    }

    rightFrontier = await expand(rightFrontier, right);
    if (left.has(targetId) || right.has(sourceId)) break;
    for (const id of right) {
      if (left.has(id)) {
        leftFrontier = new Set();
        rightFrontier = new Set();
        break;
      }
    }
    if (allEntityIds.size >= MAX_GRAPH_ENTITIES) break;
  }

  const entityIdList = [...allEntityIds].slice(0, MAX_GRAPH_ENTITIES);
  const entities =
    entityIdList.length === 0
      ? []
      : (await db.select().from(entitiesTable).where(inArray(entitiesTable.id, entityIdList))).map(toEntityRow);

  return { entities, assets: [], relationships };
}
