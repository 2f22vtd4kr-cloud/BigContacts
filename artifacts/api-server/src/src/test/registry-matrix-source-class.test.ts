import { describe, expect, it } from "vitest";
import { REGISTRY_COVERAGE_MATRIX, renderRegistryCoverageGuidance, resolveRegistryRuntimeMode, resolveRegistryRuntimeNote } from "../lib/registry-matrix";

describe("registry source class catalogue", () => {
  it("renders actual adapter coverage and prevents entity-identity data being mistaken for personal wealth evidence", () => {
    const guidance = renderRegistryCoverageGuidance(["gleif", "companies-house", "ares-czechia"]);
    expect(guidance).toContain("gleif — GLEIF LEI Register");
    expect(guidance).toContain("entity=LEI");
    expect(guidance).toContain("people/roles=Limited parent/relationship data");
    expect(guidance).toContain("ownership limits=Parent relationships where reported");
    expect(guidance).toContain("companies-house — Companies House");
    expect(guidance).toContain("ownership limits=PSC records where filed");
    expect(guidance).toContain("ownership limits=No beneficial-owner inference from base search");
  });

  it("classifies every runtime adapter without conflating commercial providers and official registries", () => {
    const implemented = REGISTRY_COVERAGE_MATRIX.filter((item) => item.runtimeAdapterImplemented);
    expect(implemented.length).toBeGreaterThan(0);
    expect(implemented.every((item) => typeof item.sourceClass === "string" && item.sourceClass.length > 0)).toBe(true);
    expect(REGISTRY_COVERAGE_MATRIX.find((item) => item.id === "atoka-italy")?.sourceClass).toBe("licensed_commercial_provider");
    expect(REGISTRY_COVERAGE_MATRIX.find((item) => item.id === "opencorporates")?.sourceClass).toBe("licensed_commercial_aggregator");
    expect(REGISTRY_COVERAGE_MATRIX.find((item) => item.id === "faa")?.sourceClass).toBe("official_registry");
    expect(REGISTRY_COVERAGE_MATRIX.find((item) => item.id === "hmlr-ppd")?.sourceClass).toBe("official_transaction_dataset");
    expect(REGISTRY_COVERAGE_MATRIX.find((item) => item.id === "gleif")?.sourceClass).toBe("authoritative_registry");
    const faa = REGISTRY_COVERAGE_MATRIX.find((item) => item.id === "faa")!;
    const hmlr = REGISTRY_COVERAGE_MATRIX.find((item) => item.id === "hmlr-ppd")!;
    expect(resolveRegistryRuntimeMode(faa, true, false)).toBe("explicit_only");
    expect(resolveRegistryRuntimeNote(faa, true, false)).toContain("Direct FAA name/N-number search");
    expect(resolveRegistryRuntimeMode(hmlr, false, false)).toBe("bulk_only");
  });
});
