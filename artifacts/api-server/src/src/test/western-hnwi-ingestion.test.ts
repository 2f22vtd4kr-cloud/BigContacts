import { describe, expect, it } from "vitest";
import {
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
