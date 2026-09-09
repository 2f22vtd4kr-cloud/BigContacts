import { describe, expect, it } from "vitest";
import { assertSafeOutboundUrl, isBlockedOutboundIpForTest, safeOutboundFetch } from "../lib/ssrf-safe-fetch";

describe("SSRF outbound boundary", () => {
  it("blocks loopback, RFC1918, link-local, multicast, reserved, and metadata addresses", () => {
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
      "ff02::1",
      "2001:db8::1",
      "::ffff:127.0.0.1",
    ]) {
      expect(isBlockedOutboundIpForTest(ip), ip).toBe(true);
    }
  });

  it("allows ordinary public HTTP(S) URLs", async () => {
    await expect(assertSafeOutboundUrl("https://example.com/research")).resolves.toBeInstanceOf(URL);
    await expect(assertSafeOutboundUrl("http://example.com:8080/page")).resolves.toBeInstanceOf(URL);
  });

  it("rejects non-HTTP schemes and embedded credentials", async () => {
    await expect(assertSafeOutboundUrl("file:///etc/passwd")).rejects.toThrow("HTTP(S)");
    await expect(assertSafeOutboundUrl("https://user:pass@example.com/")).rejects.toThrow("credentials");
  });

  it("disables automatic redirect following", async () => {
    let seenRedirect: RequestInit | undefined;
    const response = new Response(null, { status: 302, headers: { location: "http://127.0.0.1/" } });
    const nativeFetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      seenRedirect = init;
      return response;
    };
    const result = await safeOutboundFetch("https://example.com/redirect", {}, nativeFetch as typeof fetch);
    expect(result.status).toBe(302);
    expect(seenRedirect?.redirect).toBe("manual");
  });
});
