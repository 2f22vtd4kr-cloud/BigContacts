import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/gemini-transient-retry", () => ({
  installGeminiTransientRetry: vi.fn(),
}));
vi.mock("../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { logger } from "../lib/logger";

describe("Gemini Right-hand latency controls", () => {
  const nativeFetch = globalThis.fetch;

  beforeEach(() => {
    delete process.env.APEX_GEMINI_RIGHT_HAND_REQUEST_TIMEOUT_MS;
    delete process.env.APEX_GEMINI_RIGHT_HAND_OVERALL_TIMEOUT_MS;
  });

  afterEach(() => {
    globalThis.fetch = nativeFetch;
    vi.useRealTimers();
    delete process.env.GEMINI_RIGHT_HAND_API_KEY;
    delete process.env.APEX_GEMINI_RIGHT_HAND_REQUEST_TIMEOUT_MS;
    delete process.env.APEX_GEMINI_RIGHT_HAND_OVERALL_TIMEOUT_MS;
    vi.resetModules();
    vi.restoreAllMocks();
  });


  it("does not use the old 8-second provider cutoff and keeps the overall text-only control window bounded", async () => {
    vi.resetModules();
    const { getGeminiRightHandLatencyConfig } = await import("../lib/gemini-right-hand-reasoning");
    expect(getGeminiRightHandLatencyConfig()).toEqual({ requestTimeoutMs: 20_000, overallTimeoutMs: 120_000 });
  });

  it("allows Replit operators to tune latency without removing bounded fail-closed behavior", async () => {
    process.env.APEX_GEMINI_RIGHT_HAND_REQUEST_TIMEOUT_MS = "25000";
    process.env.APEX_GEMINI_RIGHT_HAND_OVERALL_TIMEOUT_MS = "55000";
    vi.resetModules();
    const { getGeminiRightHandLatencyConfig } = await import("../lib/gemini-right-hand-reasoning");
    expect(getGeminiRightHandLatencyConfig()).toEqual({ requestTimeoutMs: 25_000, overallTimeoutMs: 55_000 });
  });

  it("uses bounded minimal-thinking Gemini 3 Flash-Lite control generation", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key";
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ models: [
        { name: "models/gemini-3.8-flash" },
        { name: "models/gemini-3.7-flash" },
        { name: "models/gemini-3.6-flash" },
        { name: "models/gemini-3.5-flash-lite" },
        { name: "models/gemini-3.1-flash-lite" },
      ] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        steps: [{ type: "model_output", content: [{ type: "text", text: '{"decision":"continue","reason":"test","focusLanes":[],"confidence":0.5}' }] }],
      }), { status: 200 }));
    globalThis.fetch = fetchMock;
    vi.resetModules();
    const { runGeminiRightHandFreeJson } = await import("../lib/gemini-right-hand-reasoning");

    const result = await runGeminiRightHandFreeJson("Return one JSON object.");
    expect(result.status).toBe("completed");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const body = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(body.generation_config.max_output_tokens).toBe(512);
    expect(body.generation_config.responseMimeType).toBeUndefined();
    expect(body.generation_config.thinking_level).toBe("minimal");
    expect(body.generation_config.temperature).toBeUndefined();
  });

  it("records redacted request telemetry without persisting prompt contents", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key";
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ models: [
        { name: "models/gemini-3.8-flash" },
        { name: "models/gemini-3.7-flash" },
        { name: "models/gemini-3.6-flash" },
        { name: "models/gemini-3.5-flash-lite" },
        { name: "models/gemini-3.1-flash-lite" },
      ] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        steps: [{ type: "model_output", content: [{ type: "text", text: '{"decision":"continue","reason":"test","focusLanes":[],"confidence":0.5}' }] }],
      }), { status: 200 }));
    globalThis.fetch = fetchMock;
    vi.resetModules();
    const { runGeminiRightHandFreeJson } = await import("../lib/gemini-right-hand-reasoning");

    const result = await runGeminiRightHandFreeJson("unique user prompt that must not be logged");
    expect(result.status).toBe("completed");
    const infoCall = vi.mocked(logger.info).mock.calls.find(([, message]) => message === "Gemini Right-hand request resolved");
    expect(infoCall).toBeDefined();
    const telemetry = infoCall?.[0] as Record<string, unknown>;
    expect(telemetry).toMatchObject({
      role: "gemini_right_hand",
      phase: "request_resolved",
      model: "gemini-3.1-flash-lite",
      httpStatus: 200,
      requestDeadlineFired: false,
      overallDeadlineFired: false,
    });
    expect(typeof telemetry.requestPayloadBytes).toBe("number");
    expect(typeof telemetry.systemPromptBytes).toBe("number");
    expect(typeof telemetry.userPromptBytes).toBe("number");
    expect(typeof telemetry.fetchElapsedMs).toBe("number");
    expect(typeof telemetry.totalElapsedMs).toBe("number");
    expect(telemetry).not.toHaveProperty("systemPrompt");
    expect(telemetry).not.toHaveProperty("userPrompt");
    expect(JSON.stringify(telemetry)).not.toContain("unique user prompt");
  });

  it("uses the preferred Right-hand model from the live catalog", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key";
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ models: [
        { name: "models/gemini-3.8-flash" },
        { name: "models/gemini-3.7-flash" },
        { name: "models/gemini-3.6-flash" },
        { name: "models/gemini-3.5-flash-lite" },
        { name: "models/gemini-3.1-flash-lite" },
      ] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        steps: [{ type: "model_output", content: [{ type: "text", text: '{"decision":"continue","reason":"test","focusLanes":[],"confidence":0.5}' }] }],
      }), { status: 200 }));
    globalThis.fetch = fetchMock;
    vi.resetModules();
    const { runGeminiRightHandFreeJson } = await import("../lib/gemini-right-hand-reasoning");

    const result = await runGeminiRightHandFreeJson("Return one JSON object.");
    expect(result.status).toBe("completed");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/v1beta/models");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/v1beta/interactions");
  });
});
