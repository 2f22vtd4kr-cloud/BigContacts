import { afterEach, describe, expect, it, vi } from "vitest";
import { installExternalQuotaGuard, resetProviderGateForTests } from "../lib/provider-gate";

describe("provider gate response cache boundaries", () => {
  afterEach(() => {
    resetProviderGateForTests();
    vi.unstubAllGlobals();
    delete process.env.APEX_EXTERNAL_MAX_RESPONSE_CACHE_BYTES;
    delete process.env.APEX_EXTERNAL_MAX_RESPONSE_CACHE_ENTRIES;
  });

  it("keeps aggregate cached response bytes below the configured budget", async () => {
    process.env.APEX_EXTERNAL_MAX_RESPONSE_CACHE_BYTES = String(4 * 1024 * 1024);
    process.env.APEX_EXTERNAL_MAX_RESPONSE_CACHE_ENTRIES = "10";
    const originalFetch = globalThis.fetch;
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      calls += 1;
      return new Response("x".repeat(1_500_000), { status: 200, headers: { "content-type": "text/plain" } });
    }));
    installExternalQuotaGuard();

    for (let i = 0; i < 4; i += 1) {
      const response = await fetch(`https://example.test/public-${i}`);
      expect(response.ok).toBe(true);
    }

    await fetch("https://example.test/public-0");
    expect(calls).toBe(5);
    expect(originalFetch).toBeTypeOf("function");
  });

  it("does not cache credential- or cookie-bearing GET requests", async () => {
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      calls += 1;
      return new Response("private", { status: 200 });
    }));
    installExternalQuotaGuard();

    await fetch("https://example.test/private", { headers: { Authorization: "Bearer one" } });
    await fetch("https://example.test/private", { headers: { Authorization: "Bearer one" } });
    await fetch("https://example.test/cookie", { headers: { Cookie: "session=one" } });
    await fetch("https://example.test/cookie", { headers: { Cookie: "session=one" } });

    expect(calls).toBe(4);
  });

  it("does not cache GET requests carrying credentials in the query string", async () => {
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      calls += 1;
      return new Response("private-query", { status: 200 });
    }));
    installExternalQuotaGuard();

    await fetch("https://example.test/private?token=one");
    await fetch("https://example.test/private?token=one");
    await fetch("https://example.test/private?token=two");
    await fetch("https://example.test/private?api_key=three");

    expect(calls).toBe(4);
  });
});
