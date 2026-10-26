import { and, eq, inArray, sql } from "drizzle-orm";
import { db, entitiesTable, researchCasesTable, researchCaseEventsTable, researchSessionsTable, researchEvidenceTable } from "@workspace/db";
import { bindExactSourceSpan } from "./research-epistemic-vnext";
import { isClaimGradeDiscoverySourceUrl } from "./candidate-source-url-union";
import { normalizeCandidateIdentityName } from "./identity-text-match";
import { sanitizeUrlForEvidence } from "./url-privacy";
import { delCachePattern } from "./redis";
import { logger } from "./logger";

function normalizeSource(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const safe = sanitizeUrlForEvidence(raw);
  if (!safe || safe.startsWith("[")) return null;
  try {
    const url = new URL(safe);
    if (url.protocol !== "https:") return null;
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    return url.href.endsWith("/") ? url.href.slice(0, -1) : url.href;
  } catch { return null; }
}
function parseObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string") return null;
  try { const parsed: unknown = JSON.parse(value); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null; } catch { return null; }
}

/**
 * Terminal reconciliation for company leads that were explicitly named by the
 * Investigator and appeared verbatim in a successful search observation, but
 * whose source page could not be fetched. These cards are always review-only;
 * search snippets never become supported claims or person admissions.
 */
