import { describe, expect, it } from "vitest";
import { checkPythonToolsAvailability, runHolehe, runMaigret, runSherlock, runTheHarvester, runOpenDeepResearch, runSpiderFoot } from "../lib/python-tools";
import { ATLAS_CAPABILITIES, exposeAttestedCapabilities, renderAtlasCapabilityGuidanceCompact } from "../lib/atlas-capability-registry";

const trustedWorkerUnavailable = (tool: string) =>
  `No trusted, healthy Apex Python OSINT worker is available for ${tool}.`;

describe("Investigator-visible capability truth", () => {
  it("keeps worker actions out of the default prompt until runtime attestation supplies them", () => {
    const workerActions = [
      "harvest_domain",
      "footprint_email",
      "footprint_username_maigret",
      "footprint_username_sherlock",
      "footprint_spiderfoot",
    ];
    const defaultPrompt = renderAtlasCapabilityGuidanceCompact();
    for (const action of workerActions) {
      expect(ATLAS_CAPABILITIES.some((capability) =>
        capability.action === action && capability.investigatorSelectable === false,
      )).toBe(true);
      expect(defaultPrompt).not.toContain(`(${action})`);
    }
    expect(defaultPrompt).toContain("registry.search");
    expect(defaultPrompt).toContain("web.visit");
  });

  it("exposes each worker tool to the model only when its exact action is attested for this turn", () => {
    const attestedActions = ["footprint_email", "footprint_spiderfoot"];
    const prompt = renderAtlasCapabilityGuidanceCompact(exposeAttestedCapabilities(attestedActions));
    expect(prompt).toContain("(footprint_email)");
    expect(prompt).toContain("(footprint_spiderfoot)");
    expect(prompt).not.toContain("(footprint_username_maigret)");
    expect(prompt).not.toContain("(footprint_username_sherlock)");
    expect(prompt).not.toContain("(harvest_domain)");
  });
});

describe("Python OSINT availability diagnostics", () => {
  it("does not advertise tools without a trusted, attested worker", async () => {
    await expect(checkPythonToolsAvailability()).resolves.toEqual({
      holehe: false,
      maigret: false,
      sherlock: false,
      theHarvester: false,
      spiderfoot: false,
      openDeepResearch: false,
    });
  });
});

describe("Python OSINT source boundary", () => {
  it("fails closed before Holehe can start a network-capable subprocess", async () => {
    const result = await runHolehe("person@example.com");
    expect(result.available).toBe(false);
    expect(result.found).toEqual([]);
    expect(result.error).toBe(trustedWorkerUnavailable("holehe"));
  });

  it("fails closed before Maigret can start a network-capable subprocess", async () => {
    const result = await runMaigret("alice");
    expect(result.available).toBe(false);
    expect(result.found).toEqual([]);
    expect(result.error).toBe(trustedWorkerUnavailable("maigret"));
  });

  it("fails closed before Sherlock can start a network-capable subprocess", async () => {
    const result = await runSherlock("alice");
    expect(result.available).toBe(false);
    expect(result.reviewOnly).toBe(true);
    expect(result.found).toEqual([]);
    expect(result.error).toBe(trustedWorkerUnavailable("sherlock"));
  });

  it("fails closed before theHarvester can start a network-capable subprocess", async () => {
    const result = await runTheHarvester("example.com");
    expect(result.available).toBe(false);
    expect(result.emails).toEqual([]);
    expect(result.error).toBe(trustedWorkerUnavailable("theharvester"));
  });


  it("fails closed before SpiderFoot can start a network-capable subprocess", async () => {
    const result = await runSpiderFoot("example.com", "domain", "domain-infrastructure");
    expect(result.available).toBe(false);
    expect(result.reviewOnly).toBe(true);
    expect(result.observations).toEqual([]);
    expect(result.eventsReceived).toBe(0);
    expect(result.partial).toBe(false);
    expect(result.error).toBe(trustedWorkerUnavailable("spiderfoot"));
  });

  it("fails closed for the Python-backed deep-research adapter as well", async () => {
    const result = await runOpenDeepResearch("research example.com");
    expect(result.available).toBe(false);
    expect(result.reviewOnly).toBe(true);
    expect(result.report).toBeNull();
    expect(result.error).toBe("No canonical non-AI execution adapter exists for the model-backed deep-research capability.");
  });
});
