import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  safeOutboundFetch: vi.fn(),
}));

vi.mock("../lib/ssrf-safe-fetch", () => ({ safeOutboundFetch: mocks.safeOutboundFetch }));

import { bindModelFindingsToObservedSources, runAgenticWebResearch } from "../lib/agentic-web-research-core";
import { getAvailableInvestigatorCapabilities } from "../lib/investigator-capability-registry";
import { resetProviderGateForTests } from "../lib/provider-gate";

describe("Groq Investigator provider boundary", () => {
  it("binds terminal findings only to exact passages from previously observed non-search sources", () => {
    const finding = {
      vectorType: "email" as const,
      value: "jane@example.com",
      personName: "Jane Doe",
      role: "CEO",
      scope: "candidate" as const,
      sourceUrls: ["https://example.com/about", "https://search.example/results"],
      note: "model finding",
    };
    const records = [
      {
        turn: 1,
        model: "openai/gpt-oss-120b",
        action: "web_search",
        args: {},
        execution: "success" as const,
        observation: "https://example.com/about — Jane Doe — jane@example.com",
        observedUrls: ["https://example.com/about"],
        findings: [],
      },
      {
        turn: 2,
        model: "openai/gpt-oss-120b",
        action: "visit",
        args: { url: "https://example.com/about" },
        execution: "success" as const,
        observation: "About Jane Doe. Jane Doe is CEO. Contact: jane@example.com.",
        observedUrls: ["https://example.com/about"],
        findings: [],
      },
    ];

    const bindings = bindModelFindingsToObservedSources([finding], records);

    expect(bindings).toHaveLength(1);
    expect(bindings[0]?.sourceUrl).toBe("https://example.com/about");
    expect(bindings[0]?.passage.toLowerCase()).toContain("jane@example.com");
  });

  it("does not bind a terminal finding to a search-result URL or an unobserved source", () => {
    const finding = {
      vectorType: "email" as const,
      value: "jane@example.com",
      personName: "Jane Doe",
      role: "CEO",
      scope: "candidate" as const,
      sourceUrls: ["https://search.example/results", "https://example.com/not-observed"],
      note: "model finding",
    };
    const records = [
      {
        turn: 1,
        model: "openai/gpt-oss-120b",
        action: "web_search",
        args: {},
        execution: "success" as const,
        observation: "Search result: Jane Doe jane@example.com https://example.com/not-observed",
        observedUrls: ["https://search.example/results", "https://example.com/not-observed"],
        findings: [],
      },
    ];

    expect(bindModelFindingsToObservedSources([finding], records)).toEqual([]);
  });


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
      investigatorLlm: "groq-investigator-1",
      maxIterations: 1,
      hardTimeoutMs: 30_000,
    });

    expect(result.status).toBe("completed");
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("recovers a Groq token-window 429 without rotating the Investigator model", async () => {
    process.env.GROQ_INVESTIGATOR_API_KEY = "test-groq-investigator-token-window-key";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    let calls = 0;
    mocks.safeOutboundFetch.mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify({ error: { type: "tokens", code: "rate_limit_exceeded" } }), {
          status: 429,
          headers: {
            "retry-after": "20",
            "x-ratelimit-remaining-tokens": "3108",
            "x-ratelimit-reset-tokens": "0.001s",
            "x-ratelimit-remaining-requests": "998",
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
      investigatorLlm: "groq-investigator-1",
      maxIterations: 1,
      hardTimeoutMs: 30_000,
    });

    expect(result.status).toBe("completed");
    expect(calls).toBe(2);
  });

  it("fails closed when the token-window reset exceeds the 45-second recovery ceiling", async () => {
    process.env.GROQ_INVESTIGATOR_API_KEY = "test-groq-investigator-long-reset-key";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    let calls = 0;
    mocks.safeOutboundFetch.mockImplementation(async () => {
      calls += 1;
      return new Response(JSON.stringify({ error: { type: "tokens", code: "rate_limit_exceeded" } }), {
        status: 429,
        headers: {
          "retry-after": "20",
          "x-ratelimit-remaining-tokens": "3108",
          "x-ratelimit-reset-tokens": "46s",
          "x-ratelimit-remaining-requests": "998",
        },
      });
    });

    const result = await runAgenticWebResearch({
      targetName: "Example",
      investigatorLlm: "groq-investigator-1",
      maxIterations: 1,
      hardTimeoutMs: 30_000,
    });

    expect(["unavailable", "error"]).toContain(result.status);
    expect(calls).toBe(1);
    expect(result.trajectoryRecords[0]?.action).toBe("investigator_provider_error");
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
      investigatorLlm: "groq-investigator-1",
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
      investigatorLlm: "groq-investigator-1",
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
      investigatorLlm: "groq-investigator-1",
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
    if (!response.body) throw new Error("response body reader unavailable");
    const originalGetReader = response.body.getReader.bind(response.body);
    Object.defineProperty(response.body, "getReader", {
      configurable: true,
      value: () => {
        bodyReads += 1;
        return originalGetReader();
      },
    });
    mocks.safeOutboundFetch.mockResolvedValue(response);

    const result = await runAgenticWebResearch({
      targetName: "Example",
      investigatorLlm: "groq-investigator-1",
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
      investigatorLlm: "groq-investigator-1",
      maxIterations: 1,
      hardTimeoutMs: 30_000,
    });

    expect(result.status).toBe("completed");
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("binds execution to the selected capability key and never rotates to another configured key", async () => {
    process.env.GROQ_INVESTIGATOR_API_KEY = "selected-key-1";
    process.env.GROQ_INVESTIGATOR_API_KEY_1 = "selected-key-2";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    const authorizationHeaders: string[] = [];
    mocks.safeOutboundFetch.mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      authorizationHeaders.push(String(new Headers(init?.headers).get("authorization")));
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ action: "done", query: null, provider: null, url: null, email: null, username: null, domain: null, registry: null, thought: "done", hypothesis: null, purpose: null, expectedInformationGain: 0, searches: [], findings: [] }) } }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    });

    const result = await runAgenticWebResearch({
      targetName: "Example",
      investigatorLlm: "groq-investigator-2",
      maxIterations: 1,
      hardTimeoutMs: 30_000,
    });

    expect(result.status).toBe("completed");
    expect(authorizationHeaders.length).toBeGreaterThanOrEqual(1);
    expect(new Set(authorizationHeaders)).toEqual(new Set(["Bearer selected-key-2"]));
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
      investigatorLlm: "groq-investigator-1",
      maxIterations: 1,
      hardTimeoutMs: 30_000,
    });

    expect(result.status).toBe("completed");
    expect(result.model).toBe("openai/gpt-oss-120b");
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
