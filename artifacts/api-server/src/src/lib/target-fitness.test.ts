import { describe, expect, it } from "vitest";
import { evaluateTargetFitness, shouldRejectTarget, suggestReframe } from "./target-fitness";

describe("legacy target fitness adapter", () => {
  it("does not reject a company-shaped name in a person-scoped investigation", () => {
    const result = evaluateTargetFitness({
      name: "Northstar Holdings LLC",
      type: "company",
      personScoped: true,
      companyScoped: false,
    });
    expect(result.fit).toBe("review");
    expect(result).not.toHaveProperty("score");
    expect(result.reasons.join(" ")).toContain("heuristics are disabled");
    expect(shouldRejectTarget(result)).toBe(false);
    expect(suggestReframe({ name: "Northstar Holdings LLC", fit: result.fit })).toBeNull();
  });

  it("does not require Latin-only person names or English role keywords", () => {
    const result = evaluateTargetFitness({
      name: "山田 太郎",
      type: "person",
      role: "председатель правления",
      personScoped: true,
    });
    expect(result.fit).toBe("review");
    expect(result).not.toHaveProperty("score");
    expect(result.roleHints).toEqual([]);
    expect(shouldRejectTarget(result)).toBe(false);
  });

  it("keeps company evidence as context but never assigns deterministic qualification", () => {
    const result = evaluateTargetFitness({
      name: "Example GmbH",
      type: "company",
      companyScoped: true,
      companyMetadata: JSON.stringify({
        companyGrowthRanking: [{
          rank: 52,
          sourceType: "ranking_publisher",
          sourceUrl: "https://rank.example/list",
          verified: false,
        }],
      }),
    });
    expect(result.fit).toBe("review");
    expect(result).not.toHaveProperty("score");
    expect(result.reasons.join(" ")).toContain("Company observation");
    expect(shouldRejectTarget(result)).toBe(false);
  });
});
