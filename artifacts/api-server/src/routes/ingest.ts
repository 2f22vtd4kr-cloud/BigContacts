/**
 * Data Ingest Routes
 *
 * POST /registry-search         — live registry lookup (public, no auth)
 * POST /ingest/western-hnwi    — launch mass Western HNWI ingestion (admin, background)
 * GET  /ingest/job/:jobId       — poll job status + log tail
 * DELETE /ingest/dedup          — clear Redis dedup set for re-ingest
 * POST /ingest/faa              — seed aviation mock data (admin)
 * POST /ingest/extend           — seed extended mock dataset (admin)
 *
 * Admin routes require Authorization: Bearer <ADMIN_TOKEN | SESSION_SECRET>
 */

import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, assetsTable, entitiesTable, relationshipsTable } from "@workspace/db";
import { seedExtendedData } from "../lib/mock-data";
import { searchRegistry } from "../lib/registry-client";
import { getCache, setCache } from "../lib/redis";
import { sql, eq } from "drizzle-orm";
import {
  createJob, updateJob, getJob, getJobLog,
  setActiveJob, getActiveJob, clearDedup, getDedupCount,
} from "../lib/job-queue";
import { runWesternHnwiIngestion } from "../lib/western-hnwi-ingestion";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ── Public: Live registry search ──────────────────────────────────────────────
router.post("/registry-search", async (req: Request, res: Response): Promise<void> => {
  const { query, registry = "opencorporates", limit = 10 } = req.body as {
    query?: string;
    registry?: string;
    limit?: number;
  };

  if (!query?.trim()) {
    res.status(400).json({ error: "query is required and must be a non-empty string." });
    return;
  }
  if (!["opencorporates", "companies-house", "sec-edgar"].includes(registry)) {
    res.status(400).json({ error: `registry must be "opencorporates", "companies-house", or "sec-edgar".` });
    return;
  }

  const normalizedLimit = Math.min(Number(limit) || 10, 20);
  const cacheKey = `registry:${registry}:${query.trim().toLowerCase()}:${normalizedLimit}`;
  const cached = await getCache<unknown[]>(cacheKey);
  if (cached) {
    res.json({ results: cached, message: `${cached.length} results from ${registry}.`, cached: true });
    return;
  }

  try {
    const results = await searchRegistry({
      query: query.trim(),
      registry: registry as "opencorporates" | "companies-house" | "sec-edgar",
      limit: normalizedLimit,
    });
    await setCache(cacheKey, results, 3_600);
    res.json({ results, message: `${results.length} results from ${registry}.`, cached: false });
  } catch (err: any) {
    res.status(err?.message?.includes("API_KEY") ? 422 : 500).json({ error: err?.message ?? "Registry search failed." });
  }
});

// ── Admin auth middleware (used only for destructive/rare ops) ────────────────
function adminOnly(req: Request, res: Response, next: NextFunction): void {
  const adminToken = process.env["ADMIN_TOKEN"] ?? process.env["SESSION_SECRET"];
  if (!adminToken) {
    res.status(503).json({ error: "Ingest routes unavailable: ADMIN_TOKEN or SESSION_SECRET must be set." });
    return;
  }
  const [scheme, token] = (req.headers["authorization"] ?? "").split(" ");
  if (scheme !== "Bearer" || token !== adminToken) {
    res.status(403).json({ error: "Forbidden. Requires Authorization: Bearer <ADMIN_TOKEN>." });
    return;
  }
  next();
}

