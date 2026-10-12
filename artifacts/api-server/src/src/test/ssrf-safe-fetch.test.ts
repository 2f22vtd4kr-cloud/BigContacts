import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const dnsMocks = vi.hoisted(() => ({
  resolve4: vi.fn(),
  resolve6: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock("node:dns/promises", () => ({
  Resolver: class {
    constructor(_options: { timeout: number; tries: number }) {}
    resolve4(hostname: string) { return dnsMocks.resolve4(hostname); }
    resolve6(hostname: string) { return dnsMocks.resolve6(hostname); }
    cancel() { dnsMocks.cancel(); }
  },
}));

const transportMocks = vi.hoisted(() => ({
  httpsRequest: vi.fn(),
}));

vi.mock("node:https", () => ({
  default: { request: transportMocks.httpsRequest },
}));

import { assertSafeOutboundUrl, isBlockedOutboundIpForTest, MAX_SAFE_OUTBOUND_RESPONSE_BYTES, responseBodyForStatus, responseStatusForFetch, safeOutboundFetch } from "../lib/ssrf-safe-fetch";

describe("SSRF outbound boundary", () => {
  it("cancels URL-safety DNS preflight when the caller signal aborts", async () => {
    dnsMocks.resolve4.mockReset().mockImplementation(() => new Promise(() => undefined));
    dnsMocks.resolve6.mockReset();
    dnsMocks.cancel.mockReset();

    const controller = new AbortController();
    const validation = assertSafeOutboundUrl("https://research.example/article", controller.signal);
    controller.abort();

    await expect(validation).rejects.toThrow("Outbound DNS resolution aborted");
    expect(dnsMocks.resolve4).toHaveBeenCalledWith("research.example");
    expect(dnsMocks.cancel).toHaveBeenCalled();
  });

  it("blocks loopback, RFC1918, link-local, multicast, reserved, metadata, and IPv4-mapped IPv6 addresses", () => {
    for (const ip of [
      "127.0.0.1",
      "10.0.0.1",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.169.254",
      "192.0.0.1",
      "192.0.2.1",
      "198.51.100.1",
      "203.0.113.1",
      "224.0.0.1",
      "::1",
      "fd00::1",
      "fe80::1",
      "fec0::1",
      "ff02::1",
      "100::1",
      "64:ff9b::a9fe:a9fe",
      "64:ff9b:1::a9fe:a9fe",
      "2001::1",
      "2001:2::1",
      "2001:db8::1",
      "5f00::1",
      "2002:a9fe:a9fe::1",
      "3fff::1",
      "::a9fe:a9fe",
      "::ffff:0:127.0.0.1",
      "::ffff:127.0.0.1",
      "::ffff:7f00:1",
      "0:0:0:0:0:ffff:7f00:1",
    ]) {
      expect(isBlockedOutboundIpForTest(ip), ip).toBe(true);
    }
  });

  it("allows representative public addresses, including dotted IPv4-mapped IPv6", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "192.0.1.1", "2001:4860:4860::8888", "2606:4700:4700::1111", "::ffff:8.8.8.8", "[::ffff:8.8.8.8]"]) {
      expect(isBlockedOutboundIpForTest(ip), ip).toBe(false);
    }
  });
  it("applies SSRF blocking when the input is a Request object", async () => {
    const request = new Request("http://127.0.0.1/private", {
      method: "GET",
      headers: { "x-test-header": "present" },
    });
    await expect(safeOutboundFetch(request)).rejects.toThrow("blocked IP address");
  });

});


describe("safe outbound HTTP response limits", () => {
  it("destroys a response that declares a body over the outbound byte cap", async () => {
    dnsMocks.resolve4.mockReset().mockResolvedValue(["93.184.216.34"]);
    dnsMocks.resolve6.mockReset().mockResolvedValue([]);
    dnsMocks.cancel.mockReset();

    const response = Object.assign(new EventEmitter(), {
      headers: { "content-length": String(MAX_SAFE_OUTBOUND_RESPONSE_BYTES + 1) },
      statusCode: 200,
      statusMessage: "OK",
      destroyed: false,
      resume: vi.fn(),
      destroy: vi.fn(),
    });
    response.destroy.mockImplementation((error?: Error) => {
      response.destroyed = true;
      if (error) response.emit("error", error);
      return response;
    });

    const request = Object.assign(new EventEmitter(), {
      setTimeout: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
      destroy: vi.fn(),
    });
    request.destroy.mockImplementation((error?: Error) => {
      if (error) request.emit("error", error);
      return request;
    });
    transportMocks.httpsRequest.mockImplementation((_options: unknown, onResponse: (value: typeof response) => void) => {
      request.end.mockImplementation(() => queueMicrotask(() => onResponse(response)));
      return request;
    });

    await expect(safeOutboundFetch("https://research.example/large-response")).rejects.toThrow(
      `Outbound response exceeds ${MAX_SAFE_OUTBOUND_RESPONSE_BYTES} byte limit`,
    );
    expect(response.destroy).toHaveBeenCalled();
    expect(response.destroyed).toBe(true);
    expect(response.resume).not.toHaveBeenCalled();
  });
});

