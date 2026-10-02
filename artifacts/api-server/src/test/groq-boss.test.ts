import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GROQ_BOSS_MODEL,
  generateGroqBossText,
  resolveGroqBossModel,
} from "../src/lib/groq-boss";

describe("Groq Boss control-plane adapter", () => {
  const originalKey = process.env.GROQ_BOSS_API_KEY;

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalKey === undefined) delete process.env.GROQ_BOSS_API_KEY;
    else process.env.GROQ_BOSS_API_KEY = originalKey;
  });

  it("resolves the canonical GPT-OSS 120B Boss model from the Groq catalog", async () => {
    process.env.GROQ_BOSS_API_KEY = "test-groq-key";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        object: "list",
        data: [
          { id: GROQ_BOSS_MODEL },
          { id: "openai/gpt-oss-20b" },
        ],
      }), { status: 200, headers: { "content-type": "application/json" } }),
    );

    const result = await resolveGroqBossModel();
    expect(result.status).toBe("resolved");
    expect(result.model).toBe(GROQ_BOSS_MODEL);
    expect(result.candidateModels).toEqual([GROQ_BOSS_MODEL, "openai/gpt-oss-20b"]);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("https://api.groq.com/openai/v1/models");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test-groq-key");
  });

  it("sends strict JSON control output with GPT-OSS reasoning effort", async () => {
    process.env.GROQ_BOSS_API_KEY = "test-groq-key";
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: '{"actionId":"identity"}' } }],
      }), { status: 200, headers: { "content-type": "application/json" } }));

    const result = await generateGroqBossText({
      model: GROQ_BOSS_MODEL,
      status: "resolved",
      inspectedKeyCount: 1,
      candidateCount: 1,
      candidateModels: [GROQ_BOSS_MODEL],
      keyName: "GROQ_BOSS_API_KEY",
    }, "Return a JSON control decision.", {
      responseFormat: {
        type: "text",
        mime_type: "application/json",
        schema: {
          type: "object",
          properties: { actionId: { type: "string" } },
          required: ["actionId"],
          additionalProperties: false,
        },
      },
      maxOutputTokens: 512,
      thinkingLevel: "minimal",
    });

    expect(result.error).toBeNull();
    expect(result.raw).toBe('{"actionId":"identity"}');

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe(GROQ_BOSS_MODEL);
    expect(body.reasoning_effort).toBe("low");
    expect(body.include_reasoning).toBe(false);
    expect(body.response_format).toEqual({
      type: "json_schema",
      json_schema: {
        name: "apex_atlas_boss_control",
        strict: true,
        schema: {
          type: "object",
          properties: { actionId: { type: "string" } },
          required: ["actionId"],
          additionalProperties: false,
        },
      },
    });
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test-groq-key");
  });

  it("retries one transient 503 on the same model before accepting the response", async () => {
    process.env.GROQ_BOSS_API_KEY = "test-groq-key";
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { message: "temporarily unavailable", type: "server_error" },
      }), { status: 503, headers: { "content-type": "application/json", "retry-after": "0" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: '{"outcome":"proceed"}' } }],
      }), { status: 200, headers: { "content-type": "application/json" } }));

    const result = await generateGroqBossText({
      model: GROQ_BOSS_MODEL,
      status: "resolved",
      inspectedKeyCount: 1,
      candidateCount: 1,
      candidateModels: [GROQ_BOSS_MODEL],
      keyName: "GROQ_BOSS_API_KEY",
    }, "Return JSON.", { maxOutputTokens: 128, thinkingLevel: "low" });

    expect(result.error).toBeNull();
    expect(result.model).toBe(GROQ_BOSS_MODEL);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.attempts).toHaveLength(0);
  });

  it("fails closed when upstream context compaction still exceeds the Boss prompt budget", async () => {
    process.env.GROQ_BOSS_API_KEY = "test-groq-key";
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const result = await generateGroqBossText({
      model: GROQ_BOSS_MODEL,
      status: "resolved",
      inspectedKeyCount: 1,
      candidateCount: 1,
      candidateModels: [GROQ_BOSS_MODEL],
      keyName: "GROQ_BOSS_API_KEY",
    }, "x".repeat(20_001), { maxOutputTokens: 128, thinkingLevel: "low" });

    expect(result.raw).toBeNull();
    expect(result.error).toContain("upstream case-context compaction is required");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not spin on a long 429 retry window", async () => {
    process.env.GROQ_BOSS_API_KEY = "test-groq-key";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "rate limit" } }), {
        status: 429,
        headers: { "content-type": "application/json", "retry-after": "30" },
      }),
    );

    const result = await generateGroqBossText({
      model: GROQ_BOSS_MODEL,
      status: "resolved",
      inspectedKeyCount: 1,
      candidateCount: 1,
      candidateModels: [GROQ_BOSS_MODEL],
      keyName: "GROQ_BOSS_API_KEY",
    }, "Return JSON.", { maxOutputTokens: 128, thinkingLevel: "low" });

    expect(result.raw).toBeNull();
    expect(result.error).toContain("HTTP 429");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
