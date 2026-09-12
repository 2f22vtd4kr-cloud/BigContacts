/**
 * Enhanced HNWI search — POST /search/hnwi
 *
 * Supports natural filters: country, asset types, min score, proximity level,
 * plus free-text queries like "US private jet owners in California".
 *
 * Results cached in local Redis (30 s TTL).
 */

import { Router, type IRouter } from "express";
import { ilike, and, gte, eq, lte, sql, inArray } from "drizzle-orm";
import { db, entitiesTable, assetsTable, relationshipsTable } from "@workspace/db";
import { getCache, setCache } from "../lib/redis";
import { orchestrate } from "../lib/agent-orchestrator";
import { getEmbeddingCacheSize, isModelLoaded } from "../lib/semantic-engine";

const router: IRouter = Router();
const MAX_QUERY_CHARS = 2_000;
const MAX_FILTER_VALUES = 25;
const MAX_OFFSET = 100_000;

function boundedStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, MAX_FILTER_VALUES);
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

// POST /search/hnwi
router.post("/search/hnwi", async (req, res): Promise<void> => {
  const body = req.body ?? {};
  const query = typeof body.query === "string" ? body.query.trim().slice(0, MAX_QUERY_CHARS) : "";
  const countries = boundedStringList(body.countries);
  const assetTypes = boundedStringList(body.assetTypes);
  const minScore = boundedNumber(body.minScore, 0, 0, 1);
  const maxScore = boundedNumber(body.maxScore, 1, 0, 1);
  const minNetWorth = boundedNumber(body.minNetWorth, 0, 0, Number.MAX_SAFE_INTEGER);
  const proximityMin = boundedNumber(body.proximityMin, 0, 0, 10);
  const hotOnly = body.hotOnly === true;
  const safeLimit = Math.min(200, Math.max(1, Math.trunc(Number(body.limit)) || 50));
  const safeOffset = Math.min(MAX_OFFSET, Math.max(0, Math.trunc(Number(body.offset)) || 0));

  const ck = `search:hnwi:${JSON.stringify({ query, countries, assetTypes, minScore, maxScore, minNetWorth, proximityMin, hotOnly, safeLimit, safeOffset })}`;
  const cached = await getCache<unknown[]>(ck);
  if (cached) { res.json(cached); return; }

  try {
    const conditions: ReturnType<typeof eq>[] = [];
    conditions.push(eq(entitiesTable.type, "HNWI") as any);

    if (query) conditions.push(ilike(entitiesTable.name, `%${query}%`) as any);
    if (minScore > 0) conditions.push(gte(entitiesTable.bayesianScore, minScore) as any);
    if (maxScore < 1) conditions.push(lte(entitiesTable.bayesianScore, maxScore) as any);
    if (minNetWorth > 0) conditions.push(gte(entitiesTable.estimatedNetWorth, minNetWorth) as any);
    if (hotOnly) conditions.push(eq(entitiesTable.isHot, true) as any);

    if (countries.length > 0) {
      const countryConditions = countries.map((c) => ilike(entitiesTable.nationality, `%${c}%`));
      if (countryConditions.length === 1) conditions.push(countryConditions[0]! as any);
      else conditions.push(sql`(${countryConditions.map((c: any) => sql`${c}`).reduce((a: any, b: any) => sql`${a} OR ${b}`)})` as any);
    }

    let rows = await db
      .select()
      .from(entitiesTable)
      .where(and(...conditions))
      .orderBy(sql`${entitiesTable.bayesianScore} DESC`)
      .limit(Math.min(600, safeLimit * 3))
      .offset(safeOffset);

    let assetCounts: Record<number, number> = {};
    let assetTypeMap: Record<number, string[]> = {};

    if (rows.length > 0) {
      const ids = rows.map((r) => r.id);
      const assets = await db
        .select({ ownerId: assetsTable.ownerEntityId, category: assetsTable.category })
        .from(assetsTable)
        .where(inArray(assetsTable.ownerEntityId, ids));
      for (const a of assets) {
        if (!a.ownerId) continue;
        assetCounts[a.ownerId] = (assetCounts[a.ownerId] ?? 0) + 1;
        assetTypeMap[a.ownerId] = assetTypeMap[a.ownerId] ?? [];
        if (!assetTypeMap[a.ownerId]!.includes(a.category)) assetTypeMap[a.ownerId]!.push(a.category);
      }
    }

    if (assetTypes.length > 0) {
      rows = rows.filter((r) => assetTypes.some((at) => (assetTypeMap[r.id] ?? []).includes(at)));
    }
    if (proximityMin > 0) {
      rows = rows.filter((r) => {
        try { return (JSON.parse(r.metadata ?? "{}").proximityScore ?? 0) >= proximityMin; }
        catch { return false; }
      });
    }

    const results = rows.slice(0, safeLimit).map((e) => {
      let meta: any = {};
      try { meta = JSON.parse(e.metadata ?? "{}"); } catch { /* malformed metadata stays non-fatal */ }
      return {
        id: e.id, name: e.name, type: e.type, nationality: e.nationality,
        bayesianScore: e.bayesianScore, estimatedNetWorth: e.estimatedNetWorth,
        knownResidences: e.knownResidences, contactMethod: e.contactMethod,
        notes: e.notes, isHot: e.isHot, assetCount: assetCounts[e.id] ?? 0,
        assetTypes: assetTypeMap[e.id] ?? [], proximityScore: meta.proximityScore ?? null,
        tier: meta.tier ?? null, clubs: meta.clubs ?? [], safari: meta.safari ?? null,
        confidence: meta.confidence ?? null, westernIngest: meta.westernIngest ?? false,
        createdAt: e.createdAt.toISOString(),
      };
    });

    await setCache(ck, results, 30);
    res.json({ results, total: results.length, query: { query, countries, assetTypes, minScore, minNetWorth, proximityMin, hotOnly } });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Search failed" });
  }
});