describe("safe outbound HTTP deadline boundary", () => {
  it("aborts a stalled streamed request body instead of waiting forever", async () => {
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 10);
    try {
      const request = safeOutboundFetch("https://8.8.8.8/upload", {
        method: "POST",
        body: new ReadableStream<Uint8Array>({ start() {} }),
        signal: controller.signal,
      });
      await expect(request).rejects.toThrow("Outbound request aborted");
    } finally {
      clearTimeout(abortTimer);
    }
  });

  it("enforces one absolute budget before DNS and clears per-request timers on settlement", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/src/lib/ssrf-safe-fetch.ts"),
      "utf8",
    );
    expect(source).toContain("const REQUEST_DEADLINE_MS = 12_000;");
    expect(source).toContain(`deadlineTimer = setTimeout(() => req.destroy(new Error("Outbound request deadline exceeded")), REQUEST_DEADLINE_MS)`);
    expect(source).toContain("if (deadlineTimer) clearTimeout(deadlineTimer)");
    expect(source).toContain(`req.setTimeout(12_000, () => req.destroy(new Error("Outbound request timed out")))`);
    const safeFetch = source.slice(source.indexOf("export async function safeOutboundFetch"), source.indexOf("export function isBlockedOutboundIpForTest"));
    expect(safeFetch.indexOf("setTimeout(() => controller.abort")).toBeGreaterThanOrEqual(0);
    expect(safeFetch.indexOf("setTimeout(() => controller.abort")).toBeLessThan(safeFetch.indexOf("resolveSafeAddress(hostname, signal)"));
    expect(source).toContain("readRequestBodyCapped(init.body, signal)");
  });
});

describe("safe outbound HTTP response construction", () => {
  it("rejects upstream statuses that Fetch Response cannot represent", () => {
    expect(responseStatusForFetch(200)).toBe(200);
    expect(responseStatusForFetch(599)).toBe(599);
    for (const status of [undefined, 0, 100, 199, 600, 700, NaN]) {
      expect(responseStatusForFetch(status)).toBeNull();
    }
  });

  it("turns a missing upstream status into a rejected request instead of an uncaught Response RangeError", async () => {
    dnsMocks.resolve4.mockReset().mockResolvedValue(["93.184.216.34"]);
    dnsMocks.resolve6.mockReset().mockResolvedValue([]);
    dnsMocks.cancel.mockReset();

    const response = Object.assign(new EventEmitter(), {
      headers: {},
      statusCode: 0,
      statusMessage: "",
      destroyed: false,
      destroy: vi.fn(),
    });
    const request = Object.assign(new EventEmitter(), {
      setTimeout: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
      destroy: vi.fn(),
    });
    transportMocks.httpsRequest.mockImplementation((_options: unknown, onResponse: (value: typeof response) => void) => {
      request.end.mockImplementation(() => queueMicrotask(() => {
        onResponse(response);
        queueMicrotask(() => response.emit("end"));
      }));
      return request;
    });

    await expect(safeOutboundFetch("https://research.example/missing-status"))
      .rejects.toThrow("Outbound server returned invalid HTTP status 0");
  });

  it("uses a null body for HTTP statuses that forbid response bodies", () => {
    const payload = Buffer.from("response");
    expect(responseBodyForStatus(204, payload)).toBeNull();
    expect(responseBodyForStatus(205, payload)).toBeNull();
    expect(responseBodyForStatus(304, payload)).toBeNull();
    expect(responseBodyForStatus(200, payload)).toEqual(payload);
    expect(responseBodyForStatus(302, payload)).toEqual(payload);
  });
});
