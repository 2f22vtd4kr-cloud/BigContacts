import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { logger } from "../lib/logger";

describe("Gemini Boss latency controls", () => {
  const nativeFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = nativeFetch;
    delete process.env.GEMINI_API_KEY;
    vi.resetModules();
    vi.restoreAllMocks();
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

  it("records redacted request telemetry without logging the Boss prompt", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"outcome":"proceed","investigatorLlm":"groq"}' }] } }],
      }), { status: 200 }));

    globalThis.fetch = fetchMock;
    vi.resetModules();
    const { generateGeminiBossText } = await import("../lib/case-bureau");
    const prompt = "unique Boss prompt that must not be logged";
    const result = await generateGeminiBossText(
      {
        model: "gemini-3.8-flash",
        status: "resolved",
        inspectedKeyCount: 1,
        candidateCount: 2,
        candidateModels: ["gemini-3.8-flash", "gemini-3.7-flash"],
        keyName: "GEMINI_API_KEY",
      },
      prompt,
    );

    expect(result.error).toBeNull();
    const infoCall = vi.mocked(logger.info).mock.calls.find(([, message]) => message === "Gemini Boss request resolved");
    expect(infoCall).toBeDefined();
    const telemetry = infoCall?.[0] as Record<string, unknown>;
    expect(telemetry).toMatchObject({
      role: "gemini_boss",
      phase: "request_resolved",
      model: "gemini-3.8-flash",
      keyName: "GEMINI_API_KEY",
      httpStatus: 200,
      requestDeadlineFired: false,
      overallDeadlineFired: false,
    });
    expect(typeof telemetry.requestPayloadBytes).toBe("number");
    expect(typeof telemetry.promptBytes).toBe("number");
    expect(typeof telemetry.fetchElapsedMs).toBe("number");
    expect(typeof telemetry.totalElapsedMs).toBe("number");
    expect(JSON.stringify(telemetry)).not.toContain(prompt);
  });
});
