import { describe, expect, it } from "vitest";
import {
  adjudicateFinalTargetReview,
  deriveTargetResearchDisposition,
  type FinalTargetReviewInput,
} from "../lib/final-target-review";

const baseInput = (overrides: Partial<FinalTargetReviewInput> = {}): FinalTargetReviewInput => ({
  targetName: "Jane Example",
  targetType: "HNWI",
  proposedContacts: { email: "jane@example.org", phone: null, linkedin: null, instagram: null, twitter: null },
  candidates: [{
    key: "email|jane@example.org",
    vectorType: "email",
    value: "jane@example.org",
    providers: ["web"],
    sourceDomains: ["example.org"],
    sourceUrls: ["https://example.org/contact"],
    scopes: ["target_person"],
    personNames: ["Jane Example"],
    state: "verified_direct_route",
    conflictCount: 0,
    exactClaimObserved: true,
    blockedSourceUrls: [],
  }],
  evidence: [{ vectorType: "email", value: "jane@example.org", source: "web", sourceUrl: "https://example.org/contact", validationStatus: "candidate" }],
  proposedAssets: [{ category: "Business", identifier: "Example Holdings", jurisdiction: "UK", description: "Observed business identifier" }],
  ...overrides,
});

describe("final target review", () => {
  it("cannot approve an invented contact or asset", () => {
    const result = adjudicateFinalTargetReview(baseInput(), { decision: "publish", approvedContactValues: ["invented@example.org"], approvedAssetIdentifiers: ["Invented Holdings"] }, "test");
    expect(result.decision).toBe("review");
    expect(result.approvedContactValues).toEqual([]);
    expect(result.approvedAssetIdentifiers).toEqual([]);
  });

  it("accepts only an exact, attributed, conflict-free current candidate", () => {
    const result = adjudicateFinalTargetReview(baseInput(), { decision: "publish", approvedContactValues: ["jane@example.org"], approvedAssetIdentifiers: ["Example Holdings"], reasons: ["Exact claim page observed."] }, "test");
    expect(result.decision).toBe("publish");
    expect(result.approvedContactValues).toEqual(["jane@example.org"]);
    expect(result.approvedAssetIdentifiers).toEqual(["Example Holdings"]);
  });

  it("downgrades research-only targets even when a model tries to publish", () => {
    const result = adjudicateFinalTargetReview(baseInput({ reachabilityStatus: "research_only" }), { decision: "publish", approvedContactValues: ["jane@example.org"], approvedAssetIdentifiers: ["Example Holdings"] }, "test");
    expect(result.approvedContactValues).toEqual([]);
    expect(result.decision).toBe("publish");
    expect(result.approvedAssetIdentifiers).toEqual(["Example Holdings"]);
  });

  it("keeps a zero-yield review explicitly retryable", () => {
    const disposition = deriveTargetResearchDisposition({ approvedContactValues: [] });
    expect(disposition.disposition).toBe("needs_follow_up");
    expect(disposition.nextAction).toContain("another target-scoped OSINT pass");
  });

  it("marks an approved route as a completed research outcome", () => {
    const disposition = deriveTargetResearchDisposition({ approvedContactValues: ["jane@example.org"] });
    expect(disposition.disposition).toBe("contact_route_found");
    expect(disposition.nextAction.toLowerCase()).toContain("approved");
  });

  it("lets the model promote related SEC address material without inventing", () => {
    const result = adjudicateFinalTargetReview(baseInput({
      candidates: [{
        key: "address|2099 Pennsylvania",
        vectorType: "address",
        value: "2099 Pennsylvania Avenue NW, Washington, DC 20006",
        providers: ["edgar"],
        sourceDomains: ["sec.gov"],
        sourceUrls: ["https://www.sec.gov/example"],
        scopes: ["target_person"],
        personNames: ["Frank H Pearl"],
        state: "source_linked",
        conflictCount: 0,
        exactClaimObserved: true,
        blockedSourceUrls: [],
      }],
      evidence: [{ vectorType: "address", value: "2099 Pennsylvania Avenue NW, Washington, DC 20006", source: "edgar", sourceUrl: "https://www.sec.gov/example", validationStatus: "candidate" }],
    }), {
      decision: "publish",
      approvedContactValues: [],
      approvedRelatedValues: ["2099 Pennsylvania Avenue NW, Washington, DC 20006"],
      relatedDescriptions: ["SEC reporting address"],
      cardSummary: "Frank H. Pearl is tied to Perseus via SEC beneficial ownership filings.",
      roleHeadline: "10% owner / Perseus control person",
      reasons: ["Exact address from SEC filing evidence."],
    }, "test");
    expect(result.decision).toBe("publish");
    expect(result.approvedRelatedValues).toEqual(["2099 Pennsylvania Avenue NW, Washington, DC 20006"]);
    expect(result.roleHeadline).toContain("Perseus");
    expect(result.cardSummary).toContain("Pearl");
  });
});
