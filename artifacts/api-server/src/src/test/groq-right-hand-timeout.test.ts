import { afterEach, describe, expect, it } from "vitest";
import { getGroqRightHandLatencyConfig } from "../lib/groq-right-hand-reasoning";
import { getGroqTokenMaxWaitMs } from "../lib/provider-gate";

const envKeys = [
  "APEX_GROQ_TPM_MAX_WAIT_MS",
  "APEX_GROQ_RIGHT_HAND_REQUEST_TIMEOUT_MS",
  "APEX_GROQ_RIGHT_HAND_OVERALL_TIMEOUT_MS",
] as const;
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of envKeys) {
    const original = originalEnv[key];
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  }
});

describe("Groq Right-hand token-window timeout alignment", () => {
  it("allows the Right-hand request and overall deadlines to outlive the default token reset wait", () => {
    for (const key of envKeys) delete process.env[key];
    const tokenWaitMs = getGroqTokenMaxWaitMs();
    const config = getGroqRightHandLatencyConfig();

    expect(tokenWaitMs).toBe(60_000);
    expect(config.requestTimeoutMs).toBeGreaterThanOrEqual(tokenWaitMs);
    expect(config.overallTimeoutMs).toBeGreaterThanOrEqual(config.requestTimeoutMs + 30_000);
  });

  it("clamps explicit Right-hand timeouts so they cannot cancel a configured token reset wait", () => {
    process.env.APEX_GROQ_TPM_MAX_WAIT_MS = "120000";
    process.env.APEX_GROQ_RIGHT_HAND_REQUEST_TIMEOUT_MS = "30000";
    process.env.APEX_GROQ_RIGHT_HAND_OVERALL_TIMEOUT_MS = "90000";
    const config = getGroqRightHandLatencyConfig();

    expect(config.requestTimeoutMs).toBe(120_000);
    expect(config.overallTimeoutMs).toBeGreaterThanOrEqual(config.requestTimeoutMs);
  });
});
