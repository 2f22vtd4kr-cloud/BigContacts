import { describe, expect, it } from "vitest";
import { buildWesternRegistrySourceEvidence } from "../lib/western-hnwi-ingestion";

describe("Western registry source provenance", () => {
  it("keeps registry source class separate from the source URL and ingestion mechanism", () => {
    const evidence = buildWesternRegistrySourceEvidence("BRREG Norway — Enhetsregisteret", {
      brregUrl: "https://www.brreg.no/company/123456789/",
    });
    expect(evidence).toEqual([{
      sourceUrl: "https://www.brreg.no/company/123456789/",
      sourceName: "BRREG Norway — Enhetsregisteret",
      sourceDomain: "brreg.no",
      sourceClass: "registry_adapter_source",
      sourceContributor: null,
      sourceMechanism: "western_registry_ingest",
      verificationLevel: "registry_record",
      independentCorroborationStatus: "not_assessed",
    }]);
  });

  it("does not invent a source URL when the adapter provides none", () => {
    const evidence = buildWesternRegistrySourceEvidence("SEC EDGAR — DEF 14A (Proxy)", {
      source: "sec-edgar-def14a",
      fileDate: "2026-10-31",
    });
    expect(evidence[0]).toMatchObject({
      sourceName: "SEC EDGAR — DEF 14A (Proxy)",
      sourceClass: "registry_adapter_source",
      verificationLevel: "registry_record",
    });
    expect(evidence[0]).not.toHaveProperty("sourceUrl");
  });
});
