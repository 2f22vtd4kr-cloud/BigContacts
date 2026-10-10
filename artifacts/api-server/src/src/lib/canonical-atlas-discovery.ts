import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, entitiesTable, researchCasesTable, researchCaseEventsTable, researchSessionsTable, researchEvidenceTable } from "@workspace/db";
import { updateJob, clearActiveJobIfOwned, getJobStrict } from "./job-queue";
import { isCanonicalJobOwner } from "./canonical-job-lock";
import { runGroqBossDiscovery } from "./case-bureau";
import { runBureauAgenticWebPass } from "./bureau-agentic-pass";
import { runCanonicalSingleTargetInvestigation } from "./canonical-single-target-runner";
import { ATLAS_OPENING_RIGHT_HAND_REVIEW_RESPONSE_FORMAT, decideAtlasNextAction, validateAtlasOpeningRightHandReview, type AtlasControlAction } from "./atlas-control-decision";
import { resolveResearchDepth } from "./research-depth";
import { getAvailableDistinctInvestigatorCapabilities, getAvailableInvestigatorCapabilities, getInvestigatorCredentialAliases, type InvestigatorCapability } from "./investigator-capability-registry";
import { deriveCanonicalTerminalDecision } from "./canonical-terminal-state";
import { deriveLatestEvidenceBackedTerminal, isCanonicalAtlasRunEvidenceComplete, type LatestEvidenceBackedTerminal } from "./canonical-terminal-authority";
import { isTransientInvestigatorCapacityError } from "./agentic-web-research-core";
import { safeThrownErrorSummary } from "./provider-error-diagnostics";
import { formatBossDirectedObjective, validateResearchObjective } from "./research-objective";
import { candidateIdentityObserved, normalizeCandidateIdentityName } from "./identity-text-match";
import { candidateSourceUrlsForIdentity, isClaimGradeDiscoverySourceUrl, mergeDurablyAdmittedCandidateSources } from "./candidate-source-url-union";
import { sanitizeUrlForEvidence } from "./url-privacy";

export type CanonicalAtlasOptions = {
  targetCount?: number;
  researchDepth?: "fast" | "standard" | "deep";
  targetTimeoutMs?: number;
  discoveryCaseId?: number;
  discoveryOnly?: boolean;
  discoveryObjective?: string;
  discoveryMotivation?: string;
  discoveryGeography?: string;
  discoveryExclusions?: string[];
  lockKey?: "atlas-run" | "case-bureau-discovery";
};
export type CanonicalAtlasResult = { phase: number; ingested: number; enriched: number; contactsFound: number; hotLeads: number; durationMs: number; phaseSummary: Record<string, string> };
function uniqueNames(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const name = value.trim().replace(/\s+/g, " ");
    const identity = normalizeCandidateIdentityName(name);
    if (name.length < 3 || identity.length < 3 || seen.has(identity)) continue;
    seen.add(identity);
    result.push(name);
  }
  return result;
}
function isObservedHttpsSource(value: unknown): value is string { return typeof value === "string" && /^https:\/\/\S+$/i.test(value); }
function normalizeSourceUrl(raw: string): string | null { try { const safe = sanitizeUrlForEvidence(raw); if (safe.startsWith("[")) return null; const url = new URL(safe); if (url.protocol !== "https:") return null; url.hash = ""; url.hostname = url.hostname.toLowerCase(); return url.href.endsWith("/") ? url.href.slice(0, -1) : url.href; } catch { return null; } }

async function createAtlasDiscoveryCase(input: { atlasJobId: string; objective: string; investigatorLlm: InvestigatorCapability; directorModel: string }): Promise<number> {
  const [created] = await db.insert(researchCasesTable).values({ caseType: "discovery", status: "active", directorMode: "groq_boss", directorProvider: "groq", directorModel: input.directorModel || "unknown", objective: input.objective, motivation: "Durable memory for canonical Atlas Investigator discovery.", openingPrompt: "Investigator chooses every research action; this case is memory/state, not a deterministic research plan.", caseFile: JSON.stringify({ caseType: "discovery", contextDocument: ["CANONICAL ATLAS DISCOVERY CASE", `JOB: ${input.atlasJobId}`, `INVESTIGATOR: ${input.investigatorLlm}`, `OBJECTIVE: ${input.objective}`, "STATE: Initial discovery; Investigator owns the next action.", "TRAJECTORY: []"].join("\n"), investigatorLlm: input.investigatorLlm, investigatorTrajectory: [], investigatorTrajectoryRecords: [], investigationTimeline: [], jobId: input.atlasJobId }), currentAction: "canonical-investigator-discovery", iteration: 0 }).returning({ id: researchCasesTable.id });
  const caseId = created?.id; if (!caseId) throw new Error("Failed to create durable Atlas discovery case.");
  return caseId;
}

