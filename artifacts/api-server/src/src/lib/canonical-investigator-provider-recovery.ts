/**
 * Canonical discovery's provider-unavailable circuit breaker.
 *
 * Count an Investigator episode as unavailable only when the episode actually
 * ended with LLM_UNAVAILABLE and contains a durable provider-error record.
 * This deliberately includes token-window 429s after the bounded same-capability
 * wait/retry has failed; such capacity errors are not hard request-quota
 * exhaustion and must not trigger credential reassignment.
 */
export type InvestigatorProviderEpisode = {
  status?: string;
  stopReason?: string;
  error?: string;
  trajectoryRecords?: ReadonlyArray<{
    action?: string;
    observation?: string | null;
  }>;
};

export const MAX_CONSECUTIVE_INVESTIGATOR_PROVIDER_UNAVAILABLE = 2;

export function isInvestigatorProviderUnavailableEpisode(
  result: InvestigatorProviderEpisode,
): boolean {
  return result.status === "unavailable"
    && result.stopReason === "LLM_UNAVAILABLE"
    && (result.trajectoryRecords ?? []).some(
      (record) => record.action === "investigator_provider_error",
    );
}

/**
 * Advance the consecutive-unavailable breaker. A usable/non-provider episode
 * resets the streak; two consecutive unavailable episodes park the case for
 * review rather than continuing control-plane churn.
 */
export function advanceInvestigatorProviderUnavailableStreak(
  previousCount: number,
  result: InvestigatorProviderEpisode,
): number {
  const safePrevious = Number.isFinite(previousCount)
    ? Math.max(0, Math.floor(previousCount))
    : 0;
  return isInvestigatorProviderUnavailableEpisode(result)
    ? safePrevious + 1
    : 0;
}
