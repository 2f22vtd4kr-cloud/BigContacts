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

  it("caps model attempts at two and uses a control-sized output budget", async () => {
    process.env.GEMINI_API_KEY = "test-key";

    const providerFetch = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.includes("gemini-test-a:generateContent")) return new Response("retired", { status: 404 });
      if (url.includes("gemini-test-b:generateContent")) {
        return new Response(
          '{"candidates":[{"content":{"parts":[{"text":"{\"action\":\"stop\"}"}]}}]}',
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
    expect(firstBody.generationConfig.maxOutputTokens).toBe(1024);
    expect(secondBody.generationConfig.maxOutputTokens).toBe(1024);
    expect(String(providerFetch.mock.calls[0]?.[0])).toContain("gemini-test-a:generateContent");
    expect(String(providerFetch.mock.calls[1]?.[0])).toContain("gemini-test-b:generateContent");
  });
});
