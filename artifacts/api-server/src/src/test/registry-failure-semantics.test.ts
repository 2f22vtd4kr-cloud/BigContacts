import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { safeOutboundFetchMock } = vi.hoisted(() => ({ safeOutboundFetchMock: vi.fn() }));

vi.mock("../lib/ssrf-safe-fetch", () => ({
  safeOutboundFetch: safeOutboundFetchMock,
}));

vi.mock("../lib/provider-gate", () => ({
  runProviderCall: async (_options: unknown, operation: () => Promise<Response>) => operation(),
}));

import { searchRegistry } from "../lib/registry-client";

const registries = [
  { registry: "offeneregister-germany", error: "Offeneregister Germany HTTP 503" },
  { registry: "bolagsverket-sweden", error: "Allabolag 503" },
  { registry: "ytj-finland", error: "YTJ Finland HTTP 503" },
  { registry: "borme-spain", error: "BORME Spain HTTP 503" },
  { registry: "kvk-netherlands", error: "KvK Netherlands HTTP 503" },
  { registry: "kbo-belgium", error: "KBO Belgium HTTP 503" },
] as const;

describe("registry failure semantics", () => {
  beforeEach(() => {
    safeOutboundFetchMock.mockReset();
    vi.stubEnv("COMPANIES_HOUSE_API_KEY", "test-registry-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(registries)("surfaces an upstream failure for $registry instead of reporting an empty search", async ({ registry, error }) => {
    safeOutboundFetchMock.mockResolvedValueOnce(
      new Response("upstream unavailable", { status: 503, statusText: "Service Unavailable" }),
    );

    await expect(searchRegistry({ query: "Apex example", registry })).rejects.toThrow(error);
  });

  it("does not treat Companies House endpoint failures as an empty result", async () => {
    safeOutboundFetchMock.mockResolvedValue(
      new Response("upstream unavailable", { status: 503, statusText: "Service Unavailable" }),
    );

    await expect(
      searchRegistry({ query: "Apex example", registry: "companies-house" }),
    ).rejects.toThrow("Companies House lookup incomplete");
  });

  it("does not treat failed CVR query variants as a confirmed no-hit", async () => {
    safeOutboundFetchMock.mockResolvedValue(
      new Response("upstream unavailable", { status: 503, statusText: "Service Unavailable" }),
    );

    await expect(
      searchRegistry({ query: "Apex example", registry: "cvr-denmark" }),
    ).rejects.toThrow("CVR Denmark lookup incomplete");
  });

  it("does not treat both failed Atoka tiers as a confirmed no-hit", async () => {
    safeOutboundFetchMock.mockResolvedValue(
      new Response("upstream unavailable", { status: 503, statusText: "Service Unavailable" }),
    );

    await expect(
      searchRegistry({ query: "Apex example", registry: "atoka-italy" }),
    ).rejects.toThrow("Atoka Italy lookup incomplete");
  });

  it("reports a genuine empty Atoka search only after both tiers respond successfully", async () => {
    safeOutboundFetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ content: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));

    await expect(
      searchRegistry({ query: "Apex example", registry: "atoka-italy" }),
    ).resolves.toEqual([]);
  });

  it("keeps a genuine successful zero-hit response distinct from a provider failure", async () => {
    safeOutboundFetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ rows: [], columns: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      searchRegistry({ query: "Apex example", registry: "offeneregister-germany" }),
    ).resolves.toEqual([]);
  });
});
