import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/gemini-transient-retry", () => ({
  installGeminiTransientRetry: vi.fn(),
}));

describe("Gemini transient retry boundary", () => {
  const nativeFetch = globalThis.fetch;
  const nativeSetTimeout = globalThis.setTimeout;

  const nativeRightHandKey = process.env.GEMINI_RIGHT_HAND_API_KEY;
  const nativeBossKey = process.env.GEMINI_API_KEY;

  afterEach(() => {
    if (nativeRightHandKey === undefined) delete process.env.GEMINI_RIGHT_HAND_API_KEY; else process.env.GEMINI_RIGHT_HAND_API_KEY = nativeRightHandKey;
    if (nativeBossKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = nativeBossKey;
    globalThis.fetch = nativeFetch;
    globalThis.setTimeout = nativeSetTimeout;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("does not retry Gemini generation transport failures", async () => {
    const providerFetch = vi.fn<typeof fetch>();
    providerFetch.mockResolvedValueOnce(new Response("busy", { status: 503 }));

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

    expect(response.status).toBe(503);
    expect(providerFetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry Gemini model-catalog transport failures", async () => {
    const providerFetch = vi.fn<typeof fetch>();
    providerFetch.mockResolvedValueOnce(new Response("busy", { status: 503 }));

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

    expect(response.status).toBe(503);
    expect(providerFetch).toHaveBeenCalledTimes(1);
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

  it("recognizes only the dedicated Right-hand credential and never falls back to the Boss credential", async () => {
    process.env.GEMINI_API_KEY = "boss-secret";
    process.env.GEMINI_RIGHT_HAND_API_KEY = "right-hand-secret";
    vi.resetModules();
    const { getGeminiRightHandStatus } = await import("../lib/gemini-right-hand-reasoning");
    expect(getGeminiRightHandStatus().configured).toBe(true);

    delete process.env.GEMINI_RIGHT_HAND_API_KEY;
    vi.resetModules();
    const missingDedicated = await import("../lib/gemini-right-hand-reasoning");
    expect(missingDedicated.getGeminiRightHandStatus().configured).toBe(false);
  });

  it("fails closed when the dedicated Right-hand credential is missing even if the Boss credential exists", async () => {
    process.env.GEMINI_API_KEY = "boss-secret";
    delete process.env.GEMINI_RIGHT_HAND_API_KEY;
    vi.resetModules();
    const { runGeminiRightHandFreeJson } = await import("../lib/gemini-right-hand-reasoning");
    const result = await runGeminiRightHandFreeJson("Review this completed act.");
    expect(result.status).toBe("unavailable");
    expect(result.error).toContain("GEMINI_RIGHT_HAND_API_KEY");
  });
});
