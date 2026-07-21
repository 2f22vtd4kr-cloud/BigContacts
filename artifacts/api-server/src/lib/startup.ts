/**
 * Cold-Start Recovery — runs once at API server boot.
 *
 * 1. Clears ghost active-job locks from any prior process that was killed
 *    (job metadata lives in Upstash; the actual async function dies with the process).
 * 2. Checks DB entity count; if 0, auto-starts all three ingestion pipelines.
 *
 * This makes every cold-start from a GitHub import fully automatic:
 * the user just waits a few minutes for data to appear.
 */

import { db, entitiesTable, assetsTable } from "@workspace/db";
import { count, gte, eq, and, inArray, sql } from "drizzle-orm";
import {
  createJob, updateJob, setActiveJob, getActiveJob, getJob, clearActiveJob,
  clearDedup, getDedupCount,
} from "./job-queue";
import { runFaaIngestion, US_STATE_CENTROIDS } from "./faa-ingestor";
import { runLandRegistryIngestion } from "./land-registry-ingestor";
import { runWesternHnwiIngestion, classifyEntityType } from "./western-hnwi-ingestion";
import { logger } from "./logger";

const INGESTOR_TYPES = ["faa", "land-registry", "western-hnwi", "companies-house-enrich", "occrp", "opensky", "improve", "web-osint"] as const;

/** Mark any "running" job whose process is dead as failed, clear its lock. */
async function clearGhostJobs(): Promise<void> {
  for (const type of INGESTOR_TYPES) {
    try {
      const jobId = await getActiveJob(type);
      if (!jobId) continue;
      const job = await getJob(jobId);
      if (job?.status === "running") {
        await updateJob(jobId, {
          status: "failed",
          message: "Process was killed — restart job to continue.",
          finishedAt: new Date().toISOString(),
        });
        await clearActiveJob(type);
        logger.warn({ type, jobId }, "Cleared ghost active-job lock from previous process");
      }
    } catch (err: any) {
      logger.warn({ type, err: err?.message }, "Error clearing ghost job (non-fatal)");
    }
  }
}

/** Fire-and-forget background ingestor. */
function startIngestor(
  type: string,
  runner: (opts: any) => Promise<any>,
  opts: Record<string, unknown>,
): void {
  (async () => {
    const jobId = await createJob(type);
    await setActiveJob(type, jobId);
    try {
      await updateJob(jobId, { status: "running", message: "Auto-started on cold boot…" });
      const result = await runner({ ...opts, jobId });
      await updateJob(jobId, {
        status: "done",
        progress: 100,
        inserted: result.inserted ?? 0,
        skipped: result.skipped ?? 0,
        errors: result.errors ?? 0,
        finishedAt: new Date().toISOString(),
        message: `Done — ${(result.inserted ?? 0).toLocaleString()} inserted`,
      });
      logger.info({ type, inserted: result.inserted }, "Auto-ingestion complete");
    } catch (err: any) {
      logger.error({ type, err: err?.message }, "Auto-ingestion failed");
      await updateJob(jobId, { status: "failed", message: err?.message ?? "Unknown error", finishedAt: new Date().toISOString() });
      await clearActiveJob(type);
    }
  })();
}

/**
 * Runs background maintenance tasks when the DB is already populated.
 * All steps are idempotent and fire-and-forget (non-fatal if they fail).
 */
