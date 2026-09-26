import { afterEach, describe, expect, it, vi } from "vitest";
import { generateGeminiBossText } from "../lib/case-bureau";

const selection = {
  model: "gemini-3.8-flash",
  status: "resolved" as const,
  inspectedKeyCount: 1,
  candidateCount: 3,
  candidateModels: ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.5-flash-lite"],
  keyName: "GEMINI_API_KEY",
};

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.GEMINI_API_KEY;
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
        candidates: [{ content: { parts: [{ text: '{"decision":"continue"}' }] } }],
      }));

    const result = await generateGeminiBossText(selection, "Return JSON.");

    expect(result.model).toBe("gemini-3.7-flash");
    expect(result.raw).toBe('{"decision":"continue"}');
    expect(result.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("gemini-3.8-flash:generateContent");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("gemini-3.7-flash:generateContent");
  });

  it.each([429, 503])("falls back to the next configured Gemini model after HTTP %s", async (status) => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(status, { error: "temporarily unavailable" }))
      .mockResolvedValueOnce(response(200, {
        candidates: [{ content: { parts: [{ text: '{"decision":"continue"}' }] } }],
      }));

    const result = await generateGeminiBossText(selection, "Return JSON.");

    expect(result.model).toBe("gemini-3.7-flash");
    expect(result.raw).toBe('{"decision":"continue"}');
    expect(result.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("gemini-3.8-flash:generateContent");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("gemini-3.7-flash:generateContent");
  });

  it("stops after the first successful response", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response(200, {
      candidates: [{ content: { parts: [{ text: '{"decision":"continue"}' }] } }],
    }));

    const result = await generateGeminiBossText(selection, "Review the case.");

    expect(result.model).toBe("gemini-3.8-flash");
    expect(result.raw).toBe('{"decision":"continue"}');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends only text-generation fields and never search grounding", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response(200, {
      candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
    }));

    await generateGeminiBossText(selection, "Use the persisted case context.");

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body)) as Record<string, unknown>;
    expect(body).toEqual({
      contents: [{ role: "user", parts: [{ text: "Use the persisted case context." }] }],
      generationConfig: {
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: "low" },
      },
    });
    expect(body).not.toHaveProperty("tools");
    expect(body).not.toHaveProperty("grounding");
    expect(body).not.toHaveProperty("googleSearch");
    expect(body).not.toHaveProperty("interactions");
  });
});
