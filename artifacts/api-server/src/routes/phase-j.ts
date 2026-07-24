/**
 * Phase J completion layer.
 *
 * The existing source enrichers remain responsible for lawful discovery. This
 * router adds the missing operational contract around them: validation,
 * provenance, retry state, graph context, and re-import checkpoints.
 */
import { Router, type Request, type Response } from "express";
import {
  db,
  entitiesTable,
  relationshipsTable,
  enrichmentRunsTable,
  contactEvidenceTable,
  enrichmentStateTable,
  phaseJCheckpointsTable,
} from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { createJob, getActiveJob, setActiveJob, updateJob } from "../lib/job-queue";
import { enrichInHouse } from "../lib/enrichment/contact-enrichment";
import {
  computeContactConfidence,
  computeContactOutcome,
  type ContactOutcome,
} from "../lib/contact-confidence";
import { isValidPublicEmail, sanitizePublicEmail } from "../lib/contact-validation";
import { logger } from "../lib/logger";

const router = Router();

type JsonMap = Record<string, unknown>;

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}

function registryOf(metadata: string | null, sourceRegistries: string | null): string {
  const meta = parseJson<JsonMap>(metadata, {});
  if (meta["nNumber"]) return "faa";
  if (meta["formType"] || meta["edgarUrl"]) return "edgar";
  if (meta["orgnr"]) return "brreg";
  if (meta["companyNumber"]) return "companies-house";
  if (meta["titleNumber"]) return "hmlr";
  const sources = parseJson<unknown[]>(sourceRegistries, []);
  return sources.length ? String(sources[0]) : "other";
}

function normalizePhone(value: string | null | undefined): string | null {
  const raw = value?.trim() ?? "";
  if (!raw) return null;
  const normalized = raw.replace(/[^\d+]/g, "");
  const digits = normalized.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 ? normalized : null;
}

function sourceReliability(source: string): number {
  if (/^(Wikidata|EDGAR|CompaniesHouse|BRREG|ProPublica)/i.test(source)) return 0.9;
  if (/ContactPage|ORCID|GitHub/i.test(source)) return 0.8;
  if (/Wikipedia|Wayback|DDG/i.test(source)) return 0.55;
  return 0.45;
}

function isOrganizationContact(entityType: string, email: string | null, phone: string | null): boolean {
  if (!["Corporation", "Trust"].includes(entityType)) return false;
  const local = email?.split("@")[0]?.toLowerCase() ?? "";
  return Boolean(phone && !email) || /^(info|hello|contact|admin|office|mail|support|ir|media)$/.test(local);
}

function hasHighAuthoritySource(sources: string[]): boolean {
  return sources.some((source) => /^(Wikidata|EDGAR|CompaniesHouse|BRREG|ProPublica|ORCID)/i.test(source));
}

function directVerified(
  email: string | null,
  phone: string | null,
  emailConfidence: number,
  phoneConfidence: number,
  sources: string[],
): boolean {
  const valid = Boolean((email && isValidPublicEmail(email)) || phone);
  if (!valid) return false;
  const independent = new Set(sources.map((source) => source.split("-")[0])).size;
  return (
    (hasHighAuthoritySource(sources) && Math.max(emailConfidence, phoneConfidence) >= 70) ||
    (independent >= 2 && Math.max(emailConfidence, phoneConfidence) >= 60)
  );
}

async function graphContext(entityId: number): Promise<Array<{ targetId: number; type: string; strength: number | null }>> {
  const rows = await db
    .select({
      targetId: relationshipsTable.targetId,
      type: relationshipsTable.relationshipType,
      strength: relationshipsTable.strength,
    })
    .from(relationshipsTable)
    .where(and(
      eq(relationshipsTable.sourceEntityId, entityId),
      eq(relationshipsTable.targetType, "Entity"),
    ))
    .orderBy(desc(relationshipsTable.strength))
    .limit(8);
  return rows;
}

