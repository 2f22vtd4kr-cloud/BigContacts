import { describe, expect, it } from "vitest";
import { ATLAS_CAPABILITIES, exposeAttestedCapabilities, renderAtlasCapabilityGuidanceCompact } from "../lib/atlas-capability-registry";

describe("Atlas capability prompt guidance", () => {
  it("keeps every model-selectable capability visible within the existing 1000-character prompt budget", () => {
    const guidance = renderAtlasCapabilityGuidanceCompact();
    const selectable = ATLAS_CAPABILITIES.filter((capability) => capability.investigatorSelectable !== false);
    const disabled = ATLAS_CAPABILITIES.filter((capability) => capability.investigatorSelectable === false);

    expect(guidance.length).toBeLessThanOrEqual(1_000);
    expect(guidance).not.toContain("AUXILIARY CONTEXT BOUND");

    const webSearchCapabilities = selectable.filter((capability) => capability.action === "web_search");
    expect(webSearchCapabilities.length).toBeGreaterThan(0);
    expect(guidance).toContain("web.search (web_search): providers=serper|tavily|exa");
    for (const capability of selectable.filter((entry) => entry.action !== "web_search")) {
      expect(guidance).toContain(`- ${capability.id} (${capability.action}):`);
    }
    for (const capability of selectable) {
      expect(capability.decisionGuidance?.trim().length).toBeGreaterThan(0);
    }
    for (const capability of disabled) {
      expect(guidance).not.toContain(`- ${capability.id} (`);
    }
  });

  it("groups web providers into one neutral source family without losing provider availability", () => {
    const guidance = renderAtlasCapabilityGuidanceCompact();

    expect(guidance).toContain("web.search (web_search): providers=serper|tavily|exa");
    expect(guidance).toContain("neutral first-discovery option");
    expect(guidance).not.toContain("- search.serper (web_search)");
    expect(guidance).not.toContain("- search.tavily (web_search)");
    expect(guidance).not.toContain("- search.exa (web_search)");
  });

  it("gives an attested SpiderFoot capability actionable compact guidance", () => {
    const attestedCapabilities = ATLAS_CAPABILITIES.map((capability) =>
      capability.id === "osint.spiderfoot"
        ? { ...capability, investigatorSelectable: true }
        : capability,
    );
    const guidance = renderAtlasCapabilityGuidanceCompact(attestedCapabilities);

    expect(guidance).toContain("- osint.spiderfoot (footprint_spiderfoot): grounded seed; match targetType/profile to hypothesis; high cost; correlated events/URLs are leads, not independent proof");
    expect(guidance.length).toBeLessThanOrEqual(2_200);
  });

  it("preserves retrieval limitations and evidence boundaries in the compact guidance", () => {
    const guidance = renderAtlasCapabilityGuidanceCompact();

    expect(guidance).toContain("snippets are leads");
    expect(guidance).toContain("answers are not primary evidence");
    expect(guidance).toContain("JS/challenge pages may fail");
    expect(guidance).toContain("legal role ≠ personal contact");
    expect(guidance).toContain("privacy/proxy may obscure owner");
    expect(guidance).toContain("web.search (web_search): providers=serper|tavily|exa");
    expect(guidance).toContain("neutral first-discovery option");
    expect(guidance).not.toContain("- search.tavily (web_search)");
    expect(guidance).not.toContain("- search.exa (web_search)");

    const firstOrder = renderAtlasCapabilityGuidanceCompact(undefined, () => 0);
    const secondOrder = renderAtlasCapabilityGuidanceCompact(undefined, () => 0.999999);
    expect(firstOrder).not.toEqual(secondOrder);

  });
});


describe("runtime-attested capability exposure", () => {
  it("keeps worker capabilities hidden until their exact action is attested for this turn", () => {
    const noAttestation = exposeAttestedCapabilities([]);
    expect(noAttestation.find((capability) => capability.id === "identity.maigret")?.investigatorSelectable).toBe(false);
    expect(noAttestation.find((capability) => capability.id === "identity.sherlock")?.investigatorSelectable).toBe(false);
    expect(noAttestation.find((capability) => capability.id === "contact.email")?.investigatorSelectable).toBe(false);
    expect(noAttestation.find((capability) => capability.id === "osint.spiderfoot")?.investigatorSelectable).toBe(false);
    expect(noAttestation.find((capability) => capability.id === "web.visit")?.investigatorSelectable).not.toBe(false);
  });

  it("promotes only the worker capability whose exact action is present in the attested allowlist", () => {
    const attested = exposeAttestedCapabilities(["footprint_spiderfoot"]);
    expect(attested.find((capability) => capability.id === "osint.spiderfoot")?.investigatorSelectable).toBe(true);
    expect(attested.find((capability) => capability.id === "identity.maigret")?.investigatorSelectable).toBe(false);
    expect(attested.find((capability) => capability.id === "identity.sherlock")?.investigatorSelectable).toBe(false);
    expect(attested.find((capability) => capability.id === "domain.harvest")?.investigatorSelectable).toBe(false);
    expect(attested.find((capability) => capability.id === "contact.email")?.investigatorSelectable).toBe(false);
    expect(renderAtlasCapabilityGuidanceCompact(attested)).toContain("- osint.spiderfoot (footprint_spiderfoot):");
    expect(renderAtlasCapabilityGuidanceCompact(attested)).not.toContain("- identity.maigret (");
  });
});
