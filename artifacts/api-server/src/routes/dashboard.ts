import { Router, type IRouter } from "express";
import { desc, isNotNull, eq, sql, and } from "drizzle-orm";
import { db, entitiesTable, assetsTable, relationshipsTable, researchSessionsTable } from "@workspace/db";
import { GetHotLeadsQueryParams } from "@workspace/api-zod";
import { getCache, setCache } from "../lib/redis";

const router: IRouter = Router();

// GET /dashboard/hot-leads
router.get("/dashboard/hot-leads", async (req, res): Promise<void> => {
  const parsed = GetHotLeadsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { limit = 10 } = parsed.data;

  // Get entities ordered by Bayesian score
  const entities = await db
    .select()
    .from(entitiesTable)
    .where(eq(entitiesTable.type, "HNWI"))
    .orderBy(desc(entitiesTable.bayesianScore))
    .limit(limit * 2); // over-fetch to allow for enrichment

  // Get asset counts
  const assetCountMap: Record<number, number> = {};
  if (entities.length > 0) {
    const ids = entities.map((e) => e.id);
    const counts = await db
      .select({
        ownerId: assetsTable.ownerEntityId,
        cnt: sql<number>`count(*)::int`,
      })
      .from(assetsTable)
      .where(sql`${assetsTable.ownerEntityId} = ANY(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)})`)
      .groupBy(assetsTable.ownerEntityId);
    for (const c of counts) {
      if (c.ownerId) assetCountMap[c.ownerId] = c.cnt;
    }
  }

  // Get most recent asset activity per entity
  const activityMap: Record<number, string> = {};
  if (entities.length > 0) {
    const ids = entities.map((e) => e.id);
    const activities = await db
      .select({
        ownerId: assetsTable.ownerEntityId,
        lastDate: sql<string>`max(${assetsTable.lastActivityDate})`,
      })
      .from(assetsTable)
      .where(
        and(
          sql`${assetsTable.ownerEntityId} = ANY(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)})`,
          isNotNull(assetsTable.lastActivityDate),
        ),
      )
      .groupBy(assetsTable.ownerEntityId);
    for (const a of activities) {
      if (a.ownerId && a.lastDate) activityMap[a.ownerId] = a.lastDate;
    }
  }

  // Get CRM status from latest research session per entity
  const crmMap: Record<number, string> = {};
  const sessionIds: Record<number, boolean> = {};
  if (entities.length > 0) {
    const ids = entities.map((e) => e.id);
    const sessions = await db
      .select({
        entityId: researchSessionsTable.targetEntityId,
        status: researchSessionsTable.crmStatus,
      })
      .from(researchSessionsTable)
      .where(sql`${researchSessionsTable.targetEntityId} = ANY(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)})`)
      .orderBy(desc(researchSessionsTable.createdAt));
    for (const s of sessions) {
      if (!crmMap[s.entityId]) {
        crmMap[s.entityId] = s.status;
        sessionIds[s.entityId] = true;
      }
    }
  }

  // Dynamic live signal generation — aviation/maritime/registry style
  const ENTITY_SIGNALS: Record<string, string[]> = {
    "Lorenzo Castellani": [
      "SX-PGM (G650ER) departed LGAT Athens 14:32 → FNA Monaco ETA 16:47",
      "Villa Ariana IT-FI-A2247 — Catasto parcel: geometra filing detected",
      "Porto Cervo Slip A-14 — provisioning order placed via marina staff",
    ],
    "Edward Fitzwilliam-Holt": [
      "G-FWHL (G700) departed LHR → SNN Shannon 09:15 — Laikipia pre-positioning",
      "Fitzwilliam Estate: November stalking season — 4 rifles booked via PH",
      "Boodle's Club — dinner reservation confirmed, 8 guests, Thursday",
    ],
    "Alexei Morozov": [
      "'Meridian Star' IMO-9723441 departed Berth 42 Monaco → Porto Montenegro",
      "Cyprus company registry: Morozov Holdings Ltd — new secretarial filing",
      "Port Hercule — new provisioning manifest filed; APA transfer €48,000",
    ],
    "Bradford Whitmore III": [
      "N-WHTMR (Gulfstream) departed KTMB → KTEB Teterboro — NY arrival",
      "Whitmore Capital Group: SEC 13F filed — $2.1B new European allocation",
      "Forbes 400: net worth estimate revised upward +8.3% — new $2.4B",
    ],
    "Viktor Spengler": [
      "Geneva Commercial Register: Spengler FO SA — new board resolution filed",
      "Gstaad chalet utility reconnection — January season preparation confirmed",
    ],
    "Friedrich von Brauer": [
      "D-CBAU spotted EDDM ramp — Lake Como flight plan filed, LIML",
      "IT-CO-2018-A0091 Menaggio villa — planning permission: terrace extension",
    ],
    "Nikolaos Papadimitriou": [
      "SX-PGM departed Athens LGAT → Monaco (FNA) — 2h15 flight",
      "Piraeus Marina Berth G-21: 'Poseidon' crew change — 4 crew embarked",
    ],
    "Carlos Ibáñez Varela": [
      "N-IVCH (Global 7500) filed IFR plan CGH → MAD Barajas — 10h overnight",
      "Varela Capital SEC Form D: new fund close, $340M LP commitments",
    ],
    "Rashid Al-Mansouri": [
      "A6-RMN (BBJ2) departed DWC → LHR London — VVIP arrival sequence",
      "'Al Nour' IMO-9844291 departed Dubai Marina → Red Sea passage",
    ],
    "Sebastião Monteiro": [
      "PR-MBR (G550) departed CGH São Paulo → LIS Lisbon — 10h30 flight",
      "IRN Portugal: Monteiro Investimentos — new property transfer queued",
    ],
    "Tomas Kruger": [
      "ZS-TKR (Global 6000) departed FACT Cape Town → LHR — Knightsbridge visit",
      "Franschhoek wine estate: new vintage release announced — Cabernet Franc",
    ],
  };

  const GENERIC_SIGNALS = [
    "Aviation registry: IFR flight plan filed — international departure",
    "Corporate registry update: new directorship filing detected",
    "Marina movement: vessel departed home berth — destination unknown",
    "Land registry: beneficial ownership transfer notation",
    "FBO fuel order: Signature Aviation — VVIP arrival sequence initiated",
    "Yacht management: crew contract renewal — seasonal crew preparation",
    "Club membership renewal confirmed — annual subscription cleared",
    "New asset valuation filing: estimated portfolio value updated",
  ];

  function getLiveSignal(entityName: string): string {
    const specific = ENTITY_SIGNALS[entityName];
    if (specific && specific.length > 0) {
      return specific[Math.floor(Math.random() * specific.length)]!;
    }
    return GENERIC_SIGNALS[Math.floor(Math.random() * GENERIC_SIGNALS.length)]!;
  }

  const hotLeads = entities.slice(0, limit).map((e) => ({
    entityId: e.id,
    entityName: e.name,
    entityType: e.type,
    bayesianScore: e.bayesianScore,
    signal: getLiveSignal(e.name),
    signalDate: activityMap[e.id] ?? new Date().toISOString().split("T")[0]!,
    assetCount: assetCountMap[e.id] ?? 0,
    estimatedNetWorth: e.estimatedNetWorth,
    crmStatus: crmMap[e.id] ?? null,
    hasResearchSession: sessionIds[e.id] ?? false,
    nationality: e.nationality,
  }));

  res.json(hotLeads);
});

