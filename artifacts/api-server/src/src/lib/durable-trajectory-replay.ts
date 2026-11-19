import { createHash } from "node:crypto";
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
      ? payload.findings.filter((item) => objectValue(item) !== null) as unknown as AgenticTrajectoryRecord["findings"]
      : [];
    const sourceBindings = Array.isArray(payload.sourceBindings)
      ? payload.sourceBindings.filter((item) => objectValue(item) !== null) as unknown as NonNullable<AgenticTrajectoryRecord["sourceBindings"]>
      : [];

    records.push({
      turn: Number(turn),
      ...(runId ? { runId } : {}),
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

export type DurableFetchedPageArtifactEvent = { id: number; payload: string };

/**
 * Attach only complete, hash-verified page artifacts to the exact run/turn that
 * produced them. Equal turn numbers in separate runs must never cross-bind.
 */
export function attachDurableFetchedPageArtifacts(
  records: AgenticTrajectoryRecord[],
  events: readonly DurableFetchedPageArtifactEvent[],
): AgenticTrajectoryRecord[] {
  const chunksByArtifact = new Map<string, {
    runId: string;
    turn: number;
    sourceUrl: string;
    sha256: string;
    retrievedAt: string;
    sourceVerified: boolean | null;
    firstEventId: number;
    chunkCount: number;
    chunks: Map<number, string>;
  }>();
  for (const event of [...events].sort((a, b) => a.id - b.id)) {
    let payload: Record<string, unknown> | null = null;
    try {
      const parsed: unknown = JSON.parse(event.payload);
      payload = parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : null;
    } catch {
      continue;
    }
    if (!payload || payload.kind !== "fetched_page_artifact_chunk"
      || typeof payload.runId !== "string" || !payload.runId
      || typeof payload.turn !== "number" || !Number.isSafeInteger(payload.turn)
      || typeof payload.sourceUrl !== "string" || typeof payload.sha256 !== "string"
      || typeof payload.retrievedAt !== "string" || typeof payload.chunkIndex !== "number"
      || typeof payload.chunkCount !== "number" || typeof payload.text !== "string") continue;
    const sourceVerified = typeof payload.sourceVerified === "boolean" ? payload.sourceVerified : null;
    const key = payload.runId + ":" + payload.turn;
    const entry = chunksByArtifact.get(key) ?? {
      runId: payload.runId,
      turn: payload.turn,
      sourceUrl: payload.sourceUrl,
      sha256: payload.sha256,
      retrievedAt: payload.retrievedAt,
      sourceVerified,
      firstEventId: event.id,
      chunkCount: payload.chunkCount,
      chunks: new Map<number, string>(),
    };
    if (entry.sha256 !== payload.sha256 || entry.chunkCount !== payload.chunkCount
      || entry.sourceUrl !== payload.sourceUrl || entry.retrievedAt !== payload.retrievedAt
      || entry.sourceVerified !== sourceVerified) continue;
    entry.firstEventId = Math.min(entry.firstEventId, event.id);
    entry.chunks.set(payload.chunkIndex, payload.text);
    chunksByArtifact.set(key, entry);
  }

  for (const artifact of chunksByArtifact.values()) {
    if (artifact.chunkCount < 1 || artifact.chunks.size !== artifact.chunkCount) continue;
    const ordered = Array.from({ length: artifact.chunkCount }, (_, index) => artifact.chunks.get(index));
    if (ordered.some((chunk) => typeof chunk !== "string")) continue;
    const text = (ordered as string[]).join("");
    if (createHash("sha256").update(text).digest("hex") !== artifact.sha256) continue;
    const record = records.find((item) => item.runId === artifact.runId && item.turn === artifact.turn
      && (item.action === "visit" || item.action === "browser_fetch"));
    if (!record) continue;
    record.pageArtifact = {
      sourceUrl: artifact.sourceUrl,
      text,
      sha256: artifact.sha256,
      retrievedAt: artifact.retrievedAt,
      sourceVerified: artifact.sourceVerified ?? (record.execution === "success" && record.observedUrls.length > 0),
      artifactEventId: artifact.firstEventId,
    };
  }
  return records;
}
