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

const INGESTOR_TYPES = ["faa", "land-registry", "western-hnwi", "companies-house-enrich", "occrp", "opensky", "improve", "web-osint", "bulk-mcts", "in-house-enrich"] as const;

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
    // Collect all updates first, then write in parallel chunks (avoids sequential awaits per row)
    const liveUpdates: Array<{ id: number; metadata: string }> = [];
    for (const e of entities) {
      const sources: string[] = (() => { try { return JSON.parse(e.sourceRegistries ?? "[]"); } catch { return []; } })();
      const meta: Record<string, unknown> = (() => { try { return JSON.parse(e.metadata ?? "{}"); } catch { return {}; } })();
      const isLive = sources.some(s => LIVE_PATTERNS.some(p => s.toLowerCase().includes(p)))
        || !!meta.source || !!meta.nNumber || !!meta.formType || !!meta.orgnr || !!meta.titleNumber;
      if (!isLive || meta.liveSource === true) continue;
      meta.liveSource = true;
      liveUpdates.push({ id: e.id, metadata: JSON.stringify(meta) });
    }
    const PCHUNK = 100;
    for (let i = 0; i < liveUpdates.length; i += PCHUNK) {
      await Promise.all(
        liveUpdates.slice(i, i + PCHUNK).map(u =>
          db.update(entitiesTable).set({ metadata: u.metadata }).where(eq(entitiesTable.id, u.id))
        )
      );
    }
    logger.info({ updated: liveUpdates.length, total: entities.length }, "Maintenance: liveSource markers synced");
  } catch (err: any) {
    logger.warn({ err: err?.message }, "Maintenance: liveSource sync failed (non-fatal)");
  }

  logger.info("Populated-DB maintenance complete (steps 1-4). Steps 5-7 running in background…");

  // Steps 5-7 run in parallel as true background tasks — heavy write work,
  // don't block the main maintenance chain or the delayed HTTP triggers.
  Promise.all([

    // 5. Populate sparse notes from filing metadata (batch: 2000 per boot to avoid OOM)
    (async () => {
      try {
        const sparseRows = await db
          .select({ id: entitiesTable.id, notes: entitiesTable.notes, metadata: entitiesTable.metadata,
                    sourceRegistries: entitiesTable.sourceRegistries, type: entitiesTable.type,
                    nationality: entitiesTable.nationality, knownResidences: entitiesTable.knownResidences })
          .from(entitiesTable)
          .where(sql`(${entitiesTable.notes} IS NULL OR length(${entitiesTable.notes}) < 50) AND ${entitiesTable.metadata} IS NOT NULL AND ${entitiesTable.metadata} != '{}'`)
          .limit(2000); // cap per-boot to avoid long-running lock

        // Collect all note updates first, then write in parallel chunks
        const noteUpdates: Array<{ id: number; notes: string }> = [];
        for (const row of sparseRows) {
          let meta: Record<string, any> = {};
          try { meta = JSON.parse(row.metadata ?? "{}"); } catch {}
          const sources: string[] = (() => { try { return JSON.parse(row.sourceRegistries ?? "[]"); } catch { return []; } })();
          const parts: string[] = [];
          if (sources.length > 0) parts.push(`Source: ${sources.join("; ")}.`);
          if (meta.formType) parts.push(`Filing: ${meta.formType}${meta.fileDate ? ` (${meta.fileDate})` : ""}.`);
          if (meta.companyName) parts.push(`Company: ${meta.companyName}.`);
          if (meta.orgnr) parts.push(`Org number: ${meta.orgnr}.`);
          if (meta.roleDesc) parts.push(`Role: ${meta.roleDesc}.`);
          if (row.nationality) parts.push(`Nationality: ${row.nationality}.`);
          if (row.knownResidences) {
            const loc = (() => { try { const r = JSON.parse(row.knownResidences!); return Array.isArray(r) ? r[0] : r; } catch { return row.knownResidences; } })();
            if (loc) parts.push(`Location: ${loc}.`);
          }
          if (row.type) parts.push(`Entity type: ${row.type}.`);
          const newNotes = parts.join(" ");
          if (newNotes && newNotes !== row.notes) noteUpdates.push({ id: row.id, notes: newNotes });
        }
        const PCHUNK = 50;
        for (let i = 0; i < noteUpdates.length; i += PCHUNK) {
          await Promise.all(
            noteUpdates.slice(i, i + PCHUNK).map(u =>
              db.update(entitiesTable).set({ notes: u.notes }).where(eq(entitiesTable.id, u.id))
            )
          );
        }
        logger.info({ updated: noteUpdates.length, total: sparseRows.length }, "Maintenance bg: sparse notes populated");
      } catch (err: any) {
        logger.warn({ err: err?.message }, "Maintenance bg: sparse notes population failed (non-fatal)");
      }
    })(),

    // 6. Create StockHolding assets for EDGAR entities that have none
    (async () => {
      try {
        const edgarEntities = await db
          .select({ id: entitiesTable.id, name: entitiesTable.name, metadata: entitiesTable.metadata, knownResidences: entitiesTable.knownResidences })
          .from(entitiesTable)
          .where(sql`${entitiesTable.metadata}::text LIKE '%sec-edgar%' AND ${entitiesTable.metadata}::text NOT LIKE '%sec-edgar-def14a%'`);

        const existingIds = new Set(
          (await db.select({ ownerEntityId: assetsTable.ownerEntityId }).from(assetsTable)
            .where(sql`${assetsTable.ownerEntityId} IS NOT NULL`)).map(r => r.ownerEntityId!)
        );
        const toCreate = edgarEntities.filter(e => !existingIds.has(e.id));
        if (toCreate.length === 0) { logger.info("Maintenance bg: all EDGAR entities already have assets"); return; }

        const assetRows: (typeof assetsTable.$inferInsert)[] = toCreate.map(e => {
          let meta: Record<string, any> = {};
          try { meta = JSON.parse(e.metadata ?? "{}"); } catch {}
          const formType = meta.formType ?? "SC 13G";
          const fileDate = meta.fileDate ?? null;
          const location = meta.bizLocation
            ?? ((() => { try { const r = JSON.parse(e.knownResidences ?? "null"); return Array.isArray(r) ? r[0] : r; } catch { return null; } })())
            ?? "US";
          return {
            category: "StockHolding" as const,
            identifier: `EDGAR-${formType.replace(/\s/g, "")}-${e.id}`,
            jurisdiction: "SEC EDGAR",
            description: `Large-shareholder position per ${formType} filing${fileDate ? ` (${fileDate})` : ""}. Beneficial owner: ${e.name}.`,
            address: location || null,
            sourceRegistry: `SEC EDGAR — ${formType}`,
            ownerEntityId: e.id,
            lastActivityDate: fileDate || null,
          };
        });
        const CHUNK = 500;
        for (let i = 0; i < assetRows.length; i += CHUNK) {
          await db.insert(assetsTable).values(assetRows.slice(i, i + CHUNK));
        }
        logger.info({ created: toCreate.length }, "Maintenance bg: EDGAR StockHolding assets created");
      } catch (err: any) {
        logger.warn({ err: err?.message }, "Maintenance bg: EDGAR stock asset creation failed (non-fatal)");
      }
    })(),

    // 7. Clear needsEnrichment=true flags for entities that have been enriched
    (async () => {
      try {
        const flagged = await db
          .select({ id: entitiesTable.id, metadata: entitiesTable.metadata })
          .from(entitiesTable)
          .where(sql`${entitiesTable.metadata}::text LIKE '%"needsEnrichment":true%'`);
        // Collect updates first, then write in parallel chunks
        const toUpdate: Array<{ id: number; metadata: string }> = [];
        for (const row of flagged) {
          const meta: Record<string, unknown> = (() => { try { return JSON.parse(row.metadata ?? "{}"); } catch { return {}; } })();
          if (meta.needsEnrichment !== true) continue;
          const enriched = !!meta.enricherVersion || !!meta.enrichedAt || !!meta.enrichmentSources;
          if (enriched) {
            meta.needsEnrichment = false;
            toUpdate.push({ id: row.id, metadata: JSON.stringify(meta) });
          }
        }
        const PCHUNK = 50;
        for (let i = 0; i < toUpdate.length; i += PCHUNK) {
          await Promise.all(
            toUpdate.slice(i, i + PCHUNK).map(u =>
              db.update(entitiesTable).set({ metadata: u.metadata }).where(eq(entitiesTable.id, u.id))
            )
          );
        }
        logger.info({ cleared: toUpdate.length, total: flagged.length }, "Maintenance bg: needsEnrichment flags cleared");
      } catch (err: any) {
        logger.warn({ err: err?.message }, "Maintenance bg: needsEnrichment clear failed (non-fatal)");
      }
    })(),

  ]).catch(err => logger.warn({ err: err?.message }, "Maintenance bg tasks error (non-fatal)"));

  // 8. After maintenance — fire delayed HTTP triggers for graph clustering and bulk Hybrid Research.
  //    Server is already listening by this point (coldStartRecovery runs fire-and-forget).
  const port = process.env["PORT"] ?? "8080";
  setTimeout(async () => {
    try {
      const clusterRes = await fetch(`http://localhost:${port}/api/relationships/auto-detect-clusters`, { method: "POST" });
      if (clusterRes.ok) {
        const d = await clusterRes.json();
        logger.info({ message: d.message }, "Maintenance: cluster auto-detection triggered");
      }
    } catch (err: any) {
      logger.warn({ err: err?.message }, "Maintenance: cluster auto-detection trigger failed (non-fatal)");
    }
  }, 15_000); // 15s after boot — server is stable by then

  // 45s: first bulk Hybrid Research pass — 200 hot leads, skip already-run sessions
  setTimeout(async () => {
    try {
      const researchRes = await fetch(`http://localhost:${port}/api/research/bulk-run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 200, skipExisting: true }),
      });
      if (researchRes.ok) {
        const d = await researchRes.json();
        logger.info({ message: d.message, jobId: d.jobId }, "Maintenance: auto Hybrid Research bulk run triggered (pass 1)");
      }
    } catch (err: any) {
      logger.warn({ err: err?.message }, "Maintenance: auto hybrid-research trigger failed (non-fatal)");
    }
  }, 45_000);

  // 120s: auto in-house enricher — fills email/LinkedIn for zero-contact HNWI & Gatekeeper entities
  setTimeout(async () => {
    try {
      const enrichRes = await fetch(`http://localhost:${port}/api/ingest/in-house-enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 500 }),
      });
      if (enrichRes.ok) {
        const d = await enrichRes.json();
        logger.info({ message: d.message, jobId: d.jobId }, "Maintenance: auto in-house enricher triggered");
      } else {
        logger.info({ status: enrichRes.status }, "Maintenance: in-house enricher already running or no targets");
      }
    } catch (err: any) {
      logger.warn({ err: err?.message }, "Maintenance: auto in-house enricher trigger failed (non-fatal)");
    }
  }, 120_000);

  // 8 min: second bulk Hybrid Research pass — cover the next 200 cold sessions
  setTimeout(async () => {
    try {
      const researchRes = await fetch(`http://localhost:${port}/api/research/bulk-run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 200, skipExisting: true }),
      });
      if (researchRes.ok) {
        const d = await researchRes.json();
        logger.info({ message: d.message, jobId: d.jobId }, "Maintenance: auto Hybrid Research bulk run triggered (pass 2)");
      }
    } catch (err: any) {
      logger.warn({ err: err?.message }, "Maintenance: auto Hybrid Research trigger failed pass 2 (non-fatal)");
    }
  }, 480_000);
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
