import { afterEach, describe, expect, it, vi } from "vitest";
import { getGroqTokenMaxWaitMs, getGroqTokenWindowSnapshot, reconcileGroqTokenWindowFromBody } from "./provider-gate";

const original = process.env.APEX_GROQ_TPM_MAX_WAIT_MS;

afterEach(() => {
  if (original === undefined) delete process.env.APEX_GROQ_TPM_MAX_WAIT_MS;
  else process.env.APEX_GROQ_TPM_MAX_WAIT_MS = original;
});

describe("Groq token-window wait budget", () => {
  it("allows one full token reset window by default", () => {
    delete process.env.APEX_GROQ_TPM_MAX_WAIT_MS;
    expect(getGroqTokenMaxWaitMs()).toBe(60_000);
  });

  it("continues to honor an explicit bounded deployment override", () => {
    process.env.APEX_GROQ_TPM_MAX_WAIT_MS = "15000";
    expect(getGroqTokenMaxWaitMs()).toBe(15_000);
    process.env.APEX_GROQ_TPM_MAX_WAIT_MS = "999999";
    expect(getGroqTokenMaxWaitMs()).toBe(120_000);
  });
});

describe("Groq adaptive token-window observations", () => {
  it("learns the provider limit and remaining-token balance from response headers", () => {
    const key = "test-adaptive-" + Math.random().toString(36).slice(2);
    const reservation = { createdAt: Date.now(), reservedTokens: 900 };
    const response = new Response(JSON.stringify({ usage: { total_tokens: 800 } }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-ratelimit-limit-tokens": "12000",
        "x-ratelimit-remaining-tokens": "11200",
      },
    });
    reconcileGroqTokenWindowFromBody(key, reservation, response, JSON.stringify({ usage: { total_tokens: 800 } }));
    expect(getGroqTokenWindowSnapshot(key)).toMatchObject({
      providerLimit: 12000,
      providerRemainingTokens: 11200,
    });
    expect(getGroqTokenWindowSnapshot(key).remainingObservedAt).toEqual(expect.any(Number));
  });

  it("ignores malformed remaining-token headers rather than poisoning the learned balance", () => {
    const key = "test-adaptive-invalid-" + Math.random().toString(36).slice(2);
    const reservation = { createdAt: Date.now(), reservedTokens: 900 };
    const response = new Response(JSON.stringify({ usage: { total_tokens: 800 } }), {
      status: 200,
      headers: { "x-ratelimit-remaining-tokens": "unknown" },
    });
    reconcileGroqTokenWindowFromBody(key, reservation, response, JSON.stringify({ usage: { total_tokens: 800 } }));
    expect(getGroqTokenWindowSnapshot(key)).toMatchObject({
      providerLimit: null,
      providerRemainingTokens: null,
      remainingObservedAt: null,
    });
  });

  it("does not let a late higher balance overwrite a lower observation in the same reset window", () => {
    const key = "test-adaptive-out-of-order-" + Math.random().toString(36).slice(2);
    const observe = (remaining: number) => {
      const body = JSON.stringify({ usage: { total_tokens: 800 } });
      const reservation = { createdAt: Date.now(), reservedTokens: 900 };
      const response = new Response(body, {
        status: 200,
        headers: {
          "x-ratelimit-limit-tokens": "12000",
          "x-ratelimit-remaining-tokens": String(remaining),
          "x-ratelimit-reset-tokens": "60s",
        },
      });
      reconcileGroqTokenWindowFromBody(key, reservation, response, body);
    };

    observe(2_400);
    observe(9_800); // Simulates a slower, older response completing last.
    expect(getGroqTokenWindowSnapshot(key)).toMatchObject({
      providerLimit: 12_000,
      providerRemainingTokens: 2_400,
    });
  });

  it("accepts a replenished balance after the previously observed reset expires", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-11-16T12:00:00.000Z"));
      const key = "test-adaptive-after-reset-" + Math.random().toString(36).slice(2);
      const observe = (remaining: number, reset: string) => {
        const body = JSON.stringify({ usage: { total_tokens: 800 } });
        const reservation = { createdAt: Date.now(), reservedTokens: 900 };
        const response = new Response(body, {
          status: 200,
          headers: {
            "x-ratelimit-limit-tokens": "12000",
            "x-ratelimit-remaining-tokens": String(remaining),
            "x-ratelimit-reset-tokens": reset,
          },
        });
        reconcileGroqTokenWindowFromBody(key, reservation, response, body);
      };

      observe(2_400, "1s");
      vi.advanceTimersByTime(1_001);
      observe(11_500, "60s");
      expect(getGroqTokenWindowSnapshot(key)).toMatchObject({
        providerLimit: 12_000,
        providerRemainingTokens: 11_500,
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
