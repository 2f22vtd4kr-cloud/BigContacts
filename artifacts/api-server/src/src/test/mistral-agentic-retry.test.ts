import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/ssrf-safe-fetch", () => ({
  safeOutboundFetch: (input: string | URL, init?: RequestInit) => globalThis.fetch(input, init),
}));

import { runAgenticWebResearch } from "../lib/agentic-web-research-core";
import { resetProviderGateForTests } from "../lib/provider-gate";

describe("Mistral agentic 429 retry", () => {
  afterEach(() => {
    delete process.env.MISTRAL_API_KEY;
    delete process.env.MISTRAL_AGENTIC_MODEL;
    delete process.env.APEX_PROVIDER_MAX_REQUESTS_MISTRAL;
    delete process.env.APEX_PROVIDER_MIN_INTERVAL_MS_MISTRAL;
    vi.useRealTimers();
    vi.restoreAllMocks();
    resetProviderGateForTests();
  });

  it("retries after the shared provider-gate cooldown instead of terminating the role attempt", async () => {
    vi.useFakeTimers();
    process.env.MISTRAL_API_KEY = "test-mistral-key";
    process.env.MISTRAL_AGENTIC_MODEL = "mistral-small-2603";
    process.env.APEX_PROVIDER_MAX_REQUESTS_MISTRAL = "20";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_MISTRAL = "0";

    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      calls.push(url);
      if (url.endsWith("/v1/models")) {
        return new Response(JSON.stringify({
          object: "list",
          data: [{ id: "mistral-small-2603", created: 20, archived: false, capabilities: { completion_chat: true } }],
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (calls.length === 2) return new Response(JSON.stringify({ error: { type: "rate_limit_error" } }), { status: 429 });
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"action":"done","findings":[]}' } }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    }));

    const resultPromise = runAgenticWebResearch({
      targetName: "Example",
      investigatorLlm: "mistral",
      maxIterations: 1,
      hardTimeoutMs: 30_000,
    });

    await vi.advanceTimersByTimeAsync(20_000);
    const result = await resultPromise;

    expect(result.status).toBe("completed");
    expect(result.model).toBe("mistral:mistral-small-2603");
    expect(calls.filter((url) => url.endsWith("/v1/chat/completions"))).toHaveLength(2);
  });

  it("falls through to the next compatible model after a non-quota provider exception", async () => {
    process.env.MISTRAL_API_KEY = "test-mistral-key-2";
    process.env.MISTRAL_AGENTIC_MODEL = "";
    process.env.APEX_PROVIDER_MAX_REQUESTS_MISTRAL = "20";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_MISTRAL = "0";

    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(url);
      if (url.endsWith("/v1/models")) {
        return new Response(JSON.stringify({
          object: "list",
          data: [
            { id: "mistral-first", created: 20, archived: false, capabilities: { completion_chat: true } },
            { id: "mistral-second", created: 10, archived: false, capabilities: { completion_chat: true } },
          ],
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      const body = JSON.parse(String(init?.body ?? "{}")) as { model?: string };
      if (body.model === "mistral-first") throw new Error("simulated transport failure");
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"action":"done","findings":[]}' } }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    }));

    const result = await runAgenticWebResearch({
      targetName: "Example",
      investigatorLlm: "mistral",
      maxIterations: 1,
      hardTimeoutMs: 30_000,
    });

    expect(result.status).toBe("completed");
    expect(result.model).toBe("mistral:mistral-second");
    expect(calls.filter((url) => url.endsWith("/v1/chat/completions"))).toHaveLength(2);
  }, 15_000);
});