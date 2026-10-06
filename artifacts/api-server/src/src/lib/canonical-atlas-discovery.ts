import { and, eq, inArray, sql } from "drizzle-orm";
import { db, entitiesTable, researchCasesTable, researchCaseEventsTable, researchSessionsTable, researchEvidenceTable } from "@workspace/db";
import { updateJob, clearActiveJobIfOwned, getJob } from "./job-queue";
import { runGroqBossDiscovery } from "./case-bureau";
import { runBureauAgenticWebPass } from "./bureau-agentic-pass";
import { runCanonicalSingleTargetInvestigation } from "./canonical-single-target-runner";
import { decideAtlasNextAction, type AtlasControlAction } from "./atlas-control-decision";
import { resolveResearchDepth } from "./research-depth";
import type { InvestigatorCapability } from "./investigator-capability-registry";
import { deriveCanonicalTerminalDecision } from "./canonical-terminal-state";
import { deriveLatestEvidenceBackedTerminal, type LatestEvidenceBackedTerminal } from "./canonical-terminal-authority";

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
function uniqueNames(values: string[]): string[] { return [...new Set(values.map((value) => value.trim()).filter((value) => value.length >= 3))]; }
function isObservedHttpSource(value: unknown): value is string { return typeof value === "string" && /^https?:\/\/\S+$/i.test(value); }
function normalizeSourceUrl(raw: string): string | null { try { const url = new URL(raw); if (!/^https?:$/i.test(url.protocol)) return null; url.hash = ""; url.hostname = url.hostname.toLowerCase(); return url.href.endsWith("/") ? url.href.slice(0, -1) : url.href; } catch { return null; } }
function candidateIdentityObserved(personName: string, observation: unknown): boolean {
  const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
  const normalizedName = normalize(personName);
  const normalizedText = normalize(typeof observation === "string" ? observation : "");
  return normalizedName.length >= 3 && normalizedText.includes(normalizedName);
}


async function createAtlasDiscoveryCase(input: { atlasJobId: string; objective: string; investigatorLlm: InvestigatorCapability }): Promise<number> {
  const [created] = await db.insert(researchCasesTable).values({ caseType: "discovery", status: "active", directorMode: "groq_boss", directorProvider: "groq", directorModel: "pending", objective: input.objective, motivation: "Durable memory for canonical Atlas Investigator discovery.", openingPrompt: "Investigator chooses every research action; this case is memory/state, not a deterministic research plan.", caseFile: JSON.stringify({ caseType: "discovery", contextDocument: ["CANONICAL ATLAS DISCOVERY CASE", `JOB: ${input.atlasJobId}`, `INVESTIGATOR: ${input.investigatorLlm}`, `OBJECTIVE: ${input.objective}`, "STATE: Initial discovery; Investigator owns the next action.", "TRAJECTORY: []"].join("\n"), investigatorTrajectory: [], investigatorTrajectoryRecords: [], investigationTimeline: [], jobId: input.atlasJobId }), currentAction: "canonical-investigator-discovery", iteration: 0 }).returning({ id: researchCasesTable.id });
  const caseId = created?.id; if (!caseId) throw new Error("Failed to create durable Atlas discovery case.");
  return caseId;
}

