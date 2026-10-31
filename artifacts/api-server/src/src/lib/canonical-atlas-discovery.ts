import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, entitiesTable, researchCasesTable, researchCaseEventsTable, researchSessionsTable, researchEvidenceTable } from "@workspace/db";
import { updateJob, clearActiveJobIfOwned, getJobStrict } from "./job-queue";
import { isCanonicalJobOwner } from "./canonical-job-lock";
import { runGroqBossDiscovery } from "./case-bureau";
import { runBureauAgenticWebPass } from "./bureau-agentic-pass";
import { runCanonicalSingleTargetInvestigation } from "./canonical-single-target-runner";
import { ATLAS_OPENING_RIGHT_HAND_REVIEW_RESPONSE_FORMAT, atlasRegistryFeasibilityLaw, buildAtlasPinnedControlState, buildAtlasScopeRecoveryFeedback, decideAtlasNextAction, isRecoverableAtlasControlRejection, validateAtlasOpeningRightHandReview, type AtlasControlAction } from "./atlas-control-decision";
import { buildMissionActionBudget, resolveDiscoveryIterationsPerAct, resolveRemainingDiscoveryIterations, resolveResearchDepth } from "./research-depth";
import { GROQ_INVESTIGATOR_20B_CAPABILITY, getAvailableDistinctInvestigatorCapabilities, getAvailableInvestigatorCapabilities, getInvestigatorCredentialAliases, getModelScopedInvestigatorQuotaFallback, type InvestigatorCapability } from "./investigator-capability-registry";
import { deriveCanonicalTerminalDecision } from "./canonical-terminal-state";
import { deriveLatestEvidenceBackedTerminal, isCanonicalAtlasRunEvidenceComplete, type LatestEvidenceBackedTerminal } from "./canonical-terminal-authority";
import { buildDiscoveryLeadUtilizationState, discoveryPivotScopeKey, type AgenticFinding } from "./agentic-web-research-core";
import {
  advanceInvestigatorProviderUnavailableStreak,
  advanceInvestigatorTokenCapacityFailureStreak,
  hasReachedInvestigatorTokenCapacityFailureLimit,
  isInvestigatorTokenDailyQuotaUnavailableEpisode,
  isInvestigatorHardRequestQuotaUnavailableEpisode,
  resolveInvestigatorTokenDailyQuotaRecoveryIterations,
  MAX_CONSECUTIVE_INVESTIGATOR_PROVIDER_UNAVAILABLE,
  MAX_CONSECUTIVE_INVESTIGATOR_TOKEN_CAPACITY_FAILURES,
} from "./canonical-investigator-provider-recovery";
import { nextResearchCaseEventIteration } from "./research-case-event-iteration";
import { describeThrownProviderError, safeThrownErrorSummary } from "./provider-error-diagnostics";
import { classifyInvestigatorEpisodeFailure, hasExecutedInvestigatorResearchAction, summarizeAtlasDiscoveryResearchHealth } from "./investigator-episode-health";
import { classifyCanonicalAtlasFailure, isRecoverableRightHandOpeningFailure, type AtlasFailureStage } from "./canonical-atlas-failure-diagnostics";
import { resolveBossAdjudicatedOpeningDirection, resolveBossDirectedDiscoveryObjective, restorePersistedDiscoveryObjective } from "./research-objective";
import { normalizeCandidateIdentityName } from "./identity-text-match";
import { candidateRoleCorroborationSources, hasDiscoveryOwnershipLeadSignal, isClaimGradeDiscoverySourceUrl, mergeDurablyAdmittedCandidateSources } from "./candidate-source-url-union";
import { sanitizeUrlForEvidence } from "./url-privacy";
import { bindExactSourceSpan, bindExactSourceSpanToUrl } from "./research-epistemic-vnext";
import { delCachePattern } from "./redis";
import { logger } from "./logger";
import { buildDiscoverySourceAttribution } from "./discovery-source-attribution";

export type CanonicalAtlasOptions = {
  targetCount?: number;
  researchDepth?: "fast" | "standard" | "deep";
  targetTimeoutMs?: number;
  discoveryContext?: string;
  discoveryCaseId?: number;
  discoveryOnly?: boolean;
  discoveryObjective?: string;
  discoveryMotivation?: string;
  discoveryGeography?: string;
  discoveryExclusions?: string[];
  lockKey?: "atlas-run" | "case-bureau-discovery";
};
export const MAX_CANONICAL_ATLAS_DISCOVERY_CONTEXT_CHARS = 1_200;

/** Compact control-plane prose without changing the validated underlying decision. */
function compactControlText(value: unknown, maxChars: number): string {
  if (typeof value !== "string") return "";
  const normalized = value.replace(/\\s+/g, " ").trim();
  return normalized.length > maxChars
    ? normalized.slice(0, Math.max(0, maxChars - 1)).trimEnd() + "…"
    : normalized;
}
export type CanonicalAtlasResult = { phase: number; ingested: number; enriched: number; contactsFound: number; hotLeads: number; durationMs: number; phaseSummary: Record<string, string> };
function uniqueNames(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const name = value.trim().replace(/\s+/g, " ");
    const identity = normalizeCandidateIdentityName(name);
    if (!name || !identity || seen.has(identity)) continue;
    seen.add(identity);
    result.push(name);
  }
  return result;
}
function isObservedHttpsSource(value: unknown): value is string { return typeof value === "string" && /^https:\/\/\S+$/i.test(value); }
function normalizeSourceUrl(raw: string): string | null { try { const safe = sanitizeUrlForEvidence(raw); if (safe.startsWith("[")) return null; const url = new URL(safe); if (url.protocol !== "https:") return null; url.hash = ""; url.hostname = url.hostname.toLowerCase(); return url.href.endsWith("/") ? url.href.slice(0, -1) : url.href; } catch { return null; } }

type CanonicalAdmittedTargetSource = {
  name: string;
  sourceUrls: string[];
  role: string | null;
  targetType: "person" | "organization";
};

/** Preserve entity kind while merging only source URLs that satisfy the existing durable-admission rules. */
function mergeDurablyAdmittedAtlasTargetSources(
  groups: readonly (readonly CanonicalAdmittedTargetSource[])[],
): CanonicalAdmittedTargetSource[] {
  const merged = new Map<string, { name: string; role: string | null; targetType: "person" | "organization"; sourceUrls: Set<string> }>();
  for (const group of groups) {
    for (const candidate of group) {
      const name = candidate.name.trim().replace(/\s+/g, " ");
      const identity = normalizeCandidateIdentityName(name);
      const targetType = candidate.targetType === "organization" ? "organization" : "person";
      if (name.length < 3 || identity.length < 3) continue;
      const validUrls = candidate.sourceUrls
        .map(normalizeSourceUrl)
        .filter((url): url is string => url !== null && isClaimGradeDiscoverySourceUrl(url));
      if (!validUrls.length) continue;
      const key = `${targetType}:${identity}`;
      let entry = merged.get(key);
      if (!entry) {
        entry = { name, role: targetType === "person" ? candidate.role : null, targetType, sourceUrls: new Set<string>() };
        merged.set(key, entry);
      } else if (targetType === "person" && !entry.role && candidate.role?.trim()) {
        entry.role = candidate.role.trim().replace(/\s+/g, " ");
      }
      for (const url of validUrls) entry.sourceUrls.add(url);
    }
  }
  return [...merged.values()].map(({ name, role, targetType, sourceUrls }) => ({
    name, role, targetType, sourceUrls: [...sourceUrls],
  }));
}

async function createAtlasDiscoveryCase(input: { atlasJobId: string; objective: string; investigatorLlm: InvestigatorCapability; directorModel: string }): Promise<number> {
  const [created] = await db.insert(researchCasesTable).values({ caseType: "discovery", status: "active", directorMode: "groq_boss", directorProvider: "groq", directorModel: input.directorModel || "unknown", objective: input.objective, motivation: "Durable memory for canonical Atlas Investigator discovery.", openingPrompt: "Investigator chooses every research action; this case is memory/state, not a deterministic research plan.", caseFile: JSON.stringify({ caseType: "discovery", contextDocument: ["CANONICAL ATLAS DISCOVERY CASE", `JOB: ${input.atlasJobId}`, `INVESTIGATOR: ${input.investigatorLlm}`, `OBJECTIVE: ${input.objective}`, "STATE: Initial discovery; Investigator owns the next action.", "TRAJECTORY: []"].join("\n"), investigatorLlm: input.investigatorLlm, baseDiscoveryObjective: input.objective, activeDiscoveryObjective: input.objective, investigatorTrajectory: [], investigatorTrajectoryRecords: [], investigationTimeline: [], jobId: input.atlasJobId }), currentAction: "canonical-investigator-discovery", iteration: 0 }).returning({ id: researchCasesTable.id });
  const caseId = created?.id; if (!caseId) throw new Error("Failed to create durable Atlas discovery case.");
  return caseId;
}


async function persistAcceptedAtlasDiscoveryObjective(input: {
  caseId: number;
  jobId: string;
  controlTurn: number;
  action: "continue_discovery" | "pivot_discovery";
  direction: string;
  baseObjective: string;
  previousObjective: string;
  activeObjective: string;
}): Promise<void> {
  const recordedAt = new Date().toISOString();
  const correlationKey = `${input.jobId}:accepted-discovery-objective:${input.controlTurn}`;
  const payload = {
    jobId: input.jobId,
    controlTurn: input.controlTurn,
    action: input.action,
    direction: input.direction,
    baseObjective: input.baseObjective,
    previousObjective: input.previousObjective,
    activeObjective: input.activeObjective,
    accepted: true,
    recordedAt,
  };
  const payloadJson = JSON.stringify(payload);
  await db.transaction(async (tx) => {
    const [lockedCase] = await tx.select({
      caseType: researchCasesTable.caseType,
      status: researchCasesTable.status,
      currentAction: researchCasesTable.currentAction,
      caseFile: researchCasesTable.caseFile,
    }).from(researchCasesTable).where(and(
      eq(researchCasesTable.id, input.caseId),
      eq(researchCasesTable.status, "active"),
      sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${input.jobId}`,
      sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`,
    )).for("update").limit(1);
    if (!lockedCase || lockedCase.caseType !== "discovery") {
      throw new Error("Canonical Atlas discovery ownership was lost before persisting the accepted research objective.");
    }
    let durableFile: Record<string, unknown>;
    try {
      durableFile = lockedCase.caseFile ? JSON.parse(lockedCase.caseFile) as Record<string, unknown> : {};
    } catch {
      throw new Error("Canonical Atlas discovery caseFile became unreadable before persisting the accepted research objective.");
    }
    const previous = restorePersistedDiscoveryObjective({
      defaultBaseObjective: input.baseObjective,
      persistedBaseObjective: durableFile.baseDiscoveryObjective,
      persistedActiveObjective: durableFile.activeDiscoveryObjective,
    });
    if (previous.baseObjective !== input.baseObjective || previous.activeObjective !== input.previousObjective) {
      throw new Error("Canonical Atlas active objective changed before its accepted control transition could be persisted.");
    }
    const nextFile: Record<string, unknown> = {
      ...durableFile,
      baseDiscoveryObjective: input.baseObjective,
      activeDiscoveryObjective: input.activeObjective,
      lastAcceptedDiscoveryTransition: {
        controlTurn: input.controlTurn,
        action: input.action,
        direction: input.direction,
        recordedAt,
      },
    };
    const [updated] = await tx.update(researchCasesTable).set({
      caseFile: JSON.stringify(nextFile),
      updatedAt: new Date(),
    }).where(and(
      eq(researchCasesTable.id, input.caseId),
      eq(researchCasesTable.status, "active"),
      sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${input.jobId}`,
      sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`,
    )).returning({ id: researchCasesTable.id });
    if (!updated) throw new Error("Canonical Atlas lost case ownership while persisting the accepted research objective.");
    const [existingEvent] = await tx.select({ payload: researchCaseEventsTable.payload }).from(researchCaseEventsTable).where(and(
      eq(researchCaseEventsTable.caseId, input.caseId),
      eq(researchCaseEventsTable.correlationKey, correlationKey),
    )).limit(1);
    if (existingEvent && existingEvent.payload !== payloadJson) {
      throw new Error("Canonical Atlas accepted-objective event replay collision.");
    }
    if (!existingEvent) {
      const [latestEvent] = await tx.select({ iteration: researchCaseEventsTable.iteration }).from(researchCaseEventsTable).where(eq(researchCaseEventsTable.caseId, input.caseId)).orderBy(desc(researchCaseEventsTable.id)).limit(1);
      await tx.insert(researchCaseEventsTable).values({
        caseId: input.caseId,
        iteration: Number(latestEvent?.iteration ?? 0) + 1,
        actorRole: "groq_boss",
        eventType: "control_objective",
        status: "recorded",
        summary: `Accepted Atlas discovery objective at control turn ${input.controlTurn}; the resolved objective is durable before the next Investigator action.`,
        correlationKey,
        payload: payloadJson,
      });
    }
  }, { isolationLevel: "serializable" });
}

async function materializeAtlasAdmissions(input: { discoveryRunId: string; findings: AgenticFinding[]; atlasJobId: string; discoveryCaseId: number }): Promise<{ names: string[]; candidates: Array<{ name: string; sourceUrls: string[]; role: string | null; targetType: "person" | "organization" }>; materialized: number; evidenceRows: number }> {
  const candidates = uniqueNames(input.findings
    .filter((finding) => finding.promotionDecision === "promote" && finding.scope === "candidate")
    .filter((finding) => typeof finding.personName === "string" && finding.personName.trim().length > 0)
    .filter((finding) => Array.isArray(finding.sourceUrls) && finding.sourceUrls.some(isObservedHttpsSource))
    .map((finding) => finding.personName as string));
  const durableCandidateSources: Array<{ name: string; sourceUrls: string[] }> = [];
  let materialized = 0;
  let evidenceRows = 0;
  // Persist provisional review cards before attempting stricter target admission.
  // A later ownership/corroboration admission error must not erase an already
  // observed person/company lead from this discovery checkpoint.
  const partialPeople = await materializePartialPersonLeadCards({ findings: input.findings, atlasJobId: input.atlasJobId, discoveryCaseId: input.discoveryCaseId });
  materialized += partialPeople.materialized;
  evidenceRows += partialPeople.evidenceRows;
  const partialOrganizations = await materializePartialOrganizationLeadCards({ findings: input.findings, atlasJobId: input.atlasJobId, discoveryCaseId: input.discoveryCaseId });
  materialized += partialOrganizations.materialized;
  evidenceRows += partialOrganizations.evidenceRows;

  for (const name of candidates) {
    const identity = normalizeCandidateIdentityName(name);
    const candidateRoles = [...new Set(input.findings
      .filter((finding) => normalizeCandidateIdentityName(finding.personName ?? "") === identity
        && finding.promotionDecision === "promote" && finding.scope === "candidate")
      .map((finding) => typeof finding.role === "string" ? finding.role.trim().replace(/\s+/g, " ") : "")
      .filter(Boolean))];
    if (!candidateRoles.length) continue;

    const caseEvents = await db.select({ id: researchCaseEventsTable.id, eventType: researchCaseEventsTable.eventType, payload: researchCaseEventsTable.payload, createdAt: researchCaseEventsTable.createdAt })
      .from(researchCaseEventsTable)
      .where(eq(researchCaseEventsTable.caseId, input.discoveryCaseId));
    const observations = caseEvents.flatMap((event) => {
      if (event.eventType !== "tool_observation" || typeof event.payload !== "string") return [];
      try {
        const payload = JSON.parse(event.payload) as { jobId?: string | null; action?: string; execution?: string; observedUrls?: unknown[]; runId?: string; observation?: string };
        // Both the job and the exact Investigator run must match: a case-scoped
        // query alone is not sufficient authorization to reuse an observation.
        if (payload.jobId !== input.atlasJobId || payload.runId !== input.discoveryRunId || !Array.isArray(payload.observedUrls)) return [];
        return payload.observedUrls.filter((url) => typeof url === "string").map((url) => ({
          action: payload.action ?? "", execution: payload.execution ?? "", sourceUrl: String(url),
          observation: typeof payload.observation === "string" ? payload.observation : "", eventId: event.id,
        }));
      } catch { return []; }
    });

    let selectedRole = "";
    let supportingSources: Array<{ sourceUrl: string; publisher: string; eventId: number }> = [];
    for (const role of candidateRoles) {
      const sources = candidateRoleCorroborationSources({
        findings: input.findings, personName: name, role, observations,
        isClaimGradeSourceUrl: isClaimGradeDiscoverySourceUrl, normalizeSourceUrl,
      });
      if (sources.length >= 1) { selectedRole = role; supportingSources = sources; break; }
    }
    if (supportingSources.length < 1) continue;
    // This is a review-only target handoff, not an HNWI conclusion. Require one
    // actually fetched, claim-grade source co-binding exact name and role plus
    // an observable ownership/control clue. Do not require public evidence of
    // business scale or materiality yet; target research must test that, falsify
    // the lead, and establish a realistic route before any contact/wealth promotion.
    const roleBoundSourceUrls = new Set(supportingSources.map((support) => support.sourceUrl));
    const claimGradeObservations = observations.filter((observation) =>
      observation.execution === "success"
      && (observation.action === "visit" || observation.action === "browser_fetch")
      && roleBoundSourceUrls.has(normalizeSourceUrl(observation.sourceUrl) ?? observation.sourceUrl)
      && isClaimGradeDiscoverySourceUrl(observation.sourceUrl)
    );
    if (!hasDiscoveryOwnershipLeadSignal({ personName: name, role: selectedRole, observations: claimGradeObservations })) continue;
    const primarySupport = supportingSources[0];
    if (!primarySupport) continue;

    const materializedAdmission = await db.transaction(async (tx) => {
      const [ownedCase] = await tx.select({ status: researchCasesTable.status, currentAction: researchCasesTable.currentAction, caseFile: researchCasesTable.caseFile })
        .from(researchCasesTable)
        .where(and(
          eq(researchCasesTable.id, input.discoveryCaseId),
          eq(researchCasesTable.status, "active"),
          sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${input.atlasJobId}`,
          sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`,
        ))
        .for("update")
        .limit(1);
      if (!ownedCase) throw new Error("Canonical discovery admission lost its durable job ownership before materialization.");
      const existingRows = await tx.select({ id: entitiesTable.id, metadata: entitiesTable.metadata }).from(entitiesTable)
        .where(and(sql`LOWER(${entitiesTable.name}) = LOWER(${name})`, inArray(entitiesTable.type, ["HNWI", "Gatekeeper", "PersonCandidate"])))
        .limit(16);
      // Never bind a common-name discovery candidate to an unrelated pre-existing entity.
      // Materialized discovery entities carry their owning discoveryCaseId in metadata;
      // only that durable case binding is eligible for this canonical research path.
      const existing = existingRows.find((row) => {
        try { const metadata = row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : {}; return Number(metadata.discoveryCaseId) === input.discoveryCaseId; } catch { return false; }
      });
      let entityId = existing?.id ?? null;
      let createdEntity = false;
      if (!entityId) {
        const [created] = await tx.insert(entitiesTable).values({ name, type: "PersonCandidate", bayesianScore: 0.05, contactConfidence: 0, contactOutcome: "evidence_only", isHot: false, isStarred: false, isHidden: false, sourceRegistries: JSON.stringify(["canonical-agentic-discovery"]), notes: "Source-backed review-only research lead; target-scoped research must independently test identity/ownership and establish a realistic contact route before any HNWI/contact conclusion.", metadata: JSON.stringify({ reviewOnly: true, admission: "investigator-explicit-promotion", sourceUrl: primarySupport.sourceUrl, sourceUrls: supportingSources.map((support) => support.sourceUrl), role: selectedRole, discoveryCaseId: input.discoveryCaseId }) }).returning({ id: entitiesTable.id });
        entityId = created?.id ?? null;
        createdEntity = Boolean(entityId);
      }
      if (!entityId) return { materialized: 0, evidenceRows: 0, durableEvidence: false };
      const supportingSourceUrls = supportingSources.map((support) => support.sourceUrl);
      const existingEvidenceRows = await tx.select({ id: researchEvidenceTable.id, sourceUrl: researchEvidenceTable.sourceUrl, metadata: researchEvidenceTable.metadata })
        .from(researchEvidenceTable)
        .where(and(eq(researchEvidenceTable.entityId, entityId), eq(researchEvidenceTable.claimType, "identity_candidate"), inArray(researchEvidenceTable.sourceUrl, supportingSourceUrls)));
      const existingByUrl = new Map(existingEvidenceRows.map((row) => [normalizeSourceUrl(String(row.sourceUrl ?? "")), row]));
      let addedEvidence = 0;
      let durableSourceCount = 0;
      for (const support of supportingSources) {
        const existingEvidence = existingByUrl.get(support.sourceUrl);
        if (existingEvidence) {
          let priorMetadata: Record<string, unknown> = {};
          try { const parsed: unknown = JSON.parse(existingEvidence.metadata ?? "{}"); if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) priorMetadata = parsed as Record<string, unknown>; } catch {}
          await tx.update(researchEvidenceTable).set({ metadata: JSON.stringify({ ...priorMetadata, discoveryCaseId: input.discoveryCaseId, atlasJobId: input.atlasJobId, supportingEventId: support.eventId, promotionDecision: "promote", role: selectedRole, independentPublisher: support.publisher, reviewOnly: true }) }).where(eq(researchEvidenceTable.id, existingEvidence.id));
          durableSourceCount += 1;
          continue;
        }
        const supportEvent = caseEvents.find((event) => event.id === support.eventId);
        const [session] = await tx.insert(researchSessionsTable).values({
          targetEntityId: entityId,
          winningPath: JSON.stringify([{ sourceUrl: support.sourceUrl, caseId: input.discoveryCaseId, admission: "investigator-explicit-promotion", role: selectedRole, independentPublisher: support.publisher }]),
          notes: "One observed role-bound source plus an ownership/control clue admits this review-only lead; target-scoped investigation must corroborate identity/ownership, test materiality and counter-evidence, and establish a contact route before promotion.",
          safeUseStatus: "manual_review", crmStatus: "Lead Gen",
        }).returning({ id: researchSessionsTable.id });
        if (!session?.id) throw new Error("Canonical discovery evidence session insert returned no durable session ID.");
        await tx.insert(researchEvidenceTable).values({
          sessionId: session.id, entityId, claimType: "identity_candidate",
          claim: "Investigator-discovered candidate: " + name + "; role: " + selectedRole,
          value: name, sourceName: "canonical-agentic-discovery",
          sourceUrl: support.sourceUrl, sourceDomain: new URL(support.sourceUrl).hostname,
          status: "review", confidence: 0.5, observedAt: supportEvent?.createdAt ?? new Date(),
          freshnessScore: 1,
          metadata: JSON.stringify({ discoveryCaseId: input.discoveryCaseId, atlasJobId: input.atlasJobId, supportingEventId: support.eventId, promotionDecision: "promote", role: selectedRole, independentPublisher: support.publisher, reviewOnly: true }),
        });
        addedEvidence += 1;
        durableSourceCount += 1;
      }
      if (existing && entityId) {
        let priorEntityMetadata: Record<string, unknown> = {};
        try { const parsed: unknown = JSON.parse(existing.metadata ?? "{}"); if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) priorEntityMetadata = parsed as Record<string, unknown>; } catch {}
        await tx.update(entitiesTable).set({ metadata: JSON.stringify({ ...priorEntityMetadata, reviewOnly: true, admission: "investigator-explicit-promotion", partialPersonLead: false, stage: "candidate_review", sourceUrl: primarySupport.sourceUrl, sourceUrls: supportingSources.map((support) => support.sourceUrl), role: selectedRole, discoveryCaseId: input.discoveryCaseId }) }).where(eq(entitiesTable.id, entityId));
      }
      return { materialized: createdEntity ? 1 : 0, evidenceRows: addedEvidence, durableEvidence: durableSourceCount >= 1 };
    }, { isolationLevel: "serializable" });

    // Never expose an unsupported model finding to Boss control, case projections,
    // or candidate counters. Names returned from this boundary have a durable
    // entity plus source evidence, whether newly inserted or already present.
    if (materializedAdmission.durableEvidence) durableCandidateSources.push({ name, sourceUrls: supportingSources.map((support) => support.sourceUrl) });
    materialized += materializedAdmission.materialized;
    evidenceRows += materializedAdmission.evidenceRows;
  }

  const durableCandidates = mergeDurablyAdmittedCandidateSources([durableCandidateSources.map(({ name, sourceUrls }) => ({ name, sourceUrls }))]);
  const personTargets = durableCandidates.map(({ name, sourceUrls }) => ({
    name,
    sourceUrls,
    targetType: "person" as const,
    role: input.findings.find((finding) => finding.promotionDecision === "promote"
      && finding.scope === "candidate"
      && normalizeCandidateIdentityName(finding.personName ?? "") === normalizeCandidateIdentityName(name)
      && typeof finding.role === "string" && finding.role.trim())?.role?.trim().replace(/\s+/g, " ") ?? null,
  }));
  const strictPersonIdentities = new Set(personTargets.map(({ name }) => normalizeCandidateIdentityName(name)));
  const partialPersonTargets = partialPeople.candidates
    .filter(({ name }) => !strictPersonIdentities.has(normalizeCandidateIdentityName(name)))
    .map(({ name, role, sourceUrls }) => ({ name, sourceUrls, targetType: "person" as const, role }));
  const organizationTargets = partialOrganizations.candidates.map(({ name, sourceUrls }) => ({
    name, sourceUrls, targetType: "organization" as const, role: null,
  }));
  const targetCandidates = [...personTargets, ...partialPersonTargets, ...organizationTargets];
  return { names: targetCandidates.map(({ name }) => name), candidates: targetCandidates, materialized, evidenceRows };
}

