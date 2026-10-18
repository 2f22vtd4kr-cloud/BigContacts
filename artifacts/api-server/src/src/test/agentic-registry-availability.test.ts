import { afterEach, describe, expect, it, vi } from "vitest";
import { structuredActionResponseFormat } from "../lib/agentic-web-research-core";

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
    expect(enums.direct).not.toContain("bolagsverket-sweden");
    expect(enums.direct).toContain(null);
    expect(enums.direct).not.toContain("opencorporates");
    expect(enums.direct).not.toContain("companies-house");
    expect(enums.parallel).toContain("sec-edgar");
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