async function materializeAtlasAdmissions(input: { discoveryRunId: string; findings: Array<{ promotionDecision?: "promote" | "reject"; scope: "organization" | "candidate" | "unknown"; personName: string | null; role: string | null; sourceUrls: string[] }>; atlasJobId: string; discoveryCaseId: number }): Promise<{ names: string[]; materialized: number; evidenceRows: number }> {
  const admitted = uniqueNames(input.findings.filter((f) => f.promotionDecision === "promote").filter((f) => f.scope === "candidate").filter((f) => typeof f.personName === "string" && f.personName.trim().length >= 3).filter((f) => Array.isArray(f.sourceUrls) && f.sourceUrls.some(isObservedHttpSource)).map((f) => f.personName as string));
  let materialized = 0;
  let evidenceRows = 0;
  for (const name of admitted) {
    const finding = input.findings.find((candidate) => candidate.personName?.trim().toLowerCase() === name.toLowerCase() && candidate.promotionDecision === "promote" && candidate.scope === "candidate" && Array.isArray(candidate.sourceUrls) && candidate.sourceUrls.some(isObservedHttpSource));
    const sourceUrlRaw = finding?.sourceUrls?.find(isObservedHttpSource) ?? null; const sourceUrl = sourceUrlRaw ? normalizeSourceUrl(sourceUrlRaw) : null; if (!sourceUrl) continue;
    const caseEvents = await db.select({ id: researchCaseEventsTable.id, eventType: researchCaseEventsTable.eventType, payload: researchCaseEventsTable.payload, createdAt: researchCaseEventsTable.createdAt }).from(researchCaseEventsTable).where(eq(researchCaseEventsTable.caseId, input.discoveryCaseId));
    const normalizedSource = sourceUrl;
    const supported = caseEvents.some((event) => {
      if (event.eventType !== "tool_observation" || typeof event.payload !== "string") return false;
      try {
        const payload = JSON.parse(event.payload) as { action?: string; execution?: string; observedUrls?: unknown[]; runId?: string; observation?: string };
        // Search results are leads, not admission-grade identity evidence. A named
        // discovery candidate must be grounded in an actually retrieved source page.
        const directSourceAction = payload.action === "visit" || payload.action === "browser_fetch";
        return payload.runId === input.discoveryRunId && candidateIdentityObserved(name, payload.observation) && directSourceAction && payload.execution === "success" && Array.isArray(payload.observedUrls) && payload.observedUrls.some((url) => { const normalized = normalizeSourceUrl(String(url)); return normalized === normalizedSource; });
      } catch { return false; }
    });
    if (!supported) continue;
    const existingRows = await db.select({ id: entitiesTable.id }).from(entitiesTable).where(and(eq(entitiesTable.name, name), inArray(entitiesTable.type, ["HNWI", "Gatekeeper"]))).limit(1);
    const existing = existingRows[0]; let entityId = existing?.id ?? null;
    if (!entityId) { const [created] = await db.insert(entitiesTable).values({ name, type: "HNWI", bayesianScore: 0.05, contactConfidence: 0, contactOutcome: "evidence_only", isHot: false, isStarred: false, isHidden: false, sourceRegistries: JSON.stringify(["canonical-agentic-discovery"]), notes: "Model-selected discovery candidate; target-scoped Investigator research required before contact promotion.", metadata: JSON.stringify({ reviewOnly: true, admission: "investigator-explicit-promotion", sourceUrl, discoveryCaseId: input.discoveryCaseId }) }).returning({ id: entitiesTable.id }); entityId = created?.id ?? null; if (entityId) materialized += 1; }
    if (!entityId) continue;
    const supportingEvent = caseEvents.find((event) => { if (event.eventType !== "tool_observation" || typeof event.payload !== "string") return false; try { const payload = JSON.parse(event.payload) as { action?: string; execution?: string; observedUrls?: unknown[]; runId?: string; observation?: string }; const directSourceAction = payload.action === "visit" || payload.action === "browser_fetch"; return payload.runId === input.discoveryRunId && candidateIdentityObserved(name, payload.observation) && directSourceAction && payload.execution === "success" && Array.isArray(payload.observedUrls) && payload.observedUrls.some((url) => normalizeSourceUrl(String(url)) === normalizedSource); } catch { return false; } });
    const [existingEvidence] = await db.select({ id: researchEvidenceTable.id }).from(researchEvidenceTable).where(and(eq(researchEvidenceTable.entityId, entityId), eq(researchEvidenceTable.sourceUrl, normalizedSource))).limit(1);
    if (!existingEvidence) {
      const [session] = await db.insert(researchSessionsTable).values({ targetEntityId: entityId, winningPath: JSON.stringify([{ sourceUrl: normalizedSource, caseId: input.discoveryCaseId, admission: "investigator-explicit-promotion" }]), notes: "Canonical discovery admission evidence; target-scoped investigation required before contact promotion.", safeUseStatus: "manual_review", crmStatus: "Lead Gen" }).returning({ id: researchSessionsTable.id });
      if (session?.id) { await db.insert(researchEvidenceTable).values({ sessionId: session.id, entityId, claimType: "identity_candidate", claim: `Investigator-discovered candidate: ${name}`, value: name, sourceName: "canonical-agentic-discovery", sourceUrl: normalizedSource, sourceDomain: new URL(normalizedSource).hostname, status: "review", confidence: 0.5, observedAt: supportingEvent?.createdAt ?? new Date(), freshnessScore: 1, metadata: JSON.stringify({ discoveryCaseId: input.discoveryCaseId, atlasJobId: input.atlasJobId, supportingEventId: supportingEvent?.id ?? null, promotionDecision: "promote", reviewOnly: true }) }); evidenceRows += 1; }
    }
  }
  return { names: admitted, materialized, evidenceRows };
}

