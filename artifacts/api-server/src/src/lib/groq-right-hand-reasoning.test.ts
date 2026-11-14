import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resetGroqRightHandModelCatalogCacheForTests,
  resetGroqRightHandRequestGateForTests,
  runGroqRightHandFreeJson,
} from "./groq-right-hand-reasoning";
import { installExternalQuotaGuard, resetProviderGateForTests } from "./provider-gate";

const validDecision = {
  decision: "continue_discovery",
  reason: "An observed lead remains worth evaluating.",
  direction: null,
  confidence: 0.8,
};

const responseFormat = {
  type: "text",
  mime_type: "application/json",
  schema: {
    type: "object",
    properties: {
      decision: { type: "string", enum: ["continue_discovery", "research_candidate", "revisit_candidate", "pivot_discovery", "stop"] },
      reason: { type: "string", maxLength: 600 },
      direction: { type: ["string", "null"], maxLength: 600 },
      confidence: { type: "number" },
    },
    required: ["decision", "reason", "direction", "confidence"],
    additionalProperties: false,
  },
} as const;

const requestOptions = {
  maxCompletionTokens: 1_024,
  reasoningEffort: "low" as const,
  maxAttempts: 3,
  generationBudgetRecovery: {
    maxCompletionTokens: 1_280,
    reasoningEffort: "low" as const,
  },
};

function groqResponse(status: number, payload: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function generationBudgetFailure(): Response {
  return groqResponse(400, {
    error: {
      message: "Failed to generate JSON. Please adjust your prompt.",
      type: "invalid_request_error",
      code: "json_validate_failed",
      failed_generation: "max completion tokens reached before generating a valid document",
    },
  });
}

function isValidDecision(raw: string): boolean {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    return Object.keys(value).sort().join(",") === "confidence,decision,direction,reason"
      && ["continue_discovery", "research_candidate", "revisit_candidate", "pivot_discovery", "stop"].includes(String(value.decision))
      && typeof value.reason === "string" && value.reason.trim().length > 0 && value.reason.length <= 600
      && (value.direction === null || (typeof value.direction === "string" && value.direction.length <= 600))
      && typeof value.confidence === "number" && value.confidence >= 0 && value.confidence <= 1;
  } catch {
    return false;
  }
}

