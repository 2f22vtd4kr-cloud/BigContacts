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


  it("does not attempt a keyless OpenCorporates request and returns a safe registry-auth code", async () => {
    vi.stubEnv("OPENCORPORATES_API_TOKEN", "");
    vi.stubEnv("OPENCORPORATES_API_KEY", "");

    let caught: unknown;
    try {
      await searchRegistry({ query: "Iowa privately held agribusiness owners", registry: "opencorporates" });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect(caught).toMatchObject({
      message: "OpenCorporates unavailable: API token is not configured.",
      code: "REGISTRY_AUTH_REQUIRED",
    });
    expect(safeOutboundFetchMock).not.toHaveBeenCalled();
  });

  it("preserves OpenCorporates HTTP status without embedding raw response body", async () => {
    vi.stubEnv("OPENCORPORATES_API_TOKEN", "test-token");
    vi.stubEnv("OPENCORPORATES_API_KEY", "");
    const privateBody = "PRIVATE_OPENCORPORATES_RESPONSE_BODY_SENTINEL";
    safeOutboundFetchMock.mockResolvedValueOnce(new Response(privateBody, { status: 401, statusText: "Unauthorized" }));

    let caught: unknown;
    try {
      await searchRegistry({ query: "Iowa privately held agribusiness owners", registry: "opencorporates" });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect(caught).toMatchObject({ message: "OpenCorporates HTTP 401", code: "HTTP_401", status: 401 });
    expect((caught as Error).message).not.toContain(privateBody);
    expect(safeOutboundFetchMock).toHaveBeenCalledTimes(1);
    const requestInit = safeOutboundFetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(new Headers(requestInit?.headers).get("X-API-TOKEN")).toBe("test-token");
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
