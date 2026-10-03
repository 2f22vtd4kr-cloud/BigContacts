import { afterEach, describe, expect, it, vi } from "vitest";

import { runAgenticWebResearch, INVESTIGATOR_LLM_CAPABILITY_POOL } from "../lib/agentic-web-research-core";
import { resetProviderGateForTests } from "../lib/provider-gate";

describe("Groq Investigator provider boundary", () => {
  afterEach(() => {
    delete process.env.GROQ_INVESTIGATOR_API_KEY;
    delete process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ;
    resetProviderGateForTests();
    vi.restoreAllMocks();
  });

  it("exposes only the Groq Investigator capability", () => {
    expect(INVESTIGATOR_LLM_CAPABILITY_POOL).toEqual(["groq"]);
  });

  it("owns a transient Groq 429 retry at the Investigator caller boundary", async () => {
    process.env.GROQ_INVESTIGATOR_API_KEY = "test-groq-investigator-key";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    let calls = 0;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify({ error: { type: "rate_limit_exceeded" } }), {
          status: 429,
          headers: {
            "retry-after": "0",
            "x-ratelimit-remaining-requests": "999",
          },
        });
      }
      const body = JSON.parse(String(init?.body ?? "{}")) as { model?: string };
      expect(body.model).toBe("qwen/qwen3.8-27b");
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ action: "done", query: null, provider: null, url: null, email: null, username: null, domain: null, registry: null, thought: "done", hypothesis: null, purpose: null, expectedInformationGain: 0, searches: [], findings: [] }) } }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    });

    const result = await runAgenticWebResearch({
      targetName: "Example",
      investigatorLlm: "groq",
      maxIterations: 1,
      hardTimeoutMs: 30_000,
    });

    expect(result.status).toBe("completed");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not rotate through the same role keys after an authoritative request-quota 429", async () => {
    process.env.GROQ_INVESTIGATOR_API_KEY = "test-groq-investigator-key";
    process.env.GROQ_INVESTIGATOR_API_KEY_1 = "test-groq-investigator-key-1";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    let calls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      calls += 1;
      return new Response(JSON.stringify({ error: { type: "rate_limit_exceeded" } }), {
        status: 429,
        headers: {
          "retry-after": "60",
          "x-ratelimit-remaining-requests": "0",
        },
      });
    });

    const result = await runAgenticWebResearch({
      targetName: "Example",
      investigatorLlm: "groq",
      maxIterations: 1,
      hardTimeoutMs: 30_000,
    });

    expect(result.status).toBe("unavailable");
    expect(calls).toBe(1);
  });

  it("uses the Qwen 3.8 primary routing model without provider fallback", async () => {
    process.env.GROQ_INVESTIGATOR_API_KEY = "test-groq-investigator-key";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { model?: string };
      expect(body.model).toBe("qwen/qwen3.8-27b");
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ action: "done", query: null, provider: null, url: null, email: null, username: null, domain: null, registry: null, thought: "done", hypothesis: null, purpose: null, expectedInformationGain: 0, searches: [], findings: [] }) } }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    });

    const result = await runAgenticWebResearch({
      targetName: "Example",
      investigatorLlm: "groq",
      maxIterations: 1,
      hardTimeoutMs: 30_000,
    });

    expect(result.status).toBe("completed");
    expect(result.model).toBe("qwen/qwen3.8-27b");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
