/**
 * Ingest Pipeline Routes
 *
 * Pipeline status monitoring, deep web OSINT, and semantic embedding jobs.
 *
 * GET  /pipeline/status                  — real-time entity pipeline health counts
 * POST /ingest/deep-web-osint            — multi-engine multi-query web OSINT job
 * DELETE /ingest/deep-web-osint-lock     — clear ghost deep-web-osint lock
 * POST /ingest/compute-embeddings        — Phase G1 semantic embedding background job
 * DELETE /ingest/compute-embeddings-lock — clear ghost compute-embeddings lock
 * GET  /ingest/semantic-engine-status    — Phase G1 embedding cache status
 * GET  /ingest/jobs                      — live status of all known background job types
 */

import { Router, type Request, type Response } from "express";
import { db, entitiesTable } from "@workspace/db";
import { sql, eq, and, desc, count } from "drizzle-orm";
import {
  createJob, updateJob, getJob,
  setActiveJob, getActiveJob,
} from "../lib/job-queue";
import { deepWebOsintEnrich } from "../lib/enrichment/web-discovery";
import { computeContactConfidence } from "../lib/contact-confidence";
import { contactCacheSet } from "../lib/redis";
import { logger } from "../lib/logger";

const router = Router();

function safeParseJson<T>(str: string | null | undefined, fallback: T): T {
  try { return str ? JSON.parse(str) as T : fallback; } catch { return fallback; }
}

// ── GET /pipeline/status ──────────────────────────────────────────────────────
router.get("/pipeline/status", async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalRow,
      hotRow,
      coldMctsRow,
      needsEnrichmentRow,
      zeroContactRow,
      sparseNotesRow,
      zeroRelRow,
    ] = await Promise.all([
      db.select({ count: count() }).from(entitiesTable),
      db.select({ count: count() }).from(entitiesTable).where(eq(entitiesTable.isHot, true)),
      db.execute(sql`
        SELECT COUNT(*)::int AS count FROM entities e
        WHERE e.is_hot = true
        AND e.id NOT IN (SELECT DISTINCT target_entity_id FROM research_sessions)
      `),
      db.select({ count: count() }).from(entitiesTable)
        .where(sql`${entitiesTable.metadata}::text LIKE '%needsEnrichment%:true%'`),
      db.select({ count: count() }).from(entitiesTable)
        .where(sql`${entitiesTable.contactConfidence} = 0 AND ${entitiesTable.type} IN ('HNWI', 'Gatekeeper')`),
      db.select({ count: count() }).from(entitiesTable)
        .where(sql`${entitiesTable.notes} IS NULL OR length(${entitiesTable.notes}) < 50`),
      db.execute(sql`
        SELECT (
          (SELECT COUNT(*) FROM entities) -
          (SELECT COUNT(DISTINCT e_id) FROM (
            SELECT source_entity_id AS e_id FROM relationships
            UNION
            SELECT target_id AS e_id FROM relationships WHERE target_type = 'Entity'
          ) t)
        )::int AS count
      `),
    ]);

    const coldMcts = Number((coldMctsRow.rows[0] as any)?.count ?? 0);
    const zeroRel  = Number((zeroRelRow.rows[0] as any)?.count  ?? 0);

    res.json({
      totalEntities:     Number(totalRow[0]?.count           ?? 0),
      hotLeads:          Number(hotRow[0]?.count             ?? 0),
      coldMcts,
      needsEnrichment:   Number(needsEnrichmentRow[0]?.count ?? 0),
      zeroContact:       Number(zeroContactRow[0]?.count     ?? 0),
      sparseNotes:       Number(sparseNotesRow[0]?.count     ?? 0),
      zeroRelationships: zeroRel,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to fetch pipeline status" });
  }
});

