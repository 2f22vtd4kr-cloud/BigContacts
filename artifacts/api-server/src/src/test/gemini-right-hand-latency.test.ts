import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/gemini-transient-retry", () => ({
  installGeminiTransientRetry: vi.fn(),
}));

describe("Gemini Right-hand latency controls", () => {
  const nativeFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = nativeFetch;
    delete process.env.GEMINI_RIGHT_HAND_API_KEY;
    delete process.env.GEMINI_RIGHT_HAND_MODEL_CHAIN;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("uses bounded low-thinking Gemini 3 control generation", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key";
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"decision":"continue","reason":"test","focusLanes":[],"confidence":0.5}' }] } }],
      }), { status: 200 }),
    );
    globalThis.fetch = fetchMock;
    vi.resetModules();
    const { runGeminiRightHandFreeJson } = await import("../lib/gemini-right-hand-reasoning");

    const result = await runGeminiRightHandFreeJson("Return one JSON object.");
    expect(result.status).toBe("completed");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.generationConfig.maxOutputTokens).toBe(768);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.thinkingConfig.thinkingLevel).toBe("low");
    expect(body.generationConfig.temperature).toBeUndefined();
  });

  it("tries at most two Gemini models instead of serially exhausting the fallback chain", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key";
    process.env.GEMINI_RIGHT_HAND_MODEL_CHAIN = "gemini-3.8-flash,gemini-3.7-flash,gemini-3.6-flash";
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ error: "busy" }), { status: 503 }));
    globalThis.fetch = fetchMock;
    vi.resetModules();
    const { runGeminiRightHandFreeJson } = await import("../lib/gemini-right-hand-reasoning");

    const result = await runGeminiRightHandFreeJson("Return one JSON object.");
    expect(result.status).toBe("unavailable");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