export async function checkpointCanonicalDiscoveryFindings(input: {
  discoveryRunId: string;
  findings: AgenticFinding[];
  atlasJobId: string;
  discoveryCaseId: number;
  turn?: number;
  action?: string;
  execution?: string;
}): Promise<{ names: string[]; candidates: Array<{ name: string; sourceUrls: string[]; role: string | null; targetType: "person" | "organization" }>; materialized: number; evidenceRows: number }> {
  const empty = { names: [], candidates: [], materialized: 0, evidenceRows: 0 };
  try {
    return await materializeAtlasAdmissions({
      discoveryRunId: input.discoveryRunId,
      findings: input.findings,
      atlasJobId: input.atlasJobId,
      discoveryCaseId: input.discoveryCaseId,
    });
  } catch (error) {
    // The event write has already committed. Projection errors are observable and
    // retried by later action/terminal reconciliation rather than erasing progress.
    logger.warn({
      jobId: input.atlasJobId,
      caseId: input.discoveryCaseId,
      runId: input.discoveryRunId,
      turn: input.turn ?? null,
      action: input.action ?? null,
      execution: input.execution ?? null,
      error: error instanceof Error ? error.message : "unknown materialization error",
    }, "Partial discovery card checkpoint deferred; trajectory remains durable.");
    return empty;
  }
}

export async function reconcileCanonicalDiscoveryCaseReviewCards(input: {
  atlasJobId: string;
  discoveryCaseId: number;
}): Promise<{ materialized: number; evidenceRows: number }> {
  const empty = { materialized: 0, evidenceRows: 0 };
  try {
    const events = await db.select({ eventType: researchCaseEventsTable.eventType, payload: researchCaseEventsTable.payload })
      .from(researchCaseEventsTable)
      .where(and(
        eq(researchCaseEventsTable.caseId, input.discoveryCaseId),
        inArray(researchCaseEventsTable.eventType, ["tool_observation", "decision"]),
      ))
      .orderBy(researchCaseEventsTable.id);
    let materialized = 0;
    let evidenceRows = 0;
    for (const event of events) {
      if (typeof event.payload !== "string") continue;
      let payload: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(event.payload);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
        payload = parsed as Record<string, unknown>;
      } catch { continue; }
      if (payload.jobId !== input.atlasJobId) continue;
      const runId = typeof payload.runId === "string" ? payload.runId : "";
      const findings = Array.isArray(payload.findings) ? payload.findings as AgenticFinding[] : [];
      if (!runId) continue;
      const result = await checkpointCanonicalDiscoveryFindings({
        discoveryRunId: runId,
        findings,
        atlasJobId: input.atlasJobId,
        discoveryCaseId: input.discoveryCaseId,
        turn: typeof payload.turn === "number" ? payload.turn : undefined,
        action: typeof payload.action === "string" ? payload.action : undefined,
        execution: typeof payload.execution === "string" ? payload.execution : undefined,
      });
      materialized += result.materialized;
      evidenceRows += result.evidenceRows;
    }
    return { materialized, evidenceRows };
  } catch (error) {
    logger.warn({ jobId: input.atlasJobId, caseId: input.discoveryCaseId,
      error: error instanceof Error ? error.message : "unknown reconciliation error" },
      "Discovery case card reconciliation deferred; trajectory remains durable.");
    return empty;
  }
}

async function assertAtlasJobActive(jobId: string): Promise<void> {
  // Authoritative control decisions must distinguish a persisted cancellation
  // from a Redis read failure. The fail-soft getJob() maps both to null.
  const job = await getJobStrict(jobId);
  if (!job) throw new Error("Canonical Atlas job record missing; refusing further control-plane work.");
  if (job.status === "cancelled") throw new Error("Canonical Atlas job cancelled; refusing further control-plane work.");
  if (job.status === "failed") throw new Error("Canonical Atlas job already failed; refusing further control-plane work.");
  if (!(await isCanonicalJobOwner("atlas-run", jobId))) throw new Error("Canonical Atlas lease was lost; refusing further control-plane work.");
}

