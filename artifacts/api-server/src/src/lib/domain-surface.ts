/**
 * Domain surface: RDAP-first + WhoisJSON fallback.
 * Fail-closed: never invent registrant contacts. Privacy-redacted WHOIS returns
 * registration dates / registrar only (useful as longevity / ownership-stability signal).
 * Env: WHOISJSON_API_KEY (optional). Whoxy skipped (balance 0).
 */

import { safeOutboundFetch } from "./ssrf-safe-fetch";
import { runProviderCall } from "./provider-gate";

export type DomainSurfaceResult = {
  domain: string;
  rdap: {
    ok: boolean;
    source?: string;
    sourceUrl?: string;
    status?: string | string[];
    registration?: string | null;
    expiration?: string | null;
    registrarName?: string | null;
    error?: string;
  };
  whoisjson: {
    ok: boolean;
    remainingRequests?: string | null;
    created?: string | null;
    expires?: string | null;
    registrarName?: string | null;
    contactsPresent?: Record<string, number>;
    error?: string;
  };
  summary: string;
};

function cleanDomain(d: string): string {
  return d.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].trim();
}

const MAX_RDAP_REDIRECTS = 4;
const RDAP_REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const RDAP_CREDENTIAL_QUERY_PARAMETER = /^(?:api[_-]?key|apikey|key|token|api[_-]?token|access[_-]?token|client[_-]?secret|secret|password|authorization|signature|sig|x-api-key|x-auth-token)$/i;

function safeRdapSourceUrl(url: URL): string | undefined {
  if (url.username || url.password) return undefined;
  if ([...url.searchParams.keys()].some((name) => RDAP_CREDENTIAL_QUERY_PARAMETER.test(name))) return undefined;
  const safeUrl = new URL(url.href);
  safeUrl.hash = "";
  return safeUrl.toString();
}

async function fetchRdapResponse(
  domain: string,
  initialUrl: string,
  signal: AbortSignal,
): Promise<{ response: Response; sourceUrl?: string }> {
  let currentUrl = new URL(initialUrl);
  const visited = new Set<string>();
  let redirectsFollowed = 0;

  for (;;) {
    if (signal.aborted) throw new Error("cancelled");
    currentUrl.hash = "";
    const currentKey = currentUrl.toString();
    if (visited.has(currentKey)) throw new Error("RDAP redirect loop detected");
    visited.add(currentKey);

    // Count and govern every actual network request; a redirect chain is not a
    // quota-free way around the provider gate. safeOutboundFetch revalidates DNS
    // and pins the socket IP independently for each hop.
    const response = await runProviderCall(
      { provider: "rdap", account: domain, signal },
      () => safeOutboundFetch(currentUrl, {
        signal,
        headers: { Accept: "application/rdap+json, application/json" },
      }),
    );
    const location = response.headers.get("location");
    if (!RDAP_REDIRECT_STATUSES.has(response.status) || !location) {
      return { response, sourceUrl: safeRdapSourceUrl(currentUrl) };
    }
    if (redirectsFollowed >= MAX_RDAP_REDIRECTS) {
      if (response.body) await response.body.cancel().catch(() => undefined);
      throw new Error(`RDAP redirect limit exceeded (${MAX_RDAP_REDIRECTS})`);
    }

    let nextUrl: URL;
    try {
      nextUrl = new URL(location, currentUrl);
    } catch {
      if (response.body) await response.body.cancel().catch(() => undefined);
      throw new Error("RDAP redirect location is invalid");
    }
    nextUrl.hash = "";
    // RDAP redirects are untrusted control data. Keep the canonical lookup
    // HTTPS-only, reject URL userinfo, and let the safe transport validate the
    // actual DNS/IP destination before every outbound connection.
    if (nextUrl.protocol !== "https:") {
      if (response.body) await response.body.cancel().catch(() => undefined);
      throw new Error("RDAP redirect refused: target must use HTTPS");
    }
    if (nextUrl.username || nextUrl.password) {
      if (response.body) await response.body.cancel().catch(() => undefined);
      throw new Error("RDAP redirect refused: URL credentials are not permitted");
    }
    if (visited.has(nextUrl.toString())) {
      if (response.body) await response.body.cancel().catch(() => undefined);
      throw new Error("RDAP redirect loop detected");
    }

    if (response.body) await response.body.cancel().catch(() => undefined);
    currentUrl = nextUrl;
    redirectsFollowed += 1;
  }
}

async function rdapLookup(domain: string, signal?: AbortSignal): Promise<DomainSurfaceResult["rdap"]> {
  const tld = domain.split(".").pop() || "";
  const url = tld === "com" || tld === "net"
    ? `https://rdap.verisign.com/${tld}/v1/domain/${domain}`
    : `https://rdap.org/domain/${domain}`;
  const requestTimeout = AbortSignal.timeout(12_000);
  const requestSignal = signal ? AbortSignal.any([signal, requestTimeout]) : requestTimeout;
  try {
    const { response: res, sourceUrl } = await fetchRdapResponse(domain, url, requestSignal);
    if (!res.ok) return { ok: false, error: `rdap ${res.status}` };
    const j = await res.json() as {
      events?: Array<{ eventAction: string; eventDate: string }>;
      entities?: Array<{ roles?: string[]; vcardArray?: unknown[] }>;
      status?: string[];
    };
    const events = Object.fromEntries((j.events || []).map((e) => [e.eventAction, e.eventDate]));
    let registrarName: string | null = null;
    for (const ent of j.entities || []) {
      if ((ent.roles || []).includes("registrar")) {
        const vcard = Array.isArray(ent.vcardArray?.[1]) ? ent.vcardArray[1] as unknown[] : [];
        for (const row of vcard) {
          if (Array.isArray(row) && row[0] === "fn" && row[3]) {
            registrarName = String(row[3]);
            break;
          }
        }
      }
    }
    return { ok: true, source: "rdap", sourceUrl, status: j.status, registration: events.registration || null, expiration: events.expiration || null, registrarName };
  } catch (e: any) {
    return { ok: false, error: e?.message || "rdap fetch failed" };
  }
}

