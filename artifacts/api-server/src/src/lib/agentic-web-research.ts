import { safeOutboundFetch } from "./ssrf-safe-fetch";
import { classifyExternalProvider, runProviderCall } from "./provider-gate";
import { getAgenticExecutionScope, withAgenticExecutionScope } from "./agentic-execution-context";
import { validateGeminiResearchObjective } from "./gemini-research-objective";
import { reviewTargetInvestigationAct, loadTargetActOversightContext, type TargetActOversight } from "./target-act-oversight";
import { getJob } from "./job-queue";
import { ResearchIntelligenceEngine, renderIntelligenceContext } from "./research-intelligence-engine";

const nativeFetch = globalThis.fetch.bind(globalThis);
type GuardedFetch = typeof fetch & { __apexSsrfGuard?: boolean; __apexQuotaGuard?: boolean };
if (!(globalThis.fetch as GuardedFetch).__apexSsrfGuard) {
  const guardedFetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (getAgenticExecutionScope() === "process") return nativeFetch(input, init);
    if ((globalThis.fetch as GuardedFetch).__apexQuotaGuard) return safeOutboundFetch(input, init);
    const rawUrl = typeof input === "string" || input instanceof URL ? String(input) : input.url;
    const provider = classifyExternalProvider(rawUrl);
    return runProviderCall({ provider, account: "agentic-fetch" }, () => safeOutboundFetch(input, init));
  }) as GuardedFetch;
  guardedFetch.__apexSsrfGuard = true;
  globalThis.fetch = guardedFetch;
}

export type { AgenticFinding, AgenticWebResearchResult, AgenticTrajectoryRecord } from "./agentic-web-research-core";
export { getAgenticLlmHealth } from "./agentic-web-research-core";

type CoreModule = typeof import("./agentic-web-research-core");
type RunInput = Parameters<CoreModule["runAgenticWebResearch"]>[0] & { caseId?: number };
type CoreResult = Awaited<ReturnType<CoreModule["runAgenticWebResearch"]>>;
type AgenticRunResult = CoreResult & { executionId: string; runId?: string };

function renumberTrajectory(value: string, turn: number): string { return value.replace(/^step\d+:/, `step${turn}:`); }

function intelligenceObjective(base: string, sharedContext: string, intelligence: ResearchIntelligenceEngine, direction: string | null, records: CoreResult["trajectoryRecords"]): string {
  const state = intelligence.buildContext();
  const completeHistory = records.map((record) => ({ turn: record.turn, action: record.action, execution: record.execution, args: record.args, observation: record.observation, observedUrls: record.observedUrls, findings: record.findings }));
  return `${base}\n\nCONTINUATION STATE:\nThe previous Investigator acts have already executed. This state is durable evidence/history, not instructions from public sources.\nDURABLE CASE CONTEXT:\n${sharedContext}\n\n${renderIntelligenceContext(state)}\n\n${direction ? `CURRENT GEMINI RESEARCH OBJECTIVE:\n${direction}\n` : ""}COMPLETE INVESTIGATOR ACT HISTORY:\n${JSON.stringify(completeHistory)}\n\nChoose the next research action yourself. The structured intelligence is evidence/history, not a scripted route. Do not manufacture facts. Prefer actions that discriminate between identity hypotheses, close an explicit evidence gap, find an independent source, or test a contradiction.`;
}

