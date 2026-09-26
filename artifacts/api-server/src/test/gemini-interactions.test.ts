import { afterEach, describe, expect, it, vi } from "vitest";
import { generateGeminiBossText } from "../src/lib/case-bureau";

describe("Gemini Interactions API transport", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  });

  it("sends Boss text reasoning to the Interactions API and reads output_text", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ output_text: '{"action":"proceed"}' }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await generateGeminiBossText(
      {
        model: "gemini-3.8-flash",
        status: "resolved",
        inspectedKeyCount: 1,
        candidateCount: 1,
        candidateModels: ["gemini-3.8-flash"],
        keyName: "GEMINI_API_KEY",
      },
      "Return a JSON control decision.",
    );

    expect(result.error).toBeNull();
    expect(result.raw).toBe('{"action":"proceed"}');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://generativelanguage.googleapis.com/v1beta/interactions");
    expect((init?.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
    expect(JSON.parse(String(init?.body))).toEqual({
      model: "gemini-3.8-flash",
      input: "Return a JSON control decision.",
    });
  });

  it("falls through to the next catalog model when the preferred model returns 403", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("", { status: 403 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ output_text: '{"action":"reframe"}' }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    const result = await generateGeminiBossText(
      {
        model: "gemini-3.8-flash",
        status: "resolved",
        inspectedKeyCount: 1,
        candidateCount: 2,
        candidateModels: ["gemini-3.8-flash", "gemini-3.5-flash-lite"],
        keyName: "GEMINI_API_KEY",
      },
      "Return a JSON control decision.",
    );

    expect(result.error).toBeNull();
    expect(result.model).toBe("gemini-3.5-flash-lite");
    expect(result.raw).toBe('{"action":"reframe"}');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
