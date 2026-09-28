import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/gemini-transient-retry", () => ({ installGeminiTransientRetry: vi.fn() }));

import { GEMINI_RIGHT_HAND_MODEL, runGeminiRightHandFreeJson } from "../lib/gemini-right-hand-reasoning";

describe("Gemini Right-hand structured output", () => {
  afterEach(() => {
    delete process.env.GEMINI_RIGHT_HAND_API_KEY;
    vi.restoreAllMocks();
  });

  function response(text: string, status = 200) {
    return new Response(JSON.stringify({
      steps: [{ type: "model_output", content: [{ type: "text", text }] }],
    }), { status });
  }

  it("uses Interactions structured JSON and the configured text-only model", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key";
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response(
      '{"decision":"continue","reason":"report is actionable","focusLanes":[],"confidence":0.8}'
    ));
    globalThis.fetch = fetchMock;
    const result = await runGeminiRightHandFreeJson("Investigator report: three observed sources.");

    expect(result.status).toBe("completed");
    expect(result.model).toBe(GEMINI_RIGHT_HAND_MODEL);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/v1beta/interactions");
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe(GEMINI_RIGHT_HAND_MODEL);
    expect(body.generation_config?.responseMimeType).toBe("application/json");
    expect(body.generation_config?.thinking_level).toBe("low");
  });

  it("fails closed on malformed control output rather than model-hopping or browsing", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key";
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response('{"unexpected":"shape"}'));
    globalThis.fetch = fetchMock;
    const result = await runGeminiRightHandFreeJson("Investigator report.");
    expect(result.status).toBe("completed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not probe a model catalog before the control request", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key";
    const calls: string[] = [];
    globalThis.fetch = vi.fn<typeof fetch>(async (input) => {
      calls.push(String(input));
      return response('{"decision":"continue","reason":"ok","focusLanes":[],"confidence":0.5}');
    });
    await runGeminiRightHandFreeJson("Investigator report.");
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("/v1beta/interactions");
    expect(calls[0]).not.toContain("/v1beta/models");
  });
});