// ── POST /ingest/deep-web-osint ───────────────────────────────────────────────
router.post("/ingest/deep-web-osint", async (req: Request, res: Response): Promise<void> => {
  const existing = await getActiveJob("deep-web-osint");
  if (existing) {
    res.status(409).json({ error: "A deep web OSINT job is already running.", jobId: existing });
    return;
  }

  const body = req.body ?? {};
  const batchSize = Math.min(Number(body.batchSize) || 200, 5_000);
  const force     = Boolean(body.force);
  const hotOnly   = body.hotOnly !== false;

  const conditions: any[] = [
    sql`${entitiesTable.type} IN ('HNWI', 'Gatekeeper', 'Corporation')`,
  ];
  if (!force)  conditions.push(sql`${entitiesTable.contactConfidence} = 0`);
  if (hotOnly) conditions.push(sql`${entitiesTable.bayesianScore} >= 0.5`);

  const entities = await db
    .select({
      id: entitiesTable.id, name: entitiesTable.name, type: entitiesTable.type,
      sourceRegistries: entitiesTable.sourceRegistries,
      knownResidences:  entitiesTable.knownResidences,
      metadata:         entitiesTable.metadata,
      bayesianScore:    entitiesTable.bayesianScore,
      email:            entitiesTable.email,
      phone:            entitiesTable.phone,
      linkedinUrl:      entitiesTable.linkedinUrl,
    })
    .from(entitiesTable)
    .where(and(...conditions))
    .orderBy(desc(entitiesTable.bayesianScore))
    .limit(batchSize);

  if (!entities.length) {
    res.json({ message: "No entities to deep-web-enrich.", jobId: null });
    return;
  }

  const jobId = await createJob("deep-web-osint");
  await setActiveJob("deep-web-osint", jobId);
  await updateJob(jobId, { status: "running", total: entities.length, message: "Deep web OSINT starting…" });

  res.json({
    jobId, total: entities.length,
    message: `Deep web OSINT started for ${entities.length} entities (${hotOnly ? "hot leads" : "all"}).`,
  });

  (async () => {
    let enriched = 0, skipped = 0, errors = 0;

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]!;
      try {
        await updateJob(jobId, {
          status: "running", progress: i, total: entities.length,
          inserted: enriched, skipped, errors,
          message: `Searching: ${entity.name}…`,
        });

        const result = await deepWebOsintEnrich(entity);
        const hasSignal = result.email || result.phone || result.linkedinUrl;

        if (!hasSignal) { skipped++; continue; }

        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (result.email      && !entity.email)      updates["email"]      = result.email;
        if (result.phone      && !entity.phone)      updates["phone"]      = result.phone;
        if (result.linkedinUrl && !entity.linkedinUrl) updates["linkedinUrl"] = result.linkedinUrl;

        const confidence = computeContactConfidence({
          email:           (updates["email"]      as string | null) ?? entity.email ?? null,
          phone:           (updates["phone"]      as string | null) ?? entity.phone ?? null,
          linkedinUrl:     (updates["linkedinUrl"] as string | null) ?? entity.linkedinUrl ?? null,
          knownResidences: entity.knownResidences,
        });
        updates["contactConfidence"] = confidence;

        const meta = safeParseJson<Record<string, unknown>>(entity.metadata, {});
        meta["deepWebOsintAt"]      = new Date().toISOString();
        meta["deepWebOsintSources"] = result.sources;
        meta["deepWebQueriesFired"] = result.queriesFired;
        if (result.emailConfidence) meta["deepWebEmailConf"] = result.emailConfidence;
        meta["liveSource"] = true;
        updates["metadata"]   = JSON.stringify(meta);
        updates["liveSource"] = true;

        await db.update(entitiesTable).set(updates as any).where(eq(entitiesTable.id, entity.id));

        const stableKey = (() => {
          if (meta["nNumber"])       return `faa:${meta["nNumber"]}`;
          if (meta["entityName"])    return `edgar:${String(meta["entityName"]).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
          if (meta["orgnr"])         return `brreg:${meta["orgnr"]}`;
          if (meta["companyNumber"]) return `ch:${meta["companyNumber"]}`;
          return `name:${entity.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
        })();
        await contactCacheSet(stableKey, {
          name:              entity.name,
          email:             (updates["email"]       as string | undefined) ?? entity.email ?? undefined,
          phone:             (updates["phone"]       as string | undefined) ?? entity.phone ?? undefined,
          linkedinUrl:       (updates["linkedinUrl"] as string | undefined) ?? entity.linkedinUrl ?? undefined,
          contactConfidence: confidence,
          enrichmentSources: result.sources,
          enrichedAt:        new Date().toISOString(),
          emailConfidence:   result.emailConfidence,
          phoneConfidence:   result.phoneConfidence,
        });

        enriched++;
        logger.info({ entityId: entity.id, name: entity.name, confidence, queriesFired: result.queriesFired, pagesScraped: result.pagesScraped }, "Deep web OSINT enriched");
      } catch (err: any) {
        errors++;
        logger.warn({ entityId: entity.id, err: err.message }, "Deep web OSINT failed");
      }
    }

    await updateJob(jobId, {
      status: "done", progress: entities.length, total: entities.length,
      inserted: enriched, skipped, errors,
      message: `Done — ${enriched} enriched, ${skipped} no-match, ${errors} errors.`,
    });
    await setActiveJob("deep-web-osint", "");
    logger.info({ enriched, skipped, errors }, "Deep web OSINT complete");
  })().catch(async err => {
    logger.error({ err: err.message }, "Deep web OSINT crashed");
    await updateJob(jobId, { status: "failed", message: err.message ?? "Crashed" });
    await setActiveJob("deep-web-osint", "");
  });
});

