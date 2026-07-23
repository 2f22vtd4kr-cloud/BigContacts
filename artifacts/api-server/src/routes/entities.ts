import { Router, type IRouter } from "express";
import { eq, ilike, and, gte, sql, inArray, or } from "drizzle-orm";
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
  const { type, minScore, search, limit = 50, offset = 0, starred, hidden,
    contactable, hasEmail, hasPhone, hasWhatsapp, hasTelegram, hasInstagram } = parsed.data;

  // Cache key encodes all query params — 30 s TTL (short, data changes frequently)
  const cacheKey = `entities:list:${type ?? ""}:${minScore ?? ""}:${search ?? ""}:${limit}:${offset}:${starred ?? ""}:${hidden ?? ""}:${contactable ?? ""}:${hasEmail ?? ""}:${hasPhone ?? ""}:${hasWhatsapp ?? ""}:${hasTelegram ?? ""}:${hasInstagram ?? ""}`;
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

  // Contact channel filters — server-side so pagination works correctly.
  // Treat blank strings as missing contact evidence; ingestion can leave empty
  // placeholders in nullable text columns.
  const hasValue = (column: typeof entitiesTable.email) =>
    sql`${column} IS NOT NULL AND btrim(${column}) <> ''`;
  if (hasEmail) {
    conditions.push(hasValue(entitiesTable.email));
  } else if (hasPhone) {
    conditions.push(hasValue(entitiesTable.phone));
  } else if (hasWhatsapp) {
    conditions.push(ilike(entitiesTable.contactMethod, "%whatsapp%"));
  } else if (hasTelegram) {
    conditions.push(hasValue(entitiesTable.telegramHandle));
  } else if (hasInstagram) {
    conditions.push(hasValue(entitiesTable.instagramHandle));
  } else if (contactable) {
    // Any contact channel
    conditions.push(or(
      hasValue(entitiesTable.email),
      hasValue(entitiesTable.phone),
      hasValue(entitiesTable.contactMethod),
      hasValue(entitiesTable.telegramHandle),
      hasValue(entitiesTable.instagramHandle),
    )!);
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
      // Count each entity once per token. Repeated words in a single name
      // must not create a self-pair such as entity 26419 × entity 26419.
      for (const token of new Set(tokenize(row.name))) {
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
          if (ids[i] === ids[j]) continue;
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

// ── GET /entities/same-source-name-clusters ───────────────────────────────────
// Returns exact-name clusters that occur more than once within the same source
// registry. These are usually multiple records for one name (for example,
// multiple FAA registrations), not cross-registry identity matches. Keep this
// review-only: operators decide whether any records should be merged.
router.get("/entities/same-source-name-clusters", async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select({
        id: entitiesTable.id,
        name: entitiesTable.name,
        type: entitiesTable.type,
        bayesianScore: entitiesTable.bayesianScore,
        sourceRegistries: entitiesTable.sourceRegistries,
      })
      .from(entitiesTable);

    const registryPrefix = (source: string): string => {
      const value = source.toLowerCase();
      if (value.includes("faa") || value.includes("aircraft") || value.includes("n-number")) return "FAA";
      if (value.includes("edgar") || value.includes("sec ")) return "EDGAR";
      if (value.includes("hmlr") || value.includes("land registry") || value.includes("price paid")) return "HMLR";
      if (value.includes("brreg") || value.includes("norway")) return "BRREG";
      if (value.includes("companies house") || value.includes("ch ")) return "Companies House";
      if (value.includes("gleif") || value.includes("lei")) return "GLEIF";
      if (value.includes("occrp") || value.includes("aleph")) return "OCCRP";
      return source.trim().split(/[\s\-—:]/)[0]?.slice(0, 20) || "Unknown";
    };

    const clusters = new Map<string, {
      name: string;
      registry: string;
      entities: Array<{ id: number; name: string; type: string; bayesianScore: number }>;
    }>();

    for (const row of rows) {
      const normalizedName = row.name.trim().toLowerCase().replace(/\s+/g, " ");
      if (!normalizedName || normalizedName.length < 4 || /^\d+\s/.test(normalizedName)) continue;

      let sources: string[] = [];
      try {
        const parsed = JSON.parse(row.sourceRegistries ?? "[]");
        sources = Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        sources = [];
      }
      const registries = new Set((sources.length > 0 ? sources : ["Unknown"]).map(registryPrefix));
      for (const registry of registries) {
        const key = `${registry}:${normalizedName}`;
        const cluster = clusters.get(key) ?? {
          name: row.name.trim(),
          registry,
          entities: [],
        };
        if (!cluster.entities.some(entity => entity.id === row.id)) {
          cluster.entities.push({
            id: row.id,
            name: row.name,
            type: row.type,
            bayesianScore: row.bayesianScore,
          });
        }
        clusters.set(key, cluster);
      }
    }

    const result = [...clusters.values()]
      .filter((cluster) => cluster.entities.length > 1)
      .sort((a, b) => {
        const countDelta = b.entities.length - a.entities.length;
        return countDelta || a.name.localeCompare(b.name);
      })
      .slice(0, 200)
      .map((cluster) => ({
        name: cluster.name,
        registry: cluster.registry,
        count: cluster.entities.length,
        entities: cluster.entities.sort((a, b) => b.bayesianScore - a.bayesianScore),
      }));

    res.json({ clusters: result, total: result.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Same-source cluster detection failed" });
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
