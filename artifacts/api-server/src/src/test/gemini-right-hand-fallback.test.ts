import { vi } from "vitest";

vi.mock("../lib/gemini-transient-retry", () => ({
  installGeminiTransientRetry: vi.fn(),
}));

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GEMINI_RIGHT_HAND_FALLBACK_MODELS,
  GEMINI_RIGHT_HAND_MODEL,
  runGeminiRightHandFreeJson,
} from "../lib/gemini-right-hand-reasoning";
import { installExternalQuotaGuard, resetProviderGateForTests } from "../lib/provider-gate";

describe("Gemini Right-hand free-model fallback", () => {
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

  it("falls from Gemini 3.8 Flash to the next free Flash model on capacity 429", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key";
    const calls: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes(`/${GEMINI_RIGHT_HAND_MODEL}:generateContent`)) {
        return new Response(JSON.stringify({ error: { message: "quota exceeded" } }), { status: 429 });
      }
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"decision":"fallback-ok"}' }] } }] }), { status: 200 });
    });
    installExternalQuotaGuard();

    const result = await runGeminiRightHandFreeJson("Return a JSON object with decision.");

    expect(result.status).toBe("completed");
    expect(result.model).toBe(GEMINI_RIGHT_HAND_FALLBACK_MODELS[0]);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain(`/${GEMINI_RIGHT_HAND_MODEL}:generateContent`);
    expect(calls[1]).toContain(`/${GEMINI_RIGHT_HAND_FALLBACK_MODELS[0]}:generateContent`);
  });

  it("walks the complete bounded free-model chain when every model is capacity-limited", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key";
    const calls: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return new Response(JSON.stringify({ error: { message: "service unavailable" } }), { status: 503 });
    });
    installExternalQuotaGuard();

    const result = await runGeminiRightHandFreeJson("Return JSON.");

    expect(result.status).toBe("unavailable");
    expect(calls).toHaveLength(2);
    expect(calls.map((url) => url.match(/models\/([^:]+):generateContent/)?.[1])).toEqual([
      GEMINI_RIGHT_HAND_MODEL,
      GEMINI_RIGHT_HAND_FALLBACK_MODELS[0],
    ]);
    expect(result.error).toContain("exhausted bounded model attempts");
  });
});