export async function reconcileOrganizationReviewCardsForJob(jobId: string): Promise<{ cards: number; evidenceRows: number }> {
  const empty = { cards: 0, evidenceRows: 0 };
  const cases = await db.select({ id: researchCasesTable.id, caseFile: researchCasesTable.caseFile, caseType: researchCasesTable.caseType })
    .from(researchCasesTable)
    .where(and(eq(researchCasesTable.caseType, "discovery"), sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${jobId}`));
  let cards = 0;
  let evidenceRows = 0;
  for (const researchCase of cases) {
    const events = await db.select({ id: researchCaseEventsTable.id, eventType: researchCaseEventsTable.eventType, payload: researchCaseEventsTable.payload, createdAt: researchCaseEventsTable.createdAt })
      .from(researchCaseEventsTable)
      .where(and(eq(researchCaseEventsTable.caseId, researchCase.id), inArray(researchCaseEventsTable.eventType, ["tool_observation", "decision"])))
      .orderBy(researchCaseEventsTable.id);
    const findings = new Map<string, { name: string; urls: Set<string> }>();
    const observations: Array<{ action: string; execution: string; url: string; text: string; eventId: number; createdAt: Date }> = [];
    for (const event of events) {
      const payload = parseObject(event.payload);
      if (!payload || payload.jobId !== jobId) continue;
      if (Array.isArray(payload.findings)) {
        for (const raw of payload.findings) {
          if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
          const finding = raw as Record<string, unknown>;
          if (finding.scope !== "organization" || finding.vectorType !== "other" || finding.promotionDecision === "reject" || finding.personName || finding.role || typeof finding.value !== "string") continue;
          const name = finding.value.trim().replace(/\s+/g, " ");
          const identity = normalizeCandidateIdentityName(name);
          if (name.length < 3 || identity.length < 3) continue;
          const entry = findings.get(identity) ?? { name, urls: new Set<string>() };
          if (Array.isArray(finding.sourceUrls)) for (const rawUrl of finding.sourceUrls) {
            const url = normalizeSource(rawUrl);
            if (url && isClaimGradeDiscoverySourceUrl(url)) entry.urls.add(url);
          }
          findings.set(identity, entry);
        }
      }
      const searchLeadUrls = [
        ...(Array.isArray(payload.leadUrls) ? payload.leadUrls : []),
        ...(Array.isArray(payload.observedUrls) ? payload.observedUrls : []),
      ];
      if (event.eventType === "tool_observation" && payload.execution === "success" && /search/i.test(String(payload.action ?? ""))) {
        for (const rawUrl of searchLeadUrls) {
          const url = normalizeSource(rawUrl);
          if (!url || !isClaimGradeDiscoverySourceUrl(url)) continue;
          observations.push({ action: String(payload.action ?? ""), execution: String(payload.execution), url, text: String(payload.observation ?? ""), eventId: event.id, createdAt: event.createdAt });
        }
      }
    }
    for (const lead of findings.values()) {
      const supports = new Map<string, typeof observations[number]>();
      for (const observation of observations) {
        if (!lead.urls.has(observation.url)) continue;
        if (!bindExactSourceSpan(observation.text, lead.name)?.exact) continue;
        if (!supports.has(observation.url)) supports.set(observation.url, observation);
      }
      if (!supports.size) continue;
      const persisted = await db.transaction(async (tx) => {
        const [ownedCase] = await tx.select({ caseType: researchCasesTable.caseType, caseFile: researchCasesTable.caseFile })
          .from(researchCasesTable).where(eq(researchCasesTable.id, researchCase.id)).for("update").limit(1);
        if (!ownedCase || ownedCase.caseType !== "discovery" || parseObject(ownedCase.caseFile)?.jobId !== jobId) return { card: false, evidence: 0 };
        const existing = await tx.select({ id: entitiesTable.id, metadata: entitiesTable.metadata })
          .from(entitiesTable).where(and(eq(entitiesTable.type, "Corporation"), sql`LOWER(${entitiesTable.name}) = LOWER(${lead.name})`)).limit(32);
        const sameCase = existing.find((row) => {
          const meta = parseObject(row.metadata);
          return meta?.partialOrganizationLead === true && Number(meta.discoveryCaseId) === researchCase.id;
        });
        if (existing.length && !sameCase) return { card: false, evidence: 0 };
        const sourceUrls = [...supports.keys()];
        let entityId = sameCase?.id;
        if (!entityId) {
          const [created] = await tx.insert(entitiesTable).values({
            name: lead.name, type: "Corporation", bayesianScore: 0.05, contactConfidence: 0,
            contactOutcome: "evidence_only", isHot: false, isStarred: false, isHidden: false,
            sourceRegistries: JSON.stringify(["canonical-agentic-discovery"]),
            notes: "SEARCH-RESULT LEAD — exact organization name observed in a successful search result. Source page not verified as fetched evidence; fetch and corroborate before relying on details.",
            metadata: JSON.stringify({ reviewOnly: true, partialOrganizationLead: true, stage: "partial_review", admission: "source-observed-organization-name", verificationLevel: "search_result_lead", evidenceHierarchy: "unverified-search-lead", discoveryCaseId: researchCase.id, atlasJobId: jobId, sourceUrls, limitations: ["source page not fetched", "ownership/control not established", "business materiality not established", "no person or wealth conclusion"] }),
          }).returning({ id: entitiesTable.id });
          entityId = created?.id;
        } else {
          const prior = parseObject(sameCase?.metadata) ?? {};
          if (prior.verificationLevel === "fetched_source") return { card: false, evidence: 0 };
          await tx.update(entitiesTable).set({
            notes: "SEARCH-RESULT LEAD — exact organization name observed in a successful search result. Source page not verified as fetched evidence; fetch and corroborate before relying on details.",
            metadata: JSON.stringify({ ...prior, reviewOnly: true, partialOrganizationLead: true, stage: "partial_review", verificationLevel: "search_result_lead", evidenceHierarchy: "unverified-search-lead", discoveryCaseId: researchCase.id, atlasJobId: jobId, sourceUrls, limitations: ["source page not fetched", "ownership/control not established", "business materiality not established", "no person or wealth conclusion"] }),
            updatedAt: new Date(),
          }).where(eq(entitiesTable.id, entityId));
        }
        if (!entityId) return { card: false, evidence: 0 };
        let added = 0;
        for (const support of supports.values()) {
          const [priorEvidence] = await tx.select({ id: researchEvidenceTable.id })
            .from(researchEvidenceTable).where(and(eq(researchEvidenceTable.entityId, entityId), eq(researchEvidenceTable.claimType, "partial_organization_lead"), eq(researchEvidenceTable.sourceUrl, support.url))).limit(1);
          if (priorEvidence) continue;
          const [session] = await tx.insert(researchSessionsTable).values({
            targetEntityId: entityId, winningPath: JSON.stringify([{ sourceUrl: support.url, discoveryCaseId: researchCase.id, atlasJobId: jobId, status: "partial_review", verificationLevel: "search_result_lead" }]),
            notes: "Search-result company lead only; the linked page has not been verified as fetched evidence.",
            safeUseStatus: "manual_review", crmStatus: "Lead Gen",
          }).returning({ id: researchSessionsTable.id });
          if (!session?.id) throw new Error("Could not persist a review session for a company lead.");
          await tx.insert(researchEvidenceTable).values({
            sessionId: session.id, entityId, claimType: "partial_organization_lead",
            claim: "A successful search observation surfaced this exact organization name with an attributable source URL; this is an unverified lead, not fetched-page evidence.",
            value: lead.name, sourceName: "canonical-agentic-discovery", sourceUrl: support.url,
            sourceDomain: new URL(support.url).hostname, status: "review", confidence: 0.2,
            observedAt: support.createdAt, freshnessScore: 0.5,
            metadata: JSON.stringify({ partialReview: true, verificationLevel: "search_result_lead", evidenceTier: "unverified_search_result", discoveryCaseId: researchCase.id, atlasJobId: jobId, supportingEventId: support.eventId }),
          });
          added += 1;
        }
        return { card: !sameCase, evidence: added };
      }, { isolationLevel: "serializable" });
      if (persisted.card) cards += 1;
      evidenceRows += persisted.evidence;
    }
  }
  if (cards || evidenceRows) {
    await Promise.all([delCachePattern("entities:list:*").catch(() => undefined), delCachePattern("dashboard:*").catch(() => undefined)]);
    logger.info({ jobId, cards, evidenceRows }, "Reconciled review-only company leads from successful search observations.");
  }
  return { cards, evidenceRows };
}

/**
 * Preserve exact, source-attributed person/role leads as PersonCandidate cards
 * even when wealth potential is not established. This is review-only and does
 * not admit an HNWI, establish a personal contact route, or bypass target gates.
 */
export async function reconcilePersonReviewCardsForJob(jobId: string): Promise<{ cards: number; evidenceRows: number }> {
  const cases = await db.select({ id: researchCasesTable.id, caseFile: researchCasesTable.caseFile, caseType: researchCasesTable.caseType })
    .from(researchCasesTable)
    .where(and(eq(researchCasesTable.caseType, "discovery"), sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${jobId}`));
  let cards = 0;
  let evidenceRows = 0;
  for (const researchCase of cases) {
    const events = await db.select({ id: researchCaseEventsTable.id, eventType: researchCaseEventsTable.eventType, payload: researchCaseEventsTable.payload, createdAt: researchCaseEventsTable.createdAt })
      .from(researchCaseEventsTable)
      .where(and(eq(researchCaseEventsTable.caseId, researchCase.id), inArray(researchCaseEventsTable.eventType, ["tool_observation", "decision"])))
      .orderBy(researchCaseEventsTable.id);
    const findings = new Map<string, { name: string; role: string; urls: Set<string> }>();
    const observations: Array<{ url: string; text: string; eventId: number; createdAt: Date; verificationLevel: "fetched_source" | "search_result_lead" }> = [];
    for (const event of events) {
      const payload = parseObject(event.payload);
      if (!payload || payload.jobId !== jobId) continue;
      if (Array.isArray(payload.findings)) for (const raw of payload.findings) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
        const finding = raw as Record<string, unknown>;
        if (finding.scope !== "candidate" || finding.vectorType !== "other" || finding.promotionDecision === "reject"
          || typeof finding.personName !== "string" || typeof finding.role !== "string" || typeof finding.value !== "string") continue;
        const name = finding.personName.trim().replace(/\s+/g, " ");
        const role = finding.role.trim().replace(/\s+/g, " ");
        if (name.length < 3 || role.length < 2 || normalizeCandidateIdentityName(finding.value) !== normalizeCandidateIdentityName(name)) continue;
        const key = normalizeCandidateIdentityName(name) + "::" + normalizeCandidateIdentityName(role);
        const entry = findings.get(key) ?? { name, role, urls: new Set<string>() };
        if (Array.isArray(finding.sourceUrls)) for (const rawUrl of finding.sourceUrls) {
          const url = normalizeSource(rawUrl);
          if (url && isClaimGradeDiscoverySourceUrl(url)) entry.urls.add(url);
        }
        findings.set(key, entry);
      }
      if (event.eventType !== "tool_observation" || payload.execution !== "success") continue;
      const action = String(payload.action ?? "");
      const search = /search/i.test(action);
      const fetched = action === "visit" || action === "browser_fetch";
      if (!search && !fetched) continue;
      const rawUrls = [...(Array.isArray(payload.leadUrls) ? payload.leadUrls : []), ...(Array.isArray(payload.observedUrls) ? payload.observedUrls : [])];
      for (const rawUrl of rawUrls) {
        const url = normalizeSource(rawUrl);
        if (!url || !isClaimGradeDiscoverySourceUrl(url)) continue;
        observations.push({ url, text: String(payload.observation ?? ""), eventId: event.id, createdAt: event.createdAt, verificationLevel: fetched ? "fetched_source" : "search_result_lead" });
      }
    }
    for (const lead of findings.values()) {
      const supports = new Map<string, typeof observations[number]>();
      for (const observation of observations) {
        if (!lead.urls.has(observation.url)) continue;
        const span = bindExactSourceSpan(observation.text, lead.role, lead.name, 320);
        if (!span?.exact || !span.subjectMatched || !span.valueMatched) continue;
        const prior = supports.get(observation.url);
        if (!prior || (prior.verificationLevel === "search_result_lead" && observation.verificationLevel === "fetched_source")) supports.set(observation.url, observation);
      }
      if (!supports.size) continue;
      const persisted = await db.transaction(async (tx) => {
        const [ownedCase] = await tx.select({ caseType: researchCasesTable.caseType, caseFile: researchCasesTable.caseFile })
          .from(researchCasesTable).where(eq(researchCasesTable.id, researchCase.id)).for("update").limit(1);
        if (!ownedCase || ownedCase.caseType !== "discovery" || parseObject(ownedCase.caseFile)?.jobId !== jobId) return { card: false, evidence: 0 };
        const existing = await tx.select({ id: entitiesTable.id, type: entitiesTable.type, metadata: entitiesTable.metadata })
          .from(entitiesTable).where(and(sql`LOWER(${entitiesTable.name}) = LOWER(${lead.name})`, inArray(entitiesTable.type, ["HNWI", "Gatekeeper", "PersonCandidate"]))).limit(32);
        const sameCase = existing.find((row) => {
          const meta = parseObject(row.metadata);
          return row.type === "PersonCandidate" && meta?.partialPersonLead === true && meta.roleOnlyLead === true && Number(meta.discoveryCaseId) === researchCase.id;
        });
        if (existing.length && !sameCase) return { card: false, evidence: 0 };
        const sourceUrls = [...supports.keys()];
        const hasFetched = [...supports.values()].some((support) => support.verificationLevel === "fetched_source");
        const notes = hasFetched
          ? "PARTIAL PERSON LEAD — a fetched public source co-binds this exact name and role. Wealth potential and a suitable approach route remain unverified."
          : "SEARCH-RESULT PERSON LEAD — a successful search observation co-binds this name and role with a source URL. Fetch and corroborate before relying on it.";
        const prior = parseObject(sameCase?.metadata) ?? {};
        if (sameCase && prior.admission === "investigator-explicit-promotion") return { card: false, evidence: 0 };
        const metadata = JSON.stringify({
          ...prior, reviewOnly: true, partialPersonLead: true, roleOnlyLead: true, stage: "partial_review",
          admission: prior.admission ?? "source-observed-person-role",
          verificationLevel: hasFetched ? "fetched_source" : "search_result_lead",
          discoveryCaseId: researchCase.id, atlasJobId: jobId, role: lead.role, sourceUrls,
          limitations: ["HNWI/wealth status not established", "ownership/control not established", "personal contact route not verified"],
        });
        let entityId = sameCase?.id;
        if (!entityId) {
          const [created] = await tx.insert(entitiesTable).values({
            name: lead.name, type: "PersonCandidate", bayesianScore: 0.05, contactConfidence: 0,
            contactOutcome: "evidence_only", isHot: false, isStarred: false, isHidden: false,
            sourceRegistries: JSON.stringify(["canonical-agentic-discovery"]), notes, metadata,
          }).returning({ id: entitiesTable.id });
          entityId = created?.id;
        } else {
          await tx.update(entitiesTable).set({ notes, metadata, updatedAt: new Date() }).where(eq(entitiesTable.id, entityId));
        }
        if (!entityId) return { card: false, evidence: 0 };
        let added = 0;
        for (const support of supports.values()) {
          const [priorEvidence] = await tx.select({ id: researchEvidenceTable.id })
            .from(researchEvidenceTable).where(and(eq(researchEvidenceTable.entityId, entityId), eq(researchEvidenceTable.claimType, "partial_person_role_lead"), eq(researchEvidenceTable.sourceUrl, support.url))).limit(1);
          if (priorEvidence) continue;
          const [session] = await tx.insert(researchSessionsTable).values({
            targetEntityId: entityId, winningPath: JSON.stringify([{ sourceUrl: support.url, discoveryCaseId: researchCase.id, atlasJobId: jobId, status: "partial_review", verificationLevel: support.verificationLevel }]),
            notes: "Name/role lead only; wealth, ownership, and outreach route require independent research.",
            safeUseStatus: "manual_review", crmStatus: "Lead Gen",
          }).returning({ id: researchSessionsTable.id });
          if (!session?.id) throw new Error("Could not persist a review session for a person lead.");
          await tx.insert(researchEvidenceTable).values({
            sessionId: session.id, entityId, claimType: "partial_person_role_lead",
            claim: "A source observation co-binds this exact person name and role; wealth potential and contactability remain unverified.",
            value: lead.name, sourceName: "canonical-agentic-discovery", sourceUrl: support.url,
            sourceDomain: new URL(support.url).hostname, status: "review", confidence: 0.25,
            observedAt: support.createdAt, freshnessScore: support.verificationLevel === "fetched_source" ? 1 : 0.5,
            metadata: JSON.stringify({ partialReview: true, role: lead.role, verificationLevel: support.verificationLevel, discoveryCaseId: researchCase.id, atlasJobId: jobId, supportingEventId: support.eventId }),
          });
          added += 1;
        }
        return { card: !sameCase, evidence: added };
      }, { isolationLevel: "serializable" });
      if (persisted.card) cards += 1;
      evidenceRows += persisted.evidence;
    }
  }
  if (cards || evidenceRows) await Promise.all([delCachePattern("entities:list:*").catch(() => undefined), delCachePattern("dashboard:*").catch(() => undefined)]);
  return { cards, evidenceRows };
}
