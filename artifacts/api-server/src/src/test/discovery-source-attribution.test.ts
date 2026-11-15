import { describe, expect, it } from "vitest";
import {
  COMMUNITY_SOURCE_OBSERVATION_NOTE,
  buildDiscoverySourceAttribution,
  extractCommunityObservationMetadata,
  isCommunityObservationSourceUrl,
  isRestrictedCommunitySourceUrl,
  sanitizeCommunityObservationText,
} from "../lib/discovery-source-attribution";

describe("community discovery source attribution", () => {
  it("classifies Virtual Globetrotting as a community lead without excluding its page text", () => {
    const url = "https://www.virtualglobetrotting.com/map/example-property/";
    expect(isCommunityObservationSourceUrl(url)).toBe(true);
    expect(isRestrictedCommunitySourceUrl(url)).toBe(true); // compatibility alias only
    expect(COMMUNITY_SOURCE_OBSERVATION_NOTE).toContain("material claims require independent corroboration");
    expect(COMMUNITY_SOURCE_OBSERVATION_NOTE).toContain("Do not copy images or retain precise residential coordinates");
  });

  it("preserves explicit contributor and original observation date while redacting precise coordinates", () => {
    const pageText = "Example estate. Submitted by Alice Example on 2024-01-02. Coordinates: 48.123456, 16.123456.";
    const safeText = sanitizeCommunityObservationText(pageText);
    const metadata = extractCommunityObservationMetadata(safeText);
    const attribution = buildDiscoverySourceAttribution({
      sourceUrl: "https://virtualglobetrotting.com/map/example-property/",
      action: "visit",
      sourceName: "Community member",
      sourceClass: "community_user_submitted_unverified",
      sourceContributor: metadata.sourceContributor,
      observedAt: metadata.originalObservedAt,
    });

    expect(safeText).toContain("[precise coordinates withheld]");
    expect(safeText).not.toContain("48.123456");
    expect(metadata).toEqual({
      sourceContributor: "Alice Example",
      originalObservedAt: "2024-01-02T00:00:00.000Z",
    });
    expect(attribution).toMatchObject({
      sourceName: "Virtual Globetrotting",
      sourceNameKind: "publisher_name",
      sourceDomain: "virtualglobetrotting.com",
      sourceClass: "community_user_submitted_unverified",
      sourceContributor: "Alice Example",
      sourceMechanism: "visit",
      originalObservedAt: "2024-01-02T00:00:00.000Z",
      independentCorroborationStatus: "not_assessed",
    });
  });

  it("keeps other publisher attribution separate from the retrieval mechanism", () => {
    const attribution = buildDiscoverySourceAttribution({
      sourceUrl: "https://registry.example.test/company/123",
      action: "browser_fetch",
      sourceName: "Official Company Registry",
      sourceClass: "official_registry",
      sourceContributor: "Registry operator",
      observedAt: "2025-04-03T00:00:00.000Z",
    });
    expect(attribution).toMatchObject({
      sourceName: "Official Company Registry",
      sourceNameKind: "publisher_name",
      sourceClass: "official_registry",
      sourceContributor: "Registry operator",
      sourceMechanism: "browser_fetch",
      originalObservedAt: "2025-04-03T00:00:00.000Z",
    });
  });
});