describe("Groq Right-hand task-scoped control recovery", () => {
  beforeEach(() => {
    vi.stubEnv("GROQ_RIGHT_HAND_API_KEY", "test-right-hand-key");
    vi.stubEnv("APEX_CAPTURE_MODEL_PROMPTS", "false");
    resetGroqRightHandModelCatalogCacheForTests();
    resetGroqRightHandRequestGateForTests();
    resetProviderGateForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    resetGroqRightHandModelCatalogCacheForTests();
    resetGroqRightHandRequestGateForTests();
  });

  it("uses a strict preferred model on the Right-hand credential lane without falling back to 120B", async () => {
    const chatBodies: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/models")) {
        return groqResponse(200, { data: [{ id: "openai/gpt-oss-120b" }, { id: "openai/gpt-oss-20b" }] });
      }
      chatBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return groqResponse(200, {
        choices: [{ message: { content: JSON.stringify(validDecision) } }],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await runGroqRightHandFreeJson(
      "Compact the supplied source-faithful memory.",
      "Perform only a non-authoritative memory text transformation.",
      responseFormat,
      isValidDecision,
      { jobId: "job-memory-compaction-model-test", caseId: 46, cognitiveTask: "context_compaction" },
      {
        maxCompletionTokens: 1_536,
        reasoningEffort: "low",
        maxAttempts: 1,
        preferredModel: "openai/gpt-oss-20b",
        allowModelFallback: false,
      },
    );

    expect(result.status).toBe("completed");
    expect(result.model).toBe("openai/gpt-oss-20b");
    expect(chatBodies).toHaveLength(1);
    expect(chatBodies[0].model).toBe("openai/gpt-oss-20b");
    const systemMessage = (chatBodies[0].messages as Array<{ role: string; content: string }>).find((message) => message.role === "system");
    expect(systemMessage?.content).toContain("APEX ATLAS MEMORY COMPACTION");
    expect(systemMessage?.content).toContain("non-authoritative transformation");
    expect(systemMessage?.content).not.toContain("DISCOVERY ECONOMY");
    expect(systemMessage?.content).not.toContain("APEX MISSION CONTRACT");
    const chatCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/chat/completions"));
    expect((chatCall?.[1]?.headers as Record<string, string>)?.Authorization).toBe("Bearer test-right-hand-key");
  });

  it("retains the full strategic Right-hand orientation outside memory compaction", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith("/models")) {
        return groqResponse(200, { data: [{ id: "openai/gpt-oss-120b" }] });
      }
      return groqResponse(200, {
        choices: [{ message: { content: JSON.stringify(validDecision) } }],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await runGroqRightHandFreeJson(
      "Review the current case state and advise whether the Investigator should continue.",
      "You are the Groq Right-hand Advisor. Review case state only; never browse.",
      responseFormat,
      isValidDecision,
      undefined,
      {
        maxCompletionTokens: 1_024,
        reasoningEffort: "low",
        maxAttempts: 1,
        preferredModel: "openai/gpt-oss-120b",
        allowModelFallback: false,
      },
    );

    expect(result.status).toBe("completed");
    const chatCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/chat/completions"));
    const body = JSON.parse(String(chatCall?.[1]?.body)) as { messages: Array<{ role: string; content: string }> };
    const systemMessage = body.messages.find((message) => message.role === "system");
    expect(systemMessage?.content).toContain("APEX MISSION CONTRACT");
    expect(systemMessage?.content).toContain("Investigator owns");
    expect(systemMessage?.content).toContain("DISCOVERY ECONOMY");
  });

  it("preserves local TPM exhaustion as a model-scoped token diagnostic", async () => {
    vi.stubEnv("APEX_GROQ_TPM_BUDGET", "1000");
    vi.stubEnv("APEX_PROVIDER_MIN_INTERVAL_MS_GROQ", "0");
    vi.stubEnv("APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE", "100");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/models")) {
        return groqResponse(200, { data: [{ id: "openai/gpt-oss-20b" }] });
      }
      throw new Error("the over-budget chat request must be rejected before transport");
    });
    vi.stubGlobal("fetch", fetchMock);
    resetProviderGateForTests();
    installExternalQuotaGuard();

    const result = await runGroqRightHandFreeJson(
      "Preserve the exact human objective, source URLs, observations, uncertainty, and prior actions. ".repeat(20),
      "Perform only a non-authoritative memory transformation.",
      responseFormat,
      isValidDecision,
      { jobId: "job-local-tpm-diagnostic", caseId: 47, cognitiveTask: "context_compaction" },
      {
        maxCompletionTokens: 1_536,
        reasoningEffort: "low",
        maxAttempts: 1,
        preferredModel: "openai/gpt-oss-20b",
        allowModelFallback: false,
      },
    );

    expect(result.status).toBe("unavailable");
    expect(result.error).toContain('"rateLimitKind":"tokens"');
    expect(result.error).toContain('"providerCode":"budget_exhausted"');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/models");
  });

  it("fails closed when the strict preferred Right-hand model is absent from the live catalog", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/models")) {
        return groqResponse(200, { data: [{ id: "openai/gpt-oss-120b" }] });
      }
      throw new Error("chat completion must not be attempted without the preferred model");
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await runGroqRightHandFreeJson(
      "Compact the supplied source-faithful memory.",
      "Perform only a non-authoritative memory text transformation.",
      responseFormat,
      isValidDecision,
      { jobId: "job-memory-compaction-model-unavailable-test", caseId: 47, cognitiveTask: "context_compaction" },
      {
        maxCompletionTokens: 1_536,
        reasoningEffort: "low",
        maxAttempts: 1,
        preferredModel: "openai/gpt-oss-20b",
        allowModelFallback: false,
      },
    );

    expect(result.status).toBe("unavailable");
    expect(result.error).toContain("no compatible configured model");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a documented completion-budget exhaustion with lower reasoning and a bounded larger output budget", async () => {
    const chatBodies: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/models")) {
        return groqResponse(200, { data: [{ id: "openai/gpt-oss-120b" }, { id: "openai/gpt-oss-20b" }] });
      }
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      chatBodies.push(body);
      if (chatBodies.length === 1) return generationBudgetFailure();
      return groqResponse(200, {
        choices: [{ message: { content: JSON.stringify(validDecision) } }],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await runGroqRightHandFreeJson(
      "Review the compact durable discovery state and advise the Boss.",
      "Return one short JSON control decision.",
      responseFormat,
      isValidDecision,
      { jobId: "job-control-budget-test", caseId: 41 },
      requestOptions,
    );

    expect(result.status).toBe("completed");
    expect(result.error).toBeNull();
    expect(result.raw).not.toBeNull();
    expect(isValidDecision(result.raw!)).toBe(true);
    expect(chatBodies).toHaveLength(2);
    expect(chatBodies[0].max_completion_tokens).toBe(1_024);
    expect(chatBodies[0].reasoning_effort).toBe("low");
    expect(chatBodies[0].response_format).toBeUndefined();
    expect(chatBodies[1].max_completion_tokens).toBe(1_280);
    expect(chatBodies[1].reasoning_effort).toBe("low");
    expect(chatBodies[1].response_format).toBeUndefined();
  });

  it("bounds total outbound attempts and returns unavailable when generation-budget recovery also fails", async () => {
    const chatBodies: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/models")) {
        return groqResponse(200, { data: [{ id: "openai/gpt-oss-120b" }, { id: "openai/gpt-oss-20b" }] });
      }
      chatBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return generationBudgetFailure();
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await runGroqRightHandFreeJson(
      "Review the compact durable discovery state and advise the Boss.",
      "Return one short JSON control decision.",
      responseFormat,
      isValidDecision,
      { jobId: "job-control-budget-fail-test", caseId: 42 },
      requestOptions,
    );

    expect(result.status).toBe("unavailable");
    expect(result.raw).toBeNull();
    expect(result.error).toContain("exhausted bounded attempts");
    expect(chatBodies.length).toBeGreaterThan(0);
    expect(chatBodies.length).toBeLessThanOrEqual(requestOptions.maxAttempts);
    expect(chatBodies.some((body) => body.max_completion_tokens === 1_280)).toBe(true);
  });

  it("does not raise the output budget for a generic structured-output rejection", async () => {
    const chatBodies: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/models")) {
        return groqResponse(200, { data: [{ id: "openai/gpt-oss-120b" }, { id: "openai/gpt-oss-20b" }] });
      }
      chatBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      if (chatBodies.length === 1) {
        return groqResponse(400, {
          error: {
            message: "Failed to validate JSON.",
            type: "invalid_request_error",
            code: "json_validate_failed",
            failed_generation: "The generated document did not satisfy the supplied schema.",
          },
        });
      }
      return groqResponse(200, {
        choices: [{ message: { content: JSON.stringify(validDecision) } }],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await runGroqRightHandFreeJson(
      "Review the compact durable discovery state and advise the Boss.",
      "Return one short JSON control decision.",
      responseFormat,
      isValidDecision,
      { jobId: "job-control-contract-test", caseId: 44 },
      requestOptions,
    );

    expect(result.status).toBe("completed");
    expect(chatBodies).toHaveLength(2);
    expect(chatBodies[0].max_completion_tokens).toBe(1_024);
    expect(chatBodies[1].max_completion_tokens).toBe(1_024);
    expect(chatBodies[1].response_format).toBeUndefined();
  });

  it("leaves unrelated Right-hand tasks on the existing default generation settings", async () => {
    const chatBodies: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/models")) {
        return groqResponse(200, { data: [{ id: "openai/gpt-oss-120b" }, { id: "openai/gpt-oss-20b" }] });
      }
      chatBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return groqResponse(200, {
        choices: [{ message: { content: JSON.stringify(validDecision) } }],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await runGroqRightHandFreeJson(
      "Review a target-scoped research report.",
      "Return one JSON object.",
      responseFormat,
      isValidDecision,
      { jobId: "job-unrelated-right-hand-test", caseId: 45 },
    );

    expect(result.status).toBe("completed");
    expect(chatBodies).toHaveLength(1);
    expect(chatBodies[0].max_completion_tokens).toBe(768);
    expect(chatBodies[0].reasoning_effort).toBe("medium");
  });

  it("treats a token-rate-limit response as rate pressure, not as completion-budget exhaustion", async () => {
    const chatBodies: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/models")) {
        return groqResponse(200, { data: [{ id: "openai/gpt-oss-120b" }, { id: "openai/gpt-oss-20b" }] });
      }
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      chatBodies.push(body);
      if (body.model === "openai/gpt-oss-120b") {
        return groqResponse(429, {
          error: {
            message: "Rate limit reached for tokens per minute.",
            type: "tokens",
            code: "rate_limit_exceeded",
          },
        });
      }
      return groqResponse(200, {
        choices: [{ message: { content: JSON.stringify(validDecision) } }],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await runGroqRightHandFreeJson(
      "Review the compact durable discovery state and advise the Boss.",
      "Return one short JSON control decision.",
      responseFormat,
      isValidDecision,
      { jobId: "job-control-rate-limit-test", caseId: 43 },
      requestOptions,
    );

    expect(result.status).toBe("completed");
    expect(result.model).toBe("openai/gpt-oss-20b");
    expect(chatBodies).toHaveLength(2);
    expect(chatBodies.every((body) => body.max_completion_tokens !== 1_280)).toBe(true);
    expect(chatBodies[0].max_completion_tokens).toBe(1_024);
  });
});
