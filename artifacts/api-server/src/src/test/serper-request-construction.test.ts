import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/ssrf-safe-fetch", () => ({
  safeOutboundFetch: vi.fn(),
}));

import { webSearchSerper } from "../lib/agentic-web-research-core";
import { safeOutboundFetch } from "../lib/ssrf-safe-fetch";

describe("Serper request construction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SERPER_API_KEY = "test-serper-key";
    vi.mocked(safeOutboundFetch).mockResolvedValue(new Response(JSON.stringify({
      organic: [{ title: "Example", link: "https://example.com", snippet: "Example result" }],
    }), { status: 200 }));
  });

  afterEach(() => {
    delete process.env.SERPER_API_KEY;
    vi.clearAllMocks();
  });

  it("maps locale to language (hl) and market to country (gl)", async () => {
    const result = await webSearchSerper("Alex Example", "en-US", "US");

    expect(result?.urls).toEqual(["https://example.com/"]);
    expect(safeOutboundFetch).toHaveBeenCalledTimes(1);

    const [, init] = vi.mocked(safeOutboundFetch).mock.calls[0]!;
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      q: "Alex Example",
      num: 6,
      hl: "en",
      gl: "us",
    });
  });

  it("passes native-script queries unchanged with multilingual locale hints", async () => {
    const cases = [
      { query: "власник казино Порторож акціонери", locale: "uk-UA", market: "SI", hl: "uk", gl: "si" },
      { query: "مالك كازينو بورتوروز استثمار", locale: "ar-SA", market: "SA", hl: "ar", gl: "sa" },
      { query: "赌场波尔托罗什主要股东", locale: "zh-Hant-TW", market: "TW", hl: "zh", gl: "tw" },
      { query: "カジノ ポルトロシュ 主要株主", locale: "ja-JP", market: "JP", hl: "ja", gl: "jp" },
      { query: "Casino Portorož lastnik koncesionar", locale: "sl-SI", market: "SI", hl: "sl", gl: "si" },
    ];

    for (const request of cases) {
      await webSearchSerper(request.query, request.locale, request.market);
      const [, init] = vi.mocked(safeOutboundFetch).mock.calls.at(-1)!;
      expect(JSON.parse(String(init?.body))).toMatchObject({
        q: request.query,
        hl: request.hl,
        gl: request.gl,
      });
    }
  });

  it("omits malformed locale and market values instead of sending invalid Serper fields", async () => {
    await webSearchSerper("Alex Example", "english", "United States");

    const [, init] = vi.mocked(safeOutboundFetch).mock.calls[0]!;
    expect(JSON.parse(String(init?.body))).toEqual({
      q: "Alex Example",
      num: 6,
    });
  });
});
