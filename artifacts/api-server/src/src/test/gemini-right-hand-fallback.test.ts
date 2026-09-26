import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/gemini-transient-retry", () => ({
  installGeminiTransientRetry: vi.fn(),
}));
import {
  GEMINI_RIGHT_HAND_MODEL,
  runGeminiRightHandFreeJson,
} from "../lib/gemini-right-hand-reasoning";
import { installExternalQuotaGuard, resetProviderGateForTests } from "../lib/provider-gate";

describe("Gemini Right-hand catalog-driven fallback", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resetProviderGateForTests();
  });

  afterEach(() => {
    resetProviderGateForTests();
    globalThis.fetch = originalFetch;
    delete process.env.GEMINI_RIGHT_HAND_API_KEY;
    delete process.env.GEMINI_RIGHT_HAND_MODEL_CHAIN;
    vi.restoreAllMocks();
  });

  function catalog(...models: string[]) {
    return new Response(JSON.stringify({
      models: models.map((name) => ({
        name: `models/${name}`,
        supportedGenerationMethods: ["generateContent"],
      })),
    }), { status: 200 });
  }

  it("falls from the preferred model to the next compatible live-catalog model on capacity 429", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key";
    const calls: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("generativelanguage.googleapis.com/v1beta/models?")) {
        return catalog(GEMINI_RIGHT_HAND_MODEL, "gemini-3.7-flash");
      }
      if (url.includes(`/${GEMINI_RIGHT_HAND_MODEL}:generateContent`)) {
        return new Response(JSON.stringify({ error: { message: "quota exceeded" } }), { status: 429 });
      }
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"decision":"fallback-ok"}' }] } }] }), { status: 200 });
    });
    installExternalQuotaGuard();

    const result = await runGeminiRightHandFreeJson("Return a JSON object with decision.");

    const generationCalls = calls.filter((url) => url.includes(":generateContent"));
    expect(result.status).toBe("completed");
    expect(result.model).toBe("gemini-3.7-flash");
    expect(generationCalls).toHaveLength(2);
    expect(generationCalls[0]).toContain(`/${GEMINI_RIGHT_HAND_MODEL}:generateContent`);
    expect(generationCalls[1]).toContain("/gemini-3.7-flash:generateContent");
  });

  it("falls through the live catalog when the preferred model is not authorized for a free-tier key", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key-free-tier";
    const calls: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("generativelanguage.googleapis.com/v1beta/models?")) {
        return catalog(GEMINI_RIGHT_HAND_MODEL, "gemini-3.7-flash");
      }
      if (url.includes(`/${GEMINI_RIGHT_HAND_MODEL}:generateContent`)) {
        return new Response(JSON.stringify({ error: { message: "model unavailable for this key tier" } }), { status: 403 });
      }
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"decision":"free-tier-fallback-ok"}' }] } }] }), { status: 200 });
    });
    installExternalQuotaGuard();

    const result = await runGeminiRightHandFreeJson("Return JSON.");

    const generationCalls = calls.filter((url) => url.includes(":generateContent"));
    expect(result.status).toBe("completed");
    expect(result.model).toBe("gemini-3.7-flash");
    expect(generationCalls).toHaveLength(2);
  });

  it("falls through the live catalog after a transient network error", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key-network";
    const calls: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("generativelanguage.googleapis.com/v1beta/models?")) {
        return catalog(GEMINI_RIGHT_HAND_MODEL, "gemini-3.7-flash");
      }
      if (url.includes(`/${GEMINI_RIGHT_HAND_MODEL}:generateContent`)) {
        throw new TypeError("fetch failed");
      }
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"decision":"network-fallback-ok"}' }] } }],
      }), { status: 200 });
    });
    installExternalQuotaGuard();

    const result = await runGeminiRightHandFreeJson("Return JSON.");

    const generationCalls = calls.filter((url) => url.includes(":generateContent"));
    expect(result.status).toBe("completed");
    expect(result.model).toBe("gemini-3.7-flash");
    expect(generationCalls).toHaveLength(2);
    expect(generationCalls[0]).toContain(`/${GEMINI_RIGHT_HAND_MODEL}:generateContent`);
    expect(generationCalls[1]).toContain("/gemini-3.7-flash:generateContent");
  });

  it("walks only the bounded candidates supplied by the live catalog", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key-bounded";
    const calls: string[] = [];
    const liveModels = [
      GEMINI_RIGHT_HAND_MODEL,
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
    ];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("generativelanguage.googleapis.com/v1beta/models?")) return catalog(...liveModels);
      return new Response(JSON.stringify({ error: { message: "service unavailable" } }), { status: 503 });
    });
    installExternalQuotaGuard();

    const result = await runGeminiRightHandFreeJson("Return JSON.");

    const generationCalls = calls.filter((url) => url.includes(":generateContent"));
    expect(result.status).toBe("unavailable");
    expect(generationCalls).toHaveLength(4);
    expect(generationCalls.map((url) => url.match(/models\/([^:]+):generateContent/)?.[1])).toEqual(liveModels);
    expect(result.error).toContain("exhausted bounded same-role model attempts");
  });

  it("ignores environment-controlled fallback chains", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key";
    process.env.GEMINI_RIGHT_HAND_MODEL_CHAIN = "gemini-9.9-flash,gemini-1.0-flash";
    const calls: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("generativelanguage.googleapis.com/v1beta/models?")) {
        return catalog(GEMINI_RIGHT_HAND_MODEL, "gemini-3.7-flash");
      }
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"decision":"ok"}' }] } }] }), { status: 200 });
    });
    installExternalQuotaGuard();

    const result = await runGeminiRightHandFreeJson("Return JSON.");

    expect(result.status).toBe("completed");
    expect(calls.some((url) => url.includes("gemini-9.9-flash") || url.includes("gemini-1.0-flash"))).toBe(false);
  });

  it("does not expose a provider response body when the preferred model rejects the request", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key-sanitized";
    const secretProviderMessage = "secret provider response must never escape the diagnostics boundary";
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("generativelanguage.googleapis.com/v1beta/models?")) {
        return catalog(GEMINI_RIGHT_HAND_MODEL);
      }
      return new Response(JSON.stringify({ error: { code: "INVALID_ARGUMENT", message: secretProviderMessage } }), { status: 400 });
    });
    installExternalQuotaGuard();

    const result = await runGeminiRightHandFreeJson("Return JSON.");

    expect(result.status).toBe("unavailable");
    expect(result.error).toContain("invalid_request");
    expect(result.error).not.toContain(secretProviderMessage);
  });
});