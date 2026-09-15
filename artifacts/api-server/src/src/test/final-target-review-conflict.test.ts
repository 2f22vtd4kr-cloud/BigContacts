import { describe, expect, it } from "vitest";
import { adjudicateFinalTargetReview } from "../lib/final-target-review";

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    key: "email|conflicted@example.com",
    vectorType: "email",
    value: "conflicted@example.com",
    providers: ["provider-a"],
    sourceDomains: ["example.com"],
    sourceUrls: ["https://example.com/profile"],
    scopes: ["target_person"],
    personNames: ["Jane Example"],
    state: "attribution_review",
    conflictCount: 1,
    exactClaimObserved: true,
    blockedSourceUrls: [],
    ...overrides,
  };
}

const baseInput = {
  targetName: "Jane Example",
  targetType: "person",
  proposedContacts: {},
  evidence: [],
  proposedAssets: [],
  reachabilityStatus: "direct",
};

describe("final target review conflict fencing", () => {
  it("cannot bypass contact conflict fencing through related publication", () => {
    const result = adjudicateFinalTargetReview(
      { ...baseInput, candidates: [candidate()] },
      {
        decision: "publish",
        approvedContactValues: [],
        approvedRelatedValues: ["conflicted@example.com"],
        relatedDescriptions: ["conflicted email"],
      },
      "test-reviewer",
    );

    expect(result.approvedContactValues).toEqual([]);
    expect(result.approvedRelatedValues).toEqual([]);
    expect(result.decision).toBe("review");
  });

  it("still permits a non-conflicted related role", () => {
    const result = adjudicateFinalTargetReview(
      {
        ...baseInput,
        candidates: [candidate({ conflictCount: 0, vectorType: "role", value: "Director" })],
      },
      {
        decision: "publish",
        approvedRelatedValues: ["Director"],
        relatedDescriptions: ["role"],
      },
      "test-reviewer",
    );

    expect(result.approvedRelatedValues).toEqual(["Director"]);
    expect(result.decision).toBe("publish");
  });
});
