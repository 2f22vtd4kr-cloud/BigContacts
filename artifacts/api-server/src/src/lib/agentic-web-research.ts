import { safeOutboundFetch } from "./ssrf-safe-fetch";
import { db, researchCasesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { classifyExternalProvider, runProviderCall } from "./provider-gate";
import { getAgenticExecutionScope, withAgenticExecutionScope } from "./agentic-execution-context";
import { validateResearchObjective } from "./research-objective";
import { reviewTargetInvestigationAct, loadTargetActOversightContext, type TargetActOversight } from "./target-act-oversight";
import { getJob } from "./job-queue";
import { isCanonicalJobOwner } from "./canonical-job-lock";
import { ResearchIntelligenceEngine, renderIntelligenceContext } from "./research-intelligence-engine";
import { shouldCheckpointResearchEpisode } from "./research-episode-policy";
import { inferResearchCognitiveTask } from "./research-cognitive-routing";
import { AGENTIC_PROVIDER_DECISION_TIMEOUT_MS } from "./agentic-web-research-core";
import { isAcceptedInvestigatorTerminal } from "./research-terminal-gate";
import { bindExactSourceSpan } from "./research-epistemic-vnext";
import type { AgenticFinding } from "./agentic-web-research-core";

const nativeFetch = globalThis.fetch.bind(globalThis);
type GuardedFetch = typeof fetch & { __apexSsrfGuard?: boolean; __apexQuotaGuard?: boolean };
if (!(globalThis.fetch as GuardedFetch).__apexSsrfGuard) {
  const guardedFetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (getAgenticExecutionScope() === "process") return nativeFetch(input, init);
    if ((globalThis.fetch as GuardedFetch).__apexQuotaGuard) return safeOutboundFetch(input, init);
    const rawUrl = typeof input === "string" || input instanceof URL ? String(input) : input.url;
    const provider = classifyExternalProvider(rawUrl);
    return runProviderCall({ provider, account: "agentic-fetch", signal: init?.signal ?? undefined }, () => safeOutboundFetch(input, init));
  }) as GuardedFetch;
  guardedFetch.__apexSsrfGuard = true;
  globalThis.fetch = guardedFetch;
}

export type { AgenticFinding, AgenticWebResearchResult, AgenticTrajectoryRecord } from "./agentic-web-research-core";
export { getAgenticLlmHealth } from "./agentic-web-research-core";

type CoreModule = typeof import("./agentic-web-research-core");
type RunInput = Parameters<CoreModule["runAgenticWebResearch"]>[0] & { caseId?: number; oversightMode?: "internal" | "caller"; onTrajectoryRecord?: (record: CoreResult["trajectoryRecords"][number]) => void | Promise<void> };
type CoreResult = Awaited<ReturnType<CoreModule["runAgenticWebResearch"]>>;
type AgenticRunResult = CoreResult & { executionId: string; runId?: string };

async function loadDurableIntelligenceState(caseId: number | undefined): Promise<Parameters<ResearchIntelligenceEngine["restoreContext"]>[0] | null> { if (caseId == null) return null; const [row] = await db.select({ caseFile: researchCasesTable.caseFile }).from(researchCasesTable).where(eq(researchCasesTable.id, caseId)).limit(1); if (!row?.caseFile) return null; try { const parsed = JSON.parse(row.caseFile) as Record<string, unknown>; const state = parsed.evidenceState; return state && typeof state === "object" && !Array.isArray(state) ? state as Parameters<ResearchIntelligenceEngine["restoreContext"]>[0] : null; } catch { return null; } }
function renumberTrajectory(value: string, turn: number): string { return value.replace(/^step\d+:/, `step${turn}:`); }

