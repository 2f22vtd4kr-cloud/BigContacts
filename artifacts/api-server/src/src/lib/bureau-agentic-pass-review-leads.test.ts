import { describe, expect, it } from "vitest";
import { normalizeReviewLeadFindings, sourceBackedAgenticFindings } from "./bureau-agentic-pass";
import type { AgenticFinding, AgenticTrajectoryRecord } from "./agentic-web-research-core";

describe("review-only Investigator leads", () => {
  it("keeps provisional leads visible to review but excludes them from evidence-backed admission", () => {
    const sourceUrl = "https://example.org/jane";
    const lead: AgenticFinding = {
      vectorType: "other",
      value: "Jane Example",
      personName: "Jane Example",
      role: "Chief Executive Officer",
      scope: "candidate",
      sourceUrls: [sourceUrl],
      note: "Named in a same-run search result; not yet verified.",
      reviewOnly: true,
      promotionDecision: "promote",
      promotionReason: "Model proposal must not bypass the evidence gate.",
    };
    const fetchedObservation: AgenticTrajectoryRecord[] = [{
      turn: 1,
      model: "test-investigator",
      turn: 1,
      model: "test-investigator",
      action: "visit",
      args: { url: sourceUrl },
      execution: "success",
      observation: "Jane Example is the Chief Executive Officer of Example Corporation.",
      observedUrls: [sourceUrl],
      findings: [],
      providerFallback: [],
    }];

    expect(normalizeReviewLeadFindings([lead])).toMatchObject([{
      personName: "Jane Example",
      reviewOnly: true,
      sourceUrls: [sourceUrl],
    }]);
    expect(sourceBackedAgenticFindings([lead], [], fetchedObservation)).toEqual([]);
    const evidenceBackedFinding: AgenticFinding = {
      vectorType: "other",
      value: "Jane Example",
      personName: "Jane Example",
      role: "Chief Executive Officer",
      scope: "candidate",
      sourceUrls: [sourceUrl],
      note: "Fetched source identifies the named person and role.",
      promotionDecision: "promote",
      promotionReason: "Same-observation identity and role support the claim.",
    };
    expect(sourceBackedAgenticFindings([evidenceBackedFinding], [], fetchedObservation)).toHaveLength(1);
  });
});
