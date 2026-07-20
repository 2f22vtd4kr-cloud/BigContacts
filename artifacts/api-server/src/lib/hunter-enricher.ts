/**
 * Hunter.io + Apollo.io Email/LinkedIn Enricher
 *
 * Requires one or both of:
 *   HUNTER_API_KEY  — https://hunter.io (free tier: 25 searches/month)
 *   APOLLO_API_KEY  — https://app.apollo.io (free tier: 50 exports/month)
 *
 * Strategy:
 *   1. Hunter.io email-finder (individual + known domain) — highest precision
 *   2. Hunter.io domain-search (corp/trust with known domain)
 *   3. Apollo.io people/match (individual, broader coverage)
 */

import { logger } from "./logger";

export interface HunterEnrichResult {
  email:       string | null;
  linkedinUrl: string | null;
  phone:       string | null;
  source:      string;
}

// ── Domain extraction ─────────────────────────────────────────────────────────
function guessDomain(metadata?: string | null): string | null {
  if (!metadata) return null;
  try {
    const meta = JSON.parse(metadata) as Record<string, unknown>;
    if (typeof meta["domain"] === "string" && meta["domain"]) return meta["domain"] as string;
    if (typeof meta["website"] === "string" && meta["website"]) {
      return (meta["website"] as string)
        .replace(/https?:\/\/(www\.)?/, "")
        .split("/")[0]
        ?.split("?")[0] ?? null;
    }
  } catch { /* not JSON */ }
  return null;
}

/**
 * Normalize a name that may be in ALL-CAPS LAST FIRST format (e.g. FAA/EDGAR)
 * to Title Case First Last (e.g. "THIEL PETER" → "Peter Thiel").
 *
 * Detection: if the entire name is uppercase (excluding spaces/initials) it is
 * treated as LAST FIRST [MIDDLE…] and reordered.
 */
function normalizeName(fullName: string): string {
  const trimmed = fullName.trim();
  const isAllCaps = trimmed === trimmed.toUpperCase() && /[A-Z]{2}/.test(trimmed);
  if (!isAllCaps) return trimmed; // already mixed-case; trust as-is

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    // Single token — just title-case it
    return parts[0]!.charAt(0).toUpperCase() + parts[0]!.slice(1).toLowerCase();
  }

  // FAA format: LAST FIRST [MIDDLE…]
  // Reorder to FIRST [MIDDLE…] LAST and title-case each token
  const titleCase = (s: string) =>
    s.length <= 2
      ? s.toUpperCase()           // preserve initials like "L", "D", "A"
      : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  const [last, ...rest] = parts as [string, ...string[]];
  return [...rest, last].map(titleCase).join(" ");
}

function splitName(rawName: string): { firstName: string; lastName: string; normalized: string } {
  const name = normalizeName(rawName);
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "", normalized: name };
  // Last token is the surname; everything before is first [+ middle]
  const lastName  = parts[parts.length - 1]!;
  const firstName = parts.slice(0, -1).join(" ");
  return { firstName, lastName, normalized: name };
}

