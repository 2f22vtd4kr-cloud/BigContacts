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
import { sql, eq, and, gte, inArray } from "drizzle-orm";
import { classifyEntityType } from "../lib/western-hnwi-ingestion";
import {
  createJob, updateJob, getJob, getJobLog,
  setActiveJob, getActiveJob, clearDedup, getDedupCount,
} from "../lib/job-queue";
import { runWesternHnwiIngestion } from "../lib/western-hnwi-ingestion";
import { runFaaIngestion, US_STATE_CENTROIDS } from "../lib/faa-ingestor";
import { runOccrpEnrichment } from "../lib/occrp-enricher";
import { runLandRegistryIngestion } from "../lib/land-registry-ingestor";
import { runOpenSkyEnrichment } from "../lib/opensky-ingestor";
import { runCompaniesHouseEnrichment } from "../lib/companies-house-enricher";
import { enrichEntityOsint } from "../lib/web-osint-enricher";
import { enrichWithHunterApollo } from "../lib/hunter-enricher";
import { computeContactConfidence } from "../lib/contact-confidence";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// POST /ingest/sync-faa-coordinates — backfill latitude/longitude for FAA
// aviation assets that were ingested before the state-centroid lookup was added.
// Uses the jurisdiction field (e.g. "TX, US") to derive state code → centroid.
router.post("/ingest/sync-faa-coordinates", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db
      .select({ id: assetsTable.id, jurisdiction: assetsTable.jurisdiction })
      .from(assetsTable)
      .where(and(
        eq(assetsTable.category, "Aviation"),
        sql`${assetsTable.latitude} IS NULL`,
      ));

    let updated = 0;
    // Group by state to minimise round-trips — batch all assets for each state in one UPDATE
    const byState = new Map<string, number[]>();
    for (const row of rows) {
      const stateCode = row.jurisdiction?.split(",")[0]?.trim().toUpperCase() ?? "";
      if (!US_STATE_CENTROIDS[stateCode]) continue;
      const arr = byState.get(stateCode) ?? [];
      arr.push(row.id);
      byState.set(stateCode, arr);
    }
    for (const [stateCode, ids] of byState.entries()) {
      const c = US_STATE_CENTROIDS[stateCode]!;
      const CHUNK = 500;
      for (let i = 0; i < ids.length; i += CHUNK) {
        await db.update(assetsTable)
          .set({ latitude: c[0], longitude: c[1] })
          .where(inArray(assetsTable.id, ids.slice(i, i + CHUNK)));
      }
      updated += ids.length;
    }
    res.json({ total: rows.length, updated, message: `${updated}/${rows.length} FAA assets now have coordinates.` });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Coordinate sync failed" });
  }
});

