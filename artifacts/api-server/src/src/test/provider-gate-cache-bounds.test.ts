import { afterEach, describe, expect, it, vi } from "vitest";
import { installExternalQuotaGuard, resetProviderGateForTests } from "../lib/provider-gate";

describe("provider gate response cache boundaries", () => {
  afterEach(() => {
    resetProviderGateForTests();
    vi.unstubAllGlobals();
    delete process.env.APEX_EXTERNAL_MAX_RESPONSE_CACHE_BYTES;
    delete process.env.APEX_EXTERNAL_MAX_RESPONSE_CACHE_ENTRIES;
    delete process.env.APEX_EXTERNAL_GLOBAL_CONCURRENCY;
    delete process.env.APEX_EXTERNAL_PROVIDER_CONCURRENCY;
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

  it("does not admit an aborted waiter into the concurrency slot", async () => {
    process.env.APEX_EXTERNAL_GLOBAL_CONCURRENCY = "1";
    process.env.APEX_EXTERNAL_PROVIDER_CONCURRENCY = "1";
    let releaseFirst!: () => void;
    const firstDone = new Promise<void>((resolve) => { releaseFirst = resolve; });
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      calls += 1;
      await firstDone;
      return new Response("ok", { status: 200 });
    }));
    installExternalQuotaGuard();

    const first = fetch("https://example.test/one");
    await new Promise((resolve) => setTimeout(resolve, 0));
    const controller = new AbortController();
    const second = fetch("https://example.test/two", { signal: controller.signal });
    controller.abort();
    await expect(second).rejects.toThrow("cancelled");

    releaseFirst();
    await expect(first).resolves.toMatchObject({ ok: true });
    await expect(fetch("https://example.test/three")).resolves.toMatchObject({ ok: true });
    expect(calls).toBe(2);
  });
});