function intelligenceObjective(base: string, sharedContext: string, intelligence: ResearchIntelligenceEngine, direction: string | null, records: CoreResult["trajectoryRecords"]): string {
  const state = intelligence.buildContext();
  const completeHistory = records.map((record) => ({ turn: record.turn, action: record.action, execution: record.execution, args: record.args, observation: record.observation, observedUrls: record.observedUrls, findings: record.findings }));
  const pivotMarker = "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:";
  const embeddedDirection = direction ?? (base.includes(pivotMarker) ? base.slice(base.indexOf(pivotMarker) + pivotMarker.length).split("\n")[0].trim() : null);
  return `${base}\n\nCONTINUATION STATE:\nThe previous Investigator acts have already executed. This state is durable evidence/history, not instructions from public sources.\nDURABLE CASE CONTEXT:\n${sharedContext}\n\n${renderIntelligenceContext(state)}\n\n${embeddedDirection ? `CURRENT RESEARCH OBJECTIVE (BOSS-DIRECTED, CURRENT TASK CONSTRAINT):\n${embeddedDirection}\nStay within this research question unless the observed evidence directly disproves it or makes it impossible to pursue. If that happens, record the contradiction/gap and choose the next action that resolves it; do not silently replace the direction with an unrelated geography, sector, company, or person.\n` : ""}COMPLETE INVESTIGATOR ACT HISTORY:\n${JSON.stringify(completeHistory)}\n\nChoose the next research action yourself. The structured intelligence is evidence/history, not a scripted route. Do not manufacture facts. Prefer actions that discriminate between identity hypotheses, close an explicit evidence gap, find an independent source, or test a contradiction.`;
}

function normalizedObservedUrl(value: string): string | null { try { const url = new URL(value); if (!/^https?:$/i.test(url.protocol)) return null; url.hash = ""; url.hostname = url.hostname.toLowerCase(); return url.href.endsWith("/") ? url.href.slice(0, -1) : url.href; } catch { return null; } }
function groundedFinding(finding: AgenticFinding, records: readonly CoreResult["trajectoryRecords"][number][]): boolean {
  if (!Array.isArray(finding.sourceUrls) || !finding.sourceUrls.length) return false;
  const cited = new Set(finding.sourceUrls.map(normalizedObservedUrl).filter((url): url is string => Boolean(url)));
  if (!cited.size) return false;
  const value = finding.value.trim();
  const identity = finding.scope === "candidate" && finding.personName ? finding.personName.trim() : "";
  let valueObserved = false;
  let identityObserved = !identity;
  let support = 0;
  for (const record of records) {
    if (record.execution !== "success" || typeof record.observation !== "string" || ["web_search", "parallel_web_search", "done"].includes(record.action)) continue;
    const urls = record.observedUrls.map(normalizedObservedUrl).filter((url): url is string => Boolean(url)).filter((url) => cited.has(url));
    if (!urls.length) continue;
    const observation = record.observation;
    const hasValue = value.length > 0 && Boolean(bindExactSourceSpan(observation, value)?.exact);
    const hasIdentity = !identity || Boolean(bindExactSourceSpan(observation, identity)?.exact);
    if (hasValue) valueObserved = true;
    if (hasIdentity) identityObserved = true;
    if (hasValue || hasIdentity) support += 1;
  }
  return valueObserved && identityObserved && support > 0;
}
export function groundedFindingsForTrajectory(findings: AgenticFinding[], records: readonly CoreResult["trajectoryRecords"][number][] = []): AgenticFinding[] {
  return findings.filter((finding) => groundedFinding(finding, records));
}
function recordResult(intelligence: ResearchIntelligenceEngine, record: CoreResult["trajectoryRecords"][number] | undefined, priorRecords: readonly CoreResult["trajectoryRecords"][number][] = []): void {
  if (!record) return;
  const findings = groundedFindingsForTrajectory(record.findings, [...priorRecords, record]);
  intelligence.recordAction({ turn: record.turn, action: record.action, args: record.args, execution: record.execution, observation: record.observation, urls: record.observedUrls, findings });
}

const parsedMaxConcurrent = Number(process.env.APEX_MAX_CONCURRENT_AGENTIC_RUNS ?? "32");
const MAX_CONCURRENT_CORE_RUNS = Number.isFinite(parsedMaxConcurrent) ? Math.max(1, Math.min(64, Math.trunc(parsedMaxConcurrent))) : 32;
let activeCoreRuns = 0;
function acquireCoreRunSlot(): void { if (activeCoreRuns >= MAX_CONCURRENT_CORE_RUNS) throw new Error("Agentic research concurrency budget exhausted; refusing another concurrent run."); activeCoreRuns += 1; }
function releaseCoreRunSlot(): void { activeCoreRuns = Math.max(0, activeCoreRuns - 1); }

