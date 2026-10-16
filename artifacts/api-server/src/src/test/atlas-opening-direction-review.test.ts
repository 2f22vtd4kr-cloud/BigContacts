import { describe, expect, it } from "vitest";
import {
  ATLAS_OPENING_RIGHT_HAND_REVIEW_RESPONSE_FORMAT,
  validateAtlasOpeningRightHandReview,
} from "../lib/atlas-control-decision";

describe("explicit Atlas opening approval", () => {
  const observedRun07Narrative = "Boss's proposed search strategy aligns with the objective, but refine criteria to ensure wealth potential and viable contact routes.";
  const base = {
    approval: "approve",
    decision: observedRun07Narrative,
    reason: "The first proposed direction is within scope as a bounded hypothesis.",
    focusLanes: ["Verify named owners in a relevant public source"],
    confidence: 0.86,
  };

  it("accepts explicit approval separately from the free-form narrative", () => {
    expect(validateAtlasOpeningRightHandReview(base)).toBe(true);
    expect(ATLAS_OPENING_RIGHT_HAND_REVIEW_RESPONSE_FORMAT.schema.properties.approval).toEqual({
      type: "string",
      enum: ["approve", "reject"],
    });
  });

  it("fails closed when approval is missing or is not an exact enum", () => {
    const { approval: _approval, ...missingApproval } = base;
    expect(validateAtlasOpeningRightHandReview(missingApproval)).toBe(false);
    expect(validateAtlasOpeningRightHandReview({ ...base, approval: "Boss agrees" })).toBe(false);
    expect(validateAtlasOpeningRightHandReview({ ...base, approval: null })).toBe(false);
  });

  it("accepts an explicit rejection with the same narrative field and keeps the decision fields separate", () => {
    expect(validateAtlasOpeningRightHandReview({ ...base, approval: "reject" })).toBe(true);
  });
});
