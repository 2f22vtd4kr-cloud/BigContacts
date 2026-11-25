import { beforeEach, describe, expect, it, vi } from "vitest";

const { safeOutboundFetchMock, assertSafeOutboundUrlMock } = vi.hoisted(() => ({
  safeOutboundFetchMock: vi.fn(),
  assertSafeOutboundUrlMock: vi.fn(),
}));

vi.mock("./ssrf-safe-fetch", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./ssrf-safe-fetch")>();
  return {
    ...actual,
    safeOutboundFetch: safeOutboundFetchMock,
    assertSafeOutboundUrl: assertSafeOutboundUrlMock,
  };
});

import { browserFetchHtml, buildBrowserFetchProviderTelemetry, directFetchUserAgent, resetBrowserFetchCount } from "./browser-fetch-core";

describe("browser fetch provider diagnostics and direct fallback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("SCRAPFLY_API_KEY", "test-scrapfly-key");
    vi.stubEnv("ZENROWS_API_KEY", "");
    vi.stubEnv("BROWSERLESS_TOKEN", "");
    vi.stubEnv("PLAYWRIGHT_ENABLED", "false");
    vi.stubEnv("SEC_USER_AGENT", "Apex Atlas research ops@example.org");
    assertSafeOutboundUrlMock.mockResolvedValue(undefined);
    resetBrowserFetchCount();
  });

  it("preserves Scrapfly upstream status/body and records a successful SEC direct fallback", async () => {
    safeOutboundFetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (String(url).includes("api.scrapfly.io")) {
        return new Response('{"error":"upstream overloaded"}', { status: 503, headers: { "content-type": "application/json" } });
      }
      expect(new Headers(init.headers).get("user-agent")).toBe("Apex Atlas research ops@example.org");
      return new Response("<html><body>" + "SEC filing content ".repeat(20) + "</body></html>", { status: 200, headers: { "content-type": "text/html" } });
    });

    const result = await browserFetchHtml("https://www.sec.gov/Archives/edgar/data/1/filing.htm", {
      provider: "scrapfly",
      scope: "sec-fallback-test",
    });

    expect(result.html.length).toBeGreaterThan(100);
    expect(result.provider).toBe("direct");
    expect(result.attemptedProviders).toEqual(["scrapfly", "direct"]);
    expect(result.failures).toEqual([
      { provider: "scrapfly", status: 503, body: '{"error":"upstream overloaded"}', error: null },
    ]);
    expect(buildBrowserFetchProviderTelemetry("scrapfly", result.provider, result.attemptedProviders).providerFallback).toEqual(["direct"]);
  });

  it("does not send a direct SEC request without an identifying contact email", async () => {
    vi.stubEnv("SCRAPFLY_API_KEY", "");
    vi.stubEnv("SEC_USER_AGENT", "Apex Atlas research without contact");
    const result = await browserFetchHtml("https://www.sec.gov/Archives/edgar/data/1/filing.htm", {
      provider: "direct",
      scope: "sec-no-agent-test",
    });
    expect(result.html).toBe("");
    expect(result.failures?.[0]?.error).toContain("SEC_USER_AGENT");
    expect(safeOutboundFetchMock).not.toHaveBeenCalled();
  });

  it("requires a contact email in SEC User-Agent but provides an identifying default elsewhere", () => {
    expect(directFetchUserAgent("https://www.sec.gov/Archives/edgar/data/1/filing.htm", {
      SEC_USER_AGENT: "Apex Atlas research ops@example.org",
    })).toBe("Apex Atlas research ops@example.org");
    expect(directFetchUserAgent("https://www.sec.gov/Archives/edgar/data/1/filing.htm", {
      SEC_USER_AGENT: "Apex Atlas research",
    })).toBeNull();
    expect(directFetchUserAgent("https://example.org/page", {})).toContain("ApexAtlas/1.0");
  });
});
