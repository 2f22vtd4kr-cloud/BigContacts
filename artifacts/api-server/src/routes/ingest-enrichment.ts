/**
 * Ingest Enrichment Routes
 *
 * Contact enrichment, OSINT, and data-quality backfill jobs.
 *
 * POST   /ingest/companies-house-enrich     — CH officer address lookup + confidence recompute
 * POST   /ingest/ch-company-officers        — CH company officer lists for Corporation entities
 * POST   /ingest/populate-notes             — Derive notes text from entity metadata
 * POST   /ingest/create-edgar-stock-assets  — Create StockHolding assets for EDGAR entities
 * POST   /ingest/web-osint-enrich           — Layer 1 web OSINT contact discovery
 * DELETE /ingest/web-osint-lock             — Clear ghost web-osint lock
 * POST   /ingest/in-house-enrich            — Layer 2 in-house OSINT enricher (7 free sources)
 * DELETE /ingest/in-house-enrich-lock       — Clear ghost in-house-enrich lock
 * POST   /ingest/recompute-contact-confidence — Recompute contactConfidence for all entities
 * POST   /ingest/sync-livesource-markers    — Backfill liveSource=true for live-registry entities
 * POST   /ingest/backfill-net-worth         — Set estimatedNetWorth = 3× asset value
 * POST   /ingest/backfill-edgar-net-worth   — EDGAR net worth from SEC sharesOwned × price
 * DELETE /ingest/dedup                      — Clear dedup set for re-ingest
 * POST   /ingest/hunter-enrich              — DEPRECATED stub (removed)
 * DELETE /ingest/hunter-enrich-lock         — Clear ghost hunter lock
 */

import { Router, type Request, type Response } from "express";
import { db, assetsTable, entitiesTable } from "@workspace/db";
import { sql, eq, and, desc, inArray, type SQL } from "drizzle-orm";
import {
  createJob, updateJob, getJob,
  setActiveJob, getActiveJob, clearDedup,
} from "../lib/job-queue";
import { runCompaniesHouseEnrichment } from "../lib/enrichment/structured-verification";
import { enrichEntityOsint } from "../lib/enrichment/web-discovery";
import { enrichInHouse } from "../lib/enrichment/contact-enrichment";
import { discoverSocialPresence } from "../lib/enrichment/social-discovery";
import { discoverMessengerPresence } from "../lib/enrichment/messenger-discovery";
import { discoverViaFoundationFilings } from "../lib/enrichment/foundation-filings";
import { runBroadDiscovery } from "../lib/enrichment/broad-discovery";
import { computeContactConfidence } from "../lib/contact-confidence";
import { contactCacheSet } from "../lib/redis";
import { logger } from "../lib/logger";

const router = Router();

function safeParseJson<T>(str: string | null | undefined, fallback: T): T {
  try { return str ? JSON.parse(str) as T : fallback; } catch { return fallback; }
}

// ── POST /ingest/companies-house-enrich ───────────────────────────────────────
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

// ── POST /ingest/ch-company-officers ─────────────────────────────────────────
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
      const { runCompanyOfficersEnrichment } = await import("../lib/registry-enricher");
      const result = await runCompanyOfficersEnrichment({ jobId, batchSize });
      await updateJob(jobId, {
        status: "done", progress: 100, inserted: result.enriched,
        message: `Done — ${result.enriched} corps enriched with officer data, ${result.skipped} skipped.`,
      });
    } catch (err: any) {
      await updateJob(jobId, { status: "failed", message: err.message ?? "Unknown error" });
    }
  })();

  res.status(202).json({ jobId, message: "CH company officers job started.", pollUrl: `/api/ingest/job/${jobId}` });
});

// ── POST /ingest/populate-notes ───────────────────────────────────────────────
router.post("/ingest/populate-notes", async (_req: Request, res: Response): Promise<void> => {
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

    for (const u of updates) {
      await db.update(entitiesTable).set({ notes: u.notes }).where(eq(entitiesTable.id, u.id));
    }
    updated += updates.length;
  }

  res.json({ updated, total, message: `Notes enriched for ${updated} entities.` });
});

