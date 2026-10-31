import { describe, expect, it } from "vitest";
import { buildDiscoverySourceAttribution } from "../lib/discovery-source-attribution";

describe("discovery source attribution", () => {
  it("keeps retrieval mechanism distinct from an unresolved publisher identity", () => {
    const attribution = buildDiscoverySourceAttribution({
      sourceUrl: "https://community.example.org/posts/42",
      action: "browser_fetch",
      observedAt: new Date("2026-10-31T10:00:00.000Z"),
    });
    expect(attribution).toMatchObject({
      sourceName: "community.example.org",
      sourceNameKind: "domain_fallback",
      sourceDomain: "community.example.org",
      sourceClass: "public_web_unclassified",
      sourceContributor: null,
      sourceMechanism: "browser_fetch",
      originalObservedAt: "2026-10-31T10:00:00.000Z",
      independentCorroborationStatus: "not_assessed",
    });
  });

  it("preserves explicit adapter publisher, class and contributor without promoting authority", () => {
    const attribution = buildDiscoverySourceAttribution({
      sourceUrl: "https://registry.example.gov/record/1",
      action: "registry_search",
      sourceName: "Example Public Registry",
      sourceClass: "official_registry",
      sourceContributor: "Registry operator",
      sourceDomain: "registry.example.gov",
      observedAt: "2026-10-31T11:00:00Z",
    });
    expect(attribution).toMatchObject({
      sourceName: "Example Public Registry",
      sourceNameKind: "publisher_name",
      sourceClass: "official_registry",
      sourceContributor: "Registry operator",
      sourceMechanism: "registry_search",
      independentCorroborationStatus: "not_assessed",
    });
  });

  it("does not infer an official source class from a registry action alone", () => {
    const attribution = buildDiscoverySourceAttribution({
      sourceUrl: "https://unknown.example/data",
      action: "parallel_registry_search",
    });
    expect(attribution.sourceClass).toBe("registry_adapter_unclassified");
    expect(attribution.sourceNameKind).toBe("domain_fallback");
  });
});
