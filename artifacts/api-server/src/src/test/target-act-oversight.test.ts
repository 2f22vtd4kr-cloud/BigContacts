import { describe, expect, it } from "vitest";
import { shouldReviewTargetActWithRightHand } from "../lib/target-act-oversight";

describe("target act Right-hand review economy", () => {
  it("defers ordinary successful research actions", () => {
    expect(shouldReviewTargetActWithRightHand({
      action: "web_search",
      findings: [],
    })).toBe(false);
    expect(shouldReviewTargetActWithRightHand({
      action: "visit",
      findings: [],
    }, "continue")).toBe(false);
  });

  it("reviews a proposed terminal decision", () => {
    expect(shouldReviewTargetActWithRightHand({
      action: "done",
      execution: "success",
      stopReason: "MODEL_DECIDED_DONE",
      findings: [],
    })).toBe(true);
    expect(shouldReviewTargetActWithRightHand({
      action: "done",
      execution: "blocked",
      findings: [],
    })).toBe(false);
  });

  it("reviews candidate admission and explicit promotion decisions", () => {
    expect(shouldReviewTargetActWithRightHand({
      action: "web_search",
      findings: [{ scope: "candidate", personName: "Jane Example", value: "Jane Example" }],
    })).toBe(true);
    expect(shouldReviewTargetActWithRightHand({
      action: "visit",
      findings: [{ scope: "organization", value: "shared inbox at Example Ltd" }],
    })).toBe(false);
    expect(shouldReviewTargetActWithRightHand({
      action: "visit",
      findings: [{ promotionDecision: "promote" }],
    })).toBe(true);
  });

  it("reviews unresolved identity and material contradictions", () => {
    expect(shouldReviewTargetActWithRightHand({
      action: "visit",
      findings: [{ identityAssessment: "unresolved", personName: "Jane Example" }],
    })).toBe(true);
    expect(shouldReviewTargetActWithRightHand({
      action: "visit",
      findings: [{ identityAssessment: "different_people" }],
    })).toBe(true);
    expect(shouldReviewTargetActWithRightHand({
      action: "visit",
      findings: [{ hypothesisRelation: "contradicts" }],
    })).toBe(true);
    expect(shouldReviewTargetActWithRightHand({
      action: "visit",
      findings: [{ hypothesisRelation: "ambiguous" }],
    })).toBe(true);
  });

  it("reviews the first Investigator act after a Boss-authorized strategic redirect", () => {
    expect(shouldReviewTargetActWithRightHand({
      action: "web_search",
      execution: "success",
      findings: [],
    }, "redirect")).toBe(true);
    expect(shouldReviewTargetActWithRightHand({
      action: "web_search",
      findings: [],
    }, "continue")).toBe(false);
  });
});
