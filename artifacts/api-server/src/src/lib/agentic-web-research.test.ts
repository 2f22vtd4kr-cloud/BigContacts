import { describe, expect, it } from "vitest";
import { groundedFindingsForTrajectory, reviewLeadFindingsForTrajectory } from "./agentic-web-research";
import { normalizeReviewLeadFindings, sourceBackedAgenticFindings } from "./bureau-agentic-pass";
import type { AgenticFinding } from "./agentic-web-research-core";

describe("model-owned review leads and claim-grade findings", () => {
  it("preserves a model-selected person lead with unknown role from a partial search execution", () => {
    const sourceUrl = "https://www.zoominfo.com/p/Jane-Doe/123";
    const finding: AgenticFinding = {
      vectorType: "linkedin",
      value: "Jane Doe",
      personName: "Jane Doe",
      role: null,
      scope: "candidate",
      sourceUrls: [sourceUrl],
      note: "Investigator-selected provisional person lead; role is not established.",
      reviewOnly: true,
    };
    const records = [{
      action: "web_search",
      execution: "partial",
      observation: "A successful provider returned a profile result; another provider timed out.",
      leadUrls: [sourceUrl],
      observedUrls: [sourceUrl],
      findings: [finding],
    }] as any;

    expect(reviewLeadFindingsForTrajectory([finding], records)).toEqual([finding]);
    expect(groundedFindingsForTrajectory([finding], records)).toEqual([]);
  });

  it("preserves model-selected organization leads without vector, auxiliary-field, or exact-span gates", () => {
    const sourceUrl = "https://northstarcasino.si/about";
    const finding: AgenticFinding = {
      vectorType: "website",
      value: "Northstar Casino Resort",
      personName: "A person mentioned in the same result",
      role: "Founder",
      scope: "organization",
      sourceUrls: [sourceUrl],
      note: "Investigator-selected provisional organization lead.",
      reviewOnly: true,
    };
    const records = [{
      action: "parallel_web_search",
      execution: "partial",
      observation: "The returned snippet is ambiguous and does not isolate an exact name span.",
      leadUrls: [sourceUrl],
      observedUrls: [sourceUrl],
      findings: [finding],
    }] as any;

    expect(reviewLeadFindingsForTrajectory([finding], records)).toEqual([finding]);
    expect(groundedFindingsForTrajectory([finding], records)).toEqual([]);
  });

  it("requires a model-selected lead URL to have appeared in a successful or partial source observation", () => {
    const finding: AgenticFinding = {
      vectorType: "linkedin",
      value: "Jane Doe",
      personName: "Jane Doe",
      role: null,
      scope: "candidate",
      sourceUrls: ["https://unobserved.example/profile"],
      note: "Investigator-selected provisional person lead.",
      reviewOnly: true,
    };
    const records = [{
      action: "web_search",
      execution: "partial",
      observation: "Search result returned from a successful provider.",
      leadUrls: ["https://other.example/profile"],
      observedUrls: ["https://other.example/profile"],
      findings: [finding],
    }] as any;

    expect(reviewLeadFindingsForTrajectory([finding], records)).toEqual([]);
  });

  it("normalizes review leads without applying claim-grade or exact-span admission rules", () => {
    const findings: AgenticFinding[] = [
      {
        vectorType: "linkedin",
        value: "Jane Doe",
        personName: "Jane Doe",
        role: null,
        scope: "candidate",
        sourceUrls: ["https://www.zoominfo.com/p/Jane-Doe/123"],
        note: "Investigator-selected provisional person lead.",
        reviewOnly: true,
      },
      {
        vectorType: "website",
        value: "Unsafe transport source",
        personName: null,
        role: null,
        scope: "organization",
        sourceUrls: ["http://example.org/company"],
        note: "Investigator-selected provisional organization lead.",
        reviewOnly: true,
      },
      {
        vectorType: "other",
        value: "Strict claim",
        personName: "Strict Claim",
        role: "CEO",
        scope: "candidate",
        sourceUrls: ["https://find-and-update.company-information.service.gov.uk/company/12345678"],
        note: "Claim-grade finding.",
      },
    ];

    const normalized = normalizeReviewLeadFindings(findings);
    expect(normalized).toHaveLength(1);
    expect(normalized[0]?.personName).toBe("Jane Doe");
    expect(normalized[0]?.role).toBeNull();
    expect(normalized[0]?.sourceUrls[0]).toContain("zoominfo.com");
  });

  it("keeps claim-grade admission separate from provisional review-card selection", () => {
    const sourceUrl = "https://find-and-update.company-information.service.gov.uk/company/12345678";
    const strictFinding: AgenticFinding = {
      vectorType: "website",
      value: "Jane Doe",
      personName: "Jane Doe",
      role: "Chief Operating Officer",
      scope: "candidate",
      sourceUrls: [sourceUrl],
      note: "The fetched official record identifies Jane Doe as Chief Operating Officer.",
      promotionDecision: "promote",
      promotionReason: "Claim-grade role evidence.",
    };
    const reviewOnlyFinding: AgenticFinding = {
      ...strictFinding,
      reviewOnly: true,
      promotionDecision: undefined,
    };
    const records = [{
      action: "visit",
      execution: "success",
      observation: "Jane Doe is identified as Chief Operating Officer in this official record.",
      observedUrls: [sourceUrl],
      leadUrls: [],
      findings: [strictFinding],
    }] as any;

    expect(sourceBackedAgenticFindings([strictFinding], [], records)).toEqual([strictFinding]);
    expect(sourceBackedAgenticFindings([reviewOnlyFinding], [], records)).toEqual([]);
    expect(normalizeReviewLeadFindings([reviewOnlyFinding])).toEqual([reviewOnlyFinding]);
  });
});
