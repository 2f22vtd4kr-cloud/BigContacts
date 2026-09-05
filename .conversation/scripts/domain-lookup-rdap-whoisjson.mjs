#!/usr/bin/env node
/**
 * Domain surface: RDAP-first, WhoisJSON fallback.
 * Env: WHOISJSON_API_KEY (optional). Whoxy skipped when balance 0.
 * Usage: node scripts/domain-lookup-rdap-whoisjson.mjs advanceturning.com
 */
const domain = (process.argv[2] || "").toLowerCase().replace(/^www\./, "");
if (!domain) {
  console.error("usage: node scripts/domain-lookup-rdap-whoisjson.mjs <domain>");
  process.exit(2);
}

async function rdap(d) {
  const tld = d.split(".").pop();
  const url =
    tld === "com" || tld === "net"
      ? `https://rdap.verisign.com/${tld}/v1/domain/${d}`
      : `https://rdap.org/domain/${d}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) return { ok: false, status: res.status };
  const j = await res.json();
  const events = Object.fromEntries(
    (j.events || []).map((e) => [e.eventAction, e.eventDate]),
  );
  return {
    ok: true,
    source: "rdap",
    ldhName: j.ldhName,
    status: j.status,
    registration: events.registration,
    expiration: events.expiration,
    registrarEntities: (j.entities || []).filter((e) => (e.roles || []).includes("registrar")),
  };
}

async function whoisjson(d) {
  const key = process.env.WHOISJSON_API_KEY;
  if (!key) return { ok: false, reason: "no WHOISJSON_API_KEY" };
  const res = await fetch(`https://whoisjson.com/api/v1/whois?domain=${encodeURIComponent(d)}`, {
    headers: { Authorization: `TOKEN=${key}` },
    signal: AbortSignal.timeout(15000),
  });
  const remaining = res.headers.get("remaining-requests");
  if (!res.ok) return { ok: false, status: res.status, remaining };
  const j = await res.json();
  return {
    ok: true,
    source: "whoisjson",
    remainingRequests: remaining,
    name: j.name,
    created: j.created,
    expires: j.expires,
    registrar: j.registrar,
    status: j.status,
    contactsPresent: Object.fromEntries(
      Object.entries(j.contacts || {}).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]),
    ),
  };
}

const out = { domain, rdap: await rdap(domain), whoisjson: await whoisjson(domain) };
console.log(JSON.stringify(out, null, 2));
