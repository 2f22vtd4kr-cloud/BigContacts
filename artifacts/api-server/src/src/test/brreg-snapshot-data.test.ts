import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildApexIntermediaryEntity, isEligibleBrregCompany, parseRegistryCsv } from "../lib/brreg-snapshot-ingestor";

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../data/registry-seeds");

describe("versioned BRREG seed snapshot", () => {
  it("contains the screened active company cohort without street addresses or postcodes", () => {
    const rows = parseRegistryCsv(readFileSync(resolve(dataDir, "brreg_company_seeds_2026-11-07.csv"), "utf8"));
    expect(rows).toHaveLength(5572);
    expect(rows.every(isEligibleBrregCompany)).toBe(true);
    expect(new Set(rows.map((row) => row.organization_number)).size).toBe(5572);
    expect(rows[0]).not.toHaveProperty("business_address");
    expect(rows[0]).not.toHaveProperty("business_postcode");
    expect(rows[0]).not.toHaveProperty("business_address_country");
  });

  it("contains source-backed close-to-principal professional and organization cards without transferring generic routes", () => {
    const rows = parseRegistryCsv(readFileSync(resolve(dataDir, "proximal_intermediaries_2026-11-08.csv"), "utf8"));
    const organizations = rows.filter((row) => row.record_type === "organization");
    const people = rows.filter((row) => row.record_type === "person");
    expect(rows).toHaveLength(43);
    expect(organizations).toHaveLength(5);
    expect(people).toHaveLength(38);
    expect(people.filter((row) => row.entity_type === "Gatekeeper")).toHaveLength(30);
    expect(people.filter((row) => row.entity_type === "PersonCandidate")).toHaveLength(8);
    expect(people.every((row) => Boolean(row.organization_source_record_id))).toBe(true);
    expect(people.every((row) => !row.organization_email && !row.organization_phone)).toBe(true);
    expect(people.some((row) => row.role.includes("Executive Personal Assistant"))).toBe(true);
    expect(people.some((row) => row.role.includes("Secretary / Personal Assistant"))).toBe(true);
    expect(people.some((row) => row.role.includes("Senior Executive Assistant to the CEO"))).toBe(true);
    expect(people.some((row) => row.professional_email === "frida@oslofamilyoffice.com")).toBe(true);
    expect(people.some((row) => row.role === "CEO, Canica Norway" && row.entity_type === "PersonCandidate")).toBe(true);
    expect(people.some((row) => row.role === "Office Manager, Canica Switzerland" && row.entity_type === "Gatekeeper")).toBe(true);
    expect(rows.every((row) => row.source_url.startsWith("https://"))).toBe(true);
  });

  it("keeps the DNB Private Banking service-line route scoped to a non-legal service card", () => {
    const rows = parseRegistryCsv(readFileSync(resolve(dataDir, "proximal_intermediaries_2026-11-08.csv"), "utf8"));
    const row = rows.find((item) => item.source_record_id === "apex-intermediary:dnb-private-banking");
    expect(row).toBeDefined();
    expect(row!.entity_type).toBe("Other");
    const entity = buildApexIntermediaryEntity(row!);
    expect(entity.type).toBe("Other");
    expect(entity.email).toBe("private.banking@dnb.no");
    expect(entity.contactOutcome).toBe("organization_contact");
    expect(JSON.parse(entity.metadata ?? "{}")).toMatchObject({
      entityNature: "Service line within DNB, not a separate legal entity; no individual adviser or client is identified.",
      contactScope: "organization_only",
      principalRelationshipStatus: "not_established",
      clientRelationshipStatus: "not_observed",
    });
  });

  it("contains only managing-director role evidence and no personal contact fields", () => {
    const rows = parseRegistryCsv(readFileSync(resolve(dataDir, "brreg_managing_director_seeds_2026-11-07.csv"), "utf8"));
    expect(rows).toHaveLength(336);
    expect(rows.every((row) => row.business_role === "Daglig leder")).toBe(true);
    expect(rows.every((row) => row.source_url.startsWith("https://data.brreg.no/"))).toBe(true);
    expect(rows.every((row) => row.contactability_status.includes("No person-level business contact"))).toBe(true);
    expect(rows[0]).not.toHaveProperty("email");
    expect(rows[0]).not.toHaveProperty("phone");
  });
});
