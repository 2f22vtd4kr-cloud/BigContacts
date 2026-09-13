import { describe, expect, it } from "vitest";
import { isBlockedOutboundIpForTest } from "../lib/ssrf-safe-fetch";

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
      "ff02::1",
      "2001:db8::1",
      "::ffff:127.0.0.1",
      "::ffff:7f00:1",
      "0:0:0:0:0:ffff:7f00:1",
    ]) {
      expect(isBlockedOutboundIpForTest(ip), ip).toBe(true);
    }
  });

  it("allows representative public addresses", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "2001:4860:4860::8888"]) {
      expect(isBlockedOutboundIpForTest(ip), ip).toBe(false);
    }
  });
});
