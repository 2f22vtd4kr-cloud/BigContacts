import { describe, expect, it } from "vitest";
import { assessTargetReachability, formatReachabilityDirective } from "../lib/reachability-realism";

describe("target reachability realism", () => {
  it("bounds a Buffett-like prominent isolated target before expensive research", () => {
    const result = assessTargetReachability({
      type: "HNWI",
      estimatedNetWorth: 130_000_000_000,
      contactOutcome: "social_only",
      contactConfidence: 18,
      metadata: JSON.stringify({ publicProminence: true }),
      networkDegree: 0,
      gatekeeperConnections: 0,
      intermediaryConnections: 0,
    });

    expect(result.status).toBe("research_only");
    expect(result.mode).toBe("research_only");
    expect(result.score).toBeLessThan(20);
  });

  it("keeps a validated direct vector on the normal research path", () => {
    const result = assessTargetReachability({
      type: "HNWI",
      estimatedNetWorth: 2_000_000_000,
      email: "principal@familyoffice.example",
      phone: "+14155552671",
      contactOutcome: "direct_contact_verified",
      metadata: JSON.stringify({ publicProminence: true }),
      networkDegree: 0,
    });

    expect(result.status).toBe("direct");
    expect(result.mode).toBe("full");
    expect(result.hasDirectContact).toBe(true);
  });

  it("uses a corroborated intermediary path without claiming direct access", () => {
    const result = assessTargetReachability({
      type: "HNWI",
      estimatedNetWorth: 800_000_000,
      contactOutcome: "none",
      metadata: JSON.stringify({ publicProminence: true }),
      networkDegree: 1,
      gatekeeperConnections: 1,
      intermediaryConnections: 1,
    });

    expect(result.status).toBe("intermediary");
    expect(result.mode).toBe("full");
    expect(result.hasDirectContact).toBe(false);
    expect(result.hasIntermediaryPath).toBe(true);
  });

  it("does not treat a social-only celebrity as reachable", () => {
    const result = assessTargetReachability({
      type: "HNWI",
      estimatedNetWorth: 400_000_000,
      contactOutcome: "social_only",
      instagramHandle: "publicprofile",
      metadata: JSON.stringify({ prominence: "high" }),
      networkDegree: 0,
    });

    expect(result.hasDirectContact).toBe(false);
    expect(result.hasIntermediaryPath).toBe(false);
    expect(result.status).toBe("research_only");
  });

  it("never creates access from fame or wealth alone", () => {
    const result = assessTargetReachability({
      type: "HNWI",
      estimatedNetWorth: 10_000_000_000,
      metadata: JSON.stringify({ publicProminence: true }),
      networkDegree: 0,
    });

    expect(result.hasDirectContact).toBe(false);
    expect(result.hasIntermediaryPath).toBe(false);
    expect(result.status).toBe("research_only");
  });

  it("does not infer public prominence from unstructured notes or registry labels", () => {
    const result = assessTargetReachability({
      type: "PersonCandidate",
      estimatedNetWorth: 100_000_000,
      contactOutcome: "social_only",
      sourceRegistries: "Reuters coverage; celebrity director registry",
      notes: "A registry note mentions Bloomberg, Reuters and a public figure.",
      metadata: JSON.stringify({ wealthStatus: "unverified" }),
      networkDegree: 0,
      gatekeeperConnections: 0,
      intermediaryConnections: 0,
    });

    expect(result.publicProminenceSignal).toBe(false);
    expect(result.status).toBe("bounded");
    expect(result.mode).toBe("targeted");
    expect(result.hasDirectContact).toBe(false);
    expect(result.hasIntermediaryPath).toBe(false);
  });

  it("does not treat a registry phone as validated personal access", () => {
    const result = assessTargetReachability({
      type: "HNWI",
      phone: "+15166087000",
      phoneSource: "EDGAR-Phone",
      contactOutcome: "organization_contact",
      knownResidences: "Port Washington, NY",
      metadata: JSON.stringify({ publicProminence: true }),
    });

    expect(result.hasDirectContact).toBe(false);
    expect(result.status).toBe("bounded");
    expect(result.reasons).not.toContain("validated person-level direct contact is present");
    expect(result.blockers).toContain("organization contact is not personal access to the individual");
  });

  it("treats an Inc. 5000 listing as a company discovery lead, not a qualified material company", () => {
    const result = assessTargetReachability({
      type: "Corporation",
      metadata: JSON.stringify({
        registrantTypeCode: "3",
        companyGrowthRanking: {
          name: "Inc. 5000",
          rank: 120,
          year: 2025,
          sourceUrl: "https://www.inc.com/profile/example-company",
          sourceType: "ranking_publisher",
          verified: true,
        },
      }),
      networkDegree: 0,
    });

    expect(result.companyAssessment?.status).toBe("growth_signal_lead");
    expect(result.companyAssessment?.hasGrowthRankingSignal).toBe(true);
    expect(result.companyAssessment?.hasSourceBackedScale).toBe(false);
    expect(result.mode).toBe("targeted");
    expect(result.hasDirectContact).toBe(false);
    expect(result.ultraWealthSignal).toBe(false);
    expect(formatReachabilityDirective(result)).toContain("ranking-only mentions are leads, not qualified targets");
    expect(formatReachabilityDirective(result)).toContain("Company growth is not owner wealth");
  });

  it("requires independent source-backed scale, legal status, ownership and an official route for full company realism", () => {
    const result = assessTargetReachability({
      type: "Corporation",
      contactOutcome: "organization_contact",
      metadata: JSON.stringify({
        companyScaleEvidence: [
          { metric: "employees", value: 1500, sourceUrl: "https://company.example/about", sourceType: "official_company", verified: true },
          { metric: "revenue", value: 250000000, sourceUrl: "https://filings.example/annual-report", sourceType: "official_filing", verified: true },
        ],
        companyRegistryEvidence: [
          { status: "active", sourceUrl: "https://registry.example/company/123", sourceType: "official_registry", verified: true },
        ],
        companyOwnershipEvidence: [
          { sourceUrl: "https://filings.example/ownership", sourceType: "official_filing", verified: true },
        ],
        companyRouteEvidence: [
          { type: "contact_page", sourceUrl: "https://company.example/contact", sourceType: "official_company", verified: true },
        ],
        officialWebsiteVerified: true,
        officialWebsiteSourceUrl: "https://company.example",
      }),
    });

    expect(result.companyAssessment?.status).toBe("materiality_evidenced");
    expect(result.companyAssessment?.score).toBe(100);
    expect(result.companyAssessment?.independentSourceCount).toBeGreaterThanOrEqual(2);
    expect(result.companyAssessment?.hasOwnershipControlEvidence).toBe(true);
    expect(result.companyAssessment?.hasOfficialBusinessRoute).toBe(true);
    expect(result.mode).toBe("full");
    expect(result.hasDirectContact).toBe(false);
    expect(formatReachabilityDirective(result)).toContain("organization-level reachability, not personal access");
  });

  it("does not promote FAA company registrants or unstructured Inc. 5000 mentions into materiality", () => {
    const result = assessTargetReachability({
      type: "Corporation",
      notes: "This company was mentioned near an Inc. 5000 story.",
      sourceRegistries: "FAA Releasable Aircraft Database",
      metadata: JSON.stringify({
        registrantTypeCode: "3",
        identityStatus: "legal_entity_candidate",
        beneficialOwnershipStatus: "unresolved",
        wealthStatus: "not_assessed",
      }),
    });

    expect(result.companyAssessment?.status).toBe("unverified");
    expect(result.companyAssessment?.hasGrowthRankingSignal).toBe(false);
    expect(result.companyAssessment?.hasSourceBackedScale).toBe(false);
    expect(result.mode).toBe("research_only");
    expect(result.ultraWealthSignal).toBe(false);
  });
});