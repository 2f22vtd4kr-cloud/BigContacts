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
 * by the socket is the address returned by the safety-checked DNS lookup.
 */
import { Resolver } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { getAgenticSelectedInvestigator } from "./agentic-execution-context";

const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain", "metadata.google.internal", "metadata"]);
const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_REQUEST_BYTES = 1_000_000;
const DNS_TIMEOUT_MS = 10_000;

function isBlockedIp(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");
  const version = net.isIP(normalized);
  if (version === 4) {
    const octets = normalized.split(".").map(Number);
    const [a, b, c] = octets;
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 0) || (a === 192 && b === 168) || (a === 192 && b === 88 && c === 99) || (a === 192 && b === 0 && c === 2) || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113) || a >= 224;
  }
  if (version === 6) {
    const compact = normalized.replace(/%.*$/, "");
    if (compact === "::1" || compact === "::") return true;
    if (/^ff/i.test(compact) || /^fe[89ab]/i.test(compact) || /^(fc|fd)/i.test(compact) || /^2001:db8:/i.test(compact)) return true;
    if (/^::ffff:/i.test(compact)) return isBlockedIp(compact.slice(7));
    return false;
  }
  return true;
}

async function resolveSafeAddress(hostname: string, signal?: AbortSignal): Promise<string> {
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) throw new Error("Outbound URL targets a blocked IP address");
    return hostname;
  }
  if (signal?.aborted) throw new Error("Outbound DNS resolution aborted");
  const resolver = new Resolver({ timeout: DNS_TIMEOUT_MS, tries: 1 });
  let abort: (() => void) | undefined;
  try {
    const addresses = await new Promise<Array<{ address: string }>>((resolve, reject) => {
      let settled = false;
      const cleanup = () => { if (abort && signal) signal.removeEventListener("abort", abort); abort = undefined; };
      const finishError = (error: unknown) => { if (settled) return; settled = true; cleanup(); reject(error instanceof Error ? error : new Error(String(error))); };
      const finishSuccess = (value: Array<{ address: string }>) => { if (settled) return; settled = true; cleanup(); resolve(value); };
      abort = () => { resolver.cancel(); finishError(new Error("Outbound DNS resolution aborted")); };
      if (signal?.aborted) return abort();
      signal?.addEventListener("abort", abort, { once: true });
      resolver.resolve4(hostname).then(
        (ipv4) => resolver.resolve6(hostname).then(
          (ipv6) => finishSuccess([...ipv4.map((address) => ({ address })), ...ipv6.map((address) => ({ address }))]),
          (error) => { if ((error as NodeJS.ErrnoException)?.code === "ENODATA" || (error as NodeJS.ErrnoException)?.code === "ENOTFOUND") finishSuccess(ipv4.map((address) => ({ address }))); else finishError(error); },
        ),
        (error) => {
          if ((error as NodeJS.ErrnoException)?.code === "ENODATA" || (error as NodeJS.ErrnoException)?.code === "ENOTFOUND") {
            resolver.resolve6(hostname).then((ipv6) => finishSuccess(ipv6.map((address) => ({ address }))), (ipv6Error) => { if ((ipv6Error as NodeJS.ErrnoException)?.code === "ENODATA" || (ipv6Error as NodeJS.ErrnoException)?.code === "ENOTFOUND") finishSuccess([]); else finishError(ipv6Error); });
          } else finishError(error);
        },
      );
    });
    if (!addresses.length || addresses.some((record) => isBlockedIp(record.address))) throw new Error("Outbound URL resolves to a blocked IP address");
    return addresses[0].address;
  } catch (error) {
    if (signal?.aborted) throw new Error("Outbound DNS resolution aborted");
    throw new Error(error instanceof Error && error.message === "Outbound DNS resolution aborted" ? error.message : "Outbound URL hostname could not be resolved safely");
  } finally { resolver.cancel(); }
}
function parseSafeUrl(rawUrl: string): URL { let url: URL; try { url = new URL(rawUrl); } catch { throw new Error("Outbound URL is invalid"); } if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Outbound URL must use HTTP(S)"); if (url.username || url.password) throw new Error("Outbound URL credentials are not permitted"); const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, ""); if (!hostname || BLOCKED_HOSTNAMES.has(hostname)) throw new Error("Outbound URL targets a blocked host"); return url; }
export async function assertSafeOutboundUrl(rawUrl: string): Promise<URL> { const url = parseSafeUrl(rawUrl); await resolveSafeAddress(url.hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "")); return url; }
function requestHeaders(init: RequestInit, hostname: string, port: string): Record<string, string> { const headers: Record<string, string> = { "accept-encoding": "identity" }; if (init.headers instanceof Headers) init.headers.forEach((value, key) => { headers[key] = value; }); else if (Array.isArray(init.headers)) for (const [key, value] of init.headers) headers[key] = value; else if (init.headers) for (const [key, value] of Object.entries(init.headers)) headers[key] = String(value); if (!headers.host) headers.host = port ? `${hostname}:${port}` : hostname; return headers; }
async function readRequestBodyCapped(body: BodyInit | null | undefined): Promise<Buffer | undefined> { if (body == null) return undefined; const content = new Response(body).body; if (!content) return Buffer.alloc(0); const reader = content.getReader(); const chunks: Buffer[] = []; let bytes = 0; try { while (true) { const { done, value } = await reader.read(); if (done) break; const chunk = Buffer.from(value); bytes += chunk.byteLength; if (bytes > MAX_REQUEST_BYTES) { await reader.cancel(); throw new Error(`Outbound request exceeds ${MAX_REQUEST_BYTES} byte limit`); } chunks.push(chunk); } return Buffer.concat(chunks); } finally { reader.releaseLock(); } }
async function pinnedFetch(input: RequestInfo | URL, init: RequestInit, address: string): Promise<Response> { const rawUrl = typeof input === "string" || input instanceof URL ? String(input) : input.url; const url = new URL(rawUrl); const transport = url.protocol === "https:" ? https : http; const port = url.port || (url.protocol === "https:" ? "443" : "80"); const method = init.method || (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET"); const headers = requestHeaders(init, url.hostname, url.port); const declaredRequestBytes = Number(headers["content-length"] ?? NaN); if (Number.isFinite(declaredRequestBytes) && declaredRequestBytes > MAX_REQUEST_BYTES) throw new Error(`Outbound request exceeds ${MAX_REQUEST_BYTES} byte limit`); const body = await readRequestBodyCapped(init.body); const signal = init.signal; return new Promise<Response>((resolve, reject) => { let settled = false; let abort: (() => void) | undefined; const cleanup = () => { if (abort && signal) signal.removeEventListener("abort", abort); abort = undefined; }; const finishError = (error: unknown) => { if (settled) return; settled = true; cleanup(); reject(error instanceof Error ? error : new Error(String(error))); }; const req = transport.request({ protocol: url.protocol, hostname: address, port, method, path: `${url.pathname}${url.search}` || "/", headers, ...(url.protocol === "https:" ? { servername: url.hostname } : {}), lookup: (_hostname, _options, callback) => callback(null, address, net.isIP(address) as 4 | 6) }, (res) => { const declared = Number(res.headers["content-length"] ?? NaN); if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) { res.resume(); finishError(new Error(`Outbound response exceeds ${MAX_RESPONSE_BYTES} byte limit`)); return; } const chunks: Buffer[] = []; let bytes = 0; res.on("data", (chunk) => { const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); bytes += buffer.byteLength; if (bytes > MAX_RESPONSE_BYTES) { res.destroy(new Error(`Outbound response exceeds ${MAX_RESPONSE_BYTES} byte limit`)); return; } chunks.push(buffer); }); res.on("end", () => { if (settled) return; settled = true; cleanup(); const responseHeaders = new Headers(); for (const [key, value] of Object.entries(res.headers)) { if (Array.isArray(value)) responseHeaders.set(key, value.join(", ")); else if (value != null) responseHeaders.set(key, value); } resolve(new Response(Buffer.concat(chunks), { status: res.statusCode ?? 0, statusText: res.statusMessage ?? "", headers: responseHeaders })); }); res.on("error", finishError); }); req.on("error", finishError); req.setTimeout(12_000, () => req.destroy(new Error("Outbound request timed out"))); abort = () => req.destroy(new Error("Outbound request aborted")); if (signal?.aborted) return abort(); signal?.addEventListener("abort", abort, { once: true }); if (body) req.write(body); req.end(); }); }

export async function safeOutboundFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> { const nextUrl = typeof input === "string" || input instanceof URL ? String(input) : input.url; const validated = parseSafeUrl(nextUrl); const selectedInvestigator = getAgenticSelectedInvestigator(); if (selectedInvestigator) { const hostname = validated.hostname.toLowerCase(); const isGroq = hostname === "api.groq.com" || hostname.endsWith(".groq.com"); const isMistral = hostname === "api.mistral.ai" || hostname.endsWith(".mistral.ai"); if ((selectedInvestigator === "groq" && isMistral) || (selectedInvestigator === "mistral" && isGroq)) throw new Error(`Cross-provider Investigator fallback blocked: Boss selected ${selectedInvestigator}`); } const hostname = validated.hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, ""); const address = await resolveSafeAddress(hostname, init.signal ?? undefined); return pinnedFetch(input, { ...init, redirect: "manual" }, address); }
export function isBlockedOutboundIpForTest(address: string): boolean { return isBlockedIp(address); }
export const MAX_SAFE_OUTBOUND_RESPONSE_BYTES = MAX_RESPONSE_BYTES;
export const MAX_SAFE_OUTBOUND_REQUEST_BYTES = MAX_REQUEST_BYTES;
export const SAFE_OUTBOUND_DNS_TIMEOUT_MS = DNS_TIMEOUT_MS;
