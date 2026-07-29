/**
 * Apex Atlas Orchestrator
 *
 * Full 8-phase investor discovery pipeline that fires every data source,
 * enricher, and OSINT tool in the optimal cross-reference order.
 *
 * Phase 0  — Mass ingestion (parallel): FAA + Western HNWI (EDGAR/CH/BRREG) + optional Land Registry
 * Phase 1  — Registry cross-reference (parallel): OCCRP Aleph + OpenSky live flights + CH Company Officers
 * Phase 2  — Identity & ownership (parallel): CH contact enrichment + OpenOwnership BODS + Foundation filings
 * Phase 3  — Populate metadata: notes + stock assets + live source markers
 * Phase 4  — In-house OSINT (7 free sources): Wikidata, GitHub, RDAP, DNS, Gravatar, ProPublica 990
 * Phase 5  — Social / Messenger / Broad discovery
 * Phase 6  — AI OSINT sweep: Perplexity + Gemini + Tavily + Exa + Groq extraction
 *              → Maigret (3 000+ platforms) + Holehe (120+ services)
 *              → Web-OSINT re-run if Maigret finds 3+ new signals
 * Phase 7  — Forensic cross-reference (parallel): ICIJ Offshore Leaks + Whoxy + Equasis + ADSB history + OpenOwnership
 * Phase 8  — Attribution: Phase J (J4–J9) domain resolution + digital footprint + graph-assisted scoring
 * Phase 9  — Semantic layer: embeddings + net worth backfill + contact outcome backfill + confidence recompute
 * Phase 10 — MCTS research on hot leads (batches of 5)
 */

import { db, entitiesTable, assetsTable, contactEvidenceTable } from "@workspace/db";
import { sql, eq, and, desc, inArray } from "drizzle-orm";
import { logger } from "./logger";
import { updateJob, createJob, setActiveJob } from "./job-queue";
import { runWesternHnwiIngestion } from "./western-hnwi-ingestion";
import { runFaaIngestion } from "./faa-ingestor";
import { runLandRegistryIngestion } from "./land-registry-ingestor";
import { runOccrpEnrichment, runCompaniesHouseEnrichment } from "./enrichment/structured-verification";
import { runOpenSkyEnrichment } from "./opensky-ingestor";
import { enrichInHouse } from "./enrichment/contact-enrichment";
import { deepWebOsintEnrich } from "./enrichment/web-discovery";
import { discoverSocialPresence } from "./enrichment/social-discovery";
import { discoverMessengerPresence } from "./enrichment/messenger-discovery";
import { discoverViaFoundationFilings } from "./enrichment/foundation-filings";
import { runBroadDiscovery } from "./enrichment/broad-discovery";
import { enrichWithIcij } from "./icij-enricher";
import { enrichWithWhoxy } from "./whoxy-enricher";
import { enrichWithEquasis } from "./equasis-enricher";
import { enrichWithAdsbHistory } from "./adsbtrack-enricher";
import { enrichWithOpenOwnership } from "./openownership-enricher";
import { runHolehe, runMaigret } from "./python-tools";
import { computeContactConfidence, computeContactOutcome } from "./contact-confidence";
import { contactCacheSet } from "./redis";
import { runPhaseJBatch } from "../routes/phase-j";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AtlasOptions {
  /** Target entity count for Western HNWI (EDGAR + CH + BRREG). Default: 15 000 */
  targetCount?: number;
  /** Max FAA aircraft records to ingest. Default: 60 000 */
  faaMaxRecords?: number;
  /** Include UK Land Registry OCOD (300 MB download). Default: false */
  includeLandRegistry?: boolean;
  /** Per-entity batch size for enrichment phases. Default: 200 */
  batchSize?: number;
  /** Phase J batch size. Default: 50 */
  phaseJBatchSize?: number;
  /** Skip Phase 0 ingestion (data already imported). Default: false */
  skipIngestion?: boolean;
  /** Only process entities with bayesianScore >= 0.5. Default: false */
  hotLeadsOnly?: boolean;
  /** Run MCTS research on hot leads at end. Default: true */
  runResearch?: boolean;
  /** Max MCTS sessions in Phase 10. Default: 10 */
  researchLimit?: number;
}