// ── DELETE /ingest/deep-web-osint-lock ───────────────────────────────────────
router.delete("/ingest/deep-web-osint-lock", async (_req: Request, res: Response): Promise<void> => {
  const jobId = await getActiveJob("deep-web-osint");
  if (!jobId) { res.json({ cleared: false, message: "No active deep-web-osint lock." }); return; }
  await updateJob(jobId, { status: "failed", message: "Killed (server restart).", finishedAt: new Date().toISOString() } as any);
  await setActiveJob("deep-web-osint", "");
  res.json({ cleared: true, jobId, message: "Deep-web-OSINT lock cleared." });
});

// ── POST /ingest/compute-embeddings ──────────────────────────────────────────
router.post("/ingest/compute-embeddings", async (req: Request, res: Response): Promise<void> => {
  const { batchSize: _batchSize = 2000, force = false, offset: _offset = 0 } = req.body ?? {};
  const batchSize = Math.min(Math.max(Number(_batchSize) || 2000, 1), 50_000);
  const offset    = Math.max(Number(_offset) || 0, 0);

  const existing = await getActiveJob("compute-embeddings");
  if (existing && !force) {
    res.status(409).json({ error: "compute-embeddings already running", jobId: existing });
    return;
  }
  if (existing && force) {
    await updateJob(existing, { status: "failed", message: "Superseded by force restart.", finishedAt: new Date().toISOString() } as any);
    await setActiveJob("compute-embeddings", "");
  }

  const jobId = await createJob("compute-embeddings");
  await setActiveJob("compute-embeddings", jobId);
  await updateJob(jobId, { status: "running", message: "Loading semantic embedding model (all-MiniLM-L6-v2)…" });
  res.json({ jobId, message: "Semantic embedding computation started." });

  (async () => {
    const {
      embedText, entityToEmbedText, storeEmbedding, getEmbeddingCacheSize, getAllEmbeddings,
    } = await import("../lib/semantic-engine");

    const rows = await db.select({
      id: entitiesTable.id,
      name: entitiesTable.name,
      notes: entitiesTable.notes,
      nationality: entitiesTable.nationality,
      knownResidences: entitiesTable.knownResidences,
      metadata: entitiesTable.metadata,
    }).from(entitiesTable).offset(offset).limit(batchSize);

    const existingCache = getAllEmbeddings();
    const toEmbed = force ? rows : rows.filter(e => !existingCache.has(e.id));

    const total = toEmbed.length;
    await updateJob(jobId, { status: "running", total, progress: 0, message: `Embedding ${total} entities (${rows.length - total} already cached)…` });

    let processed = 0;
    let skipped = 0;
    const CHUNK = 10;
    for (let i = 0; i < toEmbed.length; i += CHUNK) {
      const chunk = toEmbed.slice(i, i + CHUNK);
      await Promise.all(chunk.map(async (e) => {
        try {
          const text = entityToEmbedText(e);
          const emb = await embedText(text);
          await storeEmbedding(e.id, emb);
          processed++;
        } catch {
          skipped++;
        }
      }));
      if (i % 200 === 0) {
        await updateJob(jobId, {
          progress: processed + skipped,
          total,
          inserted: processed,
          skipped,
          message: `Embedded ${processed}/${total} (cache: ${getEmbeddingCacheSize()})`,
        });
      }
    }

    await updateJob(jobId, {
      status: "done", progress: total, total,
      inserted: processed, skipped,
      message: `Done — ${processed} embeddings computed, ${skipped} skipped. Cache: ${getEmbeddingCacheSize()} total. Semantic search active.`,
      finishedAt: new Date().toISOString(),
    } as any);
    await setActiveJob("compute-embeddings", "");
    logger.info({ processed, skipped, total, cacheSize: getEmbeddingCacheSize() }, "Semantic embedding computation complete");
  })().catch(async (err: any) => {
    logger.error({ err: err?.message }, "Semantic embedding computation crashed");
    await updateJob(jobId, { status: "failed", message: err?.message ?? "Crashed", finishedAt: new Date().toISOString() } as any);
    await setActiveJob("compute-embeddings", "");
  });
});

