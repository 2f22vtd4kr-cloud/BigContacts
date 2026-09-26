import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/ssrf-safe-fetch", () => ({
  safeOutboundFetch: vi.fn(),
}));

import { webSearchSerper } from "../lib/agentic-web-research-core";
import { safeOutboundFetch } from "../lib/ssrf-safe-fetch";

describe("Serper request construction", () => {
  beforeEach(() => {
    process.env.SERPER_API_KEY = "test-serper-key";
    vi.mocked(safeOutboundFetch).mockResolvedValue(new Response(JSON.stringify({
      organic: [{ title: "Example", link: "https://example.com", snippet: "Example result" }],
    }), { status: 200 }));
  });

  afterEach(() => {
    delete process.env.SERPER_API_KEY;
    vi.restoreAllMocks();
  });

  it("maps locale to language (hl) and market to country (gl)", async () => {
    const result = await webSearchSerper("Alex Example", "en-US", "US");

    expect(result?.urls).toEqual(["https://example.com"]);
    expect(safeOutboundFetch).toHaveBeenCalledTimes(1);

    const [, init] = vi.mocked(safeOutboundFetch).mock.calls[0]!;
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      q: "Alex Example",
      num: 10,
      hl: "en",
      gl: "us",
    });
  });

  it("omits malformed locale and market values instead of sending invalid Serper fields", async () => {
    await webSearchSerper("Alex Example", "english", "United States");

    const [, init] = vi.mocked(safeOutboundFetch).mock.calls[0]!;
    expect(JSON.parse(String(init?.body))).toEqual({
      q: "Alex Example",
      num: 10,
    });
  });
});
