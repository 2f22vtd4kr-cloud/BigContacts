import { describe, expect, it } from "vitest";
import { assessCompanyRealism, assessTargetReachability, formatReachabilityDirective } from "../src/lib/reachability-realism";

describe("model-owned targetability context", () => {
  it("does not turn a high stored wealth estimate into a deterministic research-only decision", () => {
    const assessment = assessTargetReachability({
      type: "person",
      estimatedNetWorth: 130_000_000_000,
      contactOutcome: "social_only",
      contactConfidence: 18,
      metadata: JSON.stringify({ publicProminence: true }),
      networkDegree: 0,
      gatekeeperConnections: 0,
      intermediaryConnections: 0,
    });
    const prompt = formatReachabilityDirective(assessment);

    expect(assessment.status).toBe("unassessed");
    expect(assessment.mode).toBe("model_assessment");
    expect(prompt).toContain("130000000000");
    expect(prompt).toContain("basis and accuracy have not been assessed");
    expect(prompt).toContain("No fixed wealth cutoff, score, source-count minimum");
    expect(prompt).not.toMatch(/research.only|500.?m threshold/i);
  });

  it("preserves a company observation without requiring two source domains", () => {
    const metadata = JSON.stringify({
      companyGrowthRanking: [{
        name: "Inc. 5000",
        year: 2025,
        rank: 412,
        sourceType: "ranking_publisher",
        sourceUrl: "https://ranking.example/list",
        verified: true,
      }],
    });
    const company = assessCompanyRealism({ metadata });
    const prompt = formatReachabilityDirective(assessTargetReachability({ type: "company", metadata }));

    expect(company.status).toBe("unassessed");
    expect(company.independentSourceCount).toBe(1);
    expect(company.evidence[0]?.details).toContain("Inc. 5000");
    expect(prompt).toContain("Inc. 5000");
    expect(prompt).not.toMatch(/poor.fit|at least two independent|two source domains/i);
  });

  it("does not treat a stored email as a verified person-specific route", () => {
    const prompt = formatReachabilityDirective(assessTargetReachability({
      type: "person",
      email: "office@example.org",
      contactOutcome: "organization_contact",
      gatekeeperConnections: 1,
    }));
    expect(prompt).toContain("does not establish person-specific attribution");
    expect(prompt).toContain("A missing contact route is an unresolved evidence gap");
  });

  it("does not expose private residence details in targetability context", () => {
    const prompt = formatReachabilityDirective(assessTargetReachability({
      type: "person",
      knownResidences: "PRIVATE_RESIDENCE_SENTINEL",
    }));
    expect(prompt).not.toContain("PRIVATE_RESIDENCE_SENTINEL");
  });
});
