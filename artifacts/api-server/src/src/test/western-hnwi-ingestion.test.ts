import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  areCompatibleWesternRegistryEntityTypes,
  buildWesternRegistryPersonCandidate,
  isPlaceholderRegistryName,
  parseBrregMunicipalityScope,
  parseCompaniesHouseOfficerQueries,
  parseRegistrySeedQueries,
  type HarvestedPerson,
} from "../lib/western-hnwi-ingestion";

function candidate(name: string): HarvestedPerson {
  return {
    name,
    nationality: "UA",
    location: "Kyiv",
    sourceRegistry: "Public company officer register",
    filingType: "officer",
    role: "Director",
    companyName: "Example Holdings Ltd",
    rawMetadata: { sourceRecordId: "record-1", rawName: name },
    signals: {
      isLargeShareholder: false,
      isBoardDirector: true,
      isCompanyOfficer: true,
      hasRecentFiling: false,
      jurisdiction: "UA",
    },
  };
}

describe("Western registry mass-seed admission", () => {
  it("refuses a global dedup reset and never clears shared dedup state before claiming the lane", () => {
    const route = readFileSync(new URL("../routes/ingest.ts", import.meta.url), "utf8");
    const worker = readFileSync(new URL("../lib/western-hnwi-ingestion.ts", import.meta.url), "utf8");
    expect(route).toContain("GLOBAL_DEDUP_RESET_DISABLED");
    expect(route).toContain("Global dedup reset is disabled for Western registry ingestion");
    expect(route).not.toMatch(/await\s+clearDedup\s*\(/u);
    expect(worker).not.toContain("clearDedupFirst");
    expect(worker).not.toMatch(/await\s+clearDedup\s*\(/u);
  });

  it("deduplicates legacy HNWI/Gatekeeper rows against new PersonCandidate rows without cross-type collisions", () => {
    expect(areCompatibleWesternRegistryEntityTypes("HNWI", "PersonCandidate")).toBe(true);
    expect(areCompatibleWesternRegistryEntityTypes("Gatekeeper", "PersonCandidate")).toBe(true);
    expect(areCompatibleWesternRegistryEntityTypes("PersonCandidate", "HNWI")).toBe(true);
    expect(areCompatibleWesternRegistryEntityTypes("Corporation", "PersonCandidate")).toBe(false);
    expect(areCompatibleWesternRegistryEntityTypes("Trust", "Corporation")).toBe(false);
  });

  it("keeps multilingual and single-token names as provisional model-review candidates", () => {
    expect(isPlaceholderRegistryName("Джон Смит")).toBe(false);
    expect(isPlaceholderRegistryName("李")).toBe(false);
    expect(isPlaceholderRegistryName("Արամ")).toBe(false);
    expect(isPlaceholderRegistryName("Unknown")).toBe(true);
    expect(isPlaceholderRegistryName("")).toBe(true);
  });

  it("does not discard SEC or Companies House names through a pre-LLM English/Latin classifier", () => {
    const worker = readFileSync(new URL("../lib/western-hnwi-ingestion.ts", import.meta.url), "utf8");
    // The deprecated helper remains for rollback, but only its definition may remain.
    expect(worker.match(/looksLikePerson\(/gu) ?? []).toHaveLength(1);
    expect(worker).toContain("allCleanNames.filter((name: string) => isStructurallyValidCandidateName(name))");
    expect(worker).toContain("if (!isStructurallyValidCandidateName(rawName)) continue;");
    expect(worker).toContain("displayNames: allCleanNames");
    expect(worker).toContain("if (!isStructurallyValidCandidateName(fullName)) continue;");
    expect(worker).toContain("organizationForm: orgForm");
    expect(worker).toContain("employeeCount: employees");
    expect(worker).not.toContain('if ((orgForm === "ENK" || orgForm === "FLI")');
    expect(worker).not.toContain('if (orgForm === "AS" && employees < 2)');
    expect(worker).toContain("process.env.APEX_BRREG_MUNICIPALITIES");
    expect(worker).toContain('entityType: "Corporation"');
    expect(worker).not.toMatch(/isBoardDirector:\s*\/(?:director|chairman)/u);
    expect(worker).toContain("isBoardDirector: false");
    expect(worker).toContain("sourceRecordFingerprint: fingerprint");
    expect(worker).not.toContain('const key = `${entity.type}:${normalizeName(entity.name)}`');
    expect(worker).not.toContain("normalizeName(prior.name) === normalizedName");
  });

  it("allows the operator to select all BRREG municipalities or an explicit scope", () => {
    expect(parseBrregMunicipalityScope()).toEqual(["0301", "1201", "5001", "1103", "4601", "1505", "1804"]);
    expect(parseBrregMunicipalityScope("all")).toEqual([null]);
    expect(parseBrregMunicipalityScope("0301, 5001, 1103")).toEqual(["0301", "5001", "1103"]);
    expect(parseBrregMunicipalityScope("invalid")).toEqual(["0301", "1201", "5001", "1103", "4601", "1505", "1804"]);
  });

  it("allows operator-selected multilingual bulk registry query scopes", () => {
    expect(parseCompaniesHouseOfficerQueries("directeur|gerente|administrador")).toEqual(["directeur", "gerente", "administrador"]);
    expect(parseRegistrySeedQueries("family office|investment office|holding company")).toEqual(["family office", "investment office", "holding company"]);
    expect(parseCompaniesHouseOfficerQueries(" | ")).toContain("director");
    expect(parseRegistrySeedQueries("")).toContain("holdings");
  });

  it("keeps same-name people separate when their source records differ", () => {
    const first = buildWesternRegistryPersonCandidate(candidate("Alex Smith"));
    const sameRecord = buildWesternRegistryPersonCandidate(candidate("Alex Smith"));
    const secondRecord = candidate("Alex Smith");
    secondRecord.rawMetadata = { ...secondRecord.rawMetadata, sourceRecordId: "record-2" };
    const second = buildWesternRegistryPersonCandidate(secondRecord);
    const secondSource = candidate("Alex Smith");
    secondSource.sourceRegistry = "Different official registry";
    const third = buildWesternRegistryPersonCandidate(secondSource);

    expect(first.key).toBe(sameRecord.key);
    expect(first.key).not.toBe(second.key);
    expect(first.key).not.toBe(third.key);
    const metadata = JSON.parse(first.entity.metadata ?? "{}");
    expect(metadata.sourceRecordFingerprint).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("persists a source-designated company registrant as Corporation rather than PersonCandidate", () => {
    const company = candidate("Example Holdings Ltd");
    company.entityType = "Corporation";
    company.sourceRegistry = "SEC EDGAR — DEF 14A (Proxy)";
    company.rawMetadata = { sourceRecordId: "sec-cik:1234567", displayNames: ["Example Holdings Ltd (CIK 1234567)"] };
    const { entity } = buildWesternRegistryPersonCandidate(company);
    expect(entity.type).toBe("Corporation");
    expect(entity.contactMethod).toContain("company registry lead");
  });

  it("persists a source-designated person as PersonCandidate without inferring HNWI or residence", () => {
    const { entity } = buildWesternRegistryPersonCandidate(candidate("Анастасия Довженко"));
    expect(entity.name).toBe("Анастасия Довженко");
    expect(entity.type).toBe("PersonCandidate");
    expect(entity.estimatedNetWorth).toBeNull();
    expect(entity.knownResidences).toBeNull();
    expect(entity.isHot).toBe(false);
    const metadata = JSON.parse(entity.metadata ?? "{}");
    expect(metadata).toMatchObject({
      registryLocation: "Kyiv",
      nameValidationStatus: "pending_investigator_resolution",
      hnwiQualificationStatus: "unverified",
      wealthStatus: "unverified",
      reviewOnly: true,
      needsEnrichment: true,
    });
  });
});