async function assertAtlasJobActive(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job || job.status === "cancelled") throw new Error("Canonical Atlas job cancelled; refusing further control-plane work.");
  if (job.status === "failed") throw new Error("Canonical Atlas job already failed; refusing further control-plane work.");
}

export async function runCanonicalAtlasPipeline(atlasJobId: string, opts: CanonicalAtlasOptions = {}): Promise<CanonicalAtlasResult> {
  const startedAt = Date.now(); const depth = resolveResearchDepth({ explicit: opts.researchDepth }); const configuredControlTurnCeiling = Number(process.env.APEX_ATLAS_MAX_CONTROL_TURNS ?? 16); const maxControlTurns = Math.min(64, Math.max(1, Number.isFinite(configuredControlTurnCeiling) ? Math.floor(configuredControlTurnCeiling) : 16)); const discoveryOnly = opts.discoveryOnly === true; const lockKey = opts.lockKey ?? "atlas-run"; const phaseSummary: Record<string, string> = {}; const targetLimit = Math.max(1, Math.min(25, Number(opts.targetCount ?? 3) || 3)); const configuredAtlasTimeout = Number(process.env.APEX_ATLAS_RUN_TIMEOUT_MS ?? 15 * 60 * 1000); const atlasTimeoutMs = Math.min(30 * 60 * 1000, Math.max(2 * 60 * 1000, Number.isFinite(configuredAtlasTimeout) ? configuredAtlasTimeout : 15 * 60 * 1000)); const atlasDeadline = startedAt + atlasTimeoutMs; const remainingBudget = () => atlasDeadline - Date.now(); const assertAtlasDeadline = () => { const remaining = remainingBudget(); if (remaining <= 30_000) throw new Error("Canonical Atlas global deadline reached; refusing another research/control turn."); return remaining; };
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
          .where(eq(researchCasesTable.id, opts.discoveryCaseId));
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
    });
    await assertAtlasJobActive(atlasJobId);
    await db.insert(researchCaseEventsTable).values({
      caseId: discoveryCaseId,
      iteration: 0,
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

    // Boss first, independent Right-hand second. The Right-hand reviews the
    // actual Boss decision; it does not pre-steer the Boss or choose the tools.
    const rightHandRaw = await import("./groq-right-hand-reasoning").then(({ runGroqRightHandFreeJson }) =>
      runGroqRightHandFreeJson(
        `Review Groq Boss's opening Atlas decision before the Investigator starts. Objective: ${discoveryObjective}. Boss selected Investigator: ${boss.investigatorLlm}. Boss report: ${boss.report ?? ""}. Next directions: ${JSON.stringify(boss.nextDirections)}. Uncertainties: ${JSON.stringify(boss.uncertainties)}. Return concise oversight/advisory observations only. Do not browse, do not choose tools, do not replace the Investigator, and do not invent people or evidence. Return JSON with decision, reason, focusLanes, confidence.`,
        "You are the Groq Right-hand. Review the Boss opening decision only. Advise the Boss; do not act as Investigator, do not browse, do not choose tools, and do not replace the selected Groq/Groq Investigator. Reply with ONE JSON object.",
      ),
    ).catch((error) => ({
      status: "unavailable" as const,
      model: "none",
      raw: null,
      error: error instanceof Error ? error.message : "Right-hand unavailable",
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
    if (rightHandRaw.status === "completed" && rightHandRaw.raw) {
      try {
        const parsed = JSON.parse(rightHandRaw.raw) as Record<string, unknown>;
        rightHand = {
          status: "completed",
          model: rightHandRaw.model,
          decision: typeof parsed.decision === "string" ? parsed.decision : null,
          reason: typeof parsed.reason === "string" ? parsed.reason : null,
          focusLanes: Array.isArray(parsed.focusLanes) ? parsed.focusLanes.filter((v): v is string => typeof v === "string") : [],
          confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : null,
          error: null,
        };
      } catch {
        rightHand.error = "Right-hand returned invalid JSON.";
      }
    }
    await assertAtlasJobActive(atlasJobId);
    if (rightHandRaw.status !== "completed") {
      await db.update(researchCasesTable)
        .set({ status: "review", currentAction: "groq-right-hand-unavailable", updatedAt: new Date() })
        .where(and(eq(researchCasesTable.id, discoveryCaseId), eq(researchCasesTable.status, "active")));
      throw new Error(`Groq Right-hand unavailable; failing closed: ${rightHandRaw.error ?? "unknown oversight failure"}`);
    }
    if (rightHand.error) {
      await db.update(researchCasesTable)
        .set({ status: "review", currentAction: "groq-right-hand-invalid", updatedAt: new Date() })
        .where(and(eq(researchCasesTable.id, discoveryCaseId), eq(researchCasesTable.status, "active")));
      throw new Error(`Groq Right-hand returned invalid oversight: ${rightHand.error}`);
    }

    await db.insert(researchCaseEventsTable).values({
      caseId: discoveryCaseId,
      iteration: 0,
      actorRole: "right_hand",
      eventType: "observation",
      status: "recorded",
      summary: "Groq Right-hand reviewed the Boss opening decision before Investigator execution.",
      correlationKey: `${atlasJobId}:right-hand-opening`,
      payload: JSON.stringify({
        jobId: atlasJobId,
        bossModel: boss.model,
        investigatorLlm: boss.investigatorLlm,
        decision: rightHand.decision,
        reason: rightHand.reason,
        focusLanes: rightHand.focusLanes,
        confidence: rightHand.confidence,
      }),
    });

    await assertAtlasJobActive(atlasJobId);
    await updateJob(atlasJobId, {
      progress: 1,
      atlasPhase: 1,
      message: `${boss.investigatorLlm.toUpperCase()} Investigator running free-ReAct discovery…`,
      result: JSON.stringify({ rightHand, boss: { status: boss.status, model: boss.model, investigatorLlm: boss.investigatorLlm }, discoveryCaseId }),
    });
    await db.insert(researchCaseEventsTable).values({
      caseId: discoveryCaseId,
      iteration: 0,
      actorRole: "head_investigator",
      eventType: "assignment",
      status: "recorded",
      summary: "Canonical discovery Investigator mounted after Boss opening and Right-hand review.",
      correlationKey: `${atlasJobId}:discovery-assignment`,
      payload: JSON.stringify({ jobId: atlasJobId, investigatorLlm: boss.investigatorLlm, mode: "discovery", controlPlane: "canonical-atlas-discovery" }),
    });
    await assertAtlasJobActive(atlasJobId);
    const openingDiscoveryBudget = Math.min(opts.targetTimeoutMs ?? depth.agenticHardTimeoutMs, assertAtlasDeadline() - 5_000); if (openingDiscoveryBudget < 30_000) throw new Error("Insufficient remaining Atlas budget for discovery Investigator.");
    let discovery = await runBureauAgenticWebPass({ mode: "discovery", targetName: "", objective: discoveryObjective, investigatorLlm: boss.investigatorLlm, caseId: discoveryCaseId, jobId: atlasJobId, maxIterations: depth.agenticMaxIterations, hardTimeoutMs: openingDiscoveryBudget });
    await assertAtlasJobActive(atlasJobId);
    let admission = await materializeAtlasAdmissions({ discoveryRunId: discovery.runId ?? "", findings: discovery.findings, atlasJobId, discoveryCaseId });
    let admitted = admission.names; let materialized = admission.materialized; let evidenceRows = admission.evidenceRows; let researched = 0; let contactsFound = 0; let controlTurns = 0; let discoveryRuns = 1; let latestTargetInvestigation: Record<string, unknown> | null = null; let latestEvidenceBackedTerminal: "discovery" | "target" | null = discovery.status === "completed" && discovery.stopReason === "MODEL_DECIDED_DONE" ? "discovery" : null; let investigatorIterationsUsed = discovery.iterations; let investigatorResourceLimited = investigatorIterationsUsed >= depth.agenticMaxIterations; let priorAction: AtlasControlAction | null = null; let priorCandidate: string | null = null; let finalControlAction: AtlasControlAction | null = null;
    const researchedNames = new Set<string>();
    phaseSummary.assignment = `${boss.investigatorLlm} selected by Groq; discovery completed=${discovery.status}; durableCase=${discoveryCaseId}.`; phaseSummary.discovery = `admitted=${admitted.length}; materialized=${materialized}; evidenceRows=${evidenceRows}; searches=${discovery.searches}; visits=${discovery.visits}; trajectory=${discovery.trajectory.length}; structuredTurns=${discovery.trajectoryRecords?.length ?? 0}`;
    if (discoveryOnly) {
      await assertAtlasJobActive(atlasJobId);
      const [current] = await db.select({ caseFile: researchCasesTable.caseFile, iteration: researchCasesTable.iteration }).from(researchCasesTable).where(and(eq(researchCasesTable.id, discoveryCaseId),eq(researchCasesTable.status,"active"),sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`)).limit(1);
      let caseFile: Record<string, any> = {}; try { const parsed = current?.caseFile ? JSON.parse(current.caseFile) : {}; if (parsed && typeof parsed === "object") caseFile = parsed; } catch { caseFile = {}; }
      const candidates = admitted.map((name) => { const finding = (discovery.findings ?? []).find((item) => item.personName?.trim().toLowerCase() === name.toLowerCase() && item.promotionDecision === "promote" && item.scope === "candidate"); return { name, type: "review_candidate", relevance: "Explicit Investigator discovery admission candidate", reachability: "Requires target-scoped Investigator research", sourceUrls: finding?.sourceUrls ?? [], contactEvidence: [], state: "review_only", admittedEntityId: null }; });
      await assertAtlasJobActive(atlasJobId);
      await db.transaction(async (tx) => {
        const [locked] = await tx.select({ caseFile: researchCasesTable.caseFile, iteration: researchCasesTable.iteration }).from(researchCasesTable).where(and(eq(researchCasesTable.id, discoveryCaseId), eq(researchCasesTable.status, "active"), sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`, sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`)).for("update").limit(1);
        if (!locked) throw new Error("Canonical discovery admission projection lost its active case fence.");
        let lockedCaseFile: Record<string, any> = {};
        try { const parsed = locked.caseFile ? JSON.parse(locked.caseFile) : {}; if (parsed && typeof parsed === "object") lockedCaseFile = parsed; } catch { throw new Error("Canonical discovery admission caseFile became unreadable."); }
        const nextIteration = Number(locked.iteration ?? 0) + 1;
        await tx.update(researchCasesTable).set({ caseFile: JSON.stringify({ ...lockedCaseFile, discoveredCandidates: [...(Array.isArray(lockedCaseFile.discoveredCandidates) ? lockedCaseFile.discoveredCandidates : []), ...candidates], currentProgress: { ...(lockedCaseFile.currentProgress ?? {}), lastDiscoveryAt: new Date().toISOString(), lastReviewedBy: "groq-boss" } }), currentAction: admitted.length ? "target-scoped-investigator-research" : "review", iteration: nextIteration, updatedAt: new Date() }).where(and(eq(researchCasesTable.id, discoveryCaseId), eq(researchCasesTable.status, "active"), sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`, sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`));
        await tx.insert(researchCaseEventsTable).values({ caseId: discoveryCaseId, iteration: nextIteration, actorRole: "specialist", eventType: "observation", status: "recorded", summary: `Canonical discovery admission: ${admitted.length} review candidate(s).`, correlationKey: `${atlasJobId}:discovery-admission:${nextIteration}`, payload: JSON.stringify({ jobId: atlasJobId, investigatorLlm: boss.investigatorLlm, admitted, sourceUrls: (discovery.findings ?? []).flatMap((finding) => finding.sourceUrls) }) });
      }, { isolationLevel: "serializable" });
      const durableStatus = discovery.status === "completed" && discovery.stopReason === "MODEL_DECIDED_DONE" && !investigatorResourceLimited ? "complete" : "review";
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
        message: discovery.status === "completed"
          ? `Canonical discovery complete: ${admitted.length} exact named candidate(s) admitted for review.`
          : `Canonical discovery incomplete: ${discovery.error ?? discovery.stopReason ?? discovery.status}.`,
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
      const decision = await decideAtlasNextAction({ objective: discoveryObjective, admittedCandidates: admitted.map((name) => { const finding = discovery.findings.find((candidate) => candidate.personName?.trim().toLowerCase() === name.toLowerCase()); return { name, role: finding?.role ?? null, sourceUrls: finding?.sourceUrls?.filter(isObservedHttpSource) ?? [] }; }), discoveryStatus: discovery.status, discoveryTrajectory: discovery.trajectory, discoveryTrajectoryRecords: discovery.trajectoryRecords, discoveryFindings: discovery.findings.map((finding) => ({ personName: finding.personName, role: finding.role, scope: finding.scope, promotionDecision: finding.promotionDecision, sourceUrls: finding.sourceUrls, note: finding.note })), priorAction, priorCandidate, caseId: discoveryCaseId, controlTurn: controlTurns, investigatorReport: JSON.stringify({
        provider: boss.investigatorLlm,
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
        const [entity] = await db.select({ id: entitiesTable.id, name: entitiesTable.name }).from(entitiesTable).where(and(eq(entitiesTable.name, name), inArray(entitiesTable.type, ["HNWI", "Gatekeeper"]))).limit(1);
        if (!entity) continue; if (decision.action === "research_candidate" && researchedNames.has(name.toLowerCase())) continue;
        const before = await db.select({ email: entitiesTable.email, phone: entitiesTable.phone, linkedinUrl: entitiesTable.linkedinUrl, twitterHandle: entitiesTable.twitterHandle, instagramHandle: entitiesTable.instagramHandle, telegramHandle: entitiesTable.telegramHandle, personalWebsite: entitiesTable.personalWebsite }).from(entitiesTable).where(eq(entitiesTable.id, entity.id)).limit(1); const beforeCard = before[0] ?? null;
        await assertAtlasJobActive(atlasJobId);
        const targetBudget = Math.min(opts.targetTimeoutMs ?? depth.agenticHardTimeoutMs, assertAtlasDeadline() - 5_000); if (targetBudget < 30_000) throw new Error("Insufficient remaining Atlas budget for target investigation.");
        const remainingTargetIterations = Math.max(0, depth.agenticMaxIterations - investigatorIterationsUsed); if (remainingTargetIterations <= 0) { investigatorResourceLimited = true; phaseSummary.controlSafetyCeiling = `Canonical Atlas Investigator iteration ceiling reached at ${investigatorIterationsUsed}/${depth.agenticMaxIterations}; refusing another target episode.`; break; }
        const targetResult = await runCanonicalSingleTargetInvestigation(atlasJobId, entity.id, { researchDepth: opts.researchDepth, targetTimeoutMs: targetBudget, manageJobLifecycle: false, maxInvestigatorIterations: remainingTargetIterations });
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
        const directedObjective = `${discoveryObjective}\n\nBOSS-DIRECTED RESEARCH QUESTION / PIVOT:\n${decision.direction || "Reassess the open evidence and choose the highest-information next action yourself."}`;
        const discoveryBudget = Math.min(opts.targetTimeoutMs ?? depth.agenticHardTimeoutMs, assertAtlasDeadline() - 5_000); if (discoveryBudget < 30_000) throw new Error("Insufficient remaining Atlas budget for continued discovery.");
        const remainingInvestigatorIterations = Math.max(0, depth.agenticMaxIterations - investigatorIterationsUsed);
        if (remainingInvestigatorIterations <= 0) { investigatorResourceLimited = true; phaseSummary.controlSafetyCeiling = `Canonical Atlas Investigator iteration ceiling reached at ${investigatorIterationsUsed}/${depth.agenticMaxIterations}; refusing another discovery episode.`; break; }
        const nextDiscovery = await runBureauAgenticWebPass({ mode: "discovery", targetName: "", objective: directedObjective, investigatorLlm: boss.investigatorLlm, caseId: discoveryCaseId, jobId: atlasJobId, maxIterations: Math.min(depth.investigatorIterationsPerAct, remainingInvestigatorIterations), hardTimeoutMs: discoveryBudget });
        await assertAtlasJobActive(atlasJobId);
        discoveryRuns += 1;
        investigatorIterationsUsed += Math.max(0, nextDiscovery.iterations ?? 0);
        investigatorResourceLimited = investigatorIterationsUsed >= depth.agenticMaxIterations;
         latestEvidenceBackedTerminal = deriveLatestEvidenceBackedTerminal("discovery", nextDiscovery.status, nextDiscovery.stopReason, investigatorResourceLimited);
        discovery = { ...nextDiscovery, searches: discovery.searches + nextDiscovery.searches, visits: discovery.visits + nextDiscovery.visits, iterations: discovery.iterations + nextDiscovery.iterations, findings: [...(discovery.findings ?? []), ...(nextDiscovery.findings ?? [])], modelFindings: [...(discovery.modelFindings ?? []), ...(nextDiscovery.modelFindings ?? [])], trajectory: [...discovery.trajectory, ...nextDiscovery.trajectory], trajectoryRecords: [...(discovery.trajectoryRecords ?? []), ...(nextDiscovery.trajectoryRecords ?? [])] };
        admission = await materializeAtlasAdmissions({ discoveryRunId: nextDiscovery.runId ?? "", findings: nextDiscovery.findings, atlasJobId, discoveryCaseId }); admitted = uniqueNames([...admitted, ...admission.names]); materialized += admission.materialized; evidenceRows += admission.evidenceRows;
      }
    }
    await assertAtlasJobActive(atlasJobId);
    phaseSummary.discovery = `runs=${discoveryRuns}; admitted=${admitted.length}; materialized=${materialized}; evidenceRows=${evidenceRows}; searches=${discovery.searches}; visits=${discovery.visits}; trajectory=${discovery.trajectory.length}; structuredTurns=${discovery.trajectoryRecords?.length ?? 0}`;
    phaseSummary.research = `researched=${researched}; explicitCardPromotions=${contactsFound}; controlTurns=${controlTurns}; finalAction=${finalControlAction ?? "none"}`;
    await assertAtlasJobActive(atlasJobId);
    const evidenceBackedTerminal = latestEvidenceBackedTerminal !== null;
    const finalIncomplete = investigatorResourceLimited || finalControlAction !== "stop" || !evidenceBackedTerminal;
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
    const message = error instanceof Error ? error.message : "Canonical Atlas discovery failed.";
    const cancelled = message.includes("Canonical Atlas job cancelled;");
    await db.update(researchCasesTable).set({
      status: "review",
      currentAction: cancelled ? "canonical-atlas-cancelled" : "canonical-atlas-failed",
      updatedAt: new Date(),
    }).where(and(
      sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${atlasJobId}`,
      inArray(researchCasesTable.status, ["active", "review"]),
      sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-complete','canonical-atlas-cancelled','canonical-lease-lost')`,
    ));
    await updateJob(atlasJobId, { status: cancelled ? "cancelled" : "failed", outcome: "incomplete", message, finishedAt: new Date().toISOString() });
    await clearActiveJobIfOwned(lockKey, atlasJobId);
    throw error;
  }
}
