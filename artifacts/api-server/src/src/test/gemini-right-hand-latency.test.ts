import { describe, expect, it } from "vitest";
import { getGroqRightHandLatencyConfig } from "../lib/groq-right-hand-reasoning";

describe("Groq Right-hand latency controls", () => {
  it("keeps request and overall deadlines bounded", () => {
    const config = getGroqRightHandLatencyConfig();
    expect(config.requestTimeoutMs).toBeGreaterThan(0);
    expect(config.overallTimeoutMs).toBeGreaterThanOrEqual(config.requestTimeoutMs);
    expect(config.overallTimeoutMs).toBeLessThanOrEqual(180_000);
  });
});
