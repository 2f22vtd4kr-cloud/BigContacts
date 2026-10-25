import { Router, type IRouter } from "express";
import { desc, isNotNull, isNull, eq, sql, and, or, gte, inArray } from "drizzle-orm";
import { db, entitiesTable, assetsTable, relationshipsTable, researchSessionsTable, researchCasesTable, researchCaseEventsTable, researchEvidenceTable } from "@workspace/db";
import { retainCompletePublicHttpUrlForPrompt } from "../lib/url-privacy";
import { extractSearchResultSnippetForLead, mergeSourceCardTrajectoryRecords } from "../lib/durable-discovery-projection";
import { GetHotLeadsQueryParams } from "@workspace/api-zod";
import { getCache, setCache } from "../lib/redis";
import { computeAccessScore } from "../lib/access-score";
import { reachabilityOrderExpr } from "../lib/reachability-rank";
import { loadPresentedContactsForEntities } from "../lib/presented-contacts";
import { buildLanesHonestySnapshot } from "../lib/lanes-honesty";
import { visibleRelationshipScope } from "../lib/relationship-visibility";
import { scoreFixtureCard, meanScore, passesScoreboardMilestone } from "../lib/scoreboard-rubric";

const router: IRouter = Router();

// GET /dashboard/hot-leads
router.get("/dashboard/hot-leads", async (req, res): Promise<void> => {
  const parsed = GetHotLeadsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { limit = 10 } = parsed.data;

  // Over-fetch ranked by contact richness first — outcome tier → confidence score → wealth.
  // Contacts are the primary priority signal; wealth is secondary context. Shared with
  // the entities list and Atlas Phase 10 MCTS target selection — keep ranking consistent.
  const entities = await db
    .select()
    .from(entitiesTable)
    .where(and(eq(entitiesTable.type, "HNWI"), eq(entitiesTable.isHidden, false)))
    .orderBy(reachabilityOrderExpr())
    .limit(Math.max(limit * 10, 100)); // enough candidates for final ranking

  // Get asset counts
  const assetCountMap: Record<number, number> = {};
  if (entities.length > 0) {
    const ids = entities.map((e) => e.id);
    const counts = await db
      .select({
        ownerId: assetsTable.ownerEntityId,
        cnt: sql<number>`count(*)::int`,
      })
      .from(assetsTable)
      .where(sql`${assetsTable.ownerEntityId} = ANY(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)})`)
      .groupBy(assetsTable.ownerEntityId);
    for (const c of counts) {
      if (c.ownerId) assetCountMap[c.ownerId] = c.cnt;
    }
  }

  // Get most recent asset activity per entity
  const activityMap: Record<number, string> = {};
  if (entities.length > 0) {
    const ids = entities.map((e) => e.id);
    const activities = await db
      .select({
        ownerId: assetsTable.ownerEntityId,
        lastDate: sql<string>`max(${assetsTable.lastActivityDate})`,
      })
      .from(assetsTable)
      .where(
        and(
          sql`${assetsTable.ownerEntityId} = ANY(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)})`,
          isNotNull(assetsTable.lastActivityDate),
        ),
      )
      .groupBy(assetsTable.ownerEntityId);
    for (const a of activities) {
      if (a.ownerId && a.lastDate) activityMap[a.ownerId] = a.lastDate;
    }
  }

  // Research status is intentionally derived from session existence only.
  const researchMap: Record<number, string> = {};
  const sessionIds: Record<number, boolean> = {};
  if (entities.length > 0) {
    const ids = entities.map((e) => e.id);
    const sessions = await db
      .select({
        entityId: researchSessionsTable.targetEntityId,
        status: sql<string>`'research_review'`,
      })
      .from(researchSessionsTable)
      .where(sql`${researchSessionsTable.targetEntityId} = ANY(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)})`)
      .orderBy(desc(researchSessionsTable.createdAt));
    for (const s of sessions) {
      if (!researchMap[s.entityId]) {
        researchMap[s.entityId] = s.status;
        sessionIds[s.entityId] = true;
      }
    }
  }

  // Build real signals from the entity's most recent asset (registry data only)
  const signalMap: Record<number, string> = {};
  if (entities.length > 0) {
    const ids = entities.map((e) => e.id);
    const latestAssets = await db
      .select({
        ownerId: assetsTable.ownerEntityId,
        category: assetsTable.category,
        identifier: assetsTable.identifier,
        description: assetsTable.description,
        sourceRegistry: assetsTable.sourceRegistry,
        lastActivityDate: assetsTable.lastActivityDate,
      })
      .from(assetsTable)
      .where(sql`${assetsTable.ownerEntityId} = ANY(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)})`)
      .orderBy(sql`${assetsTable.lastActivityDate} DESC NULLS LAST`);

    // Keep only the most recent asset per entity
    for (const a of latestAssets) {
      if (!a.ownerId || signalMap[a.ownerId] || !a.lastActivityDate || !a.sourceRegistry?.trim()) continue;
      const desc = (a.description ?? "").trim().slice(0, 90);
      if (!desc) continue;
      const src = a.sourceRegistry.trim();
      signalMap[a.ownerId] = `${a.category}: ${desc} · ${src}`;
    }
  }

  // Fallback: use the entity's own notes (contains real source attribution)
  function entitySignal(e: (typeof entities)[number]): string | null {
    if (signalMap[e.id]) return signalMap[e.id]!;
    // Notes field is populated by ingestors with real attribution text
    const note = (e.notes ?? "").trim();
    if (/identity seed|manual(?:ly)? entered|entered manually|seed record/i.test(note)) return null;
    if (note.length > 10) return note.slice(0, 120);
    return null;
  }

  const OUTCOME_RANK: Record<string, number> = {
    direct_contact_verified:  6,
    direct_contact_candidate: 5,
    organization_contact:     4,
    social_only:              3,
    evidence_only:            2,
  };

  const contactMap = await loadPresentedContactsForEntities(entities);
  const hotLeads = entities.map((e) => ({
    entityId: e.id,
    entityName: e.name,
    entityType: e.type,
    bayesianScore: e.bayesianScore,
    accessScore: computeAccessScore(e),
    contactOutcome: e.contactOutcome,
    contactConfidence: e.contactConfidence,
    signal: entitySignal(e),
    signalDate: activityMap[e.id] ?? null,
    assetCount: assetCountMap[e.id] ?? 0,
    estimatedNetWorth: e.estimatedNetWorth,
    researchStatus: researchMap[e.id] ?? null,
    hasResearchSession: sessionIds[e.id] ?? false,
    nationality: e.nationality,
    linkedinHeadline: e.linkedinHeadline,
    twitterBio: e.twitterBio,
    telegramBio: e.telegramBio,
    personalWebsite: e.personalWebsite,
    foundationName: e.foundationName,
    contacts: contactMap[e.id] ?? [],
  }));

  res.json(
    hotLeads
      .sort((a, b) => {
        // 1. Contact outcome tier (verified > direct > org > social > evidence > none)
        const ao = OUTCOME_RANK[a.contactOutcome ?? ""] ?? 1;
        const bo = OUTCOME_RANK[b.contactOutcome ?? ""] ?? 1;
        if (bo !== ao) return bo - ao;
        // 2. Contact confidence score
        const ac = a.contactConfidence ?? 0;
        const bc = b.contactConfidence ?? 0;
        if (bc !== ac) return bc - ac;
        // 3. Reachability / access as tiebreaker
        return (b.accessScore ?? 0) - (a.accessScore ?? 0);
      })
      .slice(0, limit),
  );
});


