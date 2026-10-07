import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GROQ_RIGHT_HAND_FALLBACK_MODELS,
  GROQ_RIGHT_HAND_MODEL,
  getGroqRightHandStatus,
  runGroqRightHandFreeJson,
  runGroqRightHandDiscoveryAdvice,
  resetGroqRightHandRequestGateForTests,
} from "../lib/groq-right-hand-reasoning";
import { summarizeProviderBody } from "../lib/provider-error-diagnostics";
import { resetProviderGateForTests } from "../lib/provider-gate";

describe("Groq Right-hand model policy", () => {
  afterEach(() => {
    resetGroqRightHandRequestGateForTests();
    resetProviderGateForTests();
    delete process.env.GROQ_RIGHT_HAND_API_KEY;
    delete process.env.GROQ_RIGHT_HAND_API_KEY_2;
    delete process.env.GROQ_RIGHT_HAND_API_KEY_3;
    delete process.env.GROQ_RIGHT_HAND_API_KEY_4;
    delete process.env.GROQ_RIGHT_HAND_API_KEY_5;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("uses canonical GPT-OSS 120B with bounded GPT-OSS 20B fallback", () => {
    expect(GROQ_RIGHT_HAND_MODEL).toBe("openai/gpt-oss-120b");
    expect(GROQ_RIGHT_HAND_FALLBACK_MODELS).toEqual(["openai/gpt-oss-20b"]);
    expect(GROQ_RIGHT_HAND_FALLBACK_MODELS).not.toContain("mistral-small-latest");
  });


  it("preserves Groq's documented top-level error fields without secrets", () => {
    const summary = summarizeProviderBody(JSON.stringify({
      object: "error",
      message: "Rate limit exceeded for model",
      type: "rate_limit_error",
      param: "model",
      code: "rate_limit_exceeded",
    }));

    expect(summary.errorType).toBe("rate_limit_error");
    expect(summary.errorParam).toBe("model");
    expect(summary.errorCode).toBe("rate_limit_exceeded");
    expect(summary.errorMessageDigest).toMatch(/^[a-f0-9]{16}$/);
    expect(summary).not.toHaveProperty("errorMessage");
  });

  it("uses the GPT-OSS reasoning contract without the retired reasoning_format field", async () => {
    vi.stubEnv("GROQ_RIGHT_HAND_API_KEY", "right-hand-request-shape-test-key");

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "https://api.groq.com/openai/v1/models") {
        return new Response(JSON.stringify({
          data: [{ id: "openai/gpt-oss-120b" }, { id: "openai/gpt-oss-20b" }],
        }), { status: 200 });
      }
      const body = JSON.parse(String(init?.body));
      expect(body.reasoning_effort).toBe("medium");
      expect(body.include_reasoning).toBe(false);
      expect(body).not.toHaveProperty("reasoning_format");
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"decision":"proceed"}' } }],
      }), { status: 200 });
    });

    const result = await runGroqRightHandFreeJson("Return a small JSON decision.");
    expect(result.status).toBe("completed");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("compacts an oversized discovery context before the 20K control-plane boundary", async () => {
    vi.stubEnv("GROQ_RIGHT_HAND_API_KEY", "right-hand-discovery-bounds-test-key");

    const huge = "x".repeat(12_000);
    const reports = Array.from({ length: 6 }, (_, index) => ({
      id: `report-${index}`,
      lane: `lane-${index}`,
      provider: "groq",
      status: "success",
      iteration: index,
      summary: huge,
      findings: [huge, huge],
      candidateNames: ["Candidate", huge],
      sourceUrls: [`https://example.com/${huge}`],
      nextQuestions: [huge],
      error: null,
    }));

    const discoveryFile = {
      humanBrief: { objective: "Find relevant public-record targets", motivation: huge, geography: huge, exclusions: [huge] },
      bossPremise: huge,
      investigationRules: [huge],
      candidateLanes: [huge],
      initialResearch: { status: "complete", researchResponse: huge, bossCommentary: huge, sourceUrls: [`https://example.com/${huge}`] },
      investigatorReports: reports,
      currentProgress: { reportCount: 6, completedLanes: ["lane-0"], openQuestions: [huge], lastReviewedBy: "groq_boss" },
      discoveredCandidates: Array.from({ length: 12 }, (_, index) => ({ name: `Candidate ${index}`, type: "person", relevance: huge, reachability: huge, sourceUrls: [`https://example.com/${huge}`], state: "candidate" })),
      orgFootprint: { description: huge, known: true, note: huge },
      decisionLog: Array.from({ length: 8 }, (_, index) => ({ iteration: index, decision: huge, reason: huge })),
    } as any;

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "https://api.groq.com/openai/v1/models") {
        return new Response(JSON.stringify({ data: [{ id: "openai/gpt-oss-120b" }] }), { status: 200 });
      }
      const body = JSON.parse(String(init?.body));
      const userPrompt = body.messages.find((message: { role: string }) => message.role === "user")?.content ?? "";
      expect(userPrompt.length).toBeLessThanOrEqual(20_000);
      expect(userPrompt).toContain("report-5");
      expect(body).not.toHaveProperty("reasoning_format");
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"decision":"continue","reason":"recent evidence","focusLanes":["lane-5"],"confidence":0.9}' } }],
      }), { status: 200 });
    });

    const result = await runGroqRightHandDiscoveryAdvice({ file: discoveryFile, iteration: 6 });
    expect(result.status).toBe("completed");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails closed on a hard 429 instead of rotating credentials", async () => {
    vi.stubEnv("GROQ_RIGHT_HAND_API_KEY", "right-hand-primary-key");
    vi.stubEnv("GROQ_RIGHT_HAND_API_KEY_2", "right-hand-secondary-key");

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const auth = new Headers(init?.headers).get("authorization") ?? "";
      if (url === "https://api.groq.com/openai/v1/models") {
        return new Response(JSON.stringify({
          data: [{ id: "openai/gpt-oss-120b" }],
        }), { status: 200 });
      }
      if (auth.endsWith("right-hand-primary-key")) {
        return new Response(JSON.stringify({
          error: { code: "rate_limit_exceeded", message: "daily request limit" },
        }), {
          status: 429,
          headers: {
            "x-ratelimit-limit-requests": "100",
            "x-ratelimit-remaining-requests": "0",
          },
        });
      }
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"decision":"proceed"}' } }],
      }), { status: 200 });
    });

    const result = await runGroqRightHandFreeJson("Return a small JSON decision.");

    expect(result.status).toBe("completed");
    const chatCalls = fetchMock.mock.calls
      .filter(([input]) => String(input) === "https://api.groq.com/openai/v1/chat/completions");
    expect(chatCalls).toHaveLength(2);
    expect(new Headers(chatCalls[0]?.[1]?.headers).get("authorization")).toContain("right-hand-primary-key");
    expect(new Headers(chatCalls[1]?.[1]?.headers).get("authorization")).toContain("right-hand-secondary-key");
  });

  it("waits for a token-window reset on a hard 429 before giving up the model", async () => {
    vi.stubEnv("GROQ_RIGHT_HAND_API_KEY", "right-hand-token-window-test-key");

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "https://api.groq.com/openai/v1/models") {
        return new Response(JSON.stringify({
          data: [{ id: "openai/gpt-oss-120b" }],
        }), { status: 200 });
      }
      const calls = fetchMock.mock.calls.filter(([callInput]) => String(callInput) === "https://api.groq.com/openai/v1/chat/completions").length;
      if (calls === 1) {
        return new Response(JSON.stringify({
          error: { type: "rate_limit_error", code: "rate_limit_exceeded", message: "token rate limit" },
        }), {
          status: 429,
          headers: {
            "x-ratelimit-remaining-requests": "999",
            "x-ratelimit-remaining-tokens": "0",
            "x-ratelimit-reset-tokens": "0.001s",
          },
        });
      }
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"decision":"proceed","reason":"token window reset","direction":null,"confidence":0.9}' } }],
      }), { status: 200 });
    });

    const result = await runGroqRightHandFreeJson("Return a small JSON decision.", "Reply with ONE JSON object only.");
    expect(result.status).toBe("completed");
    const chatCalls = fetchMock.mock.calls.filter(([input]) => String(input) === "https://api.groq.com/openai/v1/chat/completions");
    expect(chatCalls).toHaveLength(2);
  });

  it("recovers from a token-window 429 identified by the error body even when remaining tokens are nonzero", async () => {
    vi.stubEnv("GROQ_RIGHT_HAND_API_KEY", "right-hand-token-body-type-test-key");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === "https://api.groq.com/openai/v1/models") {
        return new Response(JSON.stringify({
          data: [{ id: "openai/gpt-oss-120b" }],
        }), { status: 200 });
      }
      const chatCalls = fetchMock.mock.calls
        .filter(([callInput]) => String(callInput) === "https://api.groq.com/openai/v1/chat/completions").length;
      if (chatCalls === 1) {
        return new Response(JSON.stringify({
          error: {
            type: "tokens",
            code: "rate_limit_exceeded",
            message: "token rate limit",
          },
        }), {
          status: 429,
          headers: {
            "x-ratelimit-limit-tokens": "8000",
            "x-ratelimit-remaining-tokens": "3108",
            "x-ratelimit-reset-tokens": "0.001s",
            "x-ratelimit-remaining-requests": "998",
            "retry-after": "20",
          },
        });
      }
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"decision":"proceed"}' } }],
      }), { status: 200 });
    });

    const result = await runGroqRightHandFreeJson("Return a small JSON decision.");

    expect(result.status).toBe("completed");
    const chatCalls = fetchMock.mock.calls
      .filter(([input]) => String(input) === "https://api.groq.com/openai/v1/chat/completions");
    expect(chatCalls).toHaveLength(2);
  });

  it("recovers from a 54.547-second token-window reset within the bounded wait and overall deadline", async () => {
    vi.stubEnv("GROQ_RIGHT_HAND_API_KEY", "right-hand-token-54547ms-test-key");
    vi.useFakeTimers();
    const timeoutSpy = vi.spyOn(globalThis, "setTimeout");

    let chatCalls = 0;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === "https://api.groq.com/openai/v1/models") {
        return new Response(JSON.stringify({ data: [{ id: "openai/gpt-oss-120b" }] }), { status: 200 });
      }
      chatCalls += 1;
      if (chatCalls === 1) {
        return new Response(JSON.stringify({
          error: { type: "tokens", code: "rate_limit_exceeded", message: "token rate limit" },
        }), {
          status: 429,
          headers: {
            "x-ratelimit-remaining-tokens": "727",
            "x-ratelimit-reset-tokens": "54.547s",
            "x-ratelimit-remaining-requests": "996",
            "retry-after": "38",
          },
        });
      }
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"decision":"proceed"}' } }],
      }), { status: 200 });
    });

    const pending = runGroqRightHandFreeJson("Return a small JSON decision.");
    await Promise.resolve();
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(result.status).toBe("completed");
    expect(chatCalls).toBe(2);
    expect(timeoutSpy.mock.calls.some(([, delay]) => delay === 54_547)).toBe(true);
    expect(fetchMock.mock.calls.filter(([input]) => String(input) === "https://api.groq.com/openai/v1/chat/completions")).toHaveLength(2);
  });

  it("does not wait or rotate when a token-window reset exceeds the bounded recovery wait", async () => {
    vi.stubEnv("GROQ_RIGHT_HAND_API_KEY", "right-hand-token-long-reset-test-key");

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === "https://api.groq.com/openai/v1/models") {
        return new Response(JSON.stringify({ data: [{ id: "openai/gpt-oss-120b" }] }), { status: 200 });
      }
      return new Response(JSON.stringify({
        error: { type: "tokens", code: "rate_limit_exceeded", message: "token rate limit" },
      }), {
        status: 429,
        headers: {
          "x-ratelimit-remaining-tokens": "3108",
          "x-ratelimit-reset-tokens": "61s",
          "x-ratelimit-remaining-requests": "998",
          "retry-after": "20",
        },
      });
    });

    const result = await runGroqRightHandFreeJson("Return a small JSON decision.");

    expect(result.status).toBe("unavailable");
    expect(result.error).toContain('"rateLimitKind":"tokens"');
    const chatCalls = fetchMock.mock.calls.filter(([input]) => String(input) === "https://api.groq.com/openai/v1/chat/completions");
    expect(chatCalls).toHaveLength(1);
  });

  it("fails closed on a hard model 429 instead of advancing to another model", async () => {
    vi.useFakeTimers();
    vi.stubEnv("GROQ_RIGHT_HAND_API_KEY", "right-hand-fallback-test-key");

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "https://api.groq.com/openai/v1/models") {
        return new Response(JSON.stringify({
          data: [
            { id: "openai/gpt-oss-120b" },
            { id: "openai/gpt-oss-20b" },
            { id: "openai/gpt-oss-20b" },
            { id: "openai/gpt-oss-20b" },
          ],
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      const body = JSON.parse(String(init?.body));
      if (body.model === "openai/gpt-oss-120b") {
        return new Response(JSON.stringify({
          object: "error",
          message: "rate limit exceeded",
          type: "rate_limit_error",
          param: "model",
          code: "rate_limit_exceeded",
        }), {
          status: 429,
          headers: {
            "content-type": "application/json",
            "x-ratelimit-limit-requests": "1000",
            "x-ratelimit-remaining-requests": "0",
          },
        });
      }

      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"decision":"proceed"}' } }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    });

    const pending = runGroqRightHandFreeJson("Return a small JSON decision.");
    await Promise.resolve();
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(result.status).toBe("completed");
    expect(result.model).toBe("openai/gpt-oss-20b");
    const chatModels = fetchMock.mock.calls
      .filter(([input]) => String(input) === "https://api.groq.com/openai/v1/chat/completions")
      .map(([, init]) => JSON.parse(String(init?.body)).model);
    expect(chatModels).toEqual(["openai/gpt-oss-120b", "openai/gpt-oss-20b"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries a transient 429 before falling back to another model", { timeout: 15_000 }, async () => {
    vi.stubEnv("GROQ_RIGHT_HAND_API_KEY", "right-hand-transient-retry-test-key");

    let chatAttemptCount = 0;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "https://api.groq.com/openai/v1/models") {
        return new Response(JSON.stringify({
          data: [{ id: "openai/gpt-oss-120b" }, { id: "openai/gpt-oss-20b" }],
        }), { status: 200 });
      }
      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe("openai/gpt-oss-120b");
      chatAttemptCount += 1;
      if (chatAttemptCount === 1) {
        return new Response(JSON.stringify({
          error: { code: "rate_limit_exceeded", message: "short burst limit" },
        }), {
          status: 429,
          headers: {
            "retry-after": "0",
            "x-ratelimit-limit-requests": "1000",
            "x-ratelimit-remaining-requests": "999",
          },
        });
      }
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"decision":"proceed"}' } }],
      }), { status: 200 });
    });

    const result = await runGroqRightHandFreeJson("Return a small JSON decision.");

    const chatCalls = fetchMock.mock.calls.filter(([input]) => String(input) === "https://api.groq.com/openai/v1/chat/completions");
    expect(result.status).toBe("completed");
    expect(result.model).toBe("openai/gpt-oss-120b");
    expect(chatCalls).toHaveLength(2);
  });

  it("retries a strict JSON schema rejection in JSON-object mode", { timeout: 15_000 }, async () => {
    vi.stubEnv("GROQ_RIGHT_HAND_API_KEY", "right-hand-json-compatibility-test-key");
    const formats: string[] = [];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (String(input) === "https://api.groq.com/openai/v1/models") {
        return new Response(JSON.stringify({ data: [{ id: "openai/gpt-oss-120b" }] }), { status: 200 });
      }
      const body = JSON.parse(String(init?.body));
      formats.push(body.response_format?.type);
      if (body.response_format?.type === "json_schema") {
        return new Response(JSON.stringify({
          error: { code: "json_validate_failed", message: "Structured output validation failed." },
        }), { status: 400 });
      }
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"decision":"proceed"}' } }],
      }), { status: 200 });
    });

    const result = await runGroqRightHandFreeJson(
      "Return a small JSON decision.",
      "Return one JSON object.",
      {
        schema: {
          type: "object",
          properties: { decision: { type: "string" } },
          required: ["decision"],
          additionalProperties: false,
        },
      },
    );

    expect(result.status).toBe("completed");
    expect(formats).toEqual(["json_schema", "json_object"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });



  it("isolates model-catalog caches for credentials that collide under the legacy 32-bit fingerprint", { timeout: 15_000 }, async () => {
    vi.stubEnv("GROQ_RIGHT_HAND_API_KEY", "Aa");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const auth = new Headers(init?.headers).get("authorization") ?? "";
      if (url === "https://api.groq.com/openai/v1/models") {
        return new Response(JSON.stringify({
          data: auth.endsWith("Aa") ? [{ id: "openai/gpt-oss-120b" }] : [{ id: "openai/gpt-oss-20b" }],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"decision":"proceed"}' } }],
      }), { status: 200 });
    });

    const first = await runGroqRightHandFreeJson("Return a small JSON decision.");
    expect(first.status).toBe("completed");
    expect(first.model).toBe("openai/gpt-oss-120b");

    vi.stubEnv("GROQ_RIGHT_HAND_API_KEY", "BB");
    const second = await runGroqRightHandFreeJson("Return a small JSON decision.");
    expect(second.status).toBe("completed");
    expect(second.model).toBe("openai/gpt-oss-20b");

    const catalogCalls = fetchMock.mock.calls.filter(([input]) => String(input) === "https://api.groq.com/openai/v1/models");
    expect(catalogCalls).toHaveLength(2);
  });


  it("reports the fallback chain without exposing credentials", () => {
    process.env.GROQ_RIGHT_HAND_API_KEY = "test-groq-right-hand-key";
    const status = getGroqRightHandStatus();

    expect(status.configured).toBe(true);
    expect(status.model).toBe("openai/gpt-oss-120b");
    expect(status.fallbackModels).toEqual(["openai/gpt-oss-20b"]);
    expect(JSON.stringify(status)).not.toContain("test-groq-right-hand-key");
  });
});
