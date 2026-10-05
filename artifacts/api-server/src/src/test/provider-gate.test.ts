import { afterEach, describe, expect, it } from "vitest";
import {
  ProviderQuotaError,
  resetProviderGateForTests,
  runProviderCall,
  withProviderRetryOwnership,
  withProviderScope,
} from "../lib/provider-gate";

describe("provider quota gate", () => {
  afterEach(() => {
    delete process.env.APEX_PROVIDER_MAX_REQUESTS_GENERIC;
    delete process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GENERIC;
    delete process.env.APEX_PROVIDER_MAX_REQUESTS_GROQ;
    delete process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ;
    delete process.env.APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE;
    delete process.env.APEX_ATLAS_PROVIDER_MAX_REQUESTS_PER_SCOPE;
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

});
