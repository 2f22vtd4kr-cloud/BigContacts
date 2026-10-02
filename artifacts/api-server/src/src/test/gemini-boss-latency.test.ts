import { describe, expect, it } from "vitest";
import { getGroqBossLatencyConfig } from "../lib/groq-boss";

describe("Groq Boss latency controls", () => {
  it("keeps request and overall deadlines bounded", () => {
    const config = getGroqBossLatencyConfig();
    expect(config.requestTimeoutMs).toBeGreaterThan(0);
    expect(config.overallTimeoutMs).toBeGreaterThanOrEqual(config.requestTimeoutMs);
    expect(config.overallTimeoutMs).toBeLessThanOrEqual(300_000);
  });
});
