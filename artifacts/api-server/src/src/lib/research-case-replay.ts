/**
 * Deterministic projection/replay for the append-only research case event stream.
 *
 * This module deliberately contains no model calls and performs no new research.
 * It reconstructs operator-visible state from persisted events so the mutable
 * caseFile remains a projection rather than the sole forensic source of truth.
 */

export type ResearchReplayEvent = {
  id: number;
  caseId: number;
  iteration: number;
  actorRole: string;
  eventType: string;
  status: string;
  summary: string;
  payload: string;
  createdAt: string | Date;
};

export type ResearchCaseReplay = {
  caseId: number;
  eventCount: number;
  firstEventId: number | null;
  lastEventId: number | null;
  lastIteration: number;
  lastEventType: string | null;
  lastActorRole: string | null;
  actionCount: number;
  observationCount: number;
  decisionCount: number;
  assignmentCount: number;
  directiveCount: number;
  failureCount: number;
  cancellationCount: number;
  latestDecision: Record<string, unknown> | null;
  latestObservation: Record<string, unknown> | null;
  latestDirective: Record<string, unknown> | null;
  summaries: string[];
  valid: boolean;
  violations: string[];
};

function parsePayload(raw: string, eventId: number, violations: string[]): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      violations.push(`event ${eventId}: payload is not an object`);
      return {};
    }
    return parsed as Record<string, unknown>;
  } catch {
    violations.push(`event ${eventId}: payload is not valid JSON`);
    return {};
  }
}

function asTime(value: string | Date): number {
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? time : NaN;
}

/** Replay events in database order. Input order is never trusted. */
export function replayResearchCaseEvents(events: ResearchReplayEvent[]): ResearchCaseReplay {
  const violations: string[] = [];
  const ordered = [...events].sort((a, b) => {
    const ta = asTime(a.createdAt);
    const tb = asTime(b.createdAt);
    if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return ta - tb;
    if (a.id !== b.id) return a.id - b.id;
    return a.iteration - b.iteration;
  });

  const caseId = ordered[0]?.caseId ?? 0;
  const seenIds = new Set<number>();
  let previousIteration = 0;
  let previousTime = -Infinity;
  let actionCount = 0;
  let observationCount = 0;
  let decisionCount = 0;
  let assignmentCount = 0;
  let directiveCount = 0;
  let failureCount = 0;
  let cancellationCount = 0;
  let latestDecision: Record<string, unknown> | null = null;
  let latestObservation: Record<string, unknown> | null = null;
  let latestDirective: Record<string, unknown> | null = null;
  const summaries: string[] = [];

  for (const event of ordered) {
    if (!Number.isInteger(event.id) || event.id <= 0) violations.push(`event has invalid id: ${String(event.id)}`);
    if (seenIds.has(event.id)) violations.push(`event ${event.id}: duplicate event ID`);
    seenIds.add(event.id);
    if (event.caseId !== caseId) violations.push(`event ${event.id}: caseId ${event.caseId} differs from replay case ${caseId}`);
    if (event.iteration < previousIteration) violations.push(`event ${event.id}: iteration regressed from ${previousIteration} to ${event.iteration}`);
    const time = asTime(event.createdAt);
    if (!Number.isFinite(time)) violations.push(`event ${event.id}: invalid createdAt`);
    else if (time < previousTime) violations.push(`event ${event.id}: createdAt regressed`);
    previousIteration = Math.max(previousIteration, event.iteration);
    if (Number.isFinite(time)) previousTime = time;

    const payload = parsePayload(event.payload, event.id, violations);
    const type = event.eventType.toLowerCase();
    const status = event.status.toLowerCase();
    if (["decision", "assignment", "observation", "tool_observation", "directive"].includes(type)) actionCount++;
    if (type === "decision") { decisionCount++; latestDecision = payload; }
    if (type === "assignment") assignmentCount++;
    if (type === "observation" || type === "tool_observation") { observationCount++; latestObservation = payload; }
    if (type === "directive") { directiveCount++; latestDirective = payload; }
    if (status === "failed" || status === "error" || /\bfailed\b|\berror\b/i.test(event.summary)) failureCount++;
    if (status === "cancelled" || /\bcancel(?:led|lation)\b/i.test(event.summary)) cancellationCount++;
    if (event.summary.trim()) summaries.push(event.summary.trim().slice(0, 500));
  }

  return {
    caseId,
    eventCount: ordered.length,
    firstEventId: ordered[0]?.id ?? null,
    lastEventId: ordered.at(-1)?.id ?? null,
    lastIteration: ordered.at(-1)?.iteration ?? 0,
    lastEventType: ordered.at(-1)?.eventType ?? null,
    lastActorRole: ordered.at(-1)?.actorRole ?? null,
    actionCount,
    observationCount,
    decisionCount,
    assignmentCount,
    directiveCount,
    failureCount,
    cancellationCount,
    latestDecision,
    latestObservation,
    latestDirective,
    summaries: summaries.slice(-100),
    valid: violations.length === 0,
    violations,
  };
}
