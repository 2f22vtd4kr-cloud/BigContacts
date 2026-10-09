export type WealthEstimateEligibilityInput = {
  type: string | null | undefined;
  metadata: string | null | undefined;
  totalAssetValue: number;
};

export type WealthEstimateEligibilityReason =
  | "review_only_candidate"
  | "registry_wealth_not_assessed"
  | "no_persisted_asset_value"
  | "persisted_asset_value";

export type WealthEstimateEligibility = {
  eligible: boolean;
  reason: WealthEstimateEligibilityReason;
};

function parseMetadata(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

/**
 * The forced-estimate legacy path must not assign wealth to registry leads.
 * It may run only when a persisted asset valuation exists and the row is not
 * marked as a review-only or explicitly unassessed registry ingestion.
 */
export function assessWealthEstimateEligibility(
  input: WealthEstimateEligibilityInput,
): WealthEstimateEligibility {
  const metadata = parseMetadata(input.metadata);
  if (input.type === "PersonCandidate" || metadata.reviewOnly === true) {
    return { eligible: false, reason: "review_only_candidate" };
  }

  const wealthStatus = typeof metadata.wealthStatus === "string"
    ? metadata.wealthStatus.trim().toLowerCase()
    : "";
  if (
    metadata.westernIngest === true
    || wealthStatus === "unverified"
    || wealthStatus === "not_assessed"
  ) {
    return { eligible: false, reason: "registry_wealth_not_assessed" };
  }

  if (!Number.isFinite(input.totalAssetValue) || input.totalAssetValue <= 0) {
    return { eligible: false, reason: "no_persisted_asset_value" };
  }

  return { eligible: true, reason: "persisted_asset_value" };
}

export type IdentifiedWealthEstimate = {
  entityIndex?: number;
  entityName?: string;
  pointEstimate: number;
  low: number;
  high: number;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  method: string;
};

export type WealthEstimateTarget = { id: number; name: string };

function normalizeEntityName(name: string): string {
  return name.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * LLM batches must be joined by both their explicit one-based index and the
 * normalized entity name. Never attach a result to an entity by array position.
 * Missing, duplicate, misnamed, abstaining, or internally inconsistent estimates
 * are omitted so the caller can leave estimatedNetWorth untouched.
 */
export function matchIdentifiedWealthEstimates(
  entities: readonly WealthEstimateTarget[],
  estimates: readonly IdentifiedWealthEstimate[],
): Map<number, IdentifiedWealthEstimate> {
  const matchedByIndex = new Map<number, IdentifiedWealthEstimate>();
  const duplicateIndexes = new Set<number>();

  for (const estimate of estimates) {
    const index = estimate.entityIndex;
    if (!Number.isSafeInteger(index) || index! < 1 || index! > entities.length) continue;
    const target = entities[index! - 1];
    if (!target || typeof estimate.entityName !== "string") continue;
    if (normalizeEntityName(target.name) !== normalizeEntityName(estimate.entityName)) continue;

    const { pointEstimate, low, high } = estimate;
    if (
      !Number.isFinite(pointEstimate) || pointEstimate <= 0
      || !Number.isFinite(low) || low < 0
      || !Number.isFinite(high) || high < pointEstimate
      || low > pointEstimate
    ) continue;

    if (matchedByIndex.has(index!)) {
      matchedByIndex.delete(index!);
      duplicateIndexes.add(index!);
      continue;
    }
    if (duplicateIndexes.has(index!)) continue;
    matchedByIndex.set(index!, estimate);
  }

  const result = new Map<number, IdentifiedWealthEstimate>();
  for (const [index, estimate] of matchedByIndex) {
    const target = entities[index - 1];
    if (target) result.set(target.id, estimate);
  }
  return result;
}
