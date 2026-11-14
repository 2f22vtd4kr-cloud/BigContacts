import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  areCompatibleWesternRegistryEntityTypes,
  buildWesternRegistryPersonCandidate,
  isPlaceholderRegistryName,
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
