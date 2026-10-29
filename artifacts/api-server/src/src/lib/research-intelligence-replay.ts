import type { AgenticFinding, AgenticTrajectoryRecord } from "./agentic-web-research-core";
import type { IntelligenceContext, ResearchIntelligenceEngine } from "./research-intelligence-engine";

export type DurableInvestigatorEvent = { id: number; actorRole: string; eventType: string; status: string; payload: string };
const EXECUTIONS = new Set<AgenticTrajectoryRecord["execution"]>(["selected", "success", "partial", "http_error", "blocked", "timeout", "error", "cancelled"]);
const VECTORS = new Set<AgenticFinding["vectorType"]>(["email", "phone", "linkedin", "website", "other", "social"]);
const SCOPES = new Set<AgenticFinding["scope"]>(["organization", "candidate", "unknown"]);
const FAILURE_DOMAINS = new Set<NonNullable<AgenticTrajectoryRecord["failureDomain"]>>([
  "model_provider", "model_action", "tool_execution", "external_page_fetch", "persistence_database", "lease_job_state", "unexpected_programming_error",
]);
const FAILURE_KINDS = new Set<NonNullable<AgenticTrajectoryRecord["failureKind"]>>([
  "request_failure", "hard_request_quota", "local_provider_cooldown", "local_provider_budget_exhausted", "provider_rate_limited",
  "invalid_provider_request", "provider_auth_failure", "provider_endpoint_not_found", "provider_capacity_exhausted", "invalid_contract",
  "out_of_scope_action", "pdf_unsupported", "pdf_encrypted", "pdf_malformed", "pdf_extraction_failed", "pdf_ocr_required", "pdf_no_text",
  "registry_unavailable", "registry_auth_required", "registry_malformed_response", "registry_http_error", "registry_transport_error",
  "registry_timeout", "registry_request_failure", "registry_partial_failure", "response_size_limit", "http_error", "provider_unavailable",
  "timeout", "cancelled", "job_missing", "job_state_unavailable", "job_state_mismatch", "lease_lost", "no_usable_action", "unexpected_exception",
]);
function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
const MAX_SOURCE_BINDINGS_TO_INSPECT = 256;
const MAX_SOURCE_BINDINGS_TO_RESTORE = 64;
const MAX_SOURCE_BINDING_VALUE_CHARS = 2_000;
const MAX_SOURCE_BINDING_URL_CHARS = 4_096;
const MAX_SOURCE_SPAN_OFFSET = 2_000_000;
function parseSourceBindings(value: unknown): NonNullable<AgenticTrajectoryRecord["sourceBindings"]> | undefined {
  if (!Array.isArray(value)) return undefined;
  const bindings: NonNullable<AgenticTrajectoryRecord["sourceBindings"]> = [];
  // Bound both the amount inspected and the amount retained. Capping only valid
  // outputs still lets a malformed durable event force an unbounded scan.
  for (const raw of value.slice(0, MAX_SOURCE_BINDINGS_TO_INSPECT)) {
    const item = asObject(raw);
    if (!item || typeof item.findingValue !== "string" || !item.findingValue.trim()
      || item.findingValue.length > MAX_SOURCE_BINDING_VALUE_CHARS
      || typeof item.sourceUrl !== "string" || !item.sourceUrl.trim() || item.sourceUrl.length > MAX_SOURCE_BINDING_URL_CHARS
      || typeof item.sourceTurn !== "number" || !Number.isSafeInteger(item.sourceTurn) || item.sourceTurn < 0
      || typeof item.spanStart !== "number" || !Number.isSafeInteger(item.spanStart) || item.spanStart < 0 || item.spanStart > MAX_SOURCE_SPAN_OFFSET
      || typeof item.spanEnd !== "number" || !Number.isSafeInteger(item.spanEnd) || item.spanEnd < item.spanStart || item.spanEnd > MAX_SOURCE_SPAN_OFFSET
      || !(item.pageNumber === null || (typeof item.pageNumber === "number" && Number.isSafeInteger(item.pageNumber) && item.pageNumber >= 0))) continue;
    bindings.push({ findingValue: item.findingValue, sourceUrl: item.sourceUrl, sourceTurn: item.sourceTurn, spanStart: item.spanStart, spanEnd: item.spanEnd, pageNumber: item.pageNumber as number | null });
    if (bindings.length >= MAX_SOURCE_BINDINGS_TO_RESTORE) break;
  }
  return bindings;
}
function parseFinding(value: unknown): AgenticFinding | null {
  const item = asObject(value);
  if (!item || typeof item.vectorType !== "string" || !VECTORS.has(item.vectorType as AgenticFinding["vectorType"])
    || typeof item.value !== "string" || !item.value.trim()
    || (item.personName !== null && typeof item.personName !== "string")
    || (item.role !== null && typeof item.role !== "string")
    || typeof item.scope !== "string" || !SCOPES.has(item.scope as AgenticFinding["scope"])
    || !Array.isArray(item.sourceUrls) || !item.sourceUrls.every((url) => typeof url === "string")
    || typeof item.note !== "string") return null;
  return {
    vectorType: item.vectorType as AgenticFinding["vectorType"], value: item.value,
    personName: item.personName as string | null, role: item.role as string | null,
    scope: item.scope as AgenticFinding["scope"],
    sourceUrls: [...new Set(item.sourceUrls as string[])], note: item.note,
    ...(item.promotionDecision === "promote" || item.promotionDecision === "reject" ? { promotionDecision: item.promotionDecision } : {}),
    ...(typeof item.promotionReason === "string" ? { promotionReason: item.promotionReason } : {}),
  };
}
/** Read only append-only Investigator observation events, in database sequence order. */
export function investigatorRecordsFromEvents(events: readonly DurableInvestigatorEvent[]): AgenticTrajectoryRecord[] {
  const ordered = [...events].sort((a, b) => a.id - b.id);
  const records: AgenticTrajectoryRecord[] = [];
  for (const event of ordered) {
    if (event.actorRole !== "head_investigator" || !["tool_observation", "provider_error", "decision"].includes(event.eventType)) continue;
    let parsed: unknown;
    try { parsed = JSON.parse(event.payload || "{}"); }
    catch { throw new Error(`Durable Investigator event ${event.id} has malformed JSON; refusing partial evidence replay.`); }
    const payload = asObject(parsed);
    if (!payload || typeof payload.action !== "string" || !payload.action.trim()) {
      throw new Error(`Durable Investigator event ${event.id} has an invalid payload/action; refusing partial evidence replay.`);
    }
    const execution = payload.execution ?? event.status;
    if (typeof execution !== "string" || !EXECUTIONS.has(execution as AgenticTrajectoryRecord["execution"])) {
      throw new Error(`Durable Investigator event ${event.id} has an unknown execution state; refusing partial evidence replay.`);
    }
    const findings = Array.isArray(payload.findings) ? payload.findings.map(parseFinding).filter((item): item is AgenticFinding => item !== null) : [];
    const sourceBindings = parseSourceBindings(payload.sourceBindings);
    const model = typeof payload.model === "string" ? payload.model : typeof payload.runModel === "string" ? payload.runModel : "durable-replay";
    records.push({
      turn: records.length + 1, durableEventId: event.id, model, action: payload.action, args: asObject(payload.args) ?? {},
      ...(typeof payload.thought === "string" ? { thought: payload.thought } : {}),
      ...(typeof payload.pivotScopeKey === "string" && payload.pivotScopeKey.trim() ? { pivotScopeKey: payload.pivotScopeKey.slice(0, 1_800) } : {}),
      ...(Array.isArray(payload.leadUrls) ? { leadUrls: [...new Set(payload.leadUrls.filter((url): url is string => typeof url === "string"))].slice(0, 24) } : {}),
      execution: execution as AgenticTrajectoryRecord["execution"],
      ...(typeof payload.observation === "string" ? { observation: payload.observation } : {}),
      observedUrls: Array.isArray(payload.observedUrls) ? [...new Set(payload.observedUrls.filter((url): url is string => typeof url === "string"))] : [],
      findings,
      ...(Array.isArray(payload.providerFallback) ? { providerFallback: payload.providerFallback.filter((v): v is string => typeof v === "string") } : {}),
      ...(typeof payload.stopReason === "string" ? { stopReason: payload.stopReason as AgenticTrajectoryRecord["stopReason"] } : {}),
      ...(typeof payload.failureDomain === "string" && FAILURE_DOMAINS.has(payload.failureDomain as NonNullable<AgenticTrajectoryRecord["failureDomain"]>) ? { failureDomain: payload.failureDomain as NonNullable<AgenticTrajectoryRecord["failureDomain"]> } : {}),
      ...(typeof payload.failureKind === "string" && FAILURE_KINDS.has(payload.failureKind as NonNullable<AgenticTrajectoryRecord["failureKind"]>) ? { failureKind: payload.failureKind as NonNullable<AgenticTrajectoryRecord["failureKind"]> } : {}),
      ...(sourceBindings !== undefined ? { sourceBindings } : {}),
    });
  }
  return records;
}
/** Restore cognition from full immutable acts; compact snapshots are legacy fallback only. */
export function replayInvestigatorIntelligence(engine: ResearchIntelligenceEngine, records: readonly AgenticTrajectoryRecord[], legacyContext?: IntelligenceContext | null): AgenticTrajectoryRecord[] {
  if (!records.length) {
    if (legacyContext) engine.restoreContext(legacyContext);
    return [];
  }
  const history: AgenticTrajectoryRecord[] = [];
  for (const record of records) {
    const current = { ...record, turn: history.length + 1 };
    history.push(current);
    engine.recordAction({
      turn: current.turn, action: current.action, args: current.args, execution: current.execution,
      observation: current.observation, urls: current.observedUrls, findings: current.findings,
      sourceObservations: history.map((item) => ({ turn: item.turn, action: item.action, execution: item.execution, observation: item.observation, urls: item.observedUrls })),
    });
  }
  return history;
}
