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
  "sourceRegistry", "sourceUrl", "sourceUrls", "sourceRecordId", "registryId", "sourceName", "sourceSnapshotId", "organizationNumber", "companyRegistryId",
  "recordId", "recordUrl", "sourceClass", "sourceType", "sourceObservedAt",
  "sourceRetrievedAt", "observedAt", "retrievedAt", "sourceTimestamp",
  "role", "roleOriginal", "companyName", "organizationSourceRecordId", "entityNature", "businessOfficeLocation", "legalForm", "businessCity", "employees", "industryCodes", "industryDescriptions", "registeredShareCapitalAmount", "registeredShareCapitalCurrency", "incorporationDate", "businessEmail", "businessPhone", "officialWebsite", "contactScope", "contactabilityStatus", "principalRelationshipStatus", "clientRelationshipStatus", "evidenceLevel", "jurisdiction", "country", "lastObservedAt", "personalWealthEvidence", "sourceMechanism", "sourceClass", "verificationLevel", "independentCorroborationStatus", "assetType", "assetId", "admission", "reviewOnly",
  "verificationStatus", "wealthStatus", "registrantTypeCode", "registrantTypeLabel",
  "registrantKind", "identityStatus", "ownershipStatus", "beneficialOwnershipStatus",
  "confidence", "estimatedNetWorth", "bayesianScore", "isHot", "hnwiQualificationStatus",
] as const;

/** Keep the source binding and exact evidence references; do not copy unrelated personal metadata. */
export function buildCanonicalSeededTargetBinding(input: {
  entityId: number;
  entityName: string;
  entityType: string;
  sourceRegistries?: string | null;
  notes?: string | null;
  metadata?: string | null;
  email?: string | null;
  phone?: string | null;
  contactOutcome?: string | null;
  contactConfidence?: number | null;
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
  linkedAssets?: Array<{
    id: number;
    category: string | null;
    identifier: string | null;
    sourceRegistry: string | null;
    metadata: string | null;
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
  const linkedAssets = (input.linkedAssets ?? []).map((asset) => {
    const assetMetadata = parseObject(asset.metadata);
    const assetSourceMetadata: Record<string, unknown> = {};
    const isFaaAircraftRecord = assetMetadata.source === "faa-aircraft-registry"
      || assetMetadata.sourceName === "FAA Releasable Aircraft Database"
      || asset.sourceRegistry === "FAA Releasable Aircraft Database";
    const assetSourceFields = [
      "source", "sourceName", "sourceDomain", "sourceClass", "sourceContributor", "sourceMechanism",
      "verificationLevel", "independentCorroborationStatus", "sourceUrl", "sourceRecordId",
      "sourceObservedAt", "observedAt", "lastActivityDate", "registrantTypeCode", "registrantTypeLabel",
      "registrantKind", "identityStatus", "ownershipStatus", "beneficialOwnershipStatus",
      "fractionalOwnershipStatus", "registrationStatus", "wealthStatus", "hnwiQualificationStatus",
      "personalWealthEvidence", "additionalRegistrantNamesRaw", "additionalRegistrantNames", "additionalRegistrantNamesFieldSemantics",
    ] as const;
    for (const field of assetSourceFields) {
      if ((field === "additionalRegistrantNamesRaw" || field === "additionalRegistrantNames" || field === "additionalRegistrantNamesFieldSemantics") && !isFaaAircraftRecord) continue;
      const value = assetMetadata[field];
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        || (Array.isArray(value) && value.every((item) => typeof item === "string" || typeof item === "number"))) {
        assetSourceMetadata[field] = value;
      }
    }
    const rawAssetSignal = assetMetadata.assetSignal;
    if (rawAssetSignal && typeof rawAssetSignal === "object" && !Array.isArray(rawAssetSignal)) {
      const signal = rawAssetSignal as Record<string, unknown>;
      if (signal.kind === "aircraft_registry_observation"
        && ["observed_asset_lead", "material_asset_lead", "strong_asset_lead"].includes(String(signal.strength))
        && signal.personalWealthEvidence === false) {
        assetSourceMetadata.assetSignal = {
          kind: signal.kind,
          strength: signal.strength,
          personalWealthEvidence: false,
        };
      }
    }
    return {
      assetId: asset.id,
      category: asset.category,
      identifier: asset.identifier,
      sourceRegistry: asset.sourceRegistry,
      associationType: "REGISTERED_TO",
      associationSemantics: "A registry registration association is not proof of beneficial ownership, exclusive ownership, control or personal wealth.",
      sourceMetadata: assetSourceMetadata,
    };
  });
  const targetKind = classifyCanonicalSeededTargetType(input.entityType);
  if (targetKind === "organization" && input.contactOutcome === "organization_contact"
    && (input.email || input.phone)) {
    sourceMetadata.organizationContact = {
      email: input.email ?? null,
      phone: input.phone ?? null,
      contactOutcome: "organization_contact",
      contactConfidence: input.contactConfidence ?? 0,
      scope: "organization_only",
      status: "registry-published; independently recheck before outreach",
    };
  }
  if (targetKind === "person"
    && metadata.contactScope === "professional_person"
    && ["direct_contact_candidate", "direct_contact_verified"].includes(String(input.contactOutcome))
    && (input.email || input.phone)) {
    sourceMetadata.professionalContact = {
      email: input.email ?? null,
      phone: input.phone ?? null,
      contactOutcome: input.contactOutcome,
      contactConfidence: input.contactConfidence ?? 0,
      scope: "professional_person",
      status: "officially published professional work route; independently recheck before outreach",
    };
  }
  return {
    entityId: input.entityId,
    entityName: input.entityName,
    entityType: input.entityType,
    targetKind,
    sourceRegistries: registries,
    sourceMetadata,
    sourceNotes: input.notes ?? null,
    linkedAssets,
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
