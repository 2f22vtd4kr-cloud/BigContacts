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
});