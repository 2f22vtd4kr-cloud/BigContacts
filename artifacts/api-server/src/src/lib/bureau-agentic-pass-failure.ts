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
  stopReason?: string;
  consecutiveActionParseFailures?: number;
};

export type BureauPassFailureResult = {
  status: "error";
  model: string;
  iterations: number;
  searches: number;
  visits: number;
  findings: AgenticFinding[];
  partialFindings: AgenticFinding[];
  contactEvidence: [];
  trajectory: string[];
  trajectoryRecords: AgenticTrajectoryRecord[];
  modelFindings: AgenticFinding[];
  caseId?: number;
  runId: string;
  stopReason: "UNEXPECTED_ERROR";
  error: string;
  consecutiveActionParseFailures: number;
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
  const failureDomain = input.stage === "trajectory_finalization"
    ? "persistence_database"
    : input.stage === "live_event_delivery"
      ? "unexpected_programming_error"
      : input.stage === "contact_persistence"
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
    findings: agentic.findings ?? [],
    partialFindings: agentic.partialFindings ?? [],
    contactEvidence: [],
    trajectory: [...(agentic.trajectory ?? []), `step${turn}: runtime_error execution=error stage=${input.stage}`],
    trajectoryRecords: [...priorRecords, runtimeFailure],
    modelFindings: agentic.modelFindings ?? [],
    ...(input.caseId != null ? { caseId: input.caseId } : {}),
    runId: input.runId,
    stopReason: "UNEXPECTED_ERROR",
    error: input.errorSummary,
    consecutiveActionParseFailures: agentic.consecutiveActionParseFailures ?? input.initialConsecutiveActionParseFailures ?? 0,
  };
}
