/**
 * In-House OSINT Enricher — replaces Hunter.io + Apollo.io
 *
 * Zero paid APIs. Deterministic TypeScript. All free public sources.
 *
 * Strategy stack (individual / corporate):
 *   1. Wikidata SPARQL         — structured data for public figures: email, website, LinkedIn
 *   2. GitHub API              — 60 req/hr unauthenticated; founders/execs often expose email
 *   3. Email pattern gen       — first.last / flast / f.last + DNS MX + Gravatar MD5 verification
 *   4. Domain resolver         — company name → .com heuristic + DNS validation
 *   5. RDAP domain contacts    — ICANN RDAP: registrant email for known domains
 *   6. ProPublica 990 Finder   — US nonprofit executive contacts
 *   7. Wikipedia abstract      — sometimes contains contact / website for public figures
 */

import { createHash } from "crypto";
import { promises as dns } from "dns";
import { logger } from "./logger";

// ─── Result type (same shape as OsintResult for easy drop-in) ────────────────
export interface InHouseEnrichResult {
  email:           string | null;
  linkedinUrl:     string | null;
  phone:           string | null;
  website:         string | null;
  sources:         string[];
  emailConfidence: number; // 0-100: Gravatar=90, Pattern+MX=60, RDAP=50, Wikipedia=40
}

export interface InHouseEnrichInput {
  id:               number;
  name:             string;
  type:             string;
  nationality?:     string | null;
  sourceRegistries?: string | null;
  knownResidences?:  string | null;
  metadata?:         string | null;
  notes?:            string | null;
}

// ─── Shared fetch options ─────────────────────────────────────────────────────
const HEADERS = {
  "User-Agent": "ApexFinder/1.0 OSINT-Research (public data; contact research@apexfinder.private)",
  Accept: "application/json",
};

function timeout(ms: number) { return AbortSignal.timeout(ms); }

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function safeJson<T>(str: string | null | undefined, fallback: T): T {
  try { return str ? JSON.parse(str) as T : fallback; } catch { return fallback; }
}

// ─── Normalise ALL-CAPS LAST FIRST (FAA/EDGAR format) ────────────────────────
function normaliseName(raw: string): string {
  const t = raw.trim();
  if (t !== t.toUpperCase() || !/[A-Z]{2}/.test(t)) return t;
  const parts = t.split(/\s+/);
  if (parts.length < 2) return t.charAt(0) + t.slice(1).toLowerCase();
  const titleCase = (s: string) =>
    s.length <= 2 ? s.toUpperCase() : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const [last, ...rest] = parts as [string, ...string[]];
  return [...rest, last].map(titleCase).join(" ");
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0]!, last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1]! };
}

// ─── Email blocklist ──────────────────────────────────────────────────────────
const EMAIL_BLOCK = new Set([
  "example.com","domain.com","email.com","test.com","foo.com",
  "noreply.com","no-reply.com","invalid.com","localhost",
]);
const EMAIL_RE = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g;

function extractEmail(text: string): string | null {
  const matches = [...text.matchAll(EMAIL_RE)].map(m => m[0].toLowerCase());
  return matches.find(e => {
    const d = e.split("@")[1] ?? "";
    return !EMAIL_BLOCK.has(d) && !d.startsWith("example") && e.length < 80;
  }) ?? null;
}

