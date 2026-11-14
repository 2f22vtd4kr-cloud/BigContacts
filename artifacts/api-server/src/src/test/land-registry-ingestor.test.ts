import { describe, expect, it } from "vitest";
import { buildLandRegistryTransactionAsset, parsePpdCsvRecord, selectLegacyHmlrPlaceholderOwnerAssetIds } from "../lib/land-registry-ingestor";

describe("HMLR PPD CSV parsing", () => {
  it("preserves commas inside quoted address fields", () => {
    const parsed = parsePpdCsvRecord("\"tx-1\",2450000,\"2026-05-12 00:00\",\"SW1A 1AA\",D,,F,12,,\"King's Road, Chelsea\",,,London,Greater London,A,A");
    expect(parsed[0]).toBe("tx-1");
    expect(parsed[9]).toBe("King's Road, Chelsea");
    expect(parsed[13]).toBe("Greater London");
    expect(parsed).toHaveLength(16);
  });
});

describe("HMLR legacy owner-link repair", () => {
  it("clears only exact source-only synthetic address placeholders", () => {
    const placeholder = {
      assetId: 1,
      ownerEntityId: 101,
      ownerSourceRegistries: JSON.stringify(["UK HM Land Registry (PPD)"]),
      ownerName: "UK Property — SW1A 1AA",
    };
    const independentlySourcedOwner = {
      assetId: 2,
      ownerEntityId: 102,
      ownerSourceRegistries: JSON.stringify(["UK HM Land Registry (PPD)", "Companies House"]),
      ownerName: "Example Holdings Ltd",
    };
    const nonPlaceholderPerson = {
      assetId: 3,
      ownerEntityId: 103,
      ownerSourceRegistries: JSON.stringify(["UK HM Land Registry (PPD)"]),
      ownerName: "Jane Example",
    };
    const unknownProvenance = {
      assetId: 4,
      ownerEntityId: 104,
      ownerSourceRegistries: "{malformed",
      ownerName: "UK Property — SW1A 1AA",
    };
    const missingOwner = {
      assetId: 5,
      ownerEntityId: null,
      ownerSourceRegistries: JSON.stringify(["UK HM Land Registry (PPD)"]),
      ownerName: "UK Property — SW1A 1AA",
    };

    expect(selectLegacyHmlrPlaceholderOwnerAssetIds([
      placeholder,
      independentlySourcedOwner,
      nonPlaceholderPerson,
      unknownProvenance,
      missingOwner,
    ])).toEqual([1]);
  });

  it("preserves mixed-source owner links even when a property transaction came from PPD", () => {
    expect(selectLegacyHmlrPlaceholderOwnerAssetIds([{
      assetId: 77,
      ownerEntityId: 707,
      ownerSourceRegistries: JSON.stringify(["UK HM Land Registry (PPD)", "SEC EDGAR"]),
      ownerName: "Example Corporation",
    }])).toEqual([]);
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
      sourceName: "HM Land Registry Price Paid Data",
      sourceDomain: "gov.uk",
      sourceClass: "registry_adapter_source",
      sourceMechanism: "hmlr_ppd_csv_ingest",
      verificationLevel: "registry_record",
      independentCorroborationStatus: "not_assessed",
    });
    expect(metadata).not.toHaveProperty("estimatedNetWorth");
  });
});
