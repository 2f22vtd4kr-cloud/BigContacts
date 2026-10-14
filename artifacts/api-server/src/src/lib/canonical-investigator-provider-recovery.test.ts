import { describe, expect, it } from "vitest";
import {
  advanceInvestigatorProviderUnavailableStreak,
  isInvestigatorProviderUnavailableEpisode,
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

  it("counts other actual Investigator provider failures without treating them as quota exhaustion", () => {
    const failure = unavailable("INVESTIGATOR_PROVIDER_ERROR upstream_rate_limited");
    expect(isInvestigatorProviderUnavailableEpisode(failure)).toBe(true);
    expect(advanceInvestigatorProviderUnavailableStreak(0, failure)).toBe(1);
    expect(failure.trajectoryRecords[0]?.observation).not.toContain("upstream_quota_exhausted");
  });

  it("resets after a usable episode and ignores non-terminal or non-provider failures", () => {
    expect(advanceInvestigatorProviderUnavailableStreak(1, {
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
