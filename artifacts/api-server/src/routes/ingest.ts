/**
 * Data Ingest Routes
 *
 * POST /registry-search         — live registry lookup (public, no auth)
 * POST /ingest/western-hnwi    — launch mass Western HNWI ingestion (background job)
 * POST /ingest/faa              — launch real FAA Releasable Aircraft DB ingestion (background job)
 * GET  /ingest/job/:jobId       — poll job status + log tail
 * GET  /ingest/status           — overall ingestion status
 * DELETE /ingest/dedup          — clear Redis dedup set for re-ingest
 *
 * All data comes exclusively from public registries. Zero synthetic data.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { db, assetsTable, entitiesTable, relationshipsTable } from "@workspace/db";
import { searchRegistry } from "../lib/registry-client";
import { getCache, setCache } from "../lib/redis";
import { sql, eq } from "drizzle-orm";
import {
  createJob, updateJob, getJob, getJobLog,
  setActiveJob, getActiveJob, clearDedup, getDedupCount,
} from "../lib/job-queue";
import { runWesternHnwiIngestion } from "../lib/western-hnwi-ingestion";
import { runFaaIngestion } from "../lib/faa-ingestor";
import { runOccrpEnrichment } from "../lib/occrp-enricher";
import { runLandRegistryIngestion } from "../lib/land-registry-ingestor";
import { runOpenSkyEnrichment } from "../lib/opensky-ingestor";
import { runCompaniesHouseEnrichment } from "../lib/companies-house-enricher";
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
  const validRegistries = ["opencorporates", "companies-house", "sec-edgar", "gleif"];
  if (!validRegistries.includes(registry)) {
    res.status(400).json({ error: `registry must be one of: ${validRegistries.join(", ")}.` });
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
      registry: registry as "opencorporates" | "companies-house" | "sec-edgar" | "gleif",
      limit: normalizedLimit,
    });
    await setCache(cacheKey, results, 3_600);
    res.json({ results, message: `${results.length} results from ${registry}.`, cached: false });
  } catch (err: any) {
    res.status(err?.message?.includes("API_KEY") ? 422 : 500).json({ error: err?.message ?? "Registry search failed." });
  }
});

// ── POST /ingest/western-hnwi — SEC EDGAR, Companies House, BRREG ─────────────
router.post("/ingest/western-hnwi", async (req, res): Promise<void> => {
  const {
    targetCount = 5_000,
    batchSize = 100,
    clearDedup: doClean = false,
    force = false,
  } = req.body as { targetCount?: number; batchSize?: number; clearDedup?: boolean; force?: boolean };

  const safeTarget = Math.min(Math.max(Number(targetCount) || 5_000, 100), 50_000);

  // Prevent duplicate concurrent jobs (unless force=true to clear stale locks)
  if (!force) {
    const existingJobId = await getActiveJob("western-hnwi");
    if (existingJobId) {
      const existing = await getJob(existingJobId);
      if (existing && existing.status === "running") {
        res.status(409).json({ error: "A western-hnwi ingestion job is already running.", jobId: existingJobId });
        return;
      }
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

// ── POST /ingest/faa — FAA Releasable Aircraft Database (real data) ───────────
router.post("/ingest/faa", async (req, res): Promise<void> => {
  const {
    maxRecords = 30_000,
    forceRefresh = false,
    clearDedup: doClean = false,
    force = false,
  } = req.body as { maxRecords?: number; forceRefresh?: boolean; clearDedup?: boolean; force?: boolean };

  const safeMax = Math.min(Math.max(Number(maxRecords) || 30_000, 100), 100_000);

  // Prevent duplicate concurrent jobs (unless force=true to clear stale locks)
  if (!force) {
    const existingJobId = await getActiveJob("faa");
    if (existingJobId) {
      const existing = await getJob(existingJobId);
      if (existing && existing.status === "running") {
        res.status(409).json({ error: "An FAA ingestion job is already running.", jobId: existingJobId });
        return;
      }
    }
  }

  if (doClean) await clearDedup();

  const jobId = await createJob("faa");
  await setActiveJob("faa", jobId);

  // Fire-and-forget background job
  (async () => {
    try {
      await updateJob(jobId, { status: "running", total: safeMax, message: "Starting FAA ingestion…" });
      const result = await runFaaIngestion({ jobId, maxRecords: safeMax, forceRefresh });
      await updateJob(jobId, {
        status: "done",
        progress: 100,
        inserted: result.inserted,
        skipped: result.skipped,
        errors: result.errors,
        finishedAt: new Date().toISOString(),
        message: `Done — ${result.inserted.toLocaleString()} aircraft owners from FAA registry in ${(result.durationMs / 1000).toFixed(1)}s`,
      });
    } catch (err: any) {
      logger.error({ err: err.message }, "FAA ingestion job failed");
      await updateJob(jobId, { status: "failed", message: err.message ?? "FAA ingestion failed" });
    }
  })();

  res.status(202).json({
    jobId,
    message: `FAA aircraft registry ingestion started (up to ${safeMax.toLocaleString()} records).`,
    pollUrl: `/api/ingest/job/${jobId}`,
    note: "Downloads ~70MB from registry.faa.gov. First run takes ~2-3 minutes; subsequent runs use cached ZIP.",
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
  const [dedupCount, entityCount, assetCount, faaCount] = await Promise.all([
    getDedupCount(),
    db.select({ cnt: sql<number>`count(*)::int` }).from(entitiesTable)
      .where(eq(entitiesTable.type, "HNWI")).then(r => r[0]?.cnt ?? 0),
    db.select({ cnt: sql<number>`count(*)::int` }).from(assetsTable)
      .then(r => r[0]?.cnt ?? 0),
    db.select({ cnt: sql<number>`count(*)::int` }).from(assetsTable)
      .where(eq(assetsTable.category, "Aviation")).then(r => r[0]?.cnt ?? 0),
  ]);
  const [activeWhnwi, activeFaa] = await Promise.all([
    getActiveJob("western-hnwi"),
    getActiveJob("faa"),
  ]);
  const [activeWJob, activeFJob] = await Promise.all([
    activeWhnwi ? getJob(activeWhnwi) : Promise.resolve(null),
    activeFaa ? getJob(activeFaa) : Promise.resolve(null),
  ]);
  res.json({
    dedupCount,
    hnwiCount: entityCount,
    assetCount,
    faaAircraftCount: faaCount,
    jobs: {
      westernHnwi: activeWJob,
      faa: activeFJob,
    },
  });
});

// ── POST /ingest/occrp — OCCRP Aleph enricher ────────────────────────────────
router.post("/ingest/occrp", async (req, res): Promise<void> => {
  const { limit = 500 } = req.body as { limit?: number };
  const safeLimit = Math.min(Math.max(Number(limit) || 500, 10), 5_000);

  const existingJobId = await getActiveJob("occrp");
  if (existingJobId) {
    const existing = await getJob(existingJobId);
    if (existing && existing.status === "running") {
      res.status(409).json({ error: "An OCCRP enrichment job is already running.", jobId: existingJobId });
      return;
    }
  }

  const jobId = await createJob("occrp");
  await setActiveJob("occrp", jobId);

  (async () => {
    try {
      await updateJob(jobId, { status: "running", total: safeLimit, message: "OCCRP Aleph enrichment running…" });
      const result = await runOccrpEnrichment({ jobId, limit: safeLimit });
      await updateJob(jobId, {
        status: "done",
        progress: 100,
        inserted: result.inserted,
        skipped: result.skipped,
        errors: result.errors,
        finishedAt: new Date().toISOString(),
        message: `Done — ${result.inserted} entities enriched from OCCRP Aleph in ${(result.durationMs / 1000).toFixed(1)}s`,
      });
    } catch (err: any) {
      logger.error({ err: err.message }, "OCCRP enrichment job failed");
      await updateJob(jobId, { status: "failed", message: err.message ?? "OCCRP enrichment failed" });
    }
  })();

  res.status(202).json({
    jobId,
    message: `OCCRP Aleph enrichment started for up to ${safeLimit} entities.`,
    pollUrl: `/api/ingest/job/${jobId}`,
  });
});

// ── POST /ingest/land-registry — UK OCOD Property Data ───────────────────────
router.post("/ingest/land-registry", async (req, res): Promise<void> => {
  const { maxRecords = 50_000, forceRefresh = false, downloadUrl, force = false } = req.body as {
    maxRecords?: number;
    forceRefresh?: boolean;
    downloadUrl?: string;
    force?: boolean;
  };

  const safeMax = Math.min(Math.max(Number(maxRecords) || 50_000, 100), 500_000);

  if (!force) {
    const existingJobId = await getActiveJob("land-registry");
    if (existingJobId) {
      const existing = await getJob(existingJobId);
      if (existing && existing.status === "running") {
        res.status(409).json({ error: "A Land Registry ingestion job is already running.", jobId: existingJobId });
        return;
      }
    }
  }

  const jobId = await createJob("land-registry");
  await setActiveJob("land-registry", jobId);

  (async () => {
    try {
      await updateJob(jobId, { status: "running", total: safeMax, message: "Starting UK Land Registry ingestion…" });
      const result = await runLandRegistryIngestion({ jobId, maxRecords: safeMax, forceRefresh, downloadUrl });
      await updateJob(jobId, {
        status: "done",
        progress: 100,
        inserted: result.inserted,
        skipped: result.skipped,
        errors: result.errors,
        finishedAt: new Date().toISOString(),
        message: `Done — ${result.inserted.toLocaleString()} overseas property owners ingested in ${(result.durationMs / 1000).toFixed(1)}s`,
      });
    } catch (err: any) {
      logger.error({ err: err.message }, "Land Registry ingestion failed");
      await updateJob(jobId, { status: "failed", message: err.message ?? "Land Registry ingestion failed" });
    }
  })();

  res.status(202).json({
    jobId,
    message: `UK Land Registry OCOD ingestion started (up to ${safeMax.toLocaleString()} records).`,
    pollUrl: `/api/ingest/job/${jobId}`,
    note: "Downloads HMLR OCOD CSV (~300MB). First run may take several minutes; subsequent runs use the cached file for 30 days.",
  });
});

// ── POST /ingest/opensky — OpenSky live flight enricher ───────────────────────
router.post("/ingest/opensky", async (req, res): Promise<void> => {
  const existingJobId = await getActiveJob("opensky");
  if (existingJobId) {
    const existing = await getJob(existingJobId);
    if (existing && existing.status === "running") {
      res.status(409).json({ error: "An OpenSky enrichment job is already running.", jobId: existingJobId });
      return;
    }
  }

  const jobId = await createJob("opensky");
  await setActiveJob("opensky", jobId);

  (async () => {
    try {
      await updateJob(jobId, { status: "running", message: "Querying OpenSky live aircraft positions…" });
      const result = await runOpenSkyEnrichment({ jobId });
      await updateJob(jobId, {
        status: "done",
        progress: 100,
        inserted: result.inserted,
        skipped: result.skipped,
        errors: result.errors,
        finishedAt: new Date().toISOString(),
        message: `Done — ${result.inserted} jets tracked live out of ${result.liveAircraft.toLocaleString()} airborne globally in ${(result.durationMs / 1000).toFixed(1)}s`,
      });
    } catch (err: any) {
      logger.error({ err: err.message }, "OpenSky enrichment failed");
      await updateJob(jobId, { status: "failed", message: err.message ?? "OpenSky enrichment failed" });
    }
  })();

  res.status(202).json({
    jobId,
    message: "OpenSky live flight enrichment started.",
    pollUrl: `/api/ingest/job/${jobId}`,
    note: "Fetches ~9000 live aircraft state vectors from opensky-network.org and matches against your aviation assets.",
  });
});

// ── POST /ingest/companies-house-enrich — contact enrichment ─────────────────
router.post("/ingest/companies-house-enrich", async (req, res): Promise<void> => {
  const {
    entityIds,
    batchSize = 50,
    force = false,
  } = req.body as { entityIds?: number[]; batchSize?: number; force?: boolean };

  if (!force) {
    const existingJobId = await getActiveJob("companies-house-enrich");
    if (existingJobId) {
      const existing = await getJob(existingJobId);
      if (existing && existing.status === "running") {
        res.status(409).json({ error: "A Companies House enrichment job is already running.", jobId: existingJobId });
        return;
      }
    }
  }

  const safeEntityIds = Array.isArray(entityIds) ? entityIds.slice(0, 1_000) : undefined;
  const safeBatch = Math.min(Math.max(Number(batchSize) || 50, 1), 500);

  const jobId = await createJob("companies-house-enrich");
  await setActiveJob("companies-house-enrich", jobId);

  (async () => {
    try {
      await updateJob(jobId, { status: "running", message: "Starting Companies House contact enrichment…" });
      const result = await runCompaniesHouseEnrichment({ jobId, entityIds: safeEntityIds, batchSize: safeBatch });
      await updateJob(jobId, {
        status: "done",
        progress: 100,
        inserted: result.enriched,
        skipped: result.skipped,
        errors: result.errors,
        finishedAt: new Date().toISOString(),
        message: `Done — ${result.enriched} entities enriched in ${(result.durationMs / 1000).toFixed(1)}s`,
      });
    } catch (err: any) {
      logger.error({ err: err.message }, "Companies House enrichment failed");
      await updateJob(jobId, { status: "failed", message: err.message ?? "Enrichment failed" });
    }
  })();

  res.status(202).json({
    jobId,
    message: `Contact enrichment started for ${safeEntityIds ? safeEntityIds.length : "all un-enriched"} entities.`,
    pollUrl: `/api/ingest/job/${jobId}`,
    note: process.env.COMPANIES_HOUSE_API_KEY
      ? "COMPANIES_HOUSE_API_KEY detected — will query CH officer search for addresses."
      : "COMPANIES_HOUSE_API_KEY not set — will recompute contactConfidence only.",
  });
});

// ── DELETE /ingest/dedup — clear dedup set ────────────────────────────────────
router.delete("/ingest/dedup", async (_req, res): Promise<void> => {
  await clearDedup();
  res.json({ status: "ok", message: "Dedup set cleared. Next ingestion will re-insert all records." });
});

export default router;
