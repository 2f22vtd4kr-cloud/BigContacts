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
