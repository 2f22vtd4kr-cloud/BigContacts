import { afterEach, describe, expect, it, vi } from "vitest";

describe("Gemini Boss latency controls", () => {
  const nativeFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = nativeFetch;
    delete process.env.GEMINI_API_KEY;
    delete process.env.APEX_GEMINI_BOSS_REQUEST_TIMEOUT_MS;
    delete process.env.APEX_GEMINI_BOSS_OVERALL_TIMEOUT_MS;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("uses a bounded default latency window that leaves room for model fallback", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.resetModules();
    const { getGeminiBossLatencyConfig } = await import("../lib/case-bureau");
    expect(getGeminiBossLatencyConfig()).toEqual({
      requestTimeoutMs: 20_000,
      overallTimeoutMs: 45_000,
    });
  });

  it("honors bounded Boss latency overrides", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.APEX_GEMINI_BOSS_REQUEST_TIMEOUT_MS = "25000";
    process.env.APEX_GEMINI_BOSS_OVERALL_TIMEOUT_MS = "55000";
    vi.resetModules();
    const { getGeminiBossLatencyConfig } = await import("../lib/case-bureau");
    expect(getGeminiBossLatencyConfig()).toEqual({
      requestTimeoutMs: 25_000,
      overallTimeoutMs: 55_000,
    });
  });

  it("keeps the overall Boss deadline at least as large as the request deadline", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.APEX_GEMINI_BOSS_REQUEST_TIMEOUT_MS = "60000";
    process.env.APEX_GEMINI_BOSS_OVERALL_TIMEOUT_MS = "20000";
    vi.resetModules();
    const { getGeminiBossLatencyConfig } = await import("../lib/case-bureau");
    expect(getGeminiBossLatencyConfig()).toEqual({
      requestTimeoutMs: 60_000,
      overallTimeoutMs: 60_000,
    });
  });

  it("uses low Gemini 3.x thinking and a small control response budget", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"outcome":"proceed","investigatorLlm":"groq"}' }] } }],
      }), { status: 200 }));

    globalThis.fetch = fetchMock;
    vi.resetModules();
    const { generateGeminiBossText } = await import("../lib/case-bureau");

    const result = await generateGeminiBossText(
      {
        model: "gemini-3.8-flash",
        status: "resolved",
        inspectedKeyCount: 1,
        candidateCount: 2,
        candidateModels: ["gemini-3.8-flash", "gemini-3.7-flash"],
        keyName: "GEMINI_API_KEY",
      },
      "Return one small JSON control decision.",
    );

    expect(result.error).toBeNull();
    expect(result.raw).toContain('"outcome"');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.generationConfig.maxOutputTokens).toBe(1024);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.thinkingConfig.thinkingLevel).toBe("low");
    expect(body.generationConfig.temperature).toBeUndefined();
  });
});
