import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  safeOutboundFetch: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

vi.mock("../lib/ssrf-safe-fetch", () => ({ safeOutboundFetch: mocks.safeOutboundFetch }));
vi.mock("../lib/logger", () => ({ logger: mocks.logger }));

import { webSearchSerper } from "../lib/agentic-web-research-core";

describe("Serper provider observability", () => {
  afterEach(() => {
    mocks.safeOutboundFetch.mockReset();
    vi.clearAllMocks();
    delete process.env.SERPER_API_KEY;
  });

  it("distinguishes HTTP failures instead of collapsing them into an opaque null", async () => {
    process.env.SERPER_API_KEY = "test-key";
    mocks.safeOutboundFetch.mockResolvedValue(new Response("quota", { status: 429 }));

    const result = await webSearchSerper("example query", "us", "en");

    expect(result?.text).toContain("HTTP_429");
    expect(result?.urls).toEqual([]);
    expect(mocks.logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "serper", httpStatus: 429, outcome: "HTTP_429" }),
      "agentic provider search rejected",
    );
  });

  it("classifies HTTP 400 as an invalid request with only sanitized request/response shape", async () => {
    process.env.SERPER_API_KEY = "test-key";
    mocks.safeOutboundFetch.mockResolvedValue(new Response(JSON.stringify({
      error: {
        code: "INVALID_ARGUMENT",
        message: "this provider message must not be logged",
      },
    }), { status: 400 }));

    const result = await webSearchSerper("example query", "us", "en");

    expect(result?.text).toContain("INVALID_REQUEST");
    expect(result?.text).toContain("HTTP_400");
    const warning = vi.mocked(mocks.logger.warn).mock.calls.find(([, message]) => message === "agentic provider search rejected");
    expect(warning).toBeDefined();
    const telemetry = warning?.[0] as Record<string, unknown>;
    expect(telemetry).toMatchObject({
      provider: "serper",
      failureClass: "invalid_request",
      httpStatus: 400,
      requestShape: {
        method: "POST",
        contentType: "application/json",
        keys: ["gl", "hl", "num", "q"],
        num: 10,
        queryChars: 13,
        localeChars: 2,
        marketChars: 2,
      },
      responseShape: {
        bodyKind: "json",
        topLevelKeys: ["error"],
        errorKeys: ["code", "message"],
        errorCode: "INVALID_ARGUMENT",
        errorMessageChars: 42,
      },
    });
    expect(JSON.stringify(telemetry)).not.toContain("this provider message must not be logged");
  });

  it("distinguishes a successful response with no organic results", async () => {
    process.env.SERPER_API_KEY = "test-key";
    mocks.safeOutboundFetch.mockResolvedValue(new Response(JSON.stringify({ organic: [] }), { status: 200 }));

    const result = await webSearchSerper("example query");

    expect(result?.text).toContain("EMPTY_ORGANIC");
    expect(result?.urls).toEqual([]);
    expect(mocks.logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "serper", httpStatus: 200, organicCount: 0, validUrlCount: 0, outcome: "EMPTY_ORGANIC" }),
      "agentic provider search completed",
    );
  });

  it("distinguishes invalid JSON from an empty result set", async () => {
    process.env.SERPER_API_KEY = "test-key";
    mocks.safeOutboundFetch.mockResolvedValue(new Response("not-json", { status: 200 }));

    const result = await webSearchSerper("example query");

    expect(result?.text).toContain("INVALID_JSON");
    expect(result?.urls).toEqual([]);
  });
});
