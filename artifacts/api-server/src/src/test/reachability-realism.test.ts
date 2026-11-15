import { describe, expect, it } from "vitest";
import { assessCompanyRealism, assessTargetReachability, formatReachabilityDirective } from "../lib/reachability-realism";

describe("model-owned targetability context", () => {
  it("does not turn a high stored wealth estimate into a research-only decision", () => {
    const assessment = assessTargetReachability({
      type: "person",
      estimatedNetWorth: 1_500_000_000,
      networkDegree: 0,
      gatekeeperConnections: 0,
      intermediaryConnections: 0,
    });
    const prompt = formatReachabilityDirective(assessment);

    expect(assessment.status).toBe("unassessed");
    expect(assessment.mode).toBe("model_assessment");
    expect(prompt).toContain("1500000000");
    expect(prompt).toContain("basis and accuracy have not been assessed");
    expect(prompt).toContain("Decide whether the target and any direct, shared, assistant, organization or intermediary route matter");
    expect(prompt).not.toMatch(/research.only|practical access score|500.?m threshold/i);
    expect(prompt).not.toContain("do not keep searching");
  });

  it("does not penalize a growth-ranking observation or require two source domains", () => {
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
    const prompt = formatReachabilityDirective(assessTargetReachability({
      type: "company",
      metadata,
    }));

    expect(company.status).toBe("unassessed");
    expect(company.independentSourceCount).toBe(1);
    expect(company.evidence[0]?.details).toContain("Inc. 5000");
    expect(prompt).toContain("Inc. 5000");
    expect(prompt).not.toMatch(/poor.fit|ranking.only.*not qualified|at least two independent|two source domains/i);
    expect(prompt).toContain("No fixed wealth cutoff, score, source-count minimum, growth-ranking penalty");
  });

  it("preserves source-linked business observations without restricting metric or source class", () => {
    const metadata = JSON.stringify({
      companyScaleEvidence: [{
        metric: "active customers",
        value: 240000,
        unit: "customers",
        sourceType: "community_observation",
        sourceUrl: "https://observations.example/company",
        verified: false,
        exactQuote: "The company serves more than 240,000 customers.",
      }],
    });
    const assessment = assessCompanyRealism({ metadata });
    const prompt = formatReachabilityDirective(assessTargetReachability({ metadata, type: "company" }));

    expect(assessment.evidence).toHaveLength(1);
    expect(assessment.evidence[0]?.sourceType).toBe("community_observation");
    expect(assessment.evidence[0]?.verified).toBe(false);
    expect(assessment.sourceUrls).toEqual(["https://observations.example/company"]);
    expect(prompt).toContain("active customers");
    expect(prompt).toContain("community_observation");
    expect(prompt).toContain("https://observations.example/company");
  });

  it("does not treat a stored contact field as a verified person-specific route", () => {
    const prompt = formatReachabilityDirective(assessTargetReachability({
      type: "person",
      email: "office@example.org",
      contactOutcome: "organization_contact",
      gatekeeperConnections: 1,
    }));

    expect(prompt).toContain("A stored email field is present");
    expect(prompt).toContain("does not establish person-specific attribution");
    expect(prompt).toContain("A missing contact route is an unresolved evidence gap");
    expect(prompt).not.toContain("validated person-level direct contact is present");
    expect(prompt).not.toContain("prioritize one or two plausible intermediary routes");
  });

  it("does not expose stored residence details in targetability context", () => {
    const prompt = formatReachabilityDirective(assessTargetReachability({
      type: "person",
      knownResidences: "PRIVATE_RESIDENCE_SENTINEL",
    }));
    expect(prompt).not.toContain("PRIVATE_RESIDENCE_SENTINEL");
  });
});
