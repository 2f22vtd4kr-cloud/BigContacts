import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isEligibleBrregCompany, parseRegistryCsv } from "../lib/brreg-snapshot-ingestor";

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
    expect(rows).toHaveLength(28);
    expect(organizations).toHaveLength(5);
    expect(people).toHaveLength(23);
    expect(people.every((row) => row.entity_type === "Gatekeeper")).toBe(true);
    expect(people.every((row) => !row.organization_email && !row.organization_phone)).toBe(true);
    expect(people.some((row) => row.role.includes("Executive Personal Assistant"))).toBe(true);
    expect(people.some((row) => row.role.includes("Secretary / Personal Assistant"))).toBe(true);
    expect(people.some((row) => row.role.includes("Senior Executive Assistant to the CEO"))).toBe(true);
    expect(people.some((row) => row.professional_email === "frida@oslofamilyoffice.com")).toBe(true);
    expect(rows.every((row) => row.source_url.startsWith("https://"))).toBe(true);
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
