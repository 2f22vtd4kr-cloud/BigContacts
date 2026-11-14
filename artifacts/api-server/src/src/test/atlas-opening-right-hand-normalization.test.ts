import { describe, expect, it } from "vitest";
import { normalizeAtlasOpeningRightHandReview } from "../lib/atlas-control-decision";

describe("Atlas opening Right-hand advisory normalization", () => {
  it("accepts the observed rationale alias and high confidence label", () => {
    expect(normalizeAtlasOpeningRightHandReview({
      decision: "proceed",
      rationale: "Public web discovery is available for the human objective.",
      focusLanes: ["public_web"],
      confidence: "high",
    })).toEqual({
      decision: "proceed",
      reason: "Public web discovery is available for the human objective.",
      focusLanes: ["public_web"],
      confidence: 0.75,
    });
  });

  it("maps only the documented confidence labels", () => {
    for (const [label, expected] of [["low", 0.25], ["medium", 0.5], ["high", 0.75]] as const) {
      expect(normalizeAtlasOpeningRightHandReview({
        decision: "review",
        reason: "Advisory only.",
        focusLanes: [],
        confidence: label,
      })?.confidence).toBe(expected);
    }
  });

  it("preserves valid numeric confidence without coercion", () => {
    expect(normalizeAtlasOpeningRightHandReview({
      decision: "proceed",
      reason: "Advisory only.",
      focusLanes: ["registry:gleif", "public_web"],
      confidence: 0.73,
    })?.confidence).toBe(0.73);
  });

  it("rejects conflicting aliases, unknown fields, and invalid confidence", () => {
    const base = {
      decision: "proceed",
      reason: "Use public web.",
      focusLanes: ["public_web"],
      confidence: 0.7,
    };
    expect(normalizeAtlasOpeningRightHandReview({ ...base, rationale: "Use a registry." })).toBeNull();
    expect(normalizeAtlasOpeningRightHandReview({ ...base, unexpected: true })).toBeNull();
    expect(normalizeAtlasOpeningRightHandReview({ ...base, confidence: "certain" })).toBeNull();
    expect(normalizeAtlasOpeningRightHandReview({ ...base, confidence: 1.1 })).toBeNull();
  });
});
