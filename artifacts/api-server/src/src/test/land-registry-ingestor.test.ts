import { describe, expect, it } from "vitest";
import { buildLandRegistryTransactionAsset, parsePpdCsvRecord } from "../lib/land-registry-ingestor";

describe("HMLR PPD CSV parsing", () => {
  it("preserves commas inside quoted address fields", () => {
    const parsed = parsePpdCsvRecord('"tx-1",2450000,"2026-05-12 00:00","SW1A 1AA",D,,F,12,,"King's Road, Chelsea",,,London,Greater London,A,A');
    expect(parsed[0]).toBe("tx-1");
    expect(parsed[9]).toBe("King's Road, Chelsea");
    expect(parsed[13]).toBe("Greater London");
    expect(parsed).toHaveLength(16);
  });
});

describe("HMLR PPD transaction asset projection", () => {
  it("persists the transaction as an unowned asset without synthesizing a person/company or net-worth estimate", () => {
    const asset = buildLandRegistryTransactionAsset({
      transactionId: "ppd-transaction-001",
      priceGbp: 2_450_000,
      date: "2026-05-12",
      propertyTypeCode: "D",
      durationCode: "F",
      address: "12 Example Road, London, SW1A 1AA",
      county: "Greater London",
      postcode: "SW1A 1AA",
      paon: "12",
      saon: "",
      street: "Example Road",
      locality: "",
      town: "London",
      year: 2026,
    });

    expect(asset.category).toBe("RealEstate");
    expect(asset.identifier).toBe("ppd-transaction-001");
    expect(asset.ownerEntityId).toBeUndefined();
    expect(asset.estimatedValue).toBeNull();
    expect(asset.description).toContain("£2,450,000");
    const metadata = JSON.parse(asset.metadata ?? "{}");
    expect(metadata).toMatchObject({
      transactionPrice: 2_450_000,
      transactionCurrency: "GBP",
      ownerIdentityStatus: "not_disclosed_by_ppd",
      beneficialOwnershipStatus: "unresolved",
      wealthStatus: "not_assessed",
      reviewOnly: true,
    });
    expect(metadata).not.toHaveProperty("estimatedNetWorth");
  });
});
