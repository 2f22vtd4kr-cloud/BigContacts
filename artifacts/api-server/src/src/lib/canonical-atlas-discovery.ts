import { and, eq, inArray } from "drizzle-orm";
import { db, entitiesTable, researchCasesTable, researchCaseEventsTable, researchSessionsTable, researchEvidenceTable } from "@workspace/db";
import { updateJob, clearActiveJobIfOwned, getJob } from "./job-queue";
import { runGeminiBossDiscovery } from "./case-bureau";
import { runBureauAgenticWebPass } from "./bureau-agentic-pass";
import { runCanonicalSingleTargetInvestigation } from "./canonical-single-target-runner";
import { decideAtlasNextAction, type AtlasControlAction } from "./atlas-control-decision";
import { resolveResearchDepth } from "./research-depth";

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
const MAX_ATLAS_CONTROL_TURNS = 64;
const MAX_ATLAS_TRAJECTORY_RECORDS = 512;
function uniqueNames(values: string[]): string[] { return [...new Set(values.map((value) => value.trim()).filter((value) => value.length >= 3))]; }
function isObservedHttpSource(value: unknown): value is string { return typeof value === "string" && /^https?:\/\/\S+$/i.test(value); }

async function createAtlasDiscoveryCase(input: { atlasJobId: string; objective: string; investigatorLlm: "groq" | "mistral" }): Promise<number> {
  const [created] = await db.insert(researchCasesTable).values({ caseType: "discovery", status: "active", directorMode: "gemini_boss", directorProvider: "gemini", directorModel: "pending", objective: input.objective, motivation: "Durable memory for canonical Atlas Investigator discovery.", openingPrompt: "Investigator chooses every research action; this case is memory/state, not a deterministic research plan.", caseFile: JSON.stringify({ caseType: "discovery", contextDocument: ["CANONICAL ATLAS DISCOVERY CASE", `JOB: ${input.atlasJobId}`, `INVESTIGATOR: ${input.investigatorLlm}`, `OBJECTIVE: ${input.objective}`, "STATE: Initial discovery; Investigator owns the next action.", "TRAJECTORY: []"].join("\n"), investigatorTrajectory: [], investigatorTrajectoryRecords: [], investigationTimeline: [], jobId: input.atlasJobId }), currentAction: "canonical-investigator-discovery", iteration: 0 }).returning({ id: researchCasesTable.id });
  const caseId = created?.id; if (!caseId) throw new Error("Failed to create durable Atlas discovery case.");
  return caseId;
}

