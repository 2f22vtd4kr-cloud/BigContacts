import { describe, expect, it } from "vitest";
import { REGISTRY_COVERAGE_MATRIX } from "../lib/registry-matrix";

describe("registry source class catalogue", () => {
  it("classifies every runtime adapter without conflating commercial providers and official registries", () => {
    const implemented = REGISTRY_COVERAGE_MATRIX.filter((item) => item.runtimeAdapterImplemented);
    expect(implemented.length).toBeGreaterThan(0);
    expect(implemented.every((item) => typeof item.sourceClass === "string" && item.sourceClass.length > 0)).toBe(true);
    expect(REGISTRY_COVERAGE_MATRIX.find((item) => item.id === "atoka-italy")?.sourceClass).toBe("licensed_commercial_provider");
    expect(REGISTRY_COVERAGE_MATRIX.find((item) => item.id === "opencorporates")?.sourceClass).toBe("licensed_commercial_aggregator");
    expect(REGISTRY_COVERAGE_MATRIX.find((item) => item.id === "faa")?.sourceClass).toBe("official_registry");
    expect(REGISTRY_COVERAGE_MATRIX.find((item) => item.id === "hmlr-ppd")?.sourceClass).toBe("official_transaction_dataset");
    expect(REGISTRY_COVERAGE_MATRIX.find((item) => item.id === "gleif")?.sourceClass).toBe("authoritative_registry");
  });
});
