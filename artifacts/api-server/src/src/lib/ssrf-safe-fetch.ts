/**
 * SSRF-safe outbound fetch boundary for autonomous Investigator web access.
 *
 * This is a network-safety guard, not a research allowlist: arbitrary public
 * HTTP(S) destinations remain eligible. Private, loopback, link-local,
 * multicast, reserved, and cloud-metadata destinations are rejected.
 * Redirects are deliberately NOT followed; callers receive the 3xx response
 * and the model can choose whether to inspect the advertised public URL.
 *
 * Hostname validation and connection are one operation here: the address used
 * by the socket is the address returned by the safety-checked DNS lookup. This
 * closes the DNS preflight -> native fetch resolution TOCTOU/rebinding window.
 */

import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";

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
    const [a, b, c] = octets;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 88 && c === 99) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }
  if (version === 6) {
    const compact = normalized.replace(/%.*$/, "");
    if (compact === "::1" || compact === "::") return true;
    if (/^ff/i.test(compact)) return true;
    if (/^fe[89ab]/i.test(compact)) return true;
    if (/^(fc|fd)/i.test(compact)) return true;
    if (/^2001:db8:/i.test(compact)) return true;
    if (/^::ffff:/i.test(compact)) return isBlockedIp(compact.slice(7));
    return false;
  }
  return true;
}

async function resolveSafeAddress(hostname: string): Promise<string | undefined> {
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) throw new Error("Outbound URL targets a blocked IP address");
    return hostname;
  }

  let records: Array<{ address: string }>;
  try {
    records = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("Outbound URL hostname could not be resolved safely");
  }
  if (!records.length || records.some((record) => isBlockedIp(record.address))) {
    throw new Error("Outbound URL resolves to a blocked IP address");
  }

  // Pin one safety-checked address. The socket's lookup callback below returns
  // this exact address, so Node does not perform a second DNS resolution.
  return records[0].address;
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
  await resolveSafeAddress(hostname);
  return url;
}

function requestHeaders(init: RequestInit, hostname: string, port: string): Record<string, string> {
  const headers: Record<string, string> = { "accept-encoding": "identity" };
  if (init.headers instanceof Headers) {
    init.headers.forEach((value, key) => { headers[key] = value; });
  } else if (Array.isArray(init.headers)) {
    for (const [key, value] of init.headers) headers[key] = value;
  } else if (init.headers) {
    for (const [key, value] of Object.entries(init.headers)) headers[key] = String(value);
  }
  if (!headers.host) headers.host = port ? `${hostname}:${port}` : hostname;
  return headers;
}

async function pinnedFetch(input: RequestInfo | URL, init: RequestInit, address: string): Promise<Response> {
  const rawUrl = typeof input === "string" || input instanceof URL ? String(input) : input.url;
  const url = new URL(rawUrl);
  const transport = url.protocol === "https:" ? https : http;
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  const method = init.method || (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET");
  const body = init.body == null ? undefined : typeof init.body === "string" ? Buffer.from(init.body) : Buffer.from(await new Response(init.body as BodyInit).arrayBuffer());
  const signal = init.signal;

  return new Promise<Response>((resolve, reject) => {
    let settled = false;
    const finishError = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error instanceof Error ? error : new Error(String(error)));
    };
    const req = transport.request({
      protocol: url.protocol,
      hostname: address,
      port,
      method,
      path: `${url.pathname}${url.search}` || "/",
      headers: requestHeaders(init, url.hostname, url.port),
      ...(url.protocol === "https:" ? { servername: url.hostname } : {}),
      lookup: (_hostname, _options, callback) => callback(null, address, net.isIP(address) as 4 | 6),
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      res.on("end", () => {
        if (settled) return;
        settled = true;
        const headers = new Headers();
        for (const [key, value] of Object.entries(res.headers)) {
          if (Array.isArray(value)) headers.set(key, value.join(", "));
          else if (value != null) headers.set(key, value);
        }
        resolve(new Response(Buffer.concat(chunks), { status: res.statusCode ?? 0, statusText: res.statusMessage ?? "", headers }));
      });
      res.on("error", finishError);
    });
    req.on("error", finishError);
    req.setTimeout(12_000, () => req.destroy(new Error("Outbound request timed out")));

    const abort = () => req.destroy(new Error("Outbound request aborted"));
    if (signal?.aborted) return abort();
    signal?.addEventListener("abort", abort, { once: true });

    if (body) req.write(body);
    req.end();
  });
}

/**
 * Validate every requested destination while disabling automatic redirects.
 * DNS is resolved once by the safety layer and that exact address is pinned to
 * the socket, eliminating the preflight/native-fetch DNS rebinding window.
 */
export async function safeOutboundFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const nextUrl = typeof input === "string" || input instanceof URL ? String(input) : input.url;
  const validated = await assertSafeOutboundUrl(nextUrl);
  const hostname = validated.hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
  const address = await resolveSafeAddress(hostname);
  if (!address) throw new Error("Outbound URL could not be pinned safely");
  return pinnedFetch(input, { ...init, redirect: "manual" }, address);
}

export function isBlockedOutboundIpForTest(address: string): boolean {
  return isBlockedIp(address);
}
