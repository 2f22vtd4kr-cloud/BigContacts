import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildFaaAircraftAsset,
  buildFaaRegistrantEntity,
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
  mailingAddress: "1 Example Street, Los Angeles, CA 90001",
  otherRegistrantNames: ["OTHER CO-OWNER"],
  lastActivityDate: "2026/10/01",
};

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

  it("creates an unverified PersonCandidate from an FAA individual registrant, not an HNWI", () => {
    const entity = buildFaaRegistrantEntity(base);
    expect(entity?.type).toBe("PersonCandidate");
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

describe("legacy FAA registrant repair", () => {
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
  });
});

