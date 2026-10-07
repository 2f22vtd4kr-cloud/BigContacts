import { afterEach, describe, expect, it, vi } from "vitest";
import { runGroqRightHandFreeJson } from "../lib/groq-right-hand-reasoning";

describe("Groq Right-hand token-window timing", () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete process.env.GROQ_RIGHT_HAND_API_KEY;
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

    const result = await runGroqRightHandFreeJson("Return a small JSON decision.");

    expect(result.status).toBe("completed");
    expect(chatCalls).toBe(2);
    expect(timeoutSpy.mock.calls.some(([, delay]) => delay === 54_547)).toBe(true);
    expect(fetchMock.mock.calls.filter(([input]) => String(input) === "https://api.groq.com/openai/v1/chat/completions")).toHaveLength(2);
  });


});