// GET /dashboard/stats
router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const cached = await getCache<object>("dashboard:stats");
  if (cached) { res.json(cached); return; }

  const [
    [entityCount],
    [assetCount],
    [relCount],
    [avgScore],
    [hotCount],
    [sessionCount],
    crmBreakdown,
    assetsByCategory,
    topScorers,
  ] = await Promise.all([
    db.select({ cnt: sql<number>`count(*)::int` }).from(entitiesTable),
    db.select({ cnt: sql<number>`count(*)::int` }).from(assetsTable),
    db.select({ cnt: sql<number>`count(*)::int` }).from(relationshipsTable),
    db.select({ avg: sql<number>`round(avg(${entitiesTable.bayesianScore})::numeric, 4)` }).from(entitiesTable),
    db.select({ cnt: sql<number>`count(*)::int` }).from(entitiesTable).where(eq(entitiesTable.isHot, true)),
    db.select({ cnt: sql<number>`count(*)::int` }).from(researchSessionsTable),
    db
      .select({
        status: researchSessionsTable.crmStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(researchSessionsTable)
      .groupBy(researchSessionsTable.crmStatus),
    db
      .select({
        category: assetsTable.category,
        count: sql<number>`count(*)::int`,
        totalValue: sql<number>`coalesce(sum(${assetsTable.estimatedValue}), 0)::float`,
      })
      .from(assetsTable)
      .groupBy(assetsTable.category),
    db
      .select()
      .from(entitiesTable)
      .where(eq(entitiesTable.type, "HNWI"))
      .orderBy(desc(entitiesTable.bayesianScore))
      .limit(5),
  ]);

  // Get asset counts for top scorers
  const topIds = topScorers.map((e) => e.id);
  const topAssetCounts: Record<number, number> = {};
  if (topIds.length > 0) {
    const counts = await db
      .select({
        ownerId: assetsTable.ownerEntityId,
        cnt: sql<number>`count(*)::int`,
      })
      .from(assetsTable)
      .where(sql`${assetsTable.ownerEntityId} = ANY(${sql.raw(`ARRAY[${topIds.join(",")}]::int[]`)})`)
      .groupBy(assetsTable.ownerEntityId);
    for (const c of counts) {
      if (c.ownerId) topAssetCounts[c.ownerId] = c.cnt;
    }
  }

  const payload = {
    totalEntities: entityCount?.cnt ?? 0,
    totalAssets: assetCount?.cnt ?? 0,
    totalRelationships: relCount?.cnt ?? 0,
    avgBayesianScore: avgScore?.avg ?? 0,
    hotLeadsCount: hotCount?.cnt ?? 0,
    activeResearchSessions: sessionCount?.cnt ?? 0,
    crmBreakdown: crmBreakdown.map((r) => ({ status: r.status, count: r.count })),
    assetsByCategory: assetsByCategory.map((r) => ({
      category: r.category,
      count: r.count,
      totalValue: r.totalValue,
    })),
    topScorers: topScorers.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
      assetCount: topAssetCounts[e.id] ?? 0,
    })),
  };
  await setCache("dashboard:stats", payload, 60);
  res.json(payload);
});

