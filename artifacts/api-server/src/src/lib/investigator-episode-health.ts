export type InvestigatorEpisodeFailureCode =
  | "investigator_episode_error"
  | "investigator_episode_unavailable_without_provider_record"
  | "investigator_episode_no_action";

export type InvestigatorEpisodeHealthInput = {
  status: string;
  iterations: number;
  stopReason?: string | null;
  trajectoryRecords?: readonly { action?: string | null }[];
  priorTrajectoryRecordCount?: number;
};

/**
 * A failed or empty continuation must not be mistaken for a completed research
 * episode. Explicit provider-error trajectories stay with the existing bounded
 * provider recovery policy; unexpected orchestration errors fail closed.
 */
export function classifyInvestigatorEpisodeFailure(
  input: InvestigatorEpisodeHealthInput,
): { code: InvestigatorEpisodeFailureCode } | null {
  const records = input.trajectoryRecords ?? [];
  const priorCount = Math.max(0, input.priorTrajectoryRecordCount ?? 0);
  const newRecords = records.slice(priorCount);
  if (input.status === "error") {
    return { code: "investigator_episode_error" };
  }
  if (
    input.status === "unavailable" &&
    !(input.stopReason === "LLM_UNAVAILABLE" && newRecords.some((record) => record.action === "investigator_provider_error"))
  ) {
    return { code: "investigator_episode_unavailable_without_provider_record" };
  }
  if (input.status !== "cancelled" && input.iterations <= 0 && newRecords.length === 0) {
    return { code: "investigator_episode_no_action" };
  }
  return null;
}
