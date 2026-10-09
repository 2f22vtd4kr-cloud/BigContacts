/**
 * Data Ingest Routes — Thin Aggregator
 *
 * This file owns the core public + primary ingestion endpoints, then mounts
 * three focused sub-routers for migrations, enrichment, and pipeline jobs.
 *
 * POST /registry-search          — live registry lookup (public, no auth)
 * POST /ingest/western-hnwi     — SEC EDGAR / CH / BRREG mass ingestion
 * POST /ingest/faa               — FAA Releasable Aircraft Database
 * GET  /ingest/job/:jobId        — poll job status + log tail
 * GET  /ingest/status            — overall ingestion status
 * POST /ingest/occrp             — OCCRP Aleph + OFAC SDN enricher
 * POST /ingest/land-registry     — UK HMLR OCOD property ingestion
 * POST /ingest/opensky           — live ADS-B enricher (adsb.lol + OpenSky fallback)
 *
 * Sub-routers mounted below:
 *   ingest-migrations  — sync/backfill routes (sync-faa-coordinates, reclassify, etc.)
 *   ingest-enrichment  — contact enrichment jobs (CH, in-house, web-osint, etc.)
 *   ingest-pipeline    — pipeline status, deep-web-osint, compute-embeddings, jobs list
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { db, assetsTable, entitiesTable } from "@workspace/db";
import {
  REGISTRY_IDS,
  getRandomDiscoveryRegistries,
  searchRegistry,
  type RegistryId,
} from "../lib/registry-client";
import { REGISTRY_COVERAGE_MATRIX } from "../lib/registry-matrix";
import { classifyActiveJobLaneStatus } from "../lib/job-queue-terminal-policy";
import { enablePermanentRedis, getCache, setCache } from "../lib/redis";
import { sql, eq } from "drizzle-orm";
import {
  createJob, updateJob, getJob, getJobStrict, getJobLog, getActiveJobs,
  setActiveJob, getActiveJob, getActiveJobStrict, clearActiveJobIfMatches, clearDedup, getDedupCount,
} from "../lib/job-queue";
import { runWesternHnwiIngestion } from "../lib/western-hnwi-ingestion";
import { runFaaIngestion } from "../lib/faa-ingestor";
import { runOccrpEnrichment } from "../lib/enrichment/structured-verification";
import { runLandRegistryIngestion } from "../lib/land-registry-ingestor";
import { runOpenSkyEnrichment } from "../lib/opensky-ingestor";
import { logger } from "../lib/logger";

import migrationsRouter from "./ingest-migrations";
import pipelineRouter   from "./ingest-pipeline";


/**
 * A job record is created before the lane claim to preserve the durable attempt.
 * If the distributed claim loses or Redis becomes unavailable, terminalize that
 * attempt and return before any ingestion worker is started. The compare-by-ID
 * release cannot clear a different request's active lane.
 */
async function claimIngestionJobOrRespond(type: string, jobId: string, res: Response): Promise<boolean> {
  try {
    await setActiveJob(type, jobId);
    return true;
  } catch {
    await clearActiveJobIfMatches(type, jobId).catch(() => false);
    await updateJob(jobId, {
      status: "failed",
      message: "Could not claim the active ingestion lane; no work was started.",
      finishedAt: new Date().toISOString(),
    }).catch(() => undefined);
    res.status(503).json({
      error: "Could not claim the ingestion job; no work was started.",
      code: "JOB_CLAIM_UNAVAILABLE",
    });
    return false;
  }
}

const router: IRouter = Router();

