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

  it("caps live model attempts at two and uses a control-sized output budget", async () => {
    process.env.GEMINI_API_KEY = "test-key";

    const providerFetch = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      const body = JSON.parse(String(init?.body ?? "{}")) as { model?: string };
      if (body.model === "gemini-3.8-flash") return new Response("retired", { status: 404 });
      if (body.model === "gemini-3.7-flash") {
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
        model: "gemini-3.8-flash",
        status: "resolved",
        inspectedKeyCount: 1,
        candidateCount: 5,
        candidateModels: [
          "gemini-3.8-flash",
          "gemini-3.7-flash",
          "gemini-3.6-flash",
          "gemini-3.5-flash",
          "gemini-3.5-flash-lite",
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
    expect(firstBody.model).toBe("gemini-3.8-flash");
    expect(secondBody.model).toBe("gemini-3.7-flash");
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

  it("retries the same model once on a retryable 429 without equivalent-model fan-out", async () => {
    process.env.GEMINI_API_KEY = "test-key";

    const providerFetch = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { code: "rate_limit_exceeded", status: "RESOURCE_EXHAUSTED", message: "capacity temporarily unavailable" },
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
    expect(result.raw).toContain('"action"');
    expect(providerFetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(providerFetch.mock.calls[0]?.[1]?.body)).model).toBe("gemini-3.8-flash");
    expect(JSON.parse(String(providerFetch.mock.calls[1]?.[1]?.body)).model).toBe("gemini-3.8-flash");
  });

});
