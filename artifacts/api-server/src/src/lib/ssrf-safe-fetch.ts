/**
 * SSRF-safe outbound fetch boundary for autonomous Investigator web access.
 *
 * This is a network-safety guard, not a research allowlist: arbitrary public
 * HTTP(S) destinations remain eligible. Private, loopback, link-local,
 * multicast, reserved, and cloud-metadata destinations are rejected.
 * Redirects are followed manually so every hop is revalidated.
 */

import { lookup } from "node:dns/promises";
import net from "node:net";

const MAX_REDIRECTS = 8;
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
]);

function isBlockedIp(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");
  const version = net.isIP(normalized);
  if (version === 4) {
    const octets = normalized.split(".").map(Number);
    const [a, b] = octets;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a >= 224) ||
      (a === 255 && b === 255)
    );
  }
  if (version === 6) {
    const compact = normalized.replace(/%.*$/, "");
    if (compact === "::1" || compact === "::") return true;
    if (/^ff/i.test(compact)) return true; // multicast
    if (/^fe[89ab]/i.test(compact)) return true; // link-local
    if (/^(fc|fd)/i.test(compact)) return true; // unique-local
    if (/^::ffff:/i.test(compact)) {
      const mapped = compact.slice(7);
      return isBlockedIp(mapped);
    }
    return false;
  }
  return true;
}

export async function assertSafeOutboundUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Outbound URL is invalid");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Outbound URL must use HTTP(S)");
  }
  if (url.username || url.password) {
    throw new Error("Outbound URL credentials are not permitted");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
  if (!hostname || BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error("Outbound URL targets a blocked host");
  }
  if (net.isIP(hostname) && isBlockedIp(hostname)) {
    throw new Error("Outbound URL targets a blocked IP address");
  }
  if (!net.isIP(hostname)) {
    let records: Array<{ address: string }>;
    try {
      records = await lookup(hostname, { all: true, verbatim: true });
    } catch {
      throw new Error("Outbound URL hostname could not be resolved safely");
    }
    if (!records.length || records.some((record) => isBlockedIp(record.address))) {
      throw new Error("Outbound URL resolves to a blocked IP address");
    }
  }
  return url;
}

/**
 * Fetch with redirect validation. The native fetch implementation is injected
 * so this boundary can wrap Node's fetch without changing the research tools.
 */
export async function safeOutboundFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  nativeFetch: typeof fetch = fetch,
): Promise<Response> {
  let nextUrl = typeof input === "string" || input instanceof URL ? String(input) : input.url;
  let redirects = 0;

  while (true) {
    const validated = await assertSafeOutboundUrl(nextUrl);
    const response = await nativeFetch(validated, { ...init, redirect: "manual" });
    if (response.status < 300 || response.status >= 400) return response;

    const location = response.headers.get("location");
    if (!location) return response;
    redirects += 1;
    if (redirects > MAX_REDIRECTS) throw new Error("Outbound redirect limit exceeded");
    nextUrl = new URL(location, validated).toString();
  }
}

export function isBlockedOutboundIpForTest(address: string): boolean {
  return isBlockedIp(address);
}