// ── Hunter.io: email-finder ───────────────────────────────────────────────────
// Best for: known individual + their company domain
async function hunterEmailFinder(
  fullName: string,
  domain: string,
  apiKey: string,
): Promise<string | null> {
  try {
    const url =
      `https://api.hunter.io/v2/email-finder` +
      `?full_name=${encodeURIComponent(fullName)}` +
      `&domain=${encodeURIComponent(domain)}` +
      `&api_key=${apiKey}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!resp.ok) return null;
    const data = await resp.json() as { data?: { value?: string; score?: number } };
    const email = data?.data?.value ?? null;
    const score = data?.data?.score ?? 0;
    // Only accept if Hunter confidence ≥ 50
    return (email && score >= 50) ? email : null;
  } catch (err: any) {
    logger.debug({ err: err.message }, "Hunter email-finder failed");
    return null;
  }
}

// ── Hunter.io: domain-search ─────────────────────────────────────────────────
// Best for: finding any verified email at a corporate domain
async function hunterDomainSearch(
  domain: string,
  apiKey: string,
): Promise<string | null> {
  try {
    const url =
      `https://api.hunter.io/v2/domain-search` +
      `?domain=${encodeURIComponent(domain)}` +
      `&limit=5&type=generic` +
      `&api_key=${apiKey}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!resp.ok) return null;
    const data = await resp.json() as {
      data?: { emails?: Array<{ value: string; confidence: number }> };
    };
    const emails = data?.data?.emails ?? [];
    // Pick highest confidence
    const best = emails.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];
    return best?.value ?? null;
  } catch (err: any) {
    logger.debug({ err: err.message }, "Hunter domain-search failed");
    return null;
  }
}

// ── Apollo.io: people/match ───────────────────────────────────────────────────
// Best for: individuals where domain is unknown — Apollo resolves by name alone.
// orgName is OPTIONAL: only pass it when you have a real company name; passing
// the person's own name as orgName causes a zero-result lookup.
async function apolloPeopleMatch(
  firstName: string,
  lastName: string,
  apiKey: string,
  orgName?: string,
): Promise<HunterEnrichResult | null> {
  try {
    const payload: Record<string, unknown> = {
      api_key:                apiKey,
      first_name:             firstName,
      last_name:              lastName,
      reveal_personal_emails: false,
    };
    if (orgName) payload["organization_name"] = orgName;

    const resp = await fetch("https://api.apollo.io/v1/people/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "x-api-key":     apiKey,   // Apollo preferred auth header
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) {
      if (resp.status === 403) {
        // Apollo free plan blocks people/match entirely — log once at warn level
        logger.warn("Apollo people/match requires a paid Apollo plan (403 API_INACCESSIBLE). Upgrade at https://apollo.io/pricing");
      } else {
        logger.debug({ status: resp.status }, "Apollo people-match non-OK");
      }
      return null;
    }
    const data = await resp.json() as {
      status?: string;
      person?: {
        email?: string | null;
        linkedin_url?: string | null;
        phone_numbers?: Array<{ sanitized_number?: string }>;
      } | null;
    };
    if (data?.status === "not_found") return null;
    const person = data?.person;
    if (!person) return null;
    const email       = person.email       ?? null;
    const linkedinUrl = person.linkedin_url ?? null;
    const phone       = person.phone_numbers?.[0]?.sanitized_number ?? null;
    if (!email && !linkedinUrl && !phone) return null;
    return { email, linkedinUrl, phone, source: "Apollo.io" };
  } catch (err: any) {
    logger.debug({ err: err.message }, "Apollo people-match failed");
    return null;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
export interface HunterEnrichInput {
  id:       number;
  name:     string;
  type:     string;
  metadata: string | null;
}

export async function enrichWithHunterApollo(
  entity: HunterEnrichInput,
): Promise<HunterEnrichResult | null> {
  const hunterKey = process.env["HUNTER_API_KEY"];
  const apolloKey = process.env["APOLLO_API_KEY"];

  if (!hunterKey && !apolloKey) return null;

  const isIndividual =
    entity.type === "HNWI" ||
    entity.type === "Gatekeeper" ||
    /^[A-Z][a-z]+ [A-Z]/.test(entity.name);

  const domain = guessDomain(entity.metadata);

  // Normalize name once for all lookup strategies
  const normalizedName = isIndividual ? normalizeName(entity.name) : entity.name;

  // ── 1. Hunter email-finder: individual + known domain ──────────────────────
  if (hunterKey && isIndividual && domain) {
    const email = await hunterEmailFinder(normalizedName, domain, hunterKey);
    if (email) {
      logger.info({ entityId: entity.id, domain, normalizedName }, "Hunter email-finder hit");
      return { email, linkedinUrl: null, phone: null, source: "Hunter.io-EmailFinder" };
    }
  }

  // ── 2. Hunter domain-search: corp/trust with known domain ──────────────────
  if (hunterKey && !isIndividual && domain) {
    const email = await hunterDomainSearch(domain, hunterKey);
    if (email) {
      logger.info({ entityId: entity.id, domain }, "Hunter domain-search hit");
      return { email, linkedinUrl: null, phone: null, source: "Hunter.io-DomainSearch" };
    }
  }

  // ── 3. Apollo people-match: individuals (no domain needed) ─────────────────
  // Only pass orgName when metadata contains a real company name — never pass
  // the person's own name as the org or Apollo returns zero results.
  if (apolloKey && isIndividual) {
    const { firstName, lastName, normalized } = splitName(entity.name);
    let orgName: string | undefined;
    if (entity.metadata) {
      try {
        const meta = JSON.parse(entity.metadata) as Record<string, unknown>;
        const org = meta["company"] ?? meta["organization"] ?? meta["employer"];
        if (typeof org === "string" && org && org !== entity.name) orgName = org;
      } catch { /* ignore */ }
    }
    const result = await apolloPeopleMatch(firstName, lastName, apolloKey, orgName);
    if (result) {
      logger.info({ entityId: entity.id, normalized, orgName }, "Apollo people-match hit");
      return result;
    }
  }

  return null;
}
