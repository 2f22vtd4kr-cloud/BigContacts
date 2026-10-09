import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isBlockedOutboundIpForTest, responseBodyForStatus, safeOutboundFetch } from "../lib/ssrf-safe-fetch";

describe("SSRF outbound boundary", () => {
  it("blocks loopback, RFC1918, link-local, multicast, reserved, metadata, and IPv4-mapped IPv6 addresses", () => {
    for (const ip of [
      "127.0.0.1",
      "10.0.0.1",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.169.254",
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
    for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "2001:4860:4860::8888", "2606:4700:4700::1111", "::ffff:8.8.8.8", "[::ffff:8.8.8.8]"]) {
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
    expect(source).toContain("deadlineTimer = setTimeout(() => req.destroy(new Error(\\"Outbound request deadline exceeded\\")), REQUEST_DEADLINE_MS)");
    expect(source).toContain("if (deadlineTimer) clearTimeout(deadlineTimer)");
    expect(source).toContain("req.setTimeout(12_000, () => req.destroy(new Error(\\"Outbound request timed out\\")))");
    const safeFetch = source.slice(source.indexOf("export async function safeOutboundFetch"), source.indexOf("export function isBlockedOutboundIpForTest"));
    expect(safeFetch.indexOf("setTimeout(() => controller.abort")).toBeGreaterThanOrEqual(0);
    expect(safeFetch.indexOf("setTimeout(() => controller.abort")).toBeLessThan(safeFetch.indexOf("resolveSafeAddress(hostname, signal)"));
    expect(source).toContain("readRequestBodyCapped(init.body, signal)");
  });
});

describe("safe outbound HTTP response construction", () => {
  it("uses a null body for HTTP statuses that forbid response bodies", () => {
    const payload = Buffer.from("response");
    expect(responseBodyForStatus(204, payload)).toBeNull();
    expect(responseBodyForStatus(205, payload)).toBeNull();
    expect(responseBodyForStatus(304, payload)).toBeNull();
    expect(responseBodyForStatus(200, payload)).toEqual(payload);
    expect(responseBodyForStatus(302, payload)).toEqual(payload);
  });
});
