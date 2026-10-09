import type { AgenticFinding, AgenticTrajectoryRecord } from "./agentic-web-research-core";
import type { IntelligenceContext, ResearchIntelligenceEngine } from "./research-intelligence-engine";

export type DurableInvestigatorEvent = { id: number; actorRole: string; eventType: string; status: string; payload: string };
const EXECUTIONS = new Set<AgenticTrajectoryRecord["execution"]>(["selected", "success", "http_error", "blocked", "timeout", "error", "cancelled"]);
const VECTORS = new Set<AgenticFinding["vectorType"]>(["email", "phone", "linkedin", "website", "other", "social"]);
const SCOPES = new Set<AgenticFinding["scope"]>(["organization", "candidate", "unknown"]);
function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
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
    if (!payload || typeof payload.action !== "string" || !payload.action.trim()) continue;
    const execution = payload.execution ?? event.status;
    if (typeof execution !== "string" || !EXECUTIONS.has(execution as AgenticTrajectoryRecord["execution"])) {
      throw new Error(`Durable Investigator event ${event.id} has an unknown execution state; refusing partial evidence replay.`);
    }
    const findings = Array.isArray(payload.findings) ? payload.findings.map(parseFinding).filter((item): item is AgenticFinding => item !== null) : [];
    const model = typeof payload.model === "string" ? payload.model : typeof payload.runModel === "string" ? payload.runModel : "durable-replay";
    records.push({
      turn: records.length + 1, model, action: payload.action, args: asObject(payload.args) ?? {},
      ...(typeof payload.thought === "string" ? { thought: payload.thought } : {}),
      execution: execution as AgenticTrajectoryRecord["execution"],
      ...(typeof payload.observation === "string" ? { observation: payload.observation } : {}),
      observedUrls: Array.isArray(payload.observedUrls) ? [...new Set(payload.observedUrls.filter((url): url is string => typeof url === "string"))] : [],
      findings,
      ...(Array.isArray(payload.providerFallback) ? { providerFallback: payload.providerFallback.filter((v): v is string => typeof v === "string") } : {}),
      ...(typeof payload.stopReason === "string" ? { stopReason: payload.stopReason as AgenticTrajectoryRecord["stopReason"] } : {}),
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
