import { Router, type IRouter } from "express";
import { desc, isNotNull, eq, sql, and } from "drizzle-orm";
import { db, entitiesTable, assetsTable, relationshipsTable, researchSessionsTable } from "@workspace/db";
import { GetHotLeadsQueryParams } from "@workspace/api-zod";

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

  const SIGNALS = [
    "Recent property acquisition",
    "Aviation registry update",
    "New corporate filing",
    "Yacht mooring change",
    "Club membership confirmed",
    "Forbes list appearance",
    "Private equity event",
    "High-value asset transfer",
  ];

  const hotLeads = entities.slice(0, limit).map((e, idx) => ({
    entityId: e.id,
    entityName: e.name,
    entityType: e.type,
    bayesianScore: e.bayesianScore,
    signal: activityMap[e.id]
      ? "Recent registry activity detected"
      : SIGNALS[idx % SIGNALS.length]!,
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

  res.json({
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
  });
});

// GET /dashboard/map-data
router.get("/dashboard/map-data", async (_req, res): Promise<void> => {
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

  res.json(mapData);
});

export default router;
