import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyFaaRegistryNameValidation,
  buildFaaAircraftAsset,
  buildFaaRegistrantEntity,
  createFaaRegistrationDedupKey,
  createFaaRegistrantEntityKey,
  faaRegistrantEntityKey,
  mergeFaaAssetMetadata,
  normalizeFaaAdditionalRegistrantNames,
  shouldReclassifyLegacyFaaRegistrantLink,
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
    fields[25] = '"SECOND OWNER"';
    fields[26] = "THIRD OWNER";
    fields[27] = "FOURTH OWNER";
    fields[28] = "FIFTH OWNER";
    const parsed = parseFaaMasterCsvRecord(fields.join(","));
    expect(parsed[0]).toBe("12345");
    expect(parsed[6]).toBe("SMITH, WALTER");
    expect(parsed[22]).toBe("Y");
    expect(parsed.slice(24, 29)).toEqual(["OTHER, OWNER", "SECOND OWNER", "THIRD OWNER", "FOURTH OWNER", "FIFTH OWNER"]);
    expect(parsed).toHaveLength(34);
  });

  it("normalizes only the five public FAA co-registrant fields without inventing identities", () => {
    expect(normalizeFaaAdditionalRegistrantNames(["  OTHER   OWNER ", "", "PARTNER, INC.", "  ", "FOURTH", "IGNORED SIXTH"]))
      .toEqual(["OTHER OWNER", "PARTNER, INC.", "FOURTH"]);
  });

  it("includes published co-registrant names in replay identity while retaining legacy keys for rows with none", () => {
    const baseKey = createFaaRegistrationDedupKey({ ...base, uniqueId: "FAA-001" });
    const coRegistrantKey = createFaaRegistrationDedupKey({
      ...base,
      uniqueId: "FAA-001",
      additionalRegistrantNames: ["OTHER OWNER"],
    });
    expect(coRegistrantKey).not.toBe(baseKey);
    const rawVariantKey = createFaaRegistrationDedupKey({
      ...base,
      uniqueId: "FAA-001",
      additionalRegistrantNames: ["OTHER OWNER"],
      additionalRegistrantNamesRaw: [" OTHER OWNER "],
    });
    expect(rawVariantKey).not.toBe(coRegistrantKey);
    expect(createFaaRegistrationDedupKey({ ...base, uniqueId: "FAA-001", additionalRegistrantNames: [] })).toBe(baseKey);
  });

  it("merges updated FAA metadata without dropping independent asset enrichment", () => {
    const merged = JSON.parse(mergeFaaAssetMetadata(
      JSON.stringify({ openSky: { lastSeen: "2026-11-01" }, additionalRegistrantNames: ["OLD NAME"] }),
      JSON.stringify({ additionalRegistrantNames: ["NEW NAME"], registrantName: "CURRENT REGISTRANT" }),
    ));
    expect(merged).toMatchObject({
      openSky: { lastSeen: "2026-11-01" },
      additionalRegistrantNames: ["NEW NAME"],
      registrantName: "CURRENT REGISTRANT",
    });
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

  it("does not reuse an FAA registrant key for a same-name non-FAA entity", () => {
    const entity = buildFaaRegistrantEntity(base);
    expect(entity).not.toBeNull();
    const metadata = JSON.parse(entity!.metadata ?? "{}");
    metadata.source = "other-public-registry";
    expect(faaRegistrantEntityKey({ ...entity!, metadata: JSON.stringify(metadata) })).toBeNull();
  });

  it("records structural-only validation distinctly when Groq validation is intentionally not requested", () => {
    const ordinary = buildFaaRegistrantEntity({ ...base, typeAircraft: "4", typeEngine: "1" });
    expect(ordinary).not.toBeNull();
    const rows = applyFaaRegistryNameValidation(
      [{ asset: null, entity: ordinary! }],
      { status: "not_requested", validNames: [] },
    );
    const metadata = JSON.parse(rows[0]!.entity!.metadata ?? "{}");
    expect(metadata.nameValidationStatus).toBe("structural_validation_only_pending_identity_resolution");
  });

  it("retains ordinary aircraft as unvalued FAA observations linked to provisional registrants", () => {
    const ordinary = buildFaaRegistrantEntity({ ...base, typeAircraft: "4", typeEngine: "1" });
    expect(ordinary).not.toBeNull();
    const asset = buildFaaAircraftAsset({
      ...base,
      typeAircraft: "4",
      typeEngine: "1",
      manufacturerModelCode: "",
      engineModelCode: "",
      expirationDate: "",
      uniqueId: "",
    });
    const rows = applyFaaRegistryNameValidation(
      [{ asset, entity: ordinary! }],
      { status: "not_requested", validNames: [] },
    );
    expect(rows[0]?.asset?.estimatedValue).toBeNull();
    expect(rows[0]?.entity).not.toBeNull();
    expect(JSON.parse(rows[0]!.asset!.metadata ?? "{}").assetSignal.strength).toBe("observed_asset_lead");
    expect(JSON.parse(rows[0]!.entity!.metadata ?? "{}").personalWealthEvidence).toBe(false);
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
      additionalRegistrantNames: ["OTHER OWNER", "PARTNERSHIP NAME"],
      additionalRegistrantNamesRaw: [" OTHER OWNER ", "PARTNERSHIP NAME", "", "", ""],
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
      additionalRegistrantNames: ["OTHER OWNER", "PARTNERSHIP NAME"],
      additionalRegistrantNamesRaw: [" OTHER OWNER ", "PARTNERSHIP NAME", "", "", ""],
      reviewOnly: true,
    });
    expect(metadata.additionalRegistrantNamesFieldSemantics).toContain("do not establish");
    expect(metadata.additionalRegistrantNames).not.toContain("SMITH, WALTER");
    expect(metadata.assetSignal.strength).toBe("strong_asset_lead");
  });
});


  it("does not infer nationality from FAA registrant country", () => {
    const entity = buildFaaRegistrantEntity(base);
    expect(entity?.nationality).toBeNull();
    expect(JSON.parse(entity?.metadata ?? "{}").country).toBe("US");
  });

  it("keeps co-registrant names on their aircraft record and never persists FAA mailing addresses", () => {
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
    expect(registrantBuilder).not.toContain("additionalRegistrantNames");
    expect(assetBuilder).toContain("additionalRegistrantNames");
    expect(assetBuilder).toContain("additionalRegistrantNamesFieldSemantics");
    expect(assetBuilder).not.toContain("mailingAddress");
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

describe("FAA terminal reconciliation", () => {
  it("persists processed-row and distinct-registrant counts in the durable job result", () => {
    const route = readFileSync(new URL("../routes/ingest.ts", import.meta.url), "utf8");
    expect(route).toContain("result.processedRows");
    expect(route).toContain("result.registrantGroupsProcessed");
    expect(route).toContain("result: JSON.stringify(result)");
    expect(route).toContain("validateNamesWithLlm && safeMax > 1_000");
    expect(route).toContain("validateNamesWithLlm = false");
  });
});

describe("FAA ingestion scope", () => {
  it("does not discard ordinary aircraft before creating the FAA registrant candidate", () => {
    const source = readFileSync(new URL("../lib/faa-ingestor.ts", import.meta.url), "utf8");
    expect(source).not.toContain('if (assetSignal.strength === "observed_asset_lead") continue;');
    expect(source).toContain('if (!["1", "2", "3", "7", "8"].includes(typeReg)) continue;');
    expect(source).toContain("const asset = buildFaaAircraftAsset({");
    expect(source).toContain('batchRows.push({ asset: { ...asset, identifier: tailNumber }, entity });');
    expect(source).toContain("expectedEntityByAssetId");
    expect(source).toContain("staleFaaRelations");
    expect(source).toContain("tx.update(relationshipsTable)");
    expect(source).toContain("HISTORICAL_REGISTERED_TO");
    expect(source).toContain("F_OTHER_NAME_INDICES = [24, 25, 26, 27, 28]");
    expect(source).toContain("additionalRegistrantNames");
    expect(source).toContain("mergeFaaAssetMetadata(existing.metadata, row.asset.metadata)");
    expect(source).toContain("metadata: assetsTable.metadata");
    expect(source).toContain("const repairAssets = legacyAssets;");
    expect(source).toContain("await tx.update(assetsTable).set({ ownerEntityId: null })");
    expect(source).not.toContain("legacyOwnerPairs");
    expect(source).not.toContain("tx.delete(relationshipsTable)");
  });
});

describe("FAA dedup replay safety", () => {
  it("clears only FAA v2 dedup keys and preserves every other ingestion lane", () => {
    const route = readFileSync(new URL("../routes/ingest.ts", import.meta.url), "utf8");
    const queue = readFileSync(new URL("../lib/job-queue.ts", import.meta.url), "utf8");
    expect(route).toContain('if (doClean) await clearDedupPrefix("faa:v2:");');
    const claimAt = route.indexOf('if (!(await claimIngestionJobOrRespond("faa", jobId, res))) return;');
    const clearAt = route.indexOf('if (doClean) await clearDedupPrefix("faa:v2:");');
    expect(claimAt).toBeGreaterThan(-1);
    expect(clearAt).toBeGreaterThan(claimAt);
    expect(route.slice(clearAt)).toContain('clearActiveJobIfMatches("faa", jobId).catch(() => false)');
    expect(route).toContain("clearDedupPrefix,");
    expect(queue).toContain("export async function clearDedupPrefix(prefix:string)");
    expect(queue).toContain('rc.sscan(DEDUP_KEY,cursor,"MATCH",`${prefix}*`,"COUNT",2000)');
    expect(queue).toContain("rc.srem(DEDUP_KEY");
    expect(queue).toContain("Could not confirm FAA dedup prefix cleanup; refusing replay.");
    expect(queue).toContain("export async function clearDedup()");
    expect(queue).toContain('await rc.del(DEDUP_KEY);');
  });
});

describe("legacy FAA registrant repair", () => {
  it("preserves independent OWNS edges when their source entity differs from the asset FK", () => {
    expect(shouldReclassifyLegacyFaaRegistrantLink({ sourceEntityId: 10, ownerEntityId: 10 })).toBe(true);
    expect(shouldReclassifyLegacyFaaRegistrantLink({ sourceEntityId: 10, ownerEntityId: null })).toBe(true);
    expect(shouldReclassifyLegacyFaaRegistrantLink({ sourceEntityId: 10, ownerEntityId: 11 })).toBe(false);
  });

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
    const legacyAssetQuery = repair.slice(0, repair.indexOf("// Historical FAA imports"));
    expect(legacyAssetQuery).not.toContain("entitiesTable.sourceRegistries");
    expect(repair).toContain("= '1' THEN 'PersonCandidate'");
    expect(repair).toContain("registrantTypeCode");
    expect(repair).toContain("IN ('2','3','7','8') THEN 'Corporation'");
    expect(repair).toContain("ELSE 'Other' END");
    expect(repair).toContain('eq(entitiesTable.type, "HNWI")');
    expect(repair).toContain("legacyFaaOwnershipCorrected");
    expect(repair).toContain('eq(entitiesTable.sourceRegistries, JSON.stringify(["FAA Releasable Aircraft Database"]))');
    expect(repair).toContain('eq(relationshipsTable.notes, "FAA aircraft registration")');
    expect(repair).toContain("const legacyFaaOwnedLinks = await tx.select");
    expect(repair).toContain('eq(assetsTable.sourceRegistry, "FAA Releasable Aircraft Database")');
    expect(repair).toContain("const repairAssets = legacyAssets;");
    expect(repair).toContain("repairableFaaOwnedLinks.map((row) => row.targetId)");
    expect(repair).toContain("legacyFaaOwnedLinks.filter(shouldReclassifyLegacyFaaRegistrantLink)");
    expect(repair).toContain("const assetIds = Array.from(new Set");
    expect(repair).toContain(".filter((row) => row.ownerEntityId != null && row.ownerEntityId === row.sourceEntityId)");
    expect(repair).toContain('relationshipType: "REGISTERED_TO"');
    expect(repair).toContain("BTRIM(${entitiesTable.contactMethod})");
    expect(repair).toContain("ELSE ${entitiesTable.contactMethod} END");
    expect(repair).toContain("CASE WHEN ${entitiesTable.estimatedNetWorth} IN");
    expect(repair).not.toContain("contactMethod: \"FAA registrant record — direct professional contact route not verified\"");
  });
});

