import { describe, expect, it } from "vitest";
import {
  buildFaaRegistrantEntity,
  createFaaRegistrantEntityKey,
  createFaaRegistrationDedupKey,
  faaRegistrantEntityKey,
} from "../lib/faa-ingestor";
import { readFileSync } from "node:fs";

const base = {
  nNumber: "N70001",
  registrantName: "PUBLIC HOLDINGS LLC",
  fractionalOwnershipFlag: "N",
  statusCode: "V",
  typeAircraft: "5",
  typeEngine: "4",
  yearManufactured: "2020",
  serialNumber: "SERIAL-70001",
  state: "TX",
  country: "US",
  lastActivityDate: "2026/10/01",
};

describe("FAA legal-entity registrant candidates", () => {
  it.each([
    ["2", "Partnership"],
    ["3", "Corporation"],
    ["7", "LLC"],
    ["8", "Non-Citizen Corporation"],
  ] as const)("creates a review-only company candidate for registrant type %s", (registrantTypeCode, label) => {
    const entity = buildFaaRegistrantEntity({ ...base, registrantTypeCode });
    expect(entity?.type).toBe("Corporation");
    expect(entity?.estimatedNetWorth).toBeNull();
    const metadata = JSON.parse(entity?.metadata ?? "{}");
    expect(metadata).toMatchObject({
      registrantTypeCode,
      registrantTypeLabel: label,
      identityStatus: "legal_entity_candidate",
      beneficialOwnershipStatus: "unresolved",
      ownershipStatus: expect.stringContaining("beneficial_owners_unresolved"),
      wealthStatus: "not_assessed",
      hnwiQualificationStatus: "not_assessed",
      personalWealthEvidence: false,
      reviewOnly: true,
    });
  });

  it("does not merge a same-name partnership, corporation and LLC into one FAA identity", () => {
    const partnership = buildFaaRegistrantEntity({ ...base, registrantTypeCode: "2" });
    const corporation = buildFaaRegistrantEntity({ ...base, registrantTypeCode: "3" });
    const llc = buildFaaRegistrantEntity({ ...base, registrantTypeCode: "7" });
    expect(faaRegistrantEntityKey(partnership!)).not.toBe(faaRegistrantEntityKey(corporation!));
    expect(faaRegistrantEntityKey(corporation!)).not.toBe(faaRegistrantEntityKey(llc!));
    expect(faaRegistrantEntityKey(partnership!)).toBe(
      createFaaRegistrantEntityKey(partnership!.name, "TX", "US", "2"),
    );
  });

  it("reprocesses a tail number when registrant or any source-owned record field changes", () => {
    const base = {
      registrantName: "PUBLIC HOLDINGS LLC",
      state: "TX",
      country: "US",
      registrantTypeCode: "3",
      statusCode: "V",
      lastActivityDate: "2026/10/01",
      expirationDate: "2028/10/01",
      fractionalOwnershipFlag: "N",
      uniqueId: "FAA-ENTITY-1",
      serialNumber: "SERIAL-70001",
      yearManufactured: "2020",
      typeAircraft: "5",
      typeEngine: "4",
      manufacturerModelCode: "1234567",
      engineModelCode: "12345",
    };
    const baseKey = createFaaRegistrationDedupKey({ ...base, nNumber: "N70001" });
    const sameKey = createFaaRegistrationDedupKey({ ...base, nNumber: "70001" });
    const changedRegistrant = createFaaRegistrationDedupKey({
      ...base,
      nNumber: "N70001",
      registrantName: "NEW REGISTRANT LLC",
      registrantTypeCode: "7",
    });
    const changedLastAction = createFaaRegistrationDedupKey({
      ...base,
      nNumber: "N70001",
      lastActivityDate: "2026/11/01",
    });
    const changedFractionalStatus = createFaaRegistrationDedupKey({
      ...base,
      nNumber: "N70001",
      fractionalOwnershipFlag: "Y",
    });
    const changedExpiration = createFaaRegistrationDedupKey({
      ...base,
      nNumber: "N70001",
      expirationDate: "2029/10/01",
    });
    const changedAircraftDetails = createFaaRegistrationDedupKey({
      ...base,
      nNumber: "N70001",
      serialNumber: "SERIAL-70002",
    });
    expect(baseKey).toBe(sameKey);
    expect(baseKey).not.toBe(changedRegistrant);
    expect(baseKey).not.toBe(changedLastAction);
    expect(baseKey).not.toBe(changedFractionalStatus);
    expect(baseKey).not.toBe(changedExpiration);
    expect(baseKey).not.toBe(changedAircraftDetails);
    expect(baseKey).toMatch(/^faa:v2:N70001:/);
  });

  it("preserves the existing individual key format and excludes unresolved government/co-owned types", () => {
    expect(createFaaRegistrantEntityKey("Smith, Walter", "CA", "US")).toBe(
      createFaaRegistrantEntityKey("Smith, Walter", "CA", "US", "1"),
    );
    expect(buildFaaRegistrantEntity({ ...base, registrantTypeCode: "4" })).toBeNull();
    expect(buildFaaRegistrantEntity({ ...base, registrantTypeCode: "5" })).toBeNull();
    expect(buildFaaRegistrantEntity({ ...base, registrantTypeCode: "9" })).toBeNull();
  });

  it("uses the combined sanitized fallback and includes only supported registrant types", () => {
    const source = readFileSync(new URL("../lib/faa-ingestor.ts", import.meta.url), "utf8");
    expect(source).toContain("faa_sanitized_MASTER_ALL.txt");
    expect(source).toContain('if (!["1", "2", "3", "7", "8"].includes(typeReg)) continue;');
  });
});
