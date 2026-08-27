/**
 * DigSpan — Honeycomb / OTel GenAI–style live spans for Apex free-ReAct dig.
 *
 * Design references (observability patterns, not product deps):
 * - Honeycomb Agent Timeline:
 *   https://www.honeycomb.io/platform/agent-timeline
 * - Instrumenting agents for Agent Timeline (OTel GenAI attrs):
 *   https://www.honeycomb.io/blog/instrumenting-ai-agents-agent-timeline-opentelemetry-guide
 * - OpenTelemetry GenAI observability:
 *   https://opentelemetry.io/blog/2026/genai-observability/
 * - OTel GenAI semantic conventions mental model:
 *   invoke_agent → chat (LLM) → execute_tool (tools)
 * - LangSmith traces / trajectory Messages view:
 *   https://docs.langchain.com/langsmith/view-traces
 *   https://docs.langchain.com/langsmith/observability-concepts
 * - AgentPrism (span tree UI concepts):
 *   https://github.com/evilmartians/agent-prism
 * - Sentry AI agent observability:
 *   https://blog.sentry.io/ai-agent-observability-developers-guide-to-agent-monitoring/
 *
 * Contract: in-memory ring buffer only (status plane must stay fast under dig load).
 * Redis optional mirror is intentionally NOT required for /atlas-status.
 */

export type DigSpanType = "llm" | "tool" | "promote" | "error" | "stage";

export type DigSpanStatus = "active" | "ok" | "error";

export interface DigSpan {
  id: string;
  jobId: string;
  targetName?: string;
  spanType: DigSpanType;
  /** Tool or model role name: web_search | visit | groq | maigret | promote_phone | … */
  name: string;
  status: DigSpanStatus;
  startedAt: string;
  endedAt?: string;
  /** Query, URL, or short input (never secrets). */
  inputSummary?: string;
  resultSummary?: string;
  modelId?: string;
  parentSpanId?: string;
  /** OTel-ish operation name for future exporters */
  operationName?: string;
  /** gen_ai.agent.name — investigator | boss | right_hand | enricher */
  agentName?: string;
}

const CAP = 80;
/** jobId → newest-first ring */
const byJob = new Map<string, DigSpan[]>();
/** Global newest-first for idle/latest views */
let globalRing: DigSpan[] = [];

function uid(): string {
  return `sp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function pushRing(list: DigSpan[], span: DigSpan, cap: number): DigSpan[] {
  const next = [span, ...list.filter((s) => s.id !== span.id)];
  return next.slice(0, cap);
}

/** Start or record a span (active or already terminal). */
export function publishDigSpan(
  input: Omit<DigSpan, "id" | "startedAt"> & {
    id?: string;
    startedAt?: string;
  },
): DigSpan {
  const startedAt = input.startedAt ?? new Date().toISOString();
  const span: DigSpan = {
    id: input.id ?? uid(),
    jobId: input.jobId || "unknown",
    targetName: input.targetName,
    spanType: input.spanType,
    name: input.name,
    status: input.status,
    startedAt,
    endedAt: input.endedAt,
    inputSummary: input.inputSummary?.slice(0, 400),
    resultSummary: input.resultSummary?.slice(0, 500),
    modelId: input.modelId,
    parentSpanId: input.parentSpanId,
    operationName:
      input.operationName ??
      (input.spanType === "llm"
        ? "chat"
        : input.spanType === "tool"
          ? "execute_tool"
          : input.spanType === "stage"
            ? "invoke_agent"
            : input.spanType),
    agentName: input.agentName,
  };

  const jobList = byJob.get(span.jobId) ?? [];
  byJob.set(span.jobId, pushRing(jobList, span, CAP));
  globalRing = pushRing(globalRing, span, CAP);

  // Bound map growth
  if (byJob.size > 40) {
    const keys = [...byJob.keys()];
    for (const k of keys.slice(0, keys.length - 20)) byJob.delete(k);
  }
  return span;
}

/** Mark an active span completed by id (or no-op). */
export function completeDigSpan(
  jobId: string,
  spanId: string,
  patch?: Partial<Pick<DigSpan, "status" | "resultSummary" | "endedAt">>,
): DigSpan | null {
  const list = byJob.get(jobId);
  if (!list) return null;
  const idx = list.findIndex((s) => s.id === spanId);
  if (idx < 0) return null;
  const prev = list[idx];
  const next: DigSpan = {
    ...prev,
    status: patch?.status ?? "ok",
    resultSummary: patch?.resultSummary ?? prev.resultSummary,
    endedAt: patch?.endedAt ?? new Date().toISOString(),
  };
  list[idx] = next;
  byJob.set(jobId, [...list]);
  globalRing = pushRing(globalRing, next, CAP);
  return next;
}

/** Newest-first spans for a job (or global if jobId omitted). */
export function getRecentDigSpans(jobId?: string | null, limit = 50): DigSpan[] {
  const n = Math.max(1, Math.min(80, limit));
  if (jobId && byJob.has(jobId)) {
    return (byJob.get(jobId) ?? []).slice(0, n);
  }
  return globalRing.slice(0, n);
}

/** Clear job spans (on stop / terminal). Keeps a short global trail. */
export function clearDigSpansForJob(jobId: string): void {
  byJob.delete(jobId);
}

/**
 * Map free-dig live step → DigSpan (Honeycomb execute_tool / chat).
 * Safe to call from hot path; never throws to caller.
 */
export function spanFromLiveStep(step: {
  jobId?: string | null;
  targetName?: string | null;
  tool?: string | null;
  label?: string | null;
  detail?: string | null;
  status?: "active" | "ok" | "error" | string;
  modelId?: string | null;
  agentName?: string | null;
}): DigSpan | null {
  try {
    const tool = (step.tool || step.label || "step").toString();
    const lower = tool.toLowerCase();
    let spanType: DigSpanType = "tool";
    if (/llm|model|groq|mistral|gemini|nvidia|boss|reason/.test(lower)) spanType = "llm";
    if (/promote|card|persist|phone|email|linkedin/.test(lower) && /promot|card|writ|save/.test(lower)) {
      spanType = "promote";
    }
    if (/error|fail|timeout|rate.?limit/.test(`${tool} ${step.detail || ""}`.toLowerCase())) {
      spanType = "error";
    }
    const status: DigSpanStatus =
      step.status === "error" ? "error" : step.status === "active" ? "active" : "ok";
    return publishDigSpan({
      jobId: step.jobId || "unknown",
      targetName: step.targetName || undefined,
      spanType,
      name: tool.slice(0, 80),
      status,
      inputSummary: step.label || undefined,
      resultSummary: step.detail || undefined,
      modelId: step.modelId || undefined,
      agentName: step.agentName || "investigator",
      endedAt: status === "active" ? undefined : new Date().toISOString(),
    });
  } catch {
    return null;
  }
}
