import { describe, expect, it } from "vitest";
import { deriveRegistryIngestionAssessment } from "../lib/registry-ingestion-policy";

describe("public-registry evidence remains a low-confidence lead", () => {
  it("does not turn a filing/officer record into a strong person prior or reachability claim", () => {
    expect(deriveRegistryIngestionAssessment("PersonCandidate", new Date("2026-10-09T07:30:00.000Z"))).toEqual({
      prior: 0.15,
      hasRecentActivity: false,
      recentActivityDays: 400,
      proximityScore: 3,
      confidence: "LOW",
      lastObservedAt: "2026-10-09T07:30:00.000Z",
      reviewOnly: true,
      wealthStatus: "unverified",
    });
  });

  it("defensively neutralizes legacy HNWI/Gatekeeper labels in registry ingestion", () => {
    for (const type of ["HNWI", "Gatekeeper"]) {
      const assessment = deriveRegistryIngestionAssessment(type);
      expect(assessment.prior).toBe(0.15);
      expect(assessment.hasRecentActivity).toBe(false);
      expect(assessment.proximityScore).toBe(3);
      expect(assessment.confidence).toBe("LOW");
      expect(assessment.reviewOnly).toBe(true);
      expect(assessment.wealthStatus).toBe("unverified");
    }
  });

  it("does not treat a registry fetch as recent underlying activity", () => {
    const assessment = deriveRegistryIngestionAssessment("Corporation");
    expect(assessment.hasRecentActivity).toBe(false);
    expect(assessment.recentActivityDays).toBe(400);
    expect(assessment.lastObservedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(assessment.wealthStatus).toBe("not_assessed");
  });
});