async function materializeAtlasAdmissions(input: { findings: Array<{ promotionDecision?: "promote" | "reject"; scope: "organization" | "candidate" | "unknown"; personName: string | null; role: string | null; sourceUrls: string[] }>; atlasJobId: string; discoveryCaseId: number }): Promise<{ names: string[]; materialized: number; evidenceRows: number }> {
  const admitted = uniqueNames(input.findings.filter((f) => f.promotionDecision === "promote").filter((f) => f.scope === "candidate").filter((f) => typeof f.personName === "string" && f.personName.trim().length >= 3).filter((f) => Array.isArray(f.sourceUrls) && f.sourceUrls.some(isObservedHttpSource)).map((f) => f.personName as string));
  let materialized = 0;
  let evidenceRows = 0;
  for (const name of admitted) {
    const finding = input.findings.find((candidate) => candidate.personName?.trim().toLowerCase() === name.toLowerCase() && candidate.promotionDecision === "promote" && candidate.scope === "candidate" && Array.isArray(candidate.sourceUrls) && candidate.sourceUrls.some(isObservedHttpSource));
    const sourceUrl = finding?.sourceUrls?.find(isObservedHttpSource) ?? null; if (!sourceUrl) continue;
    const caseEvents = await db.select({ id: researchCaseEventsTable.id, eventType: researchCaseEventsTable.eventType, payload: researchCaseEventsTable.payload, createdAt: researchCaseEventsTable.createdAt }).from(researchCaseEventsTable).where(eq(researchCaseEventsTable.caseId, input.discoveryCaseId));
    const normalizedSource = new URL(sourceUrl).href;
    const supported = caseEvents.some((event) => {
      if (event.eventType !== "tool_observation" || typeof event.payload !== "string") return false;
      try {
        const payload = JSON.parse(event.payload) as { execution?: string; observation?: string; observedUrls?: unknown[] };
        const identityTokens = name.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 2);
        const observedIdentity = identityTokens.length > 0 && typeof payload.observation === "string" && identityTokens.every((token) => payload.observation!.toLowerCase().includes(token));
        return payload.execution === "success" && observedIdentity && Array.isArray(payload.observedUrls) && payload.observedUrls.some((url) => { try { return new URL(String(url)).href === normalizedSource; } catch { return false; } });
      } catch { return false; }
    });
    if (!supported) continue;
    const existingRows = await db.select({ id: entitiesTable.id }).from(entitiesTable).where(and(eq(entitiesTable.name, name), inArray(entitiesTable.type, ["HNWI", "Gatekeeper"]))).limit(1);
    const existing = existingRows[0]; let entityId = existing?.id ?? null;
    if (!entityId) { const [created] = await db.insert(entitiesTable).values({ name, type: "HNWI", bayesianScore: 0.05, contactConfidence: 0, contactOutcome: "evidence_only", isHot: false, isStarred: false, isHidden: false, sourceRegistries: JSON.stringify(["canonical-agentic-discovery"]), notes: "Model-selected discovery candidate; target-scoped Investigator research required before contact promotion.", metadata: JSON.stringify({ reviewOnly: true, admission: "investigator-explicit-promotion", sourceUrl, discoveryCaseId: input.discoveryCaseId }) }).returning({ id: entitiesTable.id }); entityId = created?.id ?? null; if (entityId) materialized += 1; }
    if (!entityId) continue;
    const supportingEvent = caseEvents.find((event) => { if (event.eventType !== "tool_observation" || typeof event.payload !== "string") return false; try { const payload = JSON.parse(event.payload) as { execution?: string; observation?: string; observedUrls?: unknown[] }; const identityTokens = name.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 2); const observedIdentity = identityTokens.length > 0 && typeof payload.observation === "string" && identityTokens.every((token) => payload.observation!.toLowerCase().includes(token)); return payload.execution === "success" && observedIdentity && Array.isArray(payload.observedUrls) && payload.observedUrls.some((url) => { try { return new URL(String(url)).href === normalizedSource; } catch { return false; } }); } catch { return false; } });
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
  const startedAt = Date.now(); const depth = resolveResearchDepth({ explicit: opts.researchDepth }); const discoveryOnly = opts.discoveryOnly === true; const lockKey = opts.lockKey ?? "atlas-run"; const phaseSummary: Record<string, string> = {};
  const discoveryObjective = opts.discoveryObjective?.trim() || "Discover real named people for subsequent target-scoped public-contact research. Choose every search, page visit, registry/domain/OSINT action and stopping point yourself. Emit a person only when you can attribute the observed source to that person; use promotionDecision=promote only for an exact named-person admission candidate. Never invent a person, contact, or URL.";
  await assertAtlasJobActive(atlasJobId);
  await updateJob(atlasJobId, { status: "running", progress: 0, total: discoveryOnly ? 1 : 4, atlasPhase: 0, atlasPhaseTotal: discoveryOnly ? 1 : 4, message: "Gemini Boss + Gemini Right-hand opening model-owned discovery…" });
  try {
    await assertAtlasJobActive(atlasJobId);
    const rightHandRaw = await import("./gemini-right-hand-reasoning").then(({ runGeminiRightHandFreeJson }) => runGeminiRightHandFreeJson(`Review this discovery mission before Gemini assigns its Investigator. Objective: ${discoveryObjective}. Return concise research priorities only. Do not browse, do not choose contacts, and do not invent people. Return JSON with decision, reason, focusLanes, confidence.`, "You are the Gemini Right-hand. Advise the Boss only. Never act as Investigator and never browse. Reply with ONE JSON object.")).catch((error) => ({ status: "unavailable" as const, model: "none", raw: null, error: error instanceof Error ? error.message : "Right-hand unavailable" }));
    await assertAtlasJobActive(atlasJobId);
    let rightHand: { status: "completed" | "unavailable"; model: string; decision: string | null; reason: string | null; focusLanes: string[]; confidence: number | null; error: string | null } = { status: rightHandRaw.status === "completed" ? "completed" : "unavailable", model: rightHandRaw.model, decision: null, reason: null, focusLanes: [], confidence: null, error: rightHandRaw.error ?? null };
    if (rightHandRaw.status === "completed" && rightHandRaw.raw) { try { const parsed = JSON.parse(rightHandRaw.raw) as Record<string, unknown>; rightHand = { status: "completed", model: rightHandRaw.model, decision: typeof parsed.decision === "string" ? parsed.decision : null, reason: typeof parsed.reason === "string" ? parsed.reason : null, focusLanes: Array.isArray(parsed.focusLanes) ? parsed.focusLanes.filter((v): v is string => typeof v === "string") : [], confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : null, error: null }; } catch { rightHand.error = "Right-hand returned invalid JSON."; } }
    await assertAtlasJobActive(atlasJobId);
    if (rightHandRaw.status !== "completed") throw new Error(`Gemini Right-hand unavailable; failing closed: ${rightHandRaw.error ?? "unknown oversight failure"}`);
    if (rightHand.error) throw new Error(`Gemini Right-hand returned invalid oversight: ${rightHand.error}`);
    const boss = await runGeminiBossDiscovery({ objective: discoveryObjective, motivation: opts.discoveryMotivation || "Find real people for deep target-scoped investigation.", geography: opts.discoveryGeography || "Public web; geography selected by the research objective", exclusions: opts.discoveryExclusions ?? ["Do not browse as Boss.", "Do not prescribe a fixed tool or search sequence.", "Do not invent people, contacts, relationships, or URLs.", "Select only groq or mistral as Investigator."], rightHandAdvice: rightHand, startingLane: "model-selected discovery" });
    await assertAtlasJobActive(atlasJobId);
    if (!boss.investigatorLlm) { phaseSummary.assignment = "No usable Gemini-selected Investigator; fail closed."; await updateJob(atlasJobId, { status: "failed", progress: 1, atlasPhase: 1, outcome: "incomplete", message: "Gemini Boss did not select a Groq/Mistral Investigator; no fallback was attempted.", result: JSON.stringify({ rightHand, boss }), finishedAt: new Date().toISOString() }); await clearActiveJobIfOwned(lockKey, atlasJobId); return { phase: 1, ingested: 0, enriched: 0, contactsFound: 0, hotLeads: 0, durationMs: Date.now() - startedAt, phaseSummary }; }
    const discoveryCaseId = opts.discoveryCaseId ?? await createAtlasDiscoveryCase({ atlasJobId, objective: discoveryObjective, investigatorLlm: boss.investigatorLlm });
    await assertAtlasJobActive(atlasJobId);
    await db.insert(researchCaseEventsTable).values({ caseId: discoveryCaseId, iteration: 0, actorRole: "head_investigator", eventType: "assignment", status: "recorded", summary: "Canonical discovery Investigator assigned after Gemini/Gemini coordination.", correlationKey: `${atlasJobId}:discovery-assignment`, payload: JSON.stringify({ jobId: atlasJobId, investigatorLlm: boss.investigatorLlm, mode: "discovery", controlPlane: "canonical-atlas-discovery" }) });
    await updateJob(atlasJobId, { progress: 1, atlasPhase: 1, message: `${boss.investigatorLlm.toUpperCase()} Investigator running free-ReAct discovery…`, result: JSON.stringify({ rightHand, boss: { status: boss.status, model: boss.model, investigatorLlm: boss.investigatorLlm }, discoveryCaseId }) });
    await assertAtlasJobActive(atlasJobId);
    let discovery = await runBureauAgenticWebPass({ mode: "discovery", targetName: "", objective: discoveryObjective, investigatorLlm: boss.investigatorLlm, caseId: discoveryCaseId, jobId: atlasJobId, maxIterations: depth.agenticMaxIterations, hardTimeoutMs: opts.targetTimeoutMs ?? depth.agenticHardTimeoutMs });
    await assertAtlasJobActive(atlasJobId);
    let admission = await materializeAtlasAdmissions({ findings: discovery.findings, atlasJobId, discoveryCaseId });
    let admitted = admission.names; let materialized = admission.materialized; let evidenceRows = admission.evidenceRows; let researched = 0; let contactsFound = 0; let controlTurns = 0; let discoveryRuns = 1; let priorAction: AtlasControlAction | null = null; let priorCandidate: string | null = null;
    let controlBudgetExhausted = false; let trajectoryBudgetExhausted = false;
    const researchedNames = new Set<string>();
    phaseSummary.assignment = `${boss.investigatorLlm} selected by Gemini; discovery completed=${discovery.status}; durableCase=${discoveryCaseId}.`; phaseSummary.discovery = `admitted=${admitted.length}; materialized=${materialized}; evidenceRows=${evidenceRows}; searches=${discovery.searches}; visits=${discovery.visits}; trajectory=${discovery.trajectory.length}; structuredTurns=${discovery.trajectoryRecords?.length ?? 0}`;
    if (discoveryOnly) {
      await assertAtlasJobActive(atlasJobId);
      const [current] = await db.select({ caseFile: researchCasesTable.caseFile, iteration: researchCasesTable.iteration }).from(researchCasesTable).where(eq(researchCasesTable.id, discoveryCaseId)).limit(1);
      let caseFile: Record<string, any> = {}; try { const parsed = current?.caseFile ? JSON.parse(current.caseFile) : {}; if (parsed && typeof parsed === "object") caseFile = parsed; } catch { caseFile = {}; }
      const candidates = admitted.map((name) => { const finding = (discovery.findings ?? []).find((item) => item.personName?.trim().toLowerCase() === name.toLowerCase() && item.promotionDecision === "promote" && item.scope === "candidate"); return { name, type: "review_candidate", relevance: "Explicit Investigator discovery admission candidate", reachability: "Requires target-scoped Investigator research", sourceUrls: finding?.sourceUrls ?? [], contactEvidence: [], state: "review_only", admittedEntityId: null }; });
      await assertAtlasJobActive(atlasJobId);
      await db.update(researchCasesTable).set({ caseFile: JSON.stringify({ ...caseFile, discoveredCandidates: [...(Array.isArray(caseFile.discoveredCandidates) ? caseFile.discoveredCandidates : []), ...candidates], currentProgress: { ...(caseFile.currentProgress ?? {}), lastDiscoveryAt: new Date().toISOString(), lastReviewedBy: "gemini-boss" } }), currentAction: admitted.length ? "target-scoped-investigator-research" : "review", iteration: Number(current?.iteration ?? 0) + 1, updatedAt: new Date() }).where(eq(researchCasesTable.id, discoveryCaseId));
      await db.insert(researchCaseEventsTable).values({ caseId: discoveryCaseId, iteration: Number(current?.iteration ?? 0) + 1, actorRole: "specialist", eventType: "observation", status: "recorded", summary: `Canonical discovery admission: ${admitted.length} review candidate(s).`, correlationKey: `${atlasJobId}:discovery-admission:${Number(current?.iteration ?? 0) + 1}`, payload: JSON.stringify({ jobId: atlasJobId, investigatorLlm: boss.investigatorLlm, admitted, sourceUrls: (discovery.findings ?? []).flatMap((finding) => finding.sourceUrls) }) });
      await assertAtlasJobActive(atlasJobId);
      await updateJob(atlasJobId, { status: "done", progress: 1, total: 1, atlasPhase: 1, atlasPhaseTotal: 1, outcome: "complete", message: `Canonical discovery complete: ${admitted.length} exact named candidate(s) admitted for review.`, result: JSON.stringify({ rightHand, boss, discovery: { status: discovery.status, findings: discovery.findings.length, searches: discovery.searches, visits: discovery.visits, caseId: discoveryCaseId, trajectoryEntries: discovery.trajectory.length, trajectoryRecords: discovery.trajectoryRecords ?? [] } }), finishedAt: new Date().toISOString() });
      await clearActiveJobIfOwned(lockKey, atlasJobId);
      return { phase: 1, ingested: 0, enriched: materialized, contactsFound: 0, hotLeads: admitted.length, durationMs: Date.now() - startedAt, phaseSummary };
    }
    while (true) {
      await assertAtlasJobActive(atlasJobId);
      if (controlTurns >= MAX_ATLAS_CONTROL_TURNS) {
        controlBudgetExhausted = true;
        phaseSummary.control_budget = `safety ceiling reached at ${MAX_ATLAS_CONTROL_TURNS} control turns; no further model transition was executed`;
        break;
      }
      if ((discovery.trajectoryRecords?.length ?? 0) >= MAX_ATLAS_TRAJECTORY_RECORDS) {
        trajectoryBudgetExhausted = true;
        phaseSummary.trajectory_budget = "Atlas trajectory safety ceiling reached";
        break;
      }
      controlTurns += 1;
      const decision = await decideAtlasNextAction({ objective: discoveryObjective, admittedCandidates: admitted.map((name) => { const finding = discovery.findings.find((candidate) => candidate.personName?.trim().toLowerCase() === name.toLowerCase()); return { name, role: finding?.role ?? null, sourceUrls: finding?.sourceUrls?.filter(isObservedHttpSource) ?? [] }; }), discoveryStatus: discovery.status, discoveryTrajectory: discovery.trajectory, discoveryTrajectoryRecords: discovery.trajectoryRecords, discoveryFindings: discovery.findings.map((finding) => ({ personName: finding.personName, role: finding.role, scope: finding.scope, promotionDecision: finding.promotionDecision, sourceUrls: finding.sourceUrls, note: finding.note })), priorAction, priorCandidate, caseId: discoveryCaseId, controlTurn: controlTurns });
      await assertAtlasJobActive(atlasJobId);
      phaseSummary[`control_${controlTurns}`] = `${decision.action}${decision.candidateName ? `:${decision.candidateName}` : ""}${decision.direction ? ` — ${decision.direction}` : ""}`;
      if (decision.status !== "completed" || decision.action === "stop") break;
      priorAction = decision.action; priorCandidate = decision.candidateName;
      if (decision.action === "research_candidate" || decision.action === "revisit_candidate") {
        await assertAtlasJobActive(atlasJobId);
        const name = decision.candidateName; if (!name) continue;
        const [entity] = await db.select({ id: entitiesTable.id, name: entitiesTable.name }).from(entitiesTable).where(and(eq(entitiesTable.name, name), inArray(entitiesTable.type, ["HNWI", "Gatekeeper"]))).limit(1);
        if (!entity) continue; if (decision.action === "research_candidate" && researchedNames.has(name.toLowerCase())) continue;
        const before = await db.select({ email: entitiesTable.email, phone: entitiesTable.phone, linkedinUrl: entitiesTable.linkedinUrl, twitterHandle: entitiesTable.twitterHandle, instagramHandle: entitiesTable.instagramHandle, telegramHandle: entitiesTable.telegramHandle, personalWebsite: entitiesTable.personalWebsite }).from(entitiesTable).where(eq(entitiesTable.id, entity.id)).limit(1); const beforeCard = before[0] ?? null;
        await assertAtlasJobActive(atlasJobId);
        await runCanonicalSingleTargetInvestigation(atlasJobId, entity.id, { researchDepth: opts.researchDepth, targetTimeoutMs: opts.targetTimeoutMs });
        await assertAtlasJobActive(atlasJobId);
        researched += 1; researchedNames.add(name.toLowerCase());
        const after = await db.select({ email: entitiesTable.email, phone: entitiesTable.phone, linkedinUrl: entitiesTable.linkedinUrl, twitterHandle: entitiesTable.twitterHandle, instagramHandle: entitiesTable.instagramHandle, telegramHandle: entitiesTable.telegramHandle, personalWebsite: entitiesTable.personalWebsite }).from(entitiesTable).where(eq(entitiesTable.id, entity.id)).limit(1); const afterCard = after[0] ?? null;
        if (beforeCard && afterCard) { const cardFields: Array<keyof typeof beforeCard> = ["email", "phone", "linkedinUrl", "twitterHandle", "instagramHandle", "telegramHandle", "personalWebsite"]; contactsFound += cardFields.filter((field) => beforeCard[field] !== afterCard[field] && afterCard[field]).length; }
        continue;
      }
      if (decision.action === "continue_discovery" || decision.action === "pivot_discovery") {
        await assertAtlasJobActive(atlasJobId);
        const directedObjective = `${discoveryObjective}\n\nBOSS-DIRECTED RESEARCH QUESTION / PIVOT:\n${decision.direction || "Reassess the open evidence and choose the highest-information next action yourself."}`;
        const remainingTrajectoryBudget = MAX_ATLAS_TRAJECTORY_RECORDS - (discovery.trajectoryRecords?.length ?? 0);
        if (remainingTrajectoryBudget <= 0) {
          trajectoryBudgetExhausted = true;
          phaseSummary.trajectory_budget = "Atlas trajectory safety ceiling reached";
          break;
        }
        const nextDiscovery = await runBureauAgenticWebPass({ mode: "discovery", targetName: "", objective: directedObjective, investigatorLlm: boss.investigatorLlm, caseId: discoveryCaseId, jobId: atlasJobId, maxIterations: Math.min(depth.agenticMaxIterations, remainingTrajectoryBudget), hardTimeoutMs: opts.targetTimeoutMs ?? depth.agenticHardTimeoutMs });
        await assertAtlasJobActive(atlasJobId);
        discoveryRuns += 1;
        discovery = { ...nextDiscovery, searches: discovery.searches + nextDiscovery.searches, visits: discovery.visits + nextDiscovery.visits, iterations: discovery.iterations + nextDiscovery.iterations, findings: [...(discovery.findings ?? []), ...(nextDiscovery.findings ?? [])], modelFindings: [...(discovery.modelFindings ?? []), ...(nextDiscovery.modelFindings ?? [])], trajectory: [...discovery.trajectory, ...nextDiscovery.trajectory], trajectoryRecords: [...(discovery.trajectoryRecords ?? []), ...(nextDiscovery.trajectoryRecords ?? [])] };
        admission = await materializeAtlasAdmissions({ findings: discovery.findings, atlasJobId, discoveryCaseId }); admitted = admission.names; materialized += admission.materialized; evidenceRows += admission.evidenceRows;
      }
    }
    await assertAtlasJobActive(atlasJobId);
    phaseSummary.discovery = `runs=${discoveryRuns}; admitted=${admitted.length}; materialized=${materialized}; evidenceRows=${evidenceRows}; searches=${discovery.searches}; visits=${discovery.visits}; trajectory=${discovery.trajectory.length}; structuredTurns=${discovery.trajectoryRecords?.length ?? 0}`;
    phaseSummary.research = `researched=${researched}; explicitCardPromotions=${contactsFound}; controlTurns=${controlTurns}; finalAction=${priorAction ?? "none"}`;
    if (controlBudgetExhausted || trajectoryBudgetExhausted) {
      phaseSummary.terminal = trajectoryBudgetExhausted ? "incomplete: Atlas trajectory safety ceiling reached" : "incomplete: Atlas control-turn safety ceiling reached";
    }
    await assertAtlasJobActive(atlasJobId);
    await updateJob(atlasJobId, { status: controlBudgetExhausted || trajectoryBudgetExhausted ? "failed" : "done", progress: 4, total: 4, atlasPhase: 4, atlasPhaseTotal: 4, outcome: controlBudgetExhausted || trajectoryBudgetExhausted ? "incomplete" : "complete", message: controlBudgetExhausted || trajectoryBudgetExhausted ? `Canonical Investigator control loop stopped at a safety ceiling; further model transitions were not executed.` : `Canonical Investigator control loop complete: ${researched} target investigation(s); AI chose the transition trajectory.`, result: JSON.stringify({ rightHand, boss: { status: boss.status, model: boss.model, investigatorLlm: boss.investigatorLlm }, discovery: { status: discovery.status, findings: discovery.findings.length, searches: discovery.searches, visits: discovery.visits, caseId: discoveryCaseId, trajectoryEntries: discovery.trajectory.length, trajectoryRecords: discovery.trajectoryRecords ?? [], runs: discoveryRuns }, control: { turns: controlTurns, finalAction: priorAction, finalCandidate: priorCandidate, budgetExhausted: controlBudgetExhausted || trajectoryBudgetExhausted, controlBudgetExhausted, trajectoryBudgetExhausted }, phaseSummary }), finishedAt: new Date().toISOString() });
    await clearActiveJobIfOwned(lockKey, atlasJobId); return { phase: 4, ingested: 0, enriched: materialized, contactsFound, hotLeads: admitted.length, durationMs: Date.now() - startedAt, phaseSummary };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Canonical Atlas discovery failed.";
    const cancelled = message.includes("Canonical Atlas job cancelled;");
    await updateJob(atlasJobId, { status: cancelled ? "cancelled" : "failed", outcome: "incomplete", message, finishedAt: new Date().toISOString() });
    await clearActiveJobIfOwned(lockKey, atlasJobId);
    throw error;
  }
}
