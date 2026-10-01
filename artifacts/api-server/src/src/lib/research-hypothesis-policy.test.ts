import { describe, expect, it } from "vitest";
import { evidenceLogOddsContribution, updateHypothesisPosterior } from "./research-hypothesis-policy";

describe("research hypothesis policy", () => {
  it("weights independent authoritative support positively", () => {
    const weak = evidenceLogOddsContribution({ direction: "support", sourceReliability: 0.4, sourceIndependence: 0.2, identitySpecificity: 0.3 });
    const strong = evidenceLogOddsContribution({ direction: "support", sourceReliability: 0.9, sourceIndependence: 0.9, identitySpecificity: 0.9 });
    expect(strong).toBeGreaterThan(weak);
  });
  it("lets contradiction reduce the posterior score", () => {
    const posterior = updateHypothesisPosterior(0.8, [
      { direction: "support", sourceReliability: 0.9, sourceIndependence: 0.9, identitySpecificity: 0.9 },
      { direction: "contradict", sourceReliability: 0.9, sourceIndependence: 0.9, identitySpecificity: 0.9 },
      { direction: "contradict", sourceReliability: 0.9, sourceIndependence: 0.9, identitySpecificity: 0.9 },
    ]);
    expect(posterior.score).toBeLessThan(0.8);
    expect(posterior.contradictionWeight).toBeGreaterThan(0);
  });
});
