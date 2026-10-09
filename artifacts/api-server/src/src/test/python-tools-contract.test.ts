import { describe, expect, it } from "vitest";
import { runHolehe, runMaigret, runSherlock, runTheHarvester, runOpenDeepResearch, runSpiderFoot } from "../lib/python-tools";
import { ATLAS_CAPABILITIES, renderAtlasCapabilityGuidanceCompact } from "../lib/atlas-capability-registry";

const QUARANTINE_ERROR =
  "No trusted Apex Python sandbox attestation is installed; network-capable Python remains fail-closed.";

describe("Investigator-visible capability truth", () => {
  it("documents planned Python OSINT tools without presenting non-executors as selectable capabilities", () => {
    const disabled = [
      "harvest_domain",
      "footprint_email",
      "footprint_username_maigret",
      "footprint_username_sherlock",
      "footprint_spiderfoot",
    ];
    const promptCapabilities = renderAtlasCapabilityGuidanceCompact();
    for (const action of disabled) {
      expect(ATLAS_CAPABILITIES.some((capability) =>
        capability.action === action && capability.investigatorSelectable === false,
      )).toBe(true);
      expect(promptCapabilities).not.toContain(`: ${action};`);
    }
    expect(promptCapabilities).toContain("registry.search");
    expect(promptCapabilities).toContain("web.visit");
  });
});

describe("Python OSINT source boundary", () => {
  it("fails closed before Holehe can start a network-capable subprocess", async () => {
    const result = await runHolehe("person@example.com");
    expect(result.available).toBe(false);
    expect(result.found).toEqual([]);
    expect(result.error).toBe(QUARANTINE_ERROR);
  });

  it("fails closed before Maigret can start a network-capable subprocess", async () => {
    const result = await runMaigret("alice");
    expect(result.available).toBe(false);
    expect(result.found).toEqual([]);
    expect(result.error).toBe(QUARANTINE_ERROR);
  });

  it("fails closed before Sherlock can start a network-capable subprocess", async () => {
    const result = await runSherlock("alice");
    expect(result.available).toBe(false);
    expect(result.reviewOnly).toBe(true);
    expect(result.found).toEqual([]);
    expect(result.error).toBe(QUARANTINE_ERROR);
  });

  it("fails closed before theHarvester can start a network-capable subprocess", async () => {
    const result = await runTheHarvester("example.com");
    expect(result.available).toBe(false);
    expect(result.emails).toEqual([]);
    expect(result.error).toBe(QUARANTINE_ERROR);
  });


  it("fails closed before SpiderFoot can start a network-capable subprocess", async () => {
    const result = await runSpiderFoot("example.com", "domain", "domain-infrastructure");
    expect(result.available).toBe(false);
    expect(result.reviewOnly).toBe(true);
    expect(result.observations).toEqual([]);
    expect(result.eventsReceived).toBe(0);
    expect(result.partial).toBe(false);
    expect(result.error).toBe(QUARANTINE_ERROR);
  });

  it("fails closed for the Python-backed deep-research adapter as well", async () => {
    const result = await runOpenDeepResearch("research example.com");
    expect(result.available).toBe(false);
    expect(result.reviewOnly).toBe(true);
    expect(result.report).toBeNull();
    expect(result.error).toBe(QUARANTINE_ERROR);
  });
});
