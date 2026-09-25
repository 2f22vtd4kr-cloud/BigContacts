import { afterEach, describe, expect, it, vi } from "vitest";

const safeOutboundFetch = vi.fn();
const logger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };

vi.mock("../lib/ssrf-safe-fetch", () => ({ safeOutboundFetch }));
vi.mock("../lib/logger", () => ({ logger }));

import { webSearchSerper } from "../lib/agentic-web-research-core";

describe("Serper provider observability", () => {
  afterEach(() => {
    safeOutboundFetch.mockReset();
    vi.clearAllMocks();
    delete process.env.SERPER_API_KEY;
  });

  it("distinguishes HTTP failures instead of collapsing them into an opaque null", async () => {
    process.env.SERPER_API_KEY = "test-key";
    safeOutboundFetch.mockResolvedValue(new Response("quota", { status: 429 }));

    const result = await webSearchSerper("example query", "us", "en");

    expect(result?.text).toContain("HTTP_429");
    expect(result?.urls).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "serper", httpStatus: 429, outcome: "HTTP_429" }),
      "agentic provider search rejected",
    );
  });

  it("distinguishes a successful response with no organic results", async () => {
    process.env.SERPER_API_KEY = "test-key";
    safeOutboundFetch.mockResolvedValue(new Response(JSON.stringify({ organic: [] }), { status: 200 }));

    const result = await webSearchSerper("example query");

    expect(result?.text).toContain("EMPTY_ORGANIC");
    expect(result?.urls).toEqual([]);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "serper", httpStatus: 200, organicCount: 0, validUrlCount: 0, outcome: "EMPTY_ORGANIC" }),
      "agentic provider search completed",
    );
  });

  it("distinguishes invalid JSON from an empty result set", async () => {
    process.env.SERPER_API_KEY = "test-key";
    safeOutboundFetch.mockResolvedValue(new Response("not-json", { status: 200 }));

    const result = await webSearchSerper("example query");

    expect(result?.text).toContain("INVALID_JSON");
    expect(result?.urls).toEqual([]);
  });
});
