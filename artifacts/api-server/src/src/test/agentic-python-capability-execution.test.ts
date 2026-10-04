import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/ssrf-safe-fetch", () => ({
  safeOutboundFetch: (input: string | URL, init?: RequestInit) => globalThis.fetch(input, init),
}));

vi.mock("../lib/provider-gate", () => ({
  runProviderCall: async (_options: unknown, fn: () => Promise<Response>) => fn(),
  withProviderRetryOwnership: async (_provider: string, _owner: string, fn: () => Promise<Response>) => fn(),
}));

vi.mock("../lib/python-tools", () => ({
  runHolehe: vi.fn(async () => ({ email: "person@example.com", found: [], totalChecked: 0, totalFound: 0, available: false, error: "Python network sandbox is unavailable." })),
  runMaigret: vi.fn(async () => ({ username: "example", found: [], totalSitesChecked: 0, available: false, error: "Python network sandbox is unavailable." })),
  runSherlock: vi.fn(async () => ({ username: "example", found: [], totalSitesChecked: 0, available: false, reviewOnly: true, error: "Python network sandbox is unavailable." })),
  runTheHarvester: vi.fn(async () => ({ domain: "example.com", emails: [], subdomains: [], ips: [], hosts: [], totalFound: 0, available: false, error: "Python network sandbox is unavailable." })),
  runSpiderFoot: vi.fn(async () => ({ target: "example.com", targetType: "domain", profile: "domain-infrastructure", observations: [], eventsReceived: 0, available: false, partial: false, reviewOnly: true, error: "Python network sandbox is unavailable." })),
}));

import { runAgenticWebResearch } from "../lib/agentic-web-research-core";

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
  ])("records %s as blocked when the Python capability is unavailable", async (_action, actionJson) => {
    process.env.GROQ_INVESTIGATOR_API_KEY = "test-groq-investigator-key";
    const responses = [
      { choices: [{ message: { content: actionJson } }] },
      { choices: [{ message: { content: '{"action":"done","findings":[]}' } }] },
    ];
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async (input) => {
      if (String(input) === "https://api.groq.com/openai/v1/models") {
        return new Response(JSON.stringify({ data: [{ id: "openai/gpt-oss-120b" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify(responses[calls++]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }));

    const result = await runAgenticWebResearch({
      targetName: "Example",
      investigatorLlm: "groq",
      maxIterations: 2,
      hardTimeoutMs: 30_000,
    });

    if (result.status !== "completed") throw new Error(`investigator test result: ${JSON.stringify(result)}`);
    expect(result.status).toBe("completed");
    expect(result.trajectoryRecords[0]?.execution).toBe("blocked");
    expect(result.trajectoryRecords[0]?.observation).toMatch(/sandbox is unavailable/i);
  });
});
