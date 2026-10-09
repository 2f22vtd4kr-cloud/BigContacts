import { describe, expect, it } from "vitest";
import {
  assessWealthEstimateEligibility,
  matchIdentifiedWealthEstimates,
  type IdentifiedWealthEstimate,
} from "../lib/wealth-estimation-policy";

describe("wealth estimation eligibility", () => {
  it("never estimates registry-review candidates, even when an asset number is present", () => {
    expect(assessWealthEstimateEligibility({
      type: "PersonCandidate",
      metadata: JSON.stringify({ reviewOnly: true, wealthStatus: "unverified" }),
      totalAssetValue: 25_000_000,
    })).toEqual({ eligible: false, reason: "review_only_candidate" });
  });

  it("blocks legacy HNWI labels and registry rows explicitly marked unassessed", () => {
    for (const metadata of [
      { westernIngest: true, wealthStatus: "unverified" },
      { westernIngest: true, wealthStatus: "not_assessed" },
      { wealthStatus: "unverified" },
      { wealthStatus: "not_assessed" },
      { reviewOnly: true },
    ]) {
      expect(assessWealthEstimateEligibility({
        type: "HNWI",
        metadata: JSON.stringify(metadata),
        totalAssetValue: 8_000_000,
      }).eligible).toBe(false);
    }
  });

  it("blocks legacy registry-only HNWI rows whose modern policy metadata is missing", () => {
    expect(assessWealthEstimateEligibility({
      type: "HNWI",
      metadata: JSON.stringify({ confidence: "LOW" }),
      sourceRegistries: JSON.stringify(["SEC EDGAR SC 13D/G"]),
      totalAssetValue: 12_000_000,
    })).toEqual({ eligible: false, reason: "registry_wealth_not_assessed" });
  });

  it("allows a registry-sourced person only after explicit wealth assessment and attributed assets", () => {
    expect(assessWealthEstimateEligibility({
      type: "HNWI",
      metadata: JSON.stringify({ wealthStatus: "assessed" }),
      sourceRegistries: JSON.stringify(["SEC EDGAR"]),
      totalAssetValue: 12_000_000,
    })).toEqual({ eligible: true, reason: "persisted_asset_value" });
  });

  it("allows explicit reassessment to supersede the registry-ingestion default", () => {
    expect(assessWealthEstimateEligibility({
      type: "HNWI",
      metadata: JSON.stringify({ westernIngest: true, wealthStatus: "assessed", reviewOnly: false }),
      sourceRegistries: JSON.stringify(["SEC EDGAR"]),
      totalAssetValue: 12_000_000,
    })).toEqual({ eligible: true, reason: "persisted_asset_value" });
  });

  it("abstains when no persisted asset valuation exists", () => {
    expect(assessWealthEstimateEligibility({
      type: "HNWI",
      metadata: JSON.stringify({ confidence: "LOW", sourceRegistries: ["SEC EDGAR"] }),
      totalAssetValue: 0,
    })).toEqual({ eligible: false, reason: "no_persisted_asset_value" });
  });

  it("allows source-backed non-review rows only with a persisted asset valuation", () => {
    expect(assessWealthEstimateEligibility({
      type: "HNWI",
      metadata: JSON.stringify({ wealthStatus: "assessed" }),
      totalAssetValue: 12_000_000,
    })).toEqual({ eligible: true, reason: "persisted_asset_value" });
  });
});

describe("identified wealth estimate mapping", () => {
  const estimate = (
    entityIndex: number,
    entityName: string,
    pointEstimate: number,
  ): IdentifiedWealthEstimate => ({
    entityIndex,
    entityName,
    pointEstimate,
    low: pointEstimate / 2,
    high: pointEstimate * 2,
    confidence: "low",
    reasoning: "A test-only source-backed estimate.",
    method: "llm-groq",
  });

  it("maps out-of-order results by explicit index and matching name, never by array position", () => {
    const result = matchIdentifiedWealthEstimates(
      [{ id: 10, name: "Alice Example" }, { id: 20, name: "Bob Example" }],
      [estimate(2, "Bob Example", 20_000_000), estimate(1, "Alice Example", 5_000_000)],
    );
    expect(result.get(10)?.pointEstimate).toBe(5_000_000);
    expect(result.get(20)?.pointEstimate).toBe(20_000_000);
  });

  it("rejects misnamed, duplicate-index, malformed-range, and abstaining estimates", () => {
    const result = matchIdentifiedWealthEstimates(
      [{ id: 10, name: "Alice Example" }, { id: 20, name: "Bob Example" }],
      [
        estimate(1, "Bob Example", 9_000_000),
        estimate(2, "Bob Example", 20_000_000),
        estimate(2, "Bob Example", 22_000_000),
        { ...estimate(1, "Alice Example", 1_000_000), low: 2_000_000 },
        { ...estimate(1, "Alice Example", 0), low: 0, high: 0 },
      ],
    );
    expect(result.has(10)).toBe(false);
    expect(result.has(20)).toBe(false);
  });
});
