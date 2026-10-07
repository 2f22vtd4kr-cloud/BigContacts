import { afterEach, describe, expect, it } from "vitest";
import { getGroqBossLatencyConfig } from "./groq-boss";
import { getGroqRightHandLatencyConfig } from "./groq-right-hand-reasoning";

const ENV_NAMES = [
  "APEX_GROQ_BOSS_REQUEST_TIMEOUT_MS",
  "APEX_GROQ_BOSS_OVERALL_TIMEOUT_MS",
  "APEX_GROQ_RIGHT_HAND_REQUEST_TIMEOUT_MS",
  "APEX_GROQ_RIGHT_HAND_OVERALL_TIMEOUT_MS",
] as const;

afterEach(() => {
  for (const name of ENV_NAMES) delete process.env[name];
});

describe("Apex control-plane latency configuration", () => {
  it("keeps Groq Right-hand overall timeout bounded and above request timeout", () => {
    process.env.APEX_GROQ_RIGHT_HAND_REQUEST_TIMEOUT_MS = "10000";
    process.env.APEX_GROQ_RIGHT_HAND_OVERALL_TIMEOUT_MS = "55000";
    expect(getGroqRightHandLatencyConfig()).toEqual({
      requestTimeoutMs: 10000,
      overallTimeoutMs: 55000,
      minimumOverallTimeoutMs: 10000,
      overallTimeoutClamped: false,
    });
  });

  it("keeps Groq Boss overall timeout bounded and above request timeout", () => {
    process.env.APEX_GROQ_BOSS_REQUEST_TIMEOUT_MS = "10000";
    process.env.APEX_GROQ_BOSS_OVERALL_TIMEOUT_MS = "55000";
    expect(getGroqBossLatencyConfig()).toMatchObject({
      requestTimeoutMs: 10000,
      overallTimeoutMs: 55000,
      maximumPromptChars: 20000,
    });
  });

  it("preserves higher operator-configured recovery budgets within provider bounds", () => {
    process.env.APEX_GROQ_RIGHT_HAND_OVERALL_TIMEOUT_MS = "150000";
    process.env.APEX_GROQ_BOSS_OVERALL_TIMEOUT_MS = "150000";
    expect(getGroqRightHandLatencyConfig().overallTimeoutMs).toBe(150000);
    expect(getGroqBossLatencyConfig().overallTimeoutMs).toBe(150000);
  });

  it("clamps request and overall timeouts to their implementation bounds", () => {
    process.env.APEX_GROQ_RIGHT_HAND_REQUEST_TIMEOUT_MS = "1000";
    process.env.APEX_GROQ_RIGHT_HAND_OVERALL_TIMEOUT_MS = "1000";
    process.env.APEX_GROQ_BOSS_REQUEST_TIMEOUT_MS = "1000";
    process.env.APEX_GROQ_BOSS_OVERALL_TIMEOUT_MS = "1000";

    const rightHand = getGroqRightHandLatencyConfig();
    const groq = getGroqBossLatencyConfig();
    expect(rightHand.requestTimeoutMs).toBe(5000);
    expect(rightHand.overallTimeoutMs).toBe(5000);
    expect(rightHand.overallTimeoutClamped).toBe(true);
    expect(groq.requestTimeoutMs).toBe(5000);
    expect(groq.overallTimeoutMs).toBe(30000);
  });
});
