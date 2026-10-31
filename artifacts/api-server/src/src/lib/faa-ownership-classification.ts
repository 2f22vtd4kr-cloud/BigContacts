/**
 * Evidence-safe classification of FAA aircraft registrants.
 *
 * FAA registrant type describes the registration applicant, not the ultimate
 * beneficial owner or a natural person's wealth. Keep those concepts separate.
 */

export type FaaRegistrantEntityType = "PersonCandidate" | "Corporation" | null;

export type FaaRegistrantKind =
  | "individual"
  | "partnership"
  | "corporation"
  | "co_owned"
  | "government"
  | "llc"
  | "non_citizen_corporation"
  | "non_citizen_co_owned"
  | "unknown";

export type FaaRegistrantIdentityStatus =
  | "registry_person_candidate"
  | "legal_entity_candidate"
  | "co_owned_registrant_unresolved"
  | "government_registrant"
  | "registrant_type_unknown";

export type FaaRegistrantOwnershipStatus =
  | "individual_registrant_beneficial_ownership_unverified"
  | "partnership_beneficial_owners_unresolved"
  | "corporate_beneficial_owners_unresolved"
  | "co_owned_individuals_unresolved"
  | "government_registrant"
  | "llc_beneficial_owners_unresolved"
  | "non_citizen_corporate_beneficial_owners_unresolved"
  | "non_citizen_co_owned_individuals_unresolved"
  | "registrant_type_unknown";

export type FaaRegistrantClassification = {
  registrantTypeCode: string;
  registrantTypeLabel: string;
  registrantKind: FaaRegistrantKind;
  entityType: FaaRegistrantEntityType;
  identityStatus: FaaRegistrantIdentityStatus;
  ownershipStatus: FaaRegistrantOwnershipStatus;
  beneficialOwnershipStatus: "unresolved";
  confidence: "LOW";
  reviewOnly: true;
  wealthStatus: "unassessed";
  estimatedNetWorth: null;
  bayesianScore: 0.05;
  isHot: false;
};

type RegistrantPolicy = Omit<FaaRegistrantClassification, "registrantTypeCode">;

const REGISTRANT_POLICIES: Readonly<Record<string, RegistrantPolicy>> = {
  "1": {
    registrantTypeLabel: "Individual",
    registrantKind: "individual",
    entityType: "PersonCandidate",
    identityStatus: "registry_person_candidate",
    ownershipStatus: "individual_registrant_beneficial_ownership_unverified",
    beneficialOwnershipStatus: "unresolved",
    confidence: "LOW",
    reviewOnly: true,
    wealthStatus: "unassessed",
    estimatedNetWorth: null,
    bayesianScore: 0.05,
    isHot: false,
  },
  "2": {
    registrantTypeLabel: "Partnership",
    registrantKind: "partnership",
    entityType: "Corporation",
    identityStatus: "legal_entity_candidate",
    ownershipStatus: "partnership_beneficial_owners_unresolved",
    beneficialOwnershipStatus: "unresolved",
    confidence: "LOW",
    reviewOnly: true,
    wealthStatus: "unassessed",
    estimatedNetWorth: null,
    bayesianScore: 0.05,
    isHot: false,
  },
  "3": {
    registrantTypeLabel: "Corporation",
    registrantKind: "corporation",
    entityType: "Corporation",
    identityStatus: "legal_entity_candidate",
    ownershipStatus: "corporate_beneficial_owners_unresolved",
    beneficialOwnershipStatus: "unresolved",
    confidence: "LOW",
    reviewOnly: true,
    wealthStatus: "unassessed",
    estimatedNetWorth: null,
    bayesianScore: 0.05,
    isHot: false,
  },
  "4": {
    registrantTypeLabel: "Co-Owned",
    registrantKind: "co_owned",
    entityType: null,
    identityStatus: "co_owned_registrant_unresolved",
    ownershipStatus: "co_owned_individuals_unresolved",
    beneficialOwnershipStatus: "unresolved",
    confidence: "LOW",
    reviewOnly: true,
    wealthStatus: "unassessed",
    estimatedNetWorth: null,
    bayesianScore: 0.05,
    isHot: false,
  },
  "5": {
    registrantTypeLabel: "Government",
    registrantKind: "government",
    entityType: null,
    identityStatus: "government_registrant",
    ownershipStatus: "government_registrant",
    beneficialOwnershipStatus: "unresolved",
    confidence: "LOW",
    reviewOnly: true,
    wealthStatus: "unassessed",
    estimatedNetWorth: null,
    bayesianScore: 0.05,
    isHot: false,
  },
  "7": {
    registrantTypeLabel: "LLC",
    registrantKind: "llc",
    entityType: "Corporation",
    identityStatus: "legal_entity_candidate",
    ownershipStatus: "llc_beneficial_owners_unresolved",
    beneficialOwnershipStatus: "unresolved",
    confidence: "LOW",
    reviewOnly: true,
    wealthStatus: "unassessed",
    estimatedNetWorth: null,
    bayesianScore: 0.05,
    isHot: false,
  },
  "8": {
    registrantTypeLabel: "Non-Citizen Corporation",
    registrantKind: "non_citizen_corporation",
    entityType: "Corporation",
    identityStatus: "legal_entity_candidate",
    ownershipStatus: "non_citizen_corporate_beneficial_owners_unresolved",
    beneficialOwnershipStatus: "unresolved",
    confidence: "LOW",
    reviewOnly: true,
    wealthStatus: "unassessed",
    estimatedNetWorth: null,
    bayesianScore: 0.05,
    isHot: false,
  },
  "9": {
    registrantTypeLabel: "Non-Citizen Co-Owned",
    registrantKind: "non_citizen_co_owned",
    entityType: null,
    identityStatus: "co_owned_registrant_unresolved",
    ownershipStatus: "non_citizen_co_owned_individuals_unresolved",
    beneficialOwnershipStatus: "unresolved",
    confidence: "LOW",
    reviewOnly: true,
    wealthStatus: "unassessed",
    estimatedNetWorth: null,
    bayesianScore: 0.05,
    isHot: false,
  },
};

