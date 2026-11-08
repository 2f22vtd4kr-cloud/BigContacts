import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyFaaRegistryNameValidation,
  buildFaaAircraftAsset,
  buildFaaRegistrantEntity,
  createFaaRegistrantEntityKey,
  faaRegistrantEntityKey,
  normalizeFaaName,
  parseFaaMasterCsvRecord,
} from "../lib/faa-ingestor";
import { classifyFaaRegistrant } from "../lib/faa-ownership-classification";

const base = {
  nNumber: "12345",
  registrantTypeCode: "1",
  registrantName: "SMITH, WALTER",
  fractionalOwnershipFlag: "",
  statusCode: "V",
  typeAircraft: "5",
  typeEngine: "4",
  yearManufactured: "2018",
  serialNumber: "SERIAL-001",
  state: "CA",
  country: "US",
  lastActivityDate: "2026/10/01",
};

describe("FAA person registrant model-name gate", () => {
  it("keeps model-rejected names as asset-only records and marks accepted names as name-shape checked", () => {
    const entity = buildFaaRegistrantEntity(base);
    expect(entity).not.toBeNull();
    const row = { asset: {} as never, entity: entity! };

    const rejected = applyFaaRegistryNameValidation([row], { status: "validated", validNames: [] });
    expect(rejected[0]?.entity).toBeNull();

    const accepted = applyFaaRegistryNameValidation([row], { status: "validated", validNames: [entity!.name] });
    expect(accepted[0]?.entity).not.toBeNull();
    expect(JSON.parse(accepted[0]!.entity!.metadata ?? "{}").nameValidationStatus)
      .toBe("model_name_shape_checked_pending_identity_resolution");
  });

  it("retains structurally valid source candidates as unverified when the model provider is unavailable", () => {
    const entity = buildFaaRegistrantEntity(base);
    expect(entity).not.toBeNull();
    const result = applyFaaRegistryNameValidation(
      [{ asset: {} as never, entity: entity! }],
      { status: "unavailable", validNames: [] },
    );
    expect(result[0]?.entity).not.toBeNull();
    expect(JSON.parse(result[0]!.entity!.metadata ?? "{}").nameValidationStatus)
      .toBe("provider_unavailable_structural_only_pending_identity_resolution");
  });
});

