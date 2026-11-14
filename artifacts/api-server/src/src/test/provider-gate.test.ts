import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ProviderQuotaError,
  classifyExternalProvider,
  getGroqTokenRequest,
  reconcileGroqTokenResponse,
  resetProviderGateForTests,
  runProviderCall,
  withProviderRetryOwnership,
  withProviderScope,
  withProviderRole,
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
    delete process.env.APEX_ATLAS_INVESTIGATOR_PROVIDER_MAX_REQUESTS_PER_SCOPE;
    delete process.env.APEX_ATLAS_CONTROL_PROVIDER_MAX_REQUESTS_PER_SCOPE;
    delete process.env.APEX_EXTERNAL_PROVIDER_CONCURRENCY_GEMINI;
    delete process.env.APEX_EXTERNAL_PROVIDER_CONCURRENCY_GENERIC;
    delete process.env.APEX_EXTERNAL_GLOBAL_CONCURRENCY;
    delete process.env.APEX_EXTERNAL_CACHE_BODY_READ_TIMEOUT_MS;
    delete process.env.APEX_GROQ_TPM_BUDGET;
    delete process.env.APEX_GROQ_TPM_WINDOW_MS;
    delete process.env.APEX_GROQ_TPM_MAX_WAIT_MS;
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


  it("reserves a bounded Groq budget for control calls when Investigator retries are exhausted", async () => {
    process.env.APEX_PROVIDER_MAX_REQUESTS_GROQ = "20";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "10";
    process.env.APEX_ATLAS_PROVIDER_MAX_REQUESTS_PER_SCOPE = "4";
    process.env.APEX_ATLAS_INVESTIGATOR_PROVIDER_MAX_REQUESTS_PER_SCOPE = "2";
    process.env.APEX_ATLAS_CONTROL_PROVIDER_MAX_REQUESTS_PER_SCOPE = "2";
    let calls = 0;
    const call = () => runProviderCall({ provider: "groq", account: "atlas-role-reservation" }, async () => {
      calls += 1;
      return calls;
    });
    const runScope = (role: "investigator" | "control", fn: () => Promise<unknown>) =>
      withProviderScope("atlas-run:reserved-control-test", () => withProviderRole(role, fn));
    await runScope("investigator", async () => {
      await call();
      await call();
      await expect(call()).rejects.toMatchObject({ code: "budget_exhausted", provider: "groq" });
    });
    await runScope("control", async () => {
      await call();
      await call();
      await expect(call()).rejects.toMatchObject({ code: "budget_exhausted", provider: "groq" });
    });
    expect(calls).toBe(4);
  });

  it("fails closed on unclassified Groq calls inside an Atlas job scope", async () => {
    process.env.APEX_PROVIDER_MAX_REQUESTS_GROQ = "20";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    process.env.APEX_ATLAS_PROVIDER_MAX_REQUESTS_PER_SCOPE = "4";
    let calls = 0;
    await expect(withProviderScope("atlas-run:unclassified-role-test", () =>
      runProviderCall({ provider: "groq", account: "unclassified-role" }, async () => {
        calls += 1;
        return "must-not-run";
      }),
    )).rejects.toMatchObject({ code: "budget_exhausted", provider: "groq" });
    expect(calls).toBe(0);
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

  it("does not treat JSON-escaped long Right-hand compaction prompts as TPM usage", async () => {
    process.env.APEX_GROQ_TPM_BUDGET = "7000";
    process.env.APEX_GROQ_TPM_WINDOW_MS = "60000";
    process.env.APEX_GROQ_TPM_MAX_WAIT_MS = "0";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";
    const repeatedLines = (prefix: string, totalChars: number) => {
      const lines = Array.from({ length: Math.ceil(totalChars / 80) }, (_, index) =>
        prefix + String(index % 10).repeat(79),
      );
      return lines.join("\n").slice(0, totalChars);
    };
    const url = "https://api.groq.com/openai/v1/chat/completions";
    const init: RequestInit = {
      method: "POST",
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        max_completion_tokens: 768,
        messages: [
          { role: "system", content: repeatedLines("s", 13_556) },
          { role: "user", content: repeatedLines("u", 7_551) },
        ],
      }),
    };
    const request = getGroqTokenRequest(url, init);
    expect(request?.reservedTokens).toBeGreaterThan(6_000);
    // The observed Replit Right-hand compaction prompt used ~4.3k actual
    // prompt tokens plus a 768-token output allowance under an 8k TPM limit.
    // Escaping newlines in JSON must not inflate that valid request above the
    // 7k local safety budget before the provider can report real usage.
    expect(request?.reservedTokens).toBeLessThanOrEqual(7_000);
    const body = JSON.stringify({ usage: { prompt_tokens: 4_314, completion_tokens: 330, total_tokens: 4_644 } });
    const response = await runProviderCall(
      { provider: "groq", account: "right-hand-compaction-estimate", groqRequest: request! },
      async () => new Response(body, { status: 200 }),
    );
    expect(response.status).toBe(200);
    reconcileGroqTokenResponse(response, body);
  });

  it("shares one rolling Groq TPM reservation across roles even when they use different credentials for the same model", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-13T10:00:00.000Z"));
    process.env.APEX_GROQ_TPM_BUDGET = "4000";
    process.env.APEX_GROQ_TPM_WINDOW_MS = "10000";
    process.env.APEX_GROQ_TPM_MAX_WAIT_MS = "10000";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response(JSON.stringify({ usage: { prompt_tokens: 400, completion_tokens: 2_000, total_tokens: 2_400 }, choices: [{ message: { content: "{}" }, finish_reason: "stop" }] }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    try {
      const { installExternalQuotaGuard } = await import("../lib/provider-gate");
      installExternalQuotaGuard();
      const request = { model: "openai/gpt-oss-20b", max_completion_tokens: 2_000, messages: [{ role: "user", content: "x".repeat(1_000) }] };
      const url = "https://api.groq.com/openai/v1/chat/completions";
      const firstInit = { method: "POST", headers: { Authorization: "Bearer investigator-key", "Content-Type": "application/json" }, body: JSON.stringify(request) };
      const secondInit = { method: "POST", headers: { Authorization: "Bearer right-hand-key", "Content-Type": "application/json" }, body: JSON.stringify(request) };
      await withProviderRole("investigator", () => globalThis.fetch(url, firstInit));
      expect(calls).toBe(1);
      const pending = withProviderRole("control", () => globalThis.fetch(url, secondInit));
      await vi.advanceTimersByTimeAsync(9_999);
      expect(calls).toBe(1);
      await vi.advanceTimersByTimeAsync(1);
      const second = await pending;
      expect(second.status).toBe(200);
      expect(calls).toBe(2);
    } finally { globalThis.fetch = originalFetch; }
  });
  it("shares the Groq token window across pinned safe-fetch role calls", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-13T10:00:00.000Z"));
    process.env.APEX_GROQ_TPM_BUDGET = "4000";
    process.env.APEX_GROQ_TPM_WINDOW_MS = "10000";
    process.env.APEX_GROQ_TPM_MAX_WAIT_MS = "10000";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";
    const url = "https://api.groq.com/openai/v1/chat/completions";
    const init: RequestInit = { method: "POST", body: JSON.stringify({ model: "openai/gpt-oss-20b", max_completion_tokens: 2_000, messages: [{ role: "user", content: "x".repeat(1_000) }] }) };
    const groqRequest = getGroqTokenRequest(url, init);
    expect(groqRequest).toBeDefined();
    expect(groqRequest?.reservedTokens).toBeGreaterThan(2_000);
    expect(groqRequest?.reservedTokens).toBeLessThan(2_400);
    let calls = 0;
    const invoke = (account: string) => runProviderCall({ provider: "groq", account, groqRequest }, async () => {
      calls += 1;
      return new Response(JSON.stringify({ usage: { prompt_tokens: 400, completion_tokens: 2_000, total_tokens: 2_400 }, choices: [{ message: { content: "{}" }, finish_reason: "stop" }] }), { status: 200, headers: { "content-type": "application/json" } });
    });
    await invoke("investigator-role-key");
    expect(calls).toBe(1);
    const pending = invoke("right-hand-role-key");
    await vi.advanceTimersByTimeAsync(9_999);
    expect(calls).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    const response = await pending;
    expect(response.status).toBe(200);
    expect(calls).toBe(2);
  });

  it("reconciles Groq reservations against actual usage before admitting another role", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-13T10:00:00.000Z"));
    process.env.APEX_GROQ_TPM_BUDGET = "4000";
    process.env.APEX_GROQ_TPM_WINDOW_MS = "10000";
    process.env.APEX_GROQ_TPM_MAX_WAIT_MS = "0";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";
    const firstRequest = { model: "openai/gpt-oss-20b", reservedTokens: 3_000 };
    const secondRequest = { model: "openai/gpt-oss-20b", reservedTokens: 2_500 };
    const firstBody = JSON.stringify({ usage: { prompt_tokens: 700, completion_tokens: 300, total_tokens: 1_000 } });
    const firstResponse = new Response(firstBody, { status: 200 });
    const first = await runProviderCall({ provider: "groq", account: "investigator", groqRequest: firstRequest }, async () => firstResponse);
    reconcileGroqTokenResponse(firstResponse, firstBody);
    expect(first.status).toBe(200);
    const second = await runProviderCall({ provider: "groq", account: "right-hand", groqRequest: secondRequest }, async () =>
      new Response(JSON.stringify({ usage: { prompt_tokens: 1_000, completion_tokens: 500, total_tokens: 1_500 } }), { status: 200 }),
    );
    expect(second.status).toBe(200);
  });

  it("wakes a waiting Groq role soon after another response reconciles below its reservation", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-13T10:00:00.000Z"));
    process.env.APEX_GROQ_TPM_BUDGET = "4000";
    process.env.APEX_GROQ_TPM_WINDOW_MS = "60000";
    process.env.APEX_GROQ_TPM_MAX_WAIT_MS = "60000";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";
    const firstBody = JSON.stringify({ usage: { prompt_tokens: 700, completion_tokens: 300, total_tokens: 1_000 } });
    const firstResponse = new Response(firstBody, { status: 200 });
    await runProviderCall({ provider: "groq", account: "investigator", groqRequest: { model: "openai/gpt-oss-20b", reservedTokens: 3_000 } }, async () => firstResponse);
    let secondCalls = 0;
    const pending = runProviderCall({ provider: "groq", account: "right-hand", groqRequest: { model: "openai/gpt-oss-20b", reservedTokens: 2_500 } }, async () => {
      secondCalls += 1;
      return new Response("{}", { status: 200 });
    });
    await vi.advanceTimersByTimeAsync(999);
    expect(secondCalls).toBe(0);
    reconcileGroqTokenResponse(firstResponse, firstBody);
    await vi.advanceTimersByTimeAsync(1);
    const second = await pending;
    expect(second.status).toBe(200);
    expect(secondCalls).toBe(1);
  });

  it("retains a conservative Groq reservation for a full window after an outbound failure", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-13T10:00:00.000Z"));
    process.env.APEX_GROQ_TPM_BUDGET = "4000";
    process.env.APEX_GROQ_TPM_WINDOW_MS = "10000";
    process.env.APEX_GROQ_TPM_MAX_WAIT_MS = "0";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";
    const firstRequest = { model: "openai/gpt-oss-20b", reservedTokens: 3_000 };
    await expect(runProviderCall({ provider: "groq", account: "investigator", groqRequest: firstRequest }, async () => {
      await vi.advanceTimersByTimeAsync(10_000);
      throw new Error("socket reset after request dispatch");
    })).rejects.toThrow("socket reset");
    let secondCalls = 0;
    await expect(runProviderCall({ provider: "groq", account: "right-hand", groqRequest: { model: "openai/gpt-oss-20b", reservedTokens: 2_000 } }, async () => {
      secondCalls += 1;
      return new Response("unexpected");
    })).rejects.toMatchObject({ code: "cooldown", provider: "groq" });
    expect(secondCalls).toBe(0);
  });

  it("shares a Groq 413 token-window capacity reset across role credentials", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-13T10:00:00.000Z"));
    process.env.APEX_GROQ_TPM_BUDGET = "4000";
    process.env.APEX_GROQ_TPM_MAX_WAIT_MS = "0";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";
    const request = { model: "openai/gpt-oss-20b", reservedTokens: 1_000 };
    const body = JSON.stringify({ error: { code: "rate_limit_exceeded", type: "tokens" } });
    const response = new Response(body, {
      status: 413,
      headers: { "x-ratelimit-reset-tokens": "20s" },
    });
    await runProviderCall({ provider: "groq", account: "investigator", groqRequest: request }, async () => response);
    reconcileGroqTokenResponse(response, body);
    let secondCalls = 0;
    await expect(runProviderCall({ provider: "groq", account: "right-hand", groqRequest: request }, async () => {
      secondCalls += 1;
      return new Response("unexpected");
    })).rejects.toMatchObject({ code: "cooldown", provider: "groq" });
    expect(secondCalls).toBe(0);
  });

  it("honors the provider token-reset header across Groq role credentials after a token 429", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-13T10:00:00.000Z"));
    process.env.APEX_GROQ_TPM_BUDGET = "4000";
    process.env.APEX_GROQ_TPM_WINDOW_MS = "60000";
    process.env.APEX_GROQ_TPM_MAX_WAIT_MS = "10000";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";
    const groqRequest = { model: "openai/gpt-oss-20b", reservedTokens: 1_000 };
    const firstBody = JSON.stringify({ error: { type: "tokens" } });
    const firstResponse = new Response(firstBody, {
      status: 429,
      headers: { "x-ratelimit-reset-tokens": "10s" },
    });
    const first = await withProviderRetryOwnership("groq", "caller", () =>
      runProviderCall({ provider: "groq", account: "investigator", groqRequest }, async () => firstResponse),
    );
    reconcileGroqTokenResponse(firstResponse, firstBody);
    expect(first.status).toBe(429);
    let calls = 0;
    const pending = withProviderRetryOwnership("groq", "caller", () =>
      runProviderCall({ provider: "groq", account: "right-hand", groqRequest }, async () => {
        calls += 1;
        return new Response(JSON.stringify({ usage: { total_tokens: 500 } }), { status: 200 });
      }),
    );
    await vi.advanceTimersByTimeAsync(9_999);
    expect(calls).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    const second = await pending;
    expect(second.status).toBe(200);
    expect(calls).toBe(1);
  });

  it("preserves provider token-reset windows longer than the generic retry-after cap", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-13T10:00:00.000Z"));
    process.env.APEX_GROQ_TPM_BUDGET = "4000";
    process.env.APEX_GROQ_TPM_MAX_WAIT_MS = "0";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE = "100";
    const request = { model: "openai/gpt-oss-20b", reservedTokens: 1_000 };
    const resetBody = JSON.stringify({ error: { type: "tokens" } });
    const resetResponse = new Response(resetBody, {
      status: 429,
      headers: { "x-ratelimit-reset-tokens": "1h" },
    });
    await runProviderCall({ provider: "groq", account: "long-reset", groqRequest: request }, async () => resetResponse);
    reconcileGroqTokenResponse(resetResponse, resetBody);
    let blocked: unknown;
    try {
      await runProviderCall({ provider: "groq", account: "another-role", groqRequest: request }, async () => new Response("unexpected"));
    } catch (error) {
      blocked = error;
    }
    expect(blocked).toBeInstanceOf(ProviderQuotaError);
    expect((blocked as ProviderQuotaError).code).toBe("cooldown");
    expect((blocked as ProviderQuotaError).retryAfterMs).toBeGreaterThan(300_000);
  });

});
