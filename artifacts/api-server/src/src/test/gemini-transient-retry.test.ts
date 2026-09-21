import { afterEach, describe, expect, it, vi } from "vitest";
import { installGeminiTransientRetry } from "../lib/gemini-transient-retry";

describe("Gemini transport retry boundary", () => {
  const nativeFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = nativeFetch;
    vi.restoreAllMocks();
  });

  it("does not retry Gemini generation transport failures", async () => {
    const providerFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response("busy", { status: 503 }));
    globalThis.fetch = providerFetch;
    installGeminiTransientRetry();

    const response = await globalThis.fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      { method: "POST", body: JSON.stringify({ generationConfig: { maxOutputTokens: 768 } }) },
    );

    expect(response.status).toBe(503);
    expect(providerFetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry Gemini model-catalog requests", async () => {
    const providerFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response("busy", { status: 503 }));
    globalThis.fetch = providerFetch;
    installGeminiTransientRetry();

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
    installGeminiTransientRetry();

    const response = await globalThis.fetch("https://example.com/generateContent", { method: "POST" });

    expect(response.status).toBe(503);
    expect(providerFetch).toHaveBeenCalledTimes(1);
  });

  it("fails Boss-capacity responses closed instead of silently retrying the same model", async () => {
    const providerFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response("busy", { status: 503 }));
    globalThis.fetch = providerFetch;
    installGeminiTransientRetry();

    await expect(globalThis.fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      { method: "POST", body: JSON.stringify({ generationConfig: { maxOutputTokens: 8192 } }) },
    )).rejects.toThrow("advance to the next compatible model");
    expect(providerFetch).toHaveBeenCalledTimes(1);
  });
});
