import { describe, expect, it } from "vitest";
import { assessResearchFrontier, scoreResearchAction, scoreSourceIndependence } from "./research-policy";

describe("Research policy", () => {
  it("scores source independence and frontier priorities", () => {
    expect(scoreSourceIndependence({ sourceHosts: ["a.example", "b.example"], sourceClasses: ["REGISTRY", "NEWS"] })).toBeGreaterThan(0.5);
    expect(scoreSourceIndependence({ sourceHosts: ["a.example"], sourceClasses: ["NEWS"], repeatedFamilyCount: 5 })).toBeLessThan(0.6);

    const falsify = assessResearchFrontier({
      sourceFamilyDiversity: 2,
      repeatedSourceFamilies: 4,
      evidenceCount: 8,
      unresolvedQuestions: 1,
      contradictions: 2,
      contactCount: 0,
    });
    expect(falsify.nextMovePriority).toBe("falsify");
    expect(falsify.reasons.length).toBeGreaterThan(0);

    const verify = assessResearchFrontier({
      sourceFamilyDiversity: 3,
      repeatedSourceFamilies: 0,
      evidenceCount: 6,
      unresolvedQuestions: 3,
      contradictions: 0,
      contactCount: 0,
    });
    expect(verify.nextMovePriority).toBe("verify");
  });

  it("scores useful independent actions above duplicates and high-cost equivalents", () => {
    const contact = scoreResearchAction({
      expectedInformationGain: 0.8,
      successProbability: 0.7,
      sourceIndependence: 0.9,
      contradictionValue: 0.2,
      contactRelevance: 1,
      cost: 0.2,
    });
    const duplicate = scoreResearchAction({
      expectedInformationGain: 0.8,
      successProbability: 0.7,
      sourceIndependence: 0.1,
      contradictionValue: 0,
      contactRelevance: 0.4,
      cost: 0.2,
    });
    expect(contact).toBeGreaterThan(duplicate);

    const lowCost = scoreResearchAction({ expectedInformationGain: 0.7, sourceIndependence: 0.8, cost: 0.1 });
    const highCost = scoreResearchAction({ expectedInformationGain: 0.7, sourceIndependence: 0.8, cost: 0.9 });
    expect(lowCost).toBeGreaterThan(highCost);
  });
});
