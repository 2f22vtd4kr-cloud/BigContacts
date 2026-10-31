export type CanonicalSeededTargetKind = "person" | "organization" | "asset" | "other";

const PERSON_TYPES = new Set(["person", "personcandidate", "hnwi", "gatekeeper"]);
const ORGANIZATION_TYPES = new Set(["corporation", "corp", "company", "organization", "trust", "llc", "partnership", "legalentity", "investmentgroup", "fund"]);
const ASSET_TYPES = new Set(["asset", "aircraft", "aircraftasset", "vessel", "vesselasset", "yacht", "ship", "property", "realestate", "realproperty", "vehicle", "artwork"]);

/** Resolve the persisted entity's semantic kind without coercing unknown assets into people. */
export function classifyCanonicalSeededTargetType(entityType: string | null | undefined): CanonicalSeededTargetKind {
  const normalized = String(entityType ?? "").replace(/[ _-]/g, "").toLowerCase();
  if (PERSON_TYPES.has(normalized)) return "person";
  if (ORGANIZATION_TYPES.has(normalized)) return "organization";
  if (ASSET_TYPES.has(normalized)) return "asset";
  return "other";
}

function parseObject(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

const SOURCE_FIELDS = [
  "sourceRegistry", "sourceUrl", "sourceUrls", "sourceRecordId", "registryId",
  "recordId", "recordUrl", "sourceClass", "sourceType", "sourceObservedAt",
  "sourceRetrievedAt", "observedAt", "retrievedAt", "sourceTimestamp",
  "role", "companyName", "assetType", "assetId", "admission", "reviewOnly",
  "verificationStatus", "wealthStatus", "registrantTypeCode", "registrantTypeLabel",
  "registrantKind", "identityStatus", "ownershipStatus", "beneficialOwnershipStatus",
  "confidence", "estimatedNetWorth", "bayesianScore", "isHot",
] as const;

/** Keep the source binding and exact evidence references; do not copy unrelated personal metadata. */
export function buildCanonicalSeededTargetBinding(input: {
  entityId: number;
  entityName: string;
  entityType: string;
  sourceRegistries?: string | null;
  notes?: string | null;
  metadata?: string | null;
  evidence?: Array<{
    id: number;
    claimType: string | null;
    claim: string | null;
    value: string | null;
    sourceName: string | null;
    sourceUrl: string | null;
    status: string | null;
    confidence: number | null;
    observedAt: Date | string | null;
  }>;
}): Record<string, unknown> {
  const metadata = parseObject(input.metadata);
  const sourceMetadata: Record<string, unknown> = {};
  for (const field of SOURCE_FIELDS) {
    const value = metadata[field];
    if (field === "estimatedNetWorth") {
      if (value === null) sourceMetadata[field] = null;
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      || (Array.isArray(value) && value.every((item) => typeof item === "string" || typeof item === "number"))) {
      sourceMetadata[field] = value;
    }
  }
  let registries: unknown = input.sourceRegistries ?? null;
  if (typeof registries === "string") {
    try { registries = JSON.parse(registries); } catch { /* preserve the original registry label */ }
  }
  const rawAssetSignal = metadata.assetSignal;
  if (rawAssetSignal && typeof rawAssetSignal === "object" && !Array.isArray(rawAssetSignal)) {
    const signal = rawAssetSignal as Record<string, unknown>;
    if (signal.kind === "aircraft_registry_observation"
      && ["observed_asset_lead", "material_asset_lead", "strong_asset_lead"].includes(String(signal.strength))
      && signal.personalWealthEvidence === false) {
      sourceMetadata.assetSignal = {
        kind: signal.kind,
        strength: signal.strength,
        personalWealthEvidence: false,
      };
    }
  }
  return {
    entityId: input.entityId,
    entityName: input.entityName,
    entityType: input.entityType,
    targetKind: classifyCanonicalSeededTargetType(input.entityType),
    sourceRegistries: registries,
    sourceMetadata,
    sourceNotes: input.notes ?? null,
    evidence: (input.evidence ?? []).map((item) => ({
      evidenceId: item.id,
      claimType: item.claimType,
      claim: item.claim,
      value: item.value,
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl,
      status: item.status,
      confidence: item.confidence,
      observedAt: item.observedAt instanceof Date ? item.observedAt.toISOString() : item.observedAt,
    })),
  };
}
