/**
 * Ingest/analysis monitoring routes.
 *
 * Deterministic deep-web enrichment was retired from this router: research
 * trajectory belongs to the canonical Atlas Investigator. The remaining
 * endpoints are lifecycle/status utilities and the optional semantic-cache job.
 */
import { Router, type Request, type Response } from "express";
import { db, entitiesTable } from "@workspace/db";
import { sql, eq, count } from "drizzle-orm";
import {
  createJob, updateJob, getJob, getActiveJob, getActiveJobs, setActiveJob, ownsActiveJob, clearActiveJobIfOwned,
} from "../lib/job-queue";
import { entityToEmbedText, embedText, storeEmbedding, getAllEmbeddings, getEmbeddingCacheSize, isModelLoaded } from "../lib/semantic-engine";
import { logger } from "../lib/logger";

const router = Router();
const KNOWN_JOB_TYPES = [
  { id: "faa", label: "FAA Aircraft Registry", category: "Registry" },
  { id: "land-registry", label: "UK Land Registry PPD", category: "Registry" },
  { id: "western-hnwi", label: "Western HNWI Engine", category: "Registry" },
  { id: "in-house-enrich", label: "In-House OSINT Enricher", category: "Enrichment" },
  { id: "deep-web-osint", label: "Deep Web OSINT (retired)", category: "Enrichment" },
  { id: "occrp", label: "OCCRP Aleph Enricher", category: "Enrichment" },
  { id: "opensky", label: "Live ADS-B (adsb.lol + OpenSky)", category: "Enrichment" },
  { id: "ch-company-officers", label: "CH Company Officers", category: "Enrichment" },
  { id: "web-osint-enrich", label: "Web OSINT Enricher", category: "Enrichment" },
  { id: "compute-embeddings", label: "Semantic Embeddings", category: "Analysis" },
  { id: "semantic-dedup", label: "Semantic Entity Dedup", category: "Analysis" },
  { id: "bulk-hybrid-research", label: "Hybrid Research", category: "Analysis" },
  { id: "auto-detect-clusters", label: "Corporate Cluster Detection", category: "Analysis" },
  { id: "auto-detect", label: "Associate Edge Detection", category: "Analysis" },
  { id: "sync-hot-flags", label: "Sync Hot Flags", category: "Maintenance" },
  { id: "populate-notes", label: "Populate Notes", category: "Maintenance" },
  { id: "backfill-net-worth", label: "Net Worth Backfill", category: "Maintenance" },
  { id: "reclassify-entity-types", label: "Reclassify Entity Types", category: "Maintenance" },
  { id: "wikidata-associates", label: "Wikidata Associate Seeding", category: "Maintenance" },
  { id: "edgar-associates", label: "EDGAR Associate Seeding", category: "Maintenance" },
];

