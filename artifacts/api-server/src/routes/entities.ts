import { Router, type IRouter } from "express";
import { eq, ilike, and, gte, sql } from "drizzle-orm";
import { db, entitiesTable, assetsTable } from "@workspace/db";
import {
  ListEntitiesQueryParams,
  CreateEntityBody,
  GetEntityParams,
  UpdateEntityParams,
  UpdateEntityBody,
  DeleteEntityParams,
} from "@workspace/api-zod";
import { getCache, setCache, delCachePattern } from "../lib/redis";

const router: IRouter = Router();

// GET /entities
router.get("/entities", async (req, res): Promise<void> => {
  const parsed = ListEntitiesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { type, minScore, search, limit = 50, offset = 0 } = parsed.data;

  // Cache key encodes all query params — 30 s TTL (short, data changes frequently)
  const cacheKey = `entities:list:${type ?? ""}:${minScore ?? ""}:${search ?? ""}:${limit}:${offset}`;
  const cached = await getCache<unknown[]>(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  const conditions = [];
  if (type) conditions.push(eq(entitiesTable.type, type));
  if (minScore !== undefined) conditions.push(gte(entitiesTable.bayesianScore, minScore));
  if (search) conditions.push(ilike(entitiesTable.name, `%${search}%`));

  const rows = await db
    .select()
    .from(entitiesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${entitiesTable.bayesianScore} DESC`)
    .limit(limit)
    .offset(offset);

  // Attach asset counts
  const ids = rows.map((r) => r.id);
  const assetCounts: Record<number, number> = {};
  if (ids.length > 0) {
    const counts = await db
      .select({
        ownerId: assetsTable.ownerEntityId,
        cnt: sql<number>`count(*)::int`,
      })
      .from(assetsTable)
      .where(sql`${assetsTable.ownerEntityId} = ANY(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)})`)
      .groupBy(assetsTable.ownerEntityId);
    for (const c of counts) {
      if (c.ownerId) assetCounts[c.ownerId] = c.cnt;
    }
  }

  const entities = rows.map((e) => ({
    ...e,
    bayesianScore: e.bayesianScore,
    estimatedNetWorth: e.estimatedNetWorth,
    createdAt: e.createdAt.toISOString(),
    assetCount: assetCounts[e.id] ?? 0,
  }));

  await setCache(cacheKey, entities, 30);
  res.json(entities);
});

// GET /entities/:id/occrp  — return Aleph adverse-media metadata for one entity
router.get("/entities/:id/occrp", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [entity] = await db
    .select({ name: entitiesTable.name, metadata: entitiesTable.metadata })
    .from(entitiesTable)
    .where(eq(entitiesTable.id, id));
  if (!entity) { res.status(404).json({ error: "Not found" }); return; }
  let meta: Record<string, unknown> = {};
  try { meta = JSON.parse(entity.metadata ?? "{}") as Record<string, unknown>; } catch { /* */ }
  res.json({ entityName: entity.name, aleph: (meta.aleph ?? null) as unknown });
});

// GET /entities/:id/opensky  — return live-flight enrichment from aviation assets
router.get("/entities/:id/opensky", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const assets = await db
    .select()
    .from(assetsTable)
    .where(and(eq(assetsTable.ownerEntityId, id), eq(assetsTable.category, "Aviation")));
  const flights = assets
    .map((a) => {
      let meta: Record<string, unknown> = {};
      try { meta = JSON.parse(a.metadata ?? "{}") as Record<string, unknown>; } catch { /* */ }
      const osky = meta.opensky as Record<string, unknown> | undefined;
      if (!osky) return null;
      return {
        id: a.id,
        name: a.name,
        identifier: a.identifier,
        lastActivityDate: a.lastActivityDate,
        opensky: osky,
      };
    })
    .filter(Boolean);
  res.json({ flights });
});

// POST /entities
router.post("/entities", async (req, res): Promise<void> => {
  const parsed = CreateEntityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [entity] = await db.insert(entitiesTable).values(parsed.data).returning();
  // Invalidate all entity list caches and dashboard stats
  await Promise.all([
    delCachePattern("entities:list:*"),
    delCachePattern("dashboard:*"),
  ]);
  res.status(201).json({ ...entity!, createdAt: entity!.createdAt.toISOString(), assetCount: 0 });
});

// GET /entities/:id
router.get("/entities/:id", async (req, res): Promise<void> => {
  const params = GetEntityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [entity] = await db
    .select()
    .from(entitiesTable)
    .where(eq(entitiesTable.id, params.data.id));

  if (!entity) {
    res.status(404).json({ error: "Entity not found" });
    return;
  }

  const [cnt] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(assetsTable)
    .where(eq(assetsTable.ownerEntityId, entity.id));

  res.json({
    ...entity,
    createdAt: entity.createdAt.toISOString(),
    assetCount: cnt?.cnt ?? 0,
  });
});

// PATCH /entities/:id
router.patch("/entities/:id", async (req, res): Promise<void> => {
  const params = UpdateEntityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateEntityBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [entity] = await db
    .update(entitiesTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(entitiesTable.id, params.data.id))
    .returning();

  if (!entity) {
    res.status(404).json({ error: "Entity not found" });
    return;
  }

  const [cnt] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(assetsTable)
    .where(eq(assetsTable.ownerEntityId, entity.id));

  await Promise.all([
    delCachePattern("entities:list:*"),
    delCachePattern("dashboard:*"),
  ]);
  res.json({ ...entity, createdAt: entity.createdAt.toISOString(), assetCount: cnt?.cnt ?? 0 });
});

// DELETE /entities/:id
router.delete("/entities/:id", async (req, res): Promise<void> => {
  const params = DeleteEntityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(entitiesTable)
    .where(eq(entitiesTable.id, params.data.id))
    .returning({ id: entitiesTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Entity not found" });
    return;
  }
  await Promise.all([
    delCachePattern("entities:list:*"),
    delCachePattern("dashboard:*"),
  ]);
  res.sendStatus(204);
});

export default router;
