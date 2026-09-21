import { describe, expect, it } from "vitest";
import { ATLAS_CAPABILITIES, capabilityForAction, renderAtlasCapabilityGuidance } from "../lib/atlas-capability-registry";
import { assessResearchMove, diversifyPortfolio, rankPortfolioCandidate } from "../lib/atlas-research-strategy";
import { MIXED_DISCOVERY_POOL, pickAdaptiveMixedDiscoverySlots, type DiscoveryLaneFeedback } from "../lib/discovery-source-mixer";

describe("Apex Atlas capability registry", () => {
  it("documents purpose, prerequisites, complements and limitations for every capability", () => {
    expect(ATLAS_CAPABILITIES.length).toBeGreaterThanOrEqual(10);
    for (const capability of ATLAS_CAPABILITIES) {
      expect(capability.id).toBeTruthy();
      expect(capability.purpose).toBeTruthy();
      expect(capability.reveals.length).toBeGreaterThan(0);
      expect(capability.usefulWhen.length).toBeGreaterThan(0);
      expect(capability.complements.length).toBeGreaterThan(0);
      expect(capability.limitations.length).toBeGreaterThan(0);
    }
  });

  it("maps actions to multiple complementary capability families where appropriate", () => {
    expect(capabilityForAction("web_search").length).toBe(3);
    expect(capabilityForAction("registry_search").length).toBe(1);
  });

  it("renders machine-readable guidance for model context", () => {
    const guidance = renderAtlasCapabilityGuidance();
    expect(guidance).toContain("CAPABILITY search.serper");
    expect(guidance).toContain("prerequisites=");
    expect(guidance).toContain("limitations=");
  });
});

describe("Apex Atlas research strategy", () => {
  it("rewards independent, discriminating, contradiction-testing moves", () => {
    const strong = assessResearchMove({
      expectedInformationGain: 0.9,
      identityDiscrimination: 0.9,
      contactRelevance: 0.7,
      sourceIndependence: 0.9,
      successProbability: 0.8,
      cost: 0.2,
      testsContradiction: true,
    });
    const weak = assessResearchMove({
      expectedInformationGain: 0.2,
      identityDiscrimination: 0.2,
      contactRelevance: 0.2,
      sourceIndependence: 0.2,
      successProbability: 0.5,
      cost: 0.8,
      testsContradiction: false,
    });
    expect(strong.score).toBeGreaterThan(weak.score);
  });

  it("keeps portfolio selection diverse instead of simply taking the highest raw candidates", () => {
    const candidates = [
      { geography:"US", occupation:"founder", wealthMechanism:"software", reachability:0.9, sourceDiversity:0.8, uniqueness:0.9, publicFootprint:0.9 },
      { geography:"US", occupation:"founder", wealthMechanism:"software", reachability:0.89, sourceDiversity:0.8, uniqueness:0.8, publicFootprint:0.9 },
      { geography:"UK", occupation:"GP", wealthMechanism:"private equity", reachability:0.75, sourceDiversity:0.8, uniqueness:0.8, publicFootprint:0.8 },
    ];
    expect(rankPortfolioCandidate(candidates[0])).toBeGreaterThan(0);
    const selected = diversifyPortfolio(candidates, 2);
    expect(selected).toHaveLength(2);
    expect(new Set(selected.map((x) => x.geography)).size).toBe(2);
  });
});


describe("Apex Atlas adaptive discovery", () => {
  it("learns across the full eligible pool instead of only a pre-randomized slate", () => {
    const best = MIXED_DISCOVERY_POOL[MIXED_DISCOVERY_POOL.length - 1]!;
    const feedback: DiscoveryLaneFeedback[] = [{
      slotId: best.id,
      candidates: 20,
      admitted: 12,
      rejected: 8,
      usefulEvidence: 16,
      duplicateRate: 0.05,
      reachableRate: 0.9,
    }];
    const selected = pickAdaptiveMixedDiscoverySlots({
      count: 5,
      includeFaa: true,
      feedback,
      rng: () => 0.999,
    });
    expect(selected.map((slot) => slot.id)).toContain(best.id);
  });
});
