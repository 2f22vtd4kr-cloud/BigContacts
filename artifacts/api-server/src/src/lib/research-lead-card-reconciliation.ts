import { and, eq, inArray, sql } from "drizzle-orm";
import { db, entitiesTable, researchCasesTable, researchCaseEventsTable, researchSessionsTable, researchEvidenceTable } from "@workspace/db";
import { bindExactSourceSpan } from "./research-epistemic-vnext";
import { isClaimGradeDiscoverySourceUrl } from "./candidate-source-url-union";
import { normalizeCandidateIdentityName } from "./identity-text-match";
import { sanitizeUrlForEvidence } from "./url-privacy";
import { delCachePattern } from "./redis";
import { logger } from "./logger";
import { isCanonicalJobOwner } from "./canonical-job-lock";

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
 * Terminal reconciliation for exact company-name leads found in successful
 * search observations and, when available, corroborated in successful fetched
 * page text. These cards remain review-only; a fetched name is not ownership,
 * wealth, targetability, or a person admission.
 */
export async function reconcileOrganizationReviewCardsForJob(jobId: string): Promise<{ cards: number; evidenceRows: number }> {
  const empty = { cards: 0, evidenceRows: 0 };
  if (!(await isCanonicalJobOwner("atlas-run", jobId))) return empty;
  const cases = await db.select({ id: researchCasesTable.id, caseFile: researchCasesTable.caseFile, caseType: researchCasesTable.caseType })
    .from(researchCasesTable)
    .where(and(eq(researchCasesTable.caseType, "discovery"), sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${jobId}`));
  let cards = 0;
  let evidenceRows = 0;
  let changed = false;
  for (const researchCase of cases) {
    const events = await db.select({ id: researchCaseEventsTable.id, eventType: researchCaseEventsTable.eventType, payload: researchCaseEventsTable.payload, createdAt: researchCaseEventsTable.createdAt })
      .from(researchCaseEventsTable)
      .where(and(eq(researchCaseEventsTable.caseId, researchCase.id), inArray(researchCaseEventsTable.eventType, ["tool_observation", "decision"])))
      .orderBy(researchCaseEventsTable.id);
    const findings = new Map<string, { name: string; urls: Set<string>; notes: Set<string> }>();
    const observations: Array<{ action: string; execution: string; url: string; text: string; eventId: number; createdAt: Date; verificationLevel: "fetched_source" | "search_result_lead" }> = [];
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
          const entry = findings.get(identity) ?? { name, urls: new Set<string>(), notes: new Set<string>() };
          if (Array.isArray(finding.sourceUrls)) for (const rawUrl of finding.sourceUrls) {
            const url = normalizeSource(rawUrl);
            if (url && isClaimGradeDiscoverySourceUrl(url)) entry.urls.add(url);
          }
          findings.set(identity, entry);
        }
      }
      if (event.eventType !== "tool_observation") continue;
      const action = String(payload.action ?? "");
      const registryAction = action === "registry_search" || action === "parallel_registry_search";
      const successful = payload.execution === "success";
      const partialRegistry = registryAction && payload.execution === "partial";
      if (!successful && !partialRegistry) continue;
      // Preserve only adapter-typed Corporation rows from successful subqueries.
      // They are lead inputs, not model findings and never person/wealth evidence.
      if (registryAction && payload.args && typeof payload.args === "object" && !Array.isArray(payload.args)) {
        const args = payload.args as Record<string, unknown>;
        const outcomes = Array.isArray(args.registrySearchOutcomes) ? args.registrySearchOutcomes : [];
        for (const rawOutcome of outcomes) {
          if (!rawOutcome || typeof rawOutcome !== "object" || Array.isArray(rawOutcome)) continue;
          const outcome = rawOutcome as Record<string, unknown>;
          if (outcome.error != null || !Array.isArray(outcome.companyLeads)) continue;
          for (const rawLead of outcome.companyLeads) {
            if (!rawLead || typeof rawLead !== "object" || Array.isArray(rawLead)) continue;
            const company = rawLead as Record<string, unknown>;
            if (typeof company.name !== "string" || !Array.isArray(company.sourceUrls)) continue;
            const name = company.name.trim().replace(/\s+/g, " ");
            const identity = normalizeCandidateIdentityName(name);
            if (name.length < 3 || identity.length < 3) continue;
            const entry = findings.get(identity) ?? { name, urls: new Set<string>(), notes: new Set<string>() };
            for (const rawUrl of company.sourceUrls) {
              const url = normalizeSource(rawUrl);
              if (url && isClaimGradeDiscoverySourceUrl(url)) entry.urls.add(url);
            }
            if (typeof company.notes === "string" && company.notes.trim()) {
              entry.notes.add(company.notes.replace(/\s+/g, " ").trim().slice(0, 240));
            }
            findings.set(identity, entry);
          }
        }
      }
      const search = /search/i.test(action);
      const fetched = action === "visit" || action === "browser_fetch";
      if (!search && !fetched) continue;
      // Search-result URLs establish leads; visit/browser-fetch URLs establish
      // fetched-source support only when the exact name also appears in fetched text.
      const observedUrls = Array.isArray(payload.observedUrls) ? payload.observedUrls : [];
      const leadUrls = Array.isArray(payload.leadUrls) && payload.leadUrls.length ? payload.leadUrls : observedUrls;
      const sourceUrls = fetched ? observedUrls : leadUrls;
      for (const rawUrl of sourceUrls) {
        const url = normalizeSource(rawUrl);
        if (!url || !isClaimGradeDiscoverySourceUrl(url)) continue;
        observations.push({
          action, execution: String(payload.execution), url, text: String(payload.observation ?? ""),
          eventId: event.id, createdAt: event.createdAt,
          verificationLevel: fetched ? "fetched_source" : "search_result_lead",
        });
      }
    }
    for (const lead of findings.values()) {
      const supports = new Map<string, typeof observations[number]>();
      for (const observation of observations) {
        if (!lead.urls.has(observation.url)) continue;
        if (!bindExactSourceSpan(observation.text, lead.name)?.exact) continue;
        const previous = supports.get(observation.url);
        if (!previous || (previous.verificationLevel === "search_result_lead" && observation.verificationLevel === "fetched_source")) {
          supports.set(observation.url, observation);
        }
      }
      if (!supports.size) continue;
      const persisted = await db.transaction(async (tx) => {
        const [ownedCase] = await tx.select({ caseType: researchCasesTable.caseType, caseFile: researchCasesTable.caseFile, currentAction: researchCasesTable.currentAction })
          .from(researchCasesTable).where(eq(researchCasesTable.id, researchCase.id)).for("update").limit(1);
        if (!ownedCase || ownedCase.caseType !== "discovery" || parseObject(ownedCase.caseFile)?.jobId !== jobId
          || ["canonical-atlas-cancelled", "canonical-lease-lost"].includes(String(ownedCase.currentAction ?? ""))) {
          return { card: false, evidence: 0, updated: false };
        }
        const existing = await tx.select({ id: entitiesTable.id, metadata: entitiesTable.metadata, notes: entitiesTable.notes })
          .from(entitiesTable).where(and(eq(entitiesTable.type, "Corporation"), sql`LOWER(${entitiesTable.name}) = LOWER(${lead.name})`)).limit(32);
        const sameCase = existing.find((row) => {
          const meta = parseObject(row.metadata);
          return meta?.partialOrganizationLead === true && Number(meta.discoveryCaseId) === researchCase.id;
        });
        // An exact-name match with different provenance is not safe to merge.
        if (existing.length && !sameCase) return { card: false, evidence: 0, updated: false };

        const prior = parseObject(sameCase?.metadata) ?? {};
        const hasFetched = prior.verificationLevel === "fetched_source"
          || [...supports.values()].some((support) => support.verificationLevel === "fetched_source");
        const verificationLevel = hasFetched ? "fetched_source" : "search_result_lead";
        const priorUrls = Array.isArray(prior.sourceUrls)
          ? prior.sourceUrls.filter((value): value is string => typeof value === "string" && /^https:\/\//i.test(value))
          : [];
        const sourceUrls = [...new Set([...priorUrls, ...supports.keys()])];
        const sourceNotes = [...new Set([
          ...(Array.isArray(prior.sourceNotes) ? prior.sourceNotes.filter((value): value is string => typeof value === "string") : []),
          ...lead.notes,
        ])].slice(0, 4);
        const registryContext = sourceNotes.length ? ` Registry search context: ${sourceNotes.join("; ")}.` : "";
        const limitations = hasFetched
          ? ["fetched source supports the exact organization name only", "ownership/control not established", "business materiality not established", "no person or wealth conclusion"]
          : ["organization name remains supported only by search-result text", "fetched source text has not verified the organization name", "ownership/control not established", "business materiality not established", "no person or wealth conclusion"];
        const notes = hasFetched
          ? `FETCHED-SOURCE REVIEW LEAD — a retrieved public source contains this exact organization name. This does not establish ownership, control, wealth, or targetability.${registryContext}`
          : `SEARCH-RESULT LEAD — exact organization name observed in a successful search/registry result. The underlying source page is not verified; ownership, control, wealth, and targetability remain unestablished.${registryContext}`;
        const metadata = JSON.stringify({
          ...prior, reviewOnly: true, partialOrganizationLead: true, stage: "partial_review",
          admission: prior.admission ?? "source-observed-organization-name",
          verificationLevel, evidenceHierarchy: hasFetched ? "fetched-source-name-only" : "unverified-search-lead",
          discoveryCaseId: researchCase.id, atlasJobId: jobId, sourceUrls, sourceNotes, limitations,
        });
        let entityId = sameCase?.id;
        let updated = false;
        if (!entityId) {
          const [created] = await tx.insert(entitiesTable).values({
            name: lead.name, type: "Corporation", bayesianScore: 0.05, contactConfidence: 0,
            contactOutcome: "evidence_only", isHot: false, isStarred: false, isHidden: false,
            sourceRegistries: JSON.stringify(["canonical-agentic-discovery"]), notes, metadata,
          }).returning({ id: entitiesTable.id });
          entityId = created?.id;
          updated = Boolean(entityId);
        } else if (String(sameCase?.metadata ?? "") !== metadata || String(sameCase?.notes ?? "") !== notes) {
          await tx.update(entitiesTable).set({ notes, metadata, updatedAt: new Date() }).where(eq(entitiesTable.id, entityId));
          updated = true;
        }
        if (!entityId) return { card: false, evidence: 0, updated };

        let added = 0;
        for (const support of supports.values()) {
          const isFetched = support.verificationLevel === "fetched_source";
          const [priorEvidence] = await tx.select({ id: researchEvidenceTable.id, metadata: researchEvidenceTable.metadata, sessionId: researchEvidenceTable.sessionId })
            .from(researchEvidenceTable).where(and(eq(researchEvidenceTable.entityId, entityId), eq(researchEvidenceTable.claimType, "partial_organization_lead"), eq(researchEvidenceTable.sourceUrl, support.url))).limit(1);
          if (priorEvidence) {
            const priorEvidenceMetadata = parseObject(priorEvidence.metadata) ?? {};
            if (isFetched && priorEvidenceMetadata.verificationLevel !== "fetched_source") {
              await tx.update(researchEvidenceTable).set({
                claim: "A successfully fetched public-source observation contains this exact organization name; ownership/control and wealth remain unestablished.",
                observedAt: support.createdAt, freshnessScore: 1,
                metadata: JSON.stringify({
                  ...priorEvidenceMetadata, partialReview: true, verificationLevel: "fetched_source",
                  evidenceTier: "fetched_public_source", discoveryCaseId: researchCase.id, atlasJobId: jobId,
                  supportingEventId: support.eventId,
                }),
              }).where(eq(researchEvidenceTable.id, priorEvidence.id));
              if (priorEvidence.sessionId) {
                await tx.update(researchSessionsTable).set({
                  winningPath: JSON.stringify([{ sourceUrl: support.url, discoveryCaseId: researchCase.id, atlasJobId: jobId, status: "partial_review", verificationLevel: "fetched_source" }]),
                  notes: "Fetched public-source name lead only; ownership/control and wealth remain unestablished.",
                }).where(eq(researchSessionsTable.id, priorEvidence.sessionId));
              }
              updated = true;
            }
            continue;
          }
          const [session] = await tx.insert(researchSessionsTable).values({
            targetEntityId: entityId, winningPath: JSON.stringify([{ sourceUrl: support.url, discoveryCaseId: researchCase.id, atlasJobId: jobId, status: "partial_review", verificationLevel: support.verificationLevel }]),
            notes: isFetched
              ? "Fetched public-source name lead only; ownership, control, wealth, and targetability need independent research."
              : "Search-result company lead only; the name is not verified in fetched source text.",
            safeUseStatus: "manual_review", crmStatus: "Lead Gen",
          }).returning({ id: researchSessionsTable.id });
          if (!session?.id) throw new Error("Could not persist a review session for a company lead.");
          await tx.insert(researchEvidenceTable).values({
            sessionId: session.id, entityId, claimType: "partial_organization_lead",
            claim: isFetched
              ? "A successfully fetched public-source observation contains this exact organization name; ownership/control and wealth remain unestablished."
              : "A successful search observation surfaced this exact organization name with an attributable source URL; this remains an unverified lead, not fetched-page evidence.",
            value: lead.name, sourceName: "canonical-agentic-discovery", sourceUrl: support.url,
            sourceDomain: new URL(support.url).hostname, status: "review", confidence: 0.2,
            observedAt: support.createdAt, freshnessScore: isFetched ? 1 : 0.5,
            metadata: JSON.stringify({ partialReview: true, verificationLevel: support.verificationLevel, evidenceTier: isFetched ? "fetched_public_source" : "unverified_search_result", discoveryCaseId: researchCase.id, atlasJobId: jobId, supportingEventId: support.eventId }),
          });
          added += 1;
          updated = true;
        }
        return { card: !sameCase, evidence: added, updated };
      }, { isolationLevel: "serializable" });
      if (persisted.card) cards += 1;
      evidenceRows += persisted.evidence;
      changed = changed || persisted.updated;
    }
  }
  if (changed) {
    await Promise.all([delCachePattern("entities:list:*").catch(() => undefined), delCachePattern("dashboard:*").catch(() => undefined)]);
    logger.info({ jobId, cards, evidenceRows }, "Reconciled review-only company leads from observed source evidence.");
  }
  return { cards, evidenceRows };
}

/**
 * Preserve exact, source-attributed person/role leads as PersonCandidate cards
 * even when wealth potential is not established. This is review-only and does
 * not admit an HNWI, establish a personal contact route, or bypass target gates.
 */
export async function reconcilePersonReviewCardsForJob(jobId: string): Promise<{ cards: number; evidenceRows: number }> {
  if (!(await isCanonicalJobOwner("atlas-run", jobId))) return { cards: 0, evidenceRows: 0 };
  const cases = await db.select({ id: researchCasesTable.id, caseFile: researchCasesTable.caseFile, caseType: researchCasesTable.caseType })
    .from(researchCasesTable)
    .where(and(eq(researchCasesTable.caseType, "discovery"), sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${jobId}`));
  let cards = 0;
  let evidenceRows = 0;
  let changed = false;
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
      // Search results are lead URLs; fetched actions are supported only by
      // URLs actually observed by that fetch, never by stale prior lead URLs.
      const rawUrls = search
        ? (Array.isArray(payload.leadUrls) && payload.leadUrls.length ? payload.leadUrls : (Array.isArray(payload.observedUrls) ? payload.observedUrls : []))
        : (Array.isArray(payload.observedUrls) ? payload.observedUrls : []);
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
        const [ownedCase] = await tx.select({ caseType: researchCasesTable.caseType, caseFile: researchCasesTable.caseFile, currentAction: researchCasesTable.currentAction })
          .from(researchCasesTable).where(eq(researchCasesTable.id, researchCase.id)).for("update").limit(1);
        if (!ownedCase || ownedCase.caseType !== "discovery" || parseObject(ownedCase.caseFile)?.jobId !== jobId
          || ["canonical-atlas-cancelled", "canonical-lease-lost"].includes(String(ownedCase.currentAction ?? ""))) {
          return { card: false, evidence: 0, updated: false };
        }
        const existing = await tx.select({ id: entitiesTable.id, type: entitiesTable.type, metadata: entitiesTable.metadata, notes: entitiesTable.notes })
          .from(entitiesTable).where(and(sql`LOWER(${entitiesTable.name}) = LOWER(${lead.name})`, inArray(entitiesTable.type, ["HNWI", "Gatekeeper", "PersonCandidate"]))).limit(32);
        const sameCase = existing.find((row) => {
          const meta = parseObject(row.metadata);
          return row.type === "PersonCandidate" && meta?.partialPersonLead === true && meta.roleOnlyLead === true && Number(meta.discoveryCaseId) === researchCase.id;
        });
        // Name-only matches cannot silently merge separate people or promoted entities.
        if (existing.length && !sameCase) return { card: false, evidence: 0, updated: false };

        const prior = parseObject(sameCase?.metadata) ?? {};
        if (sameCase && prior.admission === "investigator-explicit-promotion") return { card: false, evidence: 0, updated: false };
        const hasFetched = prior.verificationLevel === "fetched_source"
          || [...supports.values()].some((support) => support.verificationLevel === "fetched_source");
        const verificationLevel = hasFetched ? "fetched_source" : "search_result_lead";
        const priorUrls = Array.isArray(prior.sourceUrls)
          ? prior.sourceUrls.filter((value): value is string => typeof value === "string" && /^https:\/\//i.test(value))
          : [];
        const sourceUrls = [...new Set([...priorUrls, ...supports.keys()])];
        // Merge source provenance monotonically; a repeated weaker search event cannot
        // overwrite a previously verified fetched-source observation for that URL.
        const sourceEvidenceByUrl = new Map<string, Record<string, unknown>>();
        if (Array.isArray(prior.sourceEvidence)) for (const raw of prior.sourceEvidence) {
          if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
          const entry = raw as Record<string, unknown>;
          if (typeof entry.url === "string" && /^https:\/\//i.test(entry.url)) sourceEvidenceByUrl.set(entry.url, entry);
        }
        for (const support of supports.values()) {
          const incoming = {
            url: support.url,
            tier: support.verificationLevel === "fetched_source" ? "fetched_public_source" : "unverified_search_result",
            supportingEventId: support.eventId, observedAt: support.createdAt.toISOString(),
          };
          const current = sourceEvidenceByUrl.get(support.url);
          if (!current || (current.tier !== "fetched_public_source" && incoming.tier === "fetched_public_source")) {
            sourceEvidenceByUrl.set(support.url, incoming);
          }
        }
        const notes = hasFetched
          ? `PARTIAL PERSON LEAD — a public source directly associates this person with the role “${lead.role}”. Wealth potential and a suitable approach route remain unverified.`
          : `SEARCH-RESULT PERSON LEAD — search result associates this person with the role “${lead.role}”. Fetch and corroborate before relying on it.`;
        const metadata = JSON.stringify({
          ...prior, reviewOnly: true, partialPersonLead: true, roleOnlyLead: true, stage: "partial_review",
          admission: prior.admission ?? "source-observed-person-role",
          verificationLevel, discoveryCaseId: researchCase.id, atlasJobId: jobId, role: lead.role, sourceUrls,
          sourceEvidence: [...sourceEvidenceByUrl.values()],
          limitations: ["wealth status not established", "ownership/control not established", "professional approach route not verified"],
        });
        let entityId = sameCase?.id;
        let updated = false;
        if (!entityId) {
          const [created] = await tx.insert(entitiesTable).values({
            name: lead.name, type: "PersonCandidate", bayesianScore: 0.05, contactConfidence: 0,
            contactOutcome: "evidence_only", isHot: false, isStarred: false, isHidden: false,
            sourceRegistries: JSON.stringify(["canonical-agentic-discovery"]), notes, metadata,
          }).returning({ id: entitiesTable.id });
          entityId = created?.id;
          updated = Boolean(entityId);
        } else if (String(sameCase?.metadata ?? "") !== metadata || String(sameCase?.notes ?? "") !== notes) {
          await tx.update(entitiesTable).set({ notes, metadata, updatedAt: new Date() }).where(eq(entitiesTable.id, entityId));
          updated = true;
        }
        if (!entityId) return { card: false, evidence: 0, updated };

        let added = 0;
        for (const support of supports.values()) {
          const isFetched = support.verificationLevel === "fetched_source";
          const [priorEvidence] = await tx.select({ id: researchEvidenceTable.id, metadata: researchEvidenceTable.metadata, sessionId: researchEvidenceTable.sessionId })
            .from(researchEvidenceTable).where(and(eq(researchEvidenceTable.entityId, entityId), eq(researchEvidenceTable.claimType, "partial_person_role_lead"), eq(researchEvidenceTable.sourceUrl, support.url))).limit(1);
          if (priorEvidence) {
            const priorEvidenceMetadata = parseObject(priorEvidence.metadata) ?? {};
            if (isFetched && priorEvidenceMetadata.verificationLevel !== "fetched_source") {
              await tx.update(researchEvidenceTable).set({
                claim: "A successfully fetched public-source observation co-binds this exact person name and role; wealth potential and contactability remain unverified.",
                observedAt: support.createdAt, freshnessScore: 1,
                metadata: JSON.stringify({
                  ...priorEvidenceMetadata, partialReview: true, role: lead.role, verificationLevel: "fetched_source",
                  evidenceTier: "fetched_public_source", discoveryCaseId: researchCase.id, atlasJobId: jobId,
                  supportingEventId: support.eventId,
                }),
              }).where(eq(researchEvidenceTable.id, priorEvidence.id));
              if (priorEvidence.sessionId) {
                await tx.update(researchSessionsTable).set({
                  winningPath: JSON.stringify([{ sourceUrl: support.url, discoveryCaseId: researchCase.id, atlasJobId: jobId, status: "partial_review", verificationLevel: "fetched_source" }]),
                  notes: "Fetched public-source name/role lead only; wealth, ownership/control, and an appropriate outreach route remain unverified.",
                }).where(eq(researchSessionsTable.id, priorEvidence.sessionId));
              }
              updated = true;
            }
            continue;
          }
          const [session] = await tx.insert(researchSessionsTable).values({
            targetEntityId: entityId, winningPath: JSON.stringify([{ sourceUrl: support.url, discoveryCaseId: researchCase.id, atlasJobId: jobId, status: "partial_review", verificationLevel: support.verificationLevel }]),
            notes: "Name/role lead only; wealth, ownership, and outreach route require independent research.",
            safeUseStatus: "manual_review", crmStatus: "Lead Gen",
          }).returning({ id: researchSessionsTable.id });
          if (!session?.id) throw new Error("Could not persist a review session for a person lead.");
          await tx.insert(researchEvidenceTable).values({
            sessionId: session.id, entityId, claimType: "partial_person_role_lead",
            claim: isFetched
              ? "A successfully fetched public-source observation co-binds this exact person name and role; wealth potential and contactability remain unverified."
              : "A source observation co-binds this exact person name and role; wealth potential and contactability remain unverified.",
            value: lead.name, sourceName: "canonical-agentic-discovery", sourceUrl: support.url,
            sourceDomain: new URL(support.url).hostname, status: "review", confidence: 0.25,
            observedAt: support.createdAt, freshnessScore: isFetched ? 1 : 0.5,
            metadata: JSON.stringify({ partialReview: true, role: lead.role, verificationLevel: support.verificationLevel, evidenceTier: isFetched ? "fetched_public_source" : "unverified_search_result", discoveryCaseId: researchCase.id, atlasJobId: jobId, supportingEventId: support.eventId }),
          });
          added += 1;
          updated = true;
        }
        return { card: !sameCase, evidence: added, updated };
      }, { isolationLevel: "serializable" });
      if (persisted.card) cards += 1;
      evidenceRows += persisted.evidence;
      changed = changed || persisted.updated;
    }
  }
  if (changed) await Promise.all([delCachePattern("entities:list:*").catch(() => undefined), delCachePattern("dashboard:*").catch(() => undefined)]);
  return { cards, evidenceRows };
}