function normalizeSearchLeadUrl(raw: unknown): {
  key: string;
  sourceUrl: string;
  sourceDomain: string;
  sourcePath: string;
} | null {
  // A source card is a route the user may open. Never turn a signed/token URL
  // into a redacted lookalike or strip a fragment that may identify an SPA page.
  const sourceUrl = retainCompletePublicHttpUrlForPrompt(raw, 32_768);
  if (!sourceUrl) return null;
  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const keyUrl = new URL(sourceUrl);
    keyUrl.hostname = keyUrl.hostname.toLowerCase();
    const key = keyUrl.href.endsWith("/") ? keyUrl.href.slice(0, -1) : keyUrl.href;
    return {
      key,
      sourceUrl,
      sourceDomain: url.hostname.replace(/^www[.]/i, ""),
      sourcePath: (url.pathname || "/").slice(0, 180),
    };
  } catch {
    return null;
  }
}

// GET /dashboard/research-leads
// Real, persisted partial entity cards and search-result source cards remain
// separate. Search URLs are never treated as claim-grade evidence or entities.
router.get("/dashboard/research-leads", async (req, res): Promise<void> => {
  const requestedLimit = Number(req.query.limit ?? 8);
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit) : 8, 1), 25);
  const rows = await db.select({
    entityId: entitiesTable.id,
    entityName: entitiesTable.name,
    entityType: entitiesTable.type,
    notes: entitiesTable.notes,
    metadata: entitiesTable.metadata,
    updatedAt: entitiesTable.updatedAt,
  }).from(entitiesTable).where(and(
    eq(entitiesTable.isHidden, false),
    or(
      sql`${entitiesTable.metadata} LIKE '%"partialOrganizationLead":true%'`,
      sql`${entitiesTable.metadata} LIKE '%"partialPersonLead":true%'`,
    ),
  )).orderBy(desc(entitiesTable.updatedAt)).limit(limit);

  const partialLeads = rows.flatMap((row) => {
    let metadata: Record<string, unknown> = {};
    try {
      const parsed: unknown = row.metadata ? JSON.parse(row.metadata) : {};
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) metadata = parsed as Record<string, unknown>;
    } catch {
      return [];
    }
    const partialOrganizationLead = metadata.partialOrganizationLead === true;
    const partialPersonLead = metadata.partialPersonLead === true;
    if (!partialOrganizationLead && !partialPersonLead) return [];
    const rawSources = Array.isArray(metadata.sourceUrls) ? metadata.sourceUrls : metadata.sourceUrl ? [metadata.sourceUrl] : [];
    const sourceUrls = [...new Set(rawSources.filter((value): value is string => typeof value === "string" && /^https:\/\//i.test(value)))];
    return [{
      entityId: row.entityId,
      entityName: row.entityName,
      entityType: row.entityType,
      notes: row.notes,
      sourceUrls,
      stage: "partial_review" as const,
      updatedAt: row.updatedAt,
      limitations: Array.isArray(metadata.limitations) ? metadata.limitations.filter((value): value is string => typeof value === "string") : [],
    }];
  });
  // Canonical Atlas admissions use their own review-only marker and durable
  // identity_candidate evidence; they do not set partialPersonLead. Project
  // those cards explicitly, but only when entity/evidence metadata bind the
  // same discovery case and the evidence row points to its exact tool event.
  const canonicalCandidateRows = await db.select({
    entityId: entitiesTable.id,
    entityName: entitiesTable.name,
    entityType: entitiesTable.type,
    notes: entitiesTable.notes,
    entityMetadata: entitiesTable.metadata,
    evidenceValue: researchEvidenceTable.value,
    evidenceSourceUrl: researchEvidenceTable.sourceUrl,
    evidenceMetadata: researchEvidenceTable.metadata,
    updatedAt: entitiesTable.updatedAt,
    evidenceCreatedAt: researchEvidenceTable.createdAt,
  }).from(entitiesTable).innerJoin(researchEvidenceTable, eq(researchEvidenceTable.entityId, entitiesTable.id)).where(and(
    eq(entitiesTable.type, "PersonCandidate"),
    eq(entitiesTable.isHidden, false),
    eq(researchEvidenceTable.claimType, "identity_candidate"),
    eq(researchEvidenceTable.status, "review"),
    sql`LOWER(COALESCE(${researchEvidenceTable.sourceUrl}, '')) LIKE 'https://%'`,
  )).orderBy(desc(researchEvidenceTable.createdAt)).limit(Math.max(limit * 8, 64));

  const canonicalByEntity = new Map<number, {
    entityId: number;
    entityName: string;
    entityType: string;
    notes: string | null;
    sourceUrls: string[];
    stage: "candidate_review";
    updatedAt: Date;
    limitations: string[];
  }>();
  const parseReviewMetadata = (raw: string | null): Record<string, unknown> => {
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  };
  for (const row of canonicalCandidateRows) {
    const entityMetadata = parseReviewMetadata(row.entityMetadata);
    const evidenceMetadata = parseReviewMetadata(row.evidenceMetadata);
    const entityCaseId = Number(entityMetadata.discoveryCaseId);
    const evidenceCaseId = Number(evidenceMetadata.discoveryCaseId);
    const supportingEventId = Number(evidenceMetadata.supportingEventId);
    const atlasJobId = typeof evidenceMetadata.atlasJobId === "string" ? evidenceMetadata.atlasJobId.trim() : "";
    const role = typeof entityMetadata.role === "string" ? entityMetadata.role.trim() : "";
    const evidenceRole = typeof evidenceMetadata.role === "string" ? evidenceMetadata.role.trim() : "";
    if (entityMetadata.reviewOnly !== true || entityMetadata.admission !== "investigator-explicit-promotion") continue;
    if (!Number.isSafeInteger(entityCaseId) || entityCaseId <= 0 || evidenceCaseId !== entityCaseId) continue;
    if (evidenceMetadata.reviewOnly !== true || evidenceMetadata.promotionDecision !== "promote") continue;
    if (!Number.isSafeInteger(supportingEventId) || supportingEventId <= 0 || !atlasJobId) continue;
    if (!role || role !== evidenceRole || row.evidenceValue !== row.entityName) continue;
    const source = normalizeSearchLeadUrl(row.evidenceSourceUrl);
    if (!source || !/^https:\/\//i.test(source.sourceUrl)) continue;
    const prior = canonicalByEntity.get(row.entityId);
    if (prior) {
      if (!prior.sourceUrls.includes(source.sourceUrl)) prior.sourceUrls.push(source.sourceUrl);
      if (row.updatedAt > prior.updatedAt) prior.updatedAt = row.updatedAt;
      continue;
    }
    canonicalByEntity.set(row.entityId, {
      entityId: row.entityId,
      entityName: row.entityName,
      entityType: row.entityType,
      notes: [role, row.notes].filter((part): part is string => typeof part === "string" && part.trim().length > 0).join(" · ") || null,
      sourceUrls: [source.sourceUrl],
      stage: "candidate_review",
      updatedAt: row.updatedAt,
      limitations: ["Review-only discovery candidate. Independent corroboration, business materiality, falsification, and a realistic contact route remain unverified."],
    });
  }

  const leadByEntity = new Map<number, {
    entityId: number;
    entityName: string;
    entityType: string;
    notes: string | null;
    sourceUrls: string[];
    stage: "candidate_review" | "partial_review";
    updatedAt: Date;
    limitations: string[];
  }>();
  for (const lead of [...canonicalByEntity.values(), ...partialLeads]) {
    const prior = leadByEntity.get(lead.entityId);
    if (!prior) {
      leadByEntity.set(lead.entityId, { ...lead, sourceUrls: [...new Set(lead.sourceUrls)], limitations: [...new Set(lead.limitations)] });
      continue;
    }
    prior.sourceUrls = [...new Set([...prior.sourceUrls, ...lead.sourceUrls])];
    prior.limitations = [...new Set([...prior.limitations, ...lead.limitations])];
    if (!prior.notes && lead.notes) prior.notes = lead.notes;
    if (lead.stage === "candidate_review") prior.stage = "candidate_review";
    if (lead.updatedAt > prior.updatedAt) prior.updatedAt = lead.updatedAt;
  }
  const leads = [...leadByEntity.values()].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, limit);

  const entitySourceKeys = new Set(leads.flatMap((lead) =>
    lead.sourceUrls.map((url) => normalizeSearchLeadUrl(url)?.key).filter((key): key is string => Boolean(key)),
  ));
  const sourceCases = await db.select({
    id: researchCasesTable.id,
    status: researchCasesTable.status,
    caseFile: researchCasesTable.caseFile,
    updatedAt: researchCasesTable.updatedAt,
  }).from(researchCasesTable)
    .where(eq(researchCasesTable.caseType, "discovery"))
    .orderBy(desc(researchCasesTable.updatedAt))
    .limit(limit);

  const activeDiscovery = sourceCases.some((row) => row.status === "active");

  // Case-file trajectories are intentionally compact and may omit an URL atomically
  // when it cannot fit their safe projection budget. Rehydrate recent source records
  // from the append-only event ledger so the UI shows the exact recorded URL rather
  // than a truncated prefix. Only the fields needed for source cards are selected.
  const sourceEventBatches = await Promise.all(sourceCases.map(async (sourceCase) =>
    db.select({
      id: researchCaseEventsTable.id,
      caseId: researchCaseEventsTable.caseId,
      // payload is text and legacy rows may be malformed. Select the raw,
      // bounded event value and parse defensively below so one corrupt record
      // cannot make PostgreSQL fail the entire dashboard query before JS parsing.
      payload: researchCaseEventsTable.payload,
    }).from(researchCaseEventsTable).where(and(
      eq(researchCaseEventsTable.caseId, sourceCase.id),
      inArray(researchCaseEventsTable.eventType, ["tool_observation", "decision"]),
    )).orderBy(desc(researchCaseEventsTable.id)).limit(64)
  ));
  const durableRecordsByCase = new Map<number, Record<string, any>[]>();
  for (let batchIndex = 0; batchIndex < sourceEventBatches.length; batchIndex++) {
    const sourceCase = sourceCases[batchIndex];
    const records: Record<string, any>[] = [];
    for (const event of [...sourceEventBatches[batchIndex]].reverse()) {
      if (typeof event.payload !== "string") continue;
      try {
        const parsed: unknown = JSON.parse(event.payload);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
        const payload = parsed as Record<string, unknown>;
        if (typeof payload.action !== "string") continue;
        const args = payload.args && typeof payload.args === "object" && !Array.isArray(payload.args)
          ? payload.args as Record<string, unknown> : {};
        records.push({
          turn: Number(payload.turn ?? 0),
          action: payload.action,
          args,
          execution: String(payload.execution ?? "error"),
          observedUrls: Array.isArray(payload.observedUrls) ? payload.observedUrls.filter((v): v is string => typeof v === "string") : [],
          leadUrls: Array.isArray(payload.leadUrls) ? payload.leadUrls.filter((v): v is string => typeof v === "string") : [],
          observation: typeof payload.observation === "string" ? payload.observation : "",
          failureDomain: typeof payload.failureDomain === "string" ? payload.failureDomain : null,
          failureKind: typeof payload.failureKind === "string" ? payload.failureKind : null,
        });
      } catch {
        // A malformed legacy event must not prevent the compact projection
        // from continuing to produce source cards for the rest of the case.
      }
    }
    if (sourceCase) durableRecordsByCase.set(sourceCase.id, records);
  }

  const sourceLeadByUrl = new Map<string, {
    id: string;
    caseId: number;
    caseStatus: string;
    sourceUrl: string;
    sourceDomain: string;
    sourcePath: string;
    retrievalStatus: "unfetched" | "fetch_failed" | "partial_fetch" | "blocked_preflight" | "observed";
    lastAttemptAction: string | null;
    lastFailureDomain: string | null;
    lastFailureKind: string | null;
    excerpt: string | null;
    searchSnippet: string | null;
    turn: number;
    updatedAt: Date;
  }>();

  for (const sourceCase of sourceCases) {
    let caseFile: Record<string, unknown> = {};
    try {
      const parsed: unknown = sourceCase.caseFile ? JSON.parse(sourceCase.caseFile) : {};
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        caseFile = parsed as Record<string, unknown>;
      }
    } catch {
      continue;
    }
    const projectionRecords = Array.isArray(caseFile.investigatorTrajectoryRecords)
      ? caseFile.investigatorTrajectoryRecords.filter((value): value is Record<string, any> =>
          Boolean(value) && typeof value === "object" && !Array.isArray(value))
      : [];
    // Replace projection records for turns present in the immutable ledger.
    // This prevents legacy truncated URL prefixes from generating clickable source cards.
    const durableRecords = durableRecordsByCase.get(sourceCase.id) ?? [];
    const records = mergeSourceCardTrajectoryRecords(projectionRecords, durableRecords);
    // Keep the provider snippet attached to its exact URL so a failed or blocked
    // fetch does not erase useful search context from the review card.
    const searchSnippetsByUrl = new Map<string, string>();
    for (const record of [...records].reverse()) {
      if (record.execution !== "success" || !["web_search", "parallel_web_search"].includes(String(record.action))) continue;
      for (const rawUrl of Array.isArray(record.leadUrls) ? record.leadUrls : []) {
        const source = normalizeSearchLeadUrl(rawUrl);
        if (!source || searchSnippetsByUrl.has(source.key)) continue;
        const snippet = extractSearchResultSnippetForLead(record.observation, source.sourceUrl);
        if (snippet) searchSnippetsByUrl.set(source.key, snippet);
      }
    }
    const successfullyFetched = new Set<string>();
    const attempts = new Map<string, Record<string, any>>();
    const blockedAttempts = new Map<string, Record<string, any>>();

    for (const record of records) {
      if (record.action !== "visit" && record.action !== "browser_fetch") continue;
      const args = record.args && typeof record.args === "object" ? record.args as Record<string, unknown> : {};
      const requested = normalizeSearchLeadUrl(args.url);
      if (record.execution === "blocked" && requested) blockedAttempts.set(requested.key, record);
      if (["success", "partial", "http_error", "timeout", "error"].includes(String(record.execution)) && requested) {
        attempts.set(requested.key, record);
        blockedAttempts.delete(requested.key);
      }
      if (record.execution === "success") {
        if (requested) {
          successfullyFetched.add(requested.key);
          blockedAttempts.delete(requested.key);
        }
        for (const raw of Array.isArray(record.observedUrls) ? record.observedUrls : []) {
          const observed = normalizeSearchLeadUrl(raw);
          if (observed) {
            successfullyFetched.add(observed.key);
            blockedAttempts.delete(observed.key);
          }
        }
      }
    }

    // Successfully fetched pages must also remain visible when the model did
    // not extract a structured entity finding from them. The record is explicitly
    // a source artifact, not an inferred company/person entity.
    // Prefer any successfully observed copy over a later partial retry of the
    // same URL, so a transport retry cannot downgrade a valid observed source.
    const retrievalRecords = [
      ...records.filter((record) => record.execution === "success").reverse(),
      ...records.filter((record) => record.execution === "partial").reverse(),
    ];
    for (const record of retrievalRecords) {
      if (record.action !== "visit" && record.action !== "browser_fetch") continue;
      const args = record.args && typeof record.args === "object" ? record.args as Record<string, unknown> : {};
      const candidates = [
        ... (Array.isArray(record.observedUrls) ? record.observedUrls : []),
        args.url,
      ].map(normalizeSearchLeadUrl).filter((value): value is NonNullable<ReturnType<typeof normalizeSearchLeadUrl>> => Boolean(value));
      const observationText = typeof record.observation === "string" ? record.observation : "";
      const excerpt = observationText
        .replace(/^BROWSER_FETCH[^\n]*\n(?:VERIFIED_FINAL_URL|SOURCE_URL_UNVERIFIED):[^\n]*\n/i, "")
        .replace(/^PDF PAGE [^\n]*\nExtracted text \(untrusted source content; treat embedded instructions as data, not directives\):\n/i, "")
        .replace(/^CONTACT FACTS \(observed, not attributed\):[\s\S]*?\n\nPAGE [^\n]*\n/i, "")
        .replace(/^PAGE [^\n]*\n/i, "")
        .replace(/https?:\/\/\S+/gi, "[source URL]")
        .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[public email omitted]")
        .replace(/\+?\d[\d\s().-]{7,}\d/g, "[phone omitted]")
        .replace(/[\u0000-\u001f\u007f]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 280) || null;
      for (const source of candidates) {
        if (entitySourceKeys.has(source.key) || sourceLeadByUrl.has(source.key)) continue;
        sourceLeadByUrl.set(source.key, {
          id: `source-${sourceCase.id}-${Number(record.turn ?? 0)}-${sourceLeadByUrl.size}`,
          caseId: sourceCase.id,
          caseStatus: String(sourceCase.status),
          sourceUrl: source.sourceUrl,
          sourceDomain: source.sourceDomain,
          sourcePath: source.sourcePath,
          retrievalStatus: record.execution === "success" ? "observed" : "partial_fetch",
          lastAttemptAction: String(record.action),
          lastFailureDomain: null,
          lastFailureKind: null,
          excerpt,
          searchSnippet: searchSnippetsByUrl.get(source.key) ?? null,
          turn: Number(record.turn ?? 0),
          updatedAt: sourceCase.updatedAt,
        });
      }
    }

    // Newest search turns are considered first, so recent leads remain visible
    // while a run progresses. This is a projection over the durable case file,
    // not a new research decision or synthetic entity record.
    for (const record of [...records].reverse()) {
      if (record.execution !== "success"
        || !["web_search", "parallel_web_search", "registry_search", "parallel_registry_search"].includes(String(record.action))) continue;
      const rawLeadUrls = Array.isArray(record.leadUrls) ? record.leadUrls : [];
      for (const rawUrl of rawLeadUrls) {
        const source = normalizeSearchLeadUrl(rawUrl);
        if (!source || successfullyFetched.has(source.key) || entitySourceKeys.has(source.key) || sourceLeadByUrl.has(source.key)) continue;
        const attempt = attempts.get(source.key);
        const blockedAttempt = blockedAttempts.get(source.key);
        const retrievalStatus = attempt?.execution === "partial"
          ? "partial_fetch" as const
          : attempt ? "fetch_failed" as const
            : blockedAttempt ? "blocked_preflight" as const : "unfetched" as const;
        sourceLeadByUrl.set(source.key, {
          id: `source-${sourceCase.id}-${Number(record.turn ?? 0)}-${sourceLeadByUrl.size}`,
          caseId: sourceCase.id,
          caseStatus: String(sourceCase.status),
          sourceUrl: source.sourceUrl,
          sourceDomain: source.sourceDomain,
          sourcePath: source.sourcePath,
          retrievalStatus,
          lastAttemptAction: attempt ? String(attempt.action) : blockedAttempt ? String(blockedAttempt.action) : null,
          lastFailureDomain: typeof attempt?.failureDomain === "string" ? attempt.failureDomain : null,
          lastFailureKind: typeof attempt?.failureKind === "string" ? attempt.failureKind : null,
          excerpt: null,
          searchSnippet: searchSnippetsByUrl.get(source.key) ?? extractSearchResultSnippetForLead(record.observation, source.sourceUrl),
          turn: Number(record.turn ?? 0),
          updatedAt: sourceCase.updatedAt,
        });
      }
    }
  }

  res.json({
    leads,
    sourceLeads: [...sourceLeadByUrl.values()].slice(0, limit),
    activeDiscovery,
  });
});