router.get("/pipeline/status", async (_req: Request, res: Response): Promise<void> => {
  try {
    const [totalRow, hotRow, coldMctsRow, needsEnrichmentRow, zeroContactRow, sparseNotesRow, zeroRelRow] = await Promise.all([
      db.select({ count: count() }).from(entitiesTable),
      db.select({ count: count() }).from(entitiesTable).where(eq(entitiesTable.isHot, true)),
      db.execute(sql`SELECT COUNT(*)::int AS count FROM entities e WHERE e.is_hot = true AND e.id NOT IN (SELECT DISTINCT target_entity_id FROM research_sessions)`),
      db.select({ count: count() }).from(entitiesTable).where(sql`${entitiesTable.metadata}::text LIKE '%needsEnrichment%:true%'`),
      db.select({ count: count() }).from(entitiesTable).where(sql`${entitiesTable.contactConfidence} = 0 AND ${entitiesTable.type} IN ('HNWI', 'Gatekeeper')`),
      db.select({ count: count() }).from(entitiesTable).where(sql`${entitiesTable.notes} IS NULL OR length(${entitiesTable.notes}) < 50`),
      db.execute(sql`SELECT ((SELECT COUNT(*) FROM entities) - (SELECT COUNT(DISTINCT e_id) FROM (SELECT source_entity_id AS e_id FROM relationships UNION SELECT target_id AS e_id FROM relationships WHERE target_type = 'Entity') t))::int AS count`),
    ]);
    res.json({ totalEntities: Number(totalRow[0]?.count ?? 0), hotLeads: Number(hotRow[0]?.count ?? 0), coldMcts: Number((coldMctsRow.rows[0] as any)?.count ?? 0), needsEnrichment: Number(needsEnrichmentRow[0]?.count ?? 0), zeroContact: Number(zeroContactRow[0]?.count ?? 0), sparseNotes: Number(sparseNotesRow[0]?.count ?? 0), zeroRelationships: Number((zeroRelRow.rows[0] as any)?.count ?? 0) });
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to fetch pipeline status" }); }
});

const RETIRED_RESEARCH_MESSAGE = "Deep-web deterministic enrichment is retired. Use the canonical Atlas Investigator path; research strategy is model-owned.";
router.post("/ingest/deep-web-osint", (_req, res) => res.status(410).json({ error: "Retired endpoint", message: RETIRED_RESEARCH_MESSAGE }));
router.delete("/ingest/deep-web-osint-lock", (_req, res) => res.status(410).json({ error: "Retired endpoint", message: RETIRED_RESEARCH_MESSAGE }));
router.delete("/ingest/deep-web-osint-lock/:jobId", (_req, res) => res.status(410).json({ error: "Retired endpoint", message: RETIRED_RESEARCH_MESSAGE }));

router.post("/ingest/compute-embeddings", async (req: Request, res: Response): Promise<void> => {
  const body = req.body ?? {};
  const batchSize = Math.min(Math.max(Math.trunc(Number(body.batchSize)) || 2000, 1), 50_000);
  const offset = Math.min(Math.max(Math.trunc(Number(body.offset)) || 0, 0), 1_000_000);
  const force = body.force === true;
  const existing = await getActiveJob("compute-embeddings");
  if (existing && !force) { res.status(409).json({ error: "compute-embeddings already running", jobId: existing }); return; }
  if (existing && force) {
    await updateJob(existing, { status: "cancelled", message: "Superseded by force restart.", finishedAt: new Date().toISOString() });
    await clearActiveJobIfOwned("compute-embeddings", existing);
  }

  const jobId = await createJob("compute-embeddings");
  try {
    await setActiveJob("compute-embeddings", jobId);
    await updateJob(jobId, { status: "running", message: "Loading semantic embedding model (all-MiniLM-L6-v2)…" });
    await import("../lib/semantic-engine").then((m) => m.loadEmbeddingsFromRedis());
  } catch (err: any) {
    await clearActiveJobIfOwned("compute-embeddings", jobId).catch(() => false);
    await updateJob(jobId, { status: "failed", message: err?.message ?? "Could not claim embedding job" });
    res.status(503).json({ error: "Could not claim compute-embeddings job." });
    return;
  }
  res.status(202).json({ jobId, message: "Semantic embedding computation started." });

  void (async () => {
    try {
      const rows = await db.select({ id: entitiesTable.id, name: entitiesTable.name, notes: entitiesTable.notes, nationality: entitiesTable.nationality, knownResidences: entitiesTable.knownResidences, metadata: entitiesTable.metadata }).from(entitiesTable).offset(offset).limit(batchSize);
      const existingCache = getAllEmbeddings();
      const toEmbed = force ? rows : rows.filter((e) => !existingCache.has(e.id));
      await updateJob(jobId, { status: "running", total: toEmbed.length, progress: 0, message: `Embedding ${toEmbed.length} entities (${rows.length - toEmbed.length} already cached)…` });
      let processed = 0; let skipped = 0;
      const CHUNK = 10;
      for (let i = 0; i < toEmbed.length; i += CHUNK) {
        if (!(await ownsActiveJob("compute-embeddings", jobId))) throw new Error("compute-embeddings job ownership lost");
        const chunk = toEmbed.slice(i, i + CHUNK);
        await Promise.all(chunk.map(async (entity) => {
          try { await storeEmbedding(entity.id, await embedText(entityToEmbedText(entity))); processed++; }
          catch { skipped++; }
        }));
        if (i % 200 === 0 || i + CHUNK >= toEmbed.length) await updateJob(jobId, { progress: processed + skipped, inserted: processed, skipped, message: `Embedded ${processed}/${toEmbed.length} (cache: ${getEmbeddingCacheSize()})` });
      }
      if (!(await ownsActiveJob("compute-embeddings", jobId))) throw new Error("compute-embeddings job ownership lost before completion");
      await updateJob(jobId, { status: "done", progress: toEmbed.length, total: toEmbed.length, inserted: processed, skipped, finishedAt: new Date().toISOString(), message: `Done — ${processed} embeddings computed, ${skipped} skipped.` });
      await clearActiveJobIfOwned("compute-embeddings", jobId);
      logger.info({ processed, skipped, total: toEmbed.length }, "Semantic embedding computation complete");
    } catch (err: any) {
      await updateJob(jobId, { status: "failed", message: err?.message ?? "Crashed", finishedAt: new Date().toISOString() });
      await clearActiveJobIfOwned("compute-embeddings", jobId);
      logger.error({ err: err?.message }, "Semantic embedding computation failed");
    }
  })();
});

router.delete("/ingest/compute-embeddings-lock", async (_req: Request, res: Response): Promise<void> => {
  const jobId = await getActiveJob("compute-embeddings");
  if (!jobId) { res.json({ cleared: false, message: "No active compute-embeddings lock." }); return; }
  await updateJob(jobId, { status: "cancelled", message: "Cancelled by operator.", finishedAt: new Date().toISOString() });
  const cleared = await clearActiveJobIfOwned("compute-embeddings", jobId);
  res.json({ cleared, jobId, message: cleared ? "compute-embeddings job cancelled." : "Ownership changed; job was not cleared." });
});

router.get("/ingest/semantic-engine-status", async (_req: Request, res: Response): Promise<void> => {
  res.json({ cacheSize: getEmbeddingCacheSize(), modelLoaded: isModelLoaded(), semanticActive: getEmbeddingCacheSize() >= 100 });
});

router.get("/ingest/jobs", async (_req: Request, res: Response): Promise<void> => {
  try {
    const activeByType = await getActiveJobs(KNOWN_JOB_TYPES.map((def) => def.id));
    const jobs = await Promise.all(KNOWN_JOB_TYPES.map(async (def) => {
      const activeJobId = activeByType.get(def.id) ?? null;
      const state = activeJobId ? await getJob(activeJobId) : null;
      return { ...def, jobId: state?.jobId, status: state?.status ?? "idle", progress: state?.progress ?? 0, inserted: state?.inserted ?? 0, skipped: state?.skipped ?? 0, errors: state?.errors ?? 0, message: state?.message ?? "", startedAt: state?.startedAt, finishedAt: state?.finishedAt };
    }));
    res.json({ jobs, generatedAt: new Date().toISOString() });
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "Failed to list jobs" }); }
});

