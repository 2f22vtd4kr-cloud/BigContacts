import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { structuredActionResponseFormat } from "../lib/agentic-web-research-core";
import { buildCreativeInvestigatorAngles } from "../lib/investigator-prompt-guide";
import { renderRegistryCoverageGuidance } from "../lib/registry-matrix";

function registryEnums(format: Record<string, unknown>) {
  const schema = (format.json_schema as { schema?: Record<string, any> } | undefined)?.schema;
  return {
    direct: schema?.properties?.registry?.enum as Array<string | null> | undefined,
    parallel: schema?.properties?.searches?.items?.properties?.registry?.enum as Array<string | null> | undefined,
  };
}

describe("Investigator registry schema reflects configured capabilities", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("hides key-gated registries from direct and parallel choices when no key is configured", () => {
    vi.stubEnv("OPENCORPORATES_API_TOKEN", "");
    vi.stubEnv("OPENCORPORATES_API_KEY", "");
    vi.stubEnv("COMPANIES_HOUSE_API_KEY", "");

    const enums = registryEnums(structuredActionResponseFormat("openai/gpt-oss-120b"));
    expect(enums.direct).toContain("sec-edgar");
    expect(enums.direct).toContain("faa");
    expect(enums.direct).not.toContain("bolagsverket-sweden");
    expect(enums.direct).toContain(null);
    expect(enums.direct).not.toContain("opencorporates");
    expect(enums.direct).not.toContain("companies-house");
    expect(enums.parallel).toContain("sec-edgar");
    expect(enums.parallel).toContain("faa");
    expect(enums.parallel).not.toContain("bolagsverket-sweden");
    expect(enums.parallel).toContain(null);
    expect(enums.parallel).not.toContain("opencorporates");
    expect(enums.parallel).not.toContain("companies-house");
  });

  it("restores OpenCorporates in both schema positions when a token is configured", () => {
    vi.stubEnv("OPENCORPORATES_API_TOKEN", "test-token");
    vi.stubEnv("OPENCORPORATES_API_KEY", "");
    vi.stubEnv("COMPANIES_HOUSE_API_KEY", "");

    const enums = registryEnums(structuredActionResponseFormat("openai/gpt-oss-120b"));
    expect(enums.direct).toContain("opencorporates");
    expect(enums.parallel).toContain("opencorporates");
  });
});


describe("model-facing registry inventory", () => {
  it("teaches future Investigator turns about available registries without prescribing an itinerary", () => {
    vi.stubEnv("COMPANIES_HOUSE_API_KEY", ""); vi.stubEnv("OPENCORPORATES_API_TOKEN", ""); vi.stubEnv("OPENCORPORATES_API_KEY", "");
    const prompt = buildCreativeInvestigatorAngles({ targetName: "Sample target", country: "US", includeInstitutionalOrientation: false });
    expect(prompt).not.toContain("AVAILABLE STRUCTURED REGISTRY INVENTORY");
    const coreSource = readFileSync(resolve(process.cwd(), "src/src/lib/agentic-web-research-core.ts"), "utf8");
    expect(coreSource).toContain("renderRegistryCoverageGuidance(availableRegistryIds)");
    expect(coreSource).toContain("SOURCE COVERAGE (not a checklist)");
    const inventory = renderRegistryCoverageGuidance(["sec-edgar", "faa"]);
    expect(inventory).toContain("faa — FAA Aircraft Registry (US)");
    expect(inventory).toContain("sec-edgar — SEC EDGAR (US)");
    expect(inventory).not.toContain("hmlr-ppd");
    expect(inventory).toContain("Registrant only; not beneficial-owner proof");
  });
});
