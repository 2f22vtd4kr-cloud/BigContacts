import { describe, expect, it } from "vitest";
import { buildPpdTransactionAsset } from "../lib/land-registry-ppd";

describe("HMLR PPD transaction asset projection", () => {
  it("persists the transaction as an ownerless property asset", () => {
    const asset = buildPpdTransactionAsset({
      transactionId: "11111111-2222-3333-4444-555555555555",
      pricePaidGbp: 1_450_000,
      transactionDate: "2025-03-12",
      year: 2025,
      propertyTypeCode: "D",
      tenure: "Freehold",
      address: "1 Sample Road, Bristol",
      postcode: "BS1 1AA",
      county: "Bristol",
      ppdCategory: "A",
      recordStatus: "A",
    });
    expect(asset).toMatchObject({
      category: "RealEstate",
      identifier: "11111111-2222-3333-4444-555555555555",
      ownerEntityId: null,
      sourceRegistry: "UK HM Land Registry (PPD)",
    });
    expect(asset).not.toHaveProperty("estimatedValue");
    expect(asset).not.toHaveProperty("estimatedNetWorth");
    const metadata = JSON.parse(asset.metadata ?? "{}");
    expect(metadata).toMatchObject({
      recordKind: "price_paid_transaction",
      pricePaid: 1_450_000,
      priceCurrency: "GBP",
      priceIsVerifiedMarketValue: false,
      purchaserIdentityStatus: "not_provided_by_ppd",
      beneficialOwnershipStatus: "unresolved",
    });
  });

  it("does not create an entity, person identity, contact route or wealth estimate", () => {
    const asset = buildPpdTransactionAsset({
      transactionId: "transaction-2",
      pricePaidGbp: 2_000_000,
      transactionDate: "2024-06-07",
      year: 2024,
      propertyTypeCode: "F",
      tenure: "Leasehold",
      address: "2 Sample Street, Leeds",
      postcode: "LS1 1AA",
      county: "West Yorkshire",
      ppdCategory: "A",
      recordStatus: "A",
    });
    expect(asset.ownerEntityId).toBeNull();
    expect(asset).not.toHaveProperty("name");
    expect(asset).not.toHaveProperty("email");
    expect(asset).not.toHaveProperty("phone");
    expect(asset).not.toHaveProperty("estimatedValue");
  });
});
