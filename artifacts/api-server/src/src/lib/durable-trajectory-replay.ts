import type { AgenticTrajectoryRecord } from "./agentic-web-research-core";

/** Minimal immutable event projection needed to replay Investigator turns. */
export type DurableTrajectoryEvent = {
  id: number;
  eventType: string;
  payload: string;
};

const EXECUTIONS = new Set<AgenticTrajectoryRecord["execution"]>([
  "selected", "success", "partial", "http_error", "blocked", "timeout", "error", "cancelled",
]);

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/**
 * Rebuild the chronological Investigator trajectory from immutable case events.
 * This is a replay projection only: it never invents missing observations or
 * interprets failed/blocked actions as negative findings.
 */
export function replayInvestigatorTrajectoryEvents(
  events: readonly DurableTrajectoryEvent[],
): AgenticTrajectoryRecord[] {
  const ordered = [...events].sort((a, b) => a.id - b.id);
  const records: AgenticTrajectoryRecord[] = [];
  const seen = new Set<string>();

  for (const event of ordered) {
    if (!["tool_observation", "decision", "provider_error"].includes(event.eventType)) continue;
    let payload: Record<string, unknown> | null = null;
    try {
      payload = objectValue(JSON.parse(event.payload));
    } catch {
      continue;
    }
    if (!payload) continue;

    const turn = payload.turn;
    const action = payload.action;
    const execution = payload.execution;
    if (!Number.isSafeInteger(turn) || Number(turn) < 1 || typeof action !== "string" || !action.trim()) continue;
    if (typeof execution !== "string" || !EXECUTIONS.has(execution as AgenticTrajectoryRecord["execution"])) continue;

    const runId = typeof payload.runId === "string" ? payload.runId : "";
    const key = runId + ":" + String(turn);
    if (seen.has(key)) continue;
    seen.add(key);

    const args = objectValue(payload.args) ?? {};
    const stringArray = (value: unknown): string[] =>
      Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
    const findings = Array.isArray(payload.findings)
      ? payload.findings.filter((item) => objectValue(item) !== null) as AgenticTrajectoryRecord["findings"]
      : [];
    const sourceBindings = Array.isArray(payload.sourceBindings)
      ? payload.sourceBindings.filter((item) => objectValue(item) !== null) as NonNullable<AgenticTrajectoryRecord["sourceBindings"]>
      : [];

    records.push({
      turn: Number(turn),
      model: typeof payload.runModel === "string" ? payload.runModel : "replayed",
      action: action.trim(),
      args,
      ...(typeof payload.thought === "string" ? { thought: payload.thought } : {}),
      ...(typeof payload.pivotScopeKey === "string" ? { pivotScopeKey: payload.pivotScopeKey } : {}),
      leadUrls: stringArray(payload.leadUrls),
      execution: execution as AgenticTrajectoryRecord["execution"],
      ...(typeof payload.observation === "string" ? { observation: payload.observation } : {}),
      observedUrls: stringArray(payload.observedUrls),
      findings,
      providerFallback: stringArray(payload.providerFallback),
      ...(typeof payload.stopReason === "string" ? { stopReason: payload.stopReason as AgenticTrajectoryRecord["stopReason"] } : {}),
      durableEventId: event.id,
      ...(typeof payload.failureDomain === "string" ? { failureDomain: payload.failureDomain as AgenticTrajectoryRecord["failureDomain"] } : {}),
      ...(typeof payload.failureKind === "string" ? { failureKind: payload.failureKind as AgenticTrajectoryRecord["failureKind"] } : {}),
      sourceBindings,
    });
  }

  return records.sort((a, b) => a.turn - b.turn || (a.durableEventId ?? 0) - (b.durableEventId ?? 0));
}
