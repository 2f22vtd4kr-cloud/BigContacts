import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GROQ_BOSS_MODEL,
  generateGroqBossText,
  resolveGroqBossModel,
} from "../src/lib/groq-boss";

describe("Groq Boss control-plane adapter", () => {
  const originalKey = process.env.GROQ_BOSS_API_KEY;

  beforeEach(() => {
    for (let i = 1; i <= 10; i += 1) delete process.env[`GROQ_BOSS_API_KEY_${i}`];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalKey === undefined) delete process.env.GROQ_BOSS_API_KEY;
    else process.env.GROQ_BOSS_API_KEY = originalKey;
    for (let i = 1; i <= 10; i += 1) delete process.env[`GROQ_BOSS_API_KEY_${i}`];
  });

  it("does not consume the generic GROQ_API_KEY Investigator credential", async () => {
    const bossKey = process.env.GROQ_BOSS_API_KEY;
    const investigatorKey = process.env.GROQ_API_KEY;
    delete process.env.GROQ_BOSS_API_KEY;
    process.env.GROQ_API_KEY = "investigator-only-key";
    const result = await resolveGroqBossModel();
    expect(result.status).toBe("pending");
    if (bossKey === undefined) delete process.env.GROQ_BOSS_API_KEY;
    else process.env.GROQ_BOSS_API_KEY = bossKey;
    if (investigatorKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = investigatorKey;
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
    expect(result.attempts).toEqual([{
      model: GROQ_BOSS_MODEL,
      keyName: "GROQ_BOSS_API_KEY",
      httpStatus: 503,
      providerErrorCode: null,
      failureClass: "provider_unavailable",
    }]);
  });

  it("classifies malformed successful HTTP bodies as invalid responses, not network failures", async () => {
    process.env.GROQ_BOSS_API_KEY = "test-groq-key";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not-json", { status: 200, headers: { "content-type": "application/json" } }),
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
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.attempts).toEqual([
      {
        model: GROQ_BOSS_MODEL,
        keyName: "GROQ_BOSS_API_KEY",
        httpStatus: 200,
        providerErrorCode: null,
        failureClass: "invalid_response",
      },
      {
        model: "openai/gpt-oss-20b",
        keyName: "GROQ_BOSS_API_KEY",
        httpStatus: 200,
        providerErrorCode: null,
        failureClass: "invalid_response",
      },
    ]);
    expect(result.attempts.some((attempt) => attempt.failureClass === "network_error")).toBe(false);
    expect(result.error).toContain("[invalid_response]");
  });

  it("retries strict schema rejection once in JSON-object mode on the same model", async () => {
    process.env.GROQ_BOSS_API_KEY = "test-groq-key";
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "json_validate_failed" } }), { status: 400 }))
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
    }, "Return JSON.", {
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
      maxOutputTokens: 128,
      thinkingLevel: "low",
    });

    expect(result.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(firstBody.response_format.type).toBe("json_schema");
    expect(secondBody.response_format).toEqual({ type: "json_object" });
    expect(firstBody.model).toBe(GROQ_BOSS_MODEL);
    expect(secondBody.model).toBe(GROQ_BOSS_MODEL);
  });

  it("fails closed on a repeated transient 429 without rotating the Boss model", async () => {
    process.env.GROQ_BOSS_API_KEY = "test-groq-key";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ error: { code: "rate_limit_exceeded" } }), {
        status: 429,
        headers: { "content-type": "application/json", "retry-after": "0", "x-ratelimit-remaining-requests": "999" },
      }),
    );

    const result = await generateGroqBossText({
      model: GROQ_BOSS_MODEL,
      status: "resolved",
      inspectedKeyCount: 1,
      candidateCount: 2,
      candidateModels: [GROQ_BOSS_MODEL, "openai/gpt-oss-20b"],
      keyName: "GROQ_BOSS_API_KEY",
    }, "Return JSON.", { maxOutputTokens: 128, thinkingLevel: "low" });

    expect(result.raw).toBeNull();
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts.filter((attempt) => attempt.model === GROQ_BOSS_MODEL)).toHaveLength(2);
    expect(result.attempts.some((attempt) => attempt.model === "openai/gpt-oss-20b")).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails closed on a request-level 400 without rotating models", async () => {
    process.env.GROQ_BOSS_API_KEY = "test-groq-key";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "invalid_request_error" } }), { status: 400 }),
    );

    const result = await generateGroqBossText({
      model: GROQ_BOSS_MODEL,
      status: "resolved",
      inspectedKeyCount: 1,
      candidateCount: 2,
      candidateModels: [GROQ_BOSS_MODEL, "openai/gpt-oss-20b"],
      keyName: "GROQ_BOSS_API_KEY",
    }, "Return JSON.", { maxOutputTokens: 128, thinkingLevel: "low" });

    expect(result.raw).toBeNull();
    expect(result.attempts).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
    expect(result.error).toContain("upstream_rate_limited");
    expect(result.error).not.toContain("openai/gpt-oss-20b");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
