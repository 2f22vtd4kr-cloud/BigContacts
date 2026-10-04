import { describe, expect, it } from "vitest";
import { buildDiscoveryIntelligence, renderDiscoveryIntelligence } from "../lib/discovery-frontier";

describe("Apex discovery frontier", () => {
  it("derives multiple search dimensions without choosing a tool or route", () => {
    const state = buildDiscoveryIntelligence({
      objective: "Find the beneficial owner of a Slovenian casino or gaming company; registry and web_search source families",
      actions: [
        {
          action: "web_search",
          args: { query: "Slovenia casino owner founder", provider: "serper", purpose: "test ownership hypothesis" },
          execution: "success",
          urls: ["https://example.com/a"],
          findings: [{ personName: "Jane Doe", role: "founder", value: "Jane Doe" }],
        },
        {
          action: "registry_search",
          args: { registry: "brreg", query: "company director" },
          execution: "success",
          urls: ["https://registry.example/a"],
          findings: [{ personName: "Jane Doe", role: "director", value: "Jane Doe" }],
        },
      ],
      repeatedSourceFamilies: [],
    });

    const byName = new Map(state.dimensions.map((dimension) => [dimension.name, dimension]));
    expect(byName.get("jurisdiction")?.observed).toContain("Slovenia");
    expect(byName.get("sector")?.observed).toContain("casino");
    expect(byName.get("role")?.observed).toContain("owner");
    expect(byName.get("sourceFamily")?.observed).toEqual(expect.arrayContaining(["web_search", "registry"]));
    expect(state.bridgeEntities[0]?.value).toBe("Jane Doe");
    expect(state.frontier.length).toBeGreaterThan(0);
    expect(state.explorationPolicy.exploitation).toBeGreaterThan(0);
  });

  it("raises exploration pressure when source families saturate or dimensions remain unknown", () => {
    const state = buildDiscoveryIntelligence({
      objective: "Find an owner",
      actions: [
        { action: "web_search", args: { query: "owner" }, execution: "success", urls: ["https://example.com"], findings: [] },
        { action: "web_search", args: { query: "owner" }, execution: "success", urls: ["https://example.com/2"], findings: [] },
      ],
      repeatedSourceFamilies: ["web_search"],
    });

    expect(state.sourceFamilySaturation).toContain("web_search repeated/saturated");
    expect(state.frontier.some((branch) => branch.mode === "blind_spot")).toBe(true);
    expect(state.explorationPolicy.blindSpotExploration).toBeGreaterThanOrEqual(0.1);
  });

  it("keeps rendering bounded and explicitly advisory", () => {
    const state = buildDiscoveryIntelligence({ objective: "Find a private company owner" });
    const rendered = renderDiscoveryIntelligence(state, 1500);
    expect(rendered.length).toBeLessThanOrEqual(1500);
    expect(rendered).toContain("advisory search-space state");
    expect(rendered).toContain("Investigator owns the next action");
  });
});
