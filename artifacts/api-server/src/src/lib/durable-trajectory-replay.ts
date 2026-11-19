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
  const pageChunks = new Map<number, Array<{ index: number; count: number; text: string }>>();

  for (const event of ordered) {
    let payload: Record<string, unknown> | null = null;
    try {
      payload = objectValue(JSON.parse(event.payload));
    } catch {
      continue;
    }
    if (!payload) continue;
    if (payload.pageTextChunk === true) {
      const parentEventId = Number(payload.parentEventId);
      const chunkIndex = Number(payload.chunkIndex);
      const chunkCount = Number(payload.chunkCount);
      if (Number.isSafeInteger(parentEventId) && parentEventId > 0 && Number.isSafeInteger(chunkIndex) && chunkIndex >= 0 && Number.isSafeInteger(chunkCount) && chunkCount > 0 && typeof payload.pageContentChunk === "string") {
        const chunks = pageChunks.get(parentEventId) ?? [];
        chunks.push({ index: chunkIndex, count: chunkCount, text: payload.pageContentChunk });
        pageChunks.set(parentEventId, chunks);
      }
      continue;
    }
    if (!["tool_observation", "decision", "provider_error"].includes(event.eventType)) continue;

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
      ? payload.findings.filter((item) => objectValue(item) !== null) as unknown as AgenticTrajectoryRecord["findings"]
      : [];
    const sourceBindings = Array.isArray(payload.sourceBindings)
      ? payload.sourceBindings.filter((item) => objectValue(item) !== null) as unknown as NonNullable<AgenticTrajectoryRecord["sourceBindings"]>
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
      ...(typeof payload.pageContent === "string" ? { pageContent: payload.pageContent } : {}),
      ...(typeof payload.pageContentTruncated === "boolean" ? { pageContentTruncated: payload.pageContentTruncated } : {}),
      ...(typeof payload.pageContentCharsOmitted === "number" || payload.pageContentCharsOmitted === null ? { pageContentCharsOmitted: payload.pageContentCharsOmitted as number | null } : {}),
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

  for (const record of records) {
    const chunks = record.durableEventId == null ? [] : pageChunks.get(record.durableEventId) ?? [];
    if (!chunks.length) continue;
    const orderedChunks = [...chunks].sort((a, b) => a.index - b.index);
    const expectedCount = orderedChunks[0]?.count ?? 0;
    const complete = expectedCount > 0 && orderedChunks.length === expectedCount && orderedChunks.every((chunk, index) => chunk.index === index && chunk.count === expectedCount);
    if (complete) record.pageContent = orderedChunks.map((chunk) => chunk.text).join("");
    else {
      record.pageContentTruncated = true;
      record.pageContentCharsOmitted = null;
    }
  }
  return records.sort((a, b) => a.turn - b.turn || (a.durableEventId ?? 0) - (b.durableEventId ?? 0));
}
