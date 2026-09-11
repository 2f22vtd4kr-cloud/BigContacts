import { describe, expect, it } from "vitest";
import { runHolehe, runMaigret, runSherlock, runTheHarvester, runOpenDeepResearch } from "../lib/python-tools";

const QUARANTINE_ERROR =
  "Python OSINT capability unavailable: subprocess network egress is not yet governed by the Apex sandbox/egress boundary.";

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

  it("fails closed for the Python-backed deep-research adapter as well", async () => {
    const result = await runOpenDeepResearch("research example.com");
    expect(result.available).toBe(false);
    expect(result.reviewOnly).toBe(true);
    expect(result.report).toBeNull();
    expect(result.error).toBe(QUARANTINE_ERROR);
  });
});
