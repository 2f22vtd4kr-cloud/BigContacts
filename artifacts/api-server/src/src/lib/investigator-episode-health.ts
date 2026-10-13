export type InvestigatorEpisodeFailureCode =
  | "investigator_episode_error"
  | "investigator_episode_unavailable_without_provider_record"
  | "investigator_episode_no_action";

export type InvestigatorEpisodeHealthInput = {
  status: string;
  iterations: number;
  stopReason?: string | null;
  trajectoryRecords?: readonly { action?: string | null; execution?: string | null; observation?: string | null; stopReason?: string | null; failureDomain?: string | null; failureKind?: string | null }[];
};

/**
 * True only when this episode contains a non-terminal research capability
 * that was actually attempted. A done/parse/provider record, or a proposal
 * that was merely selected/blocked, is not research execution.
 */
export function hasExecutedInvestigatorResearchAction(
  records: readonly { action?: string | null; execution?: string | null }[],
): boolean {
  return records.some((record) => {
    const action = record.action ?? "";
    if (!action || ["done", "parse_failure", "investigator_provider_error"].includes(action)) return false;
    if (record.execution === "selected" || record.execution === "blocked") return false;
    return typeof record.execution === "string" && record.execution.length > 0;
  });
}

/**
 * A failed or empty continuation must not be mistaken for a completed research
 * episode. A structurally recorded terminal action-parse failure is different
 * from an orchestration exception: send it to the model-owned Boss control turn,
 * which may continue within the existing budget or stop. Unstructured errors fail closed.
 */
export function classifyInvestigatorEpisodeFailure(
  input: InvestigatorEpisodeHealthInput,
): { code: InvestigatorEpisodeFailureCode } | null {
  // Inputs are episode-local results from runBureauAgenticWebPass, not the
  // case's cumulative history. Every supplied record belongs to this episode.
  const episodeRecords = input.trajectoryRecords ?? [];
  if (input.status === "error") {
    const hasDurableTerminalParseFailure = input.stopReason === "PARSE_FAILURE" && episodeRecords.some((record) =>
      record.action === "parse_failure" &&
      record.execution === "error" &&
      record.stopReason === "PARSE_FAILURE" &&
      record.failureDomain === "model_action" &&
      record.failureKind === "invalid_contract",
    );
    if (hasDurableTerminalParseFailure) return null;
    return { code: "investigator_episode_error" };
  }
  if (input.status === "unavailable") {
    if (input.stopReason === "LLM_UNAVAILABLE" && episodeRecords.some((record) => record.action === "investigator_provider_error")) {
      return null;
    }
    return { code: "investigator_episode_unavailable_without_provider_record" };
  }
  const deliberatePivotGuardRecovery = input.stopReason === "ITERATION_BUDGET"
    && episodeRecords.length > 0
    && episodeRecords.every((record) =>
      record.execution === "blocked"
      && String(record.observation ?? "").includes("pivot_alignment_guard"),
    );
  if (input.status !== "cancelled" && !hasExecutedInvestigatorResearchAction(episodeRecords) && !deliberatePivotGuardRecovery) {
    return { code: "investigator_episode_no_action" };
  }
  return null;
}