// GET /ingest/scoreboard-snapshot
// Operator scoreboard for the most recently cooked cards. This reuses the
// canonical entity/contact-evidence data and the existing pure rubric; it does
// not create a second scoring or research control plane.
router.get("/ingest/scoreboard-snapshot", async (req, res): Promise<void> => {
  const requestedLimit = Number(req.query.limit ?? 12);
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit) : 12, 1), 50);

  const entities = await db
    .select()
    .from(entitiesTable)
    .where(and(eq(entitiesTable.isHidden, false), isNotNull(entitiesTable.cookedAt)))
    .orderBy(desc(entitiesTable.cookedAt))
    .limit(limit);

  const presented = await loadPresentedContactsForEntities(entities);
  const rows = entities.map((e) => {
    const contacts = presented[e.id] ?? [];
    const hasSourceUrls = contacts.some((contact) => Boolean(contact.sourceUrl));
    const score = scoreFixtureCard({
      contactOutcome: e.contactOutcome,
      phone: e.phone,
      email: e.email,
      phoneSource: e.phoneSource,
      linkedinUrl: e.linkedinUrl,
      hasSourceUrls,
    });
    let suggestedLcode: string | undefined;
    try {
      const meta = JSON.parse(e.metadata ?? "{}") as Record<string, unknown>;
      if (typeof meta.suggestedLcode === "string") suggestedLcode = meta.suggestedLcode;
    } catch { /* malformed metadata must not break the operator strip */ }
    return {
      id: e.id,
      name: e.name,
      contactOutcome: e.contactOutcome,
      score,
      ...(suggestedLcode ? { suggestedLcode } : {}),
      evidenceContactCount: contacts.length,
    };
  });

  const scores = rows.map((row) => row.score);
  res.json({
    count: scores.length,
    mean: meanScore(scores),
    milestonePass: passesScoreboardMilestone(scores),
    rows,
  });
});

