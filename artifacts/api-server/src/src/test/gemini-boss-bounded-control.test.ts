import { afterEach, describe, expect, it, vi } from "vitest";

describe("Gemini Boss bounded control-plane generation", () => {
  const nativeFetch = globalThis.fetch;

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.fetch = nativeFetch;
    delete process.env.GEMINI_API_KEY;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("caps model attempts at four and uses a control-sized output budget", async () => {
    process.env.GEMINI_API_KEY = "test-key";

    const providerFetch = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.includes("gemini-test-a")) return new Response("retired", { status: 404 });
      if (url.includes("gemini-test-b")) {
        return new Response(
          JSON.stringify({ steps: [{ type: "model_output", content: [{ type: "text", text: '{"action":"stop"}' }] }] }),
          { status: 200 },
        );
      }
      return new Response("unexpected", { status: 500 });
    });

    vi.stubGlobal("fetch", providerFetch);

    vi.resetModules();
    const { generateGeminiBossText } = await import("../lib/case-bureau");

    const result = await generateGeminiBossText(
      {
        model: "gemini-test-a",
        status: "resolved",
        inspectedKeyCount: 1,
        candidateCount: 5,
        candidateModels: [
          "gemini-test-a",
          "gemini-test-b",
          "gemini-test-c",
          "gemini-test-d",
          "gemini-test-e",
        ],
        keyName: "GEMINI_API_KEY",
      },
      "Return one small JSON control decision.",
    );

    expect(result.error ?? result.raw ?? "").toContain('\"action\"');
    expect(providerFetch).toHaveBeenCalledTimes(2);

    const firstBody = JSON.parse(String(providerFetch.mock.calls[0]?.[1]?.body));
    const secondBody = JSON.parse(String(providerFetch.mock.calls[1]?.[1]?.body));
    expect(firstBody.generation_config.max_output_tokens).toBe(768);
    expect(secondBody.generation_config.max_output_tokens).toBe(768);
    expect(String(providerFetch.mock.calls[0]?.[0])).toContain("/v1beta/interactions");
    expect(String(providerFetch.mock.calls[1]?.[0])).toContain("/v1beta/interactions");
  });
  it("retries the same Gemini model without structured output after a 400 invalid_request", async () => {
    process.env.GEMINI_API_KEY = "test-key";

    const providerFetch = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ error: { code: "invalid_request", message: "structured request rejected" } }),
        { status: 400 },
      ))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ output_text: '{"action":"proceed"}' }),
        { status: 200, headers: { "content-type": "application/json" } },
      ));

    vi.stubGlobal("fetch", providerFetch);
    vi.resetModules();
    const { generateGeminiBossText } = await import("../lib/case-bureau");

    const result = await generateGeminiBossText(
      {
        model: "gemini-3.5-flash",
        status: "resolved",
        inspectedKeyCount: 1,
        candidateCount: 1,
        candidateModels: ["gemini-3.5-flash"],
        keyName: "GEMINI_API_KEY",
      },
      "Return one small JSON control decision.",
      {
        responseFormat: { type: "text", mime_type: "application/json", schema: { type: "object" } },
        maxOutputTokens: 768,
        thinkingLevel: "low",
      },
    );

    expect(result.error).toBeNull();
    expect(result.raw).toContain('"action"');
    expect(providerFetch).toHaveBeenCalledTimes(2);

    const firstBody = JSON.parse(String(providerFetch.mock.calls[0]?.[1]?.body));
    const secondBody = JSON.parse(String(providerFetch.mock.calls[1]?.[1]?.body));
    expect(firstBody.response_format).toBeDefined();
    expect(secondBody.response_format).toBeUndefined();
    expect(secondBody.model).toBe("gemini-3.5-flash");
    expect(secondBody.generation_config.thinking_level).toBe("low");
  });

  it("advances to the next compatible model on a 429 without retrying the same model", async () => {
    process.env.GEMINI_API_KEY = "test-key";

    const providerFetch = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "capacity temporarily unavailable" },
      }), { status: 429 }))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ steps: [{ type: "model_output", content: [{ type: "text", text: '{"action":"proceed"}' }] }] }),
        { status: 200 },
      ));

    vi.stubGlobal("fetch", providerFetch);
    vi.resetModules();
    const { generateGeminiBossText } = await import("../lib/case-bureau");

    const result = await generateGeminiBossText(
      {
        model: "gemini-test-a",
        status: "resolved",
        inspectedKeyCount: 1,
        candidateCount: 2,
        candidateModels: ["gemini-test-a", "gemini-test-b"],
        keyName: "GEMINI_API_KEY",
      },
      "Return one small JSON control decision.",
    );

    expect(result.error).toBeNull();
    expect(result.raw).toContain('"action"');
    expect(providerFetch).toHaveBeenCalledTimes(2);
    expect(String(providerFetch.mock.calls[0]?.[0])).toContain("gemini-test-a");
    expect(String(providerFetch.mock.calls[1]?.[0])).toContain("gemini-test-b");
  });

});