async function persistEvidence(
  entityId: number,
  runId: number,
  entityType: string,
  result: Awaited<ReturnType<typeof enrichInHouse>>,
  email: string | null,
  phone: string | null,
  verified: boolean,
  domain: string | null,
): Promise<void> {
  const rows: Array<typeof contactEvidenceTable.$inferInsert> = [];
  const sources = result.sources.length ? result.sources : ["phase-j-in-house"];
  const source = sources[0]!;
  const corroboration = new Set(sources.map((item) => item.split("-")[0])).size;
  const status = verified ? "verified" : "candidate";
  const common = {
    entityId,
    runId,
    source,
    sourceReliability: sourceReliability(source),
    identityMatch: 0.75,
    recencyScore: 0.7,
    independentCorroboration: corroboration,
    validationStatus: status,
    metadata: JSON.stringify({ sources, entityType }),
  };
  if (email) rows.push({
    ...common,
    vectorType: "email",
    value: email,
    directnessScore: verified ? 0.95 : 0.65,
    extractionMethod: "public-source-parser",
    sourceUrl: domain ? `https://${domain}` : null,
  });
  if (phone) rows.push({
    ...common,
    vectorType: "phone",
    value: phone,
    directnessScore: verified ? 0.9 : 0.6,
    extractionMethod: "public-source-parser",
    sourceUrl: domain ? `https://${domain}` : null,
  });
  if (result.linkedinUrl) rows.push({
    ...common,
    vectorType: "social",
    value: result.linkedinUrl,
    directnessScore: 0.2,
    validationStatus: "candidate",
    extractionMethod: "public-profile-discovery",
    sourceUrl: result.linkedinUrl,
  });
  if (domain) rows.push({
    ...common,
    vectorType: "domain",
    value: domain,
    directnessScore: 0.1,
    validationStatus: "candidate",
    extractionMethod: "website-domain-resolution",
    sourceUrl: result.website ?? `https://${domain}`,
  });
  if (rows.length) {
    await db.insert(contactEvidenceTable).values(rows).onConflictDoNothing();
  }
}