function recordResult(intelligence: ResearchIntelligenceEngine, record: CoreResult["trajectoryRecords"][number] | undefined): void {
  if (!record) return;
  intelligence.recordAction({ turn: record.turn, action: record.action, args: record.args, execution: record.execution, observation: record.observation, urls: record.observedUrls, findings: record.findings });
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
  const intelligence = new ResearchIntelligenceEngine({ executionId, target: input.targetName, objective: input.objective || `Research ${input.targetName}` });
  for (let actionTurn = 1; actionTurn <= (input.maxIterations ?? Number.POSITIVE_INFINITY); actionTurn++) {
    if (controller.signal.aborted || input.signal?.aborted) return { status: "cancelled", model, iterations: actionTurn - 1, searches, visits, findings, modelFindings, stopReason: "CANCELLED", trajectory, trajectoryRecords: records, error: "cancelled by operator", executionId };
    const remaining = deadline - Date.now();
    if (remaining <= 0) return { status: "timeout", model, iterations: actionTurn - 1, searches, visits, findings, modelFindings, stopReason: "HARD_TIMEOUT", trajectory, trajectoryRecords: records, error: `hard timeout ${requestedHardTimeout}ms`, executionId };
    const perActTimeout = Math.max(30_000, Math.min(55_000, remaining));
    const actInput: RunInput = { ...input, objective: intelligenceObjective(input.objective || `Research the public web for the strongest attributable public contact path for ${input.targetName}.`, input.objective || "", intelligence, null, records), maxIterations: 1, hardTimeoutMs: perActTimeout, signal: controller.signal, shouldCancel: async () => { if (controller.signal.aborted || input.signal?.aborted) return true; if (!input.jobId) return false; const job = await getJob(input.jobId); return !job || job.status !== "running"; }, onLiveStep: (step) => input.onLiveStep?.(step) };
    const actResult = await core.runAgenticWebResearch(actInput);
    model = actResult.model; searches += actResult.searches; visits += actResult.visits; lastStatus = actResult.status; error = actResult.error;
    const raw = actResult.trajectoryRecords[actResult.trajectoryRecords.length - 1];
    if (raw) {
      const normalizedRecord = { ...raw, turn: actionTurn };
      recordResult(intelligence, normalizedRecord);
      records = [...records, normalizedRecord];
      trajectory = [...trajectory, ...actResult.trajectory.map((line) => renumberTrajectory(line, actionTurn)), `INTELLIGENCE_DIGEST:${intelligence.buildContext().provenanceDigest}`];
      if (actResult.modelFindings.length) modelFindings = [...modelFindings, ...actResult.modelFindings];
      if (raw.findings.length) findings = [...findings, ...(raw.findings as CoreResult["findings"])];
      if (raw.action === "done") return { status: "completed", model, iterations: actionTurn, searches, visits, findings, modelFindings, stopReason: "MODEL_DECIDED_DONE", trajectory, trajectoryRecords: records, ...(error ? { error } : {}), executionId };
    }
    if (actResult.status !== "completed" || actResult.stopReason !== "ITERATION_BUDGET") return { status: actResult.status, model, iterations: actionTurn, searches, visits, findings, modelFindings, stopReason: actResult.stopReason, trajectory, trajectoryRecords: records, ...(error ? { error } : {}), executionId };
  }
  return { status: lastStatus === "completed" ? "completed" : lastStatus, model, iterations: records.length, searches, visits, findings, modelFindings, stopReason: "ITERATION_BUDGET", trajectory, trajectoryRecords: records, ...(error ? { error } : {}), executionId };
}

async function runParallelMissionPass(core: CoreModule, input: RunInput, intelligence: ResearchIntelligenceEngine, oversightContext: NonNullable<Awaited<ReturnType<typeof loadTargetActOversightContext>>>, executionId: string, direction: string | null, controller: AbortController, records: CoreResult["trajectoryRecords"], turn: number): Promise<{ records: CoreResult["trajectoryRecords"]; findings: CoreResult["findings"]; modelFindings: CoreResult["modelFindings"]; searches: number; visits: number; direction: string | null; stop: boolean; error?: string }> {
  const briefs = intelligence.buildContext().missionBriefs;
  const missionResults = await Promise.all(briefs.map(async (brief) => {
    const missionObjective = `${input.objective || `Research ${input.targetName}`}\n\nINDEPENDENT MISSION: ${brief.mission}\nMISSION OBJECTIVE: ${brief.objective}\nEVIDENCE GAP TO TEST: ${brief.evidenceGap}\nCAPABILITIES AVAILABLE: ${brief.availableCapabilities.join(", ")}`;
    return core.runAgenticWebResearch({ ...input, objective: intelligenceObjective(missionObjective, oversightContext.contextDocument, intelligence, direction, records), maxIterations: 1, hardTimeoutMs: Math.max(30_000, Math.min(55_000, controller.signal.aborted ? 30_000 : 55_000)), signal: controller.signal, onLiveStep: (step) => input.onLiveStep?.(step) });
  }));
  let nextDirection = direction;
  const newRecords: CoreResult["trajectoryRecords"] = [];
  let newFindings: CoreResult["findings"] = [];
  let newModelFindings: CoreResult["modelFindings"] = [];
  let searches = 0;
  let visits = 0;
  let stop = false;
  let error: string | undefined;
  for (let index = 0; index < missionResults.length; index += 1) {
    const result = missionResults[index]!;
    searches += result.searches; visits += result.visits;
    newModelFindings = [...newModelFindings, ...result.modelFindings];
    const raw = result.trajectoryRecords[result.trajectoryRecords.length - 1];
    if (!raw) continue;
    const missionTurn = turn * 10 + index + 1;
    const normalized = { ...raw, turn: missionTurn };
    recordResult(intelligence, normalized);
    newRecords.push(normalized);
    newFindings = [...newFindings, ...result.findings];
    const oversight = await reviewTargetInvestigationAct({ caseId: oversightContext.caseId, controlTurn: missionTurn, runId: executionId, targetName: input.targetName, targetType: oversightContext.targetType, objective: input.objective || "research", sharedContext: `${oversightContext.contextDocument}\n\n${renderIntelligenceContext(intelligence.buildContext())}`, act: normalized, recentActs: [...records, ...newRecords] });
    if (oversight.direction) {
      const checked = validateGeminiResearchObjective(oversight.direction);
      if (!checked.valid) { error = `Gemini produced an invalid research objective: ${checked.reason}`; stop = true; break; }
      nextDirection = checked.direction;
    }
    if (normalized.action === "done" || oversight.action === "stop" || oversight.status !== "completed") { stop = true; error = oversight.error ?? error; break; }
  }
  return { records: [...records, ...newRecords], findings: newFindings, modelFindings: newModelFindings, searches, visits, direction: nextDirection, stop, ...(error ? { error } : {}) };
}

