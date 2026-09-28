import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/gemini-transient-retry", () => ({
  installGeminiTransientRetry: vi.fn(),
}));

import { GEMINI_RIGHT_HAND_MODEL, runGeminiRightHandFreeJson } from "../lib/gemini-right-hand-reasoning";
import { installExternalQuotaGuard, resetProviderGateForTests } from "../lib/provider-gate";

describe("Gemini Right-hand text-only control transport", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => resetProviderGateForTests());
  afterEach(() => {
    resetProviderGateForTests();
    globalThis.fetch = originalFetch;
    delete process.env.GEMINI_RIGHT_HAND_API_KEY;
    delete process.env.GEMINI_RIGHT_HAND_MODEL_CHAIN;
    delete process.env.APEX_GEMINI_RIGHT_HAND_RATE_LIMIT_RETRY_DELAY_MS;
    vi.restoreAllMocks();
  });

  function ok(text = '{"decision":"ok"}') {
    return new Response(JSON.stringify({
      steps: [{ type: "model_output", content: [{ type: "text", text }] }],
    }), { status: 200 });
  }

  it("uses one configured text model without a catalog probe or equivalent-model fan-out", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key";
    const calls: Array<{ url: string; model?: string }> = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) as { model?: string } : {};
      calls.push({ url, model: body.model });
      return ok();
    });
    installExternalQuotaGuard();

    const result = await runGeminiRightHandFreeJson("Review this Investigator text report and return JSON.");

    const generationCalls = calls.filter((call) => call.url.includes("/v1beta/interactions"));
    expect(result.status).toBe("completed");
    expect(result.model).toBe(GEMINI_RIGHT_HAND_MODEL);
    expect(calls.every((call) => call.url.includes("/v1beta/interactions"))).toBe(true);
    expect(generationCalls).toHaveLength(1);
    expect(generationCalls[0]?.model).toBe(GEMINI_RIGHT_HAND_MODEL);
  });

  it("retries the same model once on transient network failure", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key-network";
    const attempts: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) as { model?: string } : {};
      if (!url.includes("/v1beta/interactions")) throw new Error("unexpected non-generation request");
      attempts.push(body.model ?? "");
      if (attempts.length === 1) throw new TypeError("fetch failed");
      return ok('{"decision":"same-model-retry-ok"}');
    });
    installExternalQuotaGuard();

    const result = await runGeminiRightHandFreeJson("Return JSON.");

    expect(result.status).toBe("completed");
    expect(attempts).toEqual([GEMINI_RIGHT_HAND_MODEL, GEMINI_RIGHT_HAND_MODEL]);
  });

  it("does not model-hop on HTTP 429; quota guard fails closed without burning another model request", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key-429";
    process.env.APEX_GEMINI_RIGHT_HAND_RATE_LIMIT_RETRY_DELAY_MS = "10";
    const attempts: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) as { model?: string } : {};
      if (!url.includes("/v1beta/interactions")) throw new Error("unexpected non-generation request");
      attempts.push(body.model ?? "");
      return new Response(JSON.stringify({ error: { message: "quota exceeded" } }), { status: 429 });
    });
    installExternalQuotaGuard();

    const result = await runGeminiRightHandFreeJson("Return JSON.");

    expect(result.status).toBe("unavailable");
    expect(attempts).toEqual([GEMINI_RIGHT_HAND_MODEL, GEMINI_RIGHT_HAND_MODEL]);
    expect(result.error).toContain("rate limit persisted");
  });

  it("does not model-hop on HTTP 503; it remains bounded to the configured Right-hand model", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key-503";
    const attempts: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) as { model?: string } : {};
      if (!url.includes("/v1beta/interactions")) throw new Error("unexpected non-generation request");
      attempts.push(body.model ?? "");
      return new Response(JSON.stringify({ error: { message: "service unavailable" } }), { status: 503 });
    });
    installExternalQuotaGuard();

    const result = await runGeminiRightHandFreeJson("Return JSON.");

    expect(result.status).toBe("unavailable");
    expect(attempts).toEqual([GEMINI_RIGHT_HAND_MODEL]);
    expect(result.error).toContain("exhausted bounded same-role model attempts");
  });

  it("ignores environment-controlled fallback chains", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key";
    process.env.GEMINI_RIGHT_HAND_MODEL_CHAIN = "gemini-9.9-flash,gemini-1.0-flash";
    const calls: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push(url);
      if (!url.includes("/v1beta/interactions")) throw new Error("unexpected non-generation request");
      return ok();
    });
    installExternalQuotaGuard();

    const result = await runGeminiRightHandFreeJson("Return JSON.");

    expect(result.status).toBe("completed");
    expect(calls).toHaveLength(1);
  });

  it("does not expose provider response bodies", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key-sanitized";
    const secretProviderMessage = "secret provider response must never escape the diagnostics boundary";
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (!url.includes("/v1beta/interactions")) throw new Error("unexpected non-generation request");
      return new Response(JSON.stringify({ error: { code: "INVALID_ARGUMENT", message: secretProviderMessage } }), { status: 400 });
    });
    installExternalQuotaGuard();

    const result = await runGeminiRightHandFreeJson("Return JSON.");

    expect(result.status).toBe("unavailable");
    expect(result.error).toContain("invalid_request");
    expect(result.error).not.toContain(secretProviderMessage);
  });
});