async function reconcileDiscoveryCaseCancellation(jobId: string, caseId: number): Promise<void> {
  // A missing durable job record is inconsistent state; a failed Redis read
  // must throw from getJobStrict instead of masquerading as operator cancellation.
  const job = await getJobStrict(jobId);
  if (!job || job.status === "cancelled") {
    const cancelled = job?.status === "cancelled";
    await db.update(researchCasesTable)
      .set({ status: "review", currentAction: cancelled ? "canonical-atlas-cancelled" : "canonical-atlas-job-missing", updatedAt: new Date() })
      .where(and(
        eq(researchCasesTable.id, caseId),
        eq(researchCasesTable.status, "active"),
        sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${jobId}`,
      ));
    if (cancelled) throw new Error("Canonical Atlas job cancelled; discovery case creation raced operator stop.");
    throw new Error("Canonical Atlas job record missing; discovery case creation cannot be reconciled safely.");
  }
  if (job.status === "failed") {
    throw new Error("Canonical Atlas job already failed; refusing further discovery control-plane work.");
  }
  if (!(await isCanonicalJobOwner("atlas-run", jobId))) throw new Error("Canonical Atlas lease was lost; refusing further control-plane work.");
}

async function materializePartialPersonLeadCards(input: {
  findings: AgenticFinding[];
  atlasJobId: string;
  discoveryCaseId: number;
}): Promise<{ materialized: number; evidenceRows: number; candidates: Array<{ name: string; role: string | null; sourceUrls: string[] }> }> {
  // The Investigator's structured finding is the card-worthiness decision.
  // Runtime persists that selection as a review-only lead; Boss may choose it
  // for target-scoped verification, while promotion remains a separate decision.
  const leadMap = new Map<string, { name: string; role: string | null; sourceUrls: string[] }>();
  for (const finding of input.findings) {
    if (finding.scope !== "candidate" || finding.promotionDecision === "reject"
      || !finding.personName?.trim()) continue;
    const name = finding.personName.trim().replace(/\s+/g, " ");
    const role = finding.role?.trim() ? finding.role.trim().replace(/\s+/g, " ") : null;
    if (!name) continue;
    const identity = normalizeCandidateIdentityName(name) + "::" + (role ? normalizeCandidateIdentityName(role) : "");
    const current = leadMap.get(identity);
    const sourceUrls = [...new Set([
      ...(current?.sourceUrls ?? []),
      ...finding.sourceUrls.map(normalizeSourceUrl).filter((url): url is string => Boolean(url)),
    ])];
    leadMap.set(identity, { name, role, sourceUrls });
  }
  if (!leadMap.size) return { materialized: 0, evidenceRows: 0, candidates: [] };

  const caseEvents = await db.select({
    id: researchCaseEventsTable.id,
    eventType: researchCaseEventsTable.eventType,
    payload: researchCaseEventsTable.payload,
    createdAt: researchCaseEventsTable.createdAt,
  }).from(researchCaseEventsTable).where(and(
    eq(researchCaseEventsTable.caseId, input.discoveryCaseId),
    eq(researchCaseEventsTable.eventType, "tool_observation"),
  ));
  const observations = caseEvents.flatMap((event) => {
    if (typeof event.payload !== "string") return [];
    try {
      const payload = JSON.parse(event.payload) as {
        jobId?: string | null; action?: string; execution?: string;
        observedUrls?: unknown[]; leadUrls?: unknown[]; observation?: string;
      };
      if (payload.jobId !== input.atlasJobId) return [];
      const action = payload.action ?? "";
      const fetched = action === "visit" || action === "browser_fetch";
      const searched = action === "web_search" || action === "parallel_web_search"
        || action === "registry_search" || action === "parallel_registry_search";
      if (!fetched && !searched) return [];
      // Search and fetch observations supply provenance for the model-selected
      // person lead. Role may be unknown and exact span matching only grades the
      // evidence; it does not decide whether the Investigator's lead gets a card.
      const sourceUrls = fetched ? payload.observedUrls : payload.leadUrls;
      if (!Array.isArray(sourceUrls)) return [];
      return sourceUrls.filter((url): url is string => typeof url === "string").map((url) => ({
        action,
        execution: payload.execution ?? "",
        sourceUrl: url,
        observation: typeof payload.observation === "string" ? payload.observation : "",
        executionStatus: payload.execution ?? "",
        verificationLevel: fetched ? "fetched_source" as const : "search_result_lead" as const,
        eventId: event.id,
        createdAt: event.createdAt,
      }));
    } catch {
      return [];
    }
  });

  let materialized = 0;
  let evidenceRows = 0;
  let wroteDurableState = false;
  const candidates: Array<{ name: string; role: string | null; sourceUrls: string[] }> = [];
  for (const lead of leadMap.values()) {
    const claimedUrls = new Set(lead.sourceUrls);
    const supports = new Map<string, {
      sourceUrl: string; eventId: number; createdAt: Date; action: string;
      spanText: string; spanStart: number | null; spanEnd: number | null; spanVerified: boolean;
      verificationLevel: "fetched_source" | "search_result_lead";
    }>();
    for (const observation of observations) {
      if (!["success", "partial"].includes(observation.executionStatus)
        || !["visit", "browser_fetch", "web_search", "parallel_web_search", "registry_search", "parallel_registry_search"].includes(observation.action)) continue;
      const sourceUrl = normalizeSourceUrl(observation.sourceUrl);
      if (!sourceUrl || !claimedUrls.has(sourceUrl)) continue;
      // The model-selected person and same-job observed URL establish a
      // provisional lead. Exact name/role span matching and claim-grade source
      // classification improve the evidence tier but never veto card creation.
      const span = observation.verificationLevel === "fetched_source"
        ? (lead.role ? bindExactSourceSpan(observation.observation, lead.role, lead.name, 320) : bindExactSourceSpan(observation.observation, lead.name, undefined, 320))
        : (lead.role ? bindExactSourceSpanToUrl(observation.observation, sourceUrl, lead.role, lead.name, 320) : bindExactSourceSpanToUrl(observation.observation, sourceUrl, lead.name, undefined, 320));
      const exactSpan = Boolean(span?.exact && (!lead.role || (span.subjectMatched && span.valueMatched)));
      // The Investigator selected this lead. Exact-span parsing grades the
      // observation; it must not veto the model's provisional card decision.
      // If attribution cannot be isolated, retain the URL as unverified and let
      // target-scoped research test the lead.
      const verificationLevel = exactSpan && span
        && observation.verificationLevel === "fetched_source"
        && isClaimGradeDiscoverySourceUrl(sourceUrl)
        ? "fetched_source" as const
        : "search_result_lead" as const;
      if (!supports.has(sourceUrl) || (supports.get(sourceUrl)?.verificationLevel === "search_result_lead" && verificationLevel === "fetched_source")) supports.set(sourceUrl, {
        sourceUrl,
        eventId: observation.eventId,
        createdAt: observation.createdAt,
        action: observation.action,
        spanText: exactSpan && span ? span.text : "",
        spanStart: exactSpan && span ? span.start : null,
        spanEnd: exactSpan && span ? span.end : null,
        spanVerified: exactSpan,
        verificationLevel,
      });
    }
    if (!supports.size) continue;

    const persisted = await db.transaction(async (tx) => {
      const [ownedCase] = await tx.select({
        status: researchCasesTable.status,
        currentAction: researchCasesTable.currentAction,
        caseFile: researchCasesTable.caseFile,
      }).from(researchCasesTable).where(and(
        eq(researchCasesTable.id, input.discoveryCaseId),
        eq(researchCasesTable.status, "active"),
        sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${input.atlasJobId}`,
        sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`,
      )).for("update").limit(1);
      if (!ownedCase) return { created: 0, evidenceRows: 0, changed: false, eligible: false };

      const existingRows = await tx.select({
        id: entitiesTable.id,
        type: entitiesTable.type,
        metadata: entitiesTable.metadata,
      }).from(entitiesTable).where(and(
        sql`LOWER(${entitiesTable.name}) = LOWER(${lead.name})`,
        inArray(entitiesTable.type, ["HNWI", "Gatekeeper", "PersonCandidate"]),
      )).limit(32);
      const sameCaseExisting = existingRows.find((row) => {
        try {
          const metadata = row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : {};
          return Number(metadata.discoveryCaseId) === input.discoveryCaseId;
        } catch {
          return false;
        }
      });
      const sameCase = existingRows.find((row) => {
        try {
          const metadata = row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : {};
          return row.type === "PersonCandidate" && metadata.partialPersonLead === true
            && Number(metadata.discoveryCaseId) === input.discoveryCaseId;
        } catch {
          return false;
        }
      });
      // Never merge on name alone. Keep an existing same-case card; if only
      // another case has the same name, create a separate provisional lead.
      if (sameCaseExisting && !sameCase) return { created: 0, evidenceRows: 0, changed: false, eligible: true };
      const identityCollisionPossible = existingRows.some((row) => {
        try {
          const metadata = row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : {};
          return Number(metadata.discoveryCaseId) !== input.discoveryCaseId;
        } catch {
          return true;
        }
      });
      let priorMetadata: Record<string, unknown> = {};
      try {
        const parsed: unknown = sameCase?.metadata ? JSON.parse(sameCase.metadata) : {};
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) priorMetadata = parsed as Record<string, unknown>;
      } catch {}
      // A durably admitted candidate is already a stronger version of this
      // card; never downgrade its admission or overwrite its provenance.
      if (sameCase && priorMetadata.admission === "investigator-explicit-promotion") {
        return { created: 0, evidenceRows: 0, changed: false, eligible: true };
      }

      let entityId = sameCase?.id ?? null;
      let created = false;
      const sourceUrls = [...supports.keys()];
      const hasFetchedSource = [...supports.values()].some((support) => support.verificationLevel === "fetched_source");
      const verificationLevel = hasFetchedSource ? "fetched_source" : "search_result_lead";
      const collisionNote = identityCollisionPossible ? "Possible same-name entity in another case; kept separate without identity merging. " : "";
      const notes = collisionNote + (hasFetchedSource
        ? `PARTIAL PERSON LEAD — a fetched public source supports this Investigator-selected person lead${lead.role ? " and role “" + lead.role + "”" : ""}. Wealth, ownership/control, materiality, and an appropriate public professional approach route remain unverified.`
        : `UNVERIFIED PERSON LEAD — a public source observation supports this Investigator-selected person lead${lead.role ? " and role “" + lead.role + "”" : ""}. The source is not treated as claim-grade evidence; role, wealth, ownership/control, materiality, and an appropriate public professional approach route remain unverified.`);
      const metadata = JSON.stringify({
        ...priorMetadata,
        reviewOnly: true,
        partialPersonLead: true,
        roleOnlyLead: Boolean(lead.role),
        identityCollisionPossible,
        stage: "partial_review",
        admission: priorMetadata.admission ?? (hasFetchedSource ? "source-backed-partial-finding" : "source-observed-person-lead"),
        verificationLevel,
        discoveryCaseId: input.discoveryCaseId,
        atlasJobId: input.atlasJobId,
        role: lead.role,
        sourceUrl: sourceUrls[0],
        sourceUrls,
        sourceAttributions: [...supports.values()].map((support) => buildDiscoverySourceAttribution({ sourceUrl: support.sourceUrl, action: support.action, observedAt: support.createdAt })),
        limitations: ["HNWI/wealth status not established", "ownership/control and materiality not established", "professional approach route not verified"],
      });
      if (!entityId) {
        const [entity] = await tx.insert(entitiesTable).values({
          name: lead.name,
          type: "PersonCandidate",
          bayesianScore: 0.05,
          contactConfidence: 0,
          contactOutcome: "evidence_only",
          isHot: false,
          isStarred: false,
          isHidden: false,
          sourceRegistries: JSON.stringify(["canonical-agentic-discovery"]),
          notes,
          metadata,
        }).returning({ id: entitiesTable.id });
        entityId = entity?.id ?? null;
        created = Boolean(entityId);
      } else if (priorMetadata.partialPersonLead === true) {
        await tx.update(entitiesTable).set({
          notes,
          metadata,
          updatedAt: new Date(),
        }).where(eq(entitiesTable.id, entityId));
      } else {
        // A same-case entity not marked as partial/admitted belongs to another
        // materialization path. Do not silently retag it as a partial lead.
        return { created: 0, evidenceRows: 0, changed: false, eligible: false };
      }
      if (!entityId) return { created: 0, evidenceRows: 0, changed: false, eligible: false };

      let addedEvidence = 0;
      for (const support of supports.values()) {
        const [existingEvidence] = await tx.select({ id: researchEvidenceTable.id })
          .from(researchEvidenceTable).where(and(
            eq(researchEvidenceTable.entityId, entityId),
            eq(researchEvidenceTable.claimType, "partial_person_role_lead"),
            eq(researchEvidenceTable.sourceUrl, support.sourceUrl),
          )).limit(1);
        if (existingEvidence) continue;
        const [session] = await tx.insert(researchSessionsTable).values({
          targetEntityId: entityId,
          winningPath: JSON.stringify([{
            sourceUrl: support.sourceUrl,
            discoveryCaseId: input.discoveryCaseId,
            atlasJobId: input.atlasJobId,
            stage: "partial_review",
          }]),
          notes: "Partial person/role lead only. Do not infer HNWI status or personal contactability; independently corroborate identity, role, relevance, and a suitable public professional approach route.",
          safeUseStatus: "manual_review",
          crmStatus: "Lead Gen",
        }).returning({ id: researchSessionsTable.id });
        if (!session?.id) throw new Error("Partial identity lead evidence session insert returned no durable session ID.");
        const event = caseEvents.find((row) => row.id === support.eventId);
        await tx.insert(researchEvidenceTable).values({
          sessionId: session.id,
          entityId,
          claimType: "partial_person_role_lead",
          claim: support.verificationLevel === "fetched_source"
            ? (lead.role ? "A fetched public source co-binds this exact person name and page-stated role; wealth, ownership/control, and targetability remain unverified." : "A fetched public source supports this person name; role, wealth, ownership/control, and targetability remain unverified.")
            : (lead.role ? "A successful public search/registry observation supports this person and role lead; the underlying page, wealth, ownership/control, and targetability remain unverified." : "A successful public search/registry observation supports this person-name lead; the underlying page, role, wealth, ownership/control, and targetability remain unverified."),
          value: lead.name,
          sourceName: "canonical-agentic-discovery",
          sourceUrl: support.sourceUrl,
          sourceDomain: new URL(support.sourceUrl).hostname,
          status: "review",
          confidence: support.verificationLevel === "fetched_source" ? 0.25 : 0.15,
          observedAt: event?.createdAt ?? support.createdAt,
          freshnessScore: support.verificationLevel === "fetched_source" ? 1 : 0.5,
          metadata: JSON.stringify({
            partialReview: true,
            verificationLevel: support.verificationLevel,
            evidenceTier: support.verificationLevel === "fetched_source" ? "fetched_public_source" : "unverified_search_result",
            discoveryCaseId: input.discoveryCaseId,
            atlasJobId: input.atlasJobId,
            supportingEventId: support.eventId,
            role: lead.role,
            sourceSpan: support.spanVerified ? support.spanText : null,
            sourceSpanVerified: support.spanVerified,
            sourceSpanNote: support.spanVerified ? null : "Investigator-selected person lead; exact source span not independently isolated.",
            spanStart: support.spanStart,
            spanEnd: support.spanEnd,
            noWealthOrContactConclusion: true,
          }),
        });
        addedEvidence++;
      }
      return { created: created ? 1 : 0, evidenceRows: addedEvidence, changed: created || addedEvidence > 0 || Boolean(sameCase), eligible: true };
    }, { isolationLevel: "serializable" });

    materialized += persisted.created;
    evidenceRows += persisted.evidenceRows;
    wroteDurableState ||= persisted.changed;
    if (persisted.eligible) candidates.push({ name: lead.name, role: lead.role, sourceUrls: [...supports.keys()] });
  }
  if (wroteDurableState) {
    await Promise.all([
      delCachePattern("entities:list:*").catch(() => undefined),
      delCachePattern("dashboard:*").catch(() => undefined),
    ]);
  }
  return { materialized, evidenceRows, candidates };
}

async function materializePartialOrganizationLeadCards(input: {
  findings: AgenticFinding[];
  atlasJobId: string;
  discoveryCaseId: number;
}): Promise<{ materialized: number; evidenceRows: number; candidates: Array<{ name: string; sourceUrls: string[] }> }> {
  // Persist only organization leads explicitly selected in Investigator findings.
  // They remain distinct from person candidates and imply no ownership, wealth,
  // or HNWI status.
  const seenNames = new Set<string>();
  const leadNames: string[] = [];
  for (const finding of input.findings) {
    if (finding.scope !== "organization" || finding.promotionDecision === "reject") continue;
    const name = finding.value.trim().replace(/\s+/g, " ");
    const identity = normalizeCandidateIdentityName(name);
    if (!name || !identity || seenNames.has(identity)) continue;
    seenNames.add(identity);
    leadNames.push(name);
  }
  const caseEvents = await db.select({
    id: researchCaseEventsTable.id,
    eventType: researchCaseEventsTable.eventType,
    payload: researchCaseEventsTable.payload,
    createdAt: researchCaseEventsTable.createdAt,
  }).from(researchCaseEventsTable).where(and(
    eq(researchCaseEventsTable.caseId, input.discoveryCaseId),
    eq(researchCaseEventsTable.eventType, "tool_observation"),
  ));
  const observations = caseEvents.flatMap((event) => {
    if (typeof event.payload !== "string") return [];
    try {
      const payload = JSON.parse(event.payload) as {
        jobId?: string | null; action?: string; execution?: string;
        observedUrls?: unknown[]; leadUrls?: unknown[];
        args?: Record<string, unknown>;
        observation?: string; runId?: string;
      };
      if (payload.jobId !== input.atlasJobId) return [];
      const action = payload.action ?? "";
      const fetched = action === "visit" || action === "browser_fetch";
      const searched = action === "web_search" || action === "parallel_web_search"
        || action === "registry_search" || action === "parallel_registry_search";
      const registry = action === "registry_search" || action === "parallel_registry_search";
      const observations: Array<{
        action: string; execution: string; verificationLevel: "fetched_source" | "search_result_lead";
        sourceUrl: string; observation: string; eventId: number; createdAt: Date; sourceUrlBoundByAdapter?: boolean;
      }> = [];

      // Registry adapter rows are supporting observations only. They may
      // corroborate an organization the Investigator selected, but cannot select
      // or create a card without that model finding.
      if (registry && (payload.execution === "success" || payload.execution === "partial")) {
        const outcomes = Array.isArray(payload.args?.registrySearchOutcomes) ? payload.args.registrySearchOutcomes : [];
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
            if (!name || !identity) continue;
            const notes = typeof company.notes === "string" ? company.notes.replace(/\s+/g, " ").trim().slice(0, 240) : "";
            for (const rawUrl of company.sourceUrls) {
              if (typeof rawUrl !== "string") continue;
              observations.push({
                action: "registry_search", execution: "success", verificationLevel: "search_result_lead",
                sourceUrl: rawUrl, observation: name + (notes ? " — " + notes : ""),
                eventId: event.id, createdAt: event.createdAt, sourceUrlBoundByAdapter: true,
              });
            }
          }
        }
      }

      // Partial provider execution can still contain successful, attributable
      // source observations. Preserve model-selected leads from those results.
      // Search-result URLs are leads, not fetched-page evidence. Keep them
      // separate from fetched-page URLs and bind every claim to the exact URL.
      const sourceUrls = fetched
        ? payload.observedUrls
        : searched && Array.isArray(payload.leadUrls) && payload.leadUrls.length
          ? payload.leadUrls
          : [];
      if (Array.isArray(sourceUrls)) {
        observations.push(...sourceUrls.filter((url): url is string => typeof url === "string").map((url) => ({
          action,
          execution: payload.execution ?? "",
          verificationLevel: fetched ? "fetched_source" as const : "search_result_lead" as const,
          sourceUrl: url,
          observation: typeof payload.observation === "string" ? payload.observation : "",
          eventId: event.id,
          createdAt: event.createdAt,
        })));
      }
      return observations;
    } catch {
      return [];
    }
  });

  if (!leadNames.length) return { materialized: 0, evidenceRows: 0, candidates: [] };

  let materialized = 0;
  let evidenceRows = 0;
  let wroteDurableState = false;
  const candidates: Array<{ name: string; sourceUrls: string[] }> = [];
  for (const name of leadNames) {
    const claimedUrls = new Set([
      ...input.findings
        .filter((finding) => finding.scope === "organization"
          && finding.promotionDecision !== "reject"
          && normalizeCandidateIdentityName(finding.value) === normalizeCandidateIdentityName(name))
        .flatMap((finding) => finding.sourceUrls)
        .map(normalizeSourceUrl)
        .filter((url): url is string => Boolean(url)),
      // Registry adapter rows may support this lead only because the
      // Investigator already selected the organization in a structured finding.
    ]);
    const supports = new Map<string, {
      sourceUrl: string; eventId: number; createdAt: Date; action: string; spanText: string;
      spanStart: number | null; spanEnd: number | null; spanVerified: boolean;
      verificationLevel: "fetched_source" | "search_result_lead";
    }>();
    for (const observation of observations) {
      if (!["success", "partial"].includes(observation.execution)
        || !["visit", "browser_fetch", "web_search", "parallel_web_search", "registry_search", "parallel_registry_search"].includes(observation.action)) continue;
      const sourceUrl = normalizeSourceUrl(observation.sourceUrl);
      if (!sourceUrl || !claimedUrls.has(sourceUrl)) continue;
      // The model-selected finding and same-job observed URL establish the
      // review lead's provenance. Exact-span parsing and claim-grade publisher
      // classification grade evidence only; neither can veto provisional cards.
      const span = observation.verificationLevel === "fetched_source" || observation.sourceUrlBoundByAdapter
        ? bindExactSourceSpan(observation.observation, name)
        : bindExactSourceSpanToUrl(observation.observation, sourceUrl, name);
      const exactSpan = Boolean(span?.exact);
      const verificationLevel = exactSpan && span
        && observation.verificationLevel === "fetched_source"
        && isClaimGradeDiscoverySourceUrl(sourceUrl)
        ? "fetched_source" as const
        : "search_result_lead" as const;
      const previous = supports.get(sourceUrl);
      if (!previous || (previous.verificationLevel === "search_result_lead" && verificationLevel === "fetched_source")) {
        supports.set(sourceUrl, {
          sourceUrl, eventId: observation.eventId, createdAt: observation.createdAt,
          spanText: exactSpan && span ? span.text : "",
          spanStart: exactSpan && span ? span.start : null,
          spanEnd: exactSpan && span ? span.end : null,
          spanVerified: exactSpan,
          verificationLevel,
        });
      }
    }
    if (!supports.size) continue;

    const persisted = await db.transaction(async (tx) => {
      const [ownedCase] = await tx.select({
        status: researchCasesTable.status,
        currentAction: researchCasesTable.currentAction,
        caseFile: researchCasesTable.caseFile,
      }).from(researchCasesTable).where(and(
        eq(researchCasesTable.id, input.discoveryCaseId),
        eq(researchCasesTable.status, "active"),
        sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${input.atlasJobId}`,
        sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`,
      )).for("update").limit(1);
      if (!ownedCase) return { created: 0, evidenceRows: 0, changed: false, candidate: null };

      const existingRows = await tx.select({
        id: entitiesTable.id,
        metadata: entitiesTable.metadata,
      }).from(entitiesTable).where(and(
        eq(entitiesTable.type, "Corporation"),
        sql`LOWER(${entitiesTable.name}) = LOWER(${name})`,
      )).limit(32);
      const sameCaseExisting = existingRows.find((row) => {
        try {
          const metadata = row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : {};
          return Number(metadata.discoveryCaseId) === input.discoveryCaseId;
        } catch {
          return false;
        }
      });
      const sameCase = existingRows.find((row) => {
        try {
          const metadata = row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : {};
          return metadata.partialOrganizationLead === true
            && Number(metadata.discoveryCaseId) === input.discoveryCaseId;
        } catch {
          return false;
        }
      });
      // Keep an existing same-case card; a same-name entity in another case is
      // never merged and does not suppress a separate provisional review card.
      if (sameCaseExisting && !sameCase) return { created: 0, evidenceRows: 0, changed: false, candidate: { name, sourceUrls: [...supports.keys()] } };
      const identityCollisionPossible = existingRows.some((row) => {
        try {
          const metadata = row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : {};
          return Number(metadata.discoveryCaseId) !== input.discoveryCaseId;
        } catch {
          return true;
        }
      });

      let entityId = sameCase?.id ?? null;
      let created = false;
      const sourceUrls = [...supports.keys()];
      const hasFetchedSource = [...supports.values()].some((support) => support.verificationLevel === "fetched_source");
      const verificationLevel = hasFetchedSource ? "fetched_source" : "search_result_lead";
      const collisionNote = identityCollisionPossible ? "Possible same-name entity in another case; kept separate without identity merging. " : "";
      const notes = collisionNote + (hasFetchedSource
        ? "FETCHED-SOURCE REVIEW LEAD — a fetched public source contains this organization name. Ownership/control, business materiality, wealth, and targetability remain unverified."
        : "UNVERIFIED SOURCE REVIEW LEAD — a public source observation supports this organization name. It is not treated as claim-grade evidence; ownership/control, business materiality, wealth, and targetability remain unverified.");
      const metadata = JSON.stringify({
        reviewOnly: true,
        partialOrganizationLead: true,
        stage: "partial_review",
        admission: "source-observed-organization-name",
        verificationLevel,
        evidenceHierarchy: hasFetchedSource ? "fetched-source-name-only" : "unverified-source-observation",
        identityCollisionPossible,
        discoveryCaseId: input.discoveryCaseId,
        atlasJobId: input.atlasJobId,
        sourceUrls,
        sourceNotes: [...new Set([...supports.values()].map((support) => support.spanVerified ? support.spanText : `Investigator-selected organization lead ${name}; exact source span not independently isolated.`))].slice(0, 4),
        limitations: ["ownership/control not established", "business materiality not established", "no person or wealth conclusion", "person-level contact route not established"],
      });
      if (!entityId) {
        const [entity] = await tx.insert(entitiesTable).values({
          name,
          type: "Corporation",
          bayesianScore: 0.05,
          contactConfidence: 0,
          contactOutcome: "evidence_only",
          isHot: false,
          isStarred: false,
          isHidden: false,
          sourceRegistries: JSON.stringify(["canonical-agentic-discovery"]),
          notes,
          metadata,
        }).returning({ id: entitiesTable.id });
        entityId = entity?.id ?? null;
        created = Boolean(entityId);
      } else {
        await tx.update(entitiesTable).set({ notes, metadata, updatedAt: new Date() })
          .where(eq(entitiesTable.id, entityId));
      }
      if (!entityId) return { created: 0, evidenceRows: 0, changed: false, candidate: null };

      let addedEvidence = 0;
      for (const support of supports.values()) {
        const [existingEvidence] = await tx.select({ id: researchEvidenceTable.id })
          .from(researchEvidenceTable).where(and(
            eq(researchEvidenceTable.entityId, entityId),
            eq(researchEvidenceTable.claimType, "partial_organization_lead"),
            eq(researchEvidenceTable.sourceUrl, support.sourceUrl),
          )).limit(1);
        if (existingEvidence) continue;
        const [session] = await tx.insert(researchSessionsTable).values({
          targetEntityId: entityId,
          winningPath: JSON.stringify([{ sourceUrl: support.sourceUrl, discoveryCaseId: input.discoveryCaseId, atlasJobId: input.atlasJobId, status: "partial_review", verificationLevel: support.verificationLevel }]),
          notes: support.verificationLevel === "fetched_source"
            ? "Fetched public-source organization-name lead only; ownership, wealth, and targetable-person claims remain unverified."
            : "Search-result organization-name lead only; fetched-page verification, ownership, wealth, and targetable-person claims remain outstanding.",
          safeUseStatus: "manual_review",
          crmStatus: "Lead Gen",
        }).returning({ id: researchSessionsTable.id });
        if (!session?.id) throw new Error("Partial organization lead evidence session insert returned no durable session ID.");
        const event = caseEvents.find((row) => row.id === support.eventId);
        await tx.insert(researchEvidenceTable).values({
          sessionId: session.id,
          entityId,
          claimType: "partial_organization_lead",
          claim: support.verificationLevel === "fetched_source"
            ? "The fetched public source contains the exact organization name; ownership, materiality, and a targetable person remain unverified."
            : "A successful public search observation contains the exact organization name and an attributable result URL; the underlying page, ownership, materiality, and a targetable person remain unverified.",
          value: name,
          sourceName: "canonical-agentic-discovery",
          sourceUrl: support.sourceUrl,
          sourceDomain: new URL(support.sourceUrl).hostname,
          status: "review",
          confidence: support.verificationLevel === "fetched_source" ? 0.25 : 0.15,
          observedAt: event?.createdAt ?? support.createdAt,
          freshnessScore: support.verificationLevel === "fetched_source" ? 1 : 0.5,
          metadata: JSON.stringify({
            partialReview: true,
            verificationLevel: support.verificationLevel,
            evidenceTier: support.verificationLevel === "fetched_source" ? "fetched_public_source" : "unverified_search_result",
            discoveryCaseId: input.discoveryCaseId,
            atlasJobId: input.atlasJobId,
            supportingEventId: support.eventId,
            sourceSpan: support.spanVerified ? support.spanText : null,
            sourceSpanVerified: support.spanVerified,
            sourceSpanNote: support.spanVerified ? null : "Investigator-selected organization lead; exact source span not independently isolated.",
            spanStart: support.spanStart,
            spanEnd: support.spanEnd,
            noOwnershipOrWealthConclusion: true,
          }),
        });
        addedEvidence++;
      }
      return { created: created ? 1 : 0, evidenceRows: addedEvidence, changed: created || addedEvidence > 0 || Boolean(sameCase), candidate: { name, sourceUrls } };
    }, { isolationLevel: "serializable" });

    materialized += persisted.created;
    evidenceRows += persisted.evidenceRows;
    if (persisted.candidate) candidates.push(persisted.candidate);
    wroteDurableState ||= persisted.changed;
  }
  if (wroteDurableState) {
    await Promise.all([
      delCachePattern("entities:list:*").catch(() => undefined),
      delCachePattern("dashboard:*").catch(() => undefined),
    ]);
  }
  return { materialized, evidenceRows, candidates };
}

export async function runCanonicalAtlasPipeline(atlasJobId: string, opts: CanonicalAtlasOptions = {}): Promise<CanonicalAtlasResult> {
  const startedAt = Date.now(); const depth = resolveResearchDepth({ explicit: opts.researchDepth }); const configuredControlTurnCeiling = Number(process.env.APEX_ATLAS_MAX_CONTROL_TURNS ?? 16); const maxControlTurns = Math.min(64, Math.max(1, Number.isFinite(configuredControlTurnCeiling) ? Math.floor(configuredControlTurnCeiling) : 16)); const maxConsecutiveInvestigatorProviderUnavailable = MAX_CONSECUTIVE_INVESTIGATOR_PROVIDER_UNAVAILABLE; const isInvestigatorHardQuotaExhausted = isInvestigatorHardRequestQuotaUnavailableEpisode; const discoveryOnly = opts.discoveryOnly === true; const lockKey = opts.lockKey ?? "atlas-run"; const phaseSummary: Record<string, string> = {}; const targetLimit = Math.max(1, Math.min(25, Number(opts.targetCount ?? 3) || 3)); const configuredAtlasTimeout = Number(process.env.APEX_ATLAS_RUN_TIMEOUT_MS ?? 15 * 60 * 1000); const atlasTimeoutMs = Math.min(30 * 60 * 1000, Math.max(2 * 60 * 1000, Number.isFinite(configuredAtlasTimeout) ? configuredAtlasTimeout : 15 * 60 * 1000)); const atlasDeadline = startedAt + atlasTimeoutMs; const remainingBudget = () => atlasDeadline - Date.now(); const assertAtlasDeadline = () => { const remaining = remainingBudget(); if (remaining <= 30_000) throw new Error("Canonical Atlas global deadline reached; refusing another research/control turn."); return remaining; };
  let discoveryObjective = opts.discoveryObjective?.trim() || "Discover under-the-radar people with credible wealth potential and realistic public/professional/intermediary contact routes. A person is the ultimate investor-identification goal, but an admitted source-backed organization is also a valid research target when investigating that company is the best way to identify its actual owners, operators, founders, shareholders, investors, assets, or realistic professional approach routes. Companies are leads and may be selected for target-scoped research; a company card is useful on its own but does not substitute for a qualified person or establish any owner\u2019s wealth. Prefer private, mid-market, regional and family businesses; their owners/operators/founders/shareholders; investors and private-capital principals; beneficial/controlling owners; and concession, franchise or license holders. Look for public evidence of ownership/equity/investment/control, material business/property assets or a business exit, and a plausible way to approach relevant people through public professional or business channels. Do not infer wealth from seniority alone. Do not default to celebrities, billionaire/richest lists, Fortune 500, or global household-brand leadership. A global brand is relevant only when evidence points to a realistic local owner/operator/distributor/franchisee/concession-holder or similar intermediary. Start from a concrete business/sector/geography, use local-language terms and English when useful, test hypotheses with independent evidence, and pivot after generic or repetitive results. The Investigator chooses each action; no fixed sequence. Promote only exact named people whose role, wealth-potential basis, and realistic approach route are source-supported. Never invent a person, relationship, wealth fact, contact, or URL.";
  const discoveryContext = opts.discoveryContext?.trim() ?? "";
  if (discoveryContext.length > MAX_CANONICAL_ATLAS_DISCOVERY_CONTEXT_CHARS) {
    throw new Error(`Canonical Atlas discovery context exceeds ${MAX_CANONICAL_ATLAS_DISCOVERY_CONTEXT_CHARS} characters.`);
  }
  if (discoveryContext) {
    discoveryObjective += `\n\nPRIOR-ATTEMPT CONTEXT (historical observations, not evidence or a fixed action plan):\n${discoveryContext}\nUse your own judgment to choose each direction, query, source, tool, and stopping point. Do not repeat a failed action unless new evidence gives a reason. All ordinary targetability, identity, provenance, privacy, and admission rules still apply.`;
  }
  let activeDiscoveryObjective = discoveryObjective;
  let failureStage: AtlasFailureStage = "job_state_or_lease";
  try {
    await assertAtlasJobActive(atlasJobId);
    if (opts.discoveryCaseId) {
      const [resumeCase] = await db.select({
        caseType: researchCasesTable.caseType,
        status: researchCasesTable.status,
        currentAction: researchCasesTable.currentAction,
        caseFile: researchCasesTable.caseFile,
      }).from(researchCasesTable).where(eq(researchCasesTable.id, opts.discoveryCaseId)).limit(1);
      if (!resumeCase || resumeCase.caseType !== "discovery" || resumeCase.status !== "active") {
        throw new Error("Canonical Atlas cannot resume an unavailable or inactive discovery case.");
      }
      if (["canonical-atlas-cancelled", "canonical-lease-lost"].includes(String(resumeCase.currentAction ?? ""))) {
        throw new Error("Canonical Atlas cannot resume a durably cancelled or lease-lost discovery case.");
      }
      let resumeFile: Record<string, unknown>;
      try { resumeFile = resumeCase.caseFile ? JSON.parse(resumeCase.caseFile) as Record<string, unknown> : {}; }
      catch { throw new Error("Canonical Atlas resume caseFile is unreadable."); }
      if (String(resumeFile.jobId ?? resumeFile.atlasJobId ?? "") !== atlasJobId) {
        throw new Error("Canonical Atlas resume case is not bound to the current job; refusing stale objective restoration.");
      }
      const restored = restorePersistedDiscoveryObjective({
        defaultBaseObjective: discoveryObjective,
        persistedBaseObjective: resumeFile.baseDiscoveryObjective,
        persistedActiveObjective: resumeFile.activeDiscoveryObjective,
      });
      discoveryObjective = restored.baseObjective;
      activeDiscoveryObjective = restored.activeObjective;
    }
    await updateJob(atlasJobId, { status: "running", progress: 0, total: discoveryOnly ? 1 : 4, atlasPhase: 0, atlasPhaseTotal: discoveryOnly ? 1 : 4, message: "Groq Boss opening → Groq Right-hand review → model-owned Investigator discovery…" });
    const shouldCancelAtlasInvestigator = async (): Promise<boolean> => {
      const currentJob = await getJobStrict(atlasJobId);
      if (!currentJob) throw new Error("Canonical Atlas job record missing during Investigator discovery.");
      if (currentJob.status !== "running") return true;
      const ownsLease = await isCanonicalJobOwner(lockKey, atlasJobId);
      if (!ownsLease) throw new Error("Canonical Atlas lease was lost during Investigator discovery.");
      return false;
    };
    failureStage = "boss_opening_request";
    await assertAtlasJobActive(atlasJobId);
    // Canonical opening order is intentional: Groq Boss establishes the case direction
    // and selects the Investigator first. The independent Right-hand reviews that Boss
    // decision second. It must never become a prerequisite that can silently steer the
    // Boss's opening assignment.
    failureStage = "boss_opening_request";
    const boss = await runGroqBossDiscovery({
      jobId: atlasJobId,
      caseId: opts.discoveryCaseId ?? null,
      objective: activeDiscoveryObjective,
      motivation: opts.discoveryMotivation || "Find real people for deep target-scoped investigation.",
      geography: opts.discoveryGeography || "Public web; geography selected by the research objective",
      exclusions: opts.discoveryExclusions ?? [
        "Do not browse as Boss.",
        "Do not prescribe a fixed tool or search sequence.",
        "Do not invent people, contacts, relationships, or URLs.",
        "Select one available Investigator capability exposed by the runtime registry; do not prescribe a research sequence.",
      ],
      startingLane: "model-selected discovery",
    });
    await assertAtlasJobActive(atlasJobId);

    if (opts.discoveryCaseId) {
      failureStage = "case_persistence";
      const [existingDiscoveryCase] = await db.select({ caseFile: researchCasesTable.caseFile, status: researchCasesTable.status }).from(researchCasesTable).where(eq(researchCasesTable.id, opts.discoveryCaseId)).limit(1);
      let storedInvestigator: InvestigatorCapability | null = null;
      try {
        const stored = existingDiscoveryCase?.caseFile ? JSON.parse(existingDiscoveryCase.caseFile) as Record<string, unknown> : {};
        storedInvestigator = typeof stored.investigatorLlm === "string" ? stored.investigatorLlm as InvestigatorCapability : null;
      } catch {
        throw new Error("Canonical discovery case has unreadable durable Investigator selection.");
      }
      if (storedInvestigator) {
        if (!getAvailableInvestigatorCapabilities().includes(storedInvestigator)) {
          throw new Error(`Previously selected discovery Investigator capability ${storedInvestigator} is unavailable; refusing silent capability rotation.`);
        }
        if (boss.investigatorLlm !== storedInvestigator) {
          throw new Error(`Groq Boss attempted to change the durable discovery Investigator from ${storedInvestigator} to ${boss.investigatorLlm ?? "none"}; refusing silent capability rotation.`);
        }
      }
    }
    if (!boss.investigatorLlm) {
      phaseSummary.assignment = "No usable Boss-selected Investigator capability; fail closed.";
      const bossFailureMessage = "Groq Boss was unavailable after bounded same-role model fallback; no alternate Investigator capability was substituted.";
      failureStage = "job_state_or_lease";
      await updateJob(atlasJobId, {
        status: "failed",
        progress: 1,
        atlasPhase: 1,
        outcome: "incomplete",
        message: bossFailureMessage,
        result: JSON.stringify({ boss }),
        finishedAt: new Date().toISOString(),
      });
      if (opts.discoveryCaseId) {
        failureStage = "case_persistence";
        await db.update(researchCasesTable)
          .set({ status: "review", currentAction: "groq-boss-unavailable", updatedAt: new Date() })
          .where(and(eq(researchCasesTable.id, opts.discoveryCaseId), eq(researchCasesTable.status, "active"), sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`));
      }
      await clearActiveJobIfOwned(lockKey, atlasJobId);
      return { phase: 1, ingested: 0, enriched: 0, contactsFound: 0, hotLeads: 0, durationMs: Date.now() - startedAt, phaseSummary };
    }

    // The durable discovery case begins as soon as the Boss makes the opening
    // assignment, so a later Right-hand/provider failure cannot erase the fact
    // that the Boss decision actually happened.
    failureStage = "case_persistence";
    const discoveryCaseId = opts.discoveryCaseId ?? await createAtlasDiscoveryCase({
      atlasJobId,
      objective: discoveryObjective,
      investigatorLlm: boss.investigatorLlm,
      directorModel: boss.model,
    });
    let materialized = 0;
    let evidenceRows = 0;
    const checkpointDiscoveryFindings = async (checkpoint: {
      runId: string; turn: number; action: string; execution: string; findings: AgenticFinding[];
    }): Promise<void> => {
      const result = await checkpointCanonicalDiscoveryFindings({
        discoveryRunId: checkpoint.runId,
        findings: checkpoint.findings,
        atlasJobId,
        discoveryCaseId,
        turn: checkpoint.turn,
        action: checkpoint.action,
        execution: checkpoint.execution,
      });
      materialized += result.materialized;
      evidenceRows += result.evidenceRows;
    };
    let selectedInvestigator = boss.investigatorLlm;
    const quotaExhaustedInvestigators = new Set<InvestigatorCapability>();
    const tokenCapacityUnavailableInvestigators = new Set<InvestigatorCapability>();
    let tokenCapacityReassignmentUsed = false;
    // This counter is initialized before opening-episode recovery can invoke the
    // shared reassignment helper.
    let consecutiveInvestigatorTokenCapacityFailures = 0;
    const allUnavailableInvestigatorCapabilities = () => [...new Set([
      ...quotaExhaustedInvestigators,
      ...tokenCapacityUnavailableInvestigators,
    ])];
    const reassignInvestigatorAfterHardQuota = async (failedCapability: InvestigatorCapability, failure: string): Promise<InvestigatorCapability> => {
      quotaExhaustedInvestigators.add(failedCapability);
      const unavailableCapabilities = allUnavailableInvestigatorCapabilities();
      // Token capacity is model-scoped in Groq. Keep credential aliases excluded,
      // but allow Boss to explicitly choose the 20B model capability after 120B
      // TPD/window exhaustion. If 20B itself is exhausted, allow the primary
      // 120B capability to be considered again because it has a separate model budget.
      const failedOn20BModel = failedCapability === GROQ_INVESTIGATOR_20B_CAPABILITY;
      const excludedCapabilityAliases = failedOn20BModel
        ? []
        : getInvestigatorCredentialAliases(process.env, unavailableCapabilities)
            .filter((capability) => capability !== GROQ_INVESTIGATOR_20B_CAPABILITY);
      const bossExcludedCapabilities = [...new Set([...unavailableCapabilities, ...excludedCapabilityAliases])];
      const availableAlternates = getAvailableDistinctInvestigatorCapabilities(process.env, bossExcludedCapabilities);
      const modelScopedFallback = getModelScopedInvestigatorQuotaFallback(
        process.env,
        failedCapability,
        unavailableCapabilities,
      );
      if (modelScopedFallback && !availableAlternates.includes(modelScopedFallback)) {
        availableAlternates.push(modelScopedFallback);
      }
      if (!availableAlternates.length) throw new Error(`Groq Investigator capability ${failedCapability} exhausted its hard request quota and no alternate configured Investigator capability remains.`);
      await assertAtlasJobActive(atlasJobId);
      failureStage = "boss_opening_request";
      const reassignment = await runGroqBossDiscovery({
        jobId: atlasJobId,
        caseId: discoveryCaseId,
        objective: `${discoveryObjective}\n\nHARD PROVIDER QUOTA RECOVERY: The previously selected Investigator capability ${failedCapability} returned an explicit upstream request-quota exhaustion. This is a control-plane resource failure, not research evidence. Select a different currently configured Investigator capability from the runtime registry so the same investigation can continue. Do not repeat or substitute the exhausted capability.\n\nFAILURE: ${failure}`,
        motivation: "Recover one canonical investigation from an explicitly exhausted Investigator request quota. Preserve the existing evidence and let the Boss select the replacement capability; do not prescribe research steps.",
        geography: opts.discoveryGeography || "Public web; geography selected by the research objective",
        exclusions: opts.discoveryExclusions ?? [
          "Do not browse as Boss.",
          "Do not prescribe a fixed tool or search sequence.",
          "Do not invent people, contacts, relationships, or URLs.",
        ],
        startingLane: "Boss-directed Investigator capability reassignment after explicit hard request-quota exhaustion",
        excludedInvestigatorLlm: bossExcludedCapabilities,
      });
      await assertAtlasJobActive(atlasJobId);
      const replacement = reassignment.investigatorLlm;
      if (reassignment.status !== "completed" || !replacement || replacement === failedCapability || allUnavailableInvestigatorCapabilities().includes(replacement) || !availableAlternates.includes(replacement)) {
        throw new Error(reassignment.error ?? "Groq Boss did not select a valid alternate Investigator capability after hard quota exhaustion.");
      }
      failureStage = "case_persistence";
      await db.transaction(async (tx) => {
        const [lockedCase] = await tx.select({ status: researchCasesTable.status, currentAction: researchCasesTable.currentAction, caseFile: researchCasesTable.caseFile, iteration: researchCasesTable.iteration })
          .from(researchCasesTable)
          .where(and(eq(researchCasesTable.id, discoveryCaseId), sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`))
          .for("update")
          .limit(1);
        if (!lockedCase || lockedCase.status !== "active" || ["canonical-atlas-cancelled", "canonical-lease-lost"].includes(String(lockedCase.currentAction ?? ""))) throw new Error("Canonical Atlas discovery case is no longer active; refusing Investigator reassignment.");
        let caseFile: Record<string, unknown> = {};
        try { caseFile = lockedCase.caseFile ? JSON.parse(lockedCase.caseFile) as Record<string, unknown> : {}; } catch { throw new Error("Canonical Atlas discovery case has unreadable durable state during Investigator reassignment."); }
        const previousAssignment = typeof caseFile.investigatorLlm === "string" ? caseFile.investigatorLlm : failedCapability;
        const history = Array.isArray(caseFile.investigatorCapabilityHistory) ? caseFile.investigatorCapabilityHistory : [];
        const nextFile = { ...caseFile, investigatorLlm: replacement, investigatorCapabilityHistory: [...history, { from: previousAssignment, to: replacement, trigger: "upstream_quota_exhausted" }].slice(-15) };
        const nextIteration = Number(lockedCase.iteration ?? 0) + 1;
        await tx.update(researchCasesTable).set({ caseFile: JSON.stringify(nextFile), iteration: nextIteration, currentAction: "canonical-investigator-reassigned-after-hard-quota", updatedAt: new Date() }).where(and(eq(researchCasesTable.id, discoveryCaseId), sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`));
        await tx.insert(researchCaseEventsTable).values({ caseId: discoveryCaseId, iteration: nextIteration, actorRole: "groq_boss", eventType: "assignment", status: "recorded", summary: "Groq Boss reassigned the canonical Investigator after an explicit hard request-quota exhaustion; the exhausted capability remains excluded for this job.", correlationKey: `${atlasJobId}:investigator-reassignment:${failedCapability}:${replacement}:${nextIteration}`, payload: JSON.stringify({ jobId: atlasJobId, from: failedCapability, to: replacement, trigger: "upstream_quota_exhausted", excludedInvestigators: bossExcludedCapabilities, bossModel: reassignment.model, bossStatus: reassignment.status, bossReport: reassignment.report, error: reassignment.error }) });
      }, { isolationLevel: "serializable" });
      selectedInvestigator = replacement;
      // Keep the live progress projection aligned with the durable Boss-selected
      // capability. The opening message otherwise keeps naming the exhausted slot.
      await assertAtlasJobActive(atlasJobId);
      const reassignedJob = await getJobStrict(atlasJobId);
      if (!reassignedJob) throw new Error("Canonical Atlas job record missing during Investigator reassignment status refresh.");
      let currentResult: Record<string, unknown> = {};
      try {
        const parsed: unknown = reassignedJob.result ? JSON.parse(reassignedJob.result) : {};
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) currentResult = parsed as Record<string, unknown>;
      } catch {
        // Preserve the known assignment below rather than publishing corrupt result JSON.
      }
      const priorCapabilityHistory = Array.isArray(currentResult.investigatorCapabilityHistory)
        ? currentResult.investigatorCapabilityHistory
        : [];
      const retainedCapabilityHistory = priorCapabilityHistory.slice(Math.max(0, priorCapabilityHistory.length - 14));
      await updateJob(atlasJobId, {
        message: `${replacement.toUpperCase()} Investigator continuing after explicit quota reassignment…`,
        result: JSON.stringify({
          ...currentResult,
          selectedInvestigator: replacement,
          investigatorCapabilityHistory: [...retainedCapabilityHistory, {
            from: failedCapability,
            to: replacement,
            trigger: "upstream_quota_exhausted",
          }],
        }),
      });
      phaseSummary.investigatorReassignment = `${failedCapability} → ${replacement} after explicit upstream_quota_exhausted; remaining alternates=${getAvailableDistinctInvestigatorCapabilities(process.env, bossExcludedCapabilities).join(",") || "none"}`;
      return replacement;
    };
    const persistTokenCapacityReassignmentFailure = async (
      failedCapability: InvestigatorCapability,
      failure: string,
      detail: Record<string, unknown>,
      trigger: "upstream_token_window_wait_exceeded" | "upstream_token_quota_exhausted" = "upstream_token_window_wait_exceeded",
    ): Promise<void> => {
      failureStage = "case_persistence";
      await db.transaction(async (tx) => {
        const [lockedCase] = await tx.select({
          status: researchCasesTable.status,
          currentAction: researchCasesTable.currentAction,
          iteration: researchCasesTable.iteration,
        })
          .from(researchCasesTable)
          .where(and(
            eq(researchCasesTable.id, discoveryCaseId),
            sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,
          ))
          .for("update")
          .limit(1);
        if (!lockedCase || lockedCase.status !== "active" || ["canonical-atlas-cancelled", "canonical-lease-lost"].includes(String(lockedCase.currentAction ?? ""))) {
          throw new Error("Canonical Atlas discovery case is no longer active; refusing to record token-capacity reassignment outcome.");
        }
        const [latestEvent] = await tx.select({ iteration: researchCaseEventsTable.iteration })
          .from(researchCaseEventsTable)
          .where(eq(researchCaseEventsTable.caseId, discoveryCaseId))
          .orderBy(desc(researchCaseEventsTable.id))
          .limit(1);
        const nextIteration = nextResearchCaseEventIteration(lockedCase.iteration, latestEvent?.iteration);
        await tx.update(researchCasesTable)
          .set({ currentAction: "canonical-investigator-token-capacity-reassignment-unavailable", updatedAt: new Date() })
          .where(and(
            eq(researchCasesTable.id, discoveryCaseId),
            eq(researchCasesTable.status, "active"),
            sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,
          ));
        await tx.insert(researchCaseEventsTable).values({
          caseId: discoveryCaseId,
          iteration: nextIteration,
          actorRole: "groq_boss",
          eventType: "provider_error",
          status: "error",
          summary: trigger === "upstream_token_quota_exhausted"
            ? "Boss-directed Investigator reassignment was unavailable after an explicit tokens-per-day quota failure; discovery will be parked for review."
            : "Boss-directed Investigator reassignment was unavailable after repeated token-window capacity failures; discovery will be parked for review.",
          correlationKey: `${atlasJobId}:investigator-token-capacity-reassignment-unavailable:${nextIteration}`,
          payload: JSON.stringify({
            jobId: atlasJobId,
            from: failedCapability,
            trigger,
            failure,
            ...detail,
          }),
        }).onConflictDoNothing({ target: [researchCaseEventsTable.caseId, researchCaseEventsTable.correlationKey] });
      }, { isolationLevel: "serializable" });
    };
    const reassignInvestigatorAfterPersistentTokenCapacity = async (
      failedCapability: InvestigatorCapability,
      failure: string,
      trigger: "upstream_token_window_wait_exceeded" | "upstream_token_quota_exhausted" = "upstream_token_window_wait_exceeded",
    ): Promise<InvestigatorCapability | null> => {
      if (tokenCapacityReassignmentUsed) return null;
      tokenCapacityReassignmentUsed = true;
      const dailyTokenQuota = trigger === "upstream_token_quota_exhausted";
      tokenCapacityUnavailableInvestigators.add(failedCapability);
      const unavailableCapabilities = allUnavailableInvestigatorCapabilities();
      // Groq token budgets are model-scoped. Keep same-model credential aliases
      // excluded, but explicitly allow the Boss-selected 20B model capability
      // when the default 120B capability's token capacity is exhausted.
      const failedOn20BModel = failedCapability === GROQ_INVESTIGATOR_20B_CAPABILITY;
      const excludedCapabilityAliases = failedOn20BModel
        ? []
        : getInvestigatorCredentialAliases(process.env, unavailableCapabilities)
            .filter((capability) => capability !== GROQ_INVESTIGATOR_20B_CAPABILITY);
      const bossExcludedCapabilities = [...new Set([...unavailableCapabilities, ...excludedCapabilityAliases])];
      const availableAlternates = getAvailableDistinctInvestigatorCapabilities(process.env, bossExcludedCapabilities);
      if (
        !failedOn20BModel
        && getAvailableInvestigatorCapabilities(process.env).includes(GROQ_INVESTIGATOR_20B_CAPABILITY)
        && !availableAlternates.includes(GROQ_INVESTIGATOR_20B_CAPABILITY)
      ) availableAlternates.push(GROQ_INVESTIGATOR_20B_CAPABILITY);
      if (!availableAlternates.length) {
        await persistTokenCapacityReassignmentFailure(failedCapability, failure, {
          reason: "no_distinct_configured_investigator",
          availableAlternates,
        }, trigger);
        phaseSummary.investigatorReassignment = dailyTokenQuota
          ? `${failedCapability} exhausted the explicit tokens-per-day budget; no distinct configured Investigator remains, so the case is parked for review.`
          : `${failedCapability} remained unavailable after bounded token-window retries; no distinct configured Investigator remains, so the case is parked for review.`;
        return null;
      }
      await assertAtlasJobActive(atlasJobId);
      failureStage = "boss_opening_request";
      const reassignment = await runGroqBossDiscovery({
        jobId: atlasJobId,
        caseId: discoveryCaseId,
        objective: `${discoveryObjective}\n\n${dailyTokenQuota
          ? `EXPLICIT TOKENS-PER-DAY QUOTA RECOVERY: Investigator capability ${failedCapability} returned upstream_token_quota_exhausted after Groq explicitly reported its tokens-per-day (TPD) limit. This is a daily token budget, NOT hard request-count quota and NOT a short-window token reset; do not relabel it as upstream_quota_exhausted or retry the same key. Choose exactly one capability from this runtime-computed alternate list to continue this same durable case: ${availableAlternates.join(", ") || "(none)"}. Do not choose an excluded capability. The explicit groq-investigator-20b capability uses GPT-OSS 20B and is a valid alternate model budget even when it shares the configured credential. Do not prescribe a search query, tool, provider, or research sequence. If the alternate list is empty or no listed capability is viable, leave the case for review.`
          : `PERSISTENT TOKEN-CAPACITY RECOVERY: Investigator capability ${failedCapability} returned repeated upstream_token_window_wait_exceeded failures after bounded same-capability retries in consecutive discovery episodes. This is token-window capacity exhaustion, NOT hard request-quota exhaustion; do not relabel it as upstream_quota_exhausted. Choose exactly one capability from this runtime-computed alternate list to continue this same durable case: ${availableAlternates.join(", ") || "(none)"}. Do not choose an excluded capability. The explicit groq-investigator-20b capability uses GPT-OSS 20B and is a valid alternate model budget even when it shares the configured credential. Do not prescribe a search query, tool, provider, or research sequence. If the alternate list is empty or no listed capability is viable, leave the case for review.`}\n\nFAILURE: ${failure}`,
        motivation: dailyTokenQuota
          ? "Recover one canonical investigation after an explicit daily token-cap failure. Let the Boss choose a distinct available Investigator capability; preserve all existing evidence and research gates."
          : "Recover one canonical investigation after repeated token-window capacity failures. Let the Boss choose a distinct available Investigator capability; preserve all existing evidence and research gates.",
        geography: opts.discoveryGeography || "Public web; geography selected by the research objective",
        exclusions: opts.discoveryExclusions ?? [
          "Do not browse as Boss.",
          "Do not prescribe a fixed tool or search sequence.",
          "Do not invent people, contacts, relationships, or URLs.",
          "Do not select any excluded or previously unavailable Investigator capability.",
        ],
        startingLane: dailyTokenQuota
          ? "Boss-directed Investigator reassignment after explicit tokens-per-day quota exhaustion"
          : "Boss-directed Investigator reassignment after repeated token-window capacity failures",
        excludedInvestigatorLlm: bossExcludedCapabilities,
      });
      await assertAtlasJobActive(atlasJobId);
      const replacement = reassignment.investigatorLlm;
      if (
        reassignment.status !== "completed"
        || !replacement
        || replacement === failedCapability
        || allUnavailableInvestigatorCapabilities().includes(replacement)
        || !availableAlternates.includes(replacement)
      ) {
        await persistTokenCapacityReassignmentFailure(failedCapability, failure, {
          reason: "boss_did_not_select_a_distinct_available_investigator",
          availableAlternates,
          bossModel: reassignment.model,
          bossStatus: reassignment.status,
          bossSelectedCapability: replacement ?? null,
          bossError: reassignment.error ?? null,
        }, trigger);
        phaseSummary.investigatorReassignment = dailyTokenQuota
          ? `${failedCapability} hit the explicit tokens-per-day cap; Boss did not select a distinct viable Investigator, so the case is parked for review.`
          : `${failedCapability} remained unavailable after bounded token-window retries; Boss did not select a distinct viable Investigator, so the case is parked for review.`;
        return null;
      }
      failureStage = "case_persistence";
      await db.transaction(async (tx) => {
        const [lockedCase] = await tx.select({
          status: researchCasesTable.status,
          currentAction: researchCasesTable.currentAction,
          caseFile: researchCasesTable.caseFile,
          iteration: researchCasesTable.iteration,
        })
          .from(researchCasesTable)
          .where(and(
            eq(researchCasesTable.id, discoveryCaseId),
            sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,
          ))
          .for("update")
          .limit(1);
        if (!lockedCase || lockedCase.status !== "active" || ["canonical-atlas-cancelled", "canonical-lease-lost"].includes(String(lockedCase.currentAction ?? ""))) {
          throw new Error("Canonical Atlas discovery case is no longer active; refusing token-capacity Investigator reassignment.");
        }
        let caseFile: Record<string, unknown> = {};
        try {
          caseFile = lockedCase.caseFile ? JSON.parse(lockedCase.caseFile) as Record<string, unknown> : {};
        } catch {
          throw new Error("Canonical Atlas discovery case has unreadable durable state during token-capacity reassignment.");
        }
        const previousAssignment = typeof caseFile.investigatorLlm === "string" ? caseFile.investigatorLlm : failedCapability;
        if (previousAssignment !== failedCapability) {
          throw new Error("Canonical Atlas discovery Investigator changed during token-capacity reassignment; refusing stale assignment.");
        }
        const history = Array.isArray(caseFile.investigatorCapabilityHistory) ? caseFile.investigatorCapabilityHistory : [];
        const nextFile = {
          ...caseFile,
          investigatorLlm: replacement,
          investigatorCapabilityHistory: [...history, {
            from: previousAssignment,
            to: replacement,
            trigger,
          }].slice(-15),
        };
        const [latestEvent] = await tx.select({ iteration: researchCaseEventsTable.iteration })
          .from(researchCaseEventsTable)
          .where(eq(researchCaseEventsTable.caseId, discoveryCaseId))
          .orderBy(desc(researchCaseEventsTable.id))
          .limit(1);
        const nextIteration = nextResearchCaseEventIteration(lockedCase.iteration, latestEvent?.iteration);
        await tx.update(researchCasesTable)
          .set({
            caseFile: JSON.stringify(nextFile),
            iteration: nextIteration,
            currentAction: "canonical-investigator-reassigned-after-token-capacity",
            updatedAt: new Date(),
          })
          .where(and(
            eq(researchCasesTable.id, discoveryCaseId),
            eq(researchCasesTable.status, "active"),
            sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,
          ));
        await tx.insert(researchCaseEventsTable).values({
          caseId: discoveryCaseId,
          iteration: nextIteration,
          actorRole: "groq_boss",
          eventType: "assignment",
          status: "recorded",
          summary: dailyTokenQuota
            ? "Groq Boss reassigned the canonical Investigator after an explicit tokens-per-day quota failure; the exhausted capability remains excluded for this job."
            : "Groq Boss reassigned the canonical Investigator after repeated token-window capacity failures; the unavailable capability remains excluded for this job.",
          correlationKey: `${atlasJobId}:investigator-token-capacity-reassignment:${failedCapability}:${replacement}:${nextIteration}`,
          payload: JSON.stringify({
            jobId: atlasJobId,
            from: failedCapability,
            to: replacement,
            trigger,
            hardRequestQuotaExhausted: false,
            tokenDailyQuotaExhausted: dailyTokenQuota,
            consecutiveCapacityFailures: consecutiveInvestigatorTokenCapacityFailures,
            excludedInvestigators: bossExcludedCapabilities,
            bossModel: reassignment.model,
            bossStatus: reassignment.status,
            bossReport: reassignment.report,
            error: reassignment.error,
          }),
        });
      }, { isolationLevel: "serializable" });
      selectedInvestigator = replacement;
      phaseSummary.investigatorReassignment = dailyTokenQuota
        ? `${failedCapability} → ${replacement} after upstream_token_quota_exhausted; the original capability is excluded for this job.`
        : `${failedCapability} → ${replacement} after repeated upstream_token_window_wait_exceeded; the original capability is excluded for this job.`;
      return replacement;
    };
    const mergeDiscoveryResults = (failed: Awaited<ReturnType<typeof runBureauAgenticWebPass>>, recovered: Awaited<ReturnType<typeof runBureauAgenticWebPass>>): Awaited<ReturnType<typeof runBureauAgenticWebPass>> => ({ ...recovered, partialFindings: [...(failed.partialFindings ?? []), ...(recovered.partialFindings ?? [])], searches: failed.searches + recovered.searches, visits: failed.visits + recovered.visits, iterations: failed.iterations + recovered.iterations, findings: [...(failed.findings ?? []), ...(recovered.findings ?? [])], modelFindings: [...(failed.modelFindings ?? []), ...(recovered.modelFindings ?? [])], trajectory: [...(failed.trajectory ?? []), ...(recovered.trajectory ?? [])], trajectoryRecords: [...(failed.trajectoryRecords ?? []), ...(recovered.trajectoryRecords ?? [])], consecutiveActionParseFailures: recovered.consecutiveActionParseFailures ?? failed.consecutiveActionParseFailures ?? 0 });
    const runDiscoveryWithQuotaRecovery = async (initial: Awaited<ReturnType<typeof runBureauAgenticWebPass>>, objective: string, budgetMs: number, maxIterations: number, priorTrajectoryRecords: NonNullable<Awaited<ReturnType<typeof runBureauAgenticWebPass>>["trajectoryRecords"]> = [], tokenDailyQuotaAdditionalIterations = maxIterations): Promise<Awaited<ReturnType<typeof runBureauAgenticWebPass>>> => {
      let result = initial;
      let iterationsConsumed = Math.max(0, result.iterations ?? result.trajectoryRecords?.length ?? 0);
      while (isInvestigatorHardQuotaExhausted(result) || isInvestigatorTokenDailyQuotaUnavailableEpisode(result)) {
        const dailyTokenQuotaFailure = isInvestigatorTokenDailyQuotaUnavailableEpisode(result);
        // Preserve the original hard-request-quota budget calculation; the
        // separate TPD path is bounded to one act and the global budget left.
        const remainingIterations = Math.max(0, maxIterations - iterationsConsumed);
        const quotaRecoveryIterations = dailyTokenQuotaFailure
          ? Math.max(0, tokenDailyQuotaAdditionalIterations)
          : remainingIterations;
        if (quotaRecoveryIterations <= 0) break;
        const failedCapability = selectedInvestigator;
        const replacement = isInvestigatorHardQuotaExhausted(result)
          ? await reassignInvestigatorAfterHardQuota(failedCapability, result.error ?? "upstream_quota_exhausted")
          : await reassignInvestigatorAfterPersistentTokenCapacity(
            failedCapability,
            result.error ?? "upstream_token_quota_exhausted",
            "upstream_token_quota_exhausted",
          );
        if (!replacement) break;
        failureStage = "investigator_episode";
        const recovered = await runBureauAgenticWebPass({ mode: "discovery", targetName: "", objective, investigatorLlm: replacement, caseId: discoveryCaseId, jobId: atlasJobId, maxIterations: quotaRecoveryIterations, hardTimeoutMs: budgetMs, priorTrajectoryRecords: [...priorTrajectoryRecords, ...(result.trajectoryRecords ?? [])], initialConsecutiveActionParseFailures: result.stopReason === "PARSE_FAILURE" ? 0 : result.consecutiveActionParseFailures ?? 0, shouldCancel: shouldCancelAtlasInvestigator, onDiscoveryCheckpoint: checkpointDiscoveryFindings });
        iterationsConsumed += Math.max(0, recovered.iterations ?? recovered.trajectoryRecords?.length ?? 0);
        result = mergeDiscoveryResults(result, recovered);
        if (!isInvestigatorHardQuotaExhausted(recovered) && !isInvestigatorTokenDailyQuotaUnavailableEpisode(recovered)) break;
      }
      return result;
    };
    // Case creation is separate from the Redis job state. Reconcile immediately
    // after creation so a stop that won the check-before-create race cannot leave
    // an active orphan discovery case.
    await reconcileDiscoveryCaseCancellation(atlasJobId, discoveryCaseId);
    const priorCardReconciliation = await reconcileCanonicalDiscoveryCaseReviewCards({ atlasJobId, discoveryCaseId });
    materialized += priorCardReconciliation.materialized;
    evidenceRows += priorCardReconciliation.evidenceRows;
    failureStage = "case_persistence";
    await db.transaction(async (tx) => {
      // Serialize the opening event against the durable cancellation fence.
      // Whichever transaction acquires the case row first wins the ordering;
      // a cancelled case can never receive a new opening event afterward.
      const [lockedCase] = await tx.select({
        status: researchCasesTable.status,
        currentAction: researchCasesTable.currentAction,
        iteration: researchCasesTable.iteration,
      })
        .from(researchCasesTable)
        .where(and(eq(researchCasesTable.id, discoveryCaseId), sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`))
        .for("update")
        .limit(1);
      if (
        !lockedCase ||
        lockedCase.status !== "active" ||
        lockedCase.currentAction === "canonical-atlas-cancelled" ||
        lockedCase.currentAction === "canonical-lease-lost"
      ) {
        throw new Error("Canonical Atlas discovery case is no longer active; refusing assignment event after cancellation.");
      }
      await tx.insert(researchCaseEventsTable).values({
        caseId: discoveryCaseId,
        iteration: Number(lockedCase.iteration ?? 0),
        actorRole: "groq_boss",
        eventType: "assignment",
        status: "recorded",
        summary: "Groq Boss opened the canonical Atlas discovery case and selected the Investigator.",
        correlationKey: `${atlasJobId}:boss-opening`,
        payload: JSON.stringify({
          jobId: atlasJobId,
          investigatorLlm: boss.investigatorLlm,
          model: boss.model,
          report: boss.report,
          nextDirections: boss.nextDirections,
          uncertainties: boss.uncertainties,
          mode: "discovery",
          controlPlane: "canonical-atlas-discovery",
        }),
      });
    });

    // Boss first, independent Right-hand second. Right-hand advises; Boss
    // receives that advice and makes the final opening control decision.
    failureStage = "right_hand_opening_review";
    const rightHandRaw = await import("./groq-right-hand-reasoning").then(({ runGroqRightHandFreeJson }) =>
      runGroqRightHandFreeJson(
        `Independently review Groq Boss's opening Atlas hypotheses against the exact human objective. Objective: ${discoveryObjective}. Boss selected Investigator: ${boss.investigatorLlm}. Boss report (unverified hypothesis, not evidence): ${boss.report ?? ""}. Initial directions (unverified hypotheses, not evidence): ${JSON.stringify(boss.nextDirections)}. Uncertainties: ${JSON.stringify(boss.uncertainties)}. Assess targetability, scope, geographic/source feasibility, unsupported assumptions, and alternatives. You cannot browse and must not treat confidence as evidence. Do not choose tools, select the Investigator, or authorize/deny execution. Give Boss your independent recommendation and rationale; Boss alone decides whether to keep, revise, or stop. A disagreement is advice, not a veto. Return concise decision, reason, focusLanes and confidence.`,
        "You are Groq Right-hand. You independently advise Groq Boss; you do not authorize or veto the opening, choose tools, or replace the Investigator. Boss will evaluate your advice and make the final decision. Return ONE JSON object only.",
        ATLAS_OPENING_RIGHT_HAND_REVIEW_RESPONSE_FORMAT,
        (raw) => {
          try {
            const value: unknown = JSON.parse(raw);
            const parsed = value && typeof value === "object" && !Array.isArray(value)
              ? value as Record<string, unknown>
              : null;
            return validateAtlasOpeningRightHandReview(parsed);
          } catch {
            return false;
          }
        },
        { jobId: atlasJobId, caseId: discoveryCaseId },
        {
          maxCompletionTokens: 1_024,
          reasoningEffort: "low",
          maxAttempts: 4,
          generationBudgetRecovery: {
            maxCompletionTokens: 1_536,
            reasoningEffort: "low",
          },
        },
      ),
    ).catch((error) => ({
      status: "unavailable" as const,
      model: "none",
      raw: null,
      error: safeThrownErrorSummary("Groq Right-hand opening advice unavailable", error),
    }));
    await assertAtlasJobActive(atlasJobId);

    let rightHand: {
      status: "completed" | "unavailable";
      model: string;
      decision: string | null;
      reason: string | null;
      focusLanes: string[];
      confidence: number | null;
      error: string | null;
    } = {
      status: "unavailable",
      model: rightHandRaw.model,
      decision: null,
      reason: null,
      focusLanes: [],
      confidence: null,
      error: rightHandRaw.error ?? "Right-hand returned no usable opening advice.",
    };
    if (rightHandRaw.status === "completed" && rightHandRaw.raw?.trim()) {
      try {
        const value: unknown = JSON.parse(rightHandRaw.raw);
        const parsed = value && typeof value === "object" && !Array.isArray(value)
          ? value as Record<string, unknown>
          : null;
        if (validateAtlasOpeningRightHandReview(parsed)) {
          rightHand = {
            status: "completed",
            model: rightHandRaw.model,
            decision: (parsed!.decision as string).trim(),
            reason: (parsed!.reason as string).trim(),
            focusLanes: (parsed!.focusLanes as string[]).map((lane) => lane.trim()),
            confidence: parsed!.confidence as number,
            error: null,
          };
        } else {
          rightHand.error = "Right-hand returned an invalid advisory review contract.";
        }
      } catch {
        rightHand.error = "Right-hand returned invalid JSON.";
      }
    } else if (rightHandRaw.status === "completed") {
      rightHand.error = "Right-hand returned an empty opening advice response.";
    }

    // Persist the review exactly as an advisory observation. An unavailable
    // review is also recorded; it is not an automatic stop/veto.
    failureStage = "case_persistence";
    await db.transaction(async (tx) => {
      const [lockedCase] = await tx.select({ status: researchCasesTable.status, currentAction: researchCasesTable.currentAction })
        .from(researchCasesTable)
        .where(and(eq(researchCasesTable.id, discoveryCaseId), sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`))
        .for("update")
        .limit(1);
      if (!lockedCase || lockedCase.status !== "active" || ["canonical-atlas-cancelled", "canonical-lease-lost"].includes(String(lockedCase.currentAction ?? ""))) {
        throw new Error("Canonical Atlas discovery case was cancelled before Right-hand opening advisory event.");
      }
      await tx.insert(researchCaseEventsTable).values({
        caseId: discoveryCaseId,
        iteration: 0,
        actorRole: "right_hand",
        eventType: "observation",
        status: rightHand.status === "completed" ? "recorded" : "unavailable",
        summary: rightHand.status === "completed"
          ? "Groq Right-hand recorded independent advisory observations for Boss's opening decision; advice is not an authorization gate."
          : "Groq Right-hand opening advice was unavailable; Boss remains responsible for the final opening decision.",
        correlationKey: `${atlasJobId}:right-hand-opening`,
        payload: JSON.stringify({
          jobId: atlasJobId,
          bossModel: boss.model,
          investigatorLlm: boss.investigatorLlm,
          status: rightHand.status,
          decision: rightHand.decision,
          reason: rightHand.reason,
          focusLanes: rightHand.focusLanes,
          confidence: rightHand.confidence,
          error: rightHand.error,
          authority: "advisory_only",
        }),
      });
    }, { isolationLevel: "serializable" });

    // Boss must consume the review and make the final decision. On the opening
    // turn there are no admitted targets or Investigator observations yet.
    // A Right-hand outage is passed through as context; a Boss outage or invalid
    // Boss action remains fail-closed.
    failureStage = "control_event_persistence";
    const openingBossDecision = await decideAtlasNextAction({
      objective: activeDiscoveryObjective,
      admittedCandidates: [],
      discoveryStatus: "opening_review_complete; no Investigator episode has executed yet",
      discoveryTrajectory: [],
      discoveryFindings: [],
      caseId: discoveryCaseId,
      controlTurn: 1,
      jobId: atlasJobId,
      investigatorReport: JSON.stringify({
        stage: "opening_adjudication",
        bossInitialReport: boss.report ?? null,
        bossInitialDirections: boss.nextDirections ?? [],
        bossUncertainties: boss.uncertainties ?? [],
        instruction: "This is the opening adjudication before the first Investigator action. Evaluate the Right-hand advice and make the final Boss decision. You may continue with the initial direction, pivot to a validated alternative you choose, continue the human base objective without adopting any direction, or stop.",
      }),
      pinnedControlState: [
        "OPENING CONTROL STATE (authoritative): Boss has selected the Investigator capability but has not yet activated an opening research direction.",
        "HUMAN OBJECTIVE: " + activeDiscoveryObjective,
        "Boss report (unverified control hypothesis, not source evidence): " + compactControlText(boss.report, 1_200),
        "BOSS INITIAL HYPOTHESES (unverified, not evidence): " + JSON.stringify(boss.nextDirections ?? []),
        "RIGHT-HAND AUTHORITY: advisory only. Boss must evaluate its recommendation and owns the final decision.",
        "Flag unsupported sectors, geographies, company premises, or targets rather than repeating them as facts. Internal memory, storage, and workflow terminology is not a research lead.",
        "The human mission and realistic-targetability rules outrank Boss next-directions. Compare proposed directions with the human objective and observed sources; test whether any proposed direction has a defensible advantage over plausible alternatives.",
      ].join("\n"),
      rightHandOverride: {
        status: rightHand.status,
        decision: rightHand.decision,
        reason: rightHand.reason,
        direction: null,
        confidence: rightHand.confidence,
        model: rightHand.model,
        error: rightHand.error,
      },
    });
    await assertAtlasJobActive(atlasJobId);
    if (openingBossDecision.status !== "completed") {
      failureStage = "oversight_control_decision";
      throw new Error("Groq Boss could not make a valid final opening decision after Right-hand advice: " + (openingBossDecision.error ?? openingBossDecision.reason ?? "unknown Boss control failure"));
    }

    const initialBossDirection = Array.isArray(boss.nextDirections) ? boss.nextDirections[0] : null;
    const openingDirectionResolution = resolveBossAdjudicatedOpeningDirection({
      bossAction: openingBossDecision.action,
      bossDirection: openingBossDecision.direction,
      initialBossDirection,
    });
    if (openingDirectionResolution.status === "invalid") {
      failureStage = "model_action_validation";
      throw new Error("Groq Boss opening decision failed canonical objective validation: " + openingDirectionResolution.reason);
    }
    if (openingDirectionResolution.status === "stopped") {
      failureStage = "terminal_persistence";
      await db.update(researchCasesTable).set({
        status: "review",
        currentAction: "groq-boss-opening-stop",
        lastDecisionAt: new Date(),
        updatedAt: new Date(),
      }).where(and(
        eq(researchCasesTable.id, discoveryCaseId),
        eq(researchCasesTable.status, "active"),
        sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,
        sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`,
      ));
      await updateJob(atlasJobId, {
        status: "done",
        progress: 100,
        atlasPhase: 0,
        message: "Groq Boss chose to stop after evaluating the objective and Right-hand advice. No Investigator action was executed; the case is preserved for review.",
        outcome: "incomplete",
        result: JSON.stringify({ boss: openingBossDecision, rightHand, discoveryCaseId, investigatorActionsExecuted: 0, evidenceBackedTerminal: false }),
        finishedAt: new Date().toISOString(),
      });
      phaseSummary.assignment = "Boss chose stop after weighing Right-hand advice; no Investigator action was executed.";
      await clearActiveJobIfOwned(lockKey, atlasJobId);
      return { phase: 0, ingested: 0, enriched: 0, contactsFound: 0, hotLeads: 0, durationMs: Date.now() - startedAt, phaseSummary };
    }

    const approvedOpeningDirection = openingDirectionResolution.status === "approved"
      ? openingDirectionResolution.direction
      : "";
    if (approvedOpeningDirection) {
      const openingObjective = resolveBossDirectedDiscoveryObjective({
        action: openingBossDecision.action === "pivot_discovery" ? "pivot_discovery" : "continue_discovery",
        baseObjective: discoveryObjective,
        currentObjective: activeDiscoveryObjective,
        direction: approvedOpeningDirection,
      });
      if (!openingObjective.valid) {
        failureStage = "model_action_validation";
        throw new Error("Groq Boss-adjudicated opening direction failed canonical objective validation: " + openingObjective.reason);
      }
      failureStage = "control_event_persistence";
      await persistAcceptedAtlasDiscoveryObjective({
        caseId: discoveryCaseId,
        jobId: atlasJobId,
        controlTurn: 1,
        action: openingBossDecision.action === "pivot_discovery" ? "pivot_discovery" : "continue_discovery",
        direction: openingObjective.direction,
        baseObjective: discoveryObjective,
        previousObjective: activeDiscoveryObjective,
        activeObjective: openingObjective.objective,
      });
      activeDiscoveryObjective = openingObjective.objective;
    }
    const openingInvestigatorObjective = [
      activeDiscoveryObjective,
      "BOSS FINAL OPENING DECISION:",
      openingDirectionResolution.status === "approved"
        ? "Groq Boss adopted this validated opening direction. It is an active research hypothesis, not source evidence."
        : "Groq Boss chose to continue the human base objective without activating its initial direction. Do not treat unselected Boss hypotheses as active scope.",
      "Boss action: " + openingBossDecision.action,
      openingDirectionResolution.status === "approved" ? "Boss-adjudicated direction: " + openingDirectionResolution.direction : "",
      compactControlText(openingBossDecision.reason, 800) ? "Boss rationale: " + compactControlText(openingBossDecision.reason, 800) : "",
      "RIGHT-HAND INDEPENDENT ADVICE (non-authoritative):",
      "Right-hand status: " + rightHand.status,
      compactControlText(rightHand.decision, 300) ? "Recommendation: " + compactControlText(rightHand.decision, 300) : "",
      compactControlText(rightHand.reason, 800) ? "Reason: " + compactControlText(rightHand.reason, 800) : "",
      rightHand.focusLanes.length ? "Focus lanes: " + JSON.stringify(rightHand.focusLanes).slice(0, 600) : "",
      rightHand.error ? "Advice unavailable / invalid: " + compactControlText(rightHand.error, 300) : "",
      "Boss has already weighed this advice and owns the final scope decision. These control-plane observations are not source evidence. Choose tools, providers, queries, visits, and stopping points yourself; if the active objective is unsupported or infeasible, report why and return control to Boss for a revised decision.",
    ].filter(Boolean).join("\n");
    failureStage = "job_state_or_lease";
    await assertAtlasJobActive(atlasJobId);
    await updateJob(atlasJobId, {
      progress: 1,
      atlasPhase: 1,
      message: `${boss.investigatorLlm.toUpperCase()} Investigator running free-ReAct discovery…`,
      result: JSON.stringify({ rightHand, boss: { status: boss.status, model: boss.model, investigatorLlm: boss.investigatorLlm }, openingBossDecision, discoveryCaseId }),
    });
    failureStage = "case_persistence";
    await db.transaction(async (tx) => {
      const [lockedCase] = await tx.select({ status: researchCasesTable.status, currentAction: researchCasesTable.currentAction })
        .from(researchCasesTable)
        .where(and(eq(researchCasesTable.id, discoveryCaseId), sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`))
        .for("update")
        .limit(1);
      if (!lockedCase || lockedCase.status !== "active" || ["canonical-atlas-cancelled", "canonical-lease-lost"].includes(String(lockedCase.currentAction ?? ""))) {
        throw new Error("Canonical Atlas discovery case was cancelled before Investigator assignment event.");
      }
      await tx.insert(researchCaseEventsTable).values({
        caseId: discoveryCaseId,
        iteration: 0,
        actorRole: "head_investigator",
        eventType: "assignment",
        status: "recorded",
        summary: "Canonical discovery Investigator mounted after Boss opening and Right-hand review.",
        correlationKey: `${atlasJobId}:discovery-assignment`,
        payload: JSON.stringify({ jobId: atlasJobId, investigatorLlm: boss.investigatorLlm, mode: "discovery", controlPlane: "canonical-atlas-discovery" }),
      });
    }, { isolationLevel: "serializable" });
    await assertAtlasJobActive(atlasJobId);
    const openingDiscoveryBudget = Math.min(opts.targetTimeoutMs ?? depth.agenticHardTimeoutMs, assertAtlasDeadline() - 5_000); if (openingDiscoveryBudget < 30_000) throw new Error("Insufficient remaining Atlas budget for discovery Investigator.");
    // Treat the opening discovery episode like every Boss-directed continuation: a bounded act, not the entire job-wide Investigator budget. This leaves the model-owned Boss control loop room to assess evidence and direct a continuation or target investigation instead of consuming the global ceiling before the first control decision.
    const targetResearchReserveIterations = Math.min(depth.agenticMaxIterations, Math.max(depth.investigatorIterationsPerAct, Math.ceil(depth.agenticMaxIterations * 0.4)));
    // Until a candidate is admitted, all globally bounded Investigator actions remain available to discovery. The target-stage reserve becomes real only after a qualifying lead exists.
    const discoveryIterationCeiling = depth.agenticMaxIterations;
    const discoveryIterationsPerAct = resolveDiscoveryIterationsPerAct(depth, discoveryIterationCeiling);
    const openingInvestigatorIterations = Math.min(discoveryIterationsPerAct, discoveryIterationCeiling);
    failureStage = "investigator_episode";
    let discovery = await runBureauAgenticWebPass({ mode: "discovery", targetName: "", objective: openingInvestigatorObjective, investigatorLlm: selectedInvestigator, caseId: discoveryCaseId, jobId: atlasJobId, maxIterations: openingInvestigatorIterations, hardTimeoutMs: openingDiscoveryBudget, shouldCancel: shouldCancelAtlasInvestigator, onDiscoveryCheckpoint: checkpointDiscoveryFindings });
    discovery = await runDiscoveryWithQuotaRecovery(
      discovery,
      openingInvestigatorObjective,
      openingDiscoveryBudget,
      openingInvestigatorIterations,
      [],
      resolveInvestigatorTokenDailyQuotaRecoveryIterations(
        openingInvestigatorIterations,
        discovery.iterations ?? discovery.trajectoryRecords?.length ?? 0,
        discoveryIterationCeiling,
      ),
    );
    let consecutiveInvestigatorProviderUnavailable = advanceInvestigatorProviderUnavailableStreak(0, discovery);
    consecutiveInvestigatorTokenCapacityFailures = advanceInvestigatorTokenCapacityFailureStreak(0, discovery);
    let tokenCapacityFailureInvestigator = selectedInvestigator;
    await assertAtlasJobActive(atlasJobId);
    failureStage = "candidate_admission_persistence";
    let admission = await materializeAtlasAdmissions({ discoveryRunId: discovery.runId ?? "", findings: [...(discovery.findings ?? []), ...(discovery.partialFindings ?? [])], atlasJobId, discoveryCaseId });
    let admitted = admission.names; let admittedCandidateSources = admission.candidates; materialized += admission.materialized; evidenceRows += admission.evidenceRows; let researched = 0; let contactsFound = 0; const [latestControlEvent] = await db.select({ iteration: researchCaseEventsTable.iteration, payload: researchCaseEventsTable.payload }).from(researchCaseEventsTable).where(and(eq(researchCaseEventsTable.caseId, discoveryCaseId), eq(researchCaseEventsTable.eventType, "control_decision"))).orderBy(desc(researchCaseEventsTable.id)).limit(1); let controlTurns = 0; if (typeof latestControlEvent?.payload === "string") { try { const priorControl = JSON.parse(latestControlEvent.payload) as Record<string, unknown>; controlTurns = Number(priorControl.controlTurn ?? 0); } catch {} } let priorAction: AtlasControlAction | null = null; let priorCandidate: string | null = null; let priorCandidateType: "person" | "organization" | null = null; if (typeof latestControlEvent?.payload === "string") { try { const prior = JSON.parse(latestControlEvent.payload) as Record<string, unknown>; const action = typeof prior.action === "string" ? prior.action as AtlasControlAction : null; priorAction = action && ["continue_discovery", "research_candidate", "revisit_candidate", "pivot_discovery", "stop"].includes(action) ? action : null; priorCandidate = typeof prior.candidateName === "string" ? prior.candidateName : null; priorCandidateType = prior.candidateType === "person" || prior.candidateType === "organization" ? prior.candidateType : null; } catch {} } let discoveryRuns = allUnavailableInvestigatorCapabilities().length > 0 ? 1 + allUnavailableInvestigatorCapabilities().length : 1; let latestTargetInvestigation: Record<string, unknown> | null = null; let latestEvidenceBackedTerminal: "discovery" | "target" | null = discovery.status === "completed" && discovery.stopReason === "MODEL_DECIDED_DONE" && admitted.length > 0 ? "discovery" : null; let investigatorIterationsUsed = discovery.iterations; let discoveryIterationsUsed = discovery.iterations; let discoveryResourceLimited = resolveRemainingDiscoveryIterations({ totalIterationCeiling: depth.agenticMaxIterations, discoveryIterationCeiling, discoveryIterationsUsed, investigatorIterationsUsed, targetResearchReserveIterations, hasAdmittedCandidates: admittedCandidateSources.length > 0 }) <= 0 && discovery.stopReason !== "MODEL_DECIDED_DONE"; let investigatorResourceLimited = investigatorIterationsUsed >= depth.agenticMaxIterations; let finalControlAction: AtlasControlAction | null = null; let rejectedControlDecision: { controlTurn: number; reason: string; kind: "candidate_selection" | "pivot_direction" | "discovery_budget" } | null = null;
    const researchedNames = new Set<string>();
    let latestEpisodeActionExecuted = hasExecutedInvestigatorResearchAction(discovery.trajectoryRecords ?? []);
    phaseSummary.assignment = `${selectedInvestigator} currently selected by Groq; opening capability=${boss.investigatorLlm}; discovery completed=${discovery.status}; durableCase=${discoveryCaseId}.`; phaseSummary.discovery = `admitted=${admitted.length}; materialized=${materialized}; evidenceRows=${evidenceRows}; searches=${discovery.searches}; visits=${discovery.visits}; trajectory=${discovery.trajectory.length}; structuredTurns=${discovery.trajectoryRecords?.length ?? 0}`;
    if (discoveryOnly) {
      await assertAtlasJobActive(atlasJobId);
      const [current] = await db.select({ caseFile: researchCasesTable.caseFile, iteration: researchCasesTable.iteration }).from(researchCasesTable).where(and(eq(researchCasesTable.id, discoveryCaseId),eq(researchCasesTable.status,"active"),sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`)).limit(1);
      let caseFile: Record<string, any> = {}; try { const parsed = current?.caseFile ? JSON.parse(current.caseFile) : {}; if (parsed && typeof parsed === "object") caseFile = parsed; } catch { caseFile = {}; }
      const candidates = admittedCandidateSources.map(({ name, sourceUrls, role, targetType }) => ({ name, type: "review_candidate", targetType, role, relevance: targetType === "organization" ? "Source-backed organization lead available for target-scoped research; not an ownership or wealth conclusion" : "Explicit Investigator discovery admission candidate", reachability: "Requires target-scoped Investigator research", sourceUrls, contactEvidence: [], state: "review_only", admittedEntityId: null }));
      const discoveryHealth = summarizeAtlasDiscoveryResearchHealth(discovery.trajectoryRecords ?? [], admitted.length);
      await assertAtlasJobActive(atlasJobId);
      failureStage = "case_persistence";
      await db.transaction(async (tx) => {
        const [locked] = await tx.select({ caseFile: researchCasesTable.caseFile, iteration: researchCasesTable.iteration }).from(researchCasesTable).where(and(eq(researchCasesTable.id, discoveryCaseId), eq(researchCasesTable.status, "active"), sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`, sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`)).for("update").limit(1);
        if (!locked) throw new Error("Canonical discovery admission projection lost its active case fence.");
        let lockedCaseFile: Record<string, any> = {};
        try { const parsed = locked.caseFile ? JSON.parse(locked.caseFile) : {}; if (parsed && typeof parsed === "object") lockedCaseFile = parsed; } catch { throw new Error("Canonical discovery admission caseFile became unreadable."); }
        const nextIteration = Number(locked.iteration ?? 0) + 1;
        await tx.update(researchCasesTable).set({ caseFile: JSON.stringify({ ...lockedCaseFile, discoveredCandidates: [...(Array.isArray(lockedCaseFile.discoveredCandidates) ? lockedCaseFile.discoveredCandidates : []), ...candidates], currentProgress: { ...(lockedCaseFile.currentProgress ?? {}), lastDiscoveryAt: new Date().toISOString(), lastReviewedBy: "groq-boss" } }), currentAction: admitted.length ? "target-scoped-investigator-research" : "review", iteration: nextIteration, updatedAt: new Date() }).where(and(eq(researchCasesTable.id, discoveryCaseId), eq(researchCasesTable.status, "active"), sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`, sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`));
        await tx.insert(researchCaseEventsTable).values({ caseId: discoveryCaseId, iteration: nextIteration, actorRole: "specialist", eventType: "observation", status: "recorded", summary: `Canonical discovery admission: ${admitted.length} review candidate(s).`, correlationKey: `${atlasJobId}:discovery-admission:${nextIteration}`, payload: JSON.stringify({ jobId: atlasJobId, investigatorLlm: boss.investigatorLlm, admitted, admittedCandidates: admittedCandidateSources, proposedSourceUrls: (discovery.findings ?? []).flatMap((finding) => finding.sourceUrls) }) });
      }, { isolationLevel: "serializable" });
      const durableStatus = discovery.status === "completed" && discovery.stopReason === "MODEL_DECIDED_DONE" && !discoveryResourceLimited && admitted.length > 0 ? "complete" : "review";
      const terminal = deriveCanonicalTerminalDecision({ durableCaseStatus: durableStatus, locallyCancelled: discovery.status === "cancelled" });
      failureStage = "terminal_persistence";
      await db.update(researchCasesTable).set({
        status: terminal.caseStatus,
        currentAction: durableStatus === "complete" ? "review" : "canonical-discovery-incomplete",
        updatedAt: new Date(),
      }).where(and(eq(researchCasesTable.id, discoveryCaseId),eq(researchCasesTable.status,"active"),sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`));
      failureStage = "job_state_or_lease";
      await assertAtlasJobActive(atlasJobId);
      await updateJob(atlasJobId, {
        status: terminal.jobStatus,
        progress: 1,
        total: 1,
        atlasPhase: 1,
        atlasPhaseTotal: 1,
        outcome: terminal.outcome,
        message: durableStatus === "complete"
          ? `Canonical discovery complete: ${admitted.length} exact named candidate(s) admitted with durable source evidence.`
          : discovery.status === "completed" && admitted.length === 0
            ? "Investigator stopped without a durably evidenced candidate admission; case preserved for review."
            : `Canonical discovery preserved for review: status=${discovery.status}; stopReason=${discovery.error ?? discovery.stopReason ?? discovery.status}; durableAdmissions=${admitted.length}.`,
        result: JSON.stringify({ rightHand, boss, discovery: { status: discovery.status, findings: discovery.findings.length, searches: discovery.searches, visits: discovery.visits, caseId: discoveryCaseId, trajectoryEntries: discovery.trajectory.length, trajectoryRecords: discovery.trajectoryRecords ?? [] }, discoveryHealth }),
        finishedAt: new Date().toISOString(),
      });
      await clearActiveJobIfOwned(lockKey, atlasJobId);
      return { phase: 1, ingested: 0, enriched: materialized, contactsFound: 0, hotLeads: admitted.length, durationMs: Date.now() - startedAt, phaseSummary };
    }
    while (true) {
      await assertAtlasJobActive(atlasJobId);
      assertAtlasDeadline();
      if (researched >= targetLimit) break;
      // If no review-only lead qualified, do not keep spending model tokens on
      // Boss control turns after discovery has exhausted its own allocation.
      // There is no valid target-research action without an admitted candidate.
      if (admittedCandidateSources.length === 0 && resolveRemainingDiscoveryIterations({
        totalIterationCeiling: depth.agenticMaxIterations,
        discoveryIterationCeiling,
        discoveryIterationsUsed,
        investigatorIterationsUsed,
        targetResearchReserveIterations,
        hasAdmittedCandidates: false,
      }) <= 0) {
        discoveryResourceLimited = true;
        phaseSummary.discoveryBudgetPolicy = `All ${depth.agenticMaxIterations} globally bounded Investigator actions were used without a source-backed lead. No target-scoped research is authorized without a qualifying candidate.`;
        phaseSummary.discoveryIterationCeiling = phaseSummary.discoveryBudgetPolicy;
        finalControlAction = "stop";
        break;
      }
      if (controlTurns >= maxControlTurns) {
        const safetyMessage = `Canonical Atlas control safety ceiling reached after ${maxControlTurns} AI control turns; refusing another transition.`;
        phaseSummary.controlSafetyCeiling = safetyMessage;
        failureStage = "case_persistence";
        await db.update(researchCasesTable).set({
          status: "review",
          currentAction: "canonical-control-safety-ceiling",
          lastDecisionAt: new Date(),
          updatedAt: new Date(),
        }).where(and(
          eq(researchCasesTable.id, discoveryCaseId),
          eq(researchCasesTable.status, "active"),
          sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,
          sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`,
        ));
        failureStage = "job_state_or_lease";
        await updateJob(atlasJobId, {
          status: "failed",
          progress: 3,
          total: 4,
          atlasPhase: 3,
          atlasPhaseTotal: 4,
          outcome: "incomplete",
          message: safetyMessage,
          result: JSON.stringify({ discovery: { status: discovery.status, findings: discovery.findings.length, searches: discovery.searches, visits: discovery.visits, caseId: discoveryCaseId, trajectoryRecordCount: discovery.trajectoryRecords?.length ?? 0 }, discoveryHealth: summarizeAtlasDiscoveryResearchHealth(discovery.trajectoryRecords ?? [], admitted.length), control: { turns: controlTurns, maxControlTurns, safetyCeiling: true } }),
          finishedAt: new Date().toISOString(),
        });
        await clearActiveJobIfOwned(lockKey, atlasJobId);
        return { phase: 3, ingested: 0, enriched: materialized, contactsFound, hotLeads: admitted.length, durationMs: Date.now() - startedAt, phaseSummary };
      }
      const previousAcceptedAction = priorAction;
      const previousAcceptedCandidate = priorCandidate;
      controlTurns += 1;
      const controlValidationFeedback = rejectedControlDecision;
      failureStage = "oversight_control_decision";
      const controlFindings = [...(discovery.findings ?? []), ...(discovery.partialFindings ?? [])];
      const controlLeadInventory = buildDiscoveryLeadUtilizationState(discovery.trajectoryRecords ?? []);
      const pinnedControlState = buildAtlasPinnedControlState({ activeScope: discoveryPivotScopeKey(activeDiscoveryObjective), leadInventory: controlLeadInventory, admittedCandidates: admittedCandidateSources.map(({ name, role, sourceUrls, targetType }) => ({ name, role, sourceUrls, targetType })), findings: controlFindings });
      const decision = await decideAtlasNextAction({ objective: activeDiscoveryObjective, admittedCandidates: admittedCandidateSources.map(({ name, role, sourceUrls, targetType }) => ({ name, role, sourceUrls, targetType })), discoveryStatus: discovery.status, discoveryTrajectory: discovery.trajectory, discoveryTrajectoryRecords: discovery.trajectoryRecords, discoveryFindings: controlFindings.map((finding) => ({ value: finding.value, personName: finding.personName, role: finding.role, scope: finding.scope, promotionDecision: finding.promotionDecision, sourceUrls: finding.sourceUrls, note: finding.note })), priorAction, priorCandidate, priorCandidateType, caseId: discoveryCaseId, controlTurn: controlTurns, jobId: atlasJobId, pinnedControlState, investigatorReport: JSON.stringify({
        provider: boss.investigatorLlm,
        controlValidationFeedback: controlValidationFeedback ? (controlValidationFeedback.kind === "pivot_direction"
          ? `The previous Boss discovery direction at control turn ${controlValidationFeedback.controlTurn} was rejected by deterministic control validation: ${controlValidationFeedback.reason}. No Investigator tool was executed. Choose a corrected structured research direction or a different valid control action; do not include a concrete URL or prescribe a provider/tool. This feedback is control state, not research evidence.`
          : controlValidationFeedback.kind === "candidate_selection"
            ? `The previous Boss candidate selection at control turn ${controlValidationFeedback.controlTurn} was rejected because the candidate was absent from the durable admitted-candidate list. No target investigation was executed. Do not treat a name in source text or a Right-hand suggestion as candidate admission. Choose a valid model-owned control action; if more discovery is needed, direct the Investigator to continue gathering source-backed evidence and make an explicit admission decision. This feedback is control state, not research evidence.`
            : (admittedCandidateSources.length > 0
            ? `The bounded discovery allocation is exhausted at ${discoveryIterationsUsed}/${depth.agenticMaxIterations} total Investigator actions. ${Math.max(0, depth.agenticMaxIterations - investigatorIterationsUsed)} global action(s) remain reserved for target-scoped research. Choose research_candidate or revisit_candidate only from the durable admitted-candidate list, or stop. Do not choose another discovery continuation without remaining allocated budget. This is control state, not research evidence.`
            : `The global ${depth.agenticMaxIterations}-action discovery ceiling has been reached without an admitted candidate. No target-scoped research is authorized without a source-backed lead. Stop/park rather than requesting another discovery act. This is control state, not research evidence.`)) : null,
        scopeRecoveryFeedback: buildAtlasScopeRecoveryFeedback(discovery.trajectoryRecords ?? []),
        status: discovery.status,
        stopReason: discovery.stopReason ?? null,
        missionActionBudget: buildMissionActionBudget({
          actionsUsed: investigatorIterationsUsed,
          maximumActions: depth.agenticMaxIterations,
          maximumActionsPerEpisode: discoveryIterationsPerAct,
          episodeStopReason: discovery.stopReason ?? null,
        }),
        errorSummary: discovery.error ? safeThrownErrorSummary("Investigator result", new Error(discovery.error)) : null,
        searches: discovery.searches,
        visits: discovery.visits,
        findings: discovery.findings,
        modelFindings: discovery.modelFindings,
        ...buildDiscoveryLeadUtilizationState(discovery.trajectoryRecords ?? []),
        targetInvestigation: latestTargetInvestigation,
        openQuestions: discovery.trajectoryRecords?.map((record) => ({
          turn: record.turn,
          action: record.action,
          execution: record.execution,
          observation: record.observation,
          observedUrls: record.observedUrls,
          // Make search results visible to Boss/Right-hand without mislabelling
          // them as retrieved evidence. A blocked action is never a source result.
          // This is a bounded per-record excerpt only. The top-level case-wide
          // unfetchedLeadUrls/failedLeadUrls fields are the authoritative inventory.
          searchResultLeadUrls: record.execution === "success"
            && ["web_search", "parallel_web_search", "registry_search", "parallel_registry_search"].includes(record.action)
            ? (record.leadUrls ?? []).slice(0, 4)
              .map((url) => sanitizeUrlForEvidence(url))
              .filter((url) => !url.startsWith("["))
            : [],
          stopReason: record.stopReason,
          failureDomain: record.failureDomain,
          failureKind: record.failureKind,
        })) ?? [],
      }, null, 2) });
      if (controlValidationFeedback) rejectedControlDecision = null;
      await assertAtlasJobActive(atlasJobId);
      phaseSummary[`control_${controlTurns}`] = `${decision.action}${decision.candidateName ? `:${decision.candidateName}` : ""}${decision.direction ? ` — ${decision.direction}` : ""}`;
      if (isRecoverableAtlasControlRejection(decision)) {
        // An unadmitted person is never researched. Persist the rejection, tell the
        // model control plane exactly why it was rejected, and request another bounded
        // model-owned decision. Admission and candidate validation remain unchanged.
        const rejectionReason = "Groq Boss selected a candidate absent from the durable admitted-candidate list; no target investigation was executed.";
        rejectedControlDecision = { controlTurn: controlTurns, reason: rejectionReason, kind: "candidate_selection" };
        priorAction = previousAcceptedAction;
        priorCandidate = previousAcceptedCandidate;
        finalControlAction = null;
        phaseSummary[`control_${controlTurns}_candidate_rejected`] = "Out-of-set candidate selection rejected before target research; requesting a new model-owned control decision.";
        await assertAtlasJobActive(atlasJobId);
        failureStage = "control_event_persistence";
        await db.transaction(async (tx) => {
          const [lockedCase] = await tx.select({ status: researchCasesTable.status, currentAction: researchCasesTable.currentAction })
            .from(researchCasesTable)
            .where(and(
              eq(researchCasesTable.id, discoveryCaseId),
              eq(researchCasesTable.status, "active"),
              sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,
              sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`,
            ))
            .for("update")
            .limit(1);
          if (!lockedCase) throw new Error("Canonical Atlas discovery ownership was lost while recording a rejected Boss candidate selection.");
          const [latestEvent] = await tx.select({ iteration: researchCaseEventsTable.iteration })
            .from(researchCaseEventsTable)
            .where(eq(researchCaseEventsTable.caseId, discoveryCaseId))
            .orderBy(desc(researchCaseEventsTable.id))
            .limit(1);
          const nextIteration = Number(latestEvent?.iteration ?? 0) + 1;
          await tx.update(researchCasesTable).set({
            status: "active",
            currentAction: "canonical-control-candidate-rejected",
            lastDecisionAt: new Date(),
            updatedAt: new Date(),
          }).where(and(
            eq(researchCasesTable.id, discoveryCaseId),
            eq(researchCasesTable.status, "active"),
            sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,
            sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`,
          ));
          await tx.insert(researchCaseEventsTable).values({
            caseId: discoveryCaseId,
            iteration: nextIteration,
            actorRole: "groq_boss",
            eventType: "observation",
            status: "rejected",
            summary: `Atlas rejected an out-of-set Boss candidate selection at control turn ${controlTurns}; no target investigation executed.`,
            correlationKey: `${atlasJobId}:control-candidate-rejected:${controlTurns}`,
            payload: JSON.stringify({
              jobId: atlasJobId,
              controlTurn: controlTurns,
              failureDomain: "model_action",
              failureKind: "invalid_candidate_selection",
              investigatorActionExecuted: false,
              recovery: "request-new-model-control-decision",
              admittedCandidateCount: admittedCandidateSources.length,
            }),
          }).onConflictDoNothing({ target: [researchCaseEventsTable.caseId, researchCaseEventsTable.correlationKey] });
        }, { isolationLevel: "serializable" });
        continue;
      }
      failureStage = "case_persistence";
      await db.update(researchCasesTable).set({
        status: decision.status === "completed" ? (decision.action === "stop" ? "review" : "active") : "review",
        currentAction: decision.status === "completed" ? (decision.action === "stop" ? "canonical-discovery-stopped" : `canonical-control-${decision.action}`) : "canonical-control-unavailable",
        lastDecisionAt: new Date(),
        updatedAt: new Date(),
      }).where(and(eq(researchCasesTable.id, discoveryCaseId),eq(researchCasesTable.status,"active"),sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`));
      finalControlAction = decision.action;
      if (decision.status !== "completed") {
        const terminalMessage = decision.reason || decision.error || "Atlas control decision became unavailable; discovery stopped fail-closed for review.";
        failureStage = "job_state_or_lease";
        // This branch terminalizes the job directly instead of throwing through
        // the outer failure catch; preserve a nonzero durable error count here too.
        let priorErrorCount = 0;
        try {
          priorErrorCount = Number((await getJobStrict(atlasJobId))?.errors ?? 0);
        } catch {
          // A status-writeable but temporarily unreadable job still records at least one error.
        }
        await updateJob(atlasJobId, { status: "failed", errors: Math.max(1, priorErrorCount), progress: 3, total: 4, atlasPhase: 3, atlasPhaseTotal: 4, outcome: "incomplete", message: terminalMessage, result: JSON.stringify({ rightHand, boss: { status: boss.status, model: boss.model, investigatorLlm: boss.investigatorLlm }, discovery: { status: discovery.status, findings: discovery.findings.length, searches: discovery.searches, visits: discovery.visits, caseId: discoveryCaseId, runs: discoveryRuns }, discoveryHealth: summarizeAtlasDiscoveryResearchHealth(discovery.trajectoryRecords ?? [], admitted.length), control: { turns: controlTurns, decision } }), finishedAt: new Date().toISOString() });
        await clearActiveJobIfOwned(lockKey, atlasJobId);
        return { phase: 3, ingested: 0, enriched: materialized, contactsFound, hotLeads: admitted.length, durationMs: Date.now() - startedAt, phaseSummary };
      }
      finalControlAction = decision.action;
      if (decision.action === "stop") break;
      priorAction = decision.action; priorCandidate = decision.candidateName;
      if (decision.action === "research_candidate" || decision.action === "revisit_candidate") {
        await assertAtlasJobActive(atlasJobId);
        const name = decision.candidateName; if (!name) continue;
        failureStage = "case_persistence";
        const selectedTargetType = decision.candidateType ?? "person";
        const targetKey = `${selectedTargetType}:${name.toLowerCase()}`;
        const eligibleEntityTypes = selectedTargetType === "organization" ? ["Corporation"] : ["HNWI", "Gatekeeper", "PersonCandidate"];
        const entityRows = await db.select({ id: entitiesTable.id, name: entitiesTable.name, type: entitiesTable.type, metadata: entitiesTable.metadata }).from(entitiesTable).where(and(sql`LOWER(${entitiesTable.name}) = LOWER(${name})`, inArray(entitiesTable.type, eligibleEntityTypes))).limit(16);
        const entity = entityRows.find((row) => {
          try {
            const metadata = row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : {};
            return Number(metadata.discoveryCaseId) === discoveryCaseId
              && (selectedTargetType !== "organization" || metadata.partialOrganizationLead === true);
          } catch { return false; }
        });
        if (!entity) { phaseSummary[`control_${controlTurns}_candidate_binding`] = `No durable entity binding for admitted ${selectedTargetType} target ${name}; refusing ambiguous same-name target research.`; continue; }
        if (decision.action === "research_candidate" && researchedNames.has(targetKey)) continue;
        const before = await db.select({ email: entitiesTable.email, phone: entitiesTable.phone, linkedinUrl: entitiesTable.linkedinUrl, twitterHandle: entitiesTable.twitterHandle, instagramHandle: entitiesTable.instagramHandle, telegramHandle: entitiesTable.telegramHandle, personalWebsite: entitiesTable.personalWebsite }).from(entitiesTable).where(eq(entitiesTable.id, entity.id)).limit(1); const beforeCard = before[0] ?? null;
        await assertAtlasJobActive(atlasJobId);
        const targetBudget = Math.min(opts.targetTimeoutMs ?? depth.agenticHardTimeoutMs, assertAtlasDeadline() - 5_000); if (targetBudget < 30_000) throw new Error("Insufficient remaining Atlas budget for target investigation.");
        const remainingTargetIterations = Math.max(0, depth.agenticMaxIterations - investigatorIterationsUsed); if (remainingTargetIterations <= 0) { investigatorResourceLimited = true; phaseSummary.controlSafetyCeiling = `Canonical Atlas Investigator iteration ceiling reached at ${investigatorIterationsUsed}/${depth.agenticMaxIterations}; refusing another target episode.`; break; }
        failureStage = "investigator_episode";
        const targetResult = await runCanonicalSingleTargetInvestigation(atlasJobId, entity.id, { researchDepth: opts.researchDepth, targetTimeoutMs: targetBudget, manageJobLifecycle: false, maxInvestigatorIterations: remainingTargetIterations, excludedInvestigatorLlm: allUnavailableInvestigatorCapabilities() });
        for (const exhausted of targetResult.exhaustedInvestigatorLlm) quotaExhaustedInvestigators.add(exhausted);
        if (quotaExhaustedInvestigators.has(selectedInvestigator)) {
          await reassignInvestigatorAfterHardQuota(selectedInvestigator, "A target-scoped Investigator capability exhausted its upstream request quota during this Atlas job; the discovery capability is therefore also excluded for the remainder of this job.");
        }
        investigatorIterationsUsed += Math.max(0, targetResult.investigatorIterationsUsed);
        investigatorResourceLimited = investigatorResourceLimited || targetResult.resourceLimited;
        await assertAtlasJobActive(atlasJobId);
        const [targetCase] = await db.select({ id: researchCasesTable.id, status: researchCasesTable.status, iteration: researchCasesTable.iteration, caseFile: researchCasesTable.caseFile }).from(researchCasesTable).where(and(eq(researchCasesTable.targetEntityId, entity.id), eq(researchCasesTable.caseType, "target"), sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${atlasJobId}`)).orderBy(sql`${researchCasesTable.updatedAt} DESC`).limit(1);
        latestEvidenceBackedTerminal = deriveLatestEvidenceBackedTerminal("target", targetResult.status);
         let targetState: Record<string, unknown> = {};
        try { targetState = targetCase?.caseFile ? JSON.parse(targetCase.caseFile) as Record<string, unknown> : {}; } catch { targetState = {}; }
        latestTargetInvestigation = {
          targetName: name,
          caseId: targetCase?.id ?? null,
          status: targetCase?.status ?? "unknown",
          iteration: Number(targetCase?.iteration ?? 0),
          completedActs: Number(targetState.completedActs ?? 0),
          resourceLimited: Boolean(targetState.resourceLimited),
          deadlineExceeded: Boolean(targetState.deadlineExceeded),
          cancelled: Boolean(targetState.cancelled),
          lastOversight: targetState.lastOversight ?? null,
          contextDocument: typeof targetState.contextDocument === "string" ? targetState.contextDocument : null,
        };
        researched += 1; researchedNames.add(`${selectedTargetType}:${name.toLowerCase()}`);
        const after = await db.select({ email: entitiesTable.email, phone: entitiesTable.phone, linkedinUrl: entitiesTable.linkedinUrl, twitterHandle: entitiesTable.twitterHandle, instagramHandle: entitiesTable.instagramHandle, telegramHandle: entitiesTable.telegramHandle, personalWebsite: entitiesTable.personalWebsite }).from(entitiesTable).where(eq(entitiesTable.id, entity.id)).limit(1); const afterCard = after[0] ?? null;
        if (beforeCard && afterCard) { const cardFields: Array<keyof typeof beforeCard> = ["email", "phone", "linkedinUrl", "twitterHandle", "instagramHandle", "telegramHandle", "personalWebsite"]; contactsFound += cardFields.filter((field) => beforeCard[field] !== afterCard[field] && afterCard[field]).length; }
        continue;
      }
      if (decision.action === "continue_discovery" || decision.action === "pivot_discovery") {
        await assertAtlasJobActive(atlasJobId);
        failureStage = "model_action_validation";
        const resolvedObjective = resolveBossDirectedDiscoveryObjective({
          action: decision.action,
          baseObjective: discoveryObjective,
          currentObjective: activeDiscoveryObjective,
          direction: decision.direction,
          requireExplicitDirection: decision.action === "continue_discovery" && !latestEpisodeActionExecuted,
        });
        if (!resolvedObjective.valid) {
          // A malformed Boss pivot is a rejected control decision, not a reason to
          // terminate the whole Atlas job. Preserve the rejection and ask the model
          // control plane for another decision; never execute the rejected URL/tool.
          const rejectionReason = resolvedObjective.reason;
          rejectedControlDecision = { controlTurn: controlTurns, reason: rejectionReason, kind: "pivot_direction" };
          // This pivot was rejected, so the next control turn must see only the last accepted transition.
          priorAction = previousAcceptedAction;
          priorCandidate = previousAcceptedCandidate;
          finalControlAction = null;
          phaseSummary[`control_${controlTurns}_rejected`] = `Boss pivot rejected before Investigator execution: ${rejectionReason}; requesting another model-owned control decision.`;
          await assertAtlasJobActive(atlasJobId);
          failureStage = "control_event_persistence";
          await db.transaction(async (tx) => {
            const [lockedCase] = await tx.select({ status: researchCasesTable.status, currentAction: researchCasesTable.currentAction, caseFile: researchCasesTable.caseFile })
              .from(researchCasesTable)
              .where(and(
                eq(researchCasesTable.id, discoveryCaseId),
                eq(researchCasesTable.status, "active"),
                sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,
                sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`,
              ))
              .for("update")
              .limit(1);
            if (!lockedCase) throw new Error("Canonical Atlas discovery ownership was lost while recording a rejected Boss pivot.");
            const [latestEvent] = await tx.select({ iteration: researchCaseEventsTable.iteration })
              .from(researchCaseEventsTable)
              .where(eq(researchCaseEventsTable.caseId, discoveryCaseId))
              .orderBy(desc(researchCaseEventsTable.id))
              .limit(1);
            await tx.update(researchCasesTable).set({
              status: "active",
              currentAction: "canonical-control-direction-rejected",
              lastDecisionAt: new Date(),
              updatedAt: new Date(),
            }).where(and(
              eq(researchCasesTable.id, discoveryCaseId),
              eq(researchCasesTable.status, "active"),
              sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,
              sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`,
            ));
            await tx.insert(researchCaseEventsTable).values({
              caseId: discoveryCaseId,
              iteration: Number(latestEvent?.iteration ?? 0) + 1,
              actorRole: "groq_boss",
              eventType: "observation",
              status: "rejected",
              summary: `Atlas rejected invalid model-directed ${decision.action} at control turn ${controlTurns}; no Investigator action executed.`,
              correlationKey: `${atlasJobId}:control-direction-rejected:${controlTurns}`,
              payload: JSON.stringify({ jobId: atlasJobId, controlTurn: controlTurns, action: decision.action, reason: rejectionReason, failureDomain: "model_action", failureKind: "invalid_contract", investigatorActionExecuted: false, recovery: "request-new-model-control-decision" }),
            }).onConflictDoNothing({ target: [researchCaseEventsTable.caseId, researchCaseEventsTable.correlationKey] });
          }, { isolationLevel: "serializable" });
          continue;
        }
        failureStage = "orchestration";
        const directedObjective = resolvedObjective.objective;
        const discoveryBudget = Math.min(opts.targetTimeoutMs ?? depth.agenticHardTimeoutMs, assertAtlasDeadline() - 5_000); if (discoveryBudget < 30_000) throw new Error("Insufficient remaining Atlas budget for continued discovery.");
        const remainingInvestigatorIterations = resolveRemainingDiscoveryIterations({
          totalIterationCeiling: depth.agenticMaxIterations,
          discoveryIterationCeiling,
          discoveryIterationsUsed,
          investigatorIterationsUsed,
          targetResearchReserveIterations,
          hasAdmittedCandidates: admittedCandidateSources.length > 0,
        });
        if (admittedCandidateSources.length === 0) {
          phaseSummary.discoveryBudgetPolicy = `No candidate has been admitted, so the unused target-stage reserve is released for additional discovery within the global ${depth.agenticMaxIterations}-action and hard-timeout limits.`;
        }
        if (remainingInvestigatorIterations <= 0) {
          discoveryResourceLimited = true;
          phaseSummary.discoveryIterationCeiling = admittedCandidateSources.length > 0
            ? `Discovery allocation exhausted at ${discoveryIterationsUsed}/${Math.max(0, depth.agenticMaxIterations - targetResearchReserveIterations)} discovery actions; remaining global actions are protected for target-scoped research.`
            : `Discovery reached the global ${depth.agenticMaxIterations}-action ceiling without an admitted candidate; target research remains unauthorized without a qualifying lead.`;
          rejectedControlDecision = { controlTurn: controlTurns, reason: "The bounded discovery-action budget is exhausted; no further discovery episode can execute.", kind: "discovery_budget" };
          priorAction = previousAcceptedAction;
          priorCandidate = previousAcceptedCandidate;
          finalControlAction = null;
          continue;
        }
        // Only clear the previous evidence-backed terminal after control validation and
        // all budget/iteration guards pass, at the exact point a new Investigator act starts.
        failureStage = "control_event_persistence";
        await persistAcceptedAtlasDiscoveryObjective({
          caseId: discoveryCaseId,
          jobId: atlasJobId,
          controlTurn: controlTurns,
          action: decision.action,
          direction: resolvedObjective.direction,
          baseObjective: discoveryObjective,
          previousObjective: activeDiscoveryObjective,
          activeObjective: directedObjective,
        });
        activeDiscoveryObjective = directedObjective;
        latestEvidenceBackedTerminal = null;
        failureStage = "investigator_episode";
        let nextDiscovery = await runBureauAgenticWebPass({ mode: "discovery", targetName: "", objective: directedObjective, investigatorLlm: selectedInvestigator, caseId: discoveryCaseId, jobId: atlasJobId, maxIterations: Math.min(resolveDiscoveryIterationsPerAct(depth, remainingInvestigatorIterations), remainingInvestigatorIterations), hardTimeoutMs: discoveryBudget, priorTrajectoryRecords: discovery.trajectoryRecords ?? [], initialConsecutiveActionParseFailures: discovery.stopReason === "PARSE_FAILURE" ? 0 : discovery.consecutiveActionParseFailures ?? 0, shouldCancel: shouldCancelAtlasInvestigator, onDiscoveryCheckpoint: checkpointDiscoveryFindings });
        await assertAtlasJobActive(atlasJobId);
        nextDiscovery = await runDiscoveryWithQuotaRecovery(
          nextDiscovery,
          directedObjective,
          discoveryBudget,
          Math.min(discoveryIterationsPerAct, remainingInvestigatorIterations),
          discovery.trajectoryRecords ?? [],
          resolveInvestigatorTokenDailyQuotaRecoveryIterations(
            Math.min(discoveryIterationsPerAct, remainingInvestigatorIterations),
            nextDiscovery.iterations ?? nextDiscovery.trajectoryRecords?.length ?? 0,
            remainingInvestigatorIterations,
          ),
        );

        // A failed/empty continuation is an orchestration failure, not permission
        // to ask Boss for another pivot without executing useful Investigator work.
        // nextDiscovery contains this continuation episode's local trajectory, not the cumulative discovery result.
        const newTrajectoryRecords = nextDiscovery.trajectoryRecords ?? [];
        const newTrajectoryRecordCount = newTrajectoryRecords.length;
        const investigatorActionExecuted = hasExecutedInvestigatorResearchAction(newTrajectoryRecords);
        const episodeFailure = classifyInvestigatorEpisodeFailure({
          status: nextDiscovery.status,
          iterations: nextDiscovery.iterations,
          stopReason: nextDiscovery.stopReason,
          trajectoryRecords: nextDiscovery.trajectoryRecords ?? [],
        });
        if (episodeFailure) {
          const runtimeFailureRecord = [...newTrajectoryRecords].reverse().find((record) => record.action === "runtime_error");
          const runtimeFailureStage = typeof runtimeFailureRecord?.args?.stage === "string" ? runtimeFailureRecord.args.stage : null;
          // This branch exits before the success-path merge below; keep the failed episode in the cumulative terminal report.
          discovery = mergeDiscoveryResults(discovery, nextDiscovery);
          // The episode error path exits before the normal admission refresh.
          // Preserve qualified candidates and source-backed organization-only
          // partial cards from every captured action before terminalizing failure.
          await assertAtlasJobActive(atlasJobId);
          failureStage = "candidate_admission_persistence";
          admission = await materializeAtlasAdmissions({
            discoveryRunId: discovery.runId ?? "",
            findings: [...(discovery.findings ?? []), ...(discovery.partialFindings ?? [])],
            atlasJobId,
            discoveryCaseId,
          });
          admittedCandidateSources = mergeDurablyAdmittedAtlasTargetSources([admittedCandidateSources, admission.candidates]);
          admitted = admittedCandidateSources.map(({ name }) => name);
          materialized += admission.materialized;
          evidenceRows += admission.evidenceRows;
          const underlyingError = new Error(nextDiscovery.error ?? episodeFailure.code);
          const providerDiagnostic = describeThrownProviderError(underlyingError);
          const runtimeFailureDomain = runtimeFailureRecord?.failureDomain;
          const runtimeFailureKind = runtimeFailureRecord?.failureKind;
          const diagnostic = runtimeFailureRecord?.action === "runtime_error" && runtimeFailureDomain && runtimeFailureKind
            ? { domain: runtimeFailureDomain, kind: runtimeFailureKind }
            : classifyCanonicalAtlasFailure({ stage: "investigator_episode", error: new Error(episodeFailure.code) });
          const errorSummary = safeThrownErrorSummary("Canonical Investigator continuation failed", underlyingError);
          const failureMessage = `Canonical Investigator continuation stopped before a usable new research pass; case preserved for review. (${errorSummary}; failureDomain=${diagnostic.domain}; failureKind=${diagnostic.kind})`;
          failureStage = "case_persistence";
          await db.transaction(async (tx) => {
            const [lockedCase] = await tx.select({
              status: researchCasesTable.status,
              iteration: researchCasesTable.iteration,
              currentAction: researchCasesTable.currentAction,
            })
              .from(researchCasesTable)
              .where(and(
                eq(researchCasesTable.id, discoveryCaseId),
                eq(researchCasesTable.status, "active"),
                sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,
                sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`,
              ))
              .for("update")
              .limit(1);
            if (!lockedCase) throw new Error("Canonical discovery ownership was lost while recording a failed Investigator continuation.");
            const [latestEvent] = await tx.select({ iteration: researchCaseEventsTable.iteration })
              .from(researchCaseEventsTable)
              .where(eq(researchCaseEventsTable.caseId, discoveryCaseId))
              .orderBy(desc(researchCaseEventsTable.id))
              .limit(1);
            const nextIteration = Math.max(Number(lockedCase.iteration ?? 0), Number(latestEvent?.iteration ?? 0)) + 1;
            await tx.update(researchCasesTable).set({
              status: "review",
              currentAction: "canonical-investigator-episode-failed",
              lastDecisionAt: new Date(),
              updatedAt: new Date(),
            }).where(and(
              eq(researchCasesTable.id, discoveryCaseId),
              eq(researchCasesTable.status, "active"),
              sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,
            ));
            await tx.insert(researchCaseEventsTable).values({
              caseId: discoveryCaseId,
              iteration: nextIteration,
              actorRole: "head_investigator",
              eventType: "observation",
              status: "error",
              summary: "Canonical Investigator continuation failed before producing a usable research pass; case parked for review.",
              correlationKey: `${atlasJobId}:investigator-episode-failure:control:${controlTurns}`,
              payload: JSON.stringify({
                jobId: atlasJobId,
                controlTurn: controlTurns,
                failureCode: episodeFailure.code,
                reportedStatus: nextDiscovery.status,
                stopReason: nextDiscovery.stopReason ?? null,
                iterations: nextDiscovery.iterations,
                trajectoryRecordCount: nextDiscovery.trajectoryRecords?.length ?? 0,
                newTrajectoryRecordCount,
                runtimeFailureStage,
                cumulativeSearches: discovery.searches,
                cumulativeVisits: discovery.visits,
                cumulativeIterations: discovery.iterations,
                cumulativeTrajectoryRecordCount: discovery.trajectoryRecords?.length ?? 0,
                failureDomain: diagnostic.domain,
                failureKind: diagnostic.kind,
                errorClass: providerDiagnostic.errorName,
                errorCode: providerDiagnostic.errorCode,
                messageDigest: providerDiagnostic.messageDigest,
                investigatorActionExecuted,
              }),
            }).onConflictDoNothing({ target: [researchCaseEventsTable.caseId, researchCaseEventsTable.correlationKey] });
          }, { isolationLevel: "serializable" });
          failureStage = "job_state_or_lease";
          await updateJob(atlasJobId, {
            status: "failed",
            progress: 3,
            total: 4,
            atlasPhase: 3,
            atlasPhaseTotal: 4,
            outcome: "incomplete",
            message: failureMessage,
            result: JSON.stringify({
              rightHand,
              boss: { status: boss.status, model: boss.model, investigatorLlm: boss.investigatorLlm },
              discovery: { status: discovery.status, findings: discovery.findings.length, searches: discovery.searches, visits: discovery.visits, caseId: discoveryCaseId, trajectoryEntries: discovery.trajectory.length, trajectoryRecordCount: discovery.trajectoryRecords?.length ?? 0, runs: discoveryRuns + 1 },
              control: { turns: controlTurns, finalAction: decision.action, finalCandidate: priorCandidate },
              investigatorEpisodeFailure: {
                code: episodeFailure.code,
                status: nextDiscovery.status,
                stopReason: nextDiscovery.stopReason ?? null,
                iterations: nextDiscovery.iterations,
                trajectoryRecordCount: nextDiscovery.trajectoryRecords?.length ?? 0,
                failureDomain: diagnostic.domain,
                failureKind: diagnostic.kind,
                runtimeFailureStage,
                localEpisodeSearches: nextDiscovery.searches,
                localEpisodeVisits: nextDiscovery.visits,
                cumulativeSearches: discovery.searches,
                cumulativeVisits: discovery.visits,
                cumulativeTrajectoryRecordCount: discovery.trajectoryRecords?.length ?? 0,
                discoveryHealth: summarizeAtlasDiscoveryResearchHealth(discovery.trajectoryRecords ?? [], admitted.length),
                messageDigest: providerDiagnostic.messageDigest,
              },
            }),
            finishedAt: new Date().toISOString(),
          });
          await clearActiveJobIfOwned(lockKey, atlasJobId);
          return { phase: 3, ingested: 0, enriched: materialized, contactsFound, hotLeads: admitted.length, durationMs: Date.now() - startedAt, phaseSummary };
        }

        // Keep the canonical discovery result cumulative across Boss-directed
        // episodes. Each episode's local result is useful for control decisions,
        // but replacing the durable summary with the latest episode can erase
        // previously observed searches/visits from the job result.
        discovery = mergeDiscoveryResults(discovery, nextDiscovery);
        latestEpisodeActionExecuted = hasExecutedInvestigatorResearchAction(nextDiscovery.trajectoryRecords ?? []);
        if (selectedInvestigator !== tokenCapacityFailureInvestigator) {
          consecutiveInvestigatorTokenCapacityFailures = 0;
          tokenCapacityFailureInvestigator = selectedInvestigator;
        }
        consecutiveInvestigatorProviderUnavailable = advanceInvestigatorProviderUnavailableStreak(consecutiveInvestigatorProviderUnavailable, nextDiscovery);
        consecutiveInvestigatorTokenCapacityFailures = advanceInvestigatorTokenCapacityFailureStreak(consecutiveInvestigatorTokenCapacityFailures, nextDiscovery);
        const tokenCapacityFailureLimitReached = hasReachedInvestigatorTokenCapacityFailureLimit(
          consecutiveInvestigatorTokenCapacityFailures,
          nextDiscovery,
        );
        if (
          consecutiveInvestigatorProviderUnavailable >= maxConsecutiveInvestigatorProviderUnavailable
          || tokenCapacityFailureLimitReached
        ) {
          let capacityReassignmentSucceeded = false;
          let capacityReassignmentAttemptedThisEpisode = false;
          if (tokenCapacityFailureLimitReached && !tokenCapacityReassignmentUsed) {
            capacityReassignmentAttemptedThisEpisode = true;
            const failedCapability = selectedInvestigator;
            const replacement = await reassignInvestigatorAfterPersistentTokenCapacity(
              failedCapability,
              "upstream_token_window_wait_exceeded after bounded same-capability retries in consecutive discovery episodes",
            );
            if (replacement) {
              consecutiveInvestigatorProviderUnavailable = 0;
              consecutiveInvestigatorTokenCapacityFailures = 0;
              tokenCapacityFailureInvestigator = replacement;
              capacityReassignmentSucceeded = true;
            }
          }
          if (!capacityReassignmentSucceeded) {
            const lastProviderError = [...(nextDiscovery.trajectoryRecords ?? [])].reverse().find((record) => record.action === "investigator_provider_error")?.observation ?? nextDiscovery.error ?? "Investigator provider remained unavailable.";
            const recoveryReasons = [
              consecutiveInvestigatorProviderUnavailable >= maxConsecutiveInvestigatorProviderUnavailable
                ? `${consecutiveInvestigatorProviderUnavailable} consecutive provider-unavailable episode(s)`
                : null,
              tokenCapacityFailureLimitReached
                ? `${consecutiveInvestigatorTokenCapacityFailures}/${MAX_CONSECUTIVE_INVESTIGATOR_TOKEN_CAPACITY_FAILURES} consecutive token-window failures`
                : null,
            ].filter((reason): reason is string => Boolean(reason));
            const reassignmentDisposition = capacityReassignmentAttemptedThisEpisode
              ? "The Boss-directed token-capacity reassignment path was attempted but did not yield a viable replacement."
              : tokenCapacityReassignmentUsed
                ? "This job's single Boss-directed token-capacity reassignment was already used; no further reassignment is permitted."
                : `No capacity reassignment was attempted: only ${consecutiveInvestigatorTokenCapacityFailures}/${MAX_CONSECUTIVE_INVESTIGATOR_TOKEN_CAPACITY_FAILURES} consecutive token-window failures were recorded.`;
            const recoveryMessage = `Canonical Atlas Investigator recovery threshold reached (${recoveryReasons.join(" and ")}). ${reassignmentDisposition} The case is parked for review.`;
            phaseSummary.investigatorProviderRecovery = recoveryMessage;
            failureStage = "case_persistence";
            await db.update(researchCasesTable).set({
              status: "review",
              currentAction: "canonical-investigator-provider-unavailable",
              lastDecisionAt: new Date(),
              updatedAt: new Date(),
            }).where(and(
              eq(researchCasesTable.id, discoveryCaseId),
              eq(researchCasesTable.status, "active"),
              sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,
              sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`,
            ));
            failureStage = "job_state_or_lease";
            await updateJob(atlasJobId, {
              status: "failed",
              progress: 3,
              total: 4,
              atlasPhase: 3,
              atlasPhaseTotal: 4,
              outcome: "incomplete",
              message: recoveryMessage,
              result: JSON.stringify({
                rightHand,
                boss: { status: boss.status, model: boss.model, investigatorLlm: boss.investigatorLlm },
                discovery: { status: nextDiscovery.status, searches: nextDiscovery.searches, visits: nextDiscovery.visits, caseId: discoveryCaseId, runs: discoveryRuns + 1 },
                discoveryHealth: summarizeAtlasDiscoveryResearchHealth(discovery.trajectoryRecords ?? [], admitted.length),
                providerRecovery: {
                  consecutiveUnavailable: consecutiveInvestigatorProviderUnavailable,
                  consecutiveTokenCapacityFailures: consecutiveInvestigatorTokenCapacityFailures,
                  capacityReassignmentUsed: tokenCapacityReassignmentUsed,
                  unavailableInvestigators: allUnavailableInvestigatorCapabilities(),
                  limit: maxConsecutiveInvestigatorProviderUnavailable,
                  tokenCapacityLimit: MAX_CONSECUTIVE_INVESTIGATOR_TOKEN_CAPACITY_FAILURES,
                  lastProviderError,
                },
                control: { turns: controlTurns },
              }),
              finishedAt: new Date().toISOString(),
            });
            await clearActiveJobIfOwned(lockKey, atlasJobId);
            return { phase: 3, ingested: 0, enriched: materialized, contactsFound, hotLeads: admitted.length, durationMs: Date.now() - startedAt, phaseSummary };
          }
        }
        discoveryRuns += 1;
        const nextDiscoveryIterations = Math.max(0, nextDiscovery.iterations ?? 0);
        investigatorIterationsUsed += nextDiscoveryIterations;
        discoveryIterationsUsed += nextDiscoveryIterations;
        discoveryResourceLimited = nextDiscovery.stopReason !== "MODEL_DECIDED_DONE"
          && resolveRemainingDiscoveryIterations({ totalIterationCeiling: depth.agenticMaxIterations, discoveryIterationCeiling, discoveryIterationsUsed, investigatorIterationsUsed, targetResearchReserveIterations, hasAdmittedCandidates: admittedCandidateSources.length > 0 }) <= 0;
        investigatorResourceLimited = investigatorResourceLimited || investigatorIterationsUsed >= depth.agenticMaxIterations;
        // The cumulative result was already updated by mergeDiscoveryResults above.
        // Do not append this episode a second time: that doubles its metrics and
        // trajectory/finding records on every Boss-directed continuation.
        failureStage = "candidate_admission_persistence";
      admission = await materializeAtlasAdmissions({ discoveryRunId: nextDiscovery.runId ?? "", findings: [...(discovery.findings ?? []), ...(discovery.partialFindings ?? [])], atlasJobId, discoveryCaseId });
        admittedCandidateSources = mergeDurablyAdmittedAtlasTargetSources([admittedCandidateSources, admission.candidates]);
        admitted = admittedCandidateSources.map(({ name }) => name);
        materialized += admission.materialized;
        evidenceRows += admission.evidenceRows;
        discoveryResourceLimited = nextDiscovery.stopReason !== "MODEL_DECIDED_DONE"
          && resolveRemainingDiscoveryIterations({ totalIterationCeiling: depth.agenticMaxIterations, discoveryIterationCeiling, discoveryIterationsUsed, investigatorIterationsUsed, targetResearchReserveIterations, hasAdmittedCandidates: admittedCandidateSources.length > 0 }) <= 0;
        latestEvidenceBackedTerminal = deriveLatestEvidenceBackedTerminal("discovery", nextDiscovery.status, nextDiscovery.stopReason, investigatorResourceLimited) !== null && admitted.length > 0 ? "discovery" : null;
      }
    }
    await assertAtlasJobActive(atlasJobId);
    phaseSummary.discovery = `runs=${discoveryRuns}; admitted=${admitted.length}; materialized=${materialized}; evidenceRows=${evidenceRows}; searches=${discovery.searches}; visits=${discovery.visits}; trajectory=${discovery.trajectory.length}; structuredTurns=${discovery.trajectoryRecords?.length ?? 0}`;
    phaseSummary.discoveryHealth = JSON.stringify(summarizeAtlasDiscoveryResearchHealth(discovery.trajectoryRecords ?? [], admitted.length));
    phaseSummary.research = `researched=${researched}; explicitCardPromotions=${contactsFound}; controlTurns=${controlTurns}; finalAction=${finalControlAction ?? "none"}`;
    await assertAtlasJobActive(atlasJobId);
    const deadlineExceeded = Date.now() >= atlasDeadline;
    const evidenceBackedTerminal = isCanonicalAtlasRunEvidenceComplete(latestEvidenceBackedTerminal, researched);
    const finalIncomplete = investigatorResourceLimited || deadlineExceeded || finalControlAction !== "stop" || !evidenceBackedTerminal;
    const finalCaseStatus = finalIncomplete ? "review" : "complete";
    const finalCaseAction = finalIncomplete
      ? investigatorResourceLimited
        ? "canonical-investigator-resource-ceiling"
        : deadlineExceeded
          ? "canonical-atlas-deadline"
          : finalControlAction !== "stop"
            ? `canonical-control-${finalControlAction ?? "incomplete"}`
            : "canonical-evidence-terminal-incomplete"
      : "canonical-atlas-complete";
    failureStage = "terminal_persistence";
    await db.update(researchCasesTable).set({
      status: finalCaseStatus,
      currentAction: finalCaseAction,
      lastDecisionAt: new Date(),
      updatedAt: new Date(),
    }).where(and(
      eq(researchCasesTable.id, discoveryCaseId),
      inArray(researchCasesTable.status, ["active", "review"]),
      sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,
      sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`,
    ));
    failureStage = "job_state_or_lease";
    await updateJob(atlasJobId, { status: finalIncomplete ? "failed" : "done", progress: finalIncomplete ? 3 : 4, total: 4, atlasPhase: finalIncomplete ? 3 : 4, atlasPhaseTotal: 4, outcome: finalIncomplete ? "incomplete" : "complete", message: finalIncomplete ? (investigatorResourceLimited ? `Canonical Investigator iteration ceiling reached after ${investigatorIterationsUsed} Investigator iteration(s); case preserved for review.` : deadlineExceeded ? `Canonical Atlas deadline reached after ${investigatorIterationsUsed} Investigator iteration(s); case preserved for review.` : finalControlAction !== "stop" ? `Canonical Atlas control ended without a durable stop decision (${finalControlAction ?? "none"}); case preserved for review.` : "Canonical Atlas control stopped without an evidence-backed terminal state; case preserved for review.") : `Canonical Investigator control loop complete: ${researched} target investigation(s); AI chose the transition trajectory.`, result: JSON.stringify({ rightHand, boss: { status: boss.status, model: boss.model, investigatorLlm: boss.investigatorLlm }, discovery: { status: discovery.status, findings: discovery.findings.length, searches: discovery.searches, visits: discovery.visits, caseId: discoveryCaseId, trajectoryEntries: discovery.trajectory.length, trajectoryRecords: discovery.trajectoryRecords ?? [], runs: discoveryRuns }, control: { turns: controlTurns, finalAction: finalControlAction, finalCandidate: priorCandidate, investigatorIterationsUsed, investigatorIterationCeiling: depth.agenticMaxIterations, investigatorResourceLimited }, phaseSummary }), finishedAt: new Date().toISOString() });
    await clearActiveJobIfOwned(lockKey, atlasJobId); return { phase: 4, ingested: 0, enriched: materialized, contactsFound, hotLeads: admitted.length, durationMs: Date.now() - startedAt, phaseSummary };
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "";
    let durableJob: Awaited<ReturnType<typeof getJobStrict>> = null;
    let jobStateUnavailable = false;
    try {
      durableJob = await getJobStrict(atlasJobId);
    } catch {
      jobStateUnavailable = true;
    }
    // Error text is not proof of an operator stop. Only durable state may
    // classify a cancellation; an unknown Redis state remains unknown.
    const cancelled = !jobStateUnavailable && durableJob?.status === "cancelled";
    const jobMissing = !jobStateUnavailable && !durableJob;
    const jobStateMismatch = !jobStateUnavailable && Boolean(durableJob) && durableJob?.status !== "running" && !cancelled;
    const leaseLost = !jobStateUnavailable && durableJob?.status === "running" && /Canonical Atlas lease was lost/i.test(rawMessage);
    const recoverableRightHandOpeningFailure = isRecoverableRightHandOpeningFailure(failureStage, error);
    const currentAction = cancelled
      ? "canonical-atlas-cancelled"
      : jobStateUnavailable
        ? "canonical-job-state-unavailable"
        : jobMissing
          ? "canonical-atlas-job-missing"
          : leaseLost
            ? "canonical-lease-lost"
            : recoverableRightHandOpeningFailure
              ? "groq-right-hand-unavailable"
              : "canonical-atlas-failed";
    const failureDiagnostic = classifyCanonicalAtlasFailure({ stage: failureStage, error, cancelled, jobStateUnavailable, jobMissing, jobStateMismatch, leaseLost });
    const diagnosticSuffix = `stage=${failureStage}; failureDomain=${failureDiagnostic.domain}; failureKind=${failureDiagnostic.kind}`;
    const message = cancelled
      ? `Canonical Atlas discovery cancelled; outcome incomplete. (${diagnosticSuffix})`
      : jobStateUnavailable
        ? `Canonical Atlas job state unavailable; discovery stopped without claiming cancellation. (${diagnosticSuffix})`
        : `${safeThrownErrorSummary("Canonical Atlas discovery failed", error)} (${diagnosticSuffix})`;
    let failureStatePersistenceFailed = false;
    try {
      await db.update(researchCasesTable).set({
        status: "review",
        currentAction,
        updatedAt: new Date(),
      }).where(and(
        sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,
        inArray(researchCasesTable.status, ["active", "review"]),
        sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-complete','canonical-atlas-cancelled','canonical-lease-lost')`,
      ));
    } catch {
      // A failed diagnostic write must not replace the exception that caused
      // this catch. The job message below records this secondary persistence
      // failure if the job-state store remains available.
      failureStatePersistenceFailed = true;
    }
    // Let the outer launch boundary reconcile job status if Redis reads are
    // unavailable; do not persist a guessed cancellation. Preserve the original
    // thrown exception if this best-effort terminal write also fails.
    if (!jobStateUnavailable) {
      const terminalMessage = failureStatePersistenceFailed ? `${message} (failureStatePersistence=case_update_failed)` : message;
      try {
        await updateJob(atlasJobId, { status: cancelled ? "cancelled" : "failed", outcome: "incomplete", errors: cancelled ? Number(durableJob?.errors ?? 0) : Math.max(1, Number(durableJob?.errors ?? 0)), message: terminalMessage, finishedAt: new Date().toISOString() });
      } catch {
        // There is no safe durable sink left at this boundary. Preserve the
        // original error so the outer launch boundary can reconcile it.
      }
    }
    try { await clearActiveJobIfOwned(lockKey, atlasJobId); } catch {
      // Outer launch boundary owns the final cleanup attempt.
    }
    throw error;
  }}
