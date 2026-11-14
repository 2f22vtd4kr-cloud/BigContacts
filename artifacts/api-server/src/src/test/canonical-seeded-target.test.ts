import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildCanonicalSeededTargetBinding,
  classifyCanonicalSeededTargetType,
  resolveCanonicalSeededTargetEntityType,
} from "../lib/canonical-seeded-target";
import { buildTargetContactInvestigatorObjective } from "../lib/target-contact-agent";

describe("canonical seeded target binding", () => {
  it("keeps people, legal entities and assets in distinct target classes", () => {
    expect(classifyCanonicalSeededTargetType("PersonCandidate")).toBe("person");
    expect(classifyCanonicalSeededTargetType("HNWI")).toBe("person");
    expect(classifyCanonicalSeededTargetType("Corporation")).toBe("organization");
    expect(classifyCanonicalSeededTargetType("Trust")).toBe("organization");
    expect(classifyCanonicalSeededTargetType("Aircraft")).toBe("asset");
    expect(classifyCanonicalSeededTargetType("Vessel")).toBe("asset");
    expect(classifyCanonicalSeededTargetType("Property")).toBe("asset");
    expect(classifyCanonicalSeededTargetType("Asset")).toBe("asset");
    expect(classifyCanonicalSeededTargetType("UnrecognizedRecord")).toBe("other");
    expect(classifyCanonicalSeededTargetType("InvestmentGroup")).toBe("organization");
  });

  it("resolves legacy FAA HNWI rows to the published registrant type before case creation", () => {
    const sourceRegistries = JSON.stringify(["FAA Releasable Aircraft Database"]);
    expect(resolveCanonicalSeededTargetEntityType({
      entityType: "HNWI",
      sourceRegistries,
      metadata: JSON.stringify({ registrantTypeCode: "1", personalWealthEvidence: false, wealthStatus: "not_assessed" }),
    })).toBe("PersonCandidate");
    expect(resolveCanonicalSeededTargetEntityType({
      entityType: "HNWI",
      sourceRegistries,
      metadata: JSON.stringify({ registrantTypeCode: "2", personalWealthEvidence: false, wealthStatus: "not_assessed" }),
    })).toBe("Corporation");
    expect(resolveCanonicalSeededTargetEntityType({
      entityType: "HNWI",
      sourceRegistries,
      metadata: JSON.stringify({ registrantTypeCode: "5", personalWealthEvidence: false, wealthStatus: "not_assessed" }),
    })).toBe("Other");
    expect(resolveCanonicalSeededTargetEntityType({
      entityType: "HNWI",
      sourceRegistries,
      metadata: JSON.stringify({ registrantTypeCode: "1", personalWealthEvidence: true, wealthStatus: "assessed" }),
    })).toBe("HNWI");
    expect(resolveCanonicalSeededTargetEntityType({
      entityType: "HNWI",
      sourceRegistries,
      metadata: JSON.stringify({ registrantTypeCode: "1", personalWealthEvidence: false, wealthStatus: "assessed" }),
    })).toBe("PersonCandidate");
  });

  it("inherits source identifiers, URLs, registry labels and linked evidence without upgrading verification", () => {
    const binding = buildCanonicalSeededTargetBinding({
      entityId: 42,
      entityName: "N123AB",
      entityType: "Aircraft",
      sourceRegistries: JSON.stringify(["FAA Releasable Aircraft"]),
      notes: "Registry-backed asset review record",
      metadata: JSON.stringify({
        registryId: "FAA-12345",
        sourceRecordId: "N123AB",
        sourceUrl: "https://registry.example/aircraft/N123AB",
        sourceUrls: ["https://registry.example/aircraft/N123AB"],
        sourceObservedAt: "2026-10-30T00:00:00.000Z",
        reviewOnly: true,
        verificationStatus: "unverified",
        estimatedNetWorth: 900000000,
        privatePhone: "+15555550100",
      }),
      evidence: [{
        id: 7,
        claimType: "asset_registration",
        claim: "Aircraft registration record",
        value: "N123AB",
        sourceName: "FAA",
        sourceUrl: "https://registry.example/aircraft/N123AB",
        status: "review",
        confidence: 0.5,
        observedAt: "2026-10-30T00:00:00.000Z",
      }],
    });

    expect(binding).toMatchObject({
      entityId: 42,
      entityName: "N123AB",
      entityType: "Aircraft",
      targetKind: "asset",
      sourceRegistries: ["FAA Releasable Aircraft"],
      sourceMetadata: {
        registryId: "FAA-12345",
        sourceRecordId: "N123AB",
        sourceUrl: "https://registry.example/aircraft/N123AB",
        reviewOnly: true,
        verificationStatus: "unverified",
      },
      evidence: [{
        evidenceId: 7,
        claimType: "asset_registration",
        sourceUrl: "https://registry.example/aircraft/N123AB",
        status: "review",
        confidence: 0.5,
      }],
    });
    expect(binding).not.toHaveProperty("sourceMetadata.estimatedNetWorth");
    expect(binding).not.toHaveProperty("sourceMetadata.privatePhone");
  });

  it("loads exact REGISTERED_TO asset records into canonical seeded-target context", () => {
    const runner = readFileSync(new URL("../lib/canonical-single-target-runner.ts", import.meta.url), "utf8");
    expect(runner).toContain("const linkedAssetRows = await db.select");
    expect(runner).toContain('eq(relationshipsTable.relationshipType, "REGISTERED_TO")');
    expect(runner).toContain("linkedAssets: linkedAssetRows");
    expect(runner).toContain("resolveCanonicalSeededTargetEntityType({ entityType: targetRow.type, sourceRegistries: targetRow.sourceRegistries, metadata: targetRow.metadata })");
    expect(runner).toContain("entityType: targetRow.type,");
    expect(runner).toContain("`Target type: ${target.type}`");
  });

  it("recognizes FAA co-registrant fields from the asset sourceRegistry even when metadata lacks a source label", () => {
    const binding = buildCanonicalSeededTargetBinding({
      entityId: 93,
      entityName: "Registrant",
      entityType: "PersonCandidate",
      linkedAssets: [{
        id: 903,
        category: "Aviation",
        identifier: "N789EF",
        sourceRegistry: "FAA Releasable Aircraft Database",
        metadata: JSON.stringify({ additionalRegistrantNamesRaw: [" OTHER NAME "], additionalRegistrantNames: ["OTHER NAME"] }),
      }],
    });
    expect(binding.linkedAssets[0].sourceMetadata).toMatchObject({
      additionalRegistrantNamesRaw: [" OTHER NAME "],
      additionalRegistrantNames: ["OTHER NAME"],
    });
  });

  it("does not treat similarly named metadata on a non-FAA asset as FAA co-registrant data", () => {
    const binding = buildCanonicalSeededTargetBinding({
      entityId: 92,
      entityName: "Example",
      entityType: "PersonCandidate",
      linkedAssets: [{
        id: 902,
        category: "Aviation",
        identifier: "N456CD",
        sourceRegistry: "Other registry",
        metadata: JSON.stringify({ source: "other-source", additionalRegistrantNamesRaw: ["UNVERIFIED RAW"], additionalRegistrantNames: ["UNVERIFIED"] }),
      }],
    });
    expect(binding.linkedAssets).toHaveLength(1);
    expect(binding.linkedAssets[0]).toMatchObject({ assetId: 902 });
    expect(binding.linkedAssets[0].sourceMetadata).not.toHaveProperty("additionalRegistrantNames");
    expect(binding.linkedAssets[0].sourceMetadata).not.toHaveProperty("additionalRegistrantNamesRaw");
  });

  it("uses an asset-specific objective instead of person research for an asset target", () => {
    const objective = buildTargetContactInvestigatorObjective({
      targetName: "N123AB",
      targetType: "asset",
      reachabilityControl: "Asset research only; owner unverified.",
    });
    expect(objective).toContain("public asset");
    expect(objective).toContain("beneficial owner");
    expect(objective).not.toContain("Investigate the person");
    expect(objective).toContain("registered owner");
  });

  it("keeps unknown target kinds neutral instead of coercing them into people", () => {
    const objective = buildTargetContactInvestigatorObjective({
      targetName: "Registry record 123",
      targetType: "other",
      reachabilityControl: "No verified owner.",
    });
    expect(objective).toContain("without assuming it is a person, company or asset");
    expect(objective).not.toContain("Investigate the person");
  });

  it("preserves FAA registrant uncertainty and asset-only signal fields", () => {
    const binding = buildCanonicalSeededTargetBinding({
      entityId: 91,
      entityName: "FAA record N123AB",
      entityType: "Aircraft",
      metadata: JSON.stringify({
        registrantTypeCode: "2",
        registrantTypeLabel: "Partnership",
        registrantKind: "partnership",
        identityStatus: "legal_entity_candidate",
        ownershipStatus: "partnership_beneficial_owners_unresolved",
        beneficialOwnershipStatus: "unresolved",
        confidence: "LOW",
        reviewOnly: true,
        wealthStatus: "not_assessed",
        hnwiQualificationStatus: "not_assessed",
        estimatedNetWorth: null,
        bayesianScore: 0.05,
        isHot: false,
        assetSignal: {
          kind: "aircraft_registry_observation",
          strength: "strong_asset_lead",
          personalWealthEvidence: false,
        },
      }),
      linkedAssets: [{
        id: 901,
        category: "Aviation",
        identifier: "N123AB",
        sourceRegistry: "FAA Releasable Aircraft Database",
        metadata: JSON.stringify({
          source: "faa-aircraft-registry",
          additionalRegistrantNamesRaw: [" OTHER OWNER ", "PARTNERSHIP NAME", "", "", ""],
          additionalRegistrantNames: ["OTHER OWNER", "PARTNERSHIP NAME"],
          additionalRegistrantNamesFieldSemantics: "FAA Other Name 1–5 are additional names published on the same aircraft registration record; they may identify co-registrants or partnership names, but the fields alone do not prove beneficial ownership, an ownership percentage, a personal relationship, or personal wealth.",
          personalWealthEvidence: false,
          assetSignal: { kind: "aircraft_registry_observation", strength: "strong_asset_lead", personalWealthEvidence: false },
        }),
      }],
    });
    expect(binding.linkedAssets).toEqual([{
      assetId: 901,
      category: "Aviation",
      identifier: "N123AB",
      sourceRegistry: "FAA Releasable Aircraft Database",
      associationType: "REGISTERED_TO",
      associationSemantics: expect.stringContaining("not proof of beneficial ownership"),
      sourceMetadata: expect.objectContaining({
        source: "faa-aircraft-registry",
        additionalRegistrantNamesRaw: [" OTHER OWNER ", "PARTNERSHIP NAME", "", "", ""],
        additionalRegistrantNames: ["OTHER OWNER", "PARTNERSHIP NAME"],
        additionalRegistrantNamesFieldSemantics: expect.stringContaining("additional names published on the same aircraft registration record"),
        personalWealthEvidence: false,
      }),
    }]);
    expect(binding.sourceMetadata).not.toHaveProperty("additionalRegistrantNames");
    expect(binding.sourceMetadata).toMatchObject({
      registrantTypeCode: "2",
      registrantTypeLabel: "Partnership",
      registrantKind: "partnership",
      identityStatus: "legal_entity_candidate",
      ownershipStatus: "partnership_beneficial_owners_unresolved",
      beneficialOwnershipStatus: "unresolved",
      confidence: "LOW",
      reviewOnly: true,
      wealthStatus: "not_assessed",
      hnwiQualificationStatus: "not_assessed",
      estimatedNetWorth: null,
      bayesianScore: 0.05,
      isHot: false,
      assetSignal: {
        kind: "aircraft_registry_observation",
        strength: "strong_asset_lead",
        personalWealthEvidence: false,
      },
    });
  });

  it("reclassifies unassessed FAA-only legacy HNWI rows before AI target routing", () => {
    const person = buildCanonicalSeededTargetBinding({
      entityId: 95,
      entityName: "FAA registrant",
      entityType: "HNWI",
      sourceRegistries: JSON.stringify(["FAA Releasable Aircraft Database"]),
      metadata: JSON.stringify({
        source: "faa-aircraft-registry",
        typeRegistrant: "1",
        estimatedNetWorth: 12_000_000,
        wealthStatus: "not_assessed",
        personalWealthEvidence: false,
      }),
    });
    expect(person.entityType).toBe("PersonCandidate");
    expect(person.targetKind).toBe("person");
    expect(person.sourceMetadata).toMatchObject({
      personalWealthEvidence: false,
      wealthStatus: "not_assessed",
      beneficialOwnershipStatus: "unresolved",
      hnwiQualificationStatus: "unverified",
      identityStatus: "registry_person_candidate",
      reviewOnly: true,
      legacyFaaHnwiDowngradeApplied: true,
    });
    expect(person.sourceMetadata).not.toHaveProperty("estimatedNetWorth");

    const partnership = buildCanonicalSeededTargetBinding({
      entityId: 96,
      entityName: "FAA partnership registrant",
      entityType: "HNWI",
      sourceRegistries: JSON.stringify(["FAA Releasable Aircraft Database"]),
      metadata: JSON.stringify({ typeRegistrant: "2", wealthStatus: "not_assessed" }),
    });
    expect(partnership.entityType).toBe("Corporation");
    expect(partnership.targetKind).toBe("organization");

    const coOwned = buildCanonicalSeededTargetBinding({
      entityId: 97,
      entityName: "Unresolved co-owned registrant",
      entityType: "HNWI",
      sourceRegistries: JSON.stringify(["FAA Releasable Aircraft Database"]),
      metadata: JSON.stringify({ typeRegistrant: "4", wealthStatus: "not_assessed" }),
    });
    expect(coOwned.entityType).toBe("Other");
    expect(coOwned.targetKind).toBe("other");
  });

  it("uses the current registrantTypeCode field when reclassifying legacy FAA HNWI records", () => {
    const binding = buildCanonicalSeededTargetBinding({
      entityId: 99,
      entityName: "FAA registrant using current metadata schema",
      entityType: "HNWI",
      sourceRegistries: JSON.stringify(["FAA Releasable Aircraft Database"]),
      metadata: JSON.stringify({
        source: "faa-aircraft-registry",
        registrantTypeCode: "1",
        estimatedNetWorth: 12_000_000,
        personalWealthEvidence: false,
        wealthStatus: "not_assessed",
      }),
    });
    expect(binding.entityType).toBe("PersonCandidate");
    expect(binding.targetKind).toBe("person");
    expect(binding.sourceMetadata).not.toHaveProperty("estimatedNetWorth");
    expect(binding.sourceMetadata).toMatchObject({
      personalWealthEvidence: false,
      wealthStatus: "not_assessed",
      legacyFaaHnwiDowngradeApplied: true,
    });
  });

  it("preserves an explicitly qualified HNWI when FAA registration is also among the sources", () => {
    const binding = buildCanonicalSeededTargetBinding({
      entityId: 98,
      entityName: "Independently qualified person",
      entityType: "HNWI",
      sourceRegistries: JSON.stringify(["FAA Releasable Aircraft Database", "Independent wealth filing"]),
      metadata: JSON.stringify({
        source: "faa-aircraft-registry",
        typeRegistrant: "1",
        personalWealthEvidence: true,
        wealthStatus: "qualified",
        hnwiQualificationStatus: "qualified",
      }),
    });
    expect(binding.entityType).toBe("HNWI");
    expect(binding.targetKind).toBe("person");
    expect(binding.sourceMetadata).toMatchObject({
      personalWealthEvidence: true,
      wealthStatus: "qualified",
    });
    expect(binding.sourceMetadata).not.toHaveProperty("legacyFaaHnwiDowngradeApplied");
  });

  it("preserves one-character and long target names without truncation", () => {
    const shortObjective = buildTargetContactInvestigatorObjective({
      targetName: "X",
      targetType: "person",
      reachabilityControl: "No verified route.",
    });
    expect(shortObjective).toContain("X");
    const exactName = "Long legal entity name ".repeat(5).trim();
    const longObjective = buildTargetContactInvestigatorObjective({
      targetName: exactName,
      targetType: "organization",
      reachabilityControl: "No verified route.",
    });
    expect(longObjective).toContain(exactName);
  });

  it("does not invent evidence when a seed has only a source registry label", () => {
    const binding = buildCanonicalSeededTargetBinding({
      entityId: 5,
      entityName: "Example Trust",
      entityType: "Trust",
      sourceRegistries: "Companies House",
    });
    expect(binding.targetKind).toBe("organization");
    expect(binding.evidence).toEqual([]);
    expect(binding.sourceRegistries).toBe("Companies House");
  });

  it("carries BRREG company and managing-director source context into future Bureau research", () => {
    const binding = buildCanonicalSeededTargetBinding({
      entityId: 501,
      entityName: "Kari Example",
      entityType: "PersonCandidate",
      sourceRegistries: JSON.stringify(["BRREG Norway — Enhetsregisteret"]),
      metadata: JSON.stringify({
        sourceRecordId: "brreg:123456789:person:kariexample",
        sourceName: "BRREG Norway — Enhetsregisteret",
        sourceUrl: "https://data.brreg.no/enhetsregisteret/api/enheter/123456789/roller",
        sourceSnapshotId: "brreg-sector-screen-2026-11-07",
        organizationNumber: "123456789",
        companyRegistryId: "123456789",
        companyName: "LOCAL HOTEL AS",
        role: "Managing Director",
        roleOriginal: "Daglig leder",
        contactScope: "no_person_contact",
        contactabilityStatus: "no_person_level_contact_assessed",
        wealthStatus: "unverified",
        hnwiQualificationStatus: "unverified",
        reviewOnly: true,
      }),
    });
    expect(binding).toMatchObject({
      targetKind: "person",
      sourceMetadata: {
        sourceRecordId: "brreg:123456789:person:kariexample",
        sourceSnapshotId: "brreg-sector-screen-2026-11-07",
        organizationNumber: "123456789",
        companyRegistryId: "123456789",
        companyName: "LOCAL HOTEL AS",
        role: "Managing Director",
        roleOriginal: "Daglig leder",
        contactScope: "no_person_contact",
        contactabilityStatus: "no_person_level_contact_assessed",
        wealthStatus: "unverified",
        hnwiQualificationStatus: "unverified",
        reviewOnly: true,
      },
    });
  });


  it("binds Gatekeeper assistants and advisers as person targets with professional route scope", () => {
    const binding = buildCanonicalSeededTargetBinding({
      entityId: 808,
      entityName: "Sidsel E. Rydland",
      entityType: "Gatekeeper",
      sourceRegistries: JSON.stringify(["Apex public professional intermediary seed"]),
      email: null,
      phone: null,
      contactOutcome: "evidence_only",
      contactConfidence: 0,
      metadata: JSON.stringify({
        sourceRecordId: "apex-intermediary:canica:sidsel-rydland",
        sourceUrl: "https://www.canica.no/our-team",
        role: "Executive Personal Assistant, Canica Norway",
        companyName: "Canica",
        organizationSourceRecordId: "apex-intermediary:canica",
        contactScope: "no_person_contact",
        contactabilityStatus: "no_person_specific_contact_published",
        principalRelationshipStatus: "not_established",
        clientRelationshipStatus: "not_observed",
        personalWealthEvidence: false,
        reviewOnly: true,
      }),
    });
    expect(binding).toMatchObject({
      targetKind: "person",
      sourceMetadata: {
        sourceRecordId: "apex-intermediary:canica:sidsel-rydland",
        role: "Executive Personal Assistant, Canica Norway",
        organizationSourceRecordId: "apex-intermediary:canica",
        contactScope: "no_person_contact",
        contactabilityStatus: "no_person_specific_contact_published",
        principalRelationshipStatus: "not_established",
        clientRelationshipStatus: "not_observed",
        reviewOnly: true,
        personalWealthEvidence: false,
      },
      evidence: [],
    });
    expect(binding.sourceMetadata).not.toHaveProperty("organizationContact");
  });

  it("passes an official Gatekeeper professional route into Bureau context without treating it as a private contact", () => {
    const binding = buildCanonicalSeededTargetBinding({
      entityId: 809,
      entityName: "Sigurd Haavik",
      entityType: "Gatekeeper",
      sourceRegistries: JSON.stringify(["Apex public professional intermediary seed"]),
      email: "sigurd@oslofamilyoffice.com",
      phone: "+47 91 33 22 11",
      contactOutcome: "direct_contact_candidate",
      contactConfidence: 60,
      metadata: JSON.stringify({
        sourceRecordId: "apex-intermediary:oslo-family-office:sigurd-haavik",
        sourceUrl: "https://www.oslofamilyoffice.com/team",
        role: "Founder & Senior Partner",
        companyName: "Oslo Family Office",
        organizationSourceRecordId: "apex-intermediary:oslo-family-office",
        contactScope: "professional_person",
        contactabilityStatus: "official_professional_route_published",
        principalRelationshipStatus: "not_established",
        clientRelationshipStatus: "not_observed",
        personalWealthEvidence: false,
        reviewOnly: true,
      }),
    });
    expect(binding).toMatchObject({
      targetKind: "person",
      sourceMetadata: {
        sourceRecordId: "apex-intermediary:oslo-family-office:sigurd-haavik",
        role: "Founder & Senior Partner",
        organizationSourceRecordId: "apex-intermediary:oslo-family-office",
        contactScope: "professional_person",
        contactabilityStatus: "official_professional_route_published",
        principalRelationshipStatus: "not_established",
        clientRelationshipStatus: "not_observed",
        professionalContact: {
          email: "sigurd@oslofamilyoffice.com",
          phone: "+47 91 33 22 11",
          contactOutcome: "direct_contact_candidate",
          contactConfidence: 60,
          scope: "professional_person",
          status: "officially published professional work route; independently recheck before outreach",
        },
      },
    });
    expect(binding.sourceMetadata).not.toHaveProperty("organizationContact");
  });

  it("passes only organization-scoped registry contacts into canonical Bureau context", () => {
    const company = buildCanonicalSeededTargetBinding({
      entityId: 701,
      entityName: "LOCAL HOTEL AS",
      entityType: "Corporation",
      email: "post@localhotel.no",
      phone: "+47 555 00 000",
      contactOutcome: "organization_contact",
      contactConfidence: 20,
    });
    expect(company.sourceMetadata).toMatchObject({
      organizationContact: {
        email: "post@localhotel.no",
        phone: "+47 555 00 000",
        contactOutcome: "organization_contact",
        contactConfidence: 20,
        scope: "organization_only",
      },
    });

    const person = buildCanonicalSeededTargetBinding({
      entityId: 702,
      entityName: "Kari Example",
      entityType: "PersonCandidate",
      email: "person@example.no",
      phone: "+47 555 00 001",
      contactOutcome: "direct_contact_candidate",
      contactConfidence: 70,
    });
    expect(person.sourceMetadata).not.toHaveProperty("organizationContact");
  });

});
