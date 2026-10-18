import { describe, expect, it } from "vitest";
import {
  advanceInvestigatorProviderUnavailableStreak,
  advanceInvestigatorTokenCapacityFailureStreak,
  hasReachedInvestigatorTokenCapacityFailureLimit,
  isInvestigatorTokenCapacityUnavailableEpisode,
  isInvestigatorTokenDailyQuotaUnavailableEpisode,
  isInvestigatorHardRequestQuotaUnavailableEpisode,
  resolveInvestigatorTokenDailyQuotaRecoveryIterations,
  isInvestigatorProviderUnavailableEpisode,
  MAX_CONSECUTIVE_INVESTIGATOR_TOKEN_CAPACITY_FAILURES,
  MAX_CONSECUTIVE_INVESTIGATOR_PROVIDER_UNAVAILABLE,
} from "./canonical-investigator-provider-recovery";

function unavailable(observation: string) {
  return {
    status: "unavailable",
    stopReason: "LLM_UNAVAILABLE",
    trajectoryRecords: [{
      action: "investigator_provider_error",
      observation,
    }],
  } as const;
}

describe("canonical Investigator provider-unavailable breaker", () => {
  it("limits one TPD recovery act to remaining global Investigator iterations", () => {
    expect(resolveInvestigatorTokenDailyQuotaRecoveryIterations(6, 6, 16)).toBe(6);
    expect(resolveInvestigatorTokenDailyQuotaRecoveryIterations(6, 6, 6)).toBe(0);
    expect(resolveInvestigatorTokenDailyQuotaRecoveryIterations(6, 1, 4)).toBe(3);
    expect(resolveInvestigatorTokenDailyQuotaRecoveryIterations(Number.NaN, 1, 4)).toBe(0);
    expect(resolveInvestigatorTokenDailyQuotaRecoveryIterations(6, Number.NaN, 4)).toBe(4);
  });

  it("counts a token-window 429 after the bounded same-capability wait fails", () => {
    const tokenWindow = unavailable(
      "INVESTIGATOR_PROVIDER_ERROR upstream_token_window_wait_exceeded",
    );

    expect(isInvestigatorProviderUnavailableEpisode(tokenWindow)).toBe(true);
    expect(advanceInvestigatorProviderUnavailableStreak(0, tokenWindow)).toBe(1);
    expect(
      advanceInvestigatorProviderUnavailableStreak(
        1,
        unavailable("INVESTIGATOR_PROVIDER_ERROR upstream_token_window_wait_exceeded"),
      ),
    ).toBe(MAX_CONSECUTIVE_INVESTIGATOR_PROVIDER_UNAVAILABLE);
  });

  it("does not treat an episode with successful research plus a provider error as a fully unavailable episode", () => {
    const mixedEpisode = {
      status: "unavailable",
      stopReason: "LLM_UNAVAILABLE",
      trajectoryRecords: [
        { action: "web_search", execution: "success", observation: "A bounded search completed and returned six URLs." },
        { action: "investigator_provider_error", execution: "error", observation: "INVESTIGATOR_PROVIDER_ERROR upstream_token_window_wait_exceeded" },
      ],
    } as const;

    expect(isInvestigatorProviderUnavailableEpisode(mixedEpisode)).toBe(true);
    expect(advanceInvestigatorProviderUnavailableStreak(1, mixedEpisode)).toBe(0);
    // Token-window failures keep their separate consecutive counter for the
    // existing capacity-specific Boss decision; only a successful search resets
    // the generic provider-unavailable breaker.
    const consecutiveCapacityFailures = advanceInvestigatorTokenCapacityFailureStreak(1, mixedEpisode);
    expect(consecutiveCapacityFailures).toBe(MAX_CONSECUTIVE_INVESTIGATOR_TOKEN_CAPACITY_FAILURES);
    expect(hasReachedInvestigatorTokenCapacityFailureLimit(consecutiveCapacityFailures, mixedEpisode)).toBe(true);
    expect(hasReachedInvestigatorTokenCapacityFailureLimit(1, mixedEpisode)).toBe(false);
    expect(hasReachedInvestigatorTokenCapacityFailureLimit(
      MAX_CONSECUTIVE_INVESTIGATOR_TOKEN_CAPACITY_FAILURES,
      unavailable("INVESTIGATOR_PROVIDER_ERROR upstream_rate_limited"),
    )).toBe(false);
  });

  it("counts other actual Investigator provider failures without treating them as quota exhaustion", () => {
    const failure = unavailable("INVESTIGATOR_PROVIDER_ERROR upstream_rate_limited");
    expect(isInvestigatorProviderUnavailableEpisode(failure)).toBe(true);
    expect(isInvestigatorTokenCapacityUnavailableEpisode(failure)).toBe(false);
    expect(advanceInvestigatorTokenCapacityFailureStreak(1, failure)).toBe(0);
    expect(advanceInvestigatorProviderUnavailableStreak(0, failure)).toBe(1);
    expect(failure.trajectoryRecords[0]?.observation).not.toContain("upstream_quota_exhausted");
  });

  it("identifies explicit TPD exhaustion without collapsing it into either quota class", () => {
    const tpd = unavailable("INVESTIGATOR_PROVIDER_ERROR upstream_token_quota_exhausted");
    const tokenWindow = unavailable("INVESTIGATOR_PROVIDER_ERROR upstream_token_window_wait_exceeded");
    const hardRequestQuota = unavailable("INVESTIGATOR_PROVIDER_ERROR upstream_quota_exhausted");

    expect(isInvestigatorTokenDailyQuotaUnavailableEpisode(tpd)).toBe(true);
    expect(isInvestigatorTokenCapacityUnavailableEpisode(tpd)).toBe(false);
    expect(hasReachedInvestigatorTokenCapacityFailureLimit(
      MAX_CONSECUTIVE_INVESTIGATOR_TOKEN_CAPACITY_FAILURES,
      tpd,
    )).toBe(false);
    expect(isInvestigatorTokenDailyQuotaUnavailableEpisode(tokenWindow)).toBe(false);
    expect(isInvestigatorTokenDailyQuotaUnavailableEpisode(hardRequestQuota)).toBe(false);
    expect(isInvestigatorHardRequestQuotaUnavailableEpisode(hardRequestQuota)).toBe(true);
    expect(isInvestigatorHardRequestQuotaUnavailableEpisode(tpd)).toBe(false);
    expect(isInvestigatorHardRequestQuotaUnavailableEpisode({
      ...unavailable("INVESTIGATOR_PROVIDER_ERROR upstream_token_quota_exhausted"),
      trajectoryRecords: [
        { action: "investigator_provider_error", observation: "upstream_quota_exhausted" },
        { action: "investigator_provider_error", observation: "upstream_token_quota_exhausted" },
      ],
    })).toBe(false);
    expect(isInvestigatorTokenDailyQuotaUnavailableEpisode({
      ...unavailable("INVESTIGATOR_PROVIDER_ERROR upstream_rate_limited"),
      trajectoryRecords: [
        { action: "investigator_provider_error", observation: "upstream_token_quota_exhausted" },
        { action: "investigator_provider_error", observation: "upstream_rate_limited" },
      ],
    })).toBe(false);
  });

  it("tracks repeated token-window failures separately from hard request-quota exhaustion", () => {
    const tokenWindow = unavailable("INVESTIGATOR_PROVIDER_ERROR upstream_token_window_wait_exceeded");
    const hardQuota = unavailable("INVESTIGATOR_PROVIDER_ERROR upstream_quota_exhausted");

    expect(isInvestigatorTokenCapacityUnavailableEpisode(tokenWindow)).toBe(true);
    expect(advanceInvestigatorTokenCapacityFailureStreak(0, tokenWindow)).toBe(1);
    expect(
      advanceInvestigatorTokenCapacityFailureStreak(1, tokenWindow),
    ).toBe(MAX_CONSECUTIVE_INVESTIGATOR_TOKEN_CAPACITY_FAILURES);

    expect(isInvestigatorTokenCapacityUnavailableEpisode(hardQuota)).toBe(false);
    expect(advanceInvestigatorTokenCapacityFailureStreak(1, hardQuota)).toBe(0);
    expect(hasReachedInvestigatorTokenCapacityFailureLimit(
      MAX_CONSECUTIVE_INVESTIGATOR_TOKEN_CAPACITY_FAILURES,
      hardQuota,
    )).toBe(false);
    expect(hardQuota.trajectoryRecords[0]?.observation).toContain("upstream_quota_exhausted");
  });

  it("resets after a usable episode and ignores non-terminal or non-provider failures", () => {
    expect(advanceInvestigatorProviderUnavailableStreak(1, {
      status: "completed",
      stopReason: "MODEL_DECIDED_DONE",
      trajectoryRecords: [{ action: "web_search", observation: "observed leads" }],
    })).toBe(0);
    expect(advanceInvestigatorTokenCapacityFailureStreak(1, {
      status: "completed",
      stopReason: "MODEL_DECIDED_DONE",
      trajectoryRecords: [{ action: "web_search", observation: "observed leads" }],
    })).toBe(0);

    expect(advanceInvestigatorProviderUnavailableStreak(1, {
      status: "unavailable",
      stopReason: "LLM_UNAVAILABLE",
      trajectoryRecords: [{ action: "web_search", observation: "blocked before egress" }],
    })).toBe(0);

    expect(advanceInvestigatorProviderUnavailableStreak(1, {
      status: "failed",
      stopReason: "UNEXPECTED_ERROR",
      trajectoryRecords: [{ action: "runtime_error", observation: "runtime boundary failed" }],
    })).toBe(0);
  });

  it("normalizes an invalid prior counter before advancing", () => {
    const failure = unavailable("HTTP_503");
    expect(advanceInvestigatorProviderUnavailableStreak(Number.NaN, failure)).toBe(1);
    expect(advanceInvestigatorProviderUnavailableStreak(-2, failure)).toBe(1);
    expect(advanceInvestigatorProviderUnavailableStreak(1.8, failure)).toBe(2);
  });
});