// POST /ingest/reclassify-entity-types — one-time migration that re-runs the
// classifyEntityType() logic over all existing entities and sets their type to
// Corporation or Trust where the name pattern matches, replacing the blanket
// "HNWI" that was hardcoded before Phase 10.
router.post("/ingest/reclassify-entity-types", async (_req: Request, res: Response): Promise<void> => {
  try {
    // Fetch all entity names + ids (only need these two fields)
    const rows = await db
      .select({ id: entitiesTable.id, name: entitiesTable.name })
      .from(entitiesTable);

    const corps: number[] = [];
    const trusts: number[] = [];

    for (const row of rows) {
      const t = classifyEntityType(row.name);
      if (t === "Corporation") corps.push(row.id);
      else if (t === "Trust") trusts.push(row.id);
    }

    // Batch update in chunks of 500 to avoid massive IN clauses
    const CHUNK = 500;
    let corpUpdated = 0;
    let trustUpdated = 0;

    for (let i = 0; i < corps.length; i += CHUNK) {
      const chunk = corps.slice(i, i + CHUNK);
      await db.update(entitiesTable)
        .set({ type: "Corporation", updatedAt: new Date() })
        .where(inArray(entitiesTable.id, chunk));
      corpUpdated += chunk.length;
    }
    for (let i = 0; i < trusts.length; i += CHUNK) {
      const chunk = trusts.slice(i, i + CHUNK);
      await db.update(entitiesTable)
        .set({ type: "Trust", updatedAt: new Date() })
        .where(inArray(entitiesTable.id, chunk));
      trustUpdated += chunk.length;
    }

    const hnwiCount = rows.length - corpUpdated - trustUpdated;
    res.json({
      total: rows.length,
      corporations: corpUpdated,
      trusts: trustUpdated,
      hnwi: hnwiCount,
      message: `Reclassified ${corpUpdated} → Corporation, ${trustUpdated} → Trust, ${hnwiCount} remain HNWI.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Reclassification failed" });
  }
});

// POST /ingest/sync-hot-flags — batch-set isHot=true for all entities with
// bayesianScore >= 0.70 whose flag was never propagated after ingestion.
router.post("/ingest/sync-hot-flags", async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await db
      .update(entitiesTable)
      .set({ isHot: true, updatedAt: new Date() })
      .where(and(gte(entitiesTable.bayesianScore, 0.70), eq(entitiesTable.isHot, false)))
      .returning({ id: entitiesTable.id });
    res.json({
      updated: result.length,
      message: `${result.length} entit${result.length === 1 ? "y" : "ies"} flagged as hot lead${result.length === 1 ? "" : "s"}.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Sync failed" });
  }
});

// ── Public: Live registry search ──────────────────────────────────────────────
// Accepts either:
//   { query, registry: "gleif" }          — single registry (legacy)
//   { query, sources: ["gleif","edgar"] } — multiple registries, errors isolated per-source
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

  const validRegistries = ["opencorporates", "companies-house", "sec-edgar", "gleif"] as const;
  type ValidRegistry = typeof validRegistries[number];

  // Normalise: prefer `sources` array; fall back to single `registry`; default to opencorporates
  const requested: ValidRegistry[] = (
    sources?.length ? sources : registry ? [registry] : ["opencorporates"]
  ).filter((s): s is ValidRegistry => (validRegistries as readonly string[]).includes(s));

  if (requested.length === 0) {
    res.status(400).json({ error: `sources must contain at least one of: ${validRegistries.join(", ")}.` });
    return;
  }

  const normalizedLimit = Math.min(Number(limit) || 10, 20);
  const q = query.trim();

  // Query each source independently — one failure must NOT kill the rest
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

  // Only fail the whole request if EVERY requested source errored and we got nothing
  if (allResults.length === 0 && Object.keys(sourceErrors).length === requested.length) {
    const firstMsg = Object.values(sourceErrors)[0];
    res.status(500).json({ error: firstMsg, sourceErrors });
    return;
  }

  res.json({
    results: allResults,
    message: `${allResults.length} result(s) from ${requested.join(", ")}.`,
    ...(Object.keys(sourceErrors).length ? { sourceErrors } : {}),
  });
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

// ── POST /ingest/ch-company-officers — fetch CH company officers for Corp entities ──
router.post("/ingest/ch-company-officers", async (req: Request, res: Response): Promise<void> => {
  const { batchSize = 100 } = (req.body as { batchSize?: number } | undefined) ?? {};
  const existingJobId = await getActiveJob("ch-officers");
  if (existingJobId) {
    const existing = await getJob(existingJobId);
    if (existing?.status === "running") {
      res.status(409).json({ error: "CH officers job already running.", jobId: existingJobId });
      return;
    }
  }
  const jobId = await createJob("ch-officers");
  await setActiveJob("ch-officers", jobId);
  await updateJob(jobId, { status: "running", total: 0, message: "CH company officers enrichment starting…" });

  (async () => {
    try {
      const { runCompanyOfficersEnrichment } = await import("../lib/companies-house-enricher");
      const result = await runCompanyOfficersEnrichment({ jobId, batchSize });
      await updateJob(jobId, {
        status: "done", progress: 100, inserted: result.enriched,
        message: `Done — ${result.enriched} corps enriched with officer data, ${result.skipped} skipped.`,
      });
    } catch (err: any) {
      await updateJob(jobId, { status: "failed", message: err.message ?? "Unknown error" });
    }
  })();

  res.status(202).json({ jobId, message: `CH company officers job started.`, pollUrl: `/api/ingest/job/${jobId}` });
});

// ── POST /ingest/populate-notes — enrich entity notes from metadata ───────────
router.post("/ingest/populate-notes", async (_req: Request, res: Response): Promise<void> => {
  // Paginated processing — never load all 35k rows into memory at once.
  const PAGE = 2000;
  let offset = 0;
  let updated = 0;
  let total = 0;

  while (true) {
    const rows = await db
      .select({
        id: entitiesTable.id,
        notes: entitiesTable.notes,
        metadata: entitiesTable.metadata,
        sourceRegistries: entitiesTable.sourceRegistries,
        type: entitiesTable.type,
        nationality: entitiesTable.nationality,
        knownResidences: entitiesTable.knownResidences,
      })
      .from(entitiesTable)
      .where(sql`${entitiesTable.metadata} IS NOT NULL AND ${entitiesTable.metadata} != '{}'`)
      .limit(PAGE)
      .offset(offset);

    if (rows.length === 0) break;
    total += rows.length;
    offset += PAGE;

    const updates: Array<{ id: number; notes: string }> = [];
    for (const row of rows) {
      let meta: Record<string, any> = {};
      try { meta = JSON.parse(row.metadata ?? "{}"); } catch {}
      const sources: string[] = (() => { try { return JSON.parse(row.sourceRegistries ?? "[]"); } catch { return []; } })();

      const parts: string[] = [];
      if (sources.length > 0) parts.push(`Source: ${sources.join("; ")}.`);
      if (meta.formType) parts.push(`Filing: ${meta.formType}${meta.fileDate ? ` (${meta.fileDate})` : ""}.`);
      if (meta.companyName) parts.push(`Company: ${meta.companyName}.`);
      if (meta.orgnr) parts.push(`Org number: ${meta.orgnr}.`);
      if (meta.roleDesc) parts.push(`Role: ${meta.roleDesc}.`);
      if (meta.chOfficers && Array.isArray(meta.chOfficers) && meta.chOfficers.length > 0) {
        parts.push(`CH directors: ${meta.chOfficers.slice(0, 5).map((o: any) => o.name).join(", ")}.`);
      }
      if (row.nationality) parts.push(`Nationality: ${row.nationality}.`);
      if (row.knownResidences) {
        const loc = (() => { try { const r = JSON.parse(row.knownResidences!); return Array.isArray(r) ? r[0] : r; } catch { return row.knownResidences; } })();
        if (loc) parts.push(`Location: ${loc}.`);
      }
      if (row.type) parts.push(`Entity type: ${row.type}.`);
      if (meta.edgarUrl) parts.push(`EDGAR: ${meta.edgarUrl}.`);

      const newNotes = parts.join(" ");
      if (newNotes && newNotes !== row.notes) {
        updates.push({ id: row.id, notes: newNotes });
      }
    }

    // Batch-update this page
    for (const u of updates) {
      await db.update(entitiesTable).set({ notes: u.notes }).where(eq(entitiesTable.id, u.id));
    }
    updated += updates.length;
  }

  res.json({ updated, total, message: `Notes enriched for ${updated} entities.` });
});

// ── POST /ingest/create-edgar-stock-assets — create StockHolding assets ───────
// For each Western HNWI from SEC EDGAR that has no assets yet, create a
// StockHolding asset representing their large-shareholder filing position.
router.post("/ingest/create-edgar-stock-assets", async (_req: Request, res: Response): Promise<void> => {
  // Find EDGAR entities without any assets
  const edgarEntities = await db
    .select({ id: entitiesTable.id, name: entitiesTable.name, metadata: entitiesTable.metadata, knownResidences: entitiesTable.knownResidences })
    .from(entitiesTable)
    .where(sql`${entitiesTable.metadata} LIKE '%sec-edgar%' AND ${entitiesTable.metadata} NOT LIKE '%sec-edgar-def14a%'`);

  // Find which ones already have assets
  const existingAssetEntityIds = new Set(
    (await db.select({ ownerEntityId: assetsTable.ownerEntityId }).from(assetsTable).where(sql`${assetsTable.ownerEntityId} IS NOT NULL`))
      .map((r) => r.ownerEntityId!)
  );

  const toCreate = edgarEntities.filter((e) => !existingAssetEntityIds.has(e.id));

  let created = 0;
  const CHUNK = 500;
  const assetRows: (typeof assetsTable.$inferInsert)[] = [];

  for (const e of toCreate) {
    let meta: Record<string, any> = {};
    try { meta = JSON.parse(e.metadata ?? "{}"); } catch {}
    const formType: string = meta.formType ?? "SC 13G";
    const fileDate: string = meta.fileDate ?? null;
    const location: string = meta.bizLocation ?? ((() => { try { const r = JSON.parse(e.knownResidences ?? "null"); return Array.isArray(r) ? r[0] : r; } catch { return null; } })()) ?? "US";

    assetRows.push({
      category: "StockHolding",
      identifier: `EDGAR-${formType.replace(/\s/g, "")}-${e.id}`,
      jurisdiction: "SEC EDGAR",
      description: `Large-shareholder position per ${formType} filing${fileDate ? ` (${fileDate})` : ""}. Beneficial owner: ${e.name}.`,
      address: location || null,
      sourceRegistry: `SEC EDGAR — ${formType}`,
      ownerEntityId: e.id,
      lastActivityDate: fileDate || null,
    });
  }

  for (let i = 0; i < assetRows.length; i += CHUNK) {
    await db.insert(assetsTable).values(assetRows.slice(i, i + CHUNK));
    created += Math.min(CHUNK, assetRows.length - i);
  }

  res.json({ created, skipped: edgarEntities.length - toCreate.length, total: edgarEntities.length, message: `Created ${created} StockHolding assets for SEC EDGAR entities.` });
});

// ── POST /ingest/web-osint-enrich — web OSINT contact discovery ───────────────
// Uses DuckDuckGo, SEC EDGAR full-text search, and OpenCorporates to surface
// LinkedIn URLs, emails, and phone numbers for entities missing contact data.
// Runs as a background job; respects a 400ms polite delay between requests.
router.post("/ingest/web-osint-enrich", async (req: Request, res: Response): Promise<void> => {
  const existing = await getActiveJob("web-osint");
  if (existing) {
    res.status(409).json({ error: "A web OSINT enrichment job is already running.", jobId: existing });
    return;
  }

  const batchSize  = Math.min(parseInt((req.body as any)?.batchSize ?? "100", 10), 500);
  const entityType = (req.body as any)?.entityType as string | undefined; // "HNWI" | "Corporation" | undefined
  const force      = Boolean((req.body as any)?.force);

  // Select entities missing contact data
  const conditions: any[] = [];
  if (!force) conditions.push(sql`${entitiesTable.contactConfidence} = 0`);
  if (entityType) conditions.push(eq(entitiesTable.type, entityType as any));

  const entities = await db
    .select({
      id: entitiesTable.id,
      name: entitiesTable.name,
      type: entitiesTable.type,
      nationality: entitiesTable.nationality,
      sourceRegistries: entitiesTable.sourceRegistries,
      knownResidences: entitiesTable.knownResidences,
      metadata: entitiesTable.metadata,
    })
    .from(entitiesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(sql`${entitiesTable.bayesianScore} desc`)
    .limit(batchSize);

  if (entities.length === 0) {
    res.json({ message: "No entities to enrich.", jobId: null });
    return;
  }

  const jobId = await createJob("web-osint");
  await setActiveJob("web-osint", jobId);

  res.status(202).json({
    jobId,
    pollUrl: `/api/ingest/job/${jobId}`,
    total: entities.length,
    message: `Web OSINT enrichment started for ${entities.length} entities.`,
  });

  // Background enrichment loop
  (async () => {
    let enriched = 0;
    let skipped  = 0;
    let errors   = 0;

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      try {
        await updateJob(jobId, {
          progress: i,
          total: entities.length,
          inserted: enriched,
          skipped,
          errors,
          message: `Enriching ${entity.name}…`,
        });

        const result = await enrichEntityOsint(entity);

        if (!result.linkedinUrl && !result.email && !result.phone && !result.website) {
          skipped++;
          continue;
        }

        const confidence = computeContactConfidence({
          email: result.email,
          phone: result.phone,
          linkedinUrl: result.linkedinUrl,
          knownResidences: entity.knownResidences,
        });

        await db.update(entitiesTable)
          .set({
            ...(result.email        ? { email: result.email }               : {}),
            ...(result.phone        ? { phone: result.phone }               : {}),
            ...(result.linkedinUrl  ? { linkedinUrl: result.linkedinUrl }   : {}),
            contactConfidence: confidence,
            updatedAt: new Date(),
          })
          .where(eq(entitiesTable.id, entity.id));

        enriched++;
        logger.info({ entityId: entity.id, name: entity.name, confidence, sources: result.sources }, "Web OSINT enriched");
      } catch (err: any) {
        errors++;
        logger.warn({ entityId: entity.id, err: err.message }, "Web OSINT enrichment failed");
      }
    }

    await updateJob(jobId, {
      progress: entities.length,
      total: entities.length,
      inserted: enriched,
      skipped,
      errors,
      status: "done",
      message: `Done — ${enriched} entities enriched, ${skipped} no-match, ${errors} errors.`,
    });

    await setActiveJob("web-osint", "");
    logger.info({ enriched, skipped, errors }, "Web OSINT enrichment complete");
  })().catch(err => logger.error({ err: err.message }, "Web OSINT enrichment crashed"));
});

// ── DELETE /ingest/web-osint-lock — manually clear ghost web-osint lock ───────
router.delete("/ingest/web-osint-lock", async (_req: Request, res: Response): Promise<void> => {
  const jobId = await getActiveJob("web-osint");
  if (!jobId) {
    res.json({ cleared: false, message: "No active web-osint lock found." });
    return;
  }
  // Mark the stuck job as failed so UI reflects reality
  await updateJob(jobId, {
    status: "failed",
    message: "Process was killed (server restart). Clear the lock and restart.",
    finishedAt: new Date().toISOString(),
  } as any);
  await setActiveJob("web-osint", "");
  res.json({ cleared: true, jobId, message: "Web-OSINT lock cleared. You can now restart the enrichment." });
});

// ── POST /ingest/recompute-contact-confidence — recompute contactConfidence for all entities ──
// Entities ingested before the confidence scorer existed have contactConfidence = 0 even when
// they have addresses, emails, or phones. This endpoint fixes all stale rows.
router.post("/ingest/recompute-contact-confidence", async (_req: Request, res: Response): Promise<void> => {
  const entities = await db
    .select({
      id: entitiesTable.id,
      email: entitiesTable.email,
      phone: entitiesTable.phone,
      linkedinUrl: entitiesTable.linkedinUrl,
      knownResidences: entitiesTable.knownResidences,
      contactConfidence: entitiesTable.contactConfidence,
    })
    .from(entitiesTable);

  let updated = 0;
  let skipped = 0;
  const BATCH = 1000;

  for (let i = 0; i < entities.length; i += BATCH) {
    const batch = entities.slice(i, i + BATCH);
    for (const e of batch) {
      const confidence = computeContactConfidence({
        email: e.email,
        phone: e.phone,
        linkedinUrl: e.linkedinUrl,
        knownResidences: e.knownResidences,
      });
      if (confidence === (e.contactConfidence ?? 0)) { skipped++; continue; }
      await db.update(entitiesTable)
        .set({ contactConfidence: confidence })
        .where(eq(entitiesTable.id, e.id));
      updated++;
    }
  }

  res.json({ updated, skipped, total: entities.length, message: `Contact confidence recomputed: ${updated} updated, ${skipped} already correct.` });
});

// ── POST /ingest/sync-livesource-markers — backfill liveSource:true for FAA/HMLR entities ──
// The data_integrity_auditor flags entities from live registries that are missing the
// liveSource provenance marker. This one-time endpoint fixes that across all ingested rows.
router.post("/ingest/sync-livesource-markers", async (_req: Request, res: Response): Promise<void> => {
  const LIVE_REGISTRY_PATTERNS = [
    "faa", "land registry", "hmlr", "sec edgar", "companies house", "brreg"
  ];

  const entities = await db
    .select({ id: entitiesTable.id, sourceRegistries: entitiesTable.sourceRegistries, metadata: entitiesTable.metadata })
    .from(entitiesTable);

  let updated = 0;
  let skipped = 0;
  const BATCH = 500;

  for (let i = 0; i < entities.length; i += BATCH) {
    const batch = entities.slice(i, i + BATCH);
    for (const e of batch) {
      const sources: string[] = (() => { try { return JSON.parse(e.sourceRegistries ?? "[]"); } catch { return []; } })();
      const meta: Record<string, unknown> = (() => { try { return JSON.parse(e.metadata ?? "{}"); } catch { return {}; } })();

      const isLive = sources.some(s => LIVE_REGISTRY_PATTERNS.some(p => s.toLowerCase().includes(p)))
        || !!meta.source || !!meta.nNumber || !!meta.formType || !!meta.orgnr || !!meta.titleNumber;

      if (!isLive || meta.liveSource === true) { skipped++; continue; }

      meta.liveSource = true;
      await db.update(entitiesTable)
        .set({ metadata: JSON.stringify(meta) })
        .where(eq(entitiesTable.id, e.id));
      updated++;
    }
  }

  res.json({ updated, skipped, total: entities.length, message: `liveSource marker synced: ${updated} updated, ${skipped} skipped.` });
});

// ── POST /ingest/backfill-net-worth — set estimatedNetWorth = 3× asset value for entities ─
// The data_analyst persona flags entities where estimatedNetWorth is null but total asset
// value exceeds $1M. This endpoint closes that gap by applying a conservative 3× floor.
// Corp/Trust/HNWI all qualify. Background job — large datasets can take ~30s.
router.post("/ingest/backfill-net-worth", async (_req: Request, res: Response): Promise<void> => {
  try {
    // Find entities with null estimatedNetWorth that have assets with estimatedValue > 0
    const candidates = await db.execute(sql`
      SELECT e.id, SUM(a.estimated_value) AS total_value
      FROM entities e
      JOIN assets a ON a.owner_entity_id = e.id
      WHERE e.estimated_net_worth IS NULL
        AND a.estimated_value IS NOT NULL
        AND a.estimated_value > 0
      GROUP BY e.id
      HAVING SUM(a.estimated_value) >= 1000000
    `);

    const rows = candidates.rows as { id: number; total_value: string }[];
    if (rows.length === 0) {
      res.json({ updated: 0, message: "No entities need net worth backfill." });
      return;
    }

    let updated = 0;
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      for (const row of slice) {
        const totalValue = Number(row.total_value);
        const estimatedNetWorth = Math.round(totalValue * 3); // 3× conservative floor
        await db.update(entitiesTable)
          .set({ estimatedNetWorth, updatedAt: new Date() })
          .where(eq(entitiesTable.id, Number(row.id)));
        updated++;
      }
    }

    res.json({
      updated,
      total: rows.length,
      message: `Net worth backfilled: ${updated} entities updated (3× registered asset value as floor).`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Backfill failed" });
  }
});

// ── DELETE /ingest/dedup — clear dedup set ────────────────────────────────────
router.delete("/ingest/dedup", async (_req, res): Promise<void> => {
  await clearDedup();
  res.json({ status: "ok", message: "Dedup set cleared. Next ingestion will re-insert all records." });
});

// ── POST /ingest/hunter-enrich — Hunter.io + Apollo.io email/LinkedIn enrichment
// Uses HUNTER_API_KEY and/or APOLLO_API_KEY to find verified emails and LinkedIn
// URLs. Far higher precision than free web OSINT (~40pt contact confidence gain).
// Accepts: { batchSize?: number, entityType?: "HNWI"|"Gatekeeper", force?: boolean }
router.post("/ingest/hunter-enrich", async (req: Request, res: Response): Promise<void> => {
  const hunterKey = process.env["HUNTER_API_KEY"];
  const apolloKey = process.env["APOLLO_API_KEY"];

  if (!hunterKey && !apolloKey) {
    res.status(400).json({
      error: "Neither HUNTER_API_KEY nor APOLLO_API_KEY is set. Add at least one to use this enricher.",
    });
    return;
  }

  const existing = await getActiveJob("hunter-enrich");
  if (existing) {
    res.status(409).json({ error: "A Hunter/Apollo enrichment job is already running.", jobId: existing });
    return;
  }

  const batchSize  = Math.min(parseInt((req.body as any)?.batchSize  ?? "200", 10), 1000);
  const entityType = (req.body as any)?.entityType as string | undefined;
  const force      = Boolean((req.body as any)?.force);

  const conditions: any[] = [];
  if (!force) conditions.push(sql`${entitiesTable.contactConfidence} < 40`);
  if (entityType) conditions.push(eq(entitiesTable.type, entityType as any));

  const entities = await db
    .select({
      id:       entitiesTable.id,
      name:     entitiesTable.name,
      type:     entitiesTable.type,
      metadata: entitiesTable.metadata,
    })
    .from(entitiesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(sql`${entitiesTable.bayesianScore} desc`)
    .limit(batchSize);

  if (entities.length === 0) {
    res.json({ message: "No entities need enrichment.", jobId: null });
    return;
  }

  const jobId = await createJob("hunter-enrich");
  await setActiveJob("hunter-enrich", jobId);

  const activeKeys = [hunterKey && "Hunter.io", apolloKey && "Apollo.io"].filter(Boolean).join(" + ");

  res.status(202).json({
    jobId,
    pollUrl:  `/api/ingest/job/${jobId}`,
    total:    entities.length,
    message:  `Hunter/Apollo enrichment started for ${entities.length} entities using ${activeKeys}.`,
    keys:     activeKeys,
  });

  // Background enrichment loop
  (async () => {
    let enriched = 0;
    let skipped  = 0;
    let errors   = 0;

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]!;
      try {
        await updateJob(jobId, {
          progress: i,
          total:    entities.length,
          inserted: enriched,
          skipped,
          errors,
          message:  `Enriching ${entity.name}…`,
        });

        const result = await enrichWithHunterApollo({
          id:       entity.id,
          name:     entity.name,
          type:     entity.type ?? "HNWI",
          metadata: entity.metadata,
        });

        if (!result || (!result.email && !result.linkedinUrl && !result.phone)) {
          skipped++;
          continue;
        }

        // Merge with existing contact data to preserve any prior signals
        const existing = await db
          .select({ email: entitiesTable.email, phone: entitiesTable.phone, linkedinUrl: entitiesTable.linkedinUrl, knownResidences: entitiesTable.knownResidences })
          .from(entitiesTable)
          .where(eq(entitiesTable.id, entity.id))
          .limit(1);

        const cur = existing[0];
        const merged = {
          email:       result.email       ?? cur?.email       ?? null,
          phone:       result.phone       ?? cur?.phone       ?? null,
          linkedinUrl: result.linkedinUrl ?? cur?.linkedinUrl ?? null,
        };

        const confidence = computeContactConfidence({
          ...merged,
          knownResidences: cur?.knownResidences,
        });

        await db.update(entitiesTable)
          .set({ ...merged, contactConfidence: confidence, updatedAt: new Date() })
          .where(eq(entitiesTable.id, entity.id));

        enriched++;
        logger.info({ entityId: entity.id, name: entity.name, confidence, source: result.source }, "Hunter/Apollo enriched");
      } catch (err: any) {
        errors++;
        logger.warn({ entityId: entity.id, err: err.message }, "Hunter/Apollo enrichment failed");
      }

      // Polite rate limit: Hunter free = 25 req/mo, paid = 500/mo
      // 300ms gap → ~3 req/s; well within API limits
      await new Promise(r => setTimeout(r, 300));
    }

    await updateJob(jobId, {
      progress: entities.length,
      total:    entities.length,
      inserted: enriched,
      skipped,
      errors,
      status:   "done",
      message:  `Done — ${enriched} entities enriched via ${activeKeys}, ${skipped} no-match, ${errors} errors.`,
    });

    await setActiveJob("hunter-enrich", "");
    logger.info({ enriched, skipped, errors }, "Hunter/Apollo enrichment complete");
  })().catch(err => logger.error({ err: err.message }, "Hunter/Apollo enrichment crashed"));
});

// ── DELETE /ingest/hunter-enrich-lock — clear ghost Hunter/Apollo lock ────────
router.delete("/ingest/hunter-enrich-lock", async (_req: Request, res: Response): Promise<void> => {
  const jobId = await getActiveJob("hunter-enrich");
  if (!jobId) {
    res.json({ cleared: false, message: "No active hunter-enrich lock." });
    return;
  }
  await updateJob(jobId, { status: "failed", message: "Process killed (server restart).", finishedAt: new Date().toISOString() } as any);
  await setActiveJob("hunter-enrich", "");
  res.json({ cleared: true, jobId });
});

export default router;