export interface AtlasResult {
  phase: number;
  ingested: number;
  enriched: number;
  contactsFound: number;
  hotLeads: number;
  durationMs: number;
  phaseSummary: Record<string, string>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeJson<T>(str: string | null | undefined, fallback: T): T {
  try { return str ? JSON.parse(str) as T : fallback; } catch { return fallback; }
}

/** Fetch a page of entities suitable for per-entity enrichment. */
async function fetchEntities(opts: {
  batchSize: number;
  hotLeadsOnly: boolean;
  types?: string[];
  requireEmail?: boolean;
  requireAviationAsset?: boolean;
}) {
  const types = opts.types ?? ["HNWI", "Gatekeeper", "Corporation", "Trust"];
  const conditions: any[] = [
    sql`${entitiesTable.type} IN (${sql.join(types.map(t => sql`${t}`), sql`, `)})`,
  ];
  if (opts.hotLeadsOnly) conditions.push(sql`${entitiesTable.bayesianScore} >= 0.5`);
  if (opts.requireEmail) conditions.push(sql`${entitiesTable.email} IS NOT NULL`);

  return db.select({
    id: entitiesTable.id,
    name: entitiesTable.name,
    type: entitiesTable.type,
    nationality: entitiesTable.nationality,
    sourceRegistries: entitiesTable.sourceRegistries,
    knownResidences: entitiesTable.knownResidences,
    metadata: entitiesTable.metadata,
    notes: entitiesTable.notes,
    email: entitiesTable.email,
    phone: entitiesTable.phone,
    linkedinUrl: entitiesTable.linkedinUrl,
    twitterHandle: entitiesTable.twitterHandle,
    instagramHandle: entitiesTable.instagramHandle,
    telegramHandle: entitiesTable.telegramHandle,
    bayesianScore: entitiesTable.bayesianScore,
    contactConfidence: entitiesTable.contactConfidence,
  })
    .from(entitiesTable)
    .where(and(...conditions))
    .orderBy(desc(entitiesTable.bayesianScore), desc(entitiesTable.isHot))
    .limit(opts.batchSize);
}

/** Run a per-entity async fn with bounded concurrency and update the Atlas job. */
async function runEntityBatch<T>(
  atlasJobId: string,
  phase: string,
  entities: Array<{ id: number; name: string }>,
  fn: (entity: any) => Promise<T>,
  concurrency = 3,
  onResult?: (entity: any, result: T) => Promise<void>,
): Promise<{ ok: number; err: number }> {
  let ok = 0; let errCount = 0;

  for (let i = 0; i < entities.length; i += concurrency) {
    const slice = entities.slice(i, i + concurrency);
    await updateJob(atlasJobId, {
      status: "running",
      progress: i,
      total: entities.length,
      message: `${phase}: ${slice.map(e => e.name).join(", ")}…`,
    });

    await Promise.allSettled(
      slice.map(async (entity) => {
        try {
          const result = await fn(entity);
          if (onResult) await onResult(entity, result).catch(() => {});
          ok++;
        } catch (err) {
          errCount++;
          logger.warn({ entityId: entity.id, phase, err: (err as Error).message }, "[Atlas] entity error");
        }
      }),
    );
  }

  return { ok, err: errCount };
}

// ── Main Orchestrator ─────────────────────────────────────────────────────────

export async function runAtlasPipeline(atlasJobId: string, opts: AtlasOptions): Promise<AtlasResult> {
  const startMs = Date.now();
  const summary: Record<string, string> = {};
  let totalIngested = 0;
  let totalEnriched = 0;
  let totalContacts = 0;

  const batch = opts.batchSize ?? 200;
  const hot = opts.hotLeadsOnly ?? false;

  async function status(msg: string, phaseNum?: number) {
    logger.info({ phase: phaseNum, msg }, "[Atlas]");
    await updateJob(atlasJobId, {
      status: "running",
      progress: phaseNum ?? 0,
      total: 10,
      message: msg,
    });
  }

  // ── Phase 0: Mass Ingestion ─────────────────────────────────────────────────
  if (!opts.skipIngestion) {
    await status("Phase 0/10: Mass ingestion — FAA aircraft + Western HNWI (EDGAR/CH/BRREG)…", 0);

    const faaJobId  = await createJob("faa");
    const hnwiJobId = await createJob("western-hnwi");
    await setActiveJob("faa", faaJobId);
    await setActiveJob("western-hnwi", hnwiJobId);

    const [faaRes, hnwiRes] = await Promise.all([
      runFaaIngestion({ jobId: faaJobId, maxRecords: opts.faaMaxRecords ?? 60_000, forceRefresh: false })
        .catch(e => { logger.error({ err: e.message }, "[Atlas] FAA failed"); return { inserted: 0, skipped: 0, errors: 1, durationMs: 0 }; }),
      runWesternHnwiIngestion({ targetCount: opts.targetCount ?? 15_000, batchSize: 100, jobId: hnwiJobId })
        .catch(e => { logger.error({ err: e.message }, "[Atlas] HNWI ingestion failed"); return { inserted: 0, skipped: 0, errors: 1, durationMs: 0 }; }),
    ]);

    totalIngested += faaRes.inserted + hnwiRes.inserted;
    summary["Phase 0"] = `FAA: ${faaRes.inserted} aircraft | HNWI: ${hnwiRes.inserted} entities (${Math.round((faaRes.durationMs + hnwiRes.durationMs) / 1000)}s)`;

    if (opts.includeLandRegistry) {
      await status("Phase 0b: UK Land Registry OCOD ingestion…");
      const lrJobId = await createJob("land-registry");
      await setActiveJob("land-registry", lrJobId);
      const lrRes = await runLandRegistryIngestion({ jobId: lrJobId, maxRecords: 100_000, forceRefresh: false })
        .catch(e => { logger.error({ err: e.message }, "[Atlas] Land Registry failed"); return { inserted: 0, skipped: 0, errors: 1, durationMs: 0 }; });
      totalIngested += lrRes.inserted;
      summary["Phase 0b"] = `Land Registry: ${lrRes.inserted} overseas property owners`;
    }
  } else {
    summary["Phase 0"] = "Skipped (skipIngestion=true)";
  }

  // ── Phase 1: Registry Cross-Reference ──────────────────────────────────────
  await status("Phase 1/10: Registry cross-reference — OCCRP + OpenSky + CH Officers…", 1);

  const occrpJobId   = await createJob("occrp");
  const openskyJobId = await createJob("opensky");
  await setActiveJob("occrp", occrpJobId);
  await setActiveJob("opensky", openskyJobId);

  const [occrpRes, openskyRes, officersRes] = await Promise.all([
    runOccrpEnrichment({ jobId: occrpJobId, limit: 5_000 })
      .catch(e => { logger.error({ err: e.message }, "[Atlas] OCCRP failed"); return { inserted: 0, skipped: 0, errors: 1, durationMs: 0 }; }),
    runOpenSkyEnrichment({ jobId: openskyJobId })
      .catch(e => { logger.error({ err: e.message }, "[Atlas] OpenSky failed"); return { inserted: 0, skipped: 0, errors: 1, liveAircraft: 0, durationMs: 0 }; }),
    (async () => {
      try {
        const { runCompanyOfficersEnrichment } = await import("./registry-enricher");
        const chOffJobId = await createJob("ch-officers");
        await setActiveJob("ch-officers", chOffJobId);
        return await runCompanyOfficersEnrichment({ jobId: chOffJobId, batchSize: 100 });
      } catch (e: any) {
        logger.error({ err: e.message }, "[Atlas] CH Officers failed");
        return { enriched: 0, skipped: 0, errors: 1, durationMs: 0 };
      }
    })(),
  ]);

  summary["Phase 1"] = `OCCRP: ${occrpRes.inserted} | OpenSky: ${(openskyRes as any).inserted ?? 0} live | CH Officers: ${(officersRes as any).enriched ?? 0}`;

  // ── Phase 2: Identity & Ownership ──────────────────────────────────────────
  await status("Phase 2/10: Identity — CH contact enrichment + OpenOwnership BODS + Foundation filings…", 2);

  const chEnrichJobId = await createJob("companies-house-enrich");
  await setActiveJob("companies-house-enrich", chEnrichJobId);

  const entities2 = await fetchEntities({ batchSize: batch, hotLeadsOnly: hot });

  const [chRes, , ] = await Promise.all([
    runCompaniesHouseEnrichment({ jobId: chEnrichJobId, batchSize: 50 })
      .catch(e => { logger.error({ err: e.message }, "[Atlas] CH enrichment failed"); return { enriched: 0, skipped: 0, errors: 1, durationMs: 0 }; }),

    // OpenOwnership BODS — batch all entities
    runEntityBatch(atlasJobId, "Phase 2/OpenOwnership", entities2.slice(0, 100), async (e) => {
      const res = await enrichWithOpenOwnership(e.name, true);
      if (res.totalEntities > 0) {
        const note = `OpenOwnership BODS: ${res.totalEntities} ownership record(s) found.`;
        const existing = (e as any).notes ?? "";
        await db.update(entitiesTable)
          .set({ notes: existing ? `${existing}\n${note}` : note, updatedAt: new Date() })
          .where(eq(entitiesTable.id, e.id));
      }
    }, 2),

    // Foundation filings — batch all HNWI entities
    runEntityBatch(atlasJobId, "Phase 2/FoundationFilings", entities2.filter(e => e.type === "HNWI").slice(0, 100), async (e) => {
      await discoverViaFoundationFilings(e as any);
    }, 2),
  ]);

  summary["Phase 2"] = `CH contact: ${chRes.enriched} | OpenOwnership + Foundation filings: batch complete`;

  // ── Phase 3: Metadata population ───────────────────────────────────────────
  await status("Phase 3/10: Populate notes + EDGAR stock assets + live-source markers…", 3);

  try {
    // Populate notes from metadata
    let notesUpdated = 0;
    const noteRows = await db.select({ id: entitiesTable.id, notes: entitiesTable.notes, metadata: entitiesTable.metadata, sourceRegistries: entitiesTable.sourceRegistries, type: entitiesTable.type, nationality: entitiesTable.nationality, knownResidences: entitiesTable.knownResidences })
      .from(entitiesTable)
      .where(sql`${entitiesTable.metadata} IS NOT NULL AND ${entitiesTable.metadata} != '{}'`)
      .limit(10_000);

    for (const row of noteRows) {
      const meta: Record<string, any> = safeJson(row.metadata, {});
      const sources: string[] = safeJson(row.sourceRegistries, []);
      const parts: string[] = [];
      if (sources.length) parts.push(`Source: ${sources.join("; ")}.`);
      if (meta.formType) parts.push(`Filing: ${meta.formType}${meta.fileDate ? ` (${meta.fileDate})` : ""}.`);
      if (meta.companyName) parts.push(`Company: ${meta.companyName}.`);
      if (meta.orgnr) parts.push(`Org: ${meta.orgnr}.`);
      if (meta.roleDesc) parts.push(`Role: ${meta.roleDesc}.`);
      if (row.nationality) parts.push(`Nationality: ${row.nationality}.`);
      if (row.type) parts.push(`Type: ${row.type}.`);
      const newNotes = parts.join(" ");
      if (newNotes && newNotes !== row.notes) {
        await db.update(entitiesTable).set({ notes: newNotes }).where(eq(entitiesTable.id, row.id));
        notesUpdated++;
      }
    }

    // Create EDGAR stock assets
    const edgarEntities = await db.select({ id: entitiesTable.id, name: entitiesTable.name, metadata: entitiesTable.metadata, knownResidences: entitiesTable.knownResidences })
      .from(entitiesTable)
      .where(sql`${entitiesTable.metadata} LIKE '%sec-edgar%' AND ${entitiesTable.metadata} NOT LIKE '%sec-edgar-def14a%'`)
      .limit(5_000);
    const existingAssetIds = new Set(
      (await db.select({ ownerEntityId: assetsTable.ownerEntityId }).from(assetsTable).where(sql`${assetsTable.ownerEntityId} IS NOT NULL`))
        .map(r => r.ownerEntityId!),
    );
    const toCreate = edgarEntities.filter(e => !existingAssetIds.has(e.id));
    if (toCreate.length) {
      const assetRows = toCreate.map(e => {
        const meta: Record<string, any> = safeJson(e.metadata, {});
        return {
          category: "StockHolding" as const,
          identifier: `EDGAR-${(meta.formType ?? "SC13G").replace(/\s/g, "")}-${e.id}`,
          jurisdiction: "SEC EDGAR",
          description: `Large-shareholder position per ${meta.formType ?? "SC 13G"} filing. Beneficial owner: ${e.name}.`,
          address: meta.bizLocation ?? null,
          sourceRegistry: `SEC EDGAR — ${meta.formType ?? "SC 13G"}`,
          ownerEntityId: e.id,
          lastActivityDate: meta.fileDate ?? null,
        };
      });
      for (let i = 0; i < assetRows.length; i += 500) {
        await db.insert(assetsTable).values(assetRows.slice(i, i + 500)).onConflictDoNothing();
      }
    }

    summary["Phase 3"] = `Notes: ${notesUpdated} updated | EDGAR assets: ${toCreate.length} created`;
  } catch (e: any) {
    logger.error({ err: e.message }, "[Atlas] Phase 3 metadata failed");
    summary["Phase 3"] = `Error: ${e.message}`;
  }

  // ── Phase 4: In-House OSINT ─────────────────────────────────────────────────
  await status("Phase 4/10: In-house OSINT — Wikidata, GitHub, RDAP, DNS, Gravatar, ProPublica 990…", 4);

  const entities4 = await fetchEntities({ batchSize: batch, hotLeadsOnly: hot });
  const inHouseJobId = await createJob("in-house-enrich");
  await setActiveJob("in-house-enrich", inHouseJobId);

  const p4 = await runEntityBatch(atlasJobId, "Phase 4/In-house", entities4, async (entity) => {
    const meta = safeJson<Record<string, unknown>>(entity.metadata, {});
    const result = await enrichInHouse({ ...entity, bizLocation: meta.bizLocation as string ?? null, entityName: meta.entityName as string ?? null });

    const hasSignal = result.email || result.phone || result.linkedinUrl || result.twitter;
    if (!hasSignal) return;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (result.email && !entity.email) updates.email = result.email;
    if (result.linkedinUrl && !entity.linkedinUrl) updates.linkedinUrl = result.linkedinUrl;
    if (result.phone && !entity.phone) updates.phone = result.phone;
    if (result.twitter && !entity.twitterHandle) updates.twitterHandle = result.twitter;
    updates.contactConfidence = computeContactConfidence({
      email: (updates.email as string | null) ?? entity.email ?? null,
      phone: (updates.phone as string | null) ?? entity.phone ?? null,
      linkedinUrl: (updates.linkedinUrl as string | null) ?? entity.linkedinUrl ?? null,
      twitterHandle: (updates.twitterHandle as string | null) ?? entity.twitterHandle ?? null,
      knownResidences: entity.knownResidences,
    });
    const newMeta = { ...meta, enricherVersion: "v2", enrichedAt: new Date().toISOString(), enrichmentSources: result.sources };
    updates.metadata = JSON.stringify(newMeta);
    updates.liveSource = true;
    updates.contactOutcome = computeContactOutcome({ email: updates.email as any, phone: updates.phone as any, linkedinUrl: updates.linkedinUrl as any, twitterHandle: updates.twitterHandle as any });
    await db.update(entitiesTable).set(updates as any).where(eq(entitiesTable.id, entity.id));

    if (result.evidence.length) {
      await db.insert(contactEvidenceTable).values(result.evidence.map(ev => ({
        entityId: entity.id, vectorType: ev.vectorType, value: ev.value, source: ev.source,
        sourceUrl: ev.sourceUrl ?? null, extractionMethod: ev.extractionMethod,
        sourceReliability: Math.min(1, ev.confidence / 100),
        identityMatch: 0.75, recencyScore: 0.70,
        directnessScore: ev.vectorType === "email" ? 0.80 : ev.vectorType === "phone" ? 0.75 : 0.20,
        independentCorroboration: 1, validationStatus: "candidate" as const,
        metadata: JSON.stringify(ev.details ?? {}), observedAt: new Date(ev.observedAt),
      }))).onConflictDoNothing();
    }
    totalEnriched++;
  }, 5);

  await setActiveJob("in-house-enrich", "");
  summary["Phase 4"] = `In-house OSINT: ${p4.ok} enriched, ${p4.err} errors`;

  // ── Phase 5: Social / Messenger / Broad discovery ───────────────────────────
  await status("Phase 5/10: Social + Messenger + Broad discovery…", 5);

  const entities5 = await fetchEntities({ batchSize: Math.min(batch, 300), hotLeadsOnly: hot, types: ["HNWI", "Gatekeeper"] });

  // Social discovery (LinkedIn, Twitter/X, Instagram, personal websites)
  const p5social = await runEntityBatch(atlasJobId, "Phase 5/Social", entities5, async (entity) => {
    const result = await discoverSocialPresence(entity as any);
    const updates: Record<string, unknown> = {};
    if (result.linkedinUrl && !entity.linkedinUrl) updates.linkedinUrl = result.linkedinUrl;
    if (result.twitterHandle && !entity.twitterHandle) updates.twitterHandle = result.twitterHandle;
    if (result.instagramHandle && !entity.instagramHandle) updates.instagramHandle = result.instagramHandle;
    if (Object.keys(updates).length) {
      updates.updatedAt = new Date();
      await db.update(entitiesTable).set(updates as any).where(eq(entitiesTable.id, entity.id));
    }
  }, 3);

  // Messenger discovery (Telegram)
  const p5msg = await runEntityBatch(atlasJobId, "Phase 5/Messenger", entities5.slice(0, 100), async (entity) => {
    const result = await discoverMessengerPresence(entity as any);
    if (result.telegramHandle && !entity.telegramHandle) {
      await db.update(entitiesTable).set({ telegramHandle: result.telegramHandle, updatedAt: new Date() }).where(eq(entitiesTable.id, entity.id));
    }
  }, 3);

  // Broad discovery — generates NEW HNWIs from the web
  try {
    const broadJobId = await createJob("broad-discovery");
    await setActiveJob("broad-discovery", broadJobId);
    const broadRes = await runBroadDiscovery({ jobId: broadJobId, queriesPerCategory: 3, maxNewEntities: 200 } as any);
    await setActiveJob("broad-discovery", "");
    totalIngested += (broadRes as any)?.newEntities ?? 0;
    summary["Phase 5b"] = `Broad: ${(broadRes as any)?.newEntities ?? "?"} new entities discovered`;
  } catch (e: any) {
    logger.error({ err: e.message }, "[Atlas] Broad discovery failed");
    summary["Phase 5b"] = `Broad: error — ${e.message}`;
  }

  summary["Phase 5"] = `Social: ${p5social.ok} | Messenger: ${p5msg.ok}`;

  // ── Phase 6: AI OSINT sweep ─────────────────────────────────────────────────
  // Full flexible pipeline: Perplexity + Gemini + Tavily + Exa → Groq extraction
  //   → Maigret (3 000+ platforms) → Holehe (120+ services)
  //   → Web-OSINT re-run if Maigret found 3+ platforms and no email yet
  await status("Phase 6/10: AI OSINT — Perplexity + Gemini + Tavily + Exa + Groq → Maigret + Holehe…", 6);

  const webOsintJobId = await createJob("web-osint");
  await setActiveJob("web-osint", webOsintJobId);

  const entities6 = await fetchEntities({ batchSize: batch, hotLeadsOnly: hot });
  let aiEnriched = 0; let aiSkipped = 0; let aiErrors = 0;

  for (let i = 0; i < entities6.length; i++) {
    const entity = entities6[i]!;
    try {
      await updateJob(webOsintJobId, {
        status: "running", progress: i, total: entities6.length,
        inserted: aiEnriched, skipped: aiSkipped, errors: aiErrors,
        message: `AI OSINT: ${entity.name}…`,
      });

      // — Primary AI layer —
      const result = await deepWebOsintEnrich(entity as any);
      const hasSignal = result.email || result.phone || result.linkedinUrl
        || result.instagramUrl || result.twitterUrl || result.evidence.length > 0;

      if (hasSignal) {
        const confidence = computeContactConfidence({
          email: result.email, phone: result.phone, linkedinUrl: result.linkedinUrl,
          knownResidences: entity.knownResidences,
        });
        const isCorpOrTrust = ["Corporation", "Corp", "Trust"].includes(entity.type);
        await db.update(entitiesTable).set({
          ...(result.email       ? { email: result.email }             : {}),
          ...(result.phone       ? { phone: result.phone }             : {}),
          ...(result.linkedinUrl ? { linkedinUrl: result.linkedinUrl } : {}),
          ...(result.instagramUrl && !entity.instagramHandle && !isCorpOrTrust ? { instagramHandle: result.instagramUrl } : {}),
          ...(result.twitterUrl   && !entity.twitterHandle   && !isCorpOrTrust ? { twitterHandle:   result.twitterUrl }   : {}),
          contactConfidence: confidence, updatedAt: new Date(),
          contactOutcome: computeContactOutcome({ email: result.email, phone: result.phone, linkedinUrl: result.linkedinUrl }),
        }).where(eq(entitiesTable.id, entity.id));

        if (result.evidence?.length) {
          await db.insert(contactEvidenceTable).values(result.evidence.map(ev => ({
            entityId: entity.id, vectorType: ev.vectorType, value: ev.value, source: ev.source,
            sourceUrl: ev.sourceUrl ?? null, extractionMethod: ev.extractionMethod ?? "deep-web-osint",
            sourceReliability: Math.min(1, ev.confidence / 100), identityMatch: 0.65, recencyScore: 0.7,
            directnessScore: ev.vectorType === "email" ? 0.9 : ev.vectorType === "phone" ? 0.85 : 0.6,
            independentCorroboration: 1, validationStatus: "candidate" as const, observedAt: new Date(),
            metadata: JSON.stringify(ev.details ?? {}),
          }))).onConflictDoNothing().catch(() => {});
        }
        aiEnriched++;
        totalContacts++;
      } else {
        aiSkipped++;
        continue;
      }

      // — Maigret + Holehe layer —
      const rawHandle = (result.twitterUrl ?? "").replace(/^https?:\/\/(www\.)?(twitter\.com|x\.com)\//, "").replace(/\?.*$/, "")
        || (entity.twitterHandle ?? "").replace(/^@/, "")
        || (result.instagramUrl ?? "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\?.*$/, "")
        || (entity.instagramHandle ?? "").replace(/^@/, "");
      const cleanHandle = rawHandle.replace(/[^a-zA-Z0-9._\-]/g, "").trim();
      const emailForHolehe = result.email ?? entity.email ?? null;

      if (cleanHandle || emailForHolehe) {
        await updateJob(webOsintJobId, {
          status: "running", progress: i, total: entities6.length, inserted: aiEnriched,
          message: `Maigret + Holehe: ${entity.name}…`,
        });

        const [maigretResult, holeheResult] = await Promise.all([
          cleanHandle    ? runMaigret(cleanHandle).catch(() => null)   : Promise.resolve(null),
          emailForHolehe ? runHolehe(emailForHolehe).catch(() => null) : Promise.resolve(null),
        ]);

        // Save Maigret social dossier
        if (maigretResult?.found.length) {
          await db.insert(contactEvidenceTable).values(
            maigretResult.found.slice(0, 15).map(p => ({
              entityId: entity.id, vectorType: "social" as const,
              value: p.url ?? p.siteName, source: "maigret", sourceUrl: p.url ?? null,
              extractionMethod: "maigret-username-search", sourceReliability: 0.7,
              identityMatch: 0.65, recencyScore: 0.5, directnessScore: 0.6,
              independentCorroboration: 1, validationStatus: "candidate" as const,
              metadata: JSON.stringify({ siteName: p.siteName, tags: (p as any).tags ?? [] }),
            })),
          ).onConflictDoNothing().catch(() => {});

          // Flexible re-entry: if Maigret found 3+ platforms and no email yet → re-run AI
          if (maigretResult.found.length >= 3 && !result.email) {
            const platformList = maigretResult.found.slice(0, 6).map(p => p.siteName).join(", ");
            await updateJob(webOsintJobId, {
              status: "running", progress: i, total: entities6.length, inserted: aiEnriched,
              message: `Web-OSINT re-run (${maigretResult.found.length} Maigret signals): ${entity.name}…`,
            });
            const result2 = await deepWebOsintEnrich({
              ...entity,
              notes: [`${entity.notes ?? ""}`, `Active on: ${platformList}`].filter(Boolean).join(" — ").trim(),
            } as any).catch(() => null);
            if (result2?.email) {
              await db.update(entitiesTable).set({ email: result2.email, updatedAt: new Date() }).where(eq(entitiesTable.id, entity.id));
            }
          }
        }

        // Save Holehe platform presence
        if (holeheResult?.found.length) {
          await db.insert(contactEvidenceTable).values(
            holeheResult.found.slice(0, 10).map(p => ({
              entityId: entity.id, vectorType: "social" as const,
              value: p.url ?? p.name, source: "holehe", sourceUrl: p.url ?? null,
              extractionMethod: "holehe-email-check", sourceReliability: 0.8,
              identityMatch: 0.8, recencyScore: 0.5, directnessScore: 0.7,
              independentCorroboration: 1, validationStatus: "candidate" as const,
              metadata: JSON.stringify({ platform: p.name }),
            })),
          ).onConflictDoNothing().catch(() => {});
        }
      }
    } catch (err: any) {
      aiErrors++;
      logger.warn({ entityId: entity.id, err: err.message }, "[Atlas] Phase 6 entity failed");
    }
  }

  await updateJob(webOsintJobId, { status: "done", progress: entities6.length, total: entities6.length, inserted: aiEnriched, message: `AI OSINT done — ${aiEnriched} enriched` });
  await setActiveJob("web-osint", "");
  summary["Phase 6"] = `AI OSINT: ${aiEnriched} enriched, ${aiSkipped} no-match, ${aiErrors} errors`;

  // ── Phase 7: Forensic Cross-Reference ──────────────────────────────────────
  // ICIJ + Whoxy + Equasis + ADSB History (per-entity, parallel batches)
  await status("Phase 7/10: Forensic cross-reference — ICIJ + Whoxy + Equasis + ADSB…", 7);

  const entities7 = await fetchEntities({ batchSize: Math.min(batch, 300), hotLeadsOnly: hot });

  // ICIJ Offshore Leaks — all entities
  const p7icij = await runEntityBatch(atlasJobId, "Phase 7/ICIJ", entities7, async (entity) => {
    const res = await enrichWithIcij(entity.name, [], false);
    if (res.totalMatches > 0) {
      const note = `ICIJ Offshore Leaks: ${res.totalMatches} match(es) — ${res.datasets?.join(", ") ?? "unknown dataset"}`;
      const existing = entity.notes ?? "";
      await db.update(entitiesTable)
        .set({ notes: (existing ? `${existing}\n${note}` : note).slice(0, 10_000), updatedAt: new Date() })
        .where(eq(entitiesTable.id, entity.id));
    }
  }, 3);

  // Whoxy Reverse WHOIS — entities with email or name (finds domains they registered)
  const p7whoxy = await runEntityBatch(atlasJobId, "Phase 7/Whoxy",
    entities7.filter(e => e.email || e.type === "HNWI").slice(0, 150), async (entity) => {
      const res = await enrichWithWhoxy({
        email: entity.email ?? undefined,
        name: entity.type === "HNWI" ? entity.name : undefined,
        companyName: ["Corporation", "Corp", "Trust"].includes(entity.type) ? entity.name : undefined,
      });
      if (res.allUniqueDomains?.length) {
        const note = `Whoxy WHOIS: ${res.allUniqueDomains.length} domain(s) — ${res.allUniqueDomains.slice(0, 5).join(", ")}`;
        const existing = entity.notes ?? "";
        await db.update(entitiesTable)
          .set({ notes: (existing ? `${existing}\n${note}` : note).slice(0, 10_000), updatedAt: new Date() })
          .where(eq(entitiesTable.id, entity.id));
      }
    }, 2);

  // Equasis / VesselFinder — entities with aviation/maritime assets
  const aviationEntities = await db.select({ id: entitiesTable.id, name: entitiesTable.name, notes: entitiesTable.notes })
    .from(entitiesTable)
    .where(sql`EXISTS (
      SELECT 1 FROM assets a
      WHERE a.owner_entity_id = ${entitiesTable.id}
      AND a.category IN ('Aviation', 'Maritime', 'Vessel')
    )`)
    .limit(100);

  const p7equasis = await runEntityBatch(atlasJobId, "Phase 7/Equasis", aviationEntities, async (entity) => {
    const res = await enrichWithEquasis(entity.name, undefined);
    if ((res as any)?.vessels?.length || (res as any)?.found) {
      const note = `Equasis/VesselFinder: vessel registry match found for ${entity.name}`;
      const existing = entity.notes ?? "";
      await db.update(entitiesTable)
        .set({ notes: (existing ? `${existing}\n${note}` : note).slice(0, 10_000), updatedAt: new Date() })
        .where(eq(entitiesTable.id, entity.id));
    }
  }, 2);

  // ADSB History — FAA registered aircraft (cross-ref recent flight patterns)
  const faaAssets = await db.select({ registration: assetsTable.identifier, ownerEntityId: assetsTable.ownerEntityId })
    .from(assetsTable)
    .where(sql`${assetsTable.category} = 'Aviation' AND ${assetsTable.ownerEntityId} IS NOT NULL AND ${assetsTable.identifier} LIKE 'N%'`)
    .limit(50);

  if (faaAssets.length) {
    await runEntityBatch(atlasJobId, "Phase 7/ADSB",
      faaAssets.map(a => ({ id: a.ownerEntityId!, name: a.registration ?? "" })),
      async (a) => {
        await enrichWithAdsbHistory(a.name, 30, false).catch(() => {});
      }, 3);
  }

  summary["Phase 7"] = `ICIJ: ${p7icij.ok} | Whoxy: ${p7whoxy.ok} | Equasis: ${p7equasis.ok} | ADSB: ${faaAssets.length} aircraft`;

  // ── Phase 8: Phase J Attribution ───────────────────────────────────────────
  // J4 domain resolution, J5 digital footprint, J6 attribution, J7 cooldowns, J8 graph-assisted
  await status("Phase 8/10: Phase J attribution — domain resolution + digital footprint + graph scoring…", 8);

  try {
    const phaseJJobId = await createJob("phase-j-pass");
    await setActiveJob("phase-j-pass", phaseJJobId);
    const phaseJRes = await runPhaseJBatch(phaseJJobId, opts.phaseJBatchSize ?? 50);
    summary["Phase 8"] = `Phase J: ${phaseJRes.message}`;
    await setActiveJob("phase-j-pass", "");
  } catch (e: any) {
    logger.error({ err: e.message }, "[Atlas] Phase J failed");
    summary["Phase 8"] = `Phase J: error — ${e.message}`;
  }

  // ── Phase 9: Semantic layer ─────────────────────────────────────────────────
  await status("Phase 9/10: Semantic embeddings + net worth backfill + confidence recompute…", 9);

  try {
    const embJobId = await createJob("compute-embeddings");
    await setActiveJob("compute-embeddings", embJobId);
    await updateJob(embJobId, { status: "running", message: "Loading all-MiniLM-L6-v2 model…" });

    const { embedText, entityToEmbedText, storeEmbedding, getEmbeddingCacheSize, getAllEmbeddings } = await import("./semantic-engine");
    const embRows = await db.select({ id: entitiesTable.id, name: entitiesTable.name, notes: entitiesTable.notes, nationality: entitiesTable.nationality, knownResidences: entitiesTable.knownResidences, metadata: entitiesTable.metadata }).from(entitiesTable).limit(50_000);
    const existingCache = getAllEmbeddings();
    const toEmbed = embRows.filter(e => !existingCache.has(e.id));
    let embProcessed = 0;
    const CHUNK = 10;
    for (let i = 0; i < toEmbed.length; i += CHUNK) {
      await Promise.allSettled(toEmbed.slice(i, i + CHUNK).map(async e => {
        const emb = await embedText(entityToEmbedText(e));
        await storeEmbedding(e.id, emb);
        embProcessed++;
      }));
    }
    await updateJob(embJobId, { status: "done", progress: embProcessed, total: toEmbed.length, message: `${embProcessed} embeddings computed. Cache: ${getEmbeddingCacheSize()}` });
    await setActiveJob("compute-embeddings", "");

    // Net worth backfill — set estimatedNetWorth = 3× total asset value
    await db.execute(sql`
      UPDATE entities SET estimated_net_worth = (
        SELECT COALESCE(SUM(estimated_value), 0) * 3
        FROM assets WHERE owner_entity_id = entities.id
      )
      WHERE estimated_net_worth IS NULL OR estimated_net_worth = 0
    `);

    // Backfill contact outcomes for all entities
    await db.execute(sql`
      UPDATE entities
      SET contact_outcome = CASE
        WHEN email IS NOT NULL AND phone IS NOT NULL THEN 'direct_contact_verified'
        WHEN email IS NOT NULL THEN 'direct_contact_candidate'
        WHEN linkedin_url IS NOT NULL OR twitter_handle IS NOT NULL THEN 'social_only'
        WHEN notes IS NOT NULL AND length(notes) > 50 THEN 'evidence_only'
        ELSE 'none'
      END
      WHERE contact_outcome IS NULL
    `);

    // Recompute contact confidence for all
    const confEntities = await db.select({ id: entitiesTable.id, email: entitiesTable.email, phone: entitiesTable.phone, linkedinUrl: entitiesTable.linkedinUrl, twitterHandle: entitiesTable.twitterHandle, instagramHandle: entitiesTable.instagramHandle, telegramHandle: entitiesTable.telegramHandle, knownResidences: entitiesTable.knownResidences, contactConfidence: entitiesTable.contactConfidence }).from(entitiesTable).limit(50_000);
    for (let i = 0; i < confEntities.length; i += 1000) {
      for (const e of confEntities.slice(i, i + 1000)) {
        const c = computeContactConfidence({ email: e.email, phone: e.phone, linkedinUrl: e.linkedinUrl, twitterHandle: e.twitterHandle, instagramHandle: e.instagramHandle, telegramHandle: e.telegramHandle, knownResidences: e.knownResidences });
        if (c !== (e.contactConfidence ?? 0)) await db.update(entitiesTable).set({ contactConfidence: c }).where(eq(entitiesTable.id, e.id));
      }
    }

    summary["Phase 9"] = `Embeddings: ${embProcessed} | Net worth backfill done | Confidence recomputed`;
  } catch (e: any) {
    logger.error({ err: e.message }, "[Atlas] Phase 9 failed");
    summary["Phase 9"] = `Error: ${e.message}`;
  }

  // ── Phase 10: MCTS Research on hot leads ───────────────────────────────────
  if (opts.runResearch !== false) {
    await status("Phase 10/10: MCTS research on hot leads…", 10);
    try {
      const researchLimit = opts.researchLimit ?? 10;
      const hotEntities = await db.select({ id: entitiesTable.id })
        .from(entitiesTable)
        .where(sql`${entitiesTable.bayesianScore} >= 0.6 AND ${entitiesTable.type} = 'HNWI'`)
        .orderBy(desc(entitiesTable.bayesianScore))
        .limit(researchLimit);

      let researched = 0;
      const MCTS_BATCH = 5;
      for (let i = 0; i < hotEntities.length; i += MCTS_BATCH) {
        const batch5 = hotEntities.slice(i, i + MCTS_BATCH);
        await updateJob(atlasJobId, { status: "running", progress: 10, total: 10, message: `MCTS research batch ${Math.floor(i / MCTS_BATCH) + 1}/${Math.ceil(hotEntities.length / MCTS_BATCH)}…` });
        await Promise.allSettled(batch5.map(async (e) => {
          try {
            const { runResearchSession } = await import("./mcts-agent");
            await (runResearchSession as any)(e.id);
            researched++;
          } catch {}
        }));
      }
      summary["Phase 10"] = `MCTS: ${researched}/${hotEntities.length} hot leads researched`;
    } catch (e: any) {
      logger.error({ err: e.message }, "[Atlas] MCTS phase failed");
      summary["Phase 10"] = `MCTS: error — ${e.message}`;
    }
  } else {
    summary["Phase 10"] = "Skipped (runResearch=false)";
  }

  // ── Final count ────────────────────────────────────────────────────────────
  const [hotRow, totalRow] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(entitiesTable).where(sql`${entitiesTable.bayesianScore} >= 0.5`),
    db.select({ count: sql<number>`count(*)::int` }).from(entitiesTable),
  ]);

  const hotLeads = Number(hotRow[0]?.count ?? 0);
  const durationMs = Date.now() - startMs;

  const finalMsg = [
    `Atlas complete in ${Math.round(durationMs / 60_000)}min.`,
    `${Number(totalRow[0]?.count ?? 0).toLocaleString()} entities | ${hotLeads} hot leads | ${totalContacts} contacts found.`,
    Object.entries(summary).map(([k, v]) => `${k}: ${v}`).join(" | "),
  ].join(" ");

  await updateJob(atlasJobId, {
    status: "done",
    progress: 10, total: 10,
    inserted: totalIngested,
    finishedAt: new Date().toISOString(),
    message: finalMsg,
  });
  await setActiveJob("atlas-run", "");
  logger.info({ durationMs, hotLeads, summary }, "[Atlas] Pipeline complete");

  return { phase: 10, ingested: totalIngested, enriched: totalEnriched, contactsFound: totalContacts, hotLeads, durationMs, phaseSummary: summary };
}