async function runPhaseJPass(jobId: string, runId: number, entities: Array<{
  id: number; name: string; type: string; nationality: string | null;
  sourceRegistries: string | null; knownResidences: string | null;
  metadata: string | null; notes: string | null; email: string | null;
  phone: string | null; linkedinUrl: string | null; twitterHandle: string | null;
  instagramHandle: string | null; telegramHandle: string | null;
  passNumber: number;
}>): Promise<void> {
  const totals = {
    found: 0, persisted: 0, direct: 0, verified: 0, social: 0,
    evidence: 0, organization: 0, errors: 0, domains: 0, validated: 0, attributed: 0,
  };
  const byRegistry: Record<string, Record<string, number>> = {};
  const byEntityType: Record<string, Record<string, number>> = {};
  const started = Date.now();

  for (let index = 0; index < entities.length; index += 1) {
    const entity = entities[index]!;
    try {
      await updateJob(jobId, {
        status: "running",
        progress: index,
        total: entities.length,
        inserted: totals.persisted,
        errors: totals.errors,
        message: `Phase J pass ${entity.passNumber + 1}: ${entity.name}`,
      });
      const meta = parseJson<JsonMap>(entity.metadata, {});
      const result = await enrichInHouse({
        ...entity,
        bizLocation: typeof meta["bizLocation"] === "string" ? meta["bizLocation"] : null,
        entityName: typeof meta["entityName"] === "string" ? meta["entityName"] : null,
      });
      const email = sanitizePublicEmail(result.email ?? entity.email);
      const phone = normalizePhone(result.phone ?? entity.phone);
      const hasDirect = Boolean(email || phone);
      const hasVerified = directVerified(email, phone, result.emailConfidence, result.phoneConfidence, result.sources);
      const organization = isOrganizationContact(entity.type, email, phone);
      const outcome: ContactOutcome = organization
        ? "organization_contact"
        : computeContactOutcome({
          email, phone,
          linkedinUrl: result.linkedinUrl ?? entity.linkedinUrl,
          twitterHandle: result.twitter ?? entity.twitterHandle,
          instagramHandle: entity.instagramHandle,
          telegramHandle: entity.telegramHandle,
          website: result.website ?? (meta["website"] as string | null | undefined),
          bizLocation: result.address ?? (meta["bizLocation"] as string | null | undefined),
          validatedDirectContact: hasVerified,
        });
      const domainMatch = (result.website ?? String(meta["website"] ?? "")).match(/^https?:\/\/(?:www\.)?([^/]+)/i);
      const domain = domainMatch?.[1]?.toLowerCase() ?? null;
      if (domain) totals.domains += 1;
      if (hasDirect) totals.direct += 1;
      if (hasVerified) totals.verified += 1;
      if (hasDirect && (email && isValidPublicEmail(email) || phone)) totals.validated += 1;
      if (hasVerified) totals.attributed += 1;
      if (outcome === "social_only") totals.social += 1;
      if (outcome === "evidence_only") totals.evidence += 1;
      if (outcome === "organization_contact") totals.organization += 1;
      if (result.email || result.phone || result.linkedinUrl || result.website || result.address) totals.found += 1;
      const registry = registryOf(entity.metadata, entity.sourceRegistries);
      for (const bucket of [byRegistry[registry] ?? (byRegistry[registry] = {}), byEntityType[entity.type] ?? (byEntityType[entity.type] = {})]) {
        bucket[outcome] = (bucket[outcome] ?? 0) + 1;
      }

      const nextMeta = {
        ...meta,
        contactOutcome: outcome,
        phaseJ: {
          pass: "multi-pass",
          validated: Boolean(hasDirect && (email && isValidPublicEmail(email) || phone)),
          attributed: hasVerified,
          sources: result.sources,
          observedAt: new Date().toISOString(),
        },
        ...(domain ? { resolvedDomain: domain } : {}),
      };
      const updates: Record<string, unknown> = {
        contactConfidence: computeContactConfidence({
          email: email ?? entity.email,
          phone: phone ?? entity.phone,
          linkedinUrl: result.linkedinUrl ?? entity.linkedinUrl,
          twitterHandle: result.twitter ?? entity.twitterHandle,
          instagramHandle: entity.instagramHandle,
          telegramHandle: entity.telegramHandle,
          knownResidences: entity.knownResidences,
        }),
        contactOutcome: outcome,
        metadata: JSON.stringify(nextMeta),
        updatedAt: new Date(),
      };
      if (email && !entity.email) updates.email = email;
      if (phone && !entity.phone) updates.phone = phone;
      if (result.linkedinUrl && !entity.linkedinUrl) updates.linkedinUrl = result.linkedinUrl;
      if (result.twitter && !entity.twitterHandle) updates.twitterHandle = result.twitter;
      await db.update(entitiesTable).set(updates as any).where(eq(entitiesTable.id, entity.id));
      await persistEvidence(entity.id, runId, entity.type, result, email, phone, hasVerified, domain);
      const context = await graphContext(entity.id);
      const retry = hasVerified ? null : new Date(Date.now() + (outcome === "social_only" ? 24 : 72) * 60 * 60 * 1000);
      await db.insert(enrichmentStateTable).values({
        entityId: entity.id,
        passNumber: entity.passNumber + 1,
        attempts: 1,
        successfulPasses: hasDirect ? 1 : 0,
        lastPass: "multi-pass",
        lastSource: result.sources.join(",").slice(0, 500) || "phase-j-in-house",
        lastOutcome: outcome,
        lastAttemptAt: new Date(),
        nextAttemptAt: retry,
        retryReason: hasVerified ? null : "direct-contact-not-attributed",
        graphContext: JSON.stringify(context),
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: enrichmentStateTable.entityId,
        set: {
          passNumber: sql`${enrichmentStateTable.passNumber} + 1`,
          attempts: sql`${enrichmentStateTable.attempts} + 1`,
          successfulPasses: sql`${enrichmentStateTable.successfulPasses} + ${hasDirect ? 1 : 0}`,
          lastPass: "multi-pass",
          lastSource: result.sources.join(",").slice(0, 500) || "phase-j-in-house",
          lastOutcome: outcome,
          lastAttemptAt: new Date(),
          nextAttemptAt: retry,
          retryReason: hasVerified ? null : "direct-contact-not-attributed",
          graphContext: JSON.stringify(context),
          updatedAt: new Date(),
        },
      });
      totals.persisted += 1;
    } catch (error) {
      totals.errors += 1;
      logger.warn({ entityId: entity.id, error: error instanceof Error ? error.message : String(error) }, "Phase J entity pass failed");
    }
  }
  await db.update(enrichmentRunsTable).set({
    finishedAt: new Date(),
    totalFound: totals.found,
    totalPersisted: totals.persisted,
    directConfirmed: totals.direct,
    directVerified: totals.verified,
    domainResolved: totals.domains,
    candidateValidated: totals.validated,
    candidateAttributed: totals.attributed,
    socialOnly: totals.social,
    evidenceOnly: totals.evidence,
    organizationContact: totals.organization,
    errors: totals.errors,
    byRegistry: JSON.stringify(byRegistry),
    byEntityType: JSON.stringify(byEntityType),
    durationMs: Date.now() - started,
    notes: "Validated public-contact candidates with provenance; social/evidence outcomes remain retryable.",
  }).where(eq(enrichmentRunsTable.id, runId));
  await updateJob(jobId, {
    status: "done",
    progress: entities.length,
    total: entities.length,
    inserted: totals.persisted,
    errors: totals.errors,
    finishedAt: new Date().toISOString(),
    message: `Phase J complete — ${totals.verified} verified, ${totals.direct} direct candidates, ${totals.social} social-only, ${totals.evidence} evidence-only.`,
  });
  await setActiveJob("phase-j-pass", "");
}

