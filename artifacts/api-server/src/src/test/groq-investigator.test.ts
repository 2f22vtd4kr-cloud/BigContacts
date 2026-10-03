import { afterEach, describe, expect, it, vi } from "vitest";

import { runAgenticWebResearch, INVESTIGATOR_LLM_CAPABILITY_POOL } from "../lib/agentic-web-research-core";

describe("Groq Investigator provider boundary", () => {
  afterEach(() => {
    delete process.env.GROQ_INVESTIGATOR_API_KEY;
    delete process.env.GROQ_INVESTIGATOR_API_KEY_1;
    delete process.env.GROQ_INVESTIGATOR_API_KEY_2;
    delete process.env.GROQ_INVESTIGATOR_API_KEY_3;
    delete process.env.GROQ_INVESTIGATOR_API_KEY_4;
    delete process.env.GROQ_INVESTIGATOR_API_KEY_5;
    vi.restoreAllMocks();
  });

  it("exposes only the Groq Investigator capability", () => {
    expect(INVESTIGATOR_LLM_CAPABILITY_POOL).toEqual(["groq"]);
  });

  it("uses the Qwen 3.8 primary routing model without provider fallback", async () => {
    process.env.GROQ_INVESTIGATOR_API_KEY = "test-groq-investigator-key";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      expect(body.model).toBe("qwen/qwen3.8-27b");
      expect(body.reasoning_format).toBe("hidden");
      expect(body).not.toHaveProperty("include_reasoning");
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

  it("uses the GPT-OSS reasoning contract for hard Investigator tasks", async () => {
    process.env.GROQ_INVESTIGATOR_API_KEY = "test-groq-investigator-key";
    const calls: Array<{ model: string; body: Record<string, unknown> }> = [];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      calls.push({ model: String(body.model), body });
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ action: "done", query: null, provider: null, url: null, email: null, username: null, domain: null, registry: null, thought: "done", hypothesis: null, purpose: null, expectedInformationGain: 0, searches: [], findings: [] }) } }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    });

    const result = await runAgenticWebResearch({
      targetName: "Example",
      investigatorLlm: "groq",
      maxIterations: 1,
      hardTimeoutMs: 30_000,
      cognitiveTask: "identity_resolution",
    });

    expect(result.status).toBe("completed");
    expect(calls.map((call) => call.model)).toEqual(["openai/gpt-oss-120b"]);
    expect(calls[0]?.body).toMatchObject({ reasoning_effort: "medium", include_reasoning: false });
    expect(calls[0]?.body).not.toHaveProperty("reasoning_format");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("accepts an Investigator backup key without requiring the base key", async () => {
    process.env.GROQ_INVESTIGATOR_API_KEY_1 = "test-groq-investigator-backup-key";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      expect(body.model).toBe("qwen/qwen3.8-27b");
      expect(body.reasoning_format).toBe("hidden");
      expect(body).not.toHaveProperty("include_reasoning");
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
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