// ── DELETE /ingest/compute-embeddings-lock ───────────────────────────────────
router.delete("/ingest/compute-embeddings-lock", async (_req: Request, res: Response): Promise<void> => {
  const jobId = await getActiveJob("compute-embeddings");
  if (!jobId) { res.json({ cleared: false, message: "No active compute-embeddings lock." }); return; }
  await updateJob(jobId, { status: "failed", message: "Killed (manual clear).", finishedAt: new Date().toISOString() } as any);
  await setActiveJob("compute-embeddings", "");
  res.json({ cleared: true, jobId, message: "compute-embeddings lock cleared." });
});

// ── GET /ingest/semantic-engine-status ───────────────────────────────────────
router.get("/ingest/semantic-engine-status", async (_req: Request, res: Response): Promise<void> => {
  try {
    const { getEmbeddingCacheSize, isModelLoaded } = await import("../lib/semantic-engine");
    res.json({
      cacheSize: getEmbeddingCacheSize(),
      modelLoaded: isModelLoaded(),
      semanticActive: getEmbeddingCacheSize() >= 100,
    });
  } catch {
    res.json({ cacheSize: 0, modelLoaded: false, semanticActive: false });
  }
});

// ── GET /ingest/jobs ──────────────────────────────────────────────────────────
const KNOWN_JOB_TYPES = [
  { id: "faa",                       label: "FAA Aircraft Registry",         category: "Registry" },
  { id: "land-registry",             label: "UK Land Registry PPD",           category: "Registry" },
  { id: "western-hnwi",              label: "Western HNWI Engine",            category: "Registry" },
  { id: "in-house-enrich",           label: "In-House OSINT Enricher",        category: "Enrichment" },
  { id: "deep-web-osint",            label: "Deep Web OSINT",                 category: "Enrichment" },
  { id: "occrp",                     label: "OCCRP Aleph Enricher",           category: "Enrichment" },
  { id: "opensky",                   label: "OpenSky Live Flights",           category: "Enrichment" },
  { id: "ch-company-officers",       label: "CH Company Officers",            category: "Enrichment" },
  { id: "web-osint-enrich",          label: "Web OSINT Enricher",             category: "Enrichment" },
  { id: "compute-embeddings",        label: "Semantic Embeddings",            category: "Analysis" },
  { id: "semantic-dedup",            label: "Semantic Entity Dedup",          category: "Analysis" },
  { id: "bulk-mcts",                 label: "Hybrid Research",                category: "Analysis" },
  { id: "auto-detect-clusters",      label: "Corporate Cluster Detection",    category: "Analysis" },
  { id: "auto-detect",               label: "Associate Edge Detection",       category: "Analysis" },
  { id: "sync-hot-flags",            label: "Sync Hot Flags",                 category: "Maintenance" },
  { id: "populate-notes",            label: "Populate Notes",                 category: "Maintenance" },
  { id: "backfill-net-worth",        label: "Net Worth Backfill",             category: "Maintenance" },
  { id: "reclassify-entity-types",   label: "Reclassify Entity Types",        category: "Maintenance" },
  { id: "wikidata-associates",       label: "Wikidata Associate Seeding",     category: "Maintenance" },
  { id: "edgar-associates",          label: "EDGAR Associate Seeding",        category: "Maintenance" },
];

router.get("/ingest/jobs", async (_req: Request, res: Response): Promise<void> => {
  try {
    const jobs = await Promise.all(
      KNOWN_JOB_TYPES.map(async (def) => {
        try {
          const activeJobId = await getActiveJob(def.id);
          const state = activeJobId ? await getJob(activeJobId) : null;
          return {
            ...def,
            jobId:      state?.jobId,
            status:     state?.status ?? "idle",
            progress:   state?.progress ?? 0,
            inserted:   state?.inserted ?? 0,
            skipped:    state?.skipped ?? 0,
            errors:     state?.errors ?? 0,
            message:    state?.message ?? "",
            startedAt:  state?.startedAt,
            finishedAt: state?.finishedAt,
          };
        } catch {
          return { ...def, status: "idle" as const, progress: 0, inserted: 0, skipped: 0, errors: 0, message: "" };
        }
      })
    );
    res.json({ jobs, generatedAt: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