async function materializeAtlasAdmissions(input: { discoveryRunId: string; findings: Array<{ promotionDecision?: "promote" | "reject"; scope: "organization" | "candidate" | "unknown"; personName: string | null; role: string | null; sourceUrls: string[] }>; atlasJobId: string; discoveryCaseId: number }): Promise<{ names: string[]; candidates: Array<{ name: string; sourceUrls: string[] }>; materialized: number; evidenceRows: number }> {
  const candidates = uniqueNames(input.findings
    .filter((finding) => finding.promotionDecision === "promote" && finding.scope === "candidate")
    .filter((finding) => typeof finding.personName === "string" && finding.personName.trim().length >= 3)
    .filter((finding) => Array.isArray(finding.sourceUrls) && finding.sourceUrls.some(isObservedHttpsSource))
    .map((finding) => finding.personName as string));
  const durableCandidateSources: Array<{ name: string; sourceUrl: string }> = [];
  let materialized = 0;
  let evidenceRows = 0;

  for (const name of candidates) {
    const identity = normalizeCandidateIdentityName(name);
    const candidateSourceUrls = candidateSourceUrlsForIdentity({
      findings: input.findings,
      personName: name,
      isClaimGradeSourceUrl: isClaimGradeDiscoverySourceUrl,
      normalizeSourceUrl,
    });
    if (!candidateSourceUrls.length) continue;

    const caseEvents = await db.select({ id: researchCaseEventsTable.id, eventType: researchCaseEventsTable.eventType, payload: researchCaseEventsTable.payload, createdAt: researchCaseEventsTable.createdAt })
      .from(researchCaseEventsTable)
      .where(eq(researchCaseEventsTable.caseId, input.discoveryCaseId));
    // A model-emitted finding is only a candidate for admission. It becomes a
    // durable admission after the same Investigator run observed that full name
    // in a successful retrieved page at one of the candidate's claimed URLs.
    const supportingEvent = caseEvents.find((event) => {
      if (event.eventType !== "tool_observation" || typeof event.payload !== "string") return false;
      try {
        const payload = JSON.parse(event.payload) as { action?: string; execution?: string; observedUrls?: unknown[]; runId?: string; observation?: string };
        const directSourceAction = payload.action === "visit" || payload.action === "browser_fetch";
        return payload.runId === input.discoveryRunId &&
          candidateIdentityObserved(name, payload.observation) &&
          directSourceAction &&
          payload.execution === "success" &&
          Array.isArray(payload.observedUrls) &&
          payload.observedUrls.some((url) => {
            const normalized = normalizeSourceUrl(String(url));
            return normalized !== null && candidateSourceUrls.includes(normalized);
          });
      } catch { return false; }
    });
    if (!supportingEvent || typeof supportingEvent.payload !== "string") continue;

    let sourceUrl: string | null = null;
    try {
      const payload = JSON.parse(supportingEvent.payload) as { observedUrls?: unknown[] };
      sourceUrl = (payload.observedUrls ?? [])
        .map((url) => normalizeSourceUrl(String(url)))
        .find((url): url is string => Boolean(url && candidateSourceUrls.includes(url))) ?? null;
    } catch { sourceUrl = null; }
    if (!sourceUrl) continue;
    const normalizedSource = sourceUrl;

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
        const [created] = await tx.insert(entitiesTable).values({ name, type: "PersonCandidate", bayesianScore: 0.05, contactConfidence: 0, contactOutcome: "evidence_only", isHot: false, isStarred: false, isHidden: false, sourceRegistries: JSON.stringify(["canonical-agentic-discovery"]), notes: "Model-selected discovery candidate; target-scoped Investigator research required before contact promotion.", metadata: JSON.stringify({ reviewOnly: true, admission: "investigator-explicit-promotion", sourceUrl, discoveryCaseId: input.discoveryCaseId }) }).returning({ id: entitiesTable.id });
        entityId = created?.id ?? null;
        createdEntity = Boolean(entityId);
      }
      if (!entityId) return { materialized: 0, evidenceRows: 0, durableEvidence: false };
      const [existingEvidence] = await tx.select({ id: researchEvidenceTable.id }).from(researchEvidenceTable)
        .where(and(eq(researchEvidenceTable.entityId, entityId), eq(researchEvidenceTable.sourceUrl, normalizedSource)))
        .limit(1);
      let addedEvidence = 0;
      if (!existingEvidence) {
        const [session] = await tx.insert(researchSessionsTable).values({ targetEntityId: entityId, winningPath: JSON.stringify([{ sourceUrl: normalizedSource, caseId: input.discoveryCaseId, admission: "investigator-explicit-promotion" }]), notes: "Canonical discovery admission evidence; target-scoped investigation required before contact promotion.", safeUseStatus: "manual_review", crmStatus: "Lead Gen" }).returning({ id: researchSessionsTable.id });
        if (!session?.id) throw new Error("Canonical discovery evidence session insert returned no durable session ID.");
        await tx.insert(researchEvidenceTable).values({ sessionId: session.id, entityId, claimType: "identity_candidate", claim: `Investigator-discovered candidate: ${name}`, value: name, sourceName: "canonical-agentic-discovery", sourceUrl: normalizedSource, sourceDomain: new URL(normalizedSource).hostname, status: "review", confidence: 0.5, observedAt: supportingEvent.createdAt ?? new Date(), freshnessScore: 1, metadata: JSON.stringify({ discoveryCaseId: input.discoveryCaseId, atlasJobId: input.atlasJobId, supportingEventId: supportingEvent.id, promotionDecision: "promote", reviewOnly: true }) });
        addedEvidence = 1;
      }
      return { materialized: createdEntity ? 1 : 0, evidenceRows: addedEvidence, durableEvidence: Boolean(existingEvidence) || addedEvidence > 0 };
    }, { isolationLevel: "serializable" });

    // Never expose an unsupported model finding to Boss control, case projections,
    // or candidate counters. Names returned from this boundary have a durable
    // entity plus source evidence, whether newly inserted or already present.
    if (materializedAdmission.durableEvidence) durableCandidateSources.push({ name, sourceUrl: normalizedSource });
    materialized += materializedAdmission.materialized;
    evidenceRows += materializedAdmission.evidenceRows;
  }

  const durableCandidates = mergeDurablyAdmittedCandidateSources([durableCandidateSources.map(({ name, sourceUrl }) => ({ name, sourceUrls: [sourceUrl] }))]);
  return { names: durableCandidates.map(({ name }) => name), candidates: durableCandidates, materialized, evidenceRows };
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

