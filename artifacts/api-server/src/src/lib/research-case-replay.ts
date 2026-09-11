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
  claimCount: number;
  promotionCount: number;
  validationCount: number;
  projectionCount: number;
  causalReferenceCount: number;
  orphanReferenceCount: number;
  failureCount: number;
  cancellationCount: number;
  latestDecision: Record<string, unknown> | null;
  latestObservation: Record<string, unknown> | null;
  latestDirective: Record<string, unknown> | null;
  summaries: string[];
  valid: boolean;
  violations: string[];
};

const ALLOWED_ACTOR_ROLES = new Set([
  "head_investigator",
  "gemini_boss",
  "right_hand",
  "specialist",
  "human_operator",
  "system",
  "bureau",
]);
const ALLOWED_EVENT_TYPES = new Set([
  "case_opened",
  "decision",
  "control_decision",
  "assignment",
  "observation",
  "tool_observation",
  "claim",
  "promotion",
  "validation",
  "projection",
  "directive",
  "status",
]);

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

function asPositiveInteger(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : null;
}

function requireReferencedEvent(
  eventId: number,
  reference: unknown,
  expectedTypes: Set<string>,
  label: string,
  knownEvents: Map<number, ResearchReplayEvent>,
  violations: string[],
): boolean {
  const referencedId = asPositiveInteger(reference);
  if (referencedId === null) {
    violations.push(`event ${eventId}: ${label} has no valid event reference`);
    return false;
  }
  const referenced = knownEvents.get(referencedId);
  if (!referenced) {
    violations.push(`event ${eventId}: ${label} references missing event ${referencedId}`);
    return false;
  }
  if (!expectedTypes.has(referenced.eventType.toLowerCase())) {
    violations.push(`event ${eventId}: ${label} references incompatible event ${referencedId} (${referenced.eventType})`);
    return false;
  }
  return true;
}

/**
 * Replay events in the immutable database sequence (`id`) order.
 *
 * `createdAt` is metadata, not the ordering authority: concurrent transactions
 * can legitimately receive timestamps that do not have the same total order as
 * sequence allocation. `iteration` is likewise not a sequence because several
 * actor/tool events can occur during one iteration.
 *
 * Claim, promotion, validation, and projection events form an explicit causal
 * chain. Replay validates those edges instead of treating copied URLs/values
 * in mutable projections as sufficient provenance.
 */
