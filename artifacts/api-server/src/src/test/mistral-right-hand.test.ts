import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MISTRAL_RIGHT_HAND_FALLBACK_MODELS,
  MISTRAL_RIGHT_HAND_MODEL,
  getMistralRightHandStatus,
  runMistralRightHandFreeJson,
} from "../lib/mistral-right-hand-reasoning";
import { summarizeProviderBody } from "../lib/provider-error-diagnostics";

describe("Mistral Right-hand model policy", () => {
  afterEach(() => {
    delete process.env.MISTRAL_RIGHT_HAND_API_KEY;
    delete process.env.MISTRAL_RIGHT_HAND_API_KEY_2;
    delete process.env.MISTRAL_RIGHT_HAND_API_KEY_3;
    delete process.env.MISTRAL_RIGHT_HAND_API_KEY_4;
    delete process.env.MISTRAL_RIGHT_HAND_API_KEY_5;
    vi.restoreAllMocks();
  });

  it("uses the canonical Small 4 model with genuine cross-family Ministral fallbacks", () => {
    expect(MISTRAL_RIGHT_HAND_MODEL).toBe("mistral-small-2603");
    expect(MISTRAL_RIGHT_HAND_FALLBACK_MODELS).toEqual([
      "ministral-14b-2512",
      "ministral-8b-2512",
      "ministral-3b-2512",
    ]);
    expect(MISTRAL_RIGHT_HAND_FALLBACK_MODELS).not.toContain("mistral-small-latest");
  });


  it("preserves Mistral's documented top-level error fields without secrets", () => {
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

  it("skips the failed Small 4 model and advances to a genuinely different Ministral family", async () => {
    vi.stubEnv("MISTRAL_RIGHT_HAND_API_KEY", "right-hand-fallback-test-key");

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === "https://api.mistral.ai/v1/models") {
        return new Response(JSON.stringify({
          data: [
            { id: "mistral-small-2603" },
            { id: "ministral-14b-2512" },
            { id: "ministral-8b-2512" },
            { id: "ministral-3b-2512" },
          ],
        }), { status: 200, headers: { "content-type": "application/json" } });
      }

      const body = JSON.parse(String(init?.body));
      if (body.model === "mistral-small-2603") {
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

    const result = await runMistralRightHandFreeJson("Return a small JSON decision.");

    expect(result.status).toBe("completed");
    expect(result.model).toBe("ministral-14b-2512");
    const chatModels = fetchMock.mock.calls
      .filter(([input]) => String(input) === "https://api.mistral.ai/v1/chat/completions")
      .map(([, init]) => JSON.parse(String(init?.body)).model);
    expect(chatModels).toEqual(["mistral-small-2603", "ministral-14b-2512"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("reports the fallback chain without exposing credentials", () => {
    process.env.MISTRAL_RIGHT_HAND_API_KEY = "test-right-hand-key";
    const status = getMistralRightHandStatus();

    expect(status.configured).toBe(true);
    expect(status.model).toBe("mistral-small-2603");
    expect(status.fallbackModels).toEqual([
      "ministral-14b-2512",
      "ministral-8b-2512",
      "ministral-3b-2512",
    ]);
    expect(JSON.stringify(status)).not.toContain("test-right-hand-key");
  });
});