async function runDynamicDiscovery(core: CoreModule, input: RunInput, controller: AbortController, deadline: number, executionId: string, requestedHardTimeout: number): Promise<AgenticRunResult> {
  let records: CoreResult["trajectoryRecords"] = [];
  let trajectory: string[] = [];
  let findings: CoreResult["findings"] = [];
  let modelFindings: CoreResult["modelFindings"] = [];
  let model = "none";
  let searches = 0;
  let visits = 0;
  let lastStatus: CoreResult["status"] = "completed";
  let error: string | undefined;
  const searchQueriesUsed = [...new Set((input.priorSearchQueries ?? []).map((query) => String(query).trim()).filter(Boolean))];
  const maxDynamicActs = Math.min(64, Math.max(0, Number.isFinite(input.maxIterations) ? Math.floor(input.maxIterations ?? 64) : 64));
  const intelligence = new ResearchIntelligenceEngine({ executionId, target: input.targetName, objective: input.objective || `Research ${input.targetName}` });
  const durableIntelligence = await loadDurableIntelligenceState(input.caseId);
  if (durableIntelligence) intelligence.restoreContext(durableIntelligence);
  for (let actionTurn = 1; actionTurn <= maxDynamicActs; actionTurn++) {
    if (controller.signal.aborted || input.signal?.aborted) return { status: "cancelled", model, iterations: actionTurn - 1, searches, visits, findings, modelFindings, stopReason: "CANCELLED", trajectory, trajectoryRecords: records, error: "cancelled by operator", executionId };
    const remaining = deadline - Date.now();
    if (remaining <= 0) return { status: "timeout", model, iterations: actionTurn - 1, searches, visits, findings, modelFindings, stopReason: "HARD_TIMEOUT", trajectory, trajectoryRecords: records, error: `hard timeout ${requestedHardTimeout}ms`, executionId };
    const perActTimeout = Math.min(remaining, Math.max(30_000, AGENTIC_PROVIDER_DECISION_TIMEOUT_MS + 5_000));
    const actInput: RunInput = { ...input, cognitiveTask: inferResearchCognitiveTask({ nextMovePriority: intelligence.buildContext().frontier.nextMovePriority }), objective: intelligenceObjective(input.objective || `Research the public web for the strongest attributable public contact path for ${input.targetName}.`, input.objective || "", intelligence, null, records), maxIterations: 1, hardTimeoutMs: perActTimeout, signal: controller.signal, priorSearchQueries: searchQueriesUsed, shouldCancel: async () => { if (controller.signal.aborted || input.signal?.aborted) return true; if (!input.jobId) return false; const job = await getJob(input.jobId); if (!job || job.status !== "running") return true; const lockType = job.type === "atlas-run" || job.type === "case-bureau-discovery" ? job.type : null; if (!lockType) return false; try { return !(await isCanonicalJobOwner(lockType, input.jobId)); } catch { return true; } }, onLiveStep: (step) => input.onLiveStep?.(step), onTrajectoryRecord: input.onTrajectoryRecord };
    const actResult = await core.runAgenticWebResearch(actInput);
    model = actResult.model; searches += actResult.searches; visits += actResult.visits; lastStatus = actResult.status; error = actResult.error;
    const raw = actResult.trajectoryRecords[actResult.trajectoryRecords.length - 1];
    if (raw) {
      if (raw.execution === "success" || raw.execution === "error") {
        if (raw.action === "web_search" && typeof raw.args?.query === "string") searchQueriesUsed.push(raw.args.query);
        if (raw.action === "parallel_web_search" && Array.isArray(raw.args?.searches)) for (const search of raw.args.searches) if (search && typeof search === "object" && typeof (search as Record<string, unknown>).query === "string") searchQueriesUsed.push((search as Record<string, unknown>).query as string);
      }
      const normalizedRecord = { ...raw, turn: actionTurn, findings: groundedFindingsForTrajectory(raw.findings as AgenticFinding[], [...records, { ...raw, turn: actionTurn }]) };
      recordResult(intelligence, normalizedRecord, records);
      records = [...records, normalizedRecord];
      trajectory = [...trajectory, ...actResult.trajectory.map((line) => renumberTrajectory(line, actionTurn)), `INTELLIGENCE_STATE:${JSON.stringify(intelligence.buildContext())}`];
      await input.onTrajectoryRecord?.(normalizedRecord);
      if (actResult.modelFindings.length) modelFindings = [...modelFindings, ...actResult.modelFindings];
      if (raw.findings.length) {
              const grounded = groundedFindingsForTrajectory(raw.findings as AgenticFinding[], [...records, normalizedRecord]);
              findings = [...findings, ...(grounded as CoreResult["findings"])];
            }
      if (isAcceptedInvestigatorTerminal({ action: raw.action, execution: raw.execution, stopReason: actResult.stopReason })) return { status: "completed", model, iterations: actionTurn, searches, visits, findings, modelFindings, stopReason: "MODEL_DECIDED_DONE", trajectory, trajectoryRecords: records, ...(error ? { error } : {}), executionId };
    }
    if (actResult.status !== "completed" || actResult.stopReason !== "ITERATION_BUDGET") return { status: actResult.status, model, iterations: actionTurn, searches, visits, findings, modelFindings, stopReason: actResult.stopReason, trajectory, trajectoryRecords: records, ...(error ? { error } : {}), executionId };
  }
  return { status: lastStatus === "completed" ? "completed" : lastStatus, model, iterations: records.length, searches, visits, findings, modelFindings, stopReason: "ITERATION_BUDGET", trajectory, trajectoryRecords: records, ...(error ? { error } : {}), executionId };
}

