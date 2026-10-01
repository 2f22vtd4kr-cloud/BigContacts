import { afterEach, describe, expect, it, vi } from "vitest";
import { generateGeminiBossText, resolveGeminiBossModel } from "../lib/case-bureau";
import { resetGeminiModelCooldownsForTests } from "../lib/gemini-model-pool";
import { resetGeminiModelCooldownsForTests } from "../lib/gemini-model-pool";

const selection = {
  model: "gemini-3.8-flash",
  status: "resolved" as const,
  inspectedKeyCount: 1,
  candidateCount: 3,
  candidateModels: ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"],
  keyName: "GEMINI_API_KEY",
};

afterEach(() => {
  vi.restoreAllMocks();
  resetGeminiModelCooldownsForTests();
  resetGeminiModelCooldownsForTests();
  delete process.env.GEMINI_API_KEY;
  delete process.env.APEX_GEMINI_BOSS_429_RETRY_DELAY_MS;
});

function response(status: number, body: unknown): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Gemini Boss text-only model authority", () => {
  it("falls through a model-level 403 to a catalog model that the free-tier key can generate with", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(403, { error: "model not available for this key tier" }))
      .mockResolvedValueOnce(response(200, {
        steps: [{ type: "model_output", content: [{ type: "text", text: '{"decision":"continue"}' }] }],
      }));

    const result = await generateGeminiBossText(selection, "Return JSON.");

    expect(result.model).toBe("gemini-3.7-flash");
    expect(result.raw).toBe('{"decision":"continue"}');
    expect(result.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("v1beta/interactions");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("v1beta/interactions");
  });

  it("retries a transient HTTP 503 once on the same Gemini model before falling through", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(503, { error: "temporarily unavailable" }))
      .mockResolvedValueOnce(response(200, {
        steps: [{ type: "model_output", content: [{ type: "text", text: '{"decision":"continue"}' }] }],
      }));

    const result = await generateGeminiBossText(selection, "Return JSON.");

    expect(result.model).toBe("gemini-3.8-flash");
    expect(result.raw).toBe('{"decision":"continue"}');
    expect(result.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("v1beta/interactions");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("v1beta/interactions");
  });

  it("falls back to the next same-role model after bounded persistent 429s", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.APEX_GEMINI_BOSS_429_RETRY_DELAY_MS = "10";
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(429, { error: "rate limited" }))
      .mockResolvedValueOnce(response(429, { error: "rate limited" }))
      .mockResolvedValueOnce(response(200, {
        steps: [{ type: "model_output", content: [{ type: "text", text: '{"decision":"continue"}' }] }],
      }));

    const result = await generateGeminiBossText(selection, "Return JSON.");

    expect(result.model).toBe("gemini-3.7-flash");
    expect(result.raw).toBe('{"decision":"continue"}');
    expect(result.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("prefers the strongest stable text model available to the Boss control plane", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(200, {
        models: [
          { name: "models/gemini-3.8-flash" },
          { name: "models/gemini-3.7-flash" },
          { name: "models/gemini-3.5-flash-lite" },
          { name: "models/gemini-3.1-flash-lite" },
        ],
      }));

    const result = await resolveGeminiBossModel();

    expect(result.status).toBe("resolved");
    expect(result.model).toBe("gemini-3.8-flash");
    expect(result.candidateModels?.[0]).toBe("gemini-3.8-flash");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails closed on an explicit daily quota without model hopping", async () => {
    process.env.GEMINI_API_KEY = "test-key-daily-quota-boss";
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(429, {
        error: {
          code: "quota_exceeded",
          message: "daily quota exhausted",
        },
      }));

    const result = await generateGeminiBossText(selection, "Return JSON.");

    expect(result.model).toBe("gemini-3.8-flash");
    expect(result.error).toContain("daily quota exhaustion");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry HTTP 503 more than once for the same model", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(503, { error: "busy" }))
      .mockResolvedValueOnce(response(503, { error: "still busy" }))
      .mockResolvedValueOnce(response(200, {
        steps: [{ type: "model_output", content: [{ type: "text", text: '{"decision":"continue"}' }] }],
      }));

    const result = await generateGeminiBossText(selection, "Return JSON.");

    expect(result.model).toBe("gemini-3.7-flash");
    expect(result.raw).toBe('{"decision":"continue"}');
    expect(result.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("stops after the first successful response", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response(200, {
      steps: [{ type: "model_output", content: [{ type: "text", text: '{"decision":"continue"}' }] }],
    }));

    const result = await generateGeminiBossText(selection, "Review the case.");

    expect(result.model).toBe("gemini-3.8-flash");
    expect(result.raw).toBe('{"decision":"continue"}');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends only text-generation fields and never search grounding", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response(200, {
      steps: [{ type: "model_output", content: [{ type: "text", text: '{"ok":true}' }] }],
    }));

    await generateGeminiBossText(selection, "Use the persisted case context.");

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body)) as Record<string, unknown>;
    expect(body).toEqual({
      model: "gemini-3.8-flash",
      input: "Use the persisted case context.",
      generation_config: { max_output_tokens: 768, thinking_level: "low" },
    });
    expect(body).not.toHaveProperty("tools");
    expect(body).not.toHaveProperty("grounding");
    expect(body).not.toHaveProperty("googleSearch");
    expect(body).not.toHaveProperty("interactions");
  });
  it("supports bounded structured JSON for a Boss discovery control response", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response(200, {
      status: "completed",
      steps: [{
        type: "model_output",
        content: [{
          type: "text",
          text: '{"report":"bounded","investigatorLlm":"groq","candidates":[],"nextDirections":[],"uncertainties":[]}',
        }],
      }],
    }));

    const result = await generateGeminiBossText(selection, "Return JSON.", {
      responseFormat: {
        type: "text",
        mime_type: "application/json",
        schema: {
          type: "object",
          properties: {
            investigatorLlm: { type: "string", enum: ["groq", "mistral"] },
          },
          required: ["investigatorLlm"],
        },
      },
      maxOutputTokens: 2048,
      thinkingLevel: "low",
    });

    expect(result.raw).toContain('"investigatorLlm"');
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body)) as Record<string, any>;
    expect(body.generation_config).toEqual({ max_output_tokens: 2048, thinking_level: "low" });
    expect(body.response_format).toMatchObject({
      type: "text",
      mime_type: "application/json",
    });
    expect(body.response_format.schema.required).toEqual(["investigatorLlm"]);
  });

  it("does not accept an incomplete Interactions response as a Boss decision", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(200, {
        status: "incomplete",
        steps: [{ type: "model_output", content: [{ type: "text", text: '{"investigatorLlm":"' }] }],
      }))
      .mockResolvedValueOnce(response(200, {
        status: "completed",
        steps: [{ type: "model_output", content: [{ type: "text", text: '{"investigatorLlm":"groq"}' }] }],
      }));

    const result = await generateGeminiBossText(selection, "Return JSON.");

    expect(result.model).toBe("gemini-3.7-flash");
    expect(result.raw).toBe('{"investigatorLlm":"groq"}');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

});