async function whoisjsonLookup(domain: string, signal?: AbortSignal): Promise<DomainSurfaceResult["whoisjson"]> {
  const key = process.env.WHOISJSON_API_KEY || process.env.WHOISJSON_KEY || "";
  if (!key) return { ok: false, error: "no WHOISJSON_API_KEY" };
  try {
    const res = await safeOutboundFetch(`https://whoisjson.com/api/v1/whois?domain=${encodeURIComponent(domain)}`, {
      headers: { Authorization: `TOKEN=${key}`, Accept: "application/json" },
      signal: signal ?? AbortSignal.timeout(15_000),
    });
    const remaining = res.headers.get("remaining-requests");
    if (!res.ok) return { ok: false, remainingRequests: remaining, error: `whoisjson ${res.status}` };
    const j = await res.json() as { created?: string; expires?: string; registrar?: { name?: string }; contacts?: Record<string, unknown> };
    return {
      ok: true,
      remainingRequests: remaining,
      created: j.created || null,
      expires: j.expires || null,
      registrarName: j.registrar?.name || null,
      contactsPresent: Object.fromEntries(Object.entries(j.contacts || {}).map(([k, v]) => [k, Array.isArray(v) ? (v as any[]).length : 0])),
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "whoisjson fetch failed" };
  }
}

export type DomainLookupProvider = "rdap" | "whoisjson";
/** Keep adapter response status aligned with the actual selected provider result. */
export function domainSurfaceExecutionStatus(
  surface: Pick<DomainSurfaceResult, "rdap" | "whoisjson">,
  provider: DomainLookupProvider,
): "success" | "error" {
  return (provider === "rdap" ? surface.rdap.ok : surface.whoisjson.ok) ? "success" : "error";
}

export async function lookupDomainSurface(rawDomain: string, options: { provider: DomainLookupProvider; signal?: AbortSignal } ): Promise<DomainSurfaceResult> {
  const domain = cleanDomain(rawDomain);
  if (!domain || !domain.includes(".")) {
    return { domain: domain || "", rdap: { ok: false, error: "invalid domain" }, whoisjson: { ok: false, error: "invalid domain" }, summary: "invalid domain" };
  }
  if (options.signal?.aborted) throw new Error("cancelled");
  let rdap: DomainSurfaceResult["rdap"] = { ok: false, error: "not selected" };
  let whoisjson: DomainSurfaceResult["whoisjson"] = { ok: false, error: "not selected" };
  if (options.provider === "rdap") {
    rdap = await rdapLookup(domain, options.signal);
  } else {
    whoisjson = await runProviderCall({ provider: "whoisjson", account: domain, signal: options.signal }, () => whoisjsonLookup(domain, options.signal));
  }
  if (options.signal?.aborted) throw new Error("cancelled");
  const parts: string[] = [];
  if (rdap.ok) {
    const status = Array.isArray(rdap.status) ? rdap.status.join(", ") : rdap.status;
    if (status) parts.push(`status ${status}`);
    if (rdap.registration) parts.push(`registered ${rdap.registration.slice(0, 10)}`);
    if (rdap.expiration) parts.push(`expires ${rdap.expiration.slice(0, 10)}`);
    if (rdap.registrarName) parts.push(`registrar ${rdap.registrarName}`);
  } else if (whoisjson.ok) {
    if (whoisjson.created) parts.push(`created ${String(whoisjson.created).slice(0, 10)}`);
    if (whoisjson.expires) parts.push(`expires ${String(whoisjson.expires).slice(0, 10)}`);
    if (whoisjson.registrarName) parts.push(`registrar ${whoisjson.registrarName}`);
  }
  const selectedOk = options.provider === "rdap" ? rdap.ok : whoisjson.ok;
  const summary = parts.length
    ? `Domain ${domain}: ${parts.join("; ")}`
    : selectedOk
      ? `Domain ${domain}: ${options.provider} returned a valid response without registration dates or registrar details`
      : `Domain ${domain}: ${options.provider} returned no usable surface`;
  return { domain, rdap, whoisjson, summary };
}

/** Convert domain surface into agentic findings (fail-closed — no invented contacts). */
export function findingsFromDomainSurface(
  surface: DomainSurfaceResult,
  sourceUrl: string,
): Array<{ vectorType: "other" | "website"; value: string; personName: null; role: string | null; scope: "organization"; sourceUrls: string[]; note: string }> {
  const out: Array<{ vectorType: "other" | "website"; value: string; personName: null; role: string | null; scope: "organization"; sourceUrls: string[]; note: string }> = [];
  if (!surface.domain) return out;
  const reg = surface.rdap.registration || surface.whoisjson.created;
  if (reg) out.push({ vectorType: "other", value: `domain_registration:${surface.domain}:${String(reg).slice(0, 10)}`, personName: null, role: "domain_registration", scope: "organization", sourceUrls: [sourceUrl], note: surface.summary });
  if (surface.rdap.registrarName || surface.whoisjson.registrarName) out.push({ vectorType: "other", value: `domain_registrar:${surface.domain}:${surface.rdap.registrarName || surface.whoisjson.registrarName}`, personName: null, role: "domain_registrar", scope: "organization", sourceUrls: [sourceUrl], note: surface.summary });
  return out;
}