export async function runCanonicalAtlasPipeline(atlasJobId: string, opts: CanonicalAtlasOptions = {}): Promise<CanonicalAtlasResult> {
  const startedAt = Date.now(); const depth = resolveResearchDepth({ explicit: opts.researchDepth }); const configuredControlTurnCeiling = Number(process.env.APEX_ATLAS_MAX_CONTROL_TURNS ?? 16); const maxControlTurns = Math.min(64, Math.max(1, Number.isFinite(configuredControlTurnCeiling) ? Math.floor(configuredControlTurnCeiling) : 16)); const maxConsecutiveInvestigatorProviderUnavailable = 2; const isInvestigatorProviderUnavailable = (result: { status?: string; stopReason?: string; error?: string; trajectoryRecords?: Array<{ action?: string; observation?: string }> }) => result.status === "unavailable" && result.stopReason === "LLM_UNAVAILABLE" && !isTransientInvestigatorCapacityError(result) && (result.trajectoryRecords ?? []).some((record) => record.action === "investigator_provider_error"); const isInvestigatorHardQuotaExhausted = (result: { status?: string; stopReason?: string; error?: string; trajectoryRecords?: Array<{ action?: string; observation?: string }> }) => result.status === "unavailable" && result.stopReason === "LLM_UNAVAILABLE" && (result.error === "upstream_quota_exhausted" || (result.trajectoryRecords ?? []).some((record) => record.action === "investigator_provider_error" && /upstream_quota_exhausted/i.test(record.observation ?? ""))); const discoveryOnly = opts.discoveryOnly === true; const lockKey = opts.lockKey ?? "atlas-run"; const phaseSummary: Record<string, string> = {}; const targetLimit = Math.max(1, Math.min(25, Number(opts.targetCount ?? 3) || 3)); const configuredAtlasTimeout = Number(process.env.APEX_ATLAS_RUN_TIMEOUT_MS ?? 15 * 60 * 1000); const atlasTimeoutMs = Math.min(30 * 60 * 1000, Math.max(2 * 60 * 1000, Number.isFinite(configuredAtlasTimeout) ? configuredAtlasTimeout : 15 * 60 * 1000)); const atlasDeadline = startedAt + atlasTimeoutMs; const remainingBudget = () => atlasDeadline - Date.now(); const assertAtlasDeadline = () => { const remaining = remainingBudget(); if (remaining <= 30_000) throw new Error("Canonical Atlas global deadline reached; refusing another research/control turn."); return remaining; };
  const discoveryObjective = opts.discoveryObjective?.trim() || "Discover real named people for subsequent target-scoped public-contact research. Start from a concrete business or operating context and a plausible geography, sector, company ecosystem, transaction, registry, filing, trade publication, official company surface, or other evidence-bearing anchor selected from the live case objective. Avoid defaulting to celebrities, billionaire/richest-person lists, generic wealth searches, or context-free famous names. Write each search from the current hypothesis and observed evidence, pivot when results are generic or repetitive, and choose every search, page visit, registry/domain/OSINT action and stopping point yourself. Emit a person only when you can attribute the observed source to that person; use promotionDecision=promote only for an exact named-person admission candidate. Never invent a person, contact, or URL.";
  await assertAtlasJobActive(atlasJobId);
  await updateJob(atlasJobId, { status: "running", progress: 0, total: discoveryOnly ? 1 : 4, atlasPhase: 0, atlasPhaseTotal: discoveryOnly ? 1 : 4, message: "Groq Boss opening → Groq Right-hand review → model-owned Investigator discovery…" });
  try {
    await assertAtlasJobActive(atlasJobId);
    // Canonical opening order is intentional: Groq Boss establishes the case direction
    // and selects the Investigator first. The independent Right-hand reviews that Boss
    // decision second. It must never become a prerequisite that can silently steer the
    // Boss's opening assignment.
    const boss = await runGroqBossDiscovery({
      objective: discoveryObjective,
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
    const discoveryCaseId = opts.discoveryCaseId ?? await createAtlasDiscoveryCase({
      atlasJobId,
      objective: discoveryObjective,
      investigatorLlm: boss.investigatorLlm,
      directorModel: boss.model,
    });
    let selectedInvestigator = boss.investigatorLlm;
    const quotaExhaustedInvestigators = new Set<InvestigatorCapability>();
    const reassignInvestigatorAfterHardQuota = async (failedCapability: InvestigatorCapability, failure: string): Promise<InvestigatorCapability> => {
      quotaExhaustedInvestigators.add(failedCapability);
      const excludedCapabilityAliases = getInvestigatorCredentialAliases(process.env, [...quotaExhaustedInvestigators]);
      const bossExcludedCapabilities = [...new Set([...quotaExhaustedInvestigators, ...excludedCapabilityAliases])];
      const availableAlternates = getAvailableDistinctInvestigatorCapabilities(process.env, bossExcludedCapabilities);
      if (!availableAlternates.length) throw new Error(`Groq Investigator capability ${failedCapability} exhausted its hard request quota and no alternate configured Investigator capability remains.`);
      await assertAtlasJobActive(atlasJobId);
      const reassignment = await runGroqBossDiscovery({
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
      if (reassignment.status !== "completed" || !replacement || replacement === failedCapability || quotaExhaustedInvestigators.has(replacement) || !availableAlternates.includes(replacement)) {
        throw new Error(reassignment.error ?? "Groq Boss did not select a valid alternate Investigator capability after hard quota exhaustion.");
      }
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
      phaseSummary.investigatorReassignment = `${failedCapability} → ${replacement} after explicit upstream_quota_exhausted; remaining alternates=${getAvailableDistinctInvestigatorCapabilities(process.env, bossExcludedCapabilities).join(",") || "none"}`;
      return replacement;
    };
    const mergeDiscoveryResults = (failed: Awaited<ReturnType<typeof runBureauAgenticWebPass>>, recovered: Awaited<ReturnType<typeof runBureauAgenticWebPass>>): Awaited<ReturnType<typeof runBureauAgenticWebPass>> => ({ ...recovered, searches: failed.searches + recovered.searches, visits: failed.visits + recovered.visits, iterations: failed.iterations + recovered.iterations, findings: [...(failed.findings ?? []), ...(recovered.findings ?? [])], modelFindings: [...(failed.modelFindings ?? []), ...(recovered.modelFindings ?? [])], trajectory: [...(failed.trajectory ?? []), ...(recovered.trajectory ?? [])], trajectoryRecords: [...(failed.trajectoryRecords ?? []), ...(recovered.trajectoryRecords ?? [])] });
    const runDiscoveryWithQuotaRecovery = async (initial: Awaited<ReturnType<typeof runBureauAgenticWebPass>>, objective: string, budgetMs: number, maxIterations: number, priorTrajectoryRecords: NonNullable<Awaited<ReturnType<typeof runBureauAgenticWebPass>>["trajectoryRecords"]> = []): Promise<Awaited<ReturnType<typeof runBureauAgenticWebPass>>> => {
      let result = initial;
      let iterationsConsumed = Math.max(0, result.iterations ?? result.trajectoryRecords?.length ?? 0);
      while (isInvestigatorHardQuotaExhausted(result)) {
        const remainingIterations = Math.max(0, maxIterations - iterationsConsumed);
        if (remainingIterations <= 0) break;
        const failedCapability = selectedInvestigator;
        const replacement = await reassignInvestigatorAfterHardQuota(failedCapability, result.error ?? "upstream_quota_exhausted");
        const recovered = await runBureauAgenticWebPass({ mode: "discovery", targetName: "", objective, investigatorLlm: replacement, caseId: discoveryCaseId, jobId: atlasJobId, maxIterations: remainingIterations, hardTimeoutMs: budgetMs, priorTrajectoryRecords: [...priorTrajectoryRecords, ...(result.trajectoryRecords ?? [])] });
        iterationsConsumed += Math.max(0, recovered.iterations ?? recovered.trajectoryRecords?.length ?? 0);
        result = mergeDiscoveryResults(result, recovered);
        if (!isInvestigatorHardQuotaExhausted(recovered)) break;
      }
      return result;
    };
    // Case creation is separate from the Redis job state. Reconcile immediately
    // after creation so a stop that won the check-before-create race cannot leave
    // an active orphan discovery case.
    await reconcileDiscoveryCaseCancellation(atlasJobId, discoveryCaseId);
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

    // Boss first, independent Right-hand second. The Right-hand reviews the
    // actual Boss decision; it does not pre-steer the Boss or choose the tools.
    const rightHandRaw = await import("./groq-right-hand-reasoning").then(({ runGroqRightHandFreeJson }) =>
      runGroqRightHandFreeJson(
        `Review Groq Boss's opening Atlas decision against the exact research objective before the Investigator starts. Objective: ${discoveryObjective}. Boss selected Investigator: ${boss.investigatorLlm}. Boss report (unverified control hypothesis, not source evidence): ${boss.report ?? ""}. Next directions (unverified control hypotheses, not evidence): ${JSON.stringify(boss.nextDirections)}. Uncertainties: ${JSON.stringify(boss.uncertainties)}. Flag unsupported sectors, geographies, company premises, or targets rather than repeating them as facts. Internal memory, storage, and workflow terminology is not a research lead. Return concise oversight/advisory observations only. Do not browse, choose tools, replace the Investigator, or invent people or evidence. Return JSON with decision, reason, focusLanes, confidence.`,
        "You are the Groq Right-hand. Independently check the Boss opening claims against the human mission; treat Boss-generated reports and directions as unverified hypotheses, not evidence. Explicitly flag unsupported scope and never treat internal memory/storage/workflow terminology as a sector or lead. Advise the Boss only; do not act as Investigator, browse, choose tools, or replace the selected Investigator. Reply with ONE JSON object.",
        ATLAS_OPENING_RIGHT_HAND_REVIEW_RESPONSE_FORMAT,
      ),
    ).catch((error) => ({
      status: "unavailable" as const,
      model: "none",
      raw: null,
      error: safeThrownErrorSummary("Groq Right-hand opening review unavailable", error),
    }));
    await assertAtlasJobActive(atlasJobId);
    let rightHand: { status: "completed" | "unavailable"; model: string; decision: string | null; reason: string | null; focusLanes: string[]; confidence: number | null; error: string | null } = {
      status: rightHandRaw.status === "completed" ? "completed" : "unavailable",
      model: rightHandRaw.model,
      decision: null,
      reason: null,
      focusLanes: [],
      confidence: null,
      error: rightHandRaw.error ?? null,
    };
    if (rightHandRaw.status === "completed") {
      if (!rightHandRaw.raw?.trim()) {
        rightHand.status = "unavailable";
        rightHand.error = "Right-hand returned an empty opening review response.";
      } else {
        try {
          const value: unknown = JSON.parse(rightHandRaw.raw);
          const parsed = value && typeof value === "object" && !Array.isArray(value)
            ? value as Record<string, unknown>
            : null;
          if (!validateAtlasOpeningRightHandReview(parsed) || !parsed) {
            rightHand.status = "unavailable";
            rightHand.error = "Right-hand returned an invalid opening review contract.";
          } else {
            rightHand = {
              status: "completed",
              model: rightHandRaw.model,
              decision: (parsed.decision as string).trim(),
              reason: (parsed.reason as string).trim(),
              focusLanes: (parsed.focusLanes as string[]).map((lane) => lane.trim()),
              confidence: parsed.confidence as number,
              error: null,
            };
          }
        } catch {
          rightHand.status = "unavailable";
          rightHand.error = "Right-hand returned invalid JSON.";
        }
      }
    }
    await assertAtlasJobActive(atlasJobId);
    if (rightHandRaw.status !== "completed") {
      await db.update(researchCasesTable)
        .set({ status: "review", currentAction: "groq-right-hand-unavailable", updatedAt: new Date() })
        .where(and(eq(researchCasesTable.id, discoveryCaseId), eq(researchCasesTable.status, "active"), sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`));
      throw new Error(`Groq Right-hand unavailable; failing closed: ${rightHandRaw.error ?? "unknown oversight failure"}`);
    }
    if (rightHand.error || rightHand.status !== "completed") {
      await db.update(researchCasesTable)
        .set({ status: "review", currentAction: "groq-right-hand-invalid", updatedAt: new Date() })
        .where(and(eq(researchCasesTable.id, discoveryCaseId), eq(researchCasesTable.status, "active"), sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`));
      throw new Error(`Groq Right-hand returned invalid oversight: ${rightHand.error}`);
    }

    await db.transaction(async (tx) => {
      const [lockedCase] = await tx.select({ status: researchCasesTable.status, currentAction: researchCasesTable.currentAction })
        .from(researchCasesTable)
        .where(and(eq(researchCasesTable.id, discoveryCaseId), sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`))
        .for("update")
        .limit(1);
      if (!lockedCase || lockedCase.status !== "active" || ["canonical-atlas-cancelled", "canonical-lease-lost"].includes(String(lockedCase.currentAction ?? ""))) {
        throw new Error("Canonical Atlas discovery case was cancelled before Right-hand opening event.");
      }
      await tx.insert(researchCaseEventsTable).values({
        caseId: discoveryCaseId,
        iteration: 0,
        actorRole: "right_hand",
        eventType: "observation",
        status: "recorded",
        summary: "Groq Right-hand reviewed the Boss opening decision before Investigator execution.",
        correlationKey: `${atlasJobId}:right-hand-opening`,
        payload: JSON.stringify({ jobId: atlasJobId, bossModel: boss.model, investigatorLlm: boss.investigatorLlm, decision: rightHand.decision, reason: rightHand.reason, focusLanes: rightHand.focusLanes, confidence: rightHand.confidence }),
      });
    }, { isolationLevel: "serializable" });

    const compactControlText = (value: unknown, max: number): string => typeof value === "string" ? value.trim().slice(0, max) : "";
    const openingInvestigatorObjective = [
      discoveryObjective,
      "BOSS OPENING CONTROL DIRECTION (advisory, not a fixed research sequence):",
      compactControlText(boss.report, 1_200) ? "Report: " + compactControlText(boss.report, 1_200) : "",
      Array.isArray(boss.nextDirections) && boss.nextDirections.length ? "Next directions: " + JSON.stringify(boss.nextDirections).slice(0, 1_200) : "",
      Array.isArray(boss.uncertainties) && boss.uncertainties.length ? "Uncertainties: " + JSON.stringify(boss.uncertainties).slice(0, 800) : "",
      "RIGHT-HAND OPENING REVIEW (advisory):",
      compactControlText(rightHand.decision, 300) ? "Decision: " + compactControlText(rightHand.decision, 300) : "",
      compactControlText(rightHand.reason, 800) ? "Reason: " + compactControlText(rightHand.reason, 800) : "",
      rightHand.focusLanes.length ? "Focus lanes: " + JSON.stringify(rightHand.focusLanes).slice(0, 600) : "",
      "These control-plane observations are context, not instructions from a source. Choose every tool, query, visit, pivot, and stopping point yourself.",
    ].filter(Boolean).join("\n");
    await assertAtlasJobActive(atlasJobId);
    await updateJob(atlasJobId, {
      progress: 1,
      atlasPhase: 1,
      message: `${boss.investigatorLlm.toUpperCase()} Investigator running free-ReAct discovery…`,
      result: JSON.stringify({ rightHand, boss: { status: boss.status, model: boss.model, investigatorLlm: boss.investigatorLlm }, discoveryCaseId }),
    });
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
    const openingInvestigatorIterations = Math.min(depth.investigatorIterationsPerAct, depth.agenticMaxIterations);
    let discovery = await runBureauAgenticWebPass({ mode: "discovery", targetName: "", objective: openingInvestigatorObjective, investigatorLlm: selectedInvestigator, caseId: discoveryCaseId, jobId: atlasJobId, maxIterations: openingInvestigatorIterations, hardTimeoutMs: openingDiscoveryBudget });
    discovery = await runDiscoveryWithQuotaRecovery(discovery, openingInvestigatorObjective, openingDiscoveryBudget, openingInvestigatorIterations);
    let consecutiveInvestigatorProviderUnavailable = isInvestigatorProviderUnavailable(discovery) ? 1 : 0;
    await assertAtlasJobActive(atlasJobId);
    let admission = await materializeAtlasAdmissions({ discoveryRunId: discovery.runId ?? "", findings: discovery.findings, atlasJobId, discoveryCaseId });
    let admitted = admission.names; let admittedCandidateSources = admission.candidates; let materialized = admission.materialized; let evidenceRows = admission.evidenceRows; let researched = 0; let contactsFound = 0; const [latestControlEvent] = await db.select({ iteration: researchCaseEventsTable.iteration, payload: researchCaseEventsTable.payload }).from(researchCaseEventsTable).where(and(eq(researchCaseEventsTable.caseId, discoveryCaseId), eq(researchCaseEventsTable.eventType, "control_decision"))).orderBy(desc(researchCaseEventsTable.id)).limit(1); let controlTurns = 0; if (typeof latestControlEvent?.payload === "string") { try { const priorControl = JSON.parse(latestControlEvent.payload) as Record<string, unknown>; controlTurns = Number(priorControl.controlTurn ?? 0); } catch {} } let priorAction: AtlasControlAction | null = null; let priorCandidate: string | null = null; if (typeof latestControlEvent?.payload === "string") { try { const prior = JSON.parse(latestControlEvent.payload) as Record<string, unknown>; const action = typeof prior.action === "string" ? prior.action as AtlasControlAction : null; priorAction = action && ["continue_discovery", "research_candidate", "revisit_candidate", "pivot_discovery", "stop"].includes(action) ? action : null; priorCandidate = typeof prior.candidateName === "string" ? prior.candidateName : null; } catch {} } let discoveryRuns = quotaExhaustedInvestigators.size > 0 ? 1 + quotaExhaustedInvestigators.size : 1; let latestTargetInvestigation: Record<string, unknown> | null = null; let latestEvidenceBackedTerminal: "discovery" | "target" | null = discovery.status === "completed" && discovery.stopReason === "MODEL_DECIDED_DONE" && admitted.length > 0 ? "discovery" : null; let investigatorIterationsUsed = discovery.iterations; let investigatorResourceLimited = investigatorIterationsUsed >= depth.agenticMaxIterations; let finalControlAction: AtlasControlAction | null = null; let rejectedControlDirection: { controlTurn: number; reason: string } | null = null;
    const researchedNames = new Set<string>();
    phaseSummary.assignment = `${selectedInvestigator} currently selected by Groq; opening capability=${boss.investigatorLlm}; discovery completed=${discovery.status}; durableCase=${discoveryCaseId}.`; phaseSummary.discovery = `admitted=${admitted.length}; materialized=${materialized}; evidenceRows=${evidenceRows}; searches=${discovery.searches}; visits=${discovery.visits}; trajectory=${discovery.trajectory.length}; structuredTurns=${discovery.trajectoryRecords?.length ?? 0}`;
    if (discoveryOnly) {
      await assertAtlasJobActive(atlasJobId);
      const [current] = await db.select({ caseFile: researchCasesTable.caseFile, iteration: researchCasesTable.iteration }).from(researchCasesTable).where(and(eq(researchCasesTable.id, discoveryCaseId),eq(researchCasesTable.status,"active"),sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`)).limit(1);
      let caseFile: Record<string, any> = {}; try { const parsed = current?.caseFile ? JSON.parse(current.caseFile) : {}; if (parsed && typeof parsed === "object") caseFile = parsed; } catch { caseFile = {}; }
      const candidates = admittedCandidateSources.map(({ name, sourceUrls }) => ({ name, type: "review_candidate", relevance: "Explicit Investigator discovery admission candidate", reachability: "Requires target-scoped Investigator research", sourceUrls, contactEvidence: [], state: "review_only", admittedEntityId: null }));
      await assertAtlasJobActive(atlasJobId);
      await db.transaction(async (tx) => {
        const [locked] = await tx.select({ caseFile: researchCasesTable.caseFile, iteration: researchCasesTable.iteration }).from(researchCasesTable).where(and(eq(researchCasesTable.id, discoveryCaseId), eq(researchCasesTable.status, "active"), sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`, sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`)).for("update").limit(1);
        if (!locked) throw new Error("Canonical discovery admission projection lost its active case fence.");
        let lockedCaseFile: Record<string, any> = {};
        try { const parsed = locked.caseFile ? JSON.parse(locked.caseFile) : {}; if (parsed && typeof parsed === "object") lockedCaseFile = parsed; } catch { throw new Error("Canonical discovery admission caseFile became unreadable."); }
        const nextIteration = Number(locked.iteration ?? 0) + 1;
        await tx.update(researchCasesTable).set({ caseFile: JSON.stringify({ ...lockedCaseFile, discoveredCandidates: [...(Array.isArray(lockedCaseFile.discoveredCandidates) ? lockedCaseFile.discoveredCandidates : []), ...candidates], currentProgress: { ...(lockedCaseFile.currentProgress ?? {}), lastDiscoveryAt: new Date().toISOString(), lastReviewedBy: "groq-boss" } }), currentAction: admitted.length ? "target-scoped-investigator-research" : "review", iteration: nextIteration, updatedAt: new Date() }).where(and(eq(researchCasesTable.id, discoveryCaseId), eq(researchCasesTable.status, "active"), sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`, sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`));
        await tx.insert(researchCaseEventsTable).values({ caseId: discoveryCaseId, iteration: nextIteration, actorRole: "specialist", eventType: "observation", status: "recorded", summary: `Canonical discovery admission: ${admitted.length} review candidate(s).`, correlationKey: `${atlasJobId}:discovery-admission:${nextIteration}`, payload: JSON.stringify({ jobId: atlasJobId, investigatorLlm: boss.investigatorLlm, admitted, admittedCandidates: admittedCandidateSources, proposedSourceUrls: (discovery.findings ?? []).flatMap((finding) => finding.sourceUrls) }) });
      }, { isolationLevel: "serializable" });
      const durableStatus = discovery.status === "completed" && discovery.stopReason === "MODEL_DECIDED_DONE" && !investigatorResourceLimited && admitted.length > 0 ? "complete" : "review";
      const terminal = deriveCanonicalTerminalDecision({ durableCaseStatus: durableStatus, locallyCancelled: discovery.status === "cancelled" });
      await db.update(researchCasesTable).set({
        status: terminal.caseStatus,
        currentAction: durableStatus === "complete" ? "review" : "canonical-discovery-incomplete",
        updatedAt: new Date(),
      }).where(and(eq(researchCasesTable.id, discoveryCaseId),eq(researchCasesTable.status,"active"),sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`));
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
        result: JSON.stringify({ rightHand, boss, discovery: { status: discovery.status, findings: discovery.findings.length, searches: discovery.searches, visits: discovery.visits, caseId: discoveryCaseId, trajectoryEntries: discovery.trajectory.length, trajectoryRecords: discovery.trajectoryRecords ?? [] } }),
        finishedAt: new Date().toISOString(),
      });
      await clearActiveJobIfOwned(lockKey, atlasJobId);
      return { phase: 1, ingested: 0, enriched: materialized, contactsFound: 0, hotLeads: admitted.length, durationMs: Date.now() - startedAt, phaseSummary };
    }
    while (true) {
      await assertAtlasJobActive(atlasJobId);
      assertAtlasDeadline();
      if (researched >= targetLimit) break;
      if (controlTurns >= maxControlTurns) {
        const safetyMessage = `Canonical Atlas control safety ceiling reached after ${maxControlTurns} AI control turns; refusing another transition.`;
        phaseSummary.controlSafetyCeiling = safetyMessage;
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
        await updateJob(atlasJobId, {
          status: "failed",
          progress: 3,
          total: 4,
          atlasPhase: 3,
          atlasPhaseTotal: 4,
          outcome: "incomplete",
          message: safetyMessage,
          result: JSON.stringify({ control: { turns: controlTurns, maxControlTurns, safetyCeiling: true } }),
          finishedAt: new Date().toISOString(),
        });
        await clearActiveJobIfOwned(lockKey, atlasJobId);
        return { phase: 3, ingested: 0, enriched: materialized, contactsFound, hotLeads: admitted.length, durationMs: Date.now() - startedAt, phaseSummary };
      }
      controlTurns += 1;
      const directionValidationFeedback = rejectedControlDirection;
      const decision = await decideAtlasNextAction({ objective: discoveryObjective, admittedCandidates: admittedCandidateSources.map(({ name, sourceUrls }) => { const finding = discovery.findings.find((candidate) => normalizeCandidateIdentityName(candidate.personName ?? "") === normalizeCandidateIdentityName(name) && candidate.promotionDecision === "promote" && candidate.scope === "candidate"); return { name, role: finding?.role ?? null, sourceUrls }; }), discoveryStatus: discovery.status, discoveryTrajectory: discovery.trajectory, discoveryTrajectoryRecords: discovery.trajectoryRecords, discoveryFindings: discovery.findings.map((finding) => ({ personName: finding.personName, role: finding.role, scope: finding.scope, promotionDecision: finding.promotionDecision, sourceUrls: finding.sourceUrls, note: finding.note })), priorAction, priorCandidate, caseId: discoveryCaseId, controlTurn: controlTurns, jobId: atlasJobId, investigatorReport: JSON.stringify({
        provider: boss.investigatorLlm,
        controlValidationFeedback: directionValidationFeedback ? `The previous Boss pivot at control turn ${directionValidationFeedback.controlTurn} was rejected by deterministic control validation: ${directionValidationFeedback.reason}. No Investigator tool was executed. Choose a corrected research question or a different valid control action; do not include a concrete URL or prescribe a provider/tool. This feedback is control state, not research evidence.` : null,
        status: discovery.status,
        searches: discovery.searches,
        visits: discovery.visits,
        findings: discovery.findings,
        modelFindings: discovery.modelFindings,
        targetInvestigation: latestTargetInvestigation,
        openQuestions: discovery.trajectoryRecords?.map((record) => ({
          turn: record.turn,
          action: record.action,
          execution: record.execution,
          observation: record.observation,
          observedUrls: record.observedUrls,
          stopReason: record.stopReason,
        })) ?? [],
      }, null, 2) });
      if (directionValidationFeedback) rejectedControlDirection = null;
      await assertAtlasJobActive(atlasJobId);
      phaseSummary[`control_${controlTurns}`] = `${decision.action}${decision.candidateName ? `:${decision.candidateName}` : ""}${decision.direction ? ` — ${decision.direction}` : ""}`;
      await db.update(researchCasesTable).set({
        status: decision.status === "completed" ? (decision.action === "stop" ? "review" : "active") : "review",
        currentAction: decision.status === "completed" ? (decision.action === "stop" ? "canonical-discovery-stopped" : `canonical-control-${decision.action}`) : "canonical-control-unavailable",
        lastDecisionAt: new Date(),
        updatedAt: new Date(),
      }).where(and(eq(researchCasesTable.id, discoveryCaseId),eq(researchCasesTable.status,"active"),sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`));
      finalControlAction = decision.action;
      if (decision.status !== "completed") {
        const terminalMessage = decision.reason || decision.error || "Atlas control decision became unavailable; discovery stopped fail-closed for review.";
        await updateJob(atlasJobId, { status: "failed", progress: 3, total: 4, atlasPhase: 3, atlasPhaseTotal: 4, outcome: "incomplete", message: terminalMessage, result: JSON.stringify({ rightHand, boss: { status: boss.status, model: boss.model, investigatorLlm: boss.investigatorLlm }, discovery: { status: discovery.status, findings: discovery.findings.length, searches: discovery.searches, visits: discovery.visits, caseId: discoveryCaseId, runs: discoveryRuns }, control: { turns: controlTurns, decision } }), finishedAt: new Date().toISOString() });
        await clearActiveJobIfOwned(lockKey, atlasJobId);
        return { phase: 3, ingested: 0, enriched: materialized, contactsFound, hotLeads: admitted.length, durationMs: Date.now() - startedAt, phaseSummary };
      }
      finalControlAction = decision.action;
      if (decision.action === "stop") break;
      priorAction = decision.action; priorCandidate = decision.candidateName;
      if (decision.action === "research_candidate" || decision.action === "revisit_candidate") {
        await assertAtlasJobActive(atlasJobId);
        const name = decision.candidateName; if (!name) continue;
        const entityRows = await db.select({ id: entitiesTable.id, name: entitiesTable.name, metadata: entitiesTable.metadata }).from(entitiesTable).where(and(sql`LOWER(${entitiesTable.name}) = LOWER(${name})`, inArray(entitiesTable.type, ["HNWI", "Gatekeeper", "PersonCandidate"]))).limit(16);
        const entity = entityRows.find((row) => {
          try { const metadata = row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : {}; return Number(metadata.discoveryCaseId) === discoveryCaseId; } catch { return false; }
        });
        if (!entity) { phaseSummary[`control_${controlTurns}_candidate_binding`] = `No durable entity binding for admitted candidate ${name}; refusing ambiguous same-name target research.`; continue; } if (decision.action === "research_candidate" && researchedNames.has(name.toLowerCase())) continue;
        const before = await db.select({ email: entitiesTable.email, phone: entitiesTable.phone, linkedinUrl: entitiesTable.linkedinUrl, twitterHandle: entitiesTable.twitterHandle, instagramHandle: entitiesTable.instagramHandle, telegramHandle: entitiesTable.telegramHandle, personalWebsite: entitiesTable.personalWebsite }).from(entitiesTable).where(eq(entitiesTable.id, entity.id)).limit(1); const beforeCard = before[0] ?? null;
        await assertAtlasJobActive(atlasJobId);
        const targetBudget = Math.min(opts.targetTimeoutMs ?? depth.agenticHardTimeoutMs, assertAtlasDeadline() - 5_000); if (targetBudget < 30_000) throw new Error("Insufficient remaining Atlas budget for target investigation.");
        const remainingTargetIterations = Math.max(0, depth.agenticMaxIterations - investigatorIterationsUsed); if (remainingTargetIterations <= 0) { investigatorResourceLimited = true; phaseSummary.controlSafetyCeiling = `Canonical Atlas Investigator iteration ceiling reached at ${investigatorIterationsUsed}/${depth.agenticMaxIterations}; refusing another target episode.`; break; }
        const targetResult = await runCanonicalSingleTargetInvestigation(atlasJobId, entity.id, { researchDepth: opts.researchDepth, targetTimeoutMs: targetBudget, manageJobLifecycle: false, maxInvestigatorIterations: remainingTargetIterations, excludedInvestigatorLlm: [...quotaExhaustedInvestigators] });
        for (const exhausted of targetResult.exhaustedInvestigatorLlm) quotaExhaustedInvestigators.add(exhausted);
        if (quotaExhaustedInvestigators.has(selectedInvestigator)) {
          await reassignInvestigatorAfterHardQuota(selectedInvestigator, "A target-scoped Investigator capability exhausted its upstream request quota during this Atlas job; the discovery capability is therefore also excluded for the remainder of this job.");
        }
        investigatorIterationsUsed += Math.max(0, targetResult.investigatorIterationsUsed);
        investigatorResourceLimited = targetResult.resourceLimited || investigatorIterationsUsed >= depth.agenticMaxIterations;
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
        researched += 1; researchedNames.add(name.toLowerCase());
        const after = await db.select({ email: entitiesTable.email, phone: entitiesTable.phone, linkedinUrl: entitiesTable.linkedinUrl, twitterHandle: entitiesTable.twitterHandle, instagramHandle: entitiesTable.instagramHandle, telegramHandle: entitiesTable.telegramHandle, personalWebsite: entitiesTable.personalWebsite }).from(entitiesTable).where(eq(entitiesTable.id, entity.id)).limit(1); const afterCard = after[0] ?? null;
        if (beforeCard && afterCard) { const cardFields: Array<keyof typeof beforeCard> = ["email", "phone", "linkedinUrl", "twitterHandle", "instagramHandle", "telegramHandle", "personalWebsite"]; contactsFound += cardFields.filter((field) => beforeCard[field] !== afterCard[field] && afterCard[field]).length; }
        continue;
      }
      if (decision.action === "continue_discovery" || decision.action === "pivot_discovery") {
        await assertAtlasJobActive(atlasJobId);
         latestEvidenceBackedTerminal = null;
        const proposedDirection = decision.direction || "Reassess the open evidence and choose the highest-information next action yourself.";
        const validatedDirection = validateResearchObjective(proposedDirection);
        if (!validatedDirection.valid) {
          // A malformed Boss pivot is a rejected control decision, not a reason to
          // terminate the whole Atlas job. Preserve the rejection and ask the model
          // control plane for another decision; never execute the rejected URL/tool.
          const rejectionReason = validatedDirection.reason;
          rejectedControlDirection = { controlTurn: controlTurns, reason: rejectionReason };
          finalControlAction = null;
          phaseSummary[`control_${controlTurns}_rejected`] = `Boss pivot rejected before Investigator execution: ${rejectionReason}; requesting another model-owned control decision.`;
          await assertAtlasJobActive(atlasJobId);
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
              payload: JSON.stringify({ jobId: atlasJobId, controlTurn: controlTurns, action: decision.action, reason: rejectionReason, investigatorActionExecuted: false, recovery: "request-new-model-control-decision" }),
            }).onConflictDoNothing({ target: [researchCaseEventsTable.caseId, researchCaseEventsTable.correlationKey] });
          }, { isolationLevel: "serializable" });
          continue;
        }
        const directedObjective = formatBossDirectedObjective(discoveryObjective, validatedDirection.direction);
        const discoveryBudget = Math.min(opts.targetTimeoutMs ?? depth.agenticHardTimeoutMs, assertAtlasDeadline() - 5_000); if (discoveryBudget < 30_000) throw new Error("Insufficient remaining Atlas budget for continued discovery.");
        const remainingInvestigatorIterations = Math.max(0, depth.agenticMaxIterations - investigatorIterationsUsed);
        if (remainingInvestigatorIterations <= 0) { investigatorResourceLimited = true; phaseSummary.controlSafetyCeiling = `Canonical Atlas Investigator iteration ceiling reached at ${investigatorIterationsUsed}/${depth.agenticMaxIterations}; refusing another discovery episode.`; break; }
        let nextDiscovery = await runBureauAgenticWebPass({ mode: "discovery", targetName: "", objective: directedObjective, investigatorLlm: selectedInvestigator, caseId: discoveryCaseId, jobId: atlasJobId, maxIterations: Math.min(depth.investigatorIterationsPerAct, remainingInvestigatorIterations), hardTimeoutMs: discoveryBudget, priorTrajectoryRecords: discovery.trajectoryRecords ?? [] });
        await assertAtlasJobActive(atlasJobId);
        nextDiscovery = await runDiscoveryWithQuotaRecovery(nextDiscovery, directedObjective, discoveryBudget, Math.min(depth.investigatorIterationsPerAct, remainingInvestigatorIterations), discovery.trajectoryRecords ?? []);
        // Keep the canonical discovery result cumulative across Boss-directed
        // episodes. Each episode's local result is useful for control decisions,
        // but replacing the durable summary with the latest episode can erase
        // previously observed searches/visits from the job result.
        discovery = mergeDiscoveryResults(discovery, nextDiscovery);
        consecutiveInvestigatorProviderUnavailable = isInvestigatorProviderUnavailable(nextDiscovery) ? consecutiveInvestigatorProviderUnavailable + 1 : 0;
        if (consecutiveInvestigatorProviderUnavailable >= maxConsecutiveInvestigatorProviderUnavailable) {
          const lastProviderError = [...(nextDiscovery.trajectoryRecords ?? [])].reverse().find((record) => record.action === "investigator_provider_error")?.observation ?? nextDiscovery.error ?? "Investigator provider remained unavailable.";
          const recoveryMessage = `Canonical Atlas Investigator provider remained unavailable for ${consecutiveInvestigatorProviderUnavailable} consecutive discovery episodes; refusing further AI control churn and parking for review.`;
          phaseSummary.investigatorProviderRecovery = recoveryMessage;
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
              providerRecovery: { consecutiveUnavailable: consecutiveInvestigatorProviderUnavailable, limit: maxConsecutiveInvestigatorProviderUnavailable, lastProviderError },
              control: { turns: controlTurns },
            }),
            finishedAt: new Date().toISOString(),
          });
          await clearActiveJobIfOwned(lockKey, atlasJobId);
          return { phase: 3, ingested: 0, enriched: materialized, contactsFound, hotLeads: admitted.length, durationMs: Date.now() - startedAt, phaseSummary };
        }
        discoveryRuns += 1;
        investigatorIterationsUsed += Math.max(0, nextDiscovery.iterations ?? 0);
        investigatorResourceLimited = investigatorIterationsUsed >= depth.agenticMaxIterations;
        // The cumulative result was already updated by mergeDiscoveryResults above.
        // Do not append this episode a second time: that doubles its metrics and
        // trajectory/finding records on every Boss-directed continuation.
        admission = await materializeAtlasAdmissions({ discoveryRunId: nextDiscovery.runId ?? "", findings: nextDiscovery.findings, atlasJobId, discoveryCaseId });
        admittedCandidateSources = mergeDurablyAdmittedCandidateSources([admittedCandidateSources, admission.candidates]);
        admitted = admittedCandidateSources.map(({ name }) => name);
        materialized += admission.materialized;
        evidenceRows += admission.evidenceRows;
        latestEvidenceBackedTerminal = deriveLatestEvidenceBackedTerminal("discovery", nextDiscovery.status, nextDiscovery.stopReason, investigatorResourceLimited) !== null && admitted.length > 0 ? "discovery" : null;
      }
    }
    await assertAtlasJobActive(atlasJobId);
    phaseSummary.discovery = `runs=${discoveryRuns}; admitted=${admitted.length}; materialized=${materialized}; evidenceRows=${evidenceRows}; searches=${discovery.searches}; visits=${discovery.visits}; trajectory=${discovery.trajectory.length}; structuredTurns=${discovery.trajectoryRecords?.length ?? 0}`;
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
    const leaseLost = !jobStateUnavailable && durableJob?.status === "running" && /Canonical Atlas lease was lost/i.test(rawMessage);
    const currentAction = cancelled
      ? "canonical-atlas-cancelled"
      : jobStateUnavailable
        ? "canonical-job-state-unavailable"
        : jobMissing
          ? "canonical-atlas-job-missing"
          : leaseLost
            ? "canonical-lease-lost"
            : "canonical-atlas-failed";
    const message = cancelled
      ? "Canonical Atlas discovery cancelled; outcome incomplete."
      : jobStateUnavailable
        ? "Canonical Atlas job state unavailable; discovery stopped without claiming cancellation."
        : safeThrownErrorSummary("Canonical Atlas discovery failed", error);
    await db.update(researchCasesTable).set({
      status: "review",
      currentAction,
      updatedAt: new Date(),
    }).where(and(
      sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,
      inArray(researchCasesTable.status, ["active", "review"]),
      sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-complete','canonical-atlas-cancelled','canonical-lease-lost')`,
    ));
    // Let the outer launch boundary reconcile job status if Redis reads are
    // unavailable; do not persist a guessed cancellation.
    if (!jobStateUnavailable) {
      await updateJob(atlasJobId, { status: cancelled ? "cancelled" : "failed", outcome: "incomplete", message, finishedAt: new Date().toISOString() });
    }
    try { await clearActiveJobIfOwned(lockKey, atlasJobId); } catch {
      // Outer launch boundary owns the final cleanup attempt.
    }
    throw error;
  }}
