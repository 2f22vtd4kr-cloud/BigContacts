import { describe, expect, it } from "vitest";
import { ATLAS_CAPABILITIES, renderAtlasCapabilityGuidanceCompact } from "../lib/atlas-capability-registry";

describe("Atlas capability prompt guidance", () => {
  it("keeps every model-selectable capability visible within the existing 1000-character prompt budget", () => {
    const guidance = renderAtlasCapabilityGuidanceCompact();
    const selectable = ATLAS_CAPABILITIES.filter((capability) => capability.investigatorSelectable !== false);
    const disabled = ATLAS_CAPABILITIES.filter((capability) => capability.investigatorSelectable === false);

    expect(guidance.length).toBeLessThanOrEqual(1_000);
    expect(guidance).not.toContain("AUXILIARY CONTEXT BOUND");

    for (const capability of selectable) {
      expect(guidance).toContain(`- ${capability.id} (${capability.action}):`);
      expect(capability.decisionGuidance?.trim().length).toBeGreaterThan(0);
    }
    for (const capability of disabled) {
      expect(guidance).not.toContain(`- ${capability.id} (`);
    }
  });

  it("identifies each search provider individually rather than presenting a false interchangeable list", () => {
    const guidance = renderAtlasCapabilityGuidanceCompact();

    expect(guidance).toContain("- search.serper (web_search): provider=serper;");
    expect(guidance).toContain("- search.tavily (web_search): provider=tavily;");
    expect(guidance).toContain("- search.exa (web_search): provider=exa;");
    expect(guidance).not.toContain("provider=serper|tavily|exa");
  });

  it("preserves retrieval limitations and evidence boundaries in the compact guidance", () => {
    const guidance = renderAtlasCapabilityGuidanceCompact();

    expect(guidance).toContain("snippets are leads");
    expect(guidance).toContain("answers are leads, not primary evidence");
    expect(guidance).toContain("JS/challenge pages may fail");
    expect(guidance).toContain("legal role ≠ personal contact");
    expect(guidance).toContain("privacy/proxy may obscure owner");
  });
});
