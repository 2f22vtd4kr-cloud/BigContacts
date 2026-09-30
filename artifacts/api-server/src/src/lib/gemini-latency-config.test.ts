import { afterEach, describe, expect, it } from "vitest";
import { getGeminiBossLatencyConfig } from "./case-bureau";
import { getGeminiRightHandLatencyConfig } from "./gemini-right-hand-reasoning";

const ENV_NAMES = [
  "APEX_GEMINI_BOSS_REQUEST_TIMEOUT_MS",
  "APEX_GEMINI_BOSS_OVERALL_TIMEOUT_MS",
  "APEX_GEMINI_RIGHT_HAND_REQUEST_TIMEOUT_MS",
  "APEX_GEMINI_RIGHT_HAND_OVERALL_TIMEOUT_MS",
] as const;

afterEach(() => {
  for (const name of ENV_NAMES) delete process.env[name];
});

describe("Gemini latency configuration", () => {
  it("does not allow a stale Right-hand overall timeout to defeat the retry recovery budget", () => {
    process.env.APEX_GEMINI_RIGHT_HAND_OVERALL_TIMEOUT_MS = "55000";
    const config = getGeminiRightHandLatencyConfig();

    expect(config.overallTimeoutMs).toBe(300_000);
    expect(config.minimumOverallTimeoutMs).toBe(300_000);
    expect(config.overallTimeoutClamped).toBe(true);
  });

  it("does not allow a stale Boss overall timeout to defeat the retry recovery budget", () => {
    process.env.APEX_GEMINI_BOSS_OVERALL_TIMEOUT_MS = "55000";
    const config = getGeminiBossLatencyConfig();

    expect(config.overallTimeoutMs).toBe(240_000);
    expect(config.minimumOverallTimeoutMs).toBe(240_000);
    expect(config.overallTimeoutClamped).toBe(true);
  });

  it("preserves higher operator-configured recovery budgets", () => {
    process.env.APEX_GEMINI_RIGHT_HAND_OVERALL_TIMEOUT_MS = "330000";
    process.env.APEX_GEMINI_BOSS_OVERALL_TIMEOUT_MS = "280000";

    expect(getGeminiRightHandLatencyConfig()).toMatchObject({
      overallTimeoutMs: 330_000,
      overallTimeoutClamped: false,
    });
    expect(getGeminiBossLatencyConfig()).toMatchObject({
      overallTimeoutMs: 280_000,
      overallTimeoutClamped: false,
    });
  });

  it("keeps request timeout bounds independent from the recovery floor", () => {
    process.env.APEX_GEMINI_RIGHT_HAND_REQUEST_TIMEOUT_MS = "5000";
    process.env.APEX_GEMINI_RIGHT_HAND_OVERALL_TIMEOUT_MS = "55000";
    process.env.APEX_GEMINI_BOSS_REQUEST_TIMEOUT_MS = "5000";
    process.env.APEX_GEMINI_BOSS_OVERALL_TIMEOUT_MS = "55000";

    expect(getGeminiRightHandLatencyConfig()).toMatchObject({
      requestTimeoutMs: 10_000,
      overallTimeoutMs: 300_000,
      overallTimeoutClamped: true,
    });
    expect(getGeminiBossLatencyConfig()).toMatchObject({
      requestTimeoutMs: 10_000,
      overallTimeoutMs: 240_000,
      overallTimeoutClamped: true,
    });
  });
});