export function replayResearchCaseEvents(events: ResearchReplayEvent[]): ResearchCaseReplay {
  const violations: string[] = [];
  const ordered = [...events].sort((a, b) => {
    if (a.id !== b.id) return a.id - b.id;
    return a.iteration - b.iteration;
  });

  const caseId = ordered[0]?.caseId ?? 0;
  const seenIds = new Set<number>();
  const knownEvents = new Map<number, ResearchReplayEvent>();
  let previousIteration = 0;
  let actionCount = 0;
  let observationCount = 0;
  let decisionCount = 0;
  let assignmentCount = 0;
  let directiveCount = 0;
  let claimCount = 0;
  let promotionCount = 0;
  let validationCount = 0;
  let projectionCount = 0;
  let causalReferenceCount = 0;
  let orphanReferenceCount = 0;
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
    knownEvents.set(event.id, event);
    if (!Number.isInteger(event.caseId) || event.caseId <= 0) violations.push(`event ${event.id}: invalid caseId ${String(event.caseId)}`);
    if (event.caseId !== caseId) violations.push(`event ${event.id}: caseId ${event.caseId} differs from replay case ${caseId}`);
    if (!Number.isInteger(event.iteration) || event.iteration < 0) violations.push(`event ${event.id}: invalid iteration ${String(event.iteration)}`);
    if (event.iteration < previousIteration) violations.push(`event ${event.id}: iteration regressed from ${previousIteration} to ${event.iteration}`);
    if (!ALLOWED_ACTOR_ROLES.has(event.actorRole)) violations.push(`event ${event.id}: unknown actorRole ${event.actorRole}`);
    if (!ALLOWED_EVENT_TYPES.has(event.eventType)) violations.push(`event ${event.id}: unknown eventType ${event.eventType}`);
    if (!event.status.trim()) violations.push(`event ${event.id}: empty status`);
    if (!event.summary.trim()) violations.push(`event ${event.id}: empty summary`);
    if (!Number.isFinite(asTime(event.createdAt))) violations.push(`event ${event.id}: invalid createdAt`);
    previousIteration = Math.max(previousIteration, event.iteration);

    const payload = parsePayload(event.payload, event.id, violations);
    const type = event.eventType.toLowerCase();
    const status = event.status.toLowerCase();
    if (["decision", "control_decision", "assignment", "observation", "tool_observation", "claim", "promotion", "validation", "projection", "directive"].includes(type)) actionCount++;
    if (type === "decision" || type === "control_decision") { decisionCount++; latestDecision = payload; }
    if (type === "assignment") assignmentCount++;
    if (type === "observation" || type === "tool_observation") { observationCount++; latestObservation = payload; }
    if (type === "directive") { directiveCount++; latestDirective = payload; }

    if (type === "claim") {
      claimCount++;
      const observationIds = Array.isArray(payload.observationEventIds)
        ? payload.observationEventIds.map(asPositiveInteger).filter((id): id is number => id !== null)
        : [];
      if (observationIds.length === 0) {
        violations.push(`event ${event.id}: claim has no observationEventIds`);
      } else {
        for (const observationId of observationIds) {
          causalReferenceCount++;
          const observation = knownEvents.get(observationId);
          if (!observation) {
            orphanReferenceCount++;
            violations.push(`event ${event.id}: claim references missing observation event ${observationId}`);
          } else if (!["observation", "tool_observation"].includes(observation.eventType.toLowerCase())) {
            violations.push(`event ${event.id}: claim references non-observation event ${observationId}`);
          }
        }
      }
    }

    if (type === "promotion") {
      promotionCount++;
      if (status !== "promote" && status !== "reject") {
        violations.push(`event ${event.id}: promotion status must be promote or reject`);
      }
      if (requireReferencedEvent(event.id, payload.claimEventId, new Set(["claim"]), "promotion claimEventId", knownEvents, violations)) {
        causalReferenceCount++;
      } else {
        orphanReferenceCount++;
      }
    }

    if (type === "validation") {
      validationCount++;
      const referenced = requireReferencedEvent(
        event.id,
        payload.claimEventId,
        new Set(["claim"]),
        "validation claimEventId",
        knownEvents,
        violations,
      );
      if (referenced) causalReferenceCount++;
      else orphanReferenceCount++;
      if (!["verified", "rejected", "candidate", "blocked"].includes(status)) {
        violations.push(`event ${event.id}: validation status must be verified, rejected, candidate, or blocked`);
      }
    }

    if (type === "projection") {
      projectionCount++;
      const validationRef = payload.validationEventId;
      const promotionRef = payload.promotionEventId;
      if (validationRef !== undefined) {
        if (requireReferencedEvent(event.id, validationRef, new Set(["validation"]), "projection validationEventId", knownEvents, violations)) {
          causalReferenceCount++;
        } else {
          orphanReferenceCount++;
        }
      } else if (promotionRef !== undefined) {
        if (requireReferencedEvent(event.id, promotionRef, new Set(["promotion"]), "projection promotionEventId", knownEvents, violations)) {
          causalReferenceCount++;
        } else {
          orphanReferenceCount++;
        }
      } else {
        violations.push(`event ${event.id}: projection has no validationEventId or promotionEventId`);
        orphanReferenceCount++;
      }
      const entityId = asPositiveInteger(payload.entityId);
      if (entityId === null) violations.push(`event ${event.id}: projection has no positive entityId`);
    }

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
    claimCount,
    promotionCount,
    validationCount,
    projectionCount,
    causalReferenceCount,
    orphanReferenceCount,
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