// ── Public: Live registry search ──────────────────────────────────────────────
// Must be registered BEFORE any auth middleware applied by sub-routers.
router.post("/registry-search", async (req: Request, res: Response): Promise<void> => {
  const { query, registry, sources, limit = 10 } = req.body as {
    query?: string;
    registry?: string;
    sources?: string[];
    limit?: number;
  };

  if (!query?.trim()) {
    res.status(400).json({ error: "query is required and must be a non-empty string." });
    return;
  }

  const validRegistries = REGISTRY_IDS;
  type ValidRegistry = RegistryId;

  // Default to all free registries when none specified — OpenCorporates is
  // excluded from the default because it now requires a paid API key (401).
  // Note: atoka-italy, borme-spain, kvk-netherlands, kbo-belgium are registered but
  // blocked from server-side containers (Cloudflare / HTML-only portals). They can be
  // called explicitly but are excluded here to avoid timeout latency on every search.
  const FREE_DEFAULTS: ValidRegistry[] = ["bodacc-france", "brreg", "ares-czechia", "gleif", "cvr-denmark", "zefix-switzerland", "offeneregister-germany", "bolagsverket-sweden", "ytj-finland"];
  const requested: ValidRegistry[] = (
    sources?.length ? sources : registry ? [registry] : FREE_DEFAULTS
  ).filter((s): s is ValidRegistry => (validRegistries as readonly string[]).includes(s));

  if (requested.length === 0) {
    res.status(400).json({ error: `sources must contain at least one of: ${validRegistries.join(", ")}.` });
    return;
  }

  const normalizedLimit = Math.min(Number(limit) || 10, 20);
  const q = query.trim();

  const allResults: unknown[] = [];
  const sourceErrors: Record<string, string> = {};

  await Promise.all(requested.map(async (reg) => {
    const cacheKey = `registry:${reg}:${q.toLowerCase()}:${normalizedLimit}`;
    const cached = await getCache<unknown[]>(cacheKey);
    if (cached) { allResults.push(...cached); return; }
    try {
      const results = await searchRegistry({ query: q, registry: reg, limit: normalizedLimit });
      await setCache(cacheKey, results, 3_600);
      allResults.push(...results);
    } catch (err: any) {
      sourceErrors[reg] = err?.message ?? "Unknown error";
      logger.warn({ reg, err: err?.message }, "Registry source error (non-fatal)");
    }
  }));

  // Provider outages are research telemetry, not application failures. Return
  // truthful empty/partial results so callers can continue with other lanes.
  res.json({
    results: allResults,
    message: `${allResults.length} result(s) from ${requested.join(", ")}.`,
    ...(allResults.length === 0 && Object.keys(sourceErrors).length === requested.length
      ? { unavailable: true }
      : {}),
    ...(Object.keys(sourceErrors).length ? { sourceErrors } : {}),
  });
});

// ── Public: Phase J2 registry coverage matrix ─────────────────────────────────
router.get("/registry-matrix", (_req: Request, res: Response): void => {
  const randomDiscoveryIds = new Set(getRandomDiscoveryRegistries());
  res.json({
    phase: "J2",
    sources: REGISTRY_COVERAGE_MATRIX.map((source) => ({
      ...source,
      randomDiscoveryEnabled: randomDiscoveryIds.has(source.id as RegistryId),
      runtimeMode:
        source.id === "faa" || source.id === "hmlr-ppd"
          ? "bulk_only"
          : randomDiscoveryIds.has(source.id as RegistryId)
            ? "random_mix"
            : "explicit_only",
      runtimeNote:
        source.id === "faa" || source.id === "hmlr-ppd"
          ? "Bulk ingestion source; not a queryable random-search adapter."
          : randomDiscoveryIds.has(source.id as RegistryId)
            ? "Eligible for the shuffled discovery pass."
            : "Available only when explicitly selected or after required access is configured.",
    })),
    randomDiscoveryIds: [...randomDiscoveryIds],
    note: "Runtime availability and production review are separate: a source can be active in private research while still awaiting public-production review.",
  });
});

