import { describe, expect, it } from "vitest";
import { normalizeTargetRightHandAdvice } from "../lib/target-control-decision";

const validReview = {
  decision: "continue",
  reason: "One material identity question remains unresolved.",
  focusLanes: ["official records", "independent corroboration"],
  confidence: 0.75,
};

describe("target continuation Right-hand review contract", () => {
  it("accepts a complete valid review and normalizes its bounded fields", () => {
    const normalized = normalizeTargetRightHandAdvice({
      status: "completed",
      raw: JSON.stringify({ ...validReview, decision: " continue ", reason: " reason " }),
      model: "openai/gpt-oss-120b",
      error: null,
    });

    expect(normalized).toEqual({
      status: "completed",
      decision: "continue",
      reason: "reason",
      focusLanes: ["official records", "independent corroboration"],
      confidence: 0.75,
      model: "openai/gpt-oss-120b",
      error: null,
    });
  });

  it.each([
    ["empty object", "{}"],
    ["empty array", "[]"],
    ["missing required fields", JSON.stringify({ decision: "continue", reason: "not enough" })],
    ["unexpected fields", JSON.stringify({ ...validReview, extra: "not permitted" })],
    ["invalid confidence", JSON.stringify({ ...validReview, confidence: 1.2 })],
    ["wrong focus lane type", JSON.stringify({ ...validReview, focusLanes: ["valid", 42] })],
    ["empty decision", JSON.stringify({ ...validReview, decision: " " })],
    ["oversized reason", JSON.stringify({ ...validReview, reason: "r".repeat(1_201) })],
  ])("fails closed for %s", (_label, raw) => {
    const normalized = normalizeTargetRightHandAdvice({
      status: "completed",
      raw,
      model: "openai/gpt-oss-120b",
      error: null,
    });

    expect(normalized.status).toBe("unavailable");
    expect(normalized.decision).toBeNull();
    expect(normalized.reason).toBeNull();
    expect(normalized.focusLanes).toEqual([]);
    expect(normalized.confidence).toBeNull();
    expect(normalized.error).toBe("Groq Right-hand returned an invalid review contract.");
  });

  it("does not let syntactically valid output override a provider failure", () => {
    const normalized = normalizeTargetRightHandAdvice({
      status: "unavailable",
      raw: JSON.stringify(validReview),
      model: "openai/gpt-oss-120b",
      error: "upstream_rate_limited",
    });

    expect(normalized.status).toBe("unavailable");
    expect(normalized.decision).toBeNull();
    expect(normalized.error).toBe("upstream_rate_limited");
  });
});