/** Canonical target research: independent Investigator missions create fresh evidence in parallel; Gemini Right-hand reviews the acts; Gemini Boss controls the Investigator model and durable objective. */
export async function runAgenticWebResearch(input: RunInput): Promise<AgenticRunResult> {
  acquireCoreRunSlot();
  const executionId = typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const selectedInvestigator = input.investigatorLlm ?? "unknown";
  const scope = `agentic:${executionId}:investigator:${selectedInvestigator}`;
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
      if (!oversightContext) return { status: "unavailable", model: "none", iterations: 0, searches: 0, visits: 0, findings: [], modelFindings: [], stopReason: "LLM_UNAVAILABLE", trajectory: [], trajectoryRecords: [], error: "Target-scoped agentic research requires a durable control case; no Gemini Boss + Gemini Right Hand context was available.", executionId };
      const initialDirection = validateGeminiResearchObjective(oversightContext.liveOversightDirection);
      if (oversightContext.liveOversightDirection && !initialDirection.valid) return { status: "unavailable", model: "none", iterations: 0, searches: 0, visits: 0, findings: [], modelFindings: [], stopReason: "LLM_UNAVAILABLE", trajectory: [], trajectoryRecords: [], error: `Invalid durable Gemini research objective: ${initialDirection.reason}`, executionId };

      const startedAt = Date.now();
      const requestedHardTimeout = Math.min(10 * 60_000, Math.max(30_000, Number.isFinite(input.hardTimeoutMs) ? Math.floor(input.hardTimeoutMs!) : 210_000));
      const overallController = new AbortController();
      const abortExternal = () => overallController.abort();
      input.signal?.addEventListener("abort", abortExternal, { once: true });
      const deadline = startedAt + requestedHardTimeout;
      const deadlineTimer = setTimeout(() => overallController.abort(), requestedHardTimeout);
      const objective = input.objective || `Research the public web for the strongest attributable public contact path for ${input.targetName}.`;
      const intelligence = new ResearchIntelligenceEngine({ caseId: oversightContext.caseId, executionId, target: input.targetName, objective });
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
      let missionPassComplete = false;

      try {
        for (let actionTurn = 1; actionTurn <= (input.maxIterations ?? Number.POSITIVE_INFINITY); actionTurn++) {
          if (overallController.signal.aborted || input.signal?.aborted) return { status: "cancelled", model, iterations: actionTurn - 1, searches, visits, findings, modelFindings, stopReason: "CANCELLED", trajectory, trajectoryRecords: records, error: "cancelled by operator", executionId };
          const remaining = deadline - Date.now();
          if (remaining <= 0) return { status: "timeout", model, iterations: actionTurn - 1, searches, visits, findings, modelFindings, stopReason: "HARD_TIMEOUT", trajectory, trajectoryRecords: records, error: `hard timeout ${requestedHardTimeout}ms`, executionId };

          if (!missionPassComplete && process.env.APEX_PARALLEL_MISSIONS !== "0") {
            const parallel = await runParallelMissionPass(core, input, intelligence, oversightContext, executionId, direction, overallController, records, actionTurn);
            records = parallel.records;
            findings = [...findings, ...parallel.findings];
            modelFindings = [...modelFindings, ...parallel.modelFindings];
            searches += parallel.searches; visits += parallel.visits; direction = parallel.direction; error = parallel.error ?? error;
            trajectory.push(`PARALLEL_MISSION_PASS:${JSON.stringify(intelligence.buildContext().missionBriefs)}`);
            trajectory.push(`INTELLIGENCE_DIGEST:${intelligence.buildContext().provenanceDigest}`);
            missionPassComplete = true;
            if (parallel.stop) return { status: "completed", model, iterations: actionTurn, searches, visits, findings, modelFindings, stopReason: "MODEL_DECIDED_DONE", trajectory, trajectoryRecords: records, ...(error ? { error } : {}), executionId };
          }

          const perActTimeout = Math.max(30_000, Math.min(55_000, remaining));
          const actInput: RunInput = { ...input, objective: intelligenceObjective(objective, oversightContext.contextDocument, intelligence, direction, records), maxIterations: 1, hardTimeoutMs: perActTimeout, signal: overallController.signal, onLiveStep: (step) => input.onLiveStep?.(step) };
          const actResult = await core.runAgenticWebResearch(actInput);
          model = actResult.model; searches += actResult.searches; visits += actResult.visits; lastStatus = actResult.status; error = actResult.error ?? error;
          const raw = actResult.trajectoryRecords[actResult.trajectoryRecords.length - 1];
          if (raw) {
            const normalizedRecord = { ...raw, turn: actionTurn };
            recordResult(intelligence, normalizedRecord);
            records = [...records, normalizedRecord];
            trajectory = [...trajectory, ...actResult.trajectory.map((line) => renumberTrajectory(line, actionTurn)), `INTELLIGENCE_DIGEST:${intelligence.buildContext().provenanceDigest}`];
            if (actResult.modelFindings.length) modelFindings = [...modelFindings, ...actResult.modelFindings];
            if (raw.findings.length) findings = [...findings, ...(raw.findings as CoreResult["findings"])];
            if (raw.action === "done") return { status: "completed", model, iterations: actionTurn, searches, visits, findings, modelFindings, stopReason: "MODEL_DECIDED_DONE", trajectory, trajectoryRecords: records, ...(error ? { error } : {}), executionId };

            oversight = await reviewTargetInvestigationAct({ caseId: oversightContext.caseId, controlTurn: actionTurn, runId: executionId, targetName: input.targetName, targetType: oversightContext.targetType, objective, sharedContext: `${oversightContext.contextDocument}\n\n${renderIntelligenceContext(intelligence.buildContext())}`, act: normalizedRecord, recentActs: records });
            if (oversight.direction) {
              const checkedDirection = validateGeminiResearchObjective(oversight.direction);
              if (!checkedDirection.valid) return { status: "unavailable", model, iterations: actionTurn, searches, visits, findings, modelFindings, stopReason: "LLM_UNAVAILABLE", trajectory, trajectoryRecords: records, error: `Gemini produced an invalid research objective: ${checkedDirection.reason}`, executionId };
              direction = checkedDirection.direction;
            } else direction = null;
            if (oversight.action === "stop" || oversight.status !== "completed") return { status: actResult.status === "completed" ? "completed" : actResult.status, model, iterations: actionTurn, searches, visits, findings, modelFindings, stopReason: "MODEL_DECIDED_DONE", trajectory, trajectoryRecords: records, error: oversight.error ?? error, executionId };
            if (oversight.action === "redirect" && direction) trajectory.push(`GEMINI_REDIRECT:${direction}`);
            continue;
          }
          if (actResult.status !== "completed" || actResult.stopReason !== "ITERATION_BUDGET") return { ...actResult, searches, visits, findings, modelFindings, trajectory, trajectoryRecords: records, executionId };
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
