import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  safeOutboundFetch: vi.fn(),
}));

vi.mock("../lib/ssrf-safe-fetch", () => ({ safeOutboundFetch: mocks.safeOutboundFetch }));

import { runAgenticWebResearch, INVESTIGATOR_LLM_CAPABILITY_POOL } from "../lib/agentic-web-research-core";
import { resetProviderGateForTests } from "../lib/provider-gate";

describe("Groq Investigator provider boundary", () => {
  afterEach(() => {
    delete process.env.GROQ_INVESTIGATOR_API_KEY;
    delete process.env.GROQ_INVESTIGATOR_API_KEY_1;
    delete process.env.GROQ_INVESTIGATOR_API_KEY_2;
    delete process.env.GROQ_INVESTIGATOR_API_KEY_3;
    delete process.env.GROQ_INVESTIGATOR_API_KEY_4;
    delete process.env.GROQ_INVESTIGATOR_API_KEY_5;
    delete process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ;
    resetProviderGateForTests();
    mocks.safeOutboundFetch.mockReset();
    vi.restoreAllMocks();
  });

  it("exposes only the Groq Investigator capability", () => {
    expect(INVESTIGATOR_LLM_CAPABILITY_POOL).toEqual(["groq"]);
  });

  it("owns a transient Groq 429 retry at the Investigator caller boundary", async () => {
    process.env.GROQ_INVESTIGATOR_API_KEY = "test-groq-investigator-key";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    let calls = 0;
    const fetchMock = mocks.safeOutboundFetch.mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
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
      expect(body.model).toBe("openai/gpt-oss-120b");
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
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("does not rotate Investigator models after a transient 429 retry is exhausted", async () => {
    process.env.GROQ_INVESTIGATOR_API_KEY = "test-groq-investigator-key";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    let calls = 0;
    const models: string[] = [];
    mocks.safeOutboundFetch.mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls += 1;
      const body = JSON.parse(String(init?.body ?? "{}")) as { model?: string };
      models.push(String(body.model));
      return new Response(JSON.stringify({ error: { type: "rate_limit_exceeded" } }), {
        status: 429,
        headers: { "retry-after": "0", "x-ratelimit-remaining-requests": "999" },
      });
    });

    const result = await runAgenticWebResearch({
      targetName: "Example",
      investigatorLlm: "groq",
      maxIterations: 1,
      hardTimeoutMs: 30_000,
    });

    expect(["unavailable", "error"]).toContain(result.status);
    expect(calls).toBe(2);
    expect(new Set(models)).toEqual(new Set(["openai/gpt-oss-120b"]));
  });

  it("does not rotate through the same role keys after an authoritative request-quota 429", async () => {
    process.env.GROQ_INVESTIGATOR_API_KEY = "test-groq-investigator-key";
    process.env.GROQ_INVESTIGATOR_API_KEY_1 = "test-groq-investigator-key-1";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    let calls = 0;
    mocks.safeOutboundFetch.mockImplementation(async () => {
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

    expect(["unavailable", "error"]).toContain(result.status);
    expect(calls).toBe(1);
    expect(result.trajectoryRecords).toHaveLength(1);
  });

  it("retries the same model in JSON-object mode after Groq strict-schema rejection", async () => {
    process.env.GROQ_INVESTIGATOR_API_KEY = "test-groq-investigator-key";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    const responseFormats: unknown[] = [];
    let calls = 0;
    mocks.safeOutboundFetch.mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls += 1;
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      responseFormats.push(body.response_format);
      if (calls === 1) {
        return new Response(JSON.stringify({ error: { code: "json_validate_failed" } }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }
      expect(body.model).toBe("openai/gpt-oss-120b");
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
    expect(calls).toBe(2);
    expect(responseFormats[0]).toMatchObject({ type: "json_schema" });
    expect(responseFormats[1]).toEqual({ type: "json_object" });
  });

  it("reads a successful Groq response body exactly once", async () => {
    process.env.GROQ_INVESTIGATOR_API_KEY = "test-groq-investigator-key";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    let bodyReads = 0;
    const payload = JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ action: "done", query: null, provider: null, url: null, email: null, username: null, domain: null, registry: null, thought: "done", hypothesis: null, purpose: null, expectedInformationGain: 0, searches: [], findings: [] }) } }],
    });
    const response = new Response(payload, { status: 200, headers: { "content-type": "application/json" } });
    const readerFactory = response.body?.getReader.bind(response.body);
    if (!readerFactory || !response.body) throw new Error("response body reader unavailable");
    response.body.getReader = () => {
      bodyReads += 1;
      return readerFactory();
    };
    mocks.safeOutboundFetch.mockResolvedValue(response);

    const result = await runAgenticWebResearch({
      targetName: "Example",
      investigatorLlm: "groq",
      maxIterations: 1,
      hardTimeoutMs: 30_000,
    });

    expect(result.status).toBe("completed");
    expect(bodyReads).toBe(1);
  });

  it("accepts an Investigator backup key when the base slot is absent", async () => {
    process.env.GROQ_INVESTIGATOR_API_KEY_1 = "test-groq-investigator-backup-key";
    const fetchMock = mocks.safeOutboundFetch.mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      expect(body.model).toBe("openai/gpt-oss-120b");
      expect(body.include_reasoning).toBe(false);
      expect(body).not.toHaveProperty("reasoning_format");
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
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("uses the Qwen 3.8 primary routing model without provider fallback", async () => {
    process.env.GROQ_INVESTIGATOR_API_KEY = "test-groq-investigator-key";
    const fetchMock = mocks.safeOutboundFetch.mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { model?: string };
      expect(body.model).toBe("openai/gpt-oss-120b");
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
    expect(result.model).toBe("openai/gpt-oss-120b");
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
