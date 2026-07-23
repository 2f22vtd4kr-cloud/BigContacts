import { Router, type IRouter } from "express";
import { eq, ilike, and, gte, sql, inArray } from "drizzle-orm";
import { db, entitiesTable, assetsTable, relationshipsTable } from "@workspace/db";
import {
  ListEntitiesQueryParams,
  CreateEntityBody,
  GetEntityParams,
  UpdateEntityParams,
  UpdateEntityBody,
  DeleteEntityParams,
} from "@workspace/api-zod";
import { getCache, setCache, delCachePattern } from "../lib/redis";
import { computeAccessScore } from "../lib/access-score";

const router: IRouter = Router();

// GET /entities
router.get("/entities", async (req, res): Promise<void> => {
  const parsed = ListEntitiesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { type, minScore, search, limit = 50, offset = 0, starred, hidden } = parsed.data;

  // Cache key encodes all query params — 30 s TTL (short, data changes frequently)
  const cacheKey = `entities:list:${type ?? ""}:${minScore ?? ""}:${search ?? ""}:${limit}:${offset}:${starred ?? ""}:${hidden ?? ""}`;
  const cached = await getCache<unknown[]>(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  const conditions = [];
  if (type) conditions.push(eq(entitiesTable.type, type));
  if (minScore !== undefined) conditions.push(gte(entitiesTable.bayesianScore, minScore));
  if (search) conditions.push(ilike(entitiesTable.name, `%${search}%`));
  // Visibility: starred view shows starred regardless of hidden; hidden view shows hidden only;
  // default view excludes hidden entities so they don't clutter the ledger.
  if (starred) {
    conditions.push(eq(entitiesTable.isStarred, true));
  } else if (hidden) {
    conditions.push(eq(entitiesTable.isHidden, true));
  } else {
    conditions.push(eq(entitiesTable.isHidden, false));
  }

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
    accessScore: computeAccessScore(e),
    estimatedNetWorth: e.estimatedNetWorth,
    createdAt: e.createdAt.toISOString(),
    assetCount: assetCounts[e.id] ?? 0,
  }));

  await setCache(cacheKey, entities, 30);
  res.json(entities);
});

// PATCH /entities/:id/star  — toggle starred flag
router.patch("/entities/:id/star", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const isStarred = req.body?.isStarred;
  if (typeof isStarred !== "boolean") { res.status(400).json({ error: "isStarred must be boolean" }); return; }
  const [updated] = await db
    .update(entitiesTable)
    .set({ isStarred })
    .where(eq(entitiesTable.id, id))
    .returning({ id: entitiesTable.id, isStarred: entitiesTable.isStarred });
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  await delCachePattern("entities:list:*");
  res.json(updated);
});

// PATCH /entities/:id/hide  — toggle hidden flag
router.patch("/entities/:id/hide", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const isHidden = req.body?.isHidden;
  if (typeof isHidden !== "boolean") { res.status(400).json({ error: "isHidden must be boolean" }); return; }
  const [updated] = await db
    .update(entitiesTable)
    .set({ isHidden })
    .where(eq(entitiesTable.id, id))
    .returning({ id: entitiesTable.id, isHidden: entitiesTable.isHidden });
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  await delCachePattern("entities:list:*");
  res.json(updated);
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
  res.status(201).json({
    ...entity!,
    accessScore: computeAccessScore(entity!),
    createdAt: entity!.createdAt.toISOString(),
    assetCount: 0,
  });
});

// ── GET /entities/duplicate-candidates ───────────────────────────────────────
// Returns pairs of entities that share ≥2 significant name tokens, ranked by
// shared-token count. Used by the Duplicates review page to surface merge candidates.
// MUST be registered before GET /entities/:id to avoid "duplicate-candidates" being
// parsed as an entity ID.
router.get("/entities/duplicate-candidates", async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select({ id: entitiesTable.id, name: entitiesTable.name, type: entitiesTable.type, bayesianScore: entitiesTable.bayesianScore })
      .from(entitiesTable);

    const STOP = new Set(["LLC", "INC", "LTD", "CO", "THE", "AND", "OF", "UK", "US", "LP", "LLP", "PLC", "CORP", "ET", "AL", "DE", "LA", "LE", "SA", "SRL", "BV", "NV", "AG", "GMBH", "LTD", "PTY", "ASA"]);
    const tokenize = (name: string): string[] =>
      name.toUpperCase().split(/\W+/).filter(t => t.length >= 3 && !STOP.has(t));

    const tokenIndex = new Map<string, number[]>();
    for (const row of rows) {
      for (const token of tokenize(row.name)) {
        const arr = tokenIndex.get(token) ?? [];
        arr.push(row.id);
        tokenIndex.set(token, arr);
      }
    }

    const pairScores = new Map<string, number>();
    for (const [, ids] of tokenIndex.entries()) {
      if (ids.length < 2 || ids.length > 30) continue;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const key = `${Math.min(ids[i]!, ids[j]!)}_${Math.max(ids[i]!, ids[j]!)}`;
          pairScores.set(key, (pairScores.get(key) ?? 0) + 1);
        }
      }
    }

    const rowById = new Map(rows.map(r => [r.id, r]));
    const candidates = [...pairScores.entries()]
      .filter(([, score]) => score >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 200)
      .map(([key, sharedTokens]) => {
        const [aId, bId] = key.split("_").map(Number);
        const a = rowById.get(aId!);
        const b = rowById.get(bId!);
        if (!a || !b) return null;
        return {
          entityA: { id: a.id, name: a.name, type: a.type, bayesianScore: a.bayesianScore },
          entityB: { id: b.id, name: b.name, type: b.type, bayesianScore: b.bayesianScore },
          sharedTokens,
        };
      })
      .filter(Boolean);

    res.json({ candidates, total: candidates.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Duplicate detection failed" });
  }
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
    accessScore: computeAccessScore(entity),
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
  res.json({
    ...entity,
    accessScore: computeAccessScore(entity),
    createdAt: entity.createdAt.toISOString(),
    assetCount: cnt?.cnt ?? 0,
  });
});