describe("FAA MASTER parser and candidate projection", () => {
  it("parses quoted commas and escaped quotes without shifting FAA fields", () => {
    const fields = Array.from({ length: 34 }, () => "");
    fields[0] = "12345";
    fields[5] = "1";
    fields[6] = '"SMITH, WALTER"';
    fields[20] = "V";
    fields[22] = "Y";
    fields[24] = '"OTHER, OWNER"';
    const parsed = parseFaaMasterCsvRecord(fields.join(","));
    expect(parsed[0]).toBe("12345");
    expect(parsed[6]).toBe("SMITH, WALTER");
    expect(parsed[22]).toBe("Y");
    expect(parsed[24]).toBe("OTHER, OWNER");
    expect(parsed).toHaveLength(34);
  });

  it("preserves registrant order instead of guessing multi-part surname order", () => {
    expect(normalizeFaaName("SMITH, WALTER", "1")).toBe("Smith, Walter");
    expect(normalizeFaaName("VAN DEN BERG JOHN", "1")).toBe("Van Den Berg John");
  });

  it("keeps same-name FAA registrants in different states as separate provisional candidates", () => {
    const california = buildFaaRegistrantEntity({ ...base, state: "CA" });
    const texas = buildFaaRegistrantEntity({ ...base, state: "TX" });
    expect(california).not.toBeNull();
    expect(texas).not.toBeNull();
    expect(faaRegistrantEntityKey(california!)).toBe(createFaaRegistrantEntityKey("Smith, Walter", "CA", "US"));
    expect(faaRegistrantEntityKey(california!)).not.toBe(faaRegistrantEntityKey(texas!));
  });

  it("retains an ordinary-aircraft registrant as a directory candidate without creating a material asset", () => {
    const ordinary = buildFaaRegistrantEntity({ ...base, typeAircraft: "4", typeEngine: "1" });
    expect(ordinary).not.toBeNull();
    const rows = applyFaaRegistryNameValidation(
      [{ asset: null, entity: ordinary! }],
      { status: "unavailable", validNames: [] },
    );
    expect(rows[0]?.asset).toBeNull();
    expect(rows[0]?.entity).not.toBeNull();
    expect(JSON.parse(rows[0]!.entity!.metadata ?? "{}").assetSignal.strength).toBe("observed_asset_lead");
  });

  it("creates an unverified PersonCandidate from an FAA individual registrant, not an HNWI", () => {
    const entity = buildFaaRegistrantEntity(base);
    expect(entity?.type).toBe("PersonCandidate");
    expect(entity?.nationality).toBeNull();
    expect(entity?.estimatedNetWorth).toBeNull();
    expect(entity?.bayesianScore).toBe(0.05);
    expect(entity?.isHot).toBe(false);
    expect(entity?.knownResidences).toBeNull();
    const metadata = JSON.parse(entity?.metadata ?? "{}");
    expect(metadata).toMatchObject({
      hnwiQualificationStatus: "unverified",
      wealthStatus: "not_assessed",
      beneficialOwnershipStatus: "unresolved",
      reviewOnly: true,
      nameValidationStatus: "pending_investigator_resolution",
      personalWealthEvidence: false,
    });
    expect(metadata.rawRegistrantName).toBe("SMITH, WALTER");
  });

  it("classifies legal-entity registrants as Corporation candidates and co-owned registrants as unresolved", () => {
    expect(buildFaaRegistrantEntity({ ...base, registrantTypeCode: "3" })?.type).toBe("Corporation");
    expect(buildFaaRegistrantEntity({ ...base, registrantTypeCode: "7" })?.type).toBe("Corporation");
    expect(buildFaaRegistrantEntity({ ...base, registrantTypeCode: "4" })).toBeNull();
    expect(buildFaaRegistrantEntity({ ...base, registrantTypeCode: "5" })).toBeNull();
  });

  it("stores aircraft as asset leads without an owner FK or estimated personal wealth", () => {
    const asset = buildFaaAircraftAsset({
      ...base,
      manufacturerModelCode: "1234567",
      engineModelCode: "12345",
      expirationDate: "2027/10/31",
      uniqueId: "FAA-001",
    });
    expect(asset.category).toBe("Aviation");
    expect(asset.identifier).toBe("N12345");
    expect(asset.ownerEntityId).toBeUndefined();
    expect(asset.estimatedValue).toBeNull();
    const metadata = JSON.parse(asset.metadata ?? "{}");
    expect(metadata).toMatchObject({
      registrantTypeCode: "1",
      fractionalOwnershipStatus: "not_fractional",
      registrationStatus: "valid",
      wealthStatus: "not_assessed",
      personalWealthEvidence: false,
      hnwiQualificationStatus: "unverified",
      reviewOnly: true,
    });
    expect(metadata.assetSignal.strength).toBe("strong_asset_lead");
  });
});


  it("does not infer nationality from FAA registrant country", () => {
    const entity = buildFaaRegistrantEntity(base);
    expect(entity?.nationality).toBeNull();
    expect(JSON.parse(entity?.metadata ?? "{}").country).toBe("US");
  });

  it("does not persist FAA registrant mailing addresses or additional co-registrant names", () => {
    const source = readFileSync(new URL("../lib/faa-ingestor.ts", import.meta.url), "utf8");
    const registrantBuilder = source.slice(
      source.indexOf("export function buildFaaRegistrantEntity"),
      source.indexOf("export function buildFaaAircraftAsset"),
    );
    const assetBuilder = source.slice(
      source.indexOf("export function buildFaaAircraftAsset"),
      source.indexOf("async function isCacheStale"),
    );
    expect(registrantBuilder).not.toContain("mailingAddress");
    expect(registrantBuilder).not.toContain("otherRegistrantNames");
    expect(assetBuilder).not.toContain("otherRegistrantNames");
    expect(source).not.toContain("registrantMailingAddress");
    expect(source).not.toContain("const street =");
  });

