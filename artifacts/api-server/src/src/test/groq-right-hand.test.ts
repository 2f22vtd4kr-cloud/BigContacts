import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GROQ_RIGHT_HAND_FALLBACK_MODELS,
  GROQ_RIGHT_HAND_MODEL,
  getGroqRightHandStatus,
  runGroqRightHandFreeJson,
} from "../lib/mistral-right-hand-reasoning";
import { summarizeProviderBody } from "../lib/provider-error-diagnostics";

describe("Groq Right-hand model policy", () => {
  afterEach(() => {
    delete process.env.GROQ_RIGHT_HAND_API_KEY;
    delete process.env.GROQ_RIGHT_HAND_API_KEY_2;
    delete process.env.GROQ_RIGHT_HAND_API_KEY_3;
    delete process.env.GROQ_RIGHT_HAND_API_KEY_4;
    delete process.env.GROQ_RIGHT_HAND_API_KEY_5;
    vi.restoreAllMocks();
  });

  it("uses the canonical Small 4 model with genuine cross-family Ministral fallbacks", () => {
    expect(GROQ_RIGHT_HAND_MODEL).toBe("openai/gpt-oss-120b");
    expect(GROQ_RIGHT_HAND_FALLBACK_MODELS).toEqual([
      "openai/gpt-oss-20b",
      "openai/gpt-oss-20b",
      "openai/gpt-oss-20b",
    ]);
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

    expect(summary.errorMessage).toBe("Rate limit exceeded for model");
    expect(summary.errorType).toBe("rate_limit_error");
    expect(summary.errorParam).toBe("model");
    expect(summary.errorCode).toBe("rate_limit_exceeded");
    expect(summary.errorMessageDigest).toBeTruthy();
  });

  it("uses the primary model and advances to the bounded GPT-OSS fallback", async () => {
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
            "x-ratelimit-limit-req-minute": "0",
            "x-ratelimit-remaining-req-minute": "0",
          },
        });
      }

      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"decision":"proceed"}' } }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    });

    const result = await runGroqRightHandFreeJson("Return a small JSON decision.");

    expect(result.status).toBe("completed");
    expect(result.model).toBe("openai/gpt-oss-20b");
    const chatModels = fetchMock.mock.calls
      .filter(([input]) => String(input) === "https://api.groq.com/openai/v1/chat/completions")
      .map(([, init]) => JSON.parse(String(init?.body)).model);
    expect(chatModels).toEqual(["openai/gpt-oss-120b", "openai/gpt-oss-20b"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("reports the fallback chain without exposing credentials", () => {
    process.env.GROQ_RIGHT_HAND_API_KEY = "test-groq-right-hand-key";
    const status = getGroqRightHandStatus();

    expect(status.configured).toBe(true);
    expect(status.model).toBe("openai/gpt-oss-120b");
    expect(status.fallbackModels).toEqual([
      "openai/gpt-oss-20b",
      "openai/gpt-oss-20b",
      "openai/gpt-oss-20b",
    ]);
    expect(JSON.stringify(status)).not.toContain("test-groq-right-hand-key");
  });
});
