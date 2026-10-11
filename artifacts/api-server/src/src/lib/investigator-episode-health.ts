export type InvestigatorEpisodeFailureCode =
  | "investigator_episode_error"
  | "investigator_episode_unavailable_without_provider_record"
  | "investigator_episode_no_action";

export type InvestigatorEpisodeHealthInput = {
  status: string;
  iterations: number;
  stopReason?: string | null;
  trajectoryRecords?: readonly { action?: string | null; execution?: string | null }[];
  investigatorActionExecuted?: boolean;
};

/**
 * A failed or empty continuation must not be mistaken for a completed research
 * episode. Explicit provider-error trajectories stay with the existing bounded
 * provider recovery policy; unexpected orchestration errors fail closed.
 */
export function classifyInvestigatorEpisodeFailure(
  input: InvestigatorEpisodeHealthInput,
): { code: InvestigatorEpisodeFailureCode } | null {
  // Inputs are episode-local results from runBureauAgenticWebPass, not the
  // case's cumulative history. Every supplied record belongs to this episode.
  const episodeRecords = input.trajectoryRecords ?? [];
  const hasProviderErrorRecord = episodeRecords.some((record) => record.action === "investigator_provider_error");
  const hasInvestigatorAction = input.investigatorActionExecuted ?? episodeRecords.some((record) =>
    !["done", "parse_failure", "investigator_provider_error"].includes(record.action ?? "") &&
    !["selected", "blocked"].includes(record.execution ?? ""),
  );
  if (input.status === "error") {
    return { code: "investigator_episode_error" };
  }
  if (
    input.status === "unavailable" &&
    !(input.stopReason === "LLM_UNAVAILABLE" && hasProviderErrorRecord)
  ) {
    return { code: "investigator_episode_unavailable_without_provider_record" };
  }
  // Preserve explicit provider failures for the existing bounded recovery path.
  // Parse failures and selected/blocked actions are not an investigative act.
  if (
    input.status !== "cancelled" &&
    !hasInvestigatorAction &&
    !(input.status === "unavailable" && input.stopReason === "LLM_UNAVAILABLE" && hasProviderErrorRecord)
  ) {
    return { code: "investigator_episode_no_action" };
  }
  return null;
}