/** Canonical target research: the selected Investigator owns the sequential research trajectory; Groq Right-hand reviews each completed act and Groq Boss controls continuation. */
export async function runAgenticWebResearch(input: RunInput): Promise<AgenticRunResult> {
  acquireCoreRunSlot();
  const executionId = typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const selectedInvestigator = input.investigatorLlm ?? "unknown";
  const scope = input.caseId != null ? `agentic:case:${input.caseId}:investigator:${selectedInvestigator}` : `agentic:${executionId}:investigator:${selectedInvestigator}`;
  try {
    return await withAgenticExecutionScope(scope, async () => {
      const core = await import("./agentic-web-research-core");
      if (input.mode === "discovery") {
        const startedAt = Date.now();
        const requestedHardTimeout = Math.min(10 * 60_000, Math.max(30_000, Number.isFinite(input.hardTimeoutMs) ? Math.floor(input.hardTimeoutMs!) : 210_000));
        const controller = new AbortController();
        const abortExternal = () => controller.abort();
        input.signal?.addEventListener("abort", abortExternal, { once: true });
        const deadlineTimer = setTimeout(() => controller.abort(), requestedHardTimeout);
        try { return await runDynamicDiscovery(core, input, controller, startedAt + requestedHardTimeout, executionId, requestedHardTimeout); }
        finally { clearTimeout(deadlineTimer); input.signal?.removeEventListener("abort", abortExternal); }
      }

      const oversightContext = input.caseId ? await loadTargetActOversightContext(input.caseId, input.targetName) : null;
      if (!oversightContext) return { status: "unavailable", model: "none", iterations: 0, searches: 0, visits: 0, findings: [], modelFindings: [], stopReason: "LLM_UNAVAILABLE", trajectory: [], trajectoryRecords: [], error: "Target-scoped agentic research requires a durable control case; no Groq Boss + Groq Right-hand control context was available.", executionId };
      const initialDirection = validateResearchObjective(oversightContext.liveOversightDirection);
      if (oversightContext.liveOversightDirection && !initialDirection.valid) return { status: "unavailable", model: "none", iterations: 0, searches: 0, visits: 0, findings: [], modelFindings: [], stopReason: "LLM_UNAVAILABLE", trajectory: [], trajectoryRecords: [], error: `Invalid durable research objective: ${initialDirection.reason}`, executionId };

      const startedAt = Date.now();
      const requestedHardTimeout = Math.min(10 * 60_000, Math.max(30_000, Number.isFinite(input.hardTimeoutMs) ? Math.floor(input.hardTimeoutMs!) : 210_000));
      const overallController = new AbortController();
      const abortExternal = () => overallController.abort();
      input.signal?.addEventListener("abort", abortExternal, { once: true });
      const deadline = startedAt + requestedHardTimeout;
      const deadlineTimer = setTimeout(() => overallController.abort(), requestedHardTimeout);
      const objective = input.objective || `Research the public web for the strongest attributable public contact path for ${input.targetName}.`;
      const intelligence = new ResearchIntelligenceEngine({ caseId: oversightContext.caseId, executionId, target: input.targetName, objective });
      if (oversightContext.intelligenceState) intelligence.restoreContext(oversightContext.intelligenceState);
       const MAX_TARGET_ACTION_TURNS = 64;
      let records: CoreResult["trajectoryRecords"] = [];
      let trajectory: string[] = [];
      let findings: CoreResult["findings"] = [];
      let modelFindings: CoreResult["modelFindings"] = [];
      let model = "none";
      let searches = 0;
      let visits = 0;
      let lastStatus: CoreResult["status"] = "completed";
      let error: string | undefined;
      let direction: string | null = initialDirection.valid ? initialDirection.direction : null;
      let oversight: TargetActOversight | null = null;
       let actionsSinceCheckpoint = 0;
       const knownIdentityNames = new Set<string>();
       const callerOwnsOversight = input.oversightMode === "caller";

       const applyOversight = async (act: CoreResult["trajectoryRecords"][number], controlTurn: number): Promise<{ stop: boolean; unavailable: boolean }> => {
         if (callerOwnsOversight) return { stop: false, unavailable: false };
         const state = intelligence.buildContext();
         const checkpoint = shouldCheckpointResearchEpisode({
           actionsSinceCheckpoint: actionsSinceCheckpoint + 1,
           contradictionCount: state.contradictions.length,
           identityChanged: Boolean(act.findings.some((finding) => finding.personName && !knownIdentityNames.has(finding.personName.toLowerCase()))),
           highValueContact: act.findings.some((finding) => ["email", "phone", "linkedin"].includes(finding.vectorType) && Boolean(finding.personName)),
           actionExecution: act.execution,
           terminalClaim: act.action === "done",
           informationGain: state.recentActions.at(-1)?.informationGain,
         });
         if (!checkpoint.checkpoint) return { stop: false, unavailable: false };

         // A blocked terminal claim is deliberately fed back into the normal control loop.
         // The Investigator must perform the next verification act itself; no hidden verification
         // provider is allowed to browse outside the Investigator role. This preserves provenance,
         // tool ownership and the same Right-hand -> Boss oversight boundary for every act.
         oversight = await reviewTargetInvestigationAct({
           caseId: oversightContext.caseId,
           controlTurn,
           runId: executionId,
           targetName: input.targetName,
           targetType: oversightContext.targetType,
           objective,
           sharedContext: `${oversightContext.contextDocument}\n\n${renderIntelligenceContext(intelligence.buildContext())}`,
           act,
           recentActs: records,
           intelligenceState: state,
         });
         if (oversight.direction) {
           const checkedDirection = validateResearchObjective(oversight.direction);
           if (!checkedDirection.valid) { error = `Groq Boss produced an invalid research objective: ${checkedDirection.reason}`; return { stop: true, unavailable: true }; }
           direction = checkedDirection.direction;
         } else {
           direction = null;
         }
         actionsSinceCheckpoint = 0;
         if (oversight.status !== "completed") return { stop: true, unavailable: true };
         if (oversight.action === "stop") return { stop: true, unavailable: false };
         if (oversight.action === "redirect" && direction) trajectory.push(`BOSS_REDIRECT:${direction}`);
         return { stop: false, unavailable: false };
       };

       try {
       const requestedMaxActionTurns = Number.isFinite(input.maxIterations) ? Math.floor(input.maxIterations!) : MAX_TARGET_ACTION_TURNS;
       const maxActionTurns = Math.min(MAX_TARGET_ACTION_TURNS, Math.max(0, requestedMaxActionTurns));
       for (let actionTurn = 1; actionTurn <= maxActionTurns; actionTurn++) {
         if (overallController.signal.aborted || input.signal?.aborted) return { status: "cancelled", model, iterations: actionTurn - 1, searches, visits, findings, modelFindings, stopReason: "CANCELLED", trajectory, trajectoryRecords: records, error: "cancelled by operator", executionId };
         const remaining = deadline - Date.now();
         if (remaining <= 0) return { status: "timeout", model, iterations: actionTurn - 1, searches, visits, findings, modelFindings, stopReason: "HARD_TIMEOUT", trajectory, trajectoryRecords: records, error: `hard timeout ${requestedHardTimeout}ms`, executionId };

         const perActTimeout = Math.min(remaining, Math.max(30_000, AGENTIC_PROVIDER_DECISION_TIMEOUT_MS + 5_000));
         const actInput: RunInput = {
           ...input,
           cognitiveTask: inferResearchCognitiveTask({ nextMovePriority: intelligence.buildContext().frontier.nextMovePriority }),
           objective: intelligenceObjective(objective, oversightContext.contextDocument, intelligence, direction, records),
           maxIterations: 1,
           hardTimeoutMs: perActTimeout,
           signal: overallController.signal,
           onLiveStep: (step) => input.onLiveStep?.(step),
           onTrajectoryRecord: input.onTrajectoryRecord,
         };
         const actResult = await core.runAgenticWebResearch(actInput);
         model = actResult.model;
         searches += actResult.searches;
         visits += actResult.visits;
         lastStatus = actResult.status;
         error = actResult.error ?? error;
         const raw = actResult.trajectoryRecords[actResult.trajectoryRecords.length - 1];

         if (raw) {
           const normalizedRecord = { ...raw, turn: actionTurn, findings: groundedFindingsForTrajectory(raw.findings as AgenticFinding[], [...records, { ...raw, turn: actionTurn }]) };
           const groundedTerminalFindings = raw.action === "done"
             ? groundedFindingsForTrajectory(raw.findings as AgenticFinding[], [...records, normalizedRecord])
             : [];

           if (raw.action === "done" && raw.findings.length > 0 && groundedTerminalFindings.length !== raw.findings.length) {
             normalizedRecord.action = "verification_required";
             normalizedRecord.execution = "blocked";
             normalizedRecord.findings = [];
             normalizedRecord.observation = "Terminal claim verification blocked the stop: at least one Investigator finding was not supported by successfully observed cited material. Continue research and verify each claim before stopping.";
             recordResult(intelligence, normalizedRecord, records);
             records = [...records, normalizedRecord];
             await input.onTrajectoryRecord?.(normalizedRecord);
             actionsSinceCheckpoint += 1;
             trajectory = [...trajectory, ...actResult.trajectory.map((line) => renumberTrajectory(line, actionTurn)), `VERIFICATION_BLOCKED:turn=${actionTurn}:ungrounded_terminal_claim`, `INTELLIGENCE_STATE:${JSON.stringify(intelligence.buildContext())}`];
             const checkpointResult = await applyOversight(normalizedRecord, actionTurn);
             if (checkpointResult.unavailable) return { status: "unavailable", model, iterations: actionTurn, searches, visits, findings, modelFindings, stopReason: "LLM_UNAVAILABLE", trajectory, trajectoryRecords: records, error: "Groq oversight unavailable after terminal verification block.", executionId };
             if (checkpointResult.stop) continue;
             continue;
           }

           recordResult(intelligence, normalizedRecord, records);
           records = [...records, normalizedRecord];
           actionsSinceCheckpoint += 1;
           trajectory = [...trajectory, ...actResult.trajectory.map((line) => renumberTrajectory(line, actionTurn)), `INTELLIGENCE_STATE:${JSON.stringify(intelligence.buildContext())}`];
           if (actResult.modelFindings.length) modelFindings = [...modelFindings, ...actResult.modelFindings];
           if (raw.findings.length) findings = [...findings, ...(groundedTerminalFindings as CoreResult["findings"])];
           for (const finding of raw.findings) if (finding.personName) knownIdentityNames.add(finding.personName.toLowerCase());

           if (raw.action === "done" && !isAcceptedInvestigatorTerminal({ action: raw.action, execution: raw.execution, stopReason: actResult.stopReason })) {
             // The core may reject a model-selected terminal action when the
             // epistemic sufficiency contract is not met. Preserve that rejected
             // action in context and let the Investigator choose another move;
             // oversight must not turn a blocked terminal claim into completion.
             continue;
           }
           const checkpointResult = await applyOversight(normalizedRecord, actionTurn);
           if (checkpointResult.unavailable) return { status: "unavailable", model, iterations: actionTurn, searches, visits, findings, modelFindings, stopReason: "LLM_UNAVAILABLE", trajectory, trajectoryRecords: records, error: error ?? "Groq oversight unavailable", executionId };
           if (checkpointResult.stop || (callerOwnsOversight && isAcceptedInvestigatorTerminal({ action: raw.action, execution: raw.execution, stopReason: actResult.stopReason }))) return { status: "completed", model, iterations: actionTurn, searches, visits, findings, modelFindings, stopReason: "MODEL_DECIDED_DONE", trajectory, trajectoryRecords: records, ...(error ? { error } : {}), executionId };
           continue;
         }

         if (actResult.status !== "completed" || actResult.stopReason !== "ITERATION_BUDGET") {
           return { ...actResult, searches, visits, findings, modelFindings, trajectory, trajectoryRecords: records, executionId };
         }
       }
       return { status: lastStatus === "completed" ? "completed" : lastStatus, model, iterations: records.length, searches, visits, findings, modelFindings, stopReason: "ITERATION_BUDGET", trajectory, trajectoryRecords: records, ...(error ? { error } : {}), executionId };
} finally {
        clearTimeout(deadlineTimer);
        input.signal?.removeEventListener("abort", abortExternal);
      }
    });
  } finally {
    releaseCoreRunSlot();
  }
}