describe("FAA registration status semantics", () => {
  it.each([
    ["V", "valid"],
    ["T", "valid"],
    ["A", "pending"],
    ["S", "pending"],
    ["R", "pending"],
    ["17", "sale_reported"],
    ["27", "expired"],
    ["E", "revoked_or_invalid"],
    ["M", "revoked_or_invalid"],
  ] as const)("classifies FAA status %s as %s", (statusCode, expected) => {
    expect(classifyFaaRegistrant("1", { statusCode }).registrationStatus).toBe(expected);
  });
});

describe("FAA ingestion scope", () => {
  it("does not discard ordinary aircraft before creating the FAA registrant candidate", () => {
    const source = readFileSync(new URL("../lib/faa-ingestor.ts", import.meta.url), "utf8");
    expect(source).not.toContain('if (assetSignal.strength === "observed_asset_lead") continue;');
    expect(source).toContain('assetSignal.strength === "observed_asset_lead"');
    expect(source).toContain('asset: asset ? { ...asset, identifier: tailNumber } : null');
  });
});

describe("legacy FAA registrant repair", () => {
  it("records FAA source class separately from registry ingestion and corroboration", () => {
    const source = readFileSync(new URL("../lib/faa-ingestor.ts", import.meta.url), "utf8");
    expect(source).toContain('sourceClass: "registry_adapter_source"');
    expect(source).toContain('sourceMechanism: "faa_registry_import"');
    expect(source).toContain('sourceName: "FAA Releasable Aircraft Database"');
    expect(source).toContain('independentCorroborationStatus: "not_assessed"');
  });

  it("keeps SQL migration expressions out of new entity JSON metadata", () => {
    const source = readFileSync(new URL("../lib/faa-ingestor.ts", import.meta.url), "utf8");
    const builder = source.slice(source.indexOf("export function buildFaaRegistrantEntity"), source.indexOf("export function buildFaaAircraftAsset"));
    expect(builder).toContain("estimatedNetWorth: null");
    expect(builder).not.toContain("CASE WHEN ${entitiesTable.estimatedNetWorth}");
  });

  it("never reclassifies co-owned, government, or unknown legacy registrants as people or corporations", () => {
    const source = readFileSync(new URL("../lib/faa-ingestor.ts", import.meta.url), "utf8");
    const start = source.indexOf("async function repairLegacyFaaOwnershipSemantics");
    const end = source.indexOf("async function flushBatch", start);
    const repair = source.slice(start, end);
    expect(repair).toContain("= '1' THEN 'PersonCandidate'");
    expect(repair).toContain("IN ('2','3','7','8') THEN 'Corporation'");
    expect(repair).toContain("ELSE 'Other' END");
    expect(repair).toContain('eq(entitiesTable.sourceRegistries, JSON.stringify(["FAA Releasable Aircraft Database"]))');
    expect(repair).toContain('eq(relationshipsTable.notes, "FAA aircraft registration")');
    expect(repair).toContain("legacyOwnerPairs.has");
    expect(repair).toContain("const repairAssets = legacyAssets.filter");
    expect(repair).toContain("BTRIM(${entitiesTable.contactMethod})");
    expect(repair).toContain("ELSE ${entitiesTable.contactMethod} END");
    expect(repair).toContain("CASE WHEN ${entitiesTable.estimatedNetWorth} IN");
    expect(repair).not.toContain("contactMethod: \"FAA registrant record — direct professional contact route not verified\"");
  });
});