async function runPopulatedDbMaintenance(): Promise<void> {
  logger.info("Running populated-DB maintenance tasks…");

  // 1. Sync isHot flags for entities with score ≥ 0.70 that aren't flagged yet
  try {
    const hotResult = await db
      .update(entitiesTable)
      .set({ isHot: true, updatedAt: new Date() })
      .where(and(gte(entitiesTable.bayesianScore, 0.70), eq(entitiesTable.isHot, false)))
      .returning({ id: entitiesTable.id });
    logger.info({ updated: hotResult.length }, "Maintenance: hot flags synced");
  } catch (err: any) {
    logger.warn({ err: err?.message }, "Maintenance: hot flag sync failed (non-fatal)");
  }

  // 2. Reclassify entity types (Corporation/Trust by name pattern)
  try {
    const rows = await db.select({ id: entitiesTable.id, name: entitiesTable.name }).from(entitiesTable);
    const corps: number[] = [];
    const trusts: number[] = [];
    for (const row of rows) {
      const t = classifyEntityType(row.name);
      if (t === "Corporation") corps.push(row.id);
      else if (t === "Trust") trusts.push(row.id);
    }
    const CHUNK = 500;
    for (let i = 0; i < corps.length; i += CHUNK) {
      await db.update(entitiesTable)
        .set({ type: "Corporation", updatedAt: new Date() })
        .where(inArray(entitiesTable.id, corps.slice(i, i + CHUNK)));
    }
    for (let i = 0; i < trusts.length; i += CHUNK) {
      await db.update(entitiesTable)
        .set({ type: "Trust", updatedAt: new Date() })
        .where(inArray(entitiesTable.id, trusts.slice(i, i + CHUNK)));
    }
    logger.info({ corps: corps.length, trusts: trusts.length }, "Maintenance: entity types reclassified");
  } catch (err: any) {
    logger.warn({ err: err?.message }, "Maintenance: reclassify failed (non-fatal)");
  }

  // 3. Backfill lat/lon for FAA aviation assets that are missing coordinates
  try {
    const nullCoords = await db
      .select({ id: assetsTable.id, jurisdiction: assetsTable.jurisdiction })
      .from(assetsTable)
      .where(and(eq(assetsTable.category, "Aviation"), sql`${assetsTable.latitude} IS NULL`));

    const byState = new Map<string, number[]>();
    for (const row of nullCoords) {
      const code = row.jurisdiction?.split(",")[0]?.trim().toUpperCase() ?? "";
      if (!US_STATE_CENTROIDS[code]) continue;
      const arr = byState.get(code) ?? [];
      arr.push(row.id);
      byState.set(code, arr);
    }
    let coordsUpdated = 0;
    for (const [code, ids] of byState.entries()) {
      const c = US_STATE_CENTROIDS[code]!;
      for (let i = 0; i < ids.length; i += 500) {
        await db.update(assetsTable)
          .set({ latitude: c[0], longitude: c[1] })
          .where(inArray(assetsTable.id, ids.slice(i, i + 500)));
      }
      coordsUpdated += ids.length;
    }
    logger.info({ updated: coordsUpdated, total: nullCoords.length }, "Maintenance: FAA coordinates synced");
  } catch (err: any) {
    logger.warn({ err: err?.message }, "Maintenance: FAA coordinate sync failed (non-fatal)");
  }

  // 4. Backfill liveSource provenance marker in metadata
  try {
    const LIVE_PATTERNS = ["faa", "land registry", "hmlr", "sec edgar", "companies house", "brreg"];
    const entities = await db
      .select({ id: entitiesTable.id, sourceRegistries: entitiesTable.sourceRegistries, metadata: entitiesTable.metadata })
      .from(entitiesTable);
    let liveUpdated = 0;
    const BATCH = 500;
    for (let i = 0; i < entities.length; i += BATCH) {
      const batch = entities.slice(i, i + BATCH);
      for (const e of batch) {
        const sources: string[] = (() => { try { return JSON.parse(e.sourceRegistries ?? "[]"); } catch { return []; } })();
        const meta: Record<string, unknown> = (() => { try { return JSON.parse(e.metadata ?? "{}"); } catch { return {}; } })();
        const isLive = sources.some(s => LIVE_PATTERNS.some(p => s.toLowerCase().includes(p)))
          || !!meta.source || !!meta.nNumber || !!meta.formType || !!meta.orgnr || !!meta.titleNumber;
        if (!isLive || meta.liveSource === true) continue;
        meta.liveSource = true;
        await db.update(entitiesTable)
          .set({ metadata: JSON.stringify(meta) })
          .where(eq(entitiesTable.id, e.id));
        liveUpdated++;
      }
    }
    logger.info({ updated: liveUpdated, total: entities.length }, "Maintenance: liveSource markers synced");
  } catch (err: any) {
    logger.warn({ err: err?.message }, "Maintenance: liveSource sync failed (non-fatal)");
  }

  logger.info("Populated-DB maintenance complete");
}

/** Main cold-start entry point — call once after Upstash connects. */
export async function coldStartRecovery(): Promise<void> {
  logger.info("Cold-start recovery: checking for ghost jobs…");
  await clearGhostJobs();

  // Check entity count
  let entityCount = 0;
  try {
    const [row] = await db.select({ count: count() }).from(entitiesTable);
    entityCount = Number(row?.count ?? 0);
  } catch (err: any) {
    logger.warn({ err: err?.message }, "Could not query entity count (non-fatal)");
    return;
  }

  if (entityCount > 0) {
    logger.info({ entityCount }, "DB already populated — skipping auto-ingestion; running maintenance…");
    // Fire-and-forget maintenance (isHot sync, reclassify, geocoding, liveSource)
    runPopulatedDbMaintenance().catch((err: any) =>
      logger.warn({ err: err?.message }, "Populated-DB maintenance error (non-fatal)")
    );
    return;
  }

  // DB is empty but Upstash dedup may hold entries from a prior session.
  // If dedup is non-zero, the ingestors will see every record as "already seen"
  // and insert nothing. Clear the stale dedup so ingestors can re-populate from scratch.
  const dedupCount = await getDedupCount();
  if (dedupCount > 0) {
    logger.warn({ dedupCount }, "DB empty but dedup set is non-zero (stale from prior session) — clearing dedup for fresh ingest");
    await clearDedup();
  }

  logger.info("DB empty — auto-starting FAA, Land Registry, and Western HNWI ingestion…");

  startIngestor("faa",            runFaaIngestion,           { force: false });
  startIngestor("land-registry",  runLandRegistryIngestion,  { force: false });
  startIngestor("western-hnwi",   runWesternHnwiIngestion,   { targetCount: 5_000, batchSize: 100 });
}