router.get("/search/hnwi/facets", async (_req, res): Promise<void> => {
  const cached = await getCache<object>("search:facets");
  if (cached) { res.json(cached); return; }
  const [nationalities, assetCats] = await Promise.all([
    db.select({ nat: entitiesTable.nationality }).from(entitiesTable).where(eq(entitiesTable.type, "HNWI")).groupBy(entitiesTable.nationality).orderBy(sql`count(*) DESC`).limit(50),
    db.select({ cat: assetsTable.category }).from(assetsTable).groupBy(assetsTable.category),
  ]);
  const facets = {
    nationalities: nationalities.map((r) => r.nat).filter(Boolean),
    assetTypes: assetCats.map((r) => r.cat),
    scoreRange: [0, 1],
    proximityLevels: [
      { value: 1, label: "Any" }, { value: 4, label: "Gatekeeper accessible" },
      { value: 7, label: "Near-personal" }, { value: 9, label: "Personal contact only" },
    ],
  };
  await setCache("search:facets", facets, 300);
  res.json(facets);
});

router.post("/search/intelligent", async (req, res): Promise<void> => {
  const body = req.body ?? {};
  const query = typeof body.query === "string" ? body.query.trim().slice(0, MAX_QUERY_CHARS) : "";
  const safeLimit = Math.min(50, Math.max(1, Math.trunc(Number(body.limit)) || 20));
  const filterAssetTypes = boundedStringList(body.filterAssetTypes);
  const filterJurisdictions = boundedStringList(body.filterJurisdictions);
  const filterMinScore = body.filterMinScore === undefined ? undefined : boundedNumber(body.filterMinScore, 0, 0, 1);
  const filterMaxScore = body.filterMaxScore === undefined ? undefined : boundedNumber(body.filterMaxScore, 1, 0, 1);
  const filterHasContact = body.filterHasContact === true;
  const filterHasRelationship = body.filterHasRelationship === true;

  if (!query) { res.status(400).json({ error: "query is required." }); return; }

  const filterKey = JSON.stringify({ filterAssetTypes, filterJurisdictions, filterMinScore, filterMaxScore, filterHasContact, filterHasRelationship });
  const cacheKey = `search:intelligent:${query.toLowerCase()}:${safeLimit}:${filterKey}`;
  const cached = await getCache<object>(cacheKey);
  if (cached) { res.json({ ...cached, cached: true }); return; }

  try {
    const result = await orchestrate(query, safeLimit);
    let filteredResults: typeof result.results = result.results;
    if (filterAssetTypes.length > 0) filteredResults = filteredResults.filter((r: any) => (r.assetTypes as string[] ?? []).some((t) => filterAssetTypes.includes(t)));
    if (filterJurisdictions.length > 0) filteredResults = filteredResults.filter((r: any) => filterJurisdictions.some((j) => (r.nationality ?? "").toLowerCase().includes(j.toLowerCase())));
    if (filterMinScore !== undefined) filteredResults = filteredResults.filter((r: any) => ((r.bayesianScore as number) ?? 0) >= filterMinScore!);
    if (filterMaxScore !== undefined) filteredResults = filteredResults.filter((r: any) => ((r.bayesianScore as number) ?? 0) <= filterMaxScore!);
    if (filterHasContact && filteredResults.length > 0) {
      const ids = filteredResults.map((r: any) => r.id as number);
      const rows = await db.select({ id: entitiesTable.id }).from(entitiesTable).where(and(inArray(entitiesTable.id, ids), sql`(${entitiesTable.email} IS NOT NULL OR ${entitiesTable.phone} IS NOT NULL)`));
      const contactSet = new Set(rows.map((r) => r.id));
      filteredResults = filteredResults.filter((r: any) => contactSet.has(r.id as number));
    }
    if (filterHasRelationship && filteredResults.length > 0) {
      const ids = filteredResults.map((r: any) => r.id as number);
      const rows = await db.select({ id: relationshipsTable.sourceEntityId }).from(relationshipsTable).where(inArray(relationshipsTable.sourceEntityId, ids));
      const relSet = new Set(rows.map((r) => r.id));
      filteredResults = filteredResults.filter((r: any) => relSet.has(r.id as number));
    }
    filteredResults = [...filteredResults].sort((a: any, b: any) => {
      const aTop = a.type === "HNWI" || a.type === "Gatekeeper" ? 1 : 0;
      const bTop = b.type === "HNWI" || b.type === "Gatekeeper" ? 1 : 0;
      if (aTop !== bTop) return bTop - aTop;
      return ((b.bayesianScore as number) ?? 0) - ((a.bayesianScore as number) ?? 0);
    });
    const final = { ...result, results: filteredResults, cached: false };
    await setCache(cacheKey, final, 60);
    res.json(final);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Intelligent search failed" });
  }
});

router.get("/search/embedding-status", (_req, res): void => {
  res.json({ modelLoaded: isModelLoaded(), cacheSize: getEmbeddingCacheSize(), model: "Xenova/all-MiniLM-L6-v2", dimensions: 384 });
});

export default router;
