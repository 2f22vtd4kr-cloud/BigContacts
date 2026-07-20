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

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
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
// Best for: individuals where domain is unknown — Apollo resolves by name + org
async function apolloPeopleMatch(
  firstName: string,
  lastName: string,
  orgName: string,
  apiKey: string,
): Promise<HunterEnrichResult | null> {
  try {
    const resp = await fetch("https://api.apollo.io/v1/people/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({
        api_key: apiKey,
        first_name: firstName,
        last_name: lastName,
        organization_name: orgName,
        reveal_personal_emails: false,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as {
      person?: {
        email?: string | null;
        linkedin_url?: string | null;
        phone_numbers?: Array<{ sanitized_number?: string }>;
      };
    };
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

  // ── 1. Hunter email-finder: individual + known domain ──────────────────────
  if (hunterKey && isIndividual && domain) {
    const email = await hunterEmailFinder(entity.name, domain, hunterKey);
    if (email) {
      logger.info({ entityId: entity.id, domain }, "Hunter email-finder hit");
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
  if (apolloKey && isIndividual) {
    const { firstName, lastName } = splitName(entity.name);
    const result = await apolloPeopleMatch(firstName, lastName, entity.name, apolloKey);
    if (result) {
      logger.info({ entityId: entity.id }, "Apollo people-match hit");
      return result;
    }
  }

  return null;
}