router.get("/pipeline/funnel", async (_req: Request, res: Response): Promise<void> => {
  try {
    const [outcomeRows, byTypeRows, byRegistryRows] = await Promise.all([
      db.execute(sql`SELECT COALESCE(contact_outcome, 'none') AS outcome, COUNT(*)::int AS count FROM entities GROUP BY contact_outcome ORDER BY count DESC`),
      db.execute(sql`SELECT type, COALESCE(contact_outcome, 'none') AS outcome, COUNT(*)::int AS count FROM entities GROUP BY type, contact_outcome ORDER BY type, count DESC`),
      db.execute(sql`SELECT CASE WHEN metadata::text LIKE '%"nNumber"%' THEN 'faa' WHEN metadata::text LIKE '%"formType"%' THEN 'edgar' WHEN metadata::text LIKE '%"orgnr"%' THEN 'brreg' WHEN metadata::text LIKE '%"titleNumber"%' THEN 'hmlr' WHEN metadata::text LIKE '%"companyNumber"%' THEN 'companies-house' ELSE 'other' END AS registry, COALESCE(contact_outcome, 'none') AS outcome, COUNT(*)::int AS count FROM entities GROUP BY registry, contact_outcome ORDER BY registry, count DESC`),
    ]);
    const outcomes: Record<string, number> = {}; for (const row of outcomeRows.rows as any[]) outcomes[row.outcome] = row.count;
    const byEntityType: Record<string, Record<string, number>> = {}; for (const row of byTypeRows.rows as any[]) { if (!byEntityType[row.type]) byEntityType[row.type] = {}; byEntityType[row.type][row.outcome] = row.count; }
    const byRegistry: Record<string, Record<string, number>> = {}; for (const row of byRegistryRows.rows as any[]) { if (!byRegistry[row.registry]) byRegistry[row.registry] = {}; byRegistry[row.registry][row.outcome] = row.count; }
    const total = Object.values(outcomes).reduce((s, n) => s + n, 0);
    res.json({ total, outcomes, byEntityType, byRegistry, phase: "J0", note: "Contact outcome is a measurement state; it is not a research completion signal." });
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "Funnel query failed" }); }
});

export default router;
