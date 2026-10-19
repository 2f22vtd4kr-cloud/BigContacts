import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { safeOutboundFetchMock } = vi.hoisted(() => ({ safeOutboundFetchMock: vi.fn() }));

vi.mock("../lib/ssrf-safe-fetch", () => ({
  safeOutboundFetch: safeOutboundFetchMock,
}));

vi.mock("../lib/provider-gate", () => ({
  runProviderCall: async (_options: unknown, operation: () => Promise<Response>) => operation(),
}));

import { getAvailableRegistryIds, isRegistryProviderAvailable, searchRegistry } from "../lib/registry-client";

const registries = [
  { registry: "offeneregister-germany", error: "Offeneregister Germany HTTP 503" },
  { registry: "ytj-finland", error: "YTJ Finland HTTP 503" },
  { registry: "borme-spain", error: "BORME Spain HTTP 503" },
  { registry: "kbo-belgium", error: "KBO Belgium HTTP 503" },
] as const;

describe("registry failure semantics", () => {
  it("refuses to advertise or call the unsupported Swedish adapter and provides a truthful fallback", async () => {
    expect(isRegistryProviderAvailable("bolagsverket-sweden")).toBe(false);
    expect(getAvailableRegistryIds()).not.toContain("bolagsverket-sweden");

    await expect(
      searchRegistry({ query: "Stockholm private machinery firms", registry: "bolagsverket-sweden" }),
    ).rejects.toThrow(/REGISTRY_ADAPTER_UNAVAILABLE.*Allabolag.*SNI.*beneficial-owner/i);
    expect(safeOutboundFetchMock).not.toHaveBeenCalled();
  });

  beforeEach(() => {
    safeOutboundFetchMock.mockReset();
    vi.stubEnv("COMPANIES_HOUSE_API_KEY", "test-registry-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(registries)("surfaces an upstream failure for $registry instead of reporting an empty search", async ({ registry, error }) => {
    if (registry === "offeneregister-germany") vi.stubEnv("APEX_ENABLE_OFFENEREGISTER_GERMANY", "true");
    safeOutboundFetchMock.mockResolvedValueOnce(
      new Response("upstream unavailable", { status: 503, statusText: "Service Unavailable" }),
    );

    await expect(searchRegistry({ query: "Apex example", registry })).rejects.toThrow(error);
  });

  it("does not advertise or call German Open Register before its endpoint contract is live-verified", async () => {
    vi.stubEnv("APEX_ENABLE_OFFENEREGISTER_GERMANY", "");
    expect(isRegistryProviderAvailable("offeneregister-germany")).toBe(false);
    expect(getAvailableRegistryIds()).not.toContain("offeneregister-germany");

    await expect(
      searchRegistry({ query: "Berlin manufacturing companies", registry: "offeneregister-germany" }),
    ).rejects.toThrow(/REGISTRY_ADAPTER_UNAVAILABLE.*disabled until.*live runtime smoke test.*not a no-hit/i);
    expect(safeOutboundFetchMock).not.toHaveBeenCalled();
  });


  it("does not advertise or call the stale Dutch mirror and provides a truthful fallback", async () => {
    expect(isRegistryProviderAvailable("kvk-netherlands")).toBe(false);
    expect(getAvailableRegistryIds()).not.toContain("kvk-netherlands");

    await expect(
      searchRegistry({ query: "Amsterdam logistics companies", registry: "kvk-netherlands" }),
    ).rejects.toThrow(/REGISTRY_ADAPTER_UNAVAILABLE.*openkvk\.nl.*subscription.*web_search/i);
    expect(safeOutboundFetchMock).not.toHaveBeenCalled();
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
    const requestUrl = new URL(String(safeOutboundFetchMock.mock.calls[0]?.[0]));
    expect(requestUrl.searchParams.get("api_token")).toBe("test-token");
    const requestInit = safeOutboundFetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(new Headers(requestInit?.headers).has("X-API-TOKEN")).toBe(false);
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

  it("normalizes valid object-shaped Open Register rows from a successful Datasette response", async () => {
    vi.stubEnv("APEX_ENABLE_OFFENEREGISTER_GERMANY", "true");
    safeOutboundFetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({
        ok: true,
        rows: [{
          name: "Example Maschinenbau GmbH",
          company_number: "HRB12345",
          registered_address: "Hamburg",
          native_company_number: "12345",
        }],
        columns: ["name", "company_number", "registered_address", "native_company_number"],
        truncated: false,
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      searchRegistry({ query: "Example Maschinenbau", registry: "offeneregister-germany" }),
    ).resolves.toMatchObject([{
      name: "Example Maschinenbau GmbH",
      nationality: "DE",
      knownResidences: "Hamburg",
    }]);
  });

  it("accepts a genuine zero-hit result only with a valid success envelope and columns", async () => {
    vi.stubEnv("APEX_ENABLE_OFFENEREGISTER_GERMANY", "true");
    safeOutboundFetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({
        ok: true,
        rows: [],
        columns: ["name", "company_number", "registered_address", "native_company_number"],
        truncated: false,
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      searchRegistry({ query: "Apex example", registry: "offeneregister-germany" }),
    ).resolves.toEqual([]);
  });

  it("rejects an incompatible/malformed Open Register response instead of treating it as zero hits", async () => {
    vi.stubEnv("APEX_ENABLE_OFFENEREGISTER_GERMANY", "true");
    safeOutboundFetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, rows: [], columns: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      searchRegistry({ query: "Apex example", registry: "offeneregister-germany" }),
    ).rejects.toThrow(/Offeneregister Germany malformed response: expected company columns are missing/i);
  });
});
