import { describe, expect, it } from "vitest";
import { getMistralRightHandLatencyConfig } from "../lib/groq-right-hand-reasoning";

describe("Mistral Right-hand latency controls", () => {
  it("keeps request and overall deadlines bounded", () => {
    const config = getMistralRightHandLatencyConfig();
    expect(config.requestTimeoutMs).toBeGreaterThan(0);
    expect(config.overallTimeoutMs).toBeGreaterThanOrEqual(config.requestTimeoutMs);
    expect(config.overallTimeoutMs).toBeLessThanOrEqual(180_000);
  });
});