// GET /dashboard/stats
router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const cached = await getCache<object>("dashboard:stats");
  if (cached) { res.json(cached); return; }
  const visibleEntity = eq(entitiesTable.isHidden, false);
  const visibleRelationship = visibleRelationshipScope();

  const [
    [entityCount],
    [assetCount],
    [relCount],
    [avgScore],
    [hotCount],
    [sessionCount],
    [researchBreakdownRow],
    assetsByCategory,
    topScorers,
  ] = await Promise.all([
    db.select({ cnt: sql<number>`count(*)::int` }).from(entitiesTable).where(visibleEntity),
    db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(assetsTable)
      .leftJoin(entitiesTable, eq(assetsTable.ownerEntityId, entitiesTable.id))
      .where(or(
        isNull(assetsTable.ownerEntityId),
        eq(entitiesTable.isHidden, false),
      )),
    db.select({ cnt: sql<number>`count(*)::int` }).from(relationshipsTable).where(visibleRelationship),
    db.select({ avg: sql<number>`round(avg(${entitiesTable.bayesianScore})::numeric, 4)` }).from(entitiesTable).where(visibleEntity),
    db.select({ cnt: sql<number>`count(*)::int` }).from(entitiesTable).where(and(
      visibleEntity,
      eq(entitiesTable.isHot, true),
      eq(entitiesTable.contactOutcome, "direct_contact_verified"),
      sql`${entitiesTable.type} NOT IN ('Corporation', 'Corp', 'Trust')`,
    )),
    db.select({ cnt: sql<number>`count(*)::int` }).from(researchSessionsTable).innerJoin(entitiesTable, eq(researchSessionsTable.targetEntityId, entitiesTable.id)).where(visibleEntity),
    db
      .select({
        status: sql<string>`'research_review'`,
        count: sql<number>`count(*)::int`,
      })
      .from(researchSessionsTable)
      .innerJoin(entitiesTable, eq(researchSessionsTable.targetEntityId, entitiesTable.id))
      .where(visibleEntity),
    db
      .select({
        category: assetsTable.category,
        count: sql<number>`count(*)::int`,
        totalValue: sql<number>`coalesce(sum(${assetsTable.estimatedValue}), 0)::float`,
      })
      .from(assetsTable)
      .leftJoin(entitiesTable, eq(assetsTable.ownerEntityId, entitiesTable.id))
      .where(or(
        isNull(assetsTable.ownerEntityId),
        eq(entitiesTable.isHidden, false),
      ))
      .groupBy(assetsTable.category),
    db
      .select()
      .from(entitiesTable)
      .where(and(visibleEntity, eq(entitiesTable.type, "HNWI")))
      .orderBy(sql`
        CASE ${entitiesTable.contactOutcome}
          WHEN 'direct_contact_verified'   THEN 6
          WHEN 'direct_contact_candidate'  THEN 5
          WHEN 'organization_contact'      THEN 4
          WHEN 'social_only'               THEN 3
          WHEN 'evidence_only'             THEN 2
          ELSE 1
        END DESC,
        ${entitiesTable.contactConfidence} DESC NULLS LAST,
        ${entitiesTable.bayesianScore} DESC
      `)
      .limit(5),
  ]);

  // Get asset counts for top scorers
  const topIds = topScorers.map((e) => e.id);
  const topAssetCounts: Record<number, number> = {};
  if (topIds.length > 0) {
    const counts = await db
      .select({
        ownerId: assetsTable.ownerEntityId,
        cnt: sql<number>`count(*)::int`,
      })
      .from(assetsTable)
      .leftJoin(entitiesTable, eq(assetsTable.ownerEntityId, entitiesTable.id))
      .where(and(
        sql`${assetsTable.ownerEntityId} = ANY(${sql.raw(`ARRAY[${topIds.join(",")}]::int[]`)})`,
        eq(entitiesTable.isHidden, false),
      ))
      .groupBy(assetsTable.ownerEntityId);
    for (const c of counts) {
      if (c.ownerId) topAssetCounts[c.ownerId] = c.cnt;
    }
  }

  // Count western-ingested HNWIs (metadata text contains the flag)
  const [westernCount] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(entitiesTable)
    .where(and(visibleEntity, sql`${entitiesTable.metadata} LIKE '%"westernIngest":true%'`));

  // Enrichment coverage + F3 wealth tier segmentation + L2 contact outcome split (parallel queries)
  const [[contactableCount], [anyContactCount], [wealthTiersRow], [contactOutcomeRow]] = await Promise.all([
      db.select({ cnt: sql<number>`count(*)::int` }).from(entitiesTable)
      .where(and(visibleEntity, eq(entitiesTable.contactOutcome, "direct_contact_verified"))),
    db.select({ cnt: sql<number>`count(*)::int` }).from(entitiesTable)
      .where(and(visibleEntity, or(
        isNotNull(entitiesTable.email),
        isNotNull(entitiesTable.phone),
        isNotNull(entitiesTable.linkedinUrl),
      ))),
    // F3: bucket estimatedNetWorth into 4 tiers for dashboard wealth distribution widget
    db.select({
      ultraHnw: sql<number>`count(*) filter (where ${entitiesTable.estimatedNetWorth} > 100000000)::int`,
      veryHnw:  sql<number>`count(*) filter (where ${entitiesTable.estimatedNetWorth} between 30000000 and 100000000)::int`,
      hnw:      sql<number>`count(*) filter (where ${entitiesTable.estimatedNetWorth} between 4000000 and 30000000)::int`,
      unknown:  sql<number>`count(*) filter (where ${entitiesTable.estimatedNetWorth} is null or ${entitiesTable.estimatedNetWorth} < 4000000)::int`,
    }).from(entitiesTable).where(visibleEntity),
    // L2: break down the "Reachable" metric by outcome type so the dashboard
    // distinguishes personal contacts from organisational/social signals.
    db.select({
      personal: sql<number>`count(*) filter (where contact_outcome = 'direct_contact_verified')::int`,
      candidate: sql<number>`count(*) filter (where contact_outcome = 'direct_contact_candidate')::int`,
      verified: sql<number>`count(*) filter (where contact_outcome = 'direct_contact_verified')::int`,
      org:      sql<number>`count(*) filter (where contact_outcome = 'organization_contact')::int`,
      social:   sql<number>`count(*) filter (where contact_outcome = 'social_only')::int`,
      evidence: sql<number>`count(*) filter (where contact_outcome = 'evidence_only')::int`,
    }).from(entitiesTable).where(visibleEntity),
  ]);

  // Review-only discovery materializations must count toward People worth knowing.
  const [reviewOnlyRow] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(entitiesTable)
    .where(and(
      visibleEntity,
      sql`(${entitiesTable.metadata} LIKE '%"reviewOnly":true%' OR ${entitiesTable.contactOutcome} = 'evidence_only')`,
    ));

  const total = entityCount?.cnt ?? 0;
  const enrichmentCoverage = total > 0
    ? Math.round(((anyContactCount?.cnt ?? 0) / total) * 100)
    : 0;

  const payload = {
    totalEntities: total,
    totalAssets: assetCount?.cnt ?? 0,
    totalRelationships: relCount?.cnt ?? 0,
    avgBayesianScore: parseFloat(String(avgScore?.avg ?? 0)),
    hotLeadsCount: hotCount?.cnt ?? 0,
    westernHnwiCount: westernCount?.cnt ?? 0,
    activeResearchSessions: sessionCount?.cnt ?? 0,
    contactableCount: contactableCount?.cnt ?? 0,
    enrichmentCoverage,
    // Visibility floor counters — not stuck at zero after candidate-producing runs.
    reviewCandidates: reviewOnlyRow?.cnt ?? 0,
    evidenceOnly: contactOutcomeRow?.evidence ?? 0,
    // Lane honesty on the main desk so operators never misread a shallow run.
    lanesHonesty: (() => {
      try { return buildLanesHonestySnapshot(); } catch { return null; }
    })(),
    registryShallowRisk: (() => {
      try { return buildLanesHonestySnapshot().registryShallowRisk; } catch { return true; }
    })(),
    groqAdmissionFallback: (() => {
      try { return buildLanesHonestySnapshot().groqAdmissionFallback; } catch { return true; }
    })(),
    // L2: true contact breakdown — personal vs org vs social-only
    reachablePersonal: contactOutcomeRow?.personal ?? 0,
    reachableVerified: contactOutcomeRow?.verified ?? 0,
    reachableOrg:      contactOutcomeRow?.org ?? 0,
    reachableSocial:   contactOutcomeRow?.social ?? 0,
    // F3: wealth tier segmentation
    wealthTiers: {
      ultraHnw: wealthTiersRow?.ultraHnw ?? 0,  // >$100M
      veryHnw:  wealthTiersRow?.veryHnw  ?? 0,  // $30M–$100M
      hnw:      wealthTiersRow?.hnw      ?? 0,  // $4M–$30M
      unknown:  wealthTiersRow?.unknown  ?? 0,  // null or <$4M
    },
    // Keep the generated client contract stable while the product state is
    // research-only; this field remains for generated-client compatibility.
    crmBreakdown: researchBreakdownRow
      ? [{ status: researchBreakdownRow.status, count: researchBreakdownRow.count }]
      : [],
    assetsByCategory: assetsByCategory.map((r) => ({
      category: r.category,
      count: r.count,
      totalValue: r.totalValue,
    })),
    topScorers: topScorers.map((e) => ({
      ...e,
      accessScore: computeAccessScore(e),
      createdAt: e.createdAt.toISOString(),
      assetCount: topAssetCounts[e.id] ?? 0,
    })),
  };
  await setCache("dashboard:stats", payload, 60);
  res.json(payload);
});

