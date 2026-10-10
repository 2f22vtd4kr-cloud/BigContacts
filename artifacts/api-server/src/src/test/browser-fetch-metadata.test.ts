import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/ssrf-safe-fetch", () => ({
  assertSafeOutboundUrl: vi.fn(async (_url: string | URL) => undefined),
  safeOutboundFetch: vi.fn(),
}));

vi.mock("../lib/provider-gate", () => ({
  runProviderCall: vi.fn(async (_options: unknown, callback: () => Promise<unknown>) => callback()),
}));

import { assertSafeOutboundUrl, safeOutboundFetch } from "../lib/ssrf-safe-fetch";
import { browserFetchHtml, resetBrowserFetchCount } from "../lib/browser-fetch-core";

const html = `<html><body>${"public research evidence ".repeat(8)}</body></html>`;

describe("hosted browser fetch final-URL provenance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SCRAPFLY_API_KEY", "test-scrapfly-key");
    vi.stubEnv("ZENROWS_API_KEY", "test-zenrows-key");
    vi.stubEnv("BROWSERLESS_TOKEN", "");
    vi.stubEnv("PLAYWRIGHT_ENABLED", "0");
    vi.mocked(assertSafeOutboundUrl).mockImplementation(async (rawUrl: string) => {
      const parsed = new URL(rawUrl);
      if (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") {
        throw new Error("blocked IP address");
      }
      return parsed;
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetBrowserFetchCount();
  });

  it("preserves Scrapfly's provider-reported final URL only after public-URL validation", async () => {
    vi.mocked(safeOutboundFetch).mockResolvedValueOnce(new Response(JSON.stringify({
      result: { content: html, url: "https://research.example/article/final" },
    }), { headers: { "content-type": "application/json" } }));

    const result = await browserFetchHtml("https://research.example/article", {
      provider: "scrapfly",
      scope: "scrapfly-final-url-test",
    });

    expect(result.html).toBe(html);
    expect(result.observedUrl).toBe("https://research.example/article/final");
    expect(assertSafeOutboundUrl).toHaveBeenCalledWith("https://research.example/article/final");
  });

  it("preserves ZenRows' Zr-Final-Url response header for the observed page", async () => {
    vi.mocked(safeOutboundFetch).mockResolvedValueOnce(new Response(html, {
      headers: { "Zr-Final-Url": "https://research.example/article/final" },
    }));

    const result = await browserFetchHtml("https://research.example/article", {
      provider: "zenrows",
      scope: "zenrows-final-url-test",
    });

    expect(result.html).toBe(html);
    expect(result.observedUrl).toBe("https://research.example/article/final");
    expect(assertSafeOutboundUrl).toHaveBeenCalledWith("https://research.example/article/final");
  });

  it("keeps content lead-only when a provider reports a non-public final destination", async () => {
    vi.mocked(safeOutboundFetch).mockResolvedValueOnce(new Response(html, {
      headers: { "Zr-Final-Url": "http://127.0.0.1/private" },
    }));

    const result = await browserFetchHtml("https://research.example/redirect", {
      provider: "zenrows",
      scope: "zenrows-private-final-url-test",
    });

    expect(result.html).toBe(html);
    expect(result.observedUrl).toBeNull();
  });

  it("keeps ZenRows content lead-only when final-navigation metadata is absent", async () => {
    vi.mocked(safeOutboundFetch).mockResolvedValueOnce(new Response(html));

    const result = await browserFetchHtml("https://research.example/article", {
      provider: "zenrows",
      scope: "zenrows-missing-final-url-test",
    });

    expect(result.html).toBe(html);
    expect(result.observedUrl).toBeNull();
  });
});