// ── POST /entities/:id/merge/:targetId ────────────────────────────────────────
// Merges targetId into id: assets + relationships reassigned, metadata merged,
// target entity deleted. Primary entity is kept; target is destroyed.
router.post("/entities/:id/merge/:targetId", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const targetId = parseInt(req.params.targetId, 10);
  if (isNaN(id) || isNaN(targetId) || id === targetId) {
    res.status(400).json({ error: "Invalid entity IDs" });
    return;
  }

  const [[primary], [target]] = await Promise.all([
    db.select().from(entitiesTable).where(eq(entitiesTable.id, id)),
    db.select().from(entitiesTable).where(eq(entitiesTable.id, targetId)),
  ]);
  if (!primary) { res.status(404).json({ error: "Primary entity not found" }); return; }
  if (!target) { res.status(404).json({ error: "Target entity not found" }); return; }

  // Merge source registries (deduplicated union)
  const pSrc: string[] = (() => { try { return JSON.parse(primary.sourceRegistries ?? "[]"); } catch { return []; } })();
  const tSrc: string[] = (() => { try { return JSON.parse(target.sourceRegistries ?? "[]"); } catch { return []; } })();
  const mergedSources = [...new Set([...pSrc, ...tSrc])];

  // Merge metadata (primary wins on conflicts, record merge provenance)
  const pMeta: Record<string, unknown> = (() => { try { return JSON.parse(primary.metadata ?? "{}"); } catch { return {}; } })();
  const tMeta: Record<string, unknown> = (() => { try { return JSON.parse(target.metadata ?? "{}"); } catch { return {}; } })();
  const mergedMeta = { ...tMeta, ...pMeta, mergedFrom: targetId, mergedAt: new Date().toISOString() };

  // Merge text fields: take primary if non-null, fall back to target
  const mergedResidences = primary.knownResidences ?? target.knownResidences;
  const mergedNotes = [primary.notes, target.notes].filter(Boolean).join("\n\n---\n\n") || null;

  await Promise.all([
    // Reassign assets owned by target → primary
    db.update(assetsTable).set({ ownerEntityId: id }).where(eq(assetsTable.ownerEntityId, targetId)),
    // Reassign relationships where target is the source entity
    db.update(relationshipsTable).set({ sourceEntityId: id }).where(eq(relationshipsTable.sourceEntityId, targetId)),
    // Reassign relationships where target is referenced as the target (Entity targetType)
    db.update(relationshipsTable)
      .set({ targetId: id })
      .where(and(eq(relationshipsTable.targetId, targetId), eq(relationshipsTable.targetType, "Entity"))),
    // Update primary entity with merged data
    db.update(entitiesTable).set({
      sourceRegistries: JSON.stringify(mergedSources),
      metadata: JSON.stringify(mergedMeta),
      knownResidences: mergedResidences ?? null,
      notes: mergedNotes ?? primary.notes,
      estimatedNetWorth: primary.estimatedNetWorth ?? target.estimatedNetWorth,
      email: primary.email ?? target.email,
      phone: primary.phone ?? target.phone,
      linkedinUrl: primary.linkedinUrl ?? target.linkedinUrl,
      contactConfidence: Math.max(primary.contactConfidence ?? 0, target.contactConfidence ?? 0),
      bayesianScore: Math.max(primary.bayesianScore ?? 0, target.bayesianScore ?? 0),
      isHot: primary.isHot || target.isHot,
      updatedAt: new Date(),
    }).where(eq(entitiesTable.id, id)),
  ]);

  // Delete target entity (cascade deletes its remaining relationships/assets via FK)
  await db.delete(entitiesTable).where(eq(entitiesTable.id, targetId));

  await Promise.all([
    delCachePattern("entities:list:*"),
    delCachePattern("dashboard:*"),
  ]);

  res.json({ merged: true, primaryId: id, deletedId: targetId, message: `Entity ${targetId} merged into ${id}` });
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