// ── POST /ingest/western-hnwi — personal use, no auth required ───────────────
router.post("/ingest/western-hnwi", async (req, res): Promise<void> => {
  const {
    targetCount = 5_000,
    batchSize = 100,
    clearDedup: doClean = false,
  } = req.body as { targetCount?: number; batchSize?: number; clearDedup?: boolean };

  const safeTarget = Math.min(Math.max(Number(targetCount) || 5_000, 100), 50_000);

  // Prevent duplicate concurrent jobs
  const existingJobId = await getActiveJob("western-hnwi");
  if (existingJobId) {
    const existing = await getJob(existingJobId);
    if (existing && existing.status === "running") {
      res.status(409).json({ error: "A western-hnwi ingestion job is already running.", jobId: existingJobId });
      return;
    }
  }

  if (doClean) await clearDedup();

  const jobId = await createJob("western-hnwi");
  await setActiveJob("western-hnwi", jobId);

  // Fire-and-forget background job
  (async () => {
    try {
      await updateJob(jobId, { status: "running", total: safeTarget, message: "Ingestion running…" });
      const result = await runWesternHnwiIngestion({ targetCount: safeTarget, batchSize, jobId });
      await updateJob(jobId, {
        status: "done",
        progress: 100,
        inserted: result.inserted,
        skipped: result.skipped,
        errors: result.errors,
        finishedAt: new Date().toISOString(),
        message: `Done — ${result.inserted.toLocaleString()} records inserted in ${(result.durationMs / 1000).toFixed(1)}s`,
      });
    } catch (err: any) {
      logger.error({ err: err.message }, "Western HNWI ingestion job failed");
      await updateJob(jobId, { status: "failed", message: err.message ?? "Unknown error" });
    }
  })();

  res.status(202).json({
    jobId,
    message: `Ingestion started for ${safeTarget.toLocaleString()} records.`,
    pollUrl: `/api/ingest/job/${jobId}`,
  });
});

// ── GET /ingest/job/:jobId — poll status (no auth, read-only) ────────────────
router.get("/ingest/job/:jobId", async (req, res): Promise<void> => {
  const { jobId } = req.params as { jobId: string };
  const job = await getJob(jobId);
  if (!job) { res.status(404).json({ error: "Job not found." }); return; }

  const log = await getJobLog(jobId);
  const dedupCount = await getDedupCount();

  res.json({ ...job, log: log.slice(0, 20), dedupCount });
});

// ── GET /ingest/status — overall ingestion status (no auth) ──────────────────
router.get("/ingest/status", async (_req, res): Promise<void> => {
  const [dedupCount, entityCount, assetCount] = await Promise.all([
    getDedupCount(),
    db.select({ cnt: sql<number>`count(*)::int` }).from(entitiesTable)
      .where(eq(entitiesTable.type, "HNWI")).then(r => r[0]?.cnt ?? 0),
    db.select({ cnt: sql<number>`count(*)::int` }).from(assetsTable)
      .then(r => r[0]?.cnt ?? 0),
  ]);
  const activeJobId = await getActiveJob("western-hnwi");
  const activeJob = activeJobId ? await getJob(activeJobId) : null;
  res.json({ dedupCount, hnwiCount: entityCount, assetCount, activeJob, activeJobId });
});

// ── DELETE /ingest/dedup — clear dedup set (no auth for personal use) ─────────
router.delete("/ingest/dedup", async (_req, res): Promise<void> => {
  await clearDedup();
  res.json({ status: "ok", message: "Dedup set cleared. Next ingestion will re-insert all records." });
});

// ── POST /ingest/faa — seed aviation data ─────────────────────────────────────
router.post("/ingest/faa", async (_req, res): Promise<void> => {
  try {
    await seedExtendedData();
    const aviation = await db.select().from(assetsTable).where(eq(assetsTable.category, "Aviation"));
    res.json({ status: "ok", message: `FAA ingest complete. ${aviation.length} aircraft records.`, aircraftCount: aviation.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Ingest failed" });
  }
});

// ── POST /ingest/extend ────────────────────────────────────────────────────────
router.post("/ingest/extend", async (_req, res): Promise<void> => {
  try {
    await seedExtendedData();
    const [entityCount, assetCount, relCount] = await Promise.all([
      db.select({ cnt: sql<number>`count(*)::int` }).from(entitiesTable).then(r => r[0]?.cnt ?? 0),
      db.select({ cnt: sql<number>`count(*)::int` }).from(assetsTable).then(r => r[0]?.cnt ?? 0),
      db.select({ cnt: sql<number>`count(*)::int` }).from(relationshipsTable).then(r => r[0]?.cnt ?? 0),
    ]);
    res.json({ status: "ok", message: "Extended seed complete.", totals: { entities: entityCount, assets: assetCount, relationships: relCount } });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Extended seed failed" });
  }
});

export default router;
