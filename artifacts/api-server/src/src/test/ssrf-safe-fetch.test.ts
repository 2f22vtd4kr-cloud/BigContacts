import { describe, expect, it } from "vitest";
import { assertSafeOutboundUrl, isBlockedOutboundIpForTest } from "../lib/ssrf-safe-fetch";

describe("SSRF outbound boundary", () => {
  it("blocks loopback, RFC1918, link-local, multicast, and metadata addresses", () => {
    for (const ip of [
      "127.0.0.1",
      "10.0.0.1",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.169.254",
      "224.0.0.1",
      "::1",
      "fd00::1",
      "fe80::1",
      "ff02::1",
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
});