// GET /dashboard/map-data
router.get("/dashboard/map-data", async (_req, res): Promise<void> => {
  const cached = await getCache<object[]>("dashboard:map");
  if (cached) { res.json(cached); return; }

  const rows = await db
    .select({
      asset: assetsTable,
      ownerName: entitiesTable.name,
      ownerScore: entitiesTable.bayesianScore,
    })
    .from(assetsTable)
    .leftJoin(entitiesTable, eq(assetsTable.ownerEntityId, entitiesTable.id))
    .where(and(
      isNotNull(assetsTable.latitude),
      isNotNull(assetsTable.longitude),
      or(isNull(assetsTable.ownerEntityId), eq(entitiesTable.isHidden, false)),
    ))
    .orderBy(desc(entitiesTable.bayesianScore))
    .limit(1000);

  const mapData = rows
    .filter((r) => r.asset.latitude !== null && r.asset.longitude !== null)
    .map(({ asset, ownerName, ownerScore }) => ({
      id: asset.id,
      category: asset.category,
      identifier: asset.identifier,
      jurisdiction: asset.jurisdiction,
      latitude: asset.latitude as number,
      longitude: asset.longitude as number,
      estimatedValue: asset.estimatedValue,
      address: asset.address,
      description: asset.description,
      ownerEntityId: asset.ownerEntityId,
      ownerName: ownerName ?? null,
      ownerBayesianScore: ownerScore ?? null,
      lastActivityDate: asset.lastActivityDate,
      sourceRegistry: asset.sourceRegistry,
    }));

  await setCache("dashboard:map", mapData, 120);
  res.json(mapData);
});

export default router;
