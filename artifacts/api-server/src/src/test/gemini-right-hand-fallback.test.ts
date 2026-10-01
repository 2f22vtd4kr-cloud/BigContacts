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

  function catalog() {
    return new Response(JSON.stringify({
      models: [
        { name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"] },
        { name: "models/gemini-3.7-flash", supportedGenerationMethods: ["generateContent"] },
        { name: "models/gemini-3.6-flash", supportedGenerationMethods: ["generateContent"] },
        { name: "models/gemini-3.5-flash", supportedGenerationMethods: ["generateContent"] },
        { name: "models/gemini-3.5-flash-lite", supportedGenerationMethods: ["generateContent"] },
        { name: "models/gemini-3.1-flash-lite", supportedGenerationMethods: ["generateContent"] },
      ],
    }), { status: 200 });
  }

  it("uses the preferred model first after resolving the live catalog", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key";
    const calls: Array<{ url: string; model?: string }> = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/v1beta/models")) return catalog();
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
      if (url.endsWith("/v1beta/models")) return catalog();
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

  it("returns a successful response when a same-model 429 retry recovers", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key-429-recover";
    process.env.APEX_GEMINI_RIGHT_HAND_RATE_LIMIT_RETRY_DELAY_MS = "10";
    const attempts: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/v1beta/models")) return catalog();
      const body = init?.body ? JSON.parse(String(init.body)) as { model?: string } : {};
      if (!url.includes("/v1beta/interactions")) throw new Error("unexpected non-generation request");
      attempts.push(body.model ?? "");
      if (attempts.length === 1) {
        return new Response(JSON.stringify({ error: { code: "too_many_requests", message: "burst" } }), {
          status: 429,
          headers: { "retry-after": "0" },
        });
      }
      return ok('{"decision":"retry-recovered"}');
    });
    installExternalQuotaGuard();

    const result = await runGeminiRightHandFreeJson("Return JSON.");

    expect(result.status).toBe("completed");
    expect(result.model).toBe(GEMINI_RIGHT_HAND_MODEL);
    expect(attempts).toEqual([GEMINI_RIGHT_HAND_MODEL, GEMINI_RIGHT_HAND_MODEL]);
  });

  it("fails closed on explicit daily quota exhaustion without burning equivalent model requests", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key-429";
    process.env.APEX_GEMINI_RIGHT_HAND_RATE_LIMIT_RETRY_DELAY_MS = "10";
    const attempts: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/v1beta/models")) return catalog();
      const body = init?.body ? JSON.parse(String(init.body)) as { model?: string } : {};
      if (!url.includes("/v1beta/interactions")) throw new Error("unexpected non-generation request");
      attempts.push(body.model ?? "");
      return new Response(JSON.stringify({ error: { code: "quota_exceeded", message: "quota exceeded" } }), { status: 429 });
    });
    installExternalQuotaGuard();

    const result = await runGeminiRightHandFreeJson("Return JSON.");

    expect(result.status).toBe("unavailable");
    expect(attempts).toEqual([GEMINI_RIGHT_HAND_MODEL]);
    expect(result.error).toContain("daily quota exhaustion");
  });

  it("does not retry or model-hop when the provider message explicitly names a daily Free-tier quota", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key-daily-quota";
    process.env.APEX_GEMINI_RIGHT_HAND_RATE_LIMIT_RETRY_DELAY_MS = "10";
    const attempts: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/v1beta/models")) return catalog();
      const body = init?.body ? JSON.parse(String(init.body)) as { model?: string } : {};
      if (!url.includes("/v1beta/interactions")) throw new Error("unexpected non-generation request");
      attempts.push(body.model ?? "");
      return new Response(JSON.stringify({
        error: { code: "too_many_requests", message: "Free Tier limit of 500 requests per day has been exceeded." },
      }), { status: 429 });
    });
    installExternalQuotaGuard();

    const result = await runGeminiRightHandFreeJson("Return JSON.");

    expect(result.status).toBe("unavailable");
    expect(attempts).toEqual([GEMINI_RIGHT_HAND_MODEL]);
    expect(result.error).toContain("daily quota exhaustion");
  });

  it("falls back after bounded short-burst too_many_requests retries", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key-too-many";
    const attempts: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/v1beta/models")) return catalog();
      const body = init?.body ? JSON.parse(String(init.body)) as { model?: string } : {};
      if (!url.includes("/v1beta/interactions")) throw new Error("unexpected non-generation request");
      attempts.push(body.model ?? "");
      if (attempts.length < 3) {
        return new Response(JSON.stringify({ error: { code: "too_many_requests", message: "burst" } }), {
          status: 429,
          headers: { "retry-after": "0" },
        });
      }
      return ok('{"decision":"fallback-ok"}');
    });
    installExternalQuotaGuard();

    const result = await runGeminiRightHandFreeJson("Return JSON.");

    expect(result.status).toBe("completed");
    expect(attempts).toEqual([GEMINI_RIGHT_HAND_MODEL, GEMINI_RIGHT_HAND_MODEL, "gemini-3.1-flash-lite"]);
    expect(result.model).toBe("gemini-3.1-flash-lite");
  });

  it("uses the configured same-role fallback on HTTP 503", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key-503";
    const attempts: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/v1beta/models")) return catalog();
      const body = init?.body ? JSON.parse(String(init.body)) as { model?: string } : {};
      if (!url.includes("/v1beta/interactions")) throw new Error("unexpected non-generation request");
      attempts.push(body.model ?? "");
      return new Response(JSON.stringify({ error: { message: "service unavailable" } }), { status: 503 });
    });
    installExternalQuotaGuard();

    const result = await runGeminiRightHandFreeJson("Return JSON.");

    expect(result.status).toBe("unavailable");
    expect(attempts).toEqual([
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
    ]);
    expect(result.error).toContain("exhausted bounded same-role model attempts");
  });

  it("ignores environment-controlled fallback chains and uses the provider catalog", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key";
    process.env.GEMINI_RIGHT_HAND_MODEL_CHAIN = "gemini-9.9-flash,gemini-1.0-flash";
    const calls: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/v1beta/models")) return catalog();
      calls.push(url);
      if (!url.includes("/v1beta/interactions")) throw new Error("unexpected non-generation request");
      return ok();
    });
    installExternalQuotaGuard();

    const result = await runGeminiRightHandFreeJson("Return JSON.");

    expect(result.status).toBe("completed");
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("/v1beta/interactions");
  });

  it("does not expose provider response bodies", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key-sanitized";
    const secretProviderMessage = "secret provider response must never escape the diagnostics boundary";
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/v1beta/models")) return catalog();
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
