import { describe, expect, it } from "vitest";
import {
  CONTINUATION_RIGHT_HAND_RESPONSE_FORMAT,
  validateContinuationRightHand,
  validateContinuationRightHandRaw,
} from "../lib/canonical-continuation-right-hand-contract";

describe("canonical continuation Right-hand contract", () => {
  const valid = {
    decision: "continue",
    reason: "The case needs evidence before a target can be promoted.",
    focusLanes: ["Regional private manufacturers", "Family-owned service firms"],
    confidence: 0.7,
  };

  it("accepts the numeric-confidence contract used by the recovery route", () => {
    expect(validateContinuationRightHand(valid)).toBe(true);
    expect(validateContinuationRightHandRaw(JSON.stringify(valid))).toBe(true);
  });

  it("rejects verbal confidence labels instead of silently coercing them", () => {
    expect(validateContinuationRightHand({ ...valid, confidence: "medium" })).toBe(false);
    expect(validateContinuationRightHandRaw(JSON.stringify({ ...valid, confidence: "medium" }))).toBe(false);
  });

  it("rejects undocumented decisions, missing fields, extra fields, and out-of-range confidence", () => {
    expect(validateContinuationRightHand({ ...valid, decision: "continue_discovery" })).toBe(false);
    expect(validateContinuationRightHand({ decision: "continue", reason: "Review" })).toBe(false);
    expect(validateContinuationRightHand({ ...valid, ignored: true })).toBe(false);
    expect(validateContinuationRightHand({ ...valid, confidence: 1.1 })).toBe(false);
  });

  it("declares the same required fields and numeric confidence range as the runtime validator", () => {
    expect(CONTINUATION_RIGHT_HAND_RESPONSE_FORMAT.schema.required)
      .toEqual(["decision", "reason", "focusLanes", "confidence"]);
    expect(CONTINUATION_RIGHT_HAND_RESPONSE_FORMAT.schema.properties.decision.enum)
      .toEqual(["continue", "redirect", "stop"]);
    expect(CONTINUATION_RIGHT_HAND_RESPONSE_FORMAT.schema.properties.confidence)
      .toEqual({ type: "number", minimum: 0, maximum: 1 });
  });
});
