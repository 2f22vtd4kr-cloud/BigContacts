import { describe, expect, it } from "vitest";
import { bindExactRegistryLeadName } from "./registry-result-source-binding";

describe("registry result source binding", () => {
  const firstUrl = "https://registry.example.test/company/123";
  const secondUrl = "https://registry.example.test/company/456";

  it("binds a name only to the exact registry row that contains its URL", () => {
    const observation = [
      "REGISTRY example-registry query=business",
      "Acme Holdings AS — registered company; UNVISITED_RECORD_URLS (leads only): " + firstUrl,
      "Other Person — registered officer; UNVISITED_RECORD_URLS (leads only): " + secondUrl,
    ].join("\n");

    expect(bindExactRegistryLeadName(observation, firstUrl, "Acme Holdings AS")?.exact).toBe(true);
    expect(bindExactRegistryLeadName(observation, secondUrl, "Other Person")?.exact).toBe(true);
    expect(bindExactRegistryLeadName(observation, firstUrl, "Other Person")).toBeNull();
    expect(bindExactRegistryLeadName(observation, secondUrl, "Acme Holdings AS")).toBeNull();
  });

  it("does not treat a URL elsewhere in the observation as evidence for a name", () => {
    const observation = [
      "Unrelated mention of Alex Example in a registry summary.",
      "Acme Holdings AS — registered company; UNVISITED_RECORD_URLS (leads only): " + firstUrl,
    ].join("\n");
    expect(bindExactRegistryLeadName(observation, firstUrl, "Alex Example")).toBeNull();
  });

  it("normalizes harmless URL host, trailing-slash and fragment differences", () => {
    const observation = "Acme Holdings AS — registered company; UNVISITED_RECORD_URLS (leads only): https://REGISTRY.example.test/company/123/#record";
    expect(bindExactRegistryLeadName(observation, firstUrl, "Acme Holdings AS")?.exact).toBe(true);
  });
});