// ── POST /ingest/create-edgar-stock-assets ────────────────────────────────────
router.post("/ingest/create-edgar-stock-assets", async (_req: Request, res: Response): Promise<void> => {
  const edgarEntities = await db
    .select({ id: entitiesTable.id, name: entitiesTable.name, metadata: entitiesTable.metadata, knownResidences: entitiesTable.knownResidences })
    .from(entitiesTable)
    .where(sql`${entitiesTable.metadata} LIKE '%sec-edgar%' AND ${entitiesTable.metadata} NOT LIKE '%sec-edgar-def14a%'`);

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

// ── POST /ingest/web-osint-enrich ─────────────────────────────────────────────
router.post("/ingest/web-osint-enrich", async (req: Request, res: Response): Promise<void> => {
  const existing = await getActiveJob("web-osint");
  if (existing) {
    res.status(409).json({ error: "A web OSINT enrichment job is already running.", jobId: existing });
    return;
  }

  const batchSize  = Math.min(parseInt((req.body as any)?.batchSize ?? "100", 10), 500);
  const entityType = (req.body as any)?.entityType as string | undefined;
  const force      = Boolean((req.body as any)?.force);

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

  (async () => {
    let enriched = 0;
    let skipped  = 0;
    let errors   = 0;

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      try {
        await updateJob(jobId, {
          progress: i, total: entities.length,
          inserted: enriched, skipped, errors,
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
            ...(result.email       ? { email: result.email }             : {}),
            ...(result.phone       ? { phone: result.phone }             : {}),
            ...(result.linkedinUrl ? { linkedinUrl: result.linkedinUrl } : {}),
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
      progress: entities.length, total: entities.length,
      inserted: enriched, skipped, errors,
      status: "done",
      message: `Done — ${enriched} entities enriched, ${skipped} no-match, ${errors} errors.`,
    });
    await setActiveJob("web-osint", "");
    logger.info({ enriched, skipped, errors }, "Web OSINT enrichment complete");
  })().catch(err => logger.error({ err: err.message }, "Web OSINT enrichment crashed"));
});

// ── DELETE /ingest/web-osint-lock ─────────────────────────────────────────────
router.delete("/ingest/web-osint-lock", async (_req: Request, res: Response): Promise<void> => {
  const jobId = await getActiveJob("web-osint");
  if (!jobId) { res.json({ cleared: false, message: "No active web-osint lock found." }); return; }
  await updateJob(jobId, {
    status: "failed",
    message: "Process was killed (server restart). Clear the lock and restart.",
    finishedAt: new Date().toISOString(),
  } as any);
  await setActiveJob("web-osint", "");
  res.json({ cleared: true, jobId, message: "Web-OSINT lock cleared. You can now restart the enrichment." });
});

// ── POST /ingest/in-house-enrich ──────────────────────────────────────────────
router.post("/ingest/in-house-enrich", async (req: Request, res: Response): Promise<void> => {
  const existing = await getActiveJob("in-house-enrich");
  if (existing) {
    res.status(409).json({ error: "An in-house enrichment job is already running.", jobId: existing });
    return;
  }

  const body = req.body ?? {};
  const batchSize = Math.min(Number(body.batchSize) || 100, 10_000);
  const force = Boolean(body.force);
  const entityIds: number[] | undefined = Array.isArray(body.entityIds) ? body.entityIds : undefined;
  const targetMode: string = (body.targetMode as string) ?? "all";

  const conditions: SQL[] = [
    sql`${entitiesTable.type} IN ('HNWI', 'Gatekeeper', 'Corporation')`,
  ];
  if (!force) conditions.push(sql`${entitiesTable.contactConfidence} < 40`);
  if (entityIds?.length) conditions.push(inArray(entitiesTable.id, entityIds));
  if (targetMode === "edgar") {
    conditions.push(sql`${entitiesTable.metadata}::text LIKE '%westernIngest%'`);
  } else if (targetMode === "faa") {
    conditions.push(sql`${entitiesTable.metadata}::text NOT LIKE '%westernIngest%'`);
  }
  if (!force) conditions.push(sql`${entitiesTable.metadata}::text NOT LIKE '%enricherVersion%'`);

  const entities = await db
    .select({
      id: entitiesTable.id, name: entitiesTable.name, type: entitiesTable.type,
      nationality: entitiesTable.nationality,
      sourceRegistries: entitiesTable.sourceRegistries,
      knownResidences: entitiesTable.knownResidences,
      metadata: entitiesTable.metadata,
      notes: entitiesTable.notes,
      email: entitiesTable.email,
      phone: entitiesTable.phone,
      linkedinUrl: entitiesTable.linkedinUrl,
    })
    .from(entitiesTable)
    .where(and(...conditions))
    .orderBy(desc(entitiesTable.bayesianScore))
    .limit(batchSize);

  if (!entities.length) {
    res.json({ message: "No entities need in-house enrichment.", jobId: null });
    return;
  }

  const jobId = await createJob("in-house-enrich");
  await setActiveJob("in-house-enrich", jobId);
  await updateJob(jobId, { status: "running", total: entities.length, message: "In-house OSINT enrichment starting…" });

  res.json({
    jobId, total: entities.length,
    message: `In-house OSINT enrichment started for ${entities.length} entities.`,
  });

  (async () => {
    let enriched = 0, skipped = 0, errors = 0;
    const globalSourceHits: Record<string, number> = {};
    const CONCURRENCY = 5;

    const processEntity = async (entity: typeof entities[number]): Promise<"enriched" | "skipped" | "error"> => {
      try {
        const entityMeta = safeParseJson<Record<string, unknown>>(entity.metadata, {});
        const enrichInput = {
          ...entity,
          bizLocation: (entityMeta["bizLocation"] as string | null) ?? null,
          entityName:  (entityMeta["entityName"] as string | null) ?? null,
        };
        const result = await enrichInHouse(enrichInput);
        const hasSignal = result.email || result.linkedinUrl || result.phone || result.website || result.twitter || result.address;
        if (!hasSignal) return "skipped";

        for (const [src, hit] of Object.entries(result.sourceHits)) {
          if (hit) globalSourceHits[src] = (globalSourceHits[src] ?? 0) + 1;
        }

        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (result.email && !entity.email) updates["email"] = result.email;
        if (result.linkedinUrl && !entity.linkedinUrl) updates["linkedinUrl"] = result.linkedinUrl;
        if (result.phone && !entity.phone) updates["phone"] = result.phone;

        const confidence = computeContactConfidence({
          email:           (updates["email"] as string | null) ?? entity.email ?? null,
          phone:           (updates["phone"] as string | null) ?? entity.phone ?? null,
          linkedinUrl:     (updates["linkedinUrl"] as string | null) ?? entity.linkedinUrl ?? null,
          knownResidences: entity.knownResidences,
        });
        updates["contactConfidence"] = confidence;

        const meta = safeParseJson<Record<string, unknown>>(entity.metadata, {});
        if (result.website && !meta["website"]) meta["website"] = result.website;
        if (result.twitter && !meta["twitter"]) meta["twitter"] = result.twitter;
        if (result.address && !meta["bizLocation"]) meta["bizLocation"] = result.address;
        meta["enrichmentSources"] = [
          ...(Array.isArray(meta["enrichmentSources"]) ? meta["enrichmentSources"] as string[] : []),
          ...result.sources.filter(s => !(meta["enrichmentSources"] as string[] | undefined)?.includes(s)),
        ];
        meta["enrichedAt"]      = new Date().toISOString();
        meta["emailConfidence"] = result.emailConfidence;
        meta["phoneConfidence"] = result.phoneConfidence;
        meta["sourceHits"]      = { ...(meta["sourceHits"] as object ?? {}), ...result.sourceHits };
        meta["enricherVersion"] = "v2";
        meta["needsEnrichment"] = false;
        updates["metadata"]     = JSON.stringify(meta);
        updates["liveSource"]   = true;

        await db.update(entitiesTable)
          .set(updates as any)
          .where(eq(entitiesTable.id, entity.id));

        const stableKey = (() => {
          if (meta["nNumber"])       return `faa:${meta["nNumber"]}`;
          if (meta["entityName"])    return `edgar:${String(meta["entityName"]).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
          if (meta["orgnr"])         return `brreg:${meta["orgnr"]}`;
          if (meta["companyNumber"]) return `ch:${meta["companyNumber"]}`;
          return `name:${entity.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
        })();
        await contactCacheSet(stableKey, {
          name:               entity.name,
          email:              (updates["email"] as string | null | undefined) ?? entity.email ?? undefined,
          phone:              (updates["phone"] as string | null | undefined) ?? entity.phone ?? undefined,
          linkedinUrl:        (updates["linkedinUrl"] as string | null | undefined) ?? entity.linkedinUrl ?? undefined,
          website:            result.website ?? undefined,
          twitter:            result.twitter ?? undefined,
          contactConfidence:  confidence,
          enrichmentSources:  meta["enrichmentSources"] as string[] ?? result.sources,
          enrichedAt:         new Date().toISOString(),
          emailConfidence:    result.emailConfidence ?? undefined,
          phoneConfidence:    result.phoneConfidence ?? undefined,
          sourceHits:         result.sourceHits as Record<string, number> ?? undefined,
        });

        logger.info({ entityId: entity.id, name: entity.name, confidence, sources: result.sources }, "In-house OSINT v2 enriched");
        return "enriched";
      } catch (err: any) {
        logger.warn({ entityId: entity.id, err: err.message }, "In-house enrichment failed");
        return "error";
      }
    };

    for (let i = 0; i < entities.length; i += CONCURRENCY) {
      const batch = entities.slice(i, i + CONCURRENCY);
      const outcomes = await Promise.allSettled(batch.map(e => processEntity(e)));
      for (const o of outcomes) {
        const outcome = o.status === "fulfilled" ? o.value : "error";
        if (outcome === "enriched")      enriched++;
        else if (outcome === "skipped")  skipped++;
        else                             errors++;
      }
      await updateJob(jobId, {
        status: "running",
        progress: enriched + skipped + errors,
        total: entities.length,
        inserted: enriched,
        message: `In-house OSINT v2: ${enriched} enriched, ${skipped} no-match, ${errors} errors | Sources: ${JSON.stringify(globalSourceHits)}`,
      });
    }

    logger.info({ globalSourceHits }, "In-house OSINT v2 source hit breakdown");

    await updateJob(jobId, {
      status: "done", progress: entities.length, total: entities.length,
      inserted: enriched,
      message: `Done — ${enriched} entities enriched, ${skipped} no-match, ${errors} errors.`,
    });
    await setActiveJob("in-house-enrich", "");
    logger.info({ enriched, skipped, errors }, "In-house OSINT enrichment complete");
  })().catch(async err => {
    logger.error({ err: err.message }, "In-house enrichment crashed");
    await updateJob(jobId, { status: "failed", message: err.message ?? "Crashed" });
    await setActiveJob("in-house-enrich", "");
  });
});

// ── DELETE /ingest/in-house-enrich-lock ──────────────────────────────────────
router.delete("/ingest/in-house-enrich-lock", async (_req: Request, res: Response): Promise<void> => {
  const jobId = await getActiveJob("in-house-enrich");
  if (!jobId) { res.json({ cleared: false, message: "No active lock." }); return; }
  await updateJob(jobId, { status: "failed", message: "Lock cleared manually.", finishedAt: new Date().toISOString() } as any);
  await setActiveJob("in-house-enrich", "");
  res.json({ cleared: true, jobId, message: "In-house-enrich lock cleared." });
});

// ── POST /ingest/recompute-contact-confidence ─────────────────────────────────
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
        email: e.email, phone: e.phone,
        linkedinUrl: e.linkedinUrl, knownResidences: e.knownResidences,
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

// ── POST /ingest/sync-livesource-markers ──────────────────────────────────────
router.post("/ingest/sync-livesource-markers", async (_req: Request, res: Response): Promise<void> => {
  const LIVE_REGISTRY_PATTERNS = ["faa", "land registry", "hmlr", "sec edgar", "companies house", "brreg"];

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

// ── POST /ingest/backfill-net-worth ───────────────────────────────────────────
router.post("/ingest/backfill-net-worth", async (_req: Request, res: Response): Promise<void> => {
  try {
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
        const estimatedNetWorth = Math.round(totalValue * 3);
        await db.update(entitiesTable)
          .set({ estimatedNetWorth, updatedAt: new Date() })
          .where(eq(entitiesTable.id, Number(row.id)));
        updated++;
      }
    }

    res.json({
      updated, total: rows.length,
      message: `Net worth backfilled: ${updated} entities updated (3× registered asset value as floor).`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Backfill failed" });
  }
});

// ── POST /ingest/backfill-edgar-net-worth ─────────────────────────────────────
router.post("/ingest/backfill-edgar-net-worth", async (_req: Request, res: Response): Promise<void> => {
  try {
    const candidates = await db
      .select({ id: entitiesTable.id, name: entitiesTable.name, metadata: entitiesTable.metadata })
      .from(entitiesTable)
      .where(sql`${entitiesTable.estimatedNetWorth} IS NULL
        AND ${entitiesTable.metadata}::text LIKE '%sec-edgar%'
        AND ${entitiesTable.metadata}::text LIKE '%sharesOwned%'
        AND ${entitiesTable.metadata}::text LIKE '%ticker%'`);

    if (candidates.length === 0) {
      res.json({ updated: 0, errors: 0, message: "No EDGAR entities with sharesOwned+ticker found." });
      return;
    }

    let updated = 0;
    let errors = 0;
    const priceCache = new Map<string, number>();

    for (const entity of candidates) {
      try {
        let meta: Record<string, any> = {};
        try { meta = JSON.parse(entity.metadata ?? "{}"); } catch {}
        const sharesOwned = Number(meta.sharesOwned ?? 0);
        const ticker = (meta.ticker as string | undefined)?.trim().toUpperCase();
        if (!sharesOwned || !ticker) continue;

        let price = priceCache.get(ticker);
        if (!price) {
          try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d`;
            const r = await fetch(url, { signal: AbortSignal.timeout(8_000), headers: { "User-Agent": "Mozilla/5.0" } });
            if (r.ok) {
              const d = await r.json() as any;
              const closes: number[] = d?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
              const lastClose = closes.filter(Boolean).at(-1);
              if (lastClose && lastClose > 0) { price = lastClose; priceCache.set(ticker, price); }
            }
          } catch { /* ignore */ }
        }
        if (!price) continue;

        const estimatedNetWorth = Math.round(sharesOwned * price);
        if (estimatedNetWorth <= 0) continue;
        await db.update(entitiesTable).set({ estimatedNetWorth, updatedAt: new Date() }).where(eq(entitiesTable.id, entity.id));
        updated++;
      } catch { errors++; }
    }

    res.json({
      updated, errors, candidates: candidates.length,
      message: `EDGAR net worth backfill: ${updated}/${candidates.length} entities updated (${errors} errors). Uses Yahoo Finance closing price × sharesOwned.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "EDGAR net worth backfill failed" });
  }
});

// ── DELETE /ingest/dedup ──────────────────────────────────────────────────────
router.delete("/ingest/dedup", async (_req, res): Promise<void> => {
  await clearDedup();
  res.json({ status: "ok", message: "Dedup set cleared. Next ingestion will re-insert all records." });
});

// ── POST /ingest/hunter-enrich — DEPRECATED ───────────────────────────────────
router.post("/ingest/hunter-enrich", async (_req: Request, res: Response): Promise<void> => {
  res.status(410).json({
    error: "Hunter.io/Apollo enrichment removed. Use POST /api/ingest/in-house-enrich instead — free, no API keys required.",
    replacement: "/api/ingest/in-house-enrich",
  });
});

// ── DELETE /ingest/hunter-enrich-lock ─────────────────────────────────────────
router.delete("/ingest/hunter-enrich-lock", async (_req: Request, res: Response): Promise<void> => {
  const jobId = await getActiveJob("hunter-enrich");
  if (!jobId) { res.json({ cleared: false, message: "No active hunter-enrich lock." }); return; }
  await updateJob(jobId, { status: "failed", message: "Process killed (server restart).", finishedAt: new Date().toISOString() } as any);
  await setActiveJob("hunter-enrich", "");
  res.json({ cleared: true, jobId });
});

// ── POST /ingest/social-discovery (H3-A) ──────────────────────────────────────
// Discovers LinkedIn URL, Twitter handle, Instagram handle, personal website via
// DuckDuckGo HTML search + Nitter. No API key required.
router.post("/ingest/social-discovery", async (req: Request, res: Response): Promise<void> => {
  const { batchSize = 200, hotOnly = false, onlyMissingContact = false, force = false, entityIds } = req.body ?? {};
  const existing = await getActiveJob("social-discovery");
  if (existing) { res.json({ jobId: existing, status: "already_running" }); return; }
  const jobId = await createJob("social-discovery", { batchSize, hotOnly, onlyMissingContact });
  await setActiveJob("social-discovery", jobId);
  res.json({ jobId });

  (async () => {
    try {
      let processed = 0; let enriched = 0;
      const safeIds: number[] | undefined = Array.isArray(entityIds) ? entityIds.map(Number) : undefined;

      // Build query conditions
      const conditions = [sql`${entitiesTable.type} IN ('HNWI', 'Gatekeeper')`];
      if (hotOnly) conditions.push(sql`${entitiesTable.isHot} = true`);
      if (onlyMissingContact && !force) conditions.push(sql`${entitiesTable.linkedinUrl} IS NULL AND ${entitiesTable.twitterHandle} IS NULL AND ${entitiesTable.instagramHandle} IS NULL`);
      if (safeIds?.length) conditions.push(inArray(entitiesTable.id, safeIds));

      const rows = await db.select({
        id: entitiesTable.id, name: entitiesTable.name,
        type: entitiesTable.type, sourceRegistries: entitiesTable.sourceRegistries,
        email: entitiesTable.email, phone: entitiesTable.phone,
        linkedinUrl: entitiesTable.linkedinUrl,
        twitterHandle: entitiesTable.twitterHandle,
        instagramHandle: entitiesTable.instagramHandle,
        telegramHandle: entitiesTable.telegramHandle,
        knownResidences: entitiesTable.knownResidences,
      }).from(entitiesTable).where(and(...conditions as [SQL, ...SQL[]])).limit(Number(batchSize));

      await updateJob(jobId, { status: "running", message: `Social discovery: 0/${rows.length} processed`, progress: 0, total: rows.length } as any);

      for (const row of rows) {
        // Skip only if ALL social fields are already populated (not just LinkedIn)
        if (!force && row.linkedinUrl && row.twitterHandle && row.instagramHandle) { processed++; continue; }
        try {
          const result = await discoverSocialPresence({ name: row.name, type: row.type });
          if (result.confidence > 0) {
            const update: Record<string, any> = {};
            if (result.linkedinUrl)      update.linkedinUrl      = result.linkedinUrl;
            if (result.linkedinHeadline) update.linkedinHeadline = result.linkedinHeadline;
            if (result.twitterHandle)    update.twitterHandle    = result.twitterHandle;
            if (result.twitterBio)       update.twitterBio       = result.twitterBio;
            if (result.instagramHandle)  update.instagramHandle  = result.instagramHandle;
            if (result.personalWebsite)  update.personalWebsite  = result.personalWebsite;
            if (Object.keys(update).length) {
              // Recompute contactConfidence with newly discovered social signals
              update.contactConfidence = computeContactConfidence({
                email: row.email, phone: row.phone,
                linkedinUrl: result.linkedinUrl ?? row.linkedinUrl,
                twitterHandle: result.twitterHandle ?? row.twitterHandle,
                instagramHandle: result.instagramHandle ?? row.instagramHandle,
                telegramHandle: row.telegramHandle,
                knownResidences: row.knownResidences,
              });
              await db.update(entitiesTable).set(update).where(eq(entitiesTable.id, row.id));
              // Mirror to Redis contact cache
              const stableKey = (() => { try { return JSON.parse(row.sourceRegistries ?? "[]")[0] ?? `name:${row.name}`; } catch { return `name:${row.name}`; } })();
              await contactCacheSet(stableKey, {
                name: row.name, linkedinUrl: result.linkedinUrl,
                linkedinHeadline: result.linkedinHeadline,
                twitterHandle: result.twitterHandle, twitterBio: result.twitterBio,
                instagramHandle: result.instagramHandle, personalWebsite: result.personalWebsite,
                contactConfidence: update.contactConfidence, // recomputed from all signals, not module-internal score
                enrichmentSources: result.sources,
                enrichedAt: new Date().toISOString(),
              } as any);
              enriched++;
            }
          }
        } catch (err: any) { logger.warn({ err: err?.message, name: row.name }, "social-discovery entity error"); }
        processed++;
        if (processed % 10 === 0) await updateJob(jobId, { message: `Social discovery: ${processed}/${rows.length} processed, ${enriched} enriched`, progress: processed, total: rows.length } as any);
        // Polite delay between entities
        await new Promise(r => setTimeout(r, 3_500));
      }

      await updateJob(jobId, { status: "completed", message: `Social discovery complete: ${enriched}/${rows.length} entities enriched`, progress: rows.length, total: rows.length, finishedAt: new Date().toISOString() } as any);
    } catch (err: any) {
      await updateJob(jobId, { status: "failed", message: err?.message ?? "Unknown error", finishedAt: new Date().toISOString() } as any);
    } finally {
      await setActiveJob("social-discovery", "");
    }
  })();
});

// ── DELETE /ingest/social-discovery-lock ──────────────────────────────────────
router.delete("/ingest/social-discovery-lock", async (_req: Request, res: Response): Promise<void> => {
  const jobId = await getActiveJob("social-discovery");
  if (!jobId) { res.json({ cleared: false, message: "No active social-discovery lock." }); return; }
  await updateJob(jobId, { status: "failed", message: "Process killed (server restart).", finishedAt: new Date().toISOString() } as any);
  await setActiveJob("social-discovery", "");
  res.json({ cleared: true, jobId });
});

// ── POST /ingest/messenger-discovery (H3-B) ───────────────────────────────────
// Finds Telegram handles via t.me public username lookup.
// Most valuable for Russian/CIS HNWIs who use Telegram as primary messenger.
router.post("/ingest/messenger-discovery", async (req: Request, res: Response): Promise<void> => {
  const { batchSize = 100, hotOnly = false, onlyMissingContact = false, force = false, entityIds } = req.body ?? {};
  const existing = await getActiveJob("messenger-discovery");
  if (existing) { res.json({ jobId: existing, status: "already_running" }); return; }
  const jobId = await createJob("messenger-discovery", { batchSize, hotOnly });
  await setActiveJob("messenger-discovery", jobId);
  res.json({ jobId });

  (async () => {
    try {
      let processed = 0; let enriched = 0;
      const safeIds: number[] | undefined = Array.isArray(entityIds) ? entityIds.map(Number) : undefined;

      const conditions = [sql`${entitiesTable.type} IN ('HNWI', 'Gatekeeper')`];
      if (hotOnly) conditions.push(sql`${entitiesTable.isHot} = true`);
      if (onlyMissingContact && !force) conditions.push(sql`${entitiesTable.telegramHandle} IS NULL`);
      if (safeIds?.length) conditions.push(inArray(entitiesTable.id, safeIds));

      const rows = await db.select({
        id: entitiesTable.id, name: entitiesTable.name,
        type: entitiesTable.type, sourceRegistries: entitiesTable.sourceRegistries,
        email: entitiesTable.email, phone: entitiesTable.phone,
        linkedinUrl: entitiesTable.linkedinUrl,
        twitterHandle: entitiesTable.twitterHandle,
        instagramHandle: entitiesTable.instagramHandle,
        telegramHandle: entitiesTable.telegramHandle,
        knownResidences: entitiesTable.knownResidences,
      }).from(entitiesTable).where(and(...conditions as [SQL, ...SQL[]])).limit(Number(batchSize));

      await updateJob(jobId, { status: "running", message: `Messenger discovery: 0/${rows.length} processing`, progress: 0, total: rows.length } as any);

      for (const row of rows) {
        if (!force && row.telegramHandle) { processed++; continue; }
        try {
          const result = await discoverMessengerPresence({ name: row.name, type: row.type });
          if (result.telegramHandle) {
            // Recompute contactConfidence with newly found Telegram signal
            const newConfidence = computeContactConfidence({
              email: row.email, phone: row.phone,
              linkedinUrl: row.linkedinUrl, twitterHandle: row.twitterHandle,
              instagramHandle: row.instagramHandle,
              telegramHandle: result.telegramHandle,
              knownResidences: row.knownResidences,
            });
            await db.update(entitiesTable).set({
              telegramHandle:    result.telegramHandle,
              telegramBio:       result.telegramBio,
              contactConfidence: newConfidence,
            }).where(eq(entitiesTable.id, row.id));
            const stableKey = (() => { try { return JSON.parse(row.sourceRegistries ?? "[]")[0] ?? `name:${row.name}`; } catch { return `name:${row.name}`; } })();
            await contactCacheSet(stableKey, {
              name: row.name, telegramHandle: result.telegramHandle, telegramBio: result.telegramBio,
              contactConfidence: newConfidence, // recomputed from all signals, not module-internal score
              enrichmentSources: result.sources,
              enrichedAt: new Date().toISOString(),
            } as any);
            enriched++;
          }
        } catch (err: any) { logger.warn({ err: err?.message, name: row.name }, "messenger-discovery entity error"); }
        processed++;
        if (processed % 10 === 0) await updateJob(jobId, { message: `Messenger discovery: ${processed}/${rows.length} processed, ${enriched} found`, progress: processed, total: rows.length } as any);
        await new Promise(r => setTimeout(r, 1_000));
      }

      await updateJob(jobId, { status: "completed", message: `Messenger discovery complete: ${enriched}/${rows.length} Telegram handles found`, progress: rows.length, total: rows.length, finishedAt: new Date().toISOString() } as any);
    } catch (err: any) {
      await updateJob(jobId, { status: "failed", message: err?.message ?? "Unknown error", finishedAt: new Date().toISOString() } as any);
    } finally {
      await setActiveJob("messenger-discovery", "");
    }
  })();
});

// ── DELETE /ingest/messenger-discovery-lock ───────────────────────────────────
router.delete("/ingest/messenger-discovery-lock", async (_req: Request, res: Response): Promise<void> => {
  const jobId = await getActiveJob("messenger-discovery");
  if (!jobId) { res.json({ cleared: false, message: "No active messenger-discovery lock." }); return; }
  await updateJob(jobId, { status: "failed", message: "Process killed (server restart).", finishedAt: new Date().toISOString() } as any);
  await setActiveJob("messenger-discovery", "");
  res.json({ cleared: true, jobId });
});

// ── POST /ingest/foundation-filings (H3-C) ────────────────────────────────────
// IRS 990 filings via ProPublica Nonprofit Explorer API (free, no auth).
// Finds HNWIs listed as trustees/officers of private foundations.
router.post("/ingest/foundation-filings", async (req: Request, res: Response): Promise<void> => {
  const { batchSize = 200, force = false, entityIds } = req.body ?? {};
  const existing = await getActiveJob("foundation-filings");
  if (existing) { res.json({ jobId: existing, status: "already_running" }); return; }
  const jobId = await createJob("foundation-filings", { batchSize });
  await setActiveJob("foundation-filings", jobId);
  res.json({ jobId });

  (async () => {
    try {
      let processed = 0; let enriched = 0;
      const safeIds: number[] | undefined = Array.isArray(entityIds) ? entityIds.map(Number) : undefined;

      const conditions = [sql`${entitiesTable.type} IN ('HNWI', 'Gatekeeper')`];
      if (!force) conditions.push(sql`${entitiesTable.foundationName} IS NULL`);
      if (safeIds?.length) conditions.push(inArray(entitiesTable.id, safeIds));

      const rows = await db.select({
        id: entitiesTable.id, name: entitiesTable.name,
        type: entitiesTable.type, sourceRegistries: entitiesTable.sourceRegistries,
        email: entitiesTable.email, phone: entitiesTable.phone,
        linkedinUrl: entitiesTable.linkedinUrl,
        twitterHandle: entitiesTable.twitterHandle,
        instagramHandle: entitiesTable.instagramHandle,
        telegramHandle: entitiesTable.telegramHandle,
        knownResidences: entitiesTable.knownResidences,
      }).from(entitiesTable).where(and(...conditions as [SQL, ...SQL[]])).limit(Number(batchSize));

      await updateJob(jobId, { status: "running", message: `Foundation filings: 0/${rows.length} processing`, progress: 0, total: rows.length } as any);

      for (const row of rows) {
        try {
          const result = await discoverViaFoundationFilings({ name: row.name, type: row.type });
          if (result.foundationName) {
            const update: Record<string, any> = { foundationName: result.foundationName };
            // Only fill email if entity has none
            if (result.email && !row.email) update.email = result.email;
            // Persist address into knownResidences JSON array (was previously dropped)
            if (result.address) {
              const existing: string[] = (() => { try { const r = JSON.parse(row.knownResidences ?? "[]"); return Array.isArray(r) ? r : [String(r)]; } catch { return []; } })();
              if (!existing.some(r => r === result.address)) {
                update.knownResidences = JSON.stringify([...existing, result.address]);
              }
            }
            // Recompute contactConfidence — foundation may have added an email or address
            update.contactConfidence = computeContactConfidence({
              email: update.email ?? row.email,
              phone: row.phone,
              linkedinUrl: row.linkedinUrl,
              twitterHandle: row.twitterHandle,
              instagramHandle: row.instagramHandle,
              telegramHandle: row.telegramHandle,
              knownResidences: update.knownResidences ?? row.knownResidences,
            });
            await db.update(entitiesTable).set(update).where(eq(entitiesTable.id, row.id));
            const stableKey = (() => { try { return JSON.parse(row.sourceRegistries ?? "[]")[0] ?? `name:${row.name}`; } catch { return `name:${row.name}`; } })();
            await contactCacheSet(stableKey, {
              name: row.name, email: result.email ?? undefined,
              foundationName: result.foundationName,
              contactConfidence: update.contactConfidence, // recomputed from all signals
              enrichmentSources: result.sources,
              enrichedAt: new Date().toISOString(),
            } as any);
            enriched++;
          }
        } catch (err: any) { logger.warn({ err: err?.message, name: row.name }, "foundation-filings entity error"); }
        processed++;
        if (processed % 10 === 0) await updateJob(jobId, { message: `Foundation filings: ${processed}/${rows.length} processed, ${enriched} found`, progress: processed, total: rows.length } as any);
        await new Promise(r => setTimeout(r, 600));
      }

      await updateJob(jobId, { status: "completed", message: `Foundation filings complete: ${enriched}/${rows.length} foundations found`, progress: rows.length, total: rows.length, finishedAt: new Date().toISOString() } as any);
    } catch (err: any) {
      await updateJob(jobId, { status: "failed", message: err?.message ?? "Unknown error", finishedAt: new Date().toISOString() } as any);
    } finally {
      await setActiveJob("foundation-filings", "");
    }
  })();
});

// ── DELETE /ingest/foundation-filings-lock ────────────────────────────────────
router.delete("/ingest/foundation-filings-lock", async (_req: Request, res: Response): Promise<void> => {
  const jobId = await getActiveJob("foundation-filings");
  if (!jobId) { res.json({ cleared: false, message: "No active foundation-filings lock." }); return; }
  await updateJob(jobId, { status: "failed", message: "Process killed (server restart).", finishedAt: new Date().toISOString() } as any);
  await setActiveJob("foundation-filings", "");
  res.json({ cleared: true, jobId });
});

// ── POST /ingest/broad-discovery ──────────────────────────────────────────────
// Discovers NEW HNWIs from the open web without requiring existing entity IDs.
// Fires broad DuckDuckGo queries across 5 HNWI-signal categories and creates
// new entity rows from extracted names. Template rotation tracked in Redis.
router.post("/ingest/broad-discovery", async (req: Request, res: Response): Promise<void> => {
  const { templateSet, rotateTemplates = true, maxQueries = 10 } = req.body ?? {};
  const existing = await getActiveJob("broad-discovery");
  if (existing) { res.json({ jobId: existing, status: "already_running" }); return; }
  const jobId = await createJob("broad-discovery", { templateSet, rotateTemplates, maxQueries });
  await setActiveJob("broad-discovery", jobId);
  res.json({ jobId });

  (async () => {
    try {
      await updateJob(jobId, { status: "running", message: "Broad discovery: querying open web…" } as any);
      const result = await runBroadDiscovery({ templateSet, rotateTemplates, maxQueries });
      await updateJob(jobId, {
        status: "completed",
        message: `Broad discovery complete: ${result.entitiesDiscovered} new entities from ${result.queriesFired} queries (${result.entitiesSkipped} duplicates skipped)`,
        progress: result.queriesFired,
        total: result.queriesFired,
        finishedAt: new Date().toISOString(),
        result,
      } as any);
    } catch (err: any) {
      await updateJob(jobId, { status: "failed", message: err?.message ?? "Unknown error", finishedAt: new Date().toISOString() } as any);
    } finally {
      await setActiveJob("broad-discovery", "");
    }
  })();
});

// ── DELETE /ingest/broad-discovery-lock ───────────────────────────────────────
router.delete("/ingest/broad-discovery-lock", async (_req: Request, res: Response): Promise<void> => {
  const jobId = await getActiveJob("broad-discovery");
  if (!jobId) { res.json({ cleared: false, message: "No active broad-discovery lock." }); return; }
  await updateJob(jobId, { status: "failed", message: "Process killed (server restart).", finishedAt: new Date().toISOString() } as any);
  await setActiveJob("broad-discovery", "");
  res.json({ cleared: true, jobId });
});

export default router;
