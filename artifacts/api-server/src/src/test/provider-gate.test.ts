import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ProviderQuotaError,
  classifyExternalProvider,
  resetProviderGateForTests,
  runProviderCall,
  withProviderRetryOwnership,
  withProviderScope,
} from "../lib/provider-gate";

describe("provider quota gate", () => {
  it("matches provider budget classes on hostname boundaries, not deceptive substrings", () => {
    expect(classifyExternalProvider("https://api.groq.com/openai/v1/chat/completions")).toBe("groq");
    expect(classifyExternalProvider("https://api.groq.com.attacker.invalid/openai/v1/chat/completions")).toBe("generic");
    expect(classifyExternalProvider("https://fakegroq.com/openai/v1/chat/completions")).toBe("generic");
    expect(classifyExternalProvider("https://api.company-information.service.gov.uk/search")).toBe("companies-house");
    expect(classifyExternalProvider("https://api.company-information.service.gov.uk.attacker.invalid/search")).toBe("generic");
    expect(classifyExternalProvider("https://data.brreg.no/enhetsregisteret/api/enheter")).toBe("registry");
    expect(classifyExternalProvider("https://evilbrreg.no/enhetsregisteret/api/enheter")).toBe("generic");
    expect(classifyExternalProvider("https://startup.registroimprese.it/isin/api/v1/startup/search")).toBe("registry");
    expect(classifyExternalProvider("https://registry.attacker.invalid/record")).toBe("generic");
    expect(classifyExternalProvider("https://maigret.attacker.invalid/api")).toBe("generic");
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.APEX_EXTERNAL_WINDOW_MS;
    delete process.env.APEX_PROVIDER_MAX_REQUESTS_GENERIC;
    delete process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GENERIC;
    delete process.env.APEX_PROVIDER_MAX_REQUESTS_GEMINI;
    delete process.env.APEX_PROVIDER_MAX_REQUESTS_GROQ;
    delete process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GEMINI;
    delete process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ;
    delete process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE;
    delete process.env.APEX_ATLAS_PROVIDER_MAX_REQUESTS_PER_SCOPE;
    delete process.env.APEX_EXTERNAL_PROVIDER_CONCURRENCY_GEMINI;
    delete process.env.APEX_EXTERNAL_PROVIDER_CONCURRENCY_GENERIC;
    delete process.env.APEX_EXTERNAL_GLOBAL_CONCURRENCY;
    delete process.env.APEX_EXTERNAL_CACHE_BODY_READ_TIMEOUT_MS;
    resetProviderGateForTests();
  });

  it("counts actual outbound attempts and fails closed at the provider budget", async () => {
    process.env.APEX_PROVIDER_MAX_REQUESTS_GENERIC = "2";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GENERIC = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";
    let calls = 0;

    await runProviderCall({ provider: "generic", account: "test-budget" }, async () => {
      calls += 1;
      return "first";
    });
    await runProviderCall({ provider: "generic", account: "test-budget" }, async () => {
      calls += 1;
      return "second";
    });

    await expect(
      runProviderCall({ provider: "generic", account: "test-budget" }, async () => {
        calls += 1;
        return "should-not-run";
      }),
    ).rejects.toMatchObject({
      code: "budget_exhausted",
      provider: "generic",
    });
    expect(calls).toBe(2);
  });

  it("keeps independent role scopes from consuming the same local budget", async () => {
    process.env.APEX_PROVIDER_MAX_REQUESTS_GENERIC = "10";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GENERIC = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "1";
    let calls = 0;

    await withProviderScope("atlas-investigator", () =>
      runProviderCall({ provider: "generic", account: "role-scope-test" }, async () => {
        calls += 1;
        return "investigator";
      }),
    );

    await withProviderScope("atlas-right-hand", () =>
      runProviderCall({ provider: "generic", account: "role-scope-test" }, async () => {
        calls += 1;
        return "right-hand";
      }),
    );

    expect(calls).toBe(2);
  });

  it("gives each canonical Atlas job its own bounded provider scope budget", async () => {
    process.env.APEX_PROVIDER_MAX_REQUESTS_GENERIC = "10";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GENERIC = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "1";
    process.env.APEX_ATLAS_PROVIDER_MAX_REQUESTS_PER_SCOPE = "2";

    await withProviderScope("atlas-run:test-job", () =>
      runProviderCall({ provider: "generic", account: "atlas-scope-budget" }, async () => "first"),
    );
    await withProviderScope("atlas-run:test-job", () =>
      runProviderCall({ provider: "generic", account: "atlas-scope-budget" }, async () => "second"),
    );

    await expect(
      withProviderScope("atlas-run:test-job", () =>
        runProviderCall({ provider: "generic", account: "atlas-scope-budget" }, async () => "third"),
      ),
    ).rejects.toMatchObject({ code: "budget_exhausted", provider: "generic" });

    await expect(
      withProviderScope("atlas-right-hand", () =>
        runProviderCall({ provider: "generic", account: "atlas-scope-budget" }, async () => "right-hand"),
      ),
    ).resolves.toBe("right-hand");
  });

  it("honors cooldowns without retrying the provider", async () => {
    process.env.APEX_PROVIDER_MAX_REQUESTS_GENERIC = "10";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GENERIC = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";

    await runProviderCall({ provider: "generic", account: "test-cooldown" }, async () => {
      throw new ProviderQuotaError("cooldown", "generic", 2_000);
    }).catch(() => undefined);

    await expect(
      runProviderCall({ provider: "generic", account: "test-cooldown" }, async () => "unexpected"),
    ).rejects.toMatchObject({ code: "cooldown", provider: "generic" });
  });

  it("keeps Gemini oversight from being serialized behind a single Gemini slot", async () => {
    process.env.APEX_PROVIDER_MAX_REQUESTS_GEMINI = "10";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GEMINI = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";
    let active = 0;
    let peak = 0;

    const work = () =>
      runProviderCall({ provider: "gemini", account: "right-hand-test" }, async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 10));
        active -= 1;
      });

    await Promise.all([work(), work()]);
    expect(peak).toBe(2);
  });

  it("does not consume an attempt while waiting behind a concurrency slot", async () => {
    process.env.APEX_PROVIDER_MAX_REQUESTS_GENERIC = "10";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GENERIC = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";
    let active = 0;
    let peak = 0;

    const work = () =>
      runProviderCall({ provider: "generic", account: `${Math.random()}` }, async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 10));
        active -= 1;
      });
    await Promise.all([work(), work(), work()]);
    expect(peak).toBeLessThanOrEqual(1);
  });

  it("does not let one Gemini model cooldown block a bounded fallback model", async () => {
    process.env.APEX_PROVIDER_MAX_REQUESTS_GEMINI = "10";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GEMINI = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "10";

    const nativeFetch = globalThis.fetch;
    const fetchMock = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.includes("/gemini-3.8-flash:generateContent")) {
        return new Response(JSON.stringify({ error: { code: 429 } }), { status: 429 });
      }
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"outcome":"proceed"}' }] } }],
      }), { status: 200 });
    };
    globalThis.fetch = fetchMock;

    const { installExternalQuotaGuard } = await import("../lib/provider-gate");
    installExternalQuotaGuard();

    const first = await globalThis.fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      { method: "POST", headers: { "x-goog-api-key": "test-key" }, body: "{}" },
    );
    const second = await globalThis.fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent",
      { method: "POST", headers: { "x-goog-api-key": "test-key" }, body: "{}" },
    );

    expect(first.status).toBe(429);
    expect(second.status).toBe(200);
    globalThis.fetch = nativeFetch;
  });

  it("does not convert Gemini 403 permission denial into a cooldown", async () => {
    process.env.APEX_PROVIDER_MAX_REQUESTS_GEMINI = "10";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GEMINI = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";
    let calls = 0;

    const first = await runProviderCall(
      { provider: "gemini", account: "permission-denied-test" },
      async () => {
        calls += 1;
        return new Response(JSON.stringify({
          error: { code: 403, status: "PERMISSION_DENIED" },
        }), { status: 403 });
      },
    );
    const second = await runProviderCall(
      { provider: "gemini", account: "permission-denied-test" },
      async () => {
        calls += 1;
        return new Response("", { status: 200 });
      },
    );

    expect(first.status).toBe(403);
    expect(second.status).toBe(200);
    expect(calls).toBe(2);
  });

  it("delegates Gemini 429/503 cooldown ownership to the role boundary", async () => {
    process.env.APEX_PROVIDER_MAX_REQUESTS_GEMINI = "10";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GEMINI = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";
    let calls = 0;

    const first = await runProviderCall(
      { provider: "gemini", account: "transient-test" },
      async () => {
        calls += 1;
        return new Response("", { status: 429 });
      },
    );
    const second = await runProviderCall(
      { provider: "gemini", account: "transient-test" },
      async () => {
        calls += 1;
        return new Response("", { status: 200 });
      },
    );

    expect(first.status).toBe(429);
    expect(second.status).toBe(200);
    expect(calls).toBe(2);
  });

  it("does not convert Groq 403 permission denial into a cooldown", async () => {
    process.env.APEX_PROVIDER_MAX_REQUESTS_GROQ = "10";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";
    let calls = 0;

    const first = await runProviderCall(
      { provider: "groq", account: "permission-denied-test" },
      async () => {
        calls += 1;
        return new Response(JSON.stringify({ error: { type: "permissions_error" } }), { status: 403 });
      },
    );
    const second = await runProviderCall(
      { provider: "groq", account: "permission-denied-test" },
      async () => {
        calls += 1;
        return new Response("", { status: 200 });
      },
    );

    expect(first.status).toBe(403);
    expect(second.status).toBe(200);
    expect(calls).toBe(2);
  });

  it("lets a role boundary own transient Groq 429 retry without creating a gate cooldown", async () => {
    process.env.APEX_PROVIDER_MAX_REQUESTS_GROQ = "10";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";
    let calls = 0;

    const first = await withProviderRetryOwnership("groq", "caller", () =>
      runProviderCall(
        { provider: "groq", account: "caller-owned-retry-test" },
        async () => {
          calls += 1;
          return new Response(JSON.stringify({ error: { code: "rate_limit_exceeded" } }), { status: 429 });
        },
      ),
    );
    const second = await runProviderCall(
      { provider: "groq", account: "caller-owned-retry-test" },
      async () => {
        calls += 1;
        return new Response("", { status: 200 });
      },
    );

    expect(first.status).toBe(429);
    expect(second.status).toBe(200);
    expect(calls).toBe(2);
  });

  it("lets the Right-hand caller retry through the installed fetch guard after a transient Groq 429", async () => {
    process.env.APEX_PROVIDER_MAX_REQUESTS_GROQ = "10";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";

    const nativeFetch = globalThis.fetch;
    let upstreamCalls = 0;
    globalThis.fetch = (async () => {
      upstreamCalls += 1;
      if (upstreamCalls === 1) {
        return new Response(JSON.stringify({ error: { code: "rate_limit_exceeded" } }), {
          status: 429,
          headers: {
            "retry-after": "0",
            "x-ratelimit-limit-requests": "1000",
            "x-ratelimit-remaining-requests": "999",
          },
        });
      }
      return new Response("", { status: 200 });
    }) as typeof fetch;

    const { installExternalQuotaGuard } = await import("../lib/provider-gate");
    installExternalQuotaGuard();

    try {
      const first = await withProviderRetryOwnership("groq", "caller", () =>
        globalThis.fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: "Bearer right-hand-test-key" },
          body: "{}",
        }),
      );
      const second = await globalThis.fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: { Authorization: "Bearer right-hand-test-key" },
          body: "{}",
        },
      );

      expect(first.status).toBe(429);
      expect(second.status).toBe(200);
      expect(upstreamCalls).toBe(2);
    } finally {
      globalThis.fetch = nativeFetch;
    }
  });

  it("keeps gate-owned Groq 429 cooldowns when no caller ownership is declared", async () => {
    process.env.APEX_PROVIDER_MAX_REQUESTS_GROQ = "10";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";

    await runProviderCall(
      { provider: "groq", account: "gate-owned-retry-test" },
      async () => new Response("", { status: 429 }),
    );

    await expect(
      runProviderCall(
        { provider: "groq", account: "gate-owned-retry-test" },
        async () => new Response("", { status: 200 }),
      ),
    ).rejects.toMatchObject({ code: "cooldown", provider: "groq" });
  });

  it("does not exceed the concurrency ceiling when queued calls are released together", async () => {
    process.env.APEX_EXTERNAL_GLOBAL_CONCURRENCY = "1";
    process.env.APEX_EXTERNAL_PROVIDER_CONCURRENCY_GENERIC = "1";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GENERIC = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    let active = 0;
    let peak = 0;
    const work = (hold = false) => runProviderCall({ provider: "generic", account: "queued-slot-test" }, async () => {
      active += 1;
      peak = Math.max(peak, active);
      if (hold) await firstGate;
      await Promise.resolve();
      active -= 1;
    });
    const first = work(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const second = work();
    const third = work();
    releaseFirst();
    await Promise.all([first, second, third]);
    expect(peak).toBe(1);
  });

  it("rechecks the scope budget after concurrent calls wait for a provider slot", async () => {
    process.env.APEX_PROVIDER_MAX_REQUESTS_GENERIC = "10";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GENERIC = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "1";
    process.env.APEX_EXTERNAL_GLOBAL_CONCURRENCY = "1";
    process.env.APEX_EXTERNAL_PROVIDER_CONCURRENCY_GENERIC = "1";
    let releaseFirst!: () => void;
    let announceFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const firstStarted = new Promise<void>((resolve) => { announceFirst = resolve; });
    let calls = 0;
    const work = (hold = false) => runProviderCall({ provider: "generic", account: "queued-budget-test" }, async () => {
      calls += 1;
      if (hold) { announceFirst(); await firstGate; }
      return "ok";
    });
    const first = work(true);
    const second = work();
    const third = work();
    await firstStarted;
    releaseFirst();
    const results = await Promise.allSettled([first, second, third]);
    expect(results[0]?.status).toBe("fulfilled");
    expect(calls).toBe(1);
    const rejected = results.slice(1).filter((result): result is PromiseRejectedResult => result.status === "rejected");
    expect(rejected).toHaveLength(2);
    expect(rejected.every((result) => result.reason instanceof ProviderQuotaError && result.reason.code === "budget_exhausted")).toBe(true);
  });

  it("serves a cached public GET without spending another provider attempt", async () => {
    process.env.APEX_PROVIDER_MAX_REQUESTS_GENERIC = "10";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GENERIC = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "1";
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response("cached public response", { status: 200, headers: { "cache-control": "public, max-age=60" } });
    }) as typeof fetch;
    try {
      const { installExternalQuotaGuard } = await import("../lib/provider-gate");
      installExternalQuotaGuard();
      const first = await globalThis.fetch("https://public-cache.example.test/resource");
      expect(await first.text()).toBe("cached public response");
      const second = await globalThis.fetch("https://public-cache.example.test/resource");
      expect(await second.text()).toBe("cached public response");
      expect(calls).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rechecks the scope budget after guarded fetches wait for a provider slot", async () => {
    process.env.APEX_PROVIDER_MAX_REQUESTS_GENERIC = "10";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GENERIC = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "1";
    process.env.APEX_EXTERNAL_GLOBAL_CONCURRENCY = "1";
    process.env.APEX_EXTERNAL_PROVIDER_CONCURRENCY_GENERIC = "1";
    const originalFetch = globalThis.fetch;
    let releaseFirst!: () => void;
    let announceFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const firstStarted = new Promise<void>((resolve) => { announceFirst = resolve; });
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      if (calls === 1) { announceFirst(); await firstGate; }
      return new Response("ok", { status: 200 });
    }) as typeof fetch;
    try {
      const { installExternalQuotaGuard } = await import("../lib/provider-gate");
      installExternalQuotaGuard();
      const work = () => withProviderScope("queued-fetch-budget-test", () =>
        globalThis.fetch("https://public-fetch.example.test/run", { method: "POST", body: "{}" }),
      );
      const first = work();
      const second = work();
      const third = work();
      await firstStarted;
      releaseFirst();
      const results = await Promise.allSettled([first, second, third]);
      expect(results[0]?.status).toBe("fulfilled");
      expect(calls).toBe(1);
      const rejected = results.slice(1).filter((result): result is PromiseRejectedResult => result.status === "rejected");
      expect(rejected).toHaveLength(2);
      expect(rejected.every((result) => result.reason instanceof ProviderQuotaError && result.reason.code === "budget_exhausted")).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("RequestInit headers override Request headers for cache eligibility", async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async (input, init) => {
      calls += 1;
      const headers = new Headers(init?.headers !== undefined ? init.headers : input instanceof Request ? input.headers : undefined);
      return new Response(headers.get("authorization") ?? "anonymous", { status: 200, headers: { "cache-control": "public, max-age=60" } });
    }) as typeof fetch;
    try {
      const { installExternalQuotaGuard } = await import("../lib/provider-gate");
      installExternalQuotaGuard();
      const request = new Request("https://auth-cache.example.test/resource");
      const first = await globalThis.fetch(request, { headers: { authorization: "Bearer one" } });
      const second = await globalThis.fetch(request, { headers: { authorization: "Bearer two" } });
      expect(await first.text()).toBe("Bearer one");
      expect(await second.text()).toBe("Bearer two");
      expect(calls).toBe(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("custom request headers bypass shared response caching", async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async (_input, init) => {
      calls += 1;
      const headers = new Headers(init?.headers);
      return new Response(headers.get("x-tenant-id") ?? "none", { status: 200, headers: { "cache-control": "public, max-age=60" } });
    }) as typeof fetch;
    try {
      const { installExternalQuotaGuard } = await import("../lib/provider-gate");
      installExternalQuotaGuard();
      const first = await globalThis.fetch("https://tenant-cache.example.test/resource", { headers: { "x-tenant-id": "tenant-one" } });
      const second = await globalThis.fetch("https://tenant-cache.example.test/resource", { headers: { "x-tenant-id": "tenant-two" } });
      expect(await first.text()).toBe("tenant-one");
      expect(await second.text()).toBe("tenant-two");
      expect(calls).toBe(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("no-cache and max-age=0 responses are not reused", async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response(`version-${calls}`, { status: 200, headers: { "cache-control": "public, no-cache, max-age=0" } });
    }) as typeof fetch;
    try {
      const { installExternalQuotaGuard } = await import("../lib/provider-gate");
      installExternalQuotaGuard();
      const first = await globalThis.fetch("https://freshness-cache.example.test/resource");
      const second = await globalThis.fetch("https://freshness-cache.example.test/resource");
      expect(await first.text()).toBe("version-1");
      expect(await second.text()).toBe("version-2");
      expect(calls).toBe(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("credential query parameters bypass shared response caching", async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async (input) => {
      calls += 1;
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
      return new Response(url.searchParams.get("x-api-key") ?? "none", { status: 200, headers: { "cache-control": "public, max-age=60" } });
    }) as typeof fetch;
    try {
      const { installExternalQuotaGuard } = await import("../lib/provider-gate");
      installExternalQuotaGuard();
      const first = await globalThis.fetch("https://query-auth-cache.example.test/resource?x-api-key=one");
      const second = await globalThis.fetch("https://query-auth-cache.example.test/resource?x-api-key=two");
      expect(await first.text()).toBe("one");
      expect(await second.text()).toBe("two");
      expect(calls).toBe(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("stalled public response body is not held open by cache capture", async () => {
    const originalFetch = globalThis.fetch;
    process.env.APEX_EXTERNAL_CACHE_BODY_READ_TIMEOUT_MS = "10";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GENERIC = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response(new ReadableStream<Uint8Array>({ start() {} }), {
        status: 200,
        headers: { "cache-control": "public, max-age=60" },
      });
    }) as typeof fetch;
    try {
      const { installExternalQuotaGuard } = await import("../lib/provider-gate");
      installExternalQuotaGuard();
      const fetchResult = globalThis.fetch("https://stalled-cache.example.test/resource");
      const outcome = await Promise.race([
        fetchResult.then((response) => ({ kind: "response" as const, response })),
        new Promise<{ kind: "timeout" }>((resolve) => setTimeout(() => resolve({ kind: "timeout" }), 250)),
      ]);
      expect(outcome.kind).toBe("response");
      if (outcome.kind === "response") {
        expect(outcome.response.status).toBe(200);
        await outcome.response.body?.cancel();
      }
      expect(calls).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("oversized public GET responses are not cached after a bounded clone read", async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response(`version-${calls}-${"x".repeat(1_500_001)}`, {
        status: 200,
        headers: { "cache-control": "public, max-age=60" },
      });
    }) as typeof fetch;
    try {
      const { installExternalQuotaGuard } = await import("../lib/provider-gate");
      installExternalQuotaGuard();
      const first = await globalThis.fetch("https://large-public-cache.example.test/resource");
      const second = await globalThis.fetch("https://large-public-cache.example.test/resource");
      expect((await first.text()).startsWith("version-1-")).toBe(true);
      expect((await second.text()).startsWith("version-2-")).toBe(true);
      expect(calls).toBe(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("reports retry time from the exhausted scope window, not a newer account window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-09T08:00:00.000Z"));
    process.env.APEX_EXTERNAL_WINDOW_MS = "10000";
    process.env.APEX_PROVIDER_MAX_REQUESTS_GENERIC = "10";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GENERIC = "0";
    process.env.APEX_ATLAS_PROVIDER_MAX_REQUESTS_PER_SCOPE = "1";

    const scope = "atlas-run:scope-retry-window-test";
    await withProviderScope(scope, () =>
      runProviderCall({ provider: "generic", account: "older-account" }, async () => "first"),
    );

    vi.setSystemTime(new Date(Date.now() + 5_000));
    await expect(
      withProviderScope(scope, () =>
        runProviderCall({ provider: "generic", account: "new-account" }, async () => "must-not-run"),
      ),
    ).rejects.toMatchObject({
      code: "budget_exhausted",
      provider: "generic",
      retryAfterMs: 5_000,
    });
  });

});