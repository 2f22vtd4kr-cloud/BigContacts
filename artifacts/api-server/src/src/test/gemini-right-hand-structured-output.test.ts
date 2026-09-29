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

  function catalog() {
    return new Response(JSON.stringify({
      models: [
        { name: "models/gemini-3.8-flash" },
        { name: "models/gemini-3.7-flash" },
        { name: "models/gemini-3.6-flash" },
        { name: "models/gemini-3.5-flash" },
      ],
    }), { status: 200 });
  }

  it("uses Interactions structured JSON and the preferred text-only model after catalog resolution", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key";
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(catalog())
      .mockResolvedValueOnce(response(
        '{"decision":"continue","reason":"report is actionable","focusLanes":[],"confidence":0.8}'
      ));
    globalThis.fetch = fetchMock;
    const result = await runGeminiRightHandFreeJson("Investigator report: three observed sources.");

    expect(result.status).toBe("completed");
    expect(result.model).toBe(GEMINI_RIGHT_HAND_MODEL);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(String(url)).toContain("/v1beta/interactions");
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe(GEMINI_RIGHT_HAND_MODEL);
    expect(body.response_format).toMatchObject({ type: "text", mime_type: "application/json" });
    expect(body.response_format.schema).toEqual({ type: "object" });
    expect(body.generation_config?.max_output_tokens).toBe(768);
  });

  it("fails closed on malformed control output rather than model-hopping or browsing", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key-malformed";
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(catalog())
      .mockResolvedValueOnce(response('{"unexpected":"shape"}'));
    globalThis.fetch = fetchMock;
    const result = await runGeminiRightHandFreeJson("Investigator report.");
    expect(result.status).toBe("completed");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("probes the model catalog before the control request", async () => {
    process.env.GEMINI_RIGHT_HAND_API_KEY = "test-key-catalog";
    const calls: string[] = [];
    globalThis.fetch = vi.fn<typeof fetch>(async (input) => {
      calls.push(String(input));
      if (String(input).endsWith("/v1beta/models")) return catalog();
      return response('{"decision":"continue","reason":"ok","focusLanes":[],"confidence":0.5}');
    });
    await runGeminiRightHandFreeJson("Investigator report.");
    expect(calls).toHaveLength(2);
    expect(calls[1]).toContain("/v1beta/interactions");
    expect(calls[0]).toContain("/v1beta/models");
  });
});
