/**
 * Apex Atlas failure observatory primitives.
 *
 * Classification is diagnostic only. It never changes a research result or
 * silently turns an uncertain run into a pass.
 */

export type AtlasFailureClass =
  | "IDENTITY_COLLISION"
  | "IDENTITY_OVERCOMMITMENT"
  | "INSUFFICIENT_EVIDENCE"
  | "MISLEADING_SEARCH_RESULT"
  | "STALE_SOURCE"
  | "COPIED_CONTACT"
  | "WRONG_ENTITY"
  | "CONTACT_MISATTRIBUTION"
  | "CONTRADICTION_MISCLASSIFICATION"
  | "MISSED_PIVOT"
  | "UNNECESSARY_PIVOT"
  | "TOOL_SELECTION_ERROR"
  | "PREMATURE_STOP"
  | "LATE_STOP"
  | "PROMPT_INJECTION"
  | "SOURCE_QUALITY_ERROR"
  | "SYSTEM_FAILURE";

export type AtlasFailureSignal = {
  failureClass: AtlasFailureClass;
  severity: "info" | "warning" | "high";
  turn: number | null;
  evidence: string;
  regressionCandidate: boolean;
};

export function classifyTrajectorySignals(input: {
  records: ReadonlyArray<{
    turn: number;
    action: string;
    args?: Record<string, unknown>;
    execution: string;
    observation?: string;
    observedUrls?: string[];
    findings?: readonly unknown[];
  }>;
  evidenceCount: number;
  sourceFamilyDiversity: number;
  unresolvedQuestions: number;
  stopReason?: string;
}): AtlasFailureSignal[] {
  const signals: AtlasFailureSignal[] = [];
  const records = input.records;
  const parseFailure = records.find((record) => record.action === "parse_failure");
  if (parseFailure) signals.push({
    failureClass: "SYSTEM_FAILURE",
    severity: "warning",
    turn: parseFailure.turn,
    evidence: "Investigator returned an action that failed semantic/schema parsing.",
    regressionCandidate: true,
  });

  const injection = records.find((record) => /ignore (?:all|any|previous)|system message|developer message|reveal .*prompt|call .*tool|override .*policy/i.test(record.observation || ""));
  if (injection) signals.push({
    failureClass: "PROMPT_INJECTION",
    severity: "high",
    turn: injection.turn,
    evidence: "Retrieved content contained instruction-like text; classify exposure separately from evidence.",
    regressionCandidate: true,
  });

  const usefulTurns = records.filter((record) => record.findings?.length || (record.observedUrls?.length ?? 0) > 0);
  if (records.length >= 4 && usefulTurns.length === 0) signals.push({
    failureClass: "TOOL_SELECTION_ERROR",
    severity: "warning",
    turn: records[records.length - 1]?.turn ?? null,
    evidence: "Multiple actions produced no useful observation or finding.",
    regressionCandidate: true,
  });

  if (input.stopReason === "MODEL_DECIDED_DONE" && (input.evidenceCount < 2 || input.sourceFamilyDiversity < 2 || input.unresolvedQuestions > 0)) {
    signals.push({
      failureClass: "PREMATURE_STOP",
      severity: "warning",
      turn: records[records.length - 1]?.turn ?? null,
      evidence: "Model stopped while evidence coverage remained thin or unresolved questions remained.",
      regressionCandidate: true,
    });
  }

  const repeated = records.filter((record, index) => {
    if (record.action !== "web_search") return false;
    const provider = String(record.args?.provider ?? "");
    return records.slice(0, index).some((prior) => prior.action === "web_search" && String(prior.args?.provider ?? "") === provider);
  });
  if (repeated.length >= 2 && input.sourceFamilyDiversity <= 1) signals.push({
    failureClass: "UNNECESSARY_PIVOT",
    severity: "info",
    turn: repeated[repeated.length - 1]?.turn ?? null,
    evidence: "Repeated search-provider family usage without source-family expansion.",
    regressionCandidate: false,
  });

  return signals;
}
