import { describe, expect, it } from "vitest";
import {
  classifyFaaAssetSignal,
  classifyFaaRegistrant,
} from "../lib/faa-ownership-classification";

describe("FAA registrant ownership classification", () => {
  it("keeps an individual registrant as an unverified person candidate, not an HNWI", () => {
    expect(classifyFaaRegistrant("1")).toEqual({
      registrantTypeCode: "1",
      registrantTypeLabel: "Individual",
      registrantKind: "individual",
      entityType: "PersonCandidate",
      identityStatus: "registry_person_candidate",
      ownershipStatus: "individual_registrant_beneficial_ownership_unverified",
      beneficialOwnershipStatus: "unresolved",
      confidence: "LOW",
      reviewOnly: true,
      wealthStatus: "unverified",
      estimatedNetWorth: null,
      bayesianScore: 0.05,
      isHot: false,
    });
  });

  it.each([
    ["2", "Partnership", "partnership", "Corporation", "partnership_beneficial_owners_unresolved"],
    ["3", "Corporation", "corporation", "Corporation", "corporate_beneficial_owners_unresolved"],
    ["7", "LLC", "llc", "Corporation", "llc_beneficial_owners_unresolved"],
    ["8", "Non-Citizen Corporation", "non_citizen_corporation", "Corporation", "non_citizen_corporate_beneficial_owners_unresolved"],
  ] as const)(
    "keeps registrant code %s as a legal-entity candidate with its exact legal form",
    (code, label, kind, entityType, ownershipStatus) => {
      const result = classifyFaaRegistrant(code);
      expect(result.registrantTypeLabel).toBe(label);
      expect(result.registrantKind).toBe(kind);
      expect(result.entityType).toBe(entityType);
      expect(result.identityStatus).toBe("legal_entity_candidate");
      expect(result.ownershipStatus).toBe(ownershipStatus);
      expect(result.beneficialOwnershipStatus).toBe("unresolved");
    },
  );

  it.each([
    ["4", "Co-Owned", "co_owned", "co_owned_individuals_unresolved"],
    ["9", "Non-Citizen Co-Owned", "non_citizen_co_owned", "non_citizen_co_owned_individuals_unresolved"],
  ] as const)(
    "does not invent a single owner for co-owned registrant code %s",
    (code, label, kind, ownershipStatus) => {
      const result = classifyFaaRegistrant(code);
      expect(result.registrantTypeLabel).toBe(label);
      expect(result.registrantKind).toBe(kind);
      expect(result.entityType).toBeNull();
      expect(result.identityStatus).toBe("co_owned_registrant_unresolved");
      expect(result.ownershipStatus).toBe(ownershipStatus);
    },
  );

  it("does not create a personal wealth candidate for government registrants", () => {
    const result = classifyFaaRegistrant("5");
    expect(result.registrantKind).toBe("government");
    expect(result.entityType).toBeNull();
    expect(result.identityStatus).toBe("government_registrant");
    expect(result.wealthStatus).toBe(code === "1" ? "unverified" : "not_assessed");
  });

  it("fails closed for unknown registrant codes without inventing an entity type", () => {
    const result = classifyFaaRegistrant("6");
    expect(result.registrantKind).toBe("unknown");
    expect(result.entityType).toBeNull();
    expect(result.identityStatus).toBe("registrant_type_unknown");
    expect(result.ownershipStatus).toBe("registrant_type_unknown");
  });

  it("never assigns personal wealth or a high entity score from FAA registrant type alone", () => {
    for (const code of ["1", "2", "3", "4", "5", "7", "8", "9", "unknown"]) {
      const result = classifyFaaRegistrant(code);
      expect(result.beneficialOwnershipStatus).toBe("unresolved");
      expect(result.wealthStatus).toBe(code === "1" ? "unverified" : "not_assessed");
      expect(result.estimatedNetWorth).toBeNull();
      expect(result.bayesianScore).toBe(0.05);
      expect(result.confidence).toBe("LOW");
      expect(result.reviewOnly).toBe(true);
      expect(result.isHot).toBe(false);
    }
  });
});

describe("FAA aircraft asset signals", () => {
  it.each([
    ["4", "1", "strong_asset_lead"],
    ["5", "1", "strong_asset_lead"],
    ["2", "1", "material_asset_lead"],
    ["3", "1", "material_asset_lead"],
    ["1", "5", "material_asset_lead"],
    ["1", "6", "material_asset_lead"],
    ["1", "1", "observed_asset_lead"],
  ] as const)(
    "classifies engine %s and aircraft %s as an asset-only signal",
    (engine, aircraft, strength) => {
      expect(classifyFaaAssetSignal(engine, aircraft)).toEqual({
        kind: "aircraft_registry_observation",
        strength,
        personalWealthEvidence: false,
      });
    },
  );
});