function extractLinkedIn(text: string): string | null {
  const m = text.match(/https?:\/\/(www\.)?linkedin\.com\/(in|pub|company)\/[a-zA-Z0-9\-_%]+\/?/i);
  return m ? m[0].replace(/\/$/, "") : null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE 1: Wikidata SPARQL
// ═══════════════════════════════════════════════════════════════════════════════

interface WikidataResult {
  email:       string | null;
  website:     string | null;
  linkedinUrl: string | null;
  twitter:     string | null;
}

async function queryWikidata(name: string): Promise<WikidataResult | null> {
  // SPARQL: find human with this label, get contact properties
  const sparql = `
SELECT ?email ?website ?linkedin ?twitter WHERE {
  ?person wdt:P31 wd:Q5;
          rdfs:label "${name.replace(/"/g, "")}"@en.
  OPTIONAL { ?person wdt:P968 ?email. }
  OPTIONAL { ?person wdt:P856 ?website. }
  OPTIONAL { ?person wdt:P6634 ?linkedin. }
  OPTIONAL { ?person wdt:P2002 ?twitter. }
} LIMIT 3`;

  try {
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
    const resp = await fetch(url, {
      signal: timeout(15_000),
      headers: { ...HEADERS, Accept: "application/sparql-results+json" },
    });
    if (!resp.ok) return null;
    const data = await resp.json() as any;
    const bindings: any[] = data?.results?.bindings ?? [];
    if (!bindings.length) return null;

    const b = bindings[0];
    return {
      email:       b?.email?.value       ?? null,
      website:     b?.website?.value     ?? null,
      linkedinUrl: b?.linkedin?.value ? `https://www.linkedin.com/in/${b.linkedin.value}` : null,
      twitter:     b?.twitter?.value     ?? null,
    };
  } catch (err: any) {
    logger.debug({ err: err.message }, "Wikidata SPARQL failed");
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE 2: Wikipedia abstract (public API, no key)
// ═══════════════════════════════════════════════════════════════════════════════

async function queryWikipedia(name: string): Promise<{ extract: string; website: string | null } | null> {
  try {
    const url =
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/ /g, "_"))}`;
    const resp = await fetch(url, { signal: timeout(10_000), headers: HEADERS });
    if (!resp.ok) return null;
    const data = await resp.json() as any;
    const extract: string = data?.extract ?? "";
    const contentUrls: string = data?.content_urls?.desktop?.page ?? "";
    return { extract, website: contentUrls || null };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE 3: GitHub API — search by full name
// ═══════════════════════════════════════════════════════════════════════════════

interface GitHubEnrichResult {
  email:      string | null;
  blog:       string | null;
  htmlUrl:    string | null;
}

async function queryGitHub(name: string): Promise<GitHubEnrichResult | null> {
  try {
    // Search users by full name
    const searchUrl = `https://api.github.com/search/users?q=${encodeURIComponent(name)}+in:fullname&per_page=5`;
    const searchResp = await fetch(searchUrl, {
      signal: timeout(12_000),
      headers: { ...HEADERS, Accept: "application/vnd.github+json" },
    });
    if (!searchResp.ok) return null;
    const searchData = await searchResp.json() as any;
    const items: any[] = searchData?.items ?? [];

    // Try each result until we find one with email
    for (const item of items.slice(0, 3)) {
      const profileResp = await fetch(item.url, {
        signal: timeout(8_000),
        headers: { ...HEADERS, Accept: "application/vnd.github+json" },
      });
      if (!profileResp.ok) continue;
      const profile = await profileResp.json() as any;
      if (profile?.email || profile?.blog) {
        return {
          email:   profile.email   ?? null,
          blog:    profile.blog    ?? null,
          htmlUrl: profile.html_url ?? null,
        };
      }
      await sleep(200);
    }
    return null;
  } catch (err: any) {
    logger.debug({ err: err.message }, "GitHub search failed");
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE 4: Company domain resolver + DNS MX validation
// ═══════════════════════════════════════════════════════════════════════════════

const CORP_SUFFIXES = /\b(inc|llc|ltd|limited|corp|corporation|group|holdings|international|global|capital|fund|partners|advisors|management|services|solutions|ventures|investments?)\b\.?$/gi;

function guessCompanyDomain(companyName: string): string[] {
  const base = companyName
    .replace(CORP_SUFFIXES, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "");

  if (!base || base.length < 2) return [];

  const withHyphen = companyName
    .replace(CORP_SUFFIXES, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "-");

  const candidates = [
    `${base}.com`,
    `${withHyphen}.com`,
    `${base}.co`,
    `${base}.io`,
    `${base}.org`,
  ];
  return [...new Set(candidates)].slice(0, 4);
}

/** Extract domain from entity metadata / notes */
function domainFromMeta(metadata?: string | null, notes?: string | null): string | null {
  const allText = `${metadata ?? ""} ${notes ?? ""}`;
  const meta = safeJson<Record<string, unknown>>(metadata, {});

  if (typeof meta["domain"] === "string" && meta["domain"]) return meta["domain"] as string;
  if (typeof meta["website"] === "string") {
    const site = meta["website"] as string;
    const m = site.match(/^https?:\/\/(?:www\.)?([a-z0-9.\-]+)/i);
    if (m) return m[1]!;
  }

  // Scan notes/metadata text for any URL
  const urlMatch = allText.match(/https?:\/\/(?:www\.)?([a-z0-9.\-]+\.[a-z]{2,})/i);
  if (urlMatch) return urlMatch[1]!;

  return null;
}

async function hasMxRecord(domain: string): Promise<boolean> {
  try {
    const records = await dns.resolveMx(domain);
    return records.length > 0;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE 5: Gravatar — verify email pattern via md5 hash
// ═══════════════════════════════════════════════════════════════════════════════

async function checkGravatar(email: string): Promise<boolean> {
  const hash = createHash("md5").update(email.toLowerCase().trim()).digest("hex");
  try {
    const resp = await fetch(`https://www.gravatar.com/avatar/${hash}?d=404&size=1`, {
      signal: timeout(6_000),
      headers: { "User-Agent": "ApexFinder/1.0" },
    });
    return resp.status === 200;
  } catch {
    return false;
  }
}

/** Generate common email patterns for a person at a domain */
function emailPatterns(firstName: string, lastName: string, domain: string): string[] {
  const f = firstName.toLowerCase().replace(/[^a-z]/g, "");
  const l = lastName.toLowerCase().replace(/[^a-z]/g, "");
  const fi = f.charAt(0);
  const li = l.charAt(0);
  if (!f || !l) return f ? [`${f}@${domain}`] : [];

  return [
    `${f}.${l}@${domain}`,      // peter.thiel@domain.com  (most common)
    `${fi}${l}@${domain}`,      // pthiel@domain.com
    `${f}${li}@${domain}`,      // petert@domain.com
    `${fi}.${l}@${domain}`,     // p.thiel@domain.com
    `${f}${l}@${domain}`,       // peterthiel@domain.com
    `${f}@${domain}`,           // peter@domain.com
    `${l}@${domain}`,           // thiel@domain.com
    `${l}.${f}@${domain}`,      // thiel.peter@domain.com  (some EU conventions)
    `${l}${fi}@${domain}`,      // thielp@domain.com
  ];
}

/** Try each email pattern; return first confirmed by Gravatar */
async function verifyEmailPatterns(
  firstName: string,
  lastName: string,
  domain: string,
): Promise<{ email: string; confidence: number } | null> {
  const patterns = emailPatterns(firstName, lastName, domain);

  for (const email of patterns) {
    const hasGravatar = await checkGravatar(email);
    if (hasGravatar) {
      return { email, confidence: 90 }; // Gravatar = very high confidence
    }
    await sleep(150); // polite rate limit
  }
  // No Gravatar hit — return best-guess pattern if domain has MX
  const hasMx = await hasMxRecord(domain);
  if (hasMx) {
    return { email: patterns[0]!, confidence: 55 }; // Pattern + valid MX = moderate confidence
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE 6: RDAP domain contact
// ═══════════════════════════════════════════════════════════════════════════════

async function rdapLookup(domain: string): Promise<string | null> {
  try {
    const tld = domain.split(".").pop() ?? "com";
    // Use IANA bootstrap to find the right RDAP server
    const bootstrapResp = await fetch("https://data.iana.org/rdap/dns.json", {
      signal: timeout(8_000), headers: HEADERS,
    });
    let rdapBase = `https://rdap.verisign.com/${tld}/v1`; // sane default for .com/.net
    if (bootstrapResp.ok) {
      const bootstrap = await bootstrapResp.json() as any;
      const services: [string[], string[]][] = bootstrap?.services ?? [];
      for (const [tlds, urls] of services) {
        if (tlds.includes(tld) && urls[0]) {
          rdapBase = urls[0].replace(/\/$/, "");
          break;
        }
      }
    }

    const rdapUrl = `${rdapBase}/domain/${domain}`;
    const resp = await fetch(rdapUrl, { signal: timeout(10_000), headers: HEADERS });
    if (!resp.ok) return null;
    const data = await resp.json() as any;

    // Walk vcardArray in each entity
    const entities: any[] = data?.entities ?? [];
    for (const entity of entities) {
      const vcard: any[][] = entity?.vcardArray?.[1] ?? [];
      for (const entry of vcard) {
        if (entry[0] === "email" && typeof entry[3] === "string") {
          const email = entry[3].toLowerCase();
          if (!email.includes("abuse") && !email.includes("privacy") && email.includes("@")) {
            return email;
          }
        }
      }
    }
    return null;
  } catch (err: any) {
    logger.debug({ err: err.message }, "RDAP lookup failed");
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE 7: ProPublica Nonprofit Explorer (US 990 filings)
// ═══════════════════════════════════════════════════════════════════════════════

async function propublicaNonprofit(name: string): Promise<{ email: string | null; website: string | null } | null> {
  try {
    const url = `https://projects.propublica.org/nonprofits/api/v2/search.json?q=${encodeURIComponent(name)}&page=0`;
    const resp = await fetch(url, { signal: timeout(10_000), headers: HEADERS });
    if (!resp.ok) return null;
    const data = await resp.json() as any;
    const orgs: any[] = data?.organizations ?? [];
    if (!orgs.length) return null;

    const org = orgs[0];
    const website: string | null = org?.website ?? null;
    let email: string | null = null;

    if (website) {
      // Try to scrape contact email from the nonprofit's homepage/contact page
      try {
        const pages = [website, `${website.replace(/\/$/, "")}/contact`];
        for (const page of pages) {
          const pageResp = await fetch(page, {
            signal: timeout(8_000),
            headers: { "User-Agent": "Mozilla/5.0 (compatible; ApexFinder/1.0)", Accept: "text/html" },
          });
          if (!pageResp.ok) continue;
          const html = await pageResp.text();
          const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 6000);
          email = extractEmail(text);
          if (email) break;
        }
      } catch { /* ignore */ }
    }

    return { email, website };
  } catch (err: any) {
    logger.debug({ err: err.message }, "ProPublica search failed");
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export async function enrichInHouse(entity: InHouseEnrichInput): Promise<InHouseEnrichResult> {
  const result: InHouseEnrichResult = {
    email: null, linkedinUrl: null, phone: null, website: null,
    sources: [], emailConfidence: 0,
  };

  const name = normaliseName(entity.name.trim());
  if (!name || name.length < 3) return result;

  const isIndividual = entity.type === "HNWI" || entity.type === "Gatekeeper" ||
    /^[A-Z][a-z]+ [A-Z]/.test(name);
  const isCorp = entity.type === "Corporation" || entity.type === "Trust";

  // ── 1. Wikidata SPARQL (best for well-known public figures) ─────────────────
  try {
    const wd = await queryWikidata(name);
    if (wd) {
      if (wd.email && !result.email) {
        result.email = wd.email;
        result.emailConfidence = 85;
        result.sources.push("Wikidata-Email");
      }
      if (wd.website && !result.website) {
        result.website = wd.website;
        result.sources.push("Wikidata-Website");
      }
      if (wd.linkedinUrl && !result.linkedinUrl) {
        result.linkedinUrl = wd.linkedinUrl;
        result.sources.push("Wikidata-LinkedIn");
      }
    }
  } catch (err: any) {
    logger.debug({ err: err.message }, "In-house: Wikidata failed");
  }

  if (result.email && result.emailConfidence >= 80) return result; // early exit — high confidence
  await sleep(300);

  // ── 2. Wikipedia abstract ───────────────────────────────────────────────────
  if (!result.email || !result.website) {
    try {
      const wiki = await queryWikipedia(name);
      if (wiki) {
        if (!result.email) {
          const email = extractEmail(wiki.extract);
          if (email) { result.email = email; result.emailConfidence = 40; result.sources.push("Wikipedia-Extract"); }
        }
        if (!result.linkedinUrl) {
          const li = extractLinkedIn(wiki.extract);
          if (li) { result.linkedinUrl = li; result.sources.push("Wikipedia-LinkedIn"); }
        }
        if (!result.website && wiki.website) {
          result.website = wiki.website; result.sources.push("Wikipedia-URL");
        }
      }
    } catch (err: any) {
      logger.debug({ err: err.message }, "In-house: Wikipedia failed");
    }
    await sleep(250);
  }

  // ── 3. GitHub (individuals — founders, execs, tech HNWIs) ───────────────────
  if (isIndividual && !result.email) {
    try {
      const gh = await queryGitHub(name);
      if (gh) {
        if (gh.email) {
          result.email = gh.email;
          result.emailConfidence = 75; // GitHub public email is self-confirmed
          result.sources.push("GitHub-Profile");
        }
        if (!result.website && gh.blog) {
          result.website = gh.blog; result.sources.push("GitHub-Blog");
        }
      }
    } catch (err: any) {
      logger.debug({ err: err.message }, "In-house: GitHub failed");
    }
    await sleep(300);
  }

  // ── 4. ProPublica 990 Finder (US nonprofit orgs) ────────────────────────────
  if (isCorp && !result.email) {
    try {
      const pp = await propublicaNonprofit(name);
      if (pp) {
        if (!result.website && pp.website) { result.website = pp.website; result.sources.push("ProPublica-Website"); }
        if (pp.email) { result.email = pp.email; result.emailConfidence = 50; result.sources.push("ProPublica-Email"); }
      }
    } catch (err: any) {
      logger.debug({ err: err.message }, "In-house: ProPublica failed");
    }
    await sleep(250);
  }

  // ── 5. Email pattern generation + Gravatar verification ─────────────────────
  // Only run if we don't have a high-confidence email yet
  if (!result.email || result.emailConfidence < 60) {
    // Resolve domain: from metadata, notes, website, or company name guess
    let domain = domainFromMeta(entity.metadata, entity.notes);

    if (!domain && isCorp) {
      const candidates = guessCompanyDomain(name);
      for (const candidate of candidates) {
        if (await hasMxRecord(candidate)) {
          domain = candidate;
          break;
        }
        await sleep(100);
      }
    }

    if (!domain && !isIndividual) {
      // Try to guess from entity name as a last resort
      const candidates = guessCompanyDomain(name);
      domain = candidates[0] ?? null;
    }

    if (domain && isIndividual) {
      const { first, last } = splitName(name);
      if (first && last) {
        try {
          const verified = await verifyEmailPatterns(first, last, domain);
          if (verified && (!result.email || verified.confidence > result.emailConfidence)) {
            result.email = verified.email;
            result.emailConfidence = verified.confidence;
            result.sources.push(
              verified.confidence >= 80
                ? "EmailPattern-Gravatar"  // confirmed by Gravatar
                : "EmailPattern-MX",       // best-guess, MX-validated domain
            );
          }
        } catch (err: any) {
          logger.debug({ err: err.message }, "In-house: email pattern gen failed");
        }
      }
    }

    // For corporations: try RDAP on the resolved/guessed domain
    if (domain && isCorp && !result.email) {
      try {
        const rdapEmail = await rdapLookup(domain);
        if (rdapEmail) {
          result.email = rdapEmail;
          result.emailConfidence = 50;
          result.sources.push("RDAP-Registrant");
        }
      } catch (err: any) {
        logger.debug({ err: err.message }, "In-house: RDAP failed");
      }
    }
  }

  return result;
}