const UNKNOWN_REGISTRANT_POLICY: RegistrantPolicy = {
  registrantTypeLabel: "Unknown registrant type",
  registrantKind: "unknown",
  entityType: null,
  identityStatus: "registrant_type_unknown",
  ownershipStatus: "registrant_type_unknown",
  beneficialOwnershipStatus: "unresolved",
  confidence: "LOW",
  reviewOnly: true,
  wealthStatus: "unassessed",
  estimatedNetWorth: null,
  bayesianScore: 0.05,
  isHot: false,
};

/**
 * Classify the FAA registrant code without inferring beneficial ownership.
 *
 * Partnership is stored in the application's generic Corporation bucket, while
 * the exact FAA legal form remains available in registrantKind and label fields.
 * Co-owned and government records do not create a single natural-person entity.
 */
export function classifyFaaRegistrant(typeRegistrant: string): FaaRegistrantClassification {
  const code = typeRegistrant.trim();
  const policy = REGISTRANT_POLICIES[code] ?? UNKNOWN_REGISTRANT_POLICY;
  return {
    ...policy,
    registrantTypeCode: code,
  };
}

export type FaaAssetSignalStrength = "observed_asset_lead" | "material_asset_lead" | "strong_asset_lead";

export type FaaAssetSignal = {
  kind: "aircraft_registry_observation";
  strength: FaaAssetSignalStrength;
  personalWealthEvidence: false;
};

/**
 * Describe aircraft-class significance as an asset lead, never as personal wealth.
 */
export function classifyFaaAssetSignal(typeEngine: string, typeAircraft: string): FaaAssetSignal {
  if (typeEngine === "4" || typeEngine === "5") {
    return {
      kind: "aircraft_registry_observation",
      strength: "strong_asset_lead",
      personalWealthEvidence: false,
    };
  }

  if (
    typeEngine === "2" ||
    typeEngine === "3" ||
    typeAircraft === "5" ||
    typeAircraft === "6"
  ) {
    return {
      kind: "aircraft_registry_observation",
      strength: "material_asset_lead",
      personalWealthEvidence: false,
    };
  }

  return {
    kind: "aircraft_registry_observation",
    strength: "observed_asset_lead",
    personalWealthEvidence: false,
  };
}