router.get("/pipeline/phase-j/status", async (_req: Request, res: Response): Promise<void> => {
  try {
    const [latestRun, latestCheckpoint, stateCounts, evidenceCounts] = await Promise.all([
      db.select().from(enrichmentRunsTable).orderBy(desc(enrichmentRunsTable.id)).limit(1),
      db.select().from(phaseJCheckpointsTable).orderBy(desc(phaseJCheckpointsTable.id)).limit(1),
      db.execute(sql`SELECT COALESCE(last_outcome, 'never_attempted') AS outcome, COUNT(*)::int AS count FROM enrichment_state GROUP BY last_outcome ORDER BY count DESC`),
      db.execute(sql`SELECT validation_status, vector_type, COUNT(*)::int AS count FROM contact_evidence GROUP BY validation_status, vector_type ORDER BY validation_status, vector_type`),
    ]);
    res.json({
      phase: "J",
      implementation: { J0: true, J1: true, J2: true, J3: true, J4: true, J5: true, J6: true, J7: true, J8: true, J9: true },
      latestRun: latestRun[0] ?? null,
      latestCheckpoint: latestCheckpoint[0] ?? null,
      stateCounts: stateCounts.rows,
      evidenceCounts: evidenceCounts.rows,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Phase J status unavailable" });
  }
});

router.post("/ingest/phase-j-pass", async (req: Request, res: Response): Promise<void> => {
  const existing = await getActiveJob("phase-j-pass");
  if (existing) {
    res.status(409).json({ error: "A Phase J pass is already running.", jobId: existing });
    return;
  }
  const requested = Math.min(Math.max(Number(req.body?.batchSize) || 25, 1), 100);
  const pass = String(req.body?.pass ?? "retry");
  const jobId = await createJob("phase-j-pass");
  const entities = await db
    .select({
      id: entitiesTable.id, name: entitiesTable.name, type: entitiesTable.type,
      nationality: entitiesTable.nationality, sourceRegistries: entitiesTable.sourceRegistries,
      knownResidences: entitiesTable.knownResidences, metadata: entitiesTable.metadata,
      notes: entitiesTable.notes, email: entitiesTable.email, phone: entitiesTable.phone,
      linkedinUrl: entitiesTable.linkedinUrl, twitterHandle: entitiesTable.twitterHandle,
      instagramHandle: entitiesTable.instagramHandle, telegramHandle: entitiesTable.telegramHandle,
      passNumber: sql<number>`COALESCE(${enrichmentStateTable.passNumber}, 0)`,
    })
    .from(entitiesTable)
    .leftJoin(enrichmentStateTable, eq(enrichmentStateTable.entityId, entitiesTable.id))
    .where(sql`
      ${entitiesTable.type} IN ('HNWI', 'Gatekeeper', 'Corporation', 'Trust')
      AND COALESCE(${entitiesTable.contactOutcome}, 'none') <> 'direct_contact_verified'
      AND ( ${enrichmentStateTable.nextAttemptAt} IS NULL OR ${enrichmentStateTable.nextAttemptAt} <= NOW() )
    `)
    .orderBy(desc(entitiesTable.isHot), desc(entitiesTable.bayesianScore))
    .limit(requested);
  if (!entities.length) {
    res.json({ jobId: null, total: 0, message: "No Phase J candidates are currently due." });
    return;
  }
  const run = await db.insert(enrichmentRunsTable).values({
    source: "phase-j",
    pass,
    cohort: "due-candidates",
    totalSelected: entities.length,
  }).returning({ id: enrichmentRunsTable.id });
  const runId = run[0]!.id;
  await setActiveJob("phase-j-pass", jobId);
  await updateJob(jobId, { status: "queued", total: entities.length, message: `Phase J ${pass} pass queued.` });
  void runPhaseJPass(jobId, runId, entities).catch(async (error) => {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, "Phase J pass crashed");
    await db.update(enrichmentRunsTable).set({ finishedAt: new Date(), errors: entities.length, notes: "Pass crashed before completion." }).where(eq(enrichmentRunsTable.id, runId));
    await updateJob(jobId, { status: "failed", message: error instanceof Error ? error.message : "Phase J pass failed" });
    await setActiveJob("phase-j-pass", "");
  });
  res.status(202).json({ jobId, runId, total: entities.length, pass, pollUrl: `/api/ingest/job/${jobId}` });
});

router.post("/pipeline/phase-j/checkpoint", async (req: Request, res: Response): Promise<void> => {
  const name = String(req.body?.name ?? `phase-j-${new Date().toISOString()}`);
  const rows = await db.execute(sql`
    SELECT COALESCE(contact_outcome, 'none') AS outcome, COUNT(*)::int AS count
    FROM entities GROUP BY contact_outcome
  `);
  const counts: Record<string, number> = {};
  for (const row of rows.rows as Array<{ outcome: string; count: number }>) counts[row.outcome] = Number(row.count);
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const checkpoint = await db.insert(phaseJCheckpointsTable).values({
    name,
    totalEntities: total,
    directCandidate: counts.direct_contact_candidate ?? 0,
    directVerified: counts.direct_contact_verified ?? 0,
    socialOnly: counts.social_only ?? 0,
    organizationContact: counts.organization_contact ?? 0,
    evidenceOnly: counts.evidence_only ?? 0,
    noneCount: counts.none ?? 0,
    notes: "Snapshot of the current Phase J funnel; verified contacts are counted separately from candidates.",
  }).returning();
  res.status(201).json(checkpoint[0]);
});

export default router;