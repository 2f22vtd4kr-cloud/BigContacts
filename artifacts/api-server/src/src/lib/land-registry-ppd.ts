import type { InsertAsset } from "@workspace/db";

export type PpdTransactionAssetInput = {
  transactionId: string;
  pricePaidGbp: number;
  transactionDate: string;
  year: number;
  propertyTypeCode: string;
  tenure: string;
  address: string;
  postcode: string;
  county: string;
  ppdCategory: string;
  recordStatus: string;
};

const PROPERTY_LABELS: Record<string, string> = {
  D: "Detached",
  S: "Semi-Detached",
  T: "Terraced",
  F: "Flat/Maisonette",
  O: "Other",
};

/**
 * Build a transaction asset only. PPD does not supply beneficial ownership or
 * a personal purchaser identity; a price paid is not a market valuation.
 */
export function buildPpdTransactionAsset(input: PpdTransactionAssetInput): InsertAsset {
  const priceLabel = `£${input.pricePaidGbp.toLocaleString("en-GB")}`;
  const propertyLabel = PROPERTY_LABELS[input.propertyTypeCode] ?? "Property";
  return {
    category: "RealEstate",
    identifier: input.transactionId,
    jurisdiction: input.county ? `${input.county}, England & Wales` : "England & Wales",
    description: `${propertyLabel} ${input.tenure} — ${priceLabel} paid (${input.transactionDate}); purchaser/beneficial owner unresolved`,
    address: input.address || undefined,
    sourceRegistry: "UK HM Land Registry (PPD)",
    lastActivityDate: input.transactionDate || undefined,
    ownerEntityId: null,
    metadata: JSON.stringify({
      source: "hmlr-ppd-csv",
      recordKind: "price_paid_transaction",
      transactionId: input.transactionId,
      pricePaid: input.pricePaidGbp,
      priceCurrency: "GBP",
      priceIsVerifiedMarketValue: false,
      purchaserIdentityStatus: "not_provided_by_ppd",
      beneficialOwnershipStatus: "unresolved",
      propertyType: input.propertyTypeCode,
      tenure: input.tenure,
      county: input.county,
      postcode: input.postcode,
      transactionDate: input.transactionDate,
      sourceYear: input.year,
      ppdCategory: input.ppdCategory,
      recordStatus: input.recordStatus,
    }),
  };
}