// ── POST /ingest/western-hnwi ─────────────────────────────────────────────────
router.post("/ingest/western-hnwi", async (req, res): Promise<void> => {
  const {
    targetCount = 5_000,
    batchSize = 100,
    clearDedup: doClean = false,
    force = false,
  } = req.body as { targetCount?: number; batchSize?: number; clearDedup?: boolean; force?: boolean };

  const safeTarget = Math.min(Math.max(Number(targetCount) || 5_000, 100), 50_000);

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
  if (!(await claimIngestionJobOrRespond("western-hnwi", jobId, res))) return;

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

// ── POST /ingest/faa ──────────────────────────────────────────────────────────
router.post("/ingest/faa", async (req, res): Promise<void> => {
  const {
    maxRecords = 30_000,
    forceRefresh = false,
    clearDedup: doClean = false,
    force = false,
  } = (req.body ?? {}) as { maxRecords?: number; forceRefresh?: boolean; clearDedup?: boolean; force?: boolean };

  const safeMax = Math.min(Math.max(Number(maxRecords) || 30_000, 100), 100_000);

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
  if (!(await claimIngestionJobOrRespond("faa", jobId, res))) return;

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

// ── GET /ingest/job/active/:type ───────────────────────────────────────────────
// Safety-lock probe for queue runners / operators. Must be registered BEFORE
// /ingest/job/:jobId so "active" is not captured as a jobId.
// Terminal job statuses are: done | failed | cancelled (not "completed").
router.get("/ingest/job/active/:type", async (req, res): Promise<void> => {
  const type = String((req.params as { type: string }).type ?? "").trim();
  if (!type || type.length > 80) {
    res.status(400).json({ error: "Invalid job type." });
    return;
  }
  // Phase D: never 404 when idle — multi-case queues treat empty as success.
  // Terminal statuses are done | failed | cancelled (not "completed").
  let jobId: string | null;
  try {
    await enablePermanentRedis();
    jobId = await getActiveJobStrict(type);
  } catch {
    res.status(503).json({ error: "Job state is unavailable; active status is unknown.", code: "JOB_STATE_UNAVAILABLE" });
    return;
  }
  if (!jobId) {
    res.status(200).json({ type, jobId: null, job: null, active: false });
    return;
  }
  let job;
  try {
    job = await getJobStrict(jobId);
  } catch {
    res.status(503).json({ error: "Job record state is unavailable; active status is unknown.", code: "JOB_STATE_UNAVAILABLE" });
    return;
  }
  if (!job) {
    res.status(503).json({ error: "Active-job lock exists but its job record is missing; state is inconsistent.", code: "JOB_STATE_INCONSISTENT", jobId });
    return;
  }
  const laneStatus = classifyActiveJobLaneStatus(job.status);
  if (laneStatus === "unknown") {
    res.status(503).json({ error: "Persisted job status is unrecognized; active state is inconsistent.", code: "JOB_STATE_INCONSISTENT", jobId });
    return;
  }
  if (laneStatus === "terminal") {
    res.status(200).json({ type, jobId, job, active: false, jobStatus: job.status });
    return;
  }
  res.json({ type, jobId, job, active: true });
});

// ── GET /ingest/job/:jobId ─────────────────────────────────────────────────────
router.get("/ingest/job/:jobId", async (req, res): Promise<void> => {
  const { jobId } = req.params as { jobId: string };
  let job;
  try {
    job = await getJobStrict(jobId);
  } catch {
    res.status(503).json({ error: "Job state is unavailable; this job cannot be confirmed as present or absent.", code: "JOB_STATE_UNAVAILABLE" });
    return;
  }
  if (!job) { res.status(404).json({ error: "Job not found." }); return; }

  const log = await getJobLog(jobId);
  const dedupCount = await getDedupCount();

  res.json({ ...job, log: log.slice(0, 20), dedupCount });
});

// ── GET /ingest/status ────────────────────────────────────────────────────────
router.get("/ingest/status", async (_req, res): Promise<void> => {
  let activeWhnwi: string | null;
  let activeFaa: string | null;
  let activeWJob: Awaited<ReturnType<typeof getJobStrict>> = null;
  let activeFJob: Awaited<ReturnType<typeof getJobStrict>> = null;
  try {
    await enablePermanentRedis();
    const activeByType = await getActiveJobs(["western-hnwi", "faa"]);
    activeWhnwi = activeByType.get("western-hnwi") ?? null;
    activeFaa = activeByType.get("faa") ?? null;
    [activeWJob, activeFJob] = await Promise.all([
      activeWhnwi ? getJobStrict(activeWhnwi) : Promise.resolve(null),
      activeFaa ? getJobStrict(activeFaa) : Promise.resolve(null),
    ]);
  } catch {
    res.status(503).json({ error: "Job state is unavailable; ingestion status cannot confirm whether either lane is active.", code: "JOB_STATE_UNAVAILABLE" });
    return;
  }
  if ((activeWhnwi && !activeWJob) || (activeFaa && !activeFJob)) {
    res.status(503).json({
      error: "An ingestion active-job lock exists without a readable durable job record; status is inconsistent.",
      code: "JOB_STATE_INCONSISTENT",
      jobIds: { westernHnwi: activeWhnwi, faa: activeFaa },
    });
    return;
  }

  const [dedupCount, entityCount, assetCount, faaCount] = await Promise.all([
    getDedupCount(),
    db.select({ cnt: sql<number>`count(*)::int` }).from(entitiesTable)
      .where(eq(entitiesTable.type, "HNWI")).then(r => r[0]?.cnt ?? 0),
    db.select({ cnt: sql<number>`count(*)::int` }).from(assetsTable)
      .then(r => r[0]?.cnt ?? 0),
    db.select({ cnt: sql<number>`count(*)::int` }).from(assetsTable)
      .where(eq(assetsTable.category, "Aviation")).then(r => r[0]?.cnt ?? 0),
  ]);
  res.json({
    dedupCount,
    hnwiCount: entityCount,
    assetCount,
    faaAircraftCount: faaCount,
    jobs: { westernHnwi: activeWJob, faa: activeFJob },
  });
});

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
  if (!(await claimIngestionJobOrRespond("occrp", jobId, res))) return;

  (async () => {
    try {
      await updateJob(jobId, { status: "running", total: safeLimit, message: "OCCRP Aleph + OFAC SDN enrichment running…" });
      const result = await runOccrpEnrichment({ jobId, limit: safeLimit });
      await updateJob(jobId, {
        status: "done",
        progress: 100,
        inserted: result.inserted,
        skipped: result.skipped,
        errors: result.errors,
        finishedAt: new Date().toISOString(),
        message: `Done — ${result.inserted} entities enriched from OCCRP/OFAC in ${(result.durationMs / 1000).toFixed(1)}s`,
      });
    } catch (err: any) {
      logger.error({ err: err.message }, "OCCRP enrichment job failed");
      await updateJob(jobId, { status: "failed", message: err.message ?? "OCCRP enrichment failed" });
    }
  })();

  res.status(202).json({
    jobId,
    message: `OCCRP/OFAC enrichment started for up to ${safeLimit} entities.`,
    pollUrl: `/api/ingest/job/${jobId}`,
  });
});

// ── POST /ingest/land-registry ────────────────────────────────────────────────
router.post("/ingest/land-registry", async (req, res): Promise<void> => {
  const { maxRecords = 50_000, forceRefresh = false, downloadUrl, force = false } = (req.body ?? {}) as {
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
  if (!(await claimIngestionJobOrRespond("land-registry", jobId, res))) return;

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

// ── POST /ingest/opensky ──────────────────────────────────────────────────────
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
  if (!(await claimIngestionJobOrRespond("opensky", jobId, res))) return;

  (async () => {
    try {
      await updateJob(jobId, { status: "running", message: "Querying public live ADS-B feeds (adsb.lol + OpenSky fallback)…" });
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
    message: "Live ADS-B flight enrichment started.",
    pollUrl: `/api/ingest/job/${jobId}`,
    note: "Queries the free adsb.lol feed first, then OpenSky if needed, and matches aircraft registrations against your aviation assets.",
  });
});

// ── Mount sub-routers ─────────────────────────────────────────────────────────
router.use(migrationsRouter);
router.use(pipelineRouter);

export default router;
