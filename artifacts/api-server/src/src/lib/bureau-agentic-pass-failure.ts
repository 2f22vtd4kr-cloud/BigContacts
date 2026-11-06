import type { AgenticFinding, AgenticTrajectoryRecord } from "./agentic-web-research";

export type BureauPassAgenticSnapshot = {
  model?: string;
  iterations?: number;
  searches?: number;
  visits?: number;
  findings?: AgenticFinding[];
  partialFindings?: AgenticFinding[];
  modelFindings?: AgenticFinding[];
  trajectory?: string[];
  trajectoryRecords?: AgenticTrajectoryRecord[];
  groundingTrajectoryRecords?: AgenticTrajectoryRecord[];
  stopReason?: string;
  consecutiveActionParseFailures?: number;
  aiCompactedHistoricalContext?: string;
  aiCompactedHistoricalThroughTurn?: number;
};

export type BureauPassFailureResult = {
  status: "error";
  model: string;
  iterations: number;
  searches: number;
  visits: number;
  findings: AgenticFinding[];
  partialFindings: AgenticFinding[];
  contactEvidence: Array<{ vectorType: string; value: string; scope: string; personName: string | null; role: string | null; sourceUrls: string[]; note: string }>;
  trajectory: string[];
  trajectoryRecords: AgenticTrajectoryRecord[];
  groundingTrajectoryRecords?: AgenticTrajectoryRecord[];
  modelFindings: AgenticFinding[];
  caseId?: number;
  runId: string;
  stopReason: "UNEXPECTED_ERROR";
  error: string;
  consecutiveActionParseFailures: number;
  aiCompactedHistoricalContext?: string;
  aiCompactedHistoricalThroughTurn?: number;
};

/**
 * Preserve an Investigator's completed observations when a later wrapper step
 * (live-event delivery, durable finalization, or projection) throws. The
 * runtime_error record lets the canonical controller distinguish the failed
 * boundary instead of receiving an empty generic "episode error".
 */
export function buildBureauAgenticPassFailureResult(input: {
  stage: string;
  errorSummary: string;
  runId: string;
  caseId?: number | null;
  agenticResult?: BureauPassAgenticSnapshot | null;
  capturedTrajectoryRecords?: readonly AgenticTrajectoryRecord[];
  initialConsecutiveActionParseFailures?: number;
}): BureauPassFailureResult {
  const agentic = input.agenticResult ?? {};
  const byTurn = new Map<number, AgenticTrajectoryRecord>();
  for (const record of [...(agentic.trajectoryRecords ?? []), ...(input.capturedTrajectoryRecords ?? [])]) {
    if (record && Number.isFinite(record.turn)) byTurn.set(record.turn, record);
  }
  const priorRecords = [...byTurn.values()].sort((a, b) => a.turn - b.turn);
  const failureDomain = ["case_initialization", "trajectory_finalization", "contact_persistence"].includes(input.stage)
    ? "persistence_database"
    : "unexpected_programming_error";
  const failureKind = input.stage === "live_event_delivery" ? "request_failure" : "unexpected_exception";
  const turn = Math.max(0, ...priorRecords.map((record) => record.turn)) + 1;
  const runtimeFailure: AgenticTrajectoryRecord = {
    turn,
    model: agentic.model ?? "none",
    action: "runtime_error",
    args: { stage: input.stage },
    execution: "error",
    observation: input.errorSummary,
    observedUrls: [],
    findings: [],
    providerFallback: [],
    failureDomain,
    failureKind,
    stopReason: "UNEXPECTED_ERROR",
  };
  return {
    status: "error",
    model: agentic.model ?? "none",
    iterations: agentic.iterations ?? 0,
    searches: agentic.searches ?? 0,
    visits: agentic.visits ?? 0,
    // Raw model findings must not cross the source-backed projection boundary.
    // The caller applies the same grounding/scope projection as the success path.
    findings: [],
    partialFindings: [],
    contactEvidence: [],
    trajectory: [...(agentic.trajectory ?? []), `runtime_error execution=error stage=${input.stage}`],
    trajectoryRecords: [...priorRecords, runtimeFailure],
    ...(agentic.groundingTrajectoryRecords ? { groundingTrajectoryRecords: agentic.groundingTrajectoryRecords } : {}),
    modelFindings: agentic.modelFindings ?? [],
    ...(input.caseId != null ? { caseId: input.caseId } : {}),
    runId: input.runId,
    stopReason: "UNEXPECTED_ERROR",
    error: input.errorSummary,
    consecutiveActionParseFailures: agentic.consecutiveActionParseFailures ?? input.initialConsecutiveActionParseFailures ?? 0,
    ...(agentic.aiCompactedHistoricalContext ? { aiCompactedHistoricalContext: agentic.aiCompactedHistoricalContext } : {}),
    ...(Number.isFinite(agentic.aiCompactedHistoricalThroughTurn) ? { aiCompactedHistoricalThroughTurn: agentic.aiCompactedHistoricalThroughTurn } : {}),
  };
}


/** A completed run is idempotent only when the retry has no newly captured records. */
export function shouldSkipAlreadyFinalizedTrajectory(input: {
  runAlreadyFinalized: boolean;
  pendingRecordCount: number;
}): boolean {
  return input.runAlreadyFinalized && input.pendingRecordCount === 0;
}
