import { afterEach, describe, expect, it, vi } from "vitest";

describe("Gemini transient retry boundary", () => {
  const nativeFetch = globalThis.fetch;
  const nativeSetTimeout = globalThis.setTimeout;

  afterEach(() => {
    globalThis.fetch = nativeFetch;
    globalThis.setTimeout = nativeSetTimeout;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("retries transient generation failures with bounded backoff and returns the eventual response", async () => {
    const providerFetch = vi.fn<typeof fetch>();
    providerFetch
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response("busy", { status: 502 }))
      .mockResolvedValueOnce(new Response("busy", { status: 504 }))
      .mockResolvedValueOnce(new Response('{"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}', { status: 200 }));

    globalThis.fetch = providerFetch;
    globalThis.setTimeout = ((handler: TimerHandler) => {
      if (typeof handler === "function") handler();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout;

    vi.resetModules();
    await import("../lib/apex-bureau-orientation");

    const response = await globalThis.fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent",
      { method: "POST" },
    );

    expect(response.status).toBe(200);
    expect(providerFetch).toHaveBeenCalledTimes(4);
  });

  it("also retries transient Gemini model-catalog failures", async () => {
    const providerFetch = vi.fn<typeof fetch>();
    providerFetch
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response('{"models":[]}', { status: 200 }));

    globalThis.fetch = providerFetch;
    globalThis.setTimeout = ((handler: TimerHandler) => {
      if (typeof handler === "function") handler();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout;

    vi.resetModules();
    await import("../lib/apex-bureau-orientation");

    const response = await globalThis.fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?key=test",
      { method: "GET" },
    );

    expect(response.status).toBe(200);
    expect(providerFetch).toHaveBeenCalledTimes(3);
  });

  it("does not retry non-Gemini requests", async () => {
    const providerFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response("no", { status: 503 }));
    globalThis.fetch = providerFetch;
    globalThis.setTimeout = ((handler: TimerHandler) => {
      if (typeof handler === "function") handler();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout;

    vi.resetModules();
    await import("../lib/apex-bureau-orientation");

    const nonGemini = await globalThis.fetch("https://example.com/generateContent", { method: "POST" });

    expect(nonGemini.status).toBe(503);
    expect(providerFetch).toHaveBeenCalledTimes(1);
  });
});