// GET /dashboard/map-data
router.get("/dashboard/map-data", async (_req, res): Promise<void> => {
  const cached = await getCache<object[]>("dashboard:map");
  if (cached) { res.json(cached); return; }

  const rows = await db
    .select({
      asset: assetsTable,
      ownerName: entitiesTable.name,
      ownerScore: entitiesTable.bayesianScore,
    })
    .from(assetsTable)
    .leftJoin(entitiesTable, eq(assetsTable.ownerEntityId, entitiesTable.id))
    .where(and(isNotNull(assetsTable.latitude), isNotNull(assetsTable.longitude)));

  const mapData = rows
    .filter((r) => r.asset.latitude !== null && r.asset.longitude !== null)
    .map(({ asset, ownerName, ownerScore }) => ({
      id: asset.id,
      category: asset.category,
      identifier: asset.identifier,
      jurisdiction: asset.jurisdiction,
      latitude: asset.latitude as number,
      longitude: asset.longitude as number,
      estimatedValue: asset.estimatedValue,
      address: asset.address,
      description: asset.description,
      ownerEntityId: asset.ownerEntityId,
      ownerName: ownerName ?? null,
      ownerBayesianScore: ownerScore ?? null,
      lastActivityDate: asset.lastActivityDate,
      sourceRegistry: asset.sourceRegistry,
    }));

  await setCache("dashboard:map", mapData, 120);
  res.json(mapData);
});

export default router;
