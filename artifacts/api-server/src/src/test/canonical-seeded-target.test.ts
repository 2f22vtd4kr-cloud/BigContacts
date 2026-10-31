import { describe, expect, it } from "vitest";
import {
  buildCanonicalSeededTargetBinding,
  classifyCanonicalSeededTargetType,
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
        estimatedNetWorth: null,
        bayesianScore: 0.05,
        isHot: false,
        assetSignal: {
          kind: "aircraft_registry_observation",
          strength: "strong_asset_lead",
          personalWealthEvidence: false,
        },
      }),
    });
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
});
