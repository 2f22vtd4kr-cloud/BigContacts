/**
 * Canonical discovery's provider-unavailable circuit breaker.
 *
 * Count an Investigator episode as unavailable only when the episode actually
 * ended with LLM_UNAVAILABLE and contains a durable provider-error record.
 * Token-window capacity remains distinct from hard request-quota exhaustion.
 * Canonical discovery may request one Boss-directed reassignment only after
 * repeated consecutive token-window failures have already passed the bounded
 * same-capability retry.
 */
export type InvestigatorProviderEpisode = {
  status?: string;
  stopReason?: string;
  error?: string;
  trajectoryRecords?: ReadonlyArray<{
    action?: string;
    execution?: string;
    observation?: string | null;
  }>;
};

export const MAX_CONSECUTIVE_INVESTIGATOR_PROVIDER_UNAVAILABLE = 2;
export const MAX_CONSECUTIVE_INVESTIGATOR_TOKEN_CAPACITY_FAILURES = 2;

/**
 * Bound a one-off TPD reassignment episode to one normal Investigator act and
 * the global budget left after the failed episode. This never creates extra
 * work beyond the canonical run's existing iteration ceiling.
 */
export function resolveInvestigatorTokenDailyQuotaRecoveryIterations(
  maxRecoveryActIterations: number,
  failedEpisodeIterations: number,
  remainingTotalIterations: number,
): number {
  const positiveInt = (value: number): number =>
    Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return Math.min(
    positiveInt(maxRecoveryActIterations),
    Math.max(0, positiveInt(remainingTotalIterations) - positiveInt(failedEpisodeIterations)),
  );
}

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
const SUCCESSFUL_INVESTIGATOR_RESEARCH_ACTIONS = new Set([
  "web_search", "parallel_web_search", "registry_search", "parallel_registry_search",
  "visit", "browser_fetch", "domain_lookup", "harvest_domain", "footprint_email",
  "footprint_username_maigret", "footprint_username_sherlock", "footprint_spiderfoot",
]);

function episodeProducedSuccessfulResearch(result: InvestigatorProviderEpisode): boolean {
  return (result.trajectoryRecords ?? []).some((record) =>
    record.execution === "success"
    && SUCCESSFUL_INVESTIGATOR_RESEARCH_ACTIONS.has(record.action ?? ""),
  );
}

export function advanceInvestigatorProviderUnavailableStreak(
  previousCount: number,
  result: InvestigatorProviderEpisode,
): number {
  const safePrevious = Number.isFinite(previousCount)
    ? Math.max(0, Math.floor(previousCount))
    : 0;
  // An episode ending in a provider error can still have produced useful,
  // durably recorded research. Give Boss another control decision in that case;
  // global Investigator/deadline bounds still cap work. Keep the narrower token
  // capacity streak separate so repeated token-window failures remain eligible
  // for the existing Boss-authorized recovery path.
  if (episodeProducedSuccessfulResearch(result)) return 0;
  return isInvestigatorProviderUnavailableEpisode(result)
    ? safePrevious + 1
    : 0;
}

/**
 * Explicit Groq tokens-per-day exhaustion is recoverable only by the separate,
 * single Boss-directed capability reassignment; it must not be treated as a
 * short token-window failure or hard request-count quota.
 */
/**
 * Classify the most recent provider failure, not any historical quota record
 * in a merged multi-capability trajectory.
 */
export function isInvestigatorHardRequestQuotaUnavailableEpisode(
  result: InvestigatorProviderEpisode,
): boolean {
  if (!isInvestigatorProviderUnavailableEpisode(result)) return false;
  if (result.error === "upstream_quota_exhausted" || result.error === "quota_exceeded") return true;
  const latestProviderError = [...(result.trajectoryRecords ?? [])].reverse().find(
    (record) => record.action === "investigator_provider_error",
  );
  return /(?:upstream_quota_exhausted|quota_exceeded)/i.test(latestProviderError?.observation ?? "");
}

export function isInvestigatorTokenDailyQuotaUnavailableEpisode(
  result: InvestigatorProviderEpisode,
): boolean {
  if (!isInvestigatorProviderUnavailableEpisode(result)) return false;
  if (result.error === "upstream_token_quota_exhausted") return true;
  const latestProviderError = [...(result.trajectoryRecords ?? [])].reverse().find(
    (record) => record.action === "investigator_provider_error",
  );
  return /upstream_token_quota_exhausted/i.test(latestProviderError?.observation ?? "");
}

export function isInvestigatorTokenCapacityUnavailableEpisode(
  result: InvestigatorProviderEpisode,
): boolean {
  if (!isInvestigatorProviderUnavailableEpisode(result)) return false;
  return result.error === "upstream_token_window_wait_exceeded"
    || (result.trajectoryRecords ?? []).some(
      (record) => record.action === "investigator_provider_error"
        && /upstream_token_window_wait_exceeded/i.test(record.observation ?? ""),
    );
}

/**
 * Count only consecutive token-window failures. Any other episode resets this
 * narrower streak; callers separately track the general provider breaker.
 */
export function advanceInvestigatorTokenCapacityFailureStreak(
  previousCount: number,
  result: InvestigatorProviderEpisode,
): number {
  const safePrevious = Number.isFinite(previousCount)
    ? Math.max(0, Math.floor(previousCount))
    : 0;
  return isInvestigatorTokenCapacityUnavailableEpisode(result)
    ? safePrevious + 1
    : 0;
}

/**
 * The typed token-window circuit is independent of the generic provider breaker.
 * Productive-but-provider-failed episodes reset the generic streak, but must not
 * suppress bounded Boss-directed recovery after repeated token-window failures.
 */
export function hasReachedInvestigatorTokenCapacityFailureLimit(
  consecutiveCount: number,
  result: InvestigatorProviderEpisode,
): boolean {
  const safeCount = Number.isFinite(consecutiveCount)
    ? Math.max(0, Math.floor(consecutiveCount))
    : 0;
  return safeCount >= MAX_CONSECUTIVE_INVESTIGATOR_TOKEN_CAPACITY_FAILURES
    && isInvestigatorTokenCapacityUnavailableEpisode(result);
}
