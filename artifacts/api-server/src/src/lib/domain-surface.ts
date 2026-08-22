/**
 * Domain surface: RDAP-first + WhoisJSON fallback.
 * Fail-closed: never invent registrant contacts. Privacy-redacted WHOIS returns
 * registration dates / registrar only (useful as longevity / ownership-stability signal).
 * Env: WHOISJSON_API_KEY (optional). Whoxy skipped (balance 0).
 */

export type DomainSurfaceResult = {
  domain: string;
  rdap: {
    ok: boolean;
    source?: string;
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
  /** Human-readable summary for trajectory / findings note */
  summary: string;
};

function cleanDomain(d: string): string {
  return d.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].trim();
}

async function rdapLookup(domain: string): Promise<DomainSurfaceResult["rdap"]> {
  const tld = domain.split(".").pop() || "";
  const url =
    tld === "com" || tld === "net"
      ? `https://rdap.verisign.com/${tld}/v1/domain/${domain}`
      : `https://rdap.org/domain/${domain}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return { ok: false, error: `rdap ${res.status}` };
    const j = await res.json();
    const events = Object.fromEntries(
      (j.events || []).map((e: { eventAction: string; eventDate: string }) => [e.eventAction, e.eventDate]),
    );
    let registrarName: string | null = null;
    for (const ent of j.entities || []) {
      if ((ent.roles || []).includes("registrar")) {
        const vcard = ent.vcardArray?.[1] || [];
        for (const row of vcard) {
          if (Array.isArray(row) && row[0] === "fn" && row[3]) {
            registrarName = String(row[3]);
            break;
          }
        }
      }
    }
    return {
      ok: true,
      source: "rdap",
      status: j.status,
      registration: events.registration || null,
      expiration: events.expiration || null,
      registrarName,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "rdap fetch failed" };
  }
}

async function whoisjsonLookup(domain: string): Promise<DomainSurfaceResult["whoisjson"]> {
  const key = process.env.WHOISJSON_API_KEY || process.env.WHOISJSON_KEY || "";
  if (!key) return { ok: false, error: "no WHOISJSON_API_KEY" };
  try {
    const res = await fetch(`https://whoisjson.com/api/v1/whois?domain=${encodeURIComponent(domain)}`, {
      headers: { Authorization: `TOKEN=${key}` },
      signal: AbortSignal.timeout(15000),
    });
    const remaining = res.headers.get("remaining-requests");
    if (!res.ok) return { ok: false, remainingRequests: remaining, error: `whoisjson ${res.status}` };
    const j = await res.json();
    return {
      ok: true,
      remainingRequests: remaining,
      created: j.created || null,
      expires: j.expires || null,
      registrarName: j.registrar?.name || null,
      contactsPresent: Object.fromEntries(
        Object.entries(j.contacts || {}).map(([k, v]) => [k, Array.isArray(v) ? (v as any[]).length : 0]),
      ),
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "whoisjson fetch failed" };
  }
}

export async function lookupDomainSurface(rawDomain: string): Promise<DomainSurfaceResult> {
  const domain = cleanDomain(rawDomain);
  if (!domain || !domain.includes(".")) {
    return {
      domain: domain || "",
      rdap: { ok: false, error: "invalid domain" },
      whoisjson: { ok: false, error: "invalid domain" },
      summary: "invalid domain",
    };
  }
  const [rdap, whoisjson] = await Promise.all([rdapLookup(domain), whoisjsonLookup(domain)]);
  const parts: string[] = [];
  if (rdap.ok) {
    if (rdap.registration) parts.push(`registered ${rdap.registration.slice(0, 10)}`);
    if (rdap.expiration) parts.push(`expires ${rdap.expiration.slice(0, 10)}`);
    if (rdap.registrarName) parts.push(`registrar ${rdap.registrarName}`);
  } else if (whoisjson.ok) {
    if (whoisjson.created) parts.push(`created ${String(whoisjson.created).slice(0, 10)}`);
    if (whoisjson.expires) parts.push(`expires ${String(whoisjson.expires).slice(0, 10)}`);
    if (whoisjson.registrarName) parts.push(`registrar ${whoisjson.registrarName}`);
  }
  const summary = parts.length
    ? `Domain ${domain}: ${parts.join("; ")}`
    : `Domain ${domain}: lookup incomplete (privacy or error)`;
  return { domain, rdap, whoisjson, summary };
}

/** Convert domain surface into agentic findings (fail-closed — no invented contacts). */
export function findingsFromDomainSurface(
  surface: DomainSurfaceResult,
  sourceUrl: string,
): Array<{
  vectorType: "other" | "website";
  value: string;
  personName: null;
  role: string | null;
  scope: "organization";
  sourceUrls: string[];
  note: string;
}> {
  const out: Array<{
    vectorType: "other" | "website";
    value: string;
    personName: null;
    role: string | null;
    scope: "organization";
    sourceUrls: string[];
    note: string;
  }> = [];
  if (!surface.domain) return out;
  const reg = surface.rdap.registration || surface.whoisjson.created;
  if (reg) {
    out.push({
      vectorType: "other",
      value: `domain_registration:${surface.domain}:${String(reg).slice(0, 10)}`,
      personName: null,
      role: "domain_registration",
      scope: "organization",
      sourceUrls: [sourceUrl],
      note: surface.summary,
    });
  }
  if (surface.rdap.registrarName || surface.whoisjson.registrarName) {
    out.push({
      vectorType: "other",
      value: `domain_registrar:${surface.domain}:${surface.rdap.registrarName || surface.whoisjson.registrarName}`,
      personName: null,
      role: "domain_registrar",
      scope: "organization",
      sourceUrls: [sourceUrl],
      note: surface.summary,
    });
  }
  return out;
}
