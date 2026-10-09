import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/ssrf-safe-fetch", () => ({
  safeOutboundFetch: (input: string | URL, init?: RequestInit) => globalThis.fetch(input, init),
}));

vi.mock("../lib/python-tools", () => ({
  runHolehe: vi.fn(async () => ({ email: "person@example.com", found: [], totalChecked: 0, totalFound: 0, available: false, error: "Python network sandbox is unavailable." })),
  runMaigret: vi.fn(async () => ({ username: "example", found: [], totalSitesChecked: 0, available: false, error: "Python network sandbox is unavailable." })),
  runSherlock: vi.fn(async () => ({ username: "example", found: [], totalSitesChecked: 0, available: false, reviewOnly: true, error: "Python network sandbox is unavailable." })),
  runTheHarvester: vi.fn(async () => ({ domain: "example.com", emails: [], subdomains: [], ips: [], hosts: [], totalFound: 0, available: false, error: "Python network sandbox is unavailable." })),
  runSpiderFoot: vi.fn(async () => ({ target: "example.com", targetType: "domain", profile: "domain-infrastructure", observations: [], eventsReceived: 0, available: false, partial: false, reviewOnly: true, error: "Python network sandbox is unavailable." })),
}));

import { describeAgentActionParseFailure, isModelSelectableAgentAction } from "../lib/agentic-web-research-core";

describe("agentic Python capability execution state", () => {
  afterEach(() => {
    delete process.env.GROQ_INVESTIGATOR_API_KEY;
    vi.restoreAllMocks();
  });

  it.each([
    ["footprint_email", '{"action":"footprint_email","email":"person@example.com"}'],
    ["footprint_username_maigret", '{"action":"footprint_username_maigret","username":"example"}'],
    ["footprint_username_sherlock", '{"action":"footprint_username_sherlock","username":"example"}'],
    ["harvest_domain", '{"action":"harvest_domain","domain":"example.com"}'],
    ["footprint_spiderfoot", '{"action":"footprint_spiderfoot","target":"example.com","targetType":"domain","profile":"domain-infrastructure"}'],
  ])("rejects disabled Python capability %s before the network sandbox boundary", (action, actionJson) => {
    expect(isModelSelectableAgentAction(action)).toBe(false);
    expect(describeAgentActionParseFailure(actionJson)).toContain(`unsupported_action action=${action}`);
  });

  it("retains the enabled autonomous research capabilities", () => {
    expect(isModelSelectableAgentAction("web_search")).toBe(true);
    expect(isModelSelectableAgentAction("parallel_web_search")).toBe(true);
    expect(isModelSelectableAgentAction("visit")).toBe(true);
    expect(isModelSelectableAgentAction("browser_fetch")).toBe(true);
    expect(isModelSelectableAgentAction("registry_search")).toBe(true);
    expect(isModelSelectableAgentAction("domain_lookup")).toBe(true);
    expect(isModelSelectableAgentAction("done")).toBe(true);
  });});
