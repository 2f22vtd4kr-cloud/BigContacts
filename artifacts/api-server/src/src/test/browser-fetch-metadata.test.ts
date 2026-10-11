import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/ssrf-safe-fetch", () => ({
  assertSafeOutboundUrl: vi.fn(async (_url: string | URL) => undefined),
  safeOutboundFetch: vi.fn(),
}));

vi.mock("../lib/provider-gate", () => ({
  runProviderCall: vi.fn(async (_options: unknown, callback: () => Promise<unknown>) => callback()),
}));

import { assertSafeOutboundUrl, safeOutboundFetch } from "../lib/ssrf-safe-fetch";
import { browserFetchHtml, resetBrowserFetchCount, getAvailableBrowserFetchProviders, browserFetchConfigured } from "../lib/browser-fetch-core";
import { browserFetchHtml as browserFetchThroughBoundary } from "../lib/browser-fetch";

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

  it("advertises only configured browser providers", () => {
    expect(getAvailableBrowserFetchProviders()).toEqual(["scrapfly", "zenrows"]);
    expect(browserFetchConfigured()).toBe(true);
  });

  it("rejects an unavailable selected provider before any outbound provider request", async () => {
    vi.stubEnv("SCRAPFLY_API_KEY", "");
    vi.stubEnv("ZENROWS_API_KEY", "");
    vi.stubEnv("BROWSERLESS_TOKEN", "");
    vi.stubEnv("PLAYWRIGHT_ENABLED", "0");

    expect(getAvailableBrowserFetchProviders()).toEqual([]);
    expect(browserFetchConfigured()).toBe(false);

    const result = await browserFetchHtml("https://research.example/article", {
      provider: "scrapfly",
      scope: "unconfigured-provider-test",
    });

    expect(result).toEqual({ html: "", provider: "provider_unavailable", observedUrl: null });
    expect(safeOutboundFetch).not.toHaveBeenCalled();
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

  it("rejects malformed Scrapfly content instead of treating an object length as HTML", async () => {
    vi.mocked(safeOutboundFetch).mockResolvedValueOnce(new Response(JSON.stringify({
      result: { content: { length: html.length + 1 }, url: "https://research.example/article/final" },
    }), { headers: { "content-type": "application/json" } }));

    await expect(browserFetchHtml("https://research.example/article", {
      provider: "scrapfly",
      scope: "scrapfly-malformed-content-test",
    })).resolves.toEqual({ html: "", provider: "scrapfly", observedUrl: null });
  });

  it("threads the caller AbortSignal through wrapper, provider fetch, and observed-final-URL validation", async () => {
    const controller = new AbortController();
    vi.mocked(safeOutboundFetch).mockResolvedValueOnce(new Response(JSON.stringify({
      result: { content: html, url: "https://research.example/article/final" },
    }), { headers: { "content-type": "application/json" } }));

    const result = await browserFetchThroughBoundary("https://research.example/article", {
      provider: "scrapfly",
      scope: "signal-propagation-test",
      signal: controller.signal,
    });

    expect(result.observedUrl).toBe("https://research.example/article/final");
    expect(assertSafeOutboundUrl).toHaveBeenCalledWith("https://research.example/article", controller.signal);
    expect(assertSafeOutboundUrl).toHaveBeenCalledWith("https://research.example/article/final", controller.signal);
  });

  it("propagates cancellation during final-URL DNS validation instead of disguising it as an unobserved page", async () => {
    const controller = new AbortController();
    vi.mocked(safeOutboundFetch).mockResolvedValueOnce(new Response(JSON.stringify({
      result: { content: html, url: "https://research.example/article/final" },
    }), { headers: { "content-type": "application/json" } }));
    vi.mocked(assertSafeOutboundUrl).mockImplementation(async (rawUrl: string | URL, _signal?: AbortSignal) => {
      const parsed = new URL(String(rawUrl));
      if (parsed.href === "https://research.example/article/final") {
        controller.abort();
        throw new Error("Outbound DNS resolution aborted");
      }
      return parsed;
    });

    await expect(browserFetchThroughBoundary("https://research.example/article", {
      provider: "scrapfly",
      scope: "signal-cancellation-test",
      signal: controller.signal,
    })).rejects.toThrow("browser fetch cancelled");
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

  it("discards content when a provider reports a non-public final destination", async () => {
    vi.mocked(safeOutboundFetch).mockResolvedValueOnce(new Response(html, {
      headers: { "Zr-Final-Url": "http://127.0.0.1/private" },
    }));

    const result = await browserFetchHtml("https://research.example/redirect", {
      provider: "zenrows",
      scope: "zenrows-private-final-url-test",
    });

    expect(result.html).toBe("");
    expect(result.observedUrl).toBeNull();
    expect(assertSafeOutboundUrl).toHaveBeenCalledWith("http://127.0.0.1/private");
  });

  it("discards Scrapfly content when its reported final destination is unsafe", async () => {
    vi.mocked(safeOutboundFetch).mockResolvedValueOnce(new Response(JSON.stringify({
      result: { content: html, url: "http://127.0.0.1/private" },
    }), { headers: { "content-type": "application/json" } }));

    const result = await browserFetchHtml("https://research.example/redirect", {
      provider: "scrapfly",
      scope: "scrapfly-private-final-url-test",
    });

    expect(result.html).toBe("");
    expect(result.observedUrl).toBeNull();
    expect(assertSafeOutboundUrl).toHaveBeenCalledWith("http://127.0.0.1/private");
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
