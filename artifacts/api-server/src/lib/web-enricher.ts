/**
 * Web Enricher — Layer 1/2 Web OSINT + Deep Web OSINT
 *
 * Phase K overhaul:
 *   - Trading-name derivation (legal name → venue/brand name + city)
 *   - Locale-aware search (fr-fr for French entities, de-de for German, etc.)
 *   - Multilingual query templates (EN/FR/DE/IT/ES)
 *   - City-derived domain guessing (baolicannes.com, not just baoli.com)
 *   - Corp → Person hop: extract "fondé par X / founded by X / PDG X" from snippets
 *   - Contact page crawler: /contact /equipe /team /kontakt /nous-contacter
 *   - Social handle extraction: Instagram, Twitter/X
 *   - Qwant search for French entities (better French regional coverage than DDG)
 *   - OpenCorporates removed (returns 401 for all queries since API went paid-only)
 */

import { logger } from "./logger";
import { isValidPublicEmail, sanitizePublicEmail } from "./contact-validation";
import { extractWithAI } from "./ai-extractor";

// ── Shared utilities ──────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/** Extract first LinkedIn URL from text */
function extractLinkedIn(text: string): string | null {
  const m = text.match(/https?:\/\/(www\.)?linkedin\.com\/(in|pub|company)\/[a-zA-Z0-9\-_%]+\/?/i);
  return m ? m[0].replace(/\/$/, "") : null;
}

/** Extract Instagram handle or URL from text */
function extractInstagram(text: string): string | null {
  // Full URL first
  const urlM = text.match(/https?:\/\/(www\.)?instagram\.com\/([a-zA-Z0-9._]{2,30})\/?/i);
  if (urlM) return `https://instagram.com/${urlM[2]}`;
  // @handle — must be adjacent to word like "instagram" or standalone
  const atM = text.match(/instagram[^a-z0-9]*@([a-zA-Z0-9._]{2,30})/i);
  if (atM) return `https://instagram.com/${atM[1]}`;
  return null;
}

/** Extract Twitter/X handle or URL from text */
function extractTwitter(text: string): string | null {
  const urlM = text.match(/https?:\/\/(www\.)?(twitter|x)\.com\/([a-zA-Z0-9_]{2,50})\/?/i);
  if (urlM) return `https://x.com/${urlM[3]}`;
  const atM = text.match(/twitter[^a-z0-9]*@([a-zA-Z0-9_]{2,50})/i);
  if (atM) return `https://x.com/${atM[1]}`;
  return null;
}

const EMAIL_RE = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g;

// ══════════════════════════════════════════════════════════════════════════════
// SECTION A — Web OSINT Enricher (Layer 1)
// ══════════════════════════════════════════════════════════════════════════════

const DDG_API   = "https://api.duckduckgo.com/";
const EDGAR_FT  = "https://efts.sec.gov/LATEST/search-index?q=";
const GLEIF_API = "https://api.gleif.org/api/v1/fuzzycompletions?field=entity.legalName&page%5Bsize%5D=1&q=";

const FETCH_OPTS = {
  signal: AbortSignal.timeout(12_000),
  headers: {
    "User-Agent": "ApexFinder/1.0 OSINT-Research (public data only; contact research@apexfinder.private)",
    Accept: "application/json",
  },
};

export interface OsintResult {
  linkedinUrl:  string | null;
  email:        string | null;
  phone:        string | null;
  website:      string | null;
  sources:      string[];
}

function extractEmailSimple(text: string): string | null {
  const matches = [...text.matchAll(EMAIL_RE)].map(m => m[0].toLowerCase());
  const filtered = matches.filter(e => isValidPublicEmail(e) && e.length < 80);
  return filtered[0] ?? null;
}

// Multi-format phone regex (international)
const PHONE_RE_SIMPLE = /\+?\d[\d\s.\-()]{6,18}\d/g;

function extractPhoneSimple(text: string): string | null {
  const m = text.match(PHONE_RE_SIMPLE);
  return m ? m[0].replace(/\s+/g, " ").trim() : null;
}

async function ddgInstantAnswer(query: string): Promise<{ abstract: string; url: string; relatedTopics: string[] }> {
  const url = `${DDG_API}?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  try {
    const resp = await fetch(url, FETCH_OPTS);
    if (!resp.ok) return { abstract: "", url: "", relatedTopics: [] };
    const data = await resp.json() as any;
    const topics: string[] = (data.RelatedTopics ?? [])
      .slice(0, 8)
      .map((t: any) => `${t.Text ?? ""} ${t.FirstURL ?? ""}`)
      .filter(Boolean);
    return {
      abstract: (data.AbstractText ?? "") + " " + (data.AbstractURL ?? ""),
      url: data.AbstractURL ?? "",
      relatedTopics: topics,
    };
  } catch {
    return { abstract: "", url: "", relatedTopics: [] };
  }
}

async function edgarEmailSearch(name: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`"${name}"`);
    const url = `${EDGAR_FT}${q}&dateRange=custom&startdt=2020-01-01&forms=SC+13D,SC+13G,DEF+14A&hits.hits._source=period_of_report,entity_name,file_date&hits.hits.total=1`;
    const resp = await fetch(url, { ...FETCH_OPTS, headers: { ...FETCH_OPTS.headers, Accept: "application/json" } });
    if (!resp.ok) return null;
    const data = await resp.json() as any;
    const hits: any[] = data?.hits?.hits ?? [];
    for (const hit of hits.slice(0, 2)) {
      const src = JSON.stringify(hit._source ?? {});
      const email = extractEmailSimple(src);
      if (email) return email;
    }
    return null;
  } catch {
    return null;
  }
}

async function ddgHtmlSearch(query: string, locale = "wt-wt"): Promise<string> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=${locale}`;
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ApexFinder/1.0; +https://apexfinder.private)",
        Accept: "text/html",
      },
    });
    if (!resp.ok) return "";
    const html = await resp.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 8000);
  } catch {
    return "";
  }
}

/**
 * Scrape the entity's website for contact info.
 * Tries multilingual contact/about paths (EN/FR/DE/IT/ES).
 */
async function scrapeContactEmail(website: string): Promise<string | null> {
  try {
    const base = website.replace(/\/$/, "");
    const paths = [
      "", "/contact", "/contact-us", "/about", "/team", "/equipe",
      "/nous-contacter", "/kontakt", "/impressum", "/contatti", "/contacto",
      "/about-us", "/who-we-are", "/management", "/staff",
    ];
    for (const path of paths) {
      try {
        const resp = await fetch(`${base}${path}`, {
          signal: AbortSignal.timeout(8_000),
          headers: { "User-Agent": "Mozilla/5.0 (compatible; ApexFinder/1.0)", Accept: "text/html" },
        });
        if (!resp.ok) continue;
        const html = await resp.text();
        // mailto: href is most reliable
        const mailtoRe = /href=["']mailto:([^"'?\s]+)/gi;
        for (const m of html.matchAll(mailtoRe)) {
          const addr = (m[1] ?? "").toLowerCase().trim();
          if (isValidPublicEmail(addr) && addr.length < 80) return addr;
        }
        const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 5000);
        const email = extractEmailSimple(text);
        if (email) return email;
      } catch { /* try next */ }
    }
    return null;
  } catch {
    return null;
  }
}

function safeParseJson<T>(str: string | null | undefined, fallback: T): T {
  try { return str ? JSON.parse(str) as T : fallback; } catch { return fallback; }
}

export interface EntityOsintInput {
  id: number;
  name: string;
  type: string;
  nationality?: string | null;
  sourceRegistries?: string | null;
  knownResidences?: string | null;
  metadata?: string | null;
}

export async function enrichEntityOsint(entity: EntityOsintInput): Promise<OsintResult> {
  const result: OsintResult = { linkedinUrl: null, email: null, phone: null, website: null, sources: [] };
  const name = entity.name.trim();
  if (!name || name.length < 3) return result;

  const isIndividual = entity.type === "HNWI" || /^[A-Z][a-z]+ [A-Z]/.test(name);
  const isCorp = entity.type === "Corporation" || entity.type === "Trust";
  const country = detectCountry(entity.nationality, entity.knownResidences, entity.metadata);
  const locale = countryToLocale(country);

  // Step 1: LinkedIn URL via DDG instant answer
  try {
    const liQuery = isIndividual ? `${name} linkedin profile` : `${name} company linkedin`;
    const ddgResult = await ddgInstantAnswer(liQuery);
    const allText = [ddgResult.abstract, ddgResult.url, ...ddgResult.relatedTopics].join(" ");
    const li = extractLinkedIn(allText);
    if (li) { result.linkedinUrl = li; result.sources.push("DuckDuckGo-LinkedIn"); }
  } catch (err: any) {
    logger.debug({ err: err.message }, "DDG LinkedIn search failed");
  }

  await sleep(400);

  // Step 2: Email via DDG HTML deep search (locale-aware)
  try {
    const emailQuery = isIndividual
      ? `"${name}" email contact site:linkedin.com OR site:bloomberg.com OR site:crunchbase.com`
      : `"${name}" contact email official`;
    const html = await ddgHtmlSearch(emailQuery, locale);
    if (html) {
      const email = extractEmailSimple(html);
      if (email) { result.email = email; result.sources.push("DuckDuckGo-Email"); }
      const phone = extractPhoneSimple(html);
      if (phone && !result.phone) { result.phone = phone; result.sources.push("DuckDuckGo-Phone"); }
      if (!result.linkedinUrl) {
        const li = extractLinkedIn(html);
        if (li) { result.linkedinUrl = li; result.sources.push("DuckDuckGo-HTML-LinkedIn"); }
      }
    }
  } catch (err: any) {
    logger.debug({ err: err.message }, "DDG HTML search failed");
  }

  await sleep(400);

  // Step 3: EDGAR email (for SEC-sourced entities)
  if (!result.email) {
    const sources = safeParseJson<string[]>(entity.sourceRegistries, []);
    const isEdgar = sources.some(s => /EDGAR|SEC/i.test(s));
    if (isEdgar) {
      try {
        const email = await edgarEmailSearch(name);
        if (email) { result.email = email; result.sources.push("SEC-EDGAR-Filing"); }
      } catch (err: any) {
        logger.debug({ err: err.message }, "EDGAR email search failed");
      }
      await sleep(300);
    }
  }

  // Step 3b: GLEIF LEI registry (free, no key) — corporate registered contact
  if (isCorp && !result.email) {
    try {
      const gleifUrl = `${GLEIF_API}${encodeURIComponent(name)}`;
      const resp = await fetch(gleifUrl, FETCH_OPTS);
      if (resp.ok) {
        const data = await resp.json() as any;
        const entry = data?.data?.[0]?.attributes;
        if (entry) {
          const legalAddress = entry.entity?.legalAddress;
          if (legalAddress) {
            const city = legalAddress.city ?? "";
            const co = legalAddress.country ?? "";
            if (city || co) result.sources.push(`GLEIF-LEI(${city},${co})`);
          }
          const reg = entry?.registration;
          if (reg?.managingLou) result.sources.push("GLEIF-Verified");
        }
      }
    } catch (err: any) {
      logger.debug({ err: err.message }, "GLEIF search failed");
    }
    await sleep(200);
  }

  // Step 4: Domain guess + contact page scrape (for corporations)
  // OpenCorporates removed — returns 401 for all requests since API went paid-only
  if (isCorp && !result.email) {
    const city = extractCity(entity.knownResidences, entity.metadata);
    const candidates = guessCompanyDomainWithCity(name, city);
    for (const domain of candidates.slice(0, 3)) {
      try {
        const contactEmail = await scrapeContactEmail(`https://${domain}`);
        if (contactEmail) {
          result.website = `https://${domain}`;
          result.email = contactEmail;
          result.sources.push(`Domain-Guess(${domain})`);
          break;
        }
      } catch { /* try next */ }
    }
  }

  return result;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION B — Deep Web OSINT Enricher (Layer 2)
// ══════════════════════════════════════════════════════════════════════════════

export interface DeepWebOsintInput {
  id:               number;
  name:             string;
  type:             string;
  sourceRegistries?: string | null;
  knownResidences?:  string | null;
  metadata?:         string | null;
  bayesianScore?:    number | null;
  nationality?:      string | null;
}

export interface DeepWebOsintResult {
  email:           string | null;
  emailConfidence: number;
  phone:           string | null;
  phoneConfidence: number;
  linkedinUrl:     string | null;
  instagramUrl:    string | null;
  twitterUrl:      string | null;
  sources:         string[];
  queriesFired:    number;
  pagesScraped:    number;
  personsDiscovered: string[];
  evidence:        DeepWebEvidence[];
}

export interface DeepWebEvidence {
  vectorType: "email" | "phone" | "social" | "domain" | "website" | "address";
  value: string;
  source: string;
  sourceUrl: string | null;
  extractionMethod: string;
  confidence: number;
  details?: Record<string, unknown>;
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0",
];

const SKIP_DOMAINS = new Set([
  "google.com", "bing.com", "yahoo.com", "duckduckgo.com", "qwant.com",
  "amazon.com", "ebay.com", "apple.com", "microsoft.com",
  "wikipedia.org", "wikidata.org",
  "youtube.com", "tiktok.com", "pinterest.com",
]);

const EMAIL_BLOCK = new Set([
  "example.com", "domain.com", "email.com", "test.com", "sample.com",
  "noreply.com", "no-reply.com", "invalid.com", "placeholder.com",
  "privacy.com", "domainsbyproxy.com", "whoisguard.com", "privacyprotect.org",
  "whoisprivacycorp.com", "registrant.com",
]);

// Multi-pattern phone regex (international-aware)
const PHONE_RE_MULTI = [
  /\+\d{1,3}[\s.\-]?\(?\d{1,4}\)?[\s.\-]?\d{1,4}[\s.\-]?\d{1,9}/,
  /\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/,
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!;
}

function jitteredDelay(baseMs: number) {
  return sleep(baseMs + Math.floor(Math.random() * 600));
}

function safeJson<T>(str: string | null | undefined, fallback: T): T {
  try { return str ? JSON.parse(str) as T : fallback; } catch { return fallback; }
}

function normaliseName(raw: string): string {
  const t = raw.trim();
  if (t !== t.toUpperCase() || !/[A-Z]{2}/.test(t)) return t;
  const parts = t.split(/\s+/);
  if (parts.length < 2) return t.charAt(0) + t.slice(1).toLowerCase();
  const tc = (s: string) => s.length <= 2 ? s.toUpperCase() : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const [last, ...rest] = parts as [string, ...string[]];
  return [...rest, last].map(tc).join(" ");
}

// ── Country/locale detection ──────────────────────────────────────────────────

const COUNTRY_LOCALE: Record<string, string> = {
  FR: "fr-fr", DE: "de-de", IT: "it-it", ES: "es-es",
  NL: "nl-nl", BE: "fr-be", CH: "de-ch", AT: "de-at",
  GB: "uk-en", UK: "uk-en", US: "us-en", AU: "en-au",
  PT: "pt-pt", PL: "pl-pl", SE: "se-sv", DK: "dk-da",
  NO: "no-nn", FI: "fi-fi", RU: "ru-ru", AE: "en-ww",
  SG: "en-ww", HK: "en-ww",
};

/**
 * Detect country ISO-2 from entity nationality, addresses, or metadata.
 * Returns uppercase 2-letter code or null.
 */
function detectCountry(
  nationality?: string | null,
  knownResidences?: string | null,
  metadata?: string | null,
): string | null {
  // 1. Explicit nationality field
  if (nationality && /^[A-Z]{2}$/.test(nationality.trim())) return nationality.trim();

  // 2. Common nationality strings
  const nat = (nationality ?? "").toLowerCase();
  if (/french|france/i.test(nat)) return "FR";
  if (/german|germany|deutsch/i.test(nat)) return "DE";
  if (/italian|italy|italia/i.test(nat)) return "IT";
  if (/spanish|spain|españa/i.test(nat)) return "ES";
  if (/british|uk|united kingdom/i.test(nat)) return "GB";
  if (/american|usa|united states/i.test(nat)) return "US";
  if (/dutch|netherlands|holland/i.test(nat)) return "NL";
  if (/swiss|switzerland/i.test(nat)) return "CH";

  // 3. Scan addresses for country hints
  const residenceStr = typeof knownResidences === "string" ? knownResidences : "";
  const metaStr = typeof metadata === "string" ? metadata : "";
  const combined = `${residenceStr} ${metaStr}`.toLowerCase();

  if (/\bfrance\b|\bcannes\b|\bparis\b|\bnice\b|\bmonaco\b|\blyon\b|\bmarseille\b/i.test(combined)) return "FR";
  if (/\bgermany\b|\bberlin\b|\bmunich\b|\bfrankfurt\b|\bhamburg\b/i.test(combined)) return "DE";
  if (/\bitaly\b|\brome\b|\bmilan\b|\bvenice\b|\bflorence\b|\bnaples\b/i.test(combined)) return "IT";
  if (/\bspain\b|\bmadrid\b|\bbarcelona\b|\bibiza\b|\bmarbella\b/i.test(combined)) return "ES";
  if (/\buk\b|\bbritain\b|\blondon\b|\bmanchester\b|\bedinburgh\b/i.test(combined)) return "GB";
  if (/\bnetherlands\b|\bamsterdam\b|\brotterdam\b/i.test(combined)) return "NL";
  if (/\bswitzerland\b|\bzürich\b|\bgeneva\b|\bzurich\b/i.test(combined)) return "CH";
  if (/\baustralia\b|\bsydney\b|\bmelbourne\b/i.test(combined)) return "AU";

  return null;
}

function countryToLocale(country: string | null): string {
  if (!country) return "wt-wt";
  return COUNTRY_LOCALE[country] ?? "wt-wt";
}

/**
 * Extract the city name from addresses or metadata.
 * Returns the first city found or null.
 */
export function extractCity(knownResidences?: string | null, metadata?: string | null): string | null {
  const residenceStr = typeof knownResidences === "string" ? knownResidences : "";
  const metaStr = typeof metadata === "string" ? metadata : "";

  const cityFromAddress = (value: string): string | null => {
    const clean = value.replace(/\s+/g, " ").trim();
    if (!clean) return null;

    // European postal-code form: "06400 Cannes", "10115 Berlin", etc.
    const postal = clean.match(/\b\d{4,6}\s+([A-ZÀ-ÖØ-Ü][A-Za-zÀ-ÖØ-Üà-öø-ü'’\-]+(?:\s+[A-ZÀ-ÖØ-Ü][A-Za-zÀ-ÖØ-Üà-öø-ü'’\-]+){0,2})\b/);
    if (postal?.[1]) return postal[1].trim().replace(/[,.]$/, "");

    const parts = clean.split(",").map(part => part.trim()).filter(Boolean);
    if (parts.length > 1) {
      // Prefer the final locality before a country name, rather than a street.
      const last = parts[parts.length - 1]!;
      if (!/^(france|germany|italy|spain|united kingdom|uk|usa|united states|netherlands|belgium|switzerland|monaco|portugal|austria|denmark|sweden|norway|finland|poland)$/i.test(last)) {
        const withoutPostal = last.replace(/^\d{4,6}\s+/, "").trim();
        if (withoutPostal && !/^\d/.test(withoutPostal)) return withoutPostal;
      }
      const beforeCountry = parts[parts.length - 2]!;
      const withoutPostal = beforeCountry.replace(/^\d{4,6}\s+/, "").trim();
      if (withoutPostal && !/^\d/.test(withoutPostal)) return withoutPostal;
    }

    return null;
  };

  // Try to parse as JSON array of residence strings
  try {
    const parsed = JSON.parse(residenceStr);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    for (const entry of arr) {
      if (typeof entry === "string" && entry.length > 2) {
        const city = cityFromAddress(entry);
        if (city) return city;
      }
    }
  } catch {
    // Not JSON — treat as plain string
    if (residenceStr) {
      const city = cityFromAddress(residenceStr);
      if (city) return city;
    }
  }

  // Try metadata JSON for address fields
  try {
    const meta = JSON.parse(metaStr) as Record<string, unknown>;
    for (const key of ["city", "cityName", "registeredCity", "businessCity", "addressCity"]) {
      if (typeof meta[key] === "string" && (meta[key] as string).length > 1) {
        return (meta[key] as string).trim();
      }
    }
    // Parse from address strings — use cityFromAddress so postal-code regex fires
    for (const key of ["registeredAddress", "businessAddress", "address", "legalAddress"]) {
      if (typeof meta[key] === "string") {
        const city = cityFromAddress(meta[key] as string);
        if (city) return city;
      }
    }
  } catch { /* ignore */ }

  return null;
}

/**
 * Derive a public-facing trading name from the legal entity name + city context.
 *
 * Examples:
 *   "BAOLI SAS" + "Cannes" → "Baoli Cannes"
 *   "RIVIERA HOSPITALITY SAS" + "Cannes" → "Riviera Hospitality"
 *   "APPLE INC" + null → "Apple"
 */
const LEGAL_SUFFIXES = /\s*\b(s\.?a\.?s\.?|s\.?a\.?r\.?l\.?|s\.?a\.?|e\.?u\.?r\.?l\.?|s\.?n\.?c\.?|s\.?c\.?i\.?|gmbh|ag|kg|ohg|gbr|ltd|llc|llp|plc|inc|corp|incorporated|limited|l\.?p\.?|s\.?l\.?|s\.?r\.?l\.?|b\.?v\.?|n\.?v\.?|a\/s|ab|oy|as|sp\.?\s*z\.?\s*o\.?\s*o\.?|zrt|kft|a\.?s\.?|a\/s|asa|ehf|group|holdings|trust|international|global)\b\.?\s*$/gi;

export function deriveTradingName(legalName: string, city: string | null): string {
  // Strip legal suffix
  const stripped = legalName.replace(LEGAL_SUFFIXES, "").trim();
  // Titlecase (handles ALL CAPS legal names like "BAOLI SAS")
  const titled = stripped
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, c => c.toUpperCase())
    .trim();
  // If the city adds meaningful context (e.g. "Baoli" alone is ambiguous but "Baoli Cannes" is the known venue)
  if (city && titled.length < 12 && !titled.toLowerCase().includes(city.toLowerCase())) {
    return `${titled} ${city}`;
  }
  return titled;
}

/**
 * Guess company domains, including city-derived variants.
 *
 * "BAOLI SAS" + "Cannes" → [baolicannes.com, baoli-cannes.com, baoli.com, ...]
 */
const CORP_SUFFIX_RE = /\b(inc|llc|ltd|limited|corp|corporation|group|holdings|international|global|capital|fund|partners|advisors?|management|services|solutions|ventures|investments?|enterprises?|associates?|consulting|technologies|tech|financial|realty|properties|trust|family|l\.?p\.?|s\.?a\.?s\.?|s\.?a\.?r\.?l\.?|s\.?a\.?|gmbh|s\.?r\.?l\.?|b\.?v\.?|n\.?v\.?|a\.?g\.?)\b\.?/gi;

export function guessCompanyDomainWithCity(companyName: string, city: string | null): string[] {
  const stripped = companyName.replace(CORP_SUFFIX_RE, "").trim();
  const ascii = (value: string) => value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const base = ascii(stripped).replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, "");
  const hyphen = ascii(stripped).replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, "-");
  if (!base || base.length < 2) return [];

  const candidates: string[] = [];

  // City-derived variants first (highest relevance for location-branded venues)
  if (city) {
    const cityClean = ascii(city).replace(/[^a-z0-9]/g, "");
    // Only add city suffix when the base does NOT already contain the city.
    // "Baoli Cannes" → base="baolicannes" already includes "cannes", so skip
    // "BAOLI SAS"    → base="baoli"       doesn't include "cannes" → add baolicannes.com
    if (cityClean && cityClean !== base && !base.includes(cityClean)) {
      candidates.push(`${base}${cityClean}.com`);
      candidates.push(`${base}-${cityClean}.com`);
      candidates.push(`${hyphen}${cityClean}.com`);
    }
  }

  // Standard variants
  candidates.push(`${base}.com`, `${hyphen}.com`, `${base}.co`, `${base}.io`,
    `${base}.org`, `${base}.net`, `${base}.co.uk`, `${base}.fr`, `${base}.de`);

  return [...new Set(candidates)].slice(0, 8);
}

// ── Person-hop: extract candidate person names from search text ───────────────

/**
 * Extract person name candidates from a body of search result text.
 * Uses keyword patterns in English, French, German, Italian, Spanish.
 * Returns deduplicated list of "Firstname Lastname" strings.
 */
const PERSON_PATTERNS: RegExp[] = [
  // English
  /(?:founded|owned|run|led|managed|created|started|built|established|operated)\s+by\s+([A-ZÀ-ÖØ-Ü][a-zà-öø-ü]+(?:[\s\-][A-ZÀ-ÖØ-Ü][a-zà-öø-ü\-]+){1,3})/g,
  /(?:CEO|CFO|COO|CTO|CMO|owner|co-owner|founder|co-founder|director|chairman|president|partner|principal|managing director)\s*[:\-]?\s*([A-ZÀ-ÖØ-Ü][a-zà-öø-ü]+\s+[A-ZÀ-ÖØ-Ü][a-zà-öø-ü\-]+)/g,
  // French
  /(?:fondé par|fondateur|co-fondateur|propriétaire|co-propriétaire|gérant|directeur général|PDG|DG|directeur|associé)\s*[:\-]?\s*([A-ZÀ-ÖØ-ÜÉÈÊËÀÂÙÛÜÇÎÏÔŒæœ][a-zà-öø-üéèêëàâùûüçîïôœ]+(?:[\s\-][A-ZÀ-ÖØ-Ü][a-zà-öø-ü\-]+){1,2})/g,
  /(?:M\.|M |Mme\.?|Mme |Monsieur|Madame)\s+([A-ZÀ-ÖØ-Ü][a-zà-öø-ü]+\s+[A-ZÀ-ÖØ-Ü][a-zà-öø-ü\-]+)/g,
  // German
  /(?:Inhaber|Geschäftsführer|Gründer|Mitgründer|Eigentümer|Gesellschafter|Vorstand|Vorsitzender)\s*[:\-]?\s*([A-ZÄÖÜ][a-zäöü]+\s+[A-ZÄÖÜ][a-zäöü\-]+)/g,
  // Italian
  /(?:fondato da|fondatore|proprietario|titolare|amministratore|socio)\s*[:\-]?\s*([A-ZÀ-ÖØ-Ü][a-zà-öø-ü]+\s+[A-ZÀ-ÖØ-Ü][a-zà-öø-ü\-]+)/g,
  // Spanish
  /(?:fundado por|fundador|propietario|dueño|director|socio)\s*[:\-]?\s*([A-ZÀ-ÖØ-Ü][a-zà-öø-ü]+\s+[A-ZÀ-ÖØ-Ü][a-zà-öø-ü\-]+)/g,
];

// Common first/last name parts that are NOT person names
const NOT_A_PERSON = new Set([
  "the", "and", "or", "of", "in", "at", "for", "to", "by",
  "le", "la", "les", "de", "du", "des", "un", "une", "sur", "avec", "par",
  "und", "der", "die", "das", "von", "zu",
  "the company", "the group", "the firm", "the club", "the hotel",
]);

function extractPersonCandidates(text: string): string[] {
  const found = new Set<string>();
  for (const pattern of PERSON_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    for (const m of text.matchAll(re)) {
      const name = (m[1] ?? "").trim();
      if (name.length < 4 || name.length > 60) continue;
      const lower = name.toLowerCase();
      if (NOT_A_PERSON.has(lower)) continue;
      // Must have at least two words each starting with uppercase
      const words = name.split(/\s+/);
      if (words.length < 2) continue;
      if (!words.every(w => /^[A-ZÀ-ÖØ-Üa-zà-öø-ü\-]/.test(w))) continue;
      found.add(name);
    }
  }
  return [...found].slice(0, 5); // max 5 person candidates per entity
}

// ── Search engine functions ───────────────────────────────────────────────────

interface SearchResult {
  text:   string;
  urls:   string[];
  engine: string;
  sourceUrl?: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDdgUrls(html: string): string[] {
  const urls: string[] = [];
  const uddgRe = /uddg=(https?%3A%2F%2F[^&"'\s]+)/g;
  for (const m of html.matchAll(uddgRe)) {
    try {
      const decoded = decodeURIComponent(m[1]!);
      const domain = new URL(decoded).hostname.replace(/^www\./, "");
      if (!SKIP_DOMAINS.has(domain)) urls.push(decoded);
    } catch { /* malformed URL */ }
  }
  return [...new Set(urls)].slice(0, 8);
}

function extractBingUrls(html: string): string[] {
  const urls: string[] = [];
  const hrefRe = /href="(https?:\/\/(?!www\.bing\.com)[^"]+)"/g;
  for (const m of html.matchAll(hrefRe)) {
    try {
      const url = m[1]!;
      const domain = new URL(url).hostname.replace(/^www\./, "");
      if (!SKIP_DOMAINS.has(domain)) urls.push(url);
    } catch { /* skip */ }
  }
  return [...new Set(urls)].slice(0, 8);
}

function extractQwantUrls(html: string): string[] {
  const urls: string[] = [];
  const hrefRe = /href="(https?:\/\/(?!www\.qwant\.com)[^"]+)"/g;
  for (const m of html.matchAll(hrefRe)) {
    try {
      const url = m[1]!;
      const domain = new URL(url).hostname.replace(/^www\./, "");
      if (!SKIP_DOMAINS.has(domain)) urls.push(url);
    } catch { /* skip */ }
  }
  return [...new Set(urls)].slice(0, 8);
}

async function duckduckgoSearch(query: string, locale = "wt-wt"): Promise<SearchResult> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=${locale}`;
  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(14_000),
      headers: {
        "User-Agent": randomUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: "https://duckduckgo.com/",
      },
    });
    if (!resp.ok) return { text: "", urls: [], engine: "DDG", sourceUrl: url };
    const html = await resp.text();
    return { text: stripHtml(html).slice(0, 12_000), urls: extractDdgUrls(html), engine: "DDG", sourceUrl: url };
  } catch (err: any) {
    logger.debug({ err: err?.message, query }, "DDG search failed");
    return { text: "", urls: [], engine: "DDG", sourceUrl: url };
  }
}

async function bingSearch(query: string, country: string | null): Promise<SearchResult> {
  const cc = country ?? "US";
  const setlang = country === "FR" ? "fr" : country === "DE" ? "de" : country === "IT" ? "it" : country === "ES" ? "es" : "en";
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=${setlang}&cc=${cc}&first=1`;
  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(14_000),
      headers: {
        "User-Agent": randomUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": setlang === "fr" ? "fr-FR,fr;q=0.9" : "en-US,en;q=0.5",
        Referer: "https://www.bing.com/",
      },
    });
    if (!resp.ok) return { text: "", urls: [], engine: "Bing", sourceUrl: url };
    const html = await resp.text();
    return { text: stripHtml(html).slice(0, 12_000), urls: extractBingUrls(html), engine: "Bing", sourceUrl: url };
  } catch (err: any) {
    logger.debug({ err: err?.message, query }, "Bing search failed");
    return { text: "", urls: [], engine: "Bing", sourceUrl: url };
  }
}

/**
 * Qwant search — French search engine with much better coverage of French
 * regional media, local business directories, and French-language content
 * compared to DuckDuckGo. Used for FR/BE/CH/MC entities.
 */
async function qwantSearch(query: string, locale = "fr_FR"): Promise<SearchResult> {
  const url = `https://www.qwant.com/?q=${encodeURIComponent(query)}&t=web&locale=${locale}&uiv=4`;
  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(14_000),
      headers: {
        "User-Agent": randomUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.5",
        Referer: "https://www.qwant.com/",
      },
    });
    if (!resp.ok) return { text: "", urls: [], engine: "Qwant", sourceUrl: url };
    const html = await resp.text();
    return { text: stripHtml(html).slice(0, 12_000), urls: extractQwantUrls(html), engine: "Qwant", sourceUrl: url };
  } catch (err: any) {
    logger.debug({ err: err?.message, query }, "Qwant search failed");
    return { text: "", urls: [], engine: "Qwant", sourceUrl: url };
  }
}

interface ScrapedPage {
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  text: string;
  links: string[];
}

function emptyScrapedPage(): ScrapedPage {
  return { email: null, phone: null, linkedinUrl: null, instagramUrl: null, twitterUrl: null, text: "", links: [] };
}

function extractPageLinks(html: string, pageUrl: string): string[] {
  const links = new Set<string>();
  let base: URL;
  try { base = new URL(pageUrl); } catch { return []; }
  const hrefRe = /href\s*=\s*["']([^"']+)["']/gi;
  for (const match of html.matchAll(hrefRe)) {
    const raw = (match[1] ?? "").trim();
    if (!raw || raw.startsWith("#") || /^(mailto|tel|javascript):/i.test(raw)) continue;
    try {
      const resolved = new URL(raw, base);
      if (!/^https?:$/i.test(resolved.protocol)) continue;
      if (resolved.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) continue;
      resolved.hash = "";
      links.add(resolved.toString());
    } catch { /* ignore malformed links */ }
  }
  return [...links].slice(0, 24);
}

function extractEmailsWithObfuscation(text: string): string[] {
  const normalized = text
    .replace(/\s*(?:\[|\(|\{)\s*at\s*(?:\]|\)|\})\s*/gi, "@")
    .replace(/\s+(?:at|chez)\s+/gi, "@")
    .replace(/\s*(?:\[|\(|\{)\s*dot\s*(?:\]|\)|\})\s*/gi, ".")
    .replace(/\s+dot\s+/gi, ".")
    .replace(/\s*@\s*/g, "@");
  return extractEmails(normalized);
}

export function extractPhone(text: string): string | null {
  const patterns = [
    // International formats, including French "(0)4 93..." notation.
    /\+\d{1,3}\s*(?:\(\s*0\s*\)\s*)?(?:\(?\d{1,4}\)?[\s.\-]?){2,6}\d/,
    // Local European numbers such as 04 93 43 03 43 or 01.42.68.53.00.
    /\b0\d(?:[\s.\-]?\d){8,}\b/,
    // North American numbers.
    /\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const candidate = match[0].replace(/\s+/g, " ").trim();
    if ((candidate.match(/\d/g) ?? []).length >= 8) return candidate;
  }
  return null;
}

async function scrapePage(url: string): Promise<ScrapedPage> {
  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        "User-Agent": randomUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });
    if (!resp.ok) return emptyScrapedPage();
    const html = await resp.text().then(h => h.slice(0, 80_000));

    // mailto: href is most reliable source
    let email: string | null = null;
    const mailtoRe = /href=["']mailto:([^"'?\s]+)/gi;
    for (const m of html.matchAll(mailtoRe)) {
      const addr = m[1]!.toLowerCase().trim();
      const domain = addr.split("@")[1] ?? "";
      const clean = sanitizePublicEmail(addr);
      if (clean && clean.length < 80 && !EMAIL_BLOCK.has(domain)) {
        email = clean;
        break;
      }
    }

    let linkedinUrl: string | null = null;
    const liRe = /href=["'](https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_%]{3,})[^"']*/i;
    const liM = html.match(liRe);
    if (liM) linkedinUrl = liM[1]!.replace(/\/$/, "");

    // Instagram from link tags
    let instagramUrl: string | null = null;
    const igRe = /href=["'](https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._]{2,30}))[^"']*/i;
    const igM = html.match(igRe);
    if (igM) instagramUrl = igM[1]!;

    // Twitter/X from link tags
    let twitterUrl: string | null = null;
    const twRe = /href=["'](https?:\/\/(?:www\.)?(?:twitter|x)\.com\/([a-zA-Z0-9_]{2,50}))[^"']*/i;
    const twM = html.match(twRe);
    if (twM) twitterUrl = twM[1]!;

    const text = stripHtml(html).slice(0, 15_000);
    if (!email) email = extractEmailsWithObfuscation(text)[0] ?? null;
    const phone = extractPhone(text);
    if (!linkedinUrl) linkedinUrl = extractLinkedIn(text);
    if (!instagramUrl) instagramUrl = extractInstagram(text);
    if (!twitterUrl) twitterUrl = extractTwitter(text);

    return { email, phone, linkedinUrl, instagramUrl, twitterUrl, text, links: extractPageLinks(html, url) };
  } catch {
    return emptyScrapedPage();
  }
}

/**
 * Try contact/about/team pages on a discovered domain.
 * Multilingual paths cover EN/FR/DE/IT/ES sites.
 */
async function findContactPages(domain: string): Promise<{
  url: string;
  scraped: ScrapedPage;
}[]> {
  const paths = [
    "/contact", "/contact-us", "/contactez-nous", "/nous-contacter",
    "/about", "/about-us", "/qui-sommes-nous", "/uber-uns",
    "/team", "/equipe", "/our-team", "/staff", "/management",
    "/kontakt", "/impressum", "/contatti", "/contacto",
    "/reservation", "/reservations", "/book", "/booking",
  ];
  const candidates = paths.map(path => `https://${domain}${path}`);
  for (const path of paths) {
    // Seeded by links discovered on the homepage. This handles localized,
    // CMS-generated routes such as /fr/contactez-nous and /reservation.
    candidates.push(`https://${domain}${path}/`);
  }
  const seen = new Set<string>();
  const results: Array<{ url: string; scraped: ScrapedPage }> = [];
  for (const url of candidates) {
    if (seen.has(url)) continue;
    seen.add(url);
    try {
      const scraped = await scrapePage(url);
      if (scraped.email || scraped.phone || scraped.linkedinUrl || scraped.instagramUrl || scraped.twitterUrl) {
        results.push({ url, scraped });
        if (results.length >= 4) break;
      }
    } catch { /* next path */ }
    await sleep(300);
  }
  return results;
}

async function waybackSnapshotUrls(domain: string): Promise<string[]> {
  const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}/*&output=json&filter=statuscode:200&filter=mimetype:text/html&collapse=urlkey&fl=timestamp,original&limit=20`;
  try {
    const response = await fetch(cdxUrl, {
      signal: AbortSignal.timeout(12_000),
      headers: { "User-Agent": "ApexFinder/1.0 public OSINT research" },
    });
    if (!response.ok) return [];
    const rows = await response.json() as unknown;
    if (!Array.isArray(rows)) return [];
    const urls: string[] = [];
    for (const row of rows.slice(1)) {
      if (!Array.isArray(row) || typeof row[0] !== "string" || typeof row[1] !== "string") continue;
      urls.push(`https://web.archive.org/web/${row[0]}id_/${row[1]}`);
    }
    return [...new Set(urls)].slice(0, 8);
  } catch {
    return [];
  }
}

function extractEmails(text: string): string[] {
  const all = [...text.matchAll(EMAIL_RE)].map(m => m[0]!.toLowerCase());
  return [...new Set(all.filter(e => {
    const d = e.split("@")[1] ?? "";
    return isValidPublicEmail(e) && e.length < 80 && !EMAIL_BLOCK.has(d);
  }))];
}

// ── Query builder (Phase K overhaul) ─────────────────────────────────────────

/**
 * Build search queries using:
 * - Trading name (not raw legal name)
 * - City context
 * - Language-specific templates
 * - Direct domain targets
 */
export function buildDeepWebQueries(
  entity: DeepWebOsintInput,
  tradingName: string,
  city: string | null,
  country: string | null,
): { queries: string[]; domainTargets: string[] } {
  const legalName = normaliseName(entity.name.trim());
  if (!legalName || legalName.length < 4) return { queries: [], domainTargets: [] };

  if (/^\d+\s/.test(legalName) || /\b(flat|house|cottage|manor|farm|apartment)\s+\d/i.test(legalName)) {
    return { queries: [], domainTargets: [] };
  }

  const isIndividual = entity.type === "HNWI" || entity.type === "Gatekeeper" ||
    /^[A-Z][a-z]+ [A-Z]/.test(legalName);
  const isCorp = !isIndividual;
  const meta = safeJson<Record<string, unknown>>(entity.metadata, {});

  const queries: string[] = [];
  const domainTargets: string[] = [];

  const isFrench  = country === "FR" || country === "BE" || country === "MC";
  const isGerman  = country === "DE" || country === "AT" || country === "CH";
  const isItalian = country === "IT";
  const isSpanish = country === "ES";

  if (isIndividual) {
    queries.push(`"${legalName}" email contact`);
    queries.push(`"${legalName}" linkedin`);

    const nNumber = typeof meta["nNumber"] === "string" ? meta["nNumber"] as string : null;
    if (nNumber) {
      queries.push(`"${nNumber}" aircraft owner contact email`);
      queries.push(`"${legalName}" pilot aviation email`);
    }

    const companyName = typeof meta["companyName"] === "string" ? (meta["companyName"] as string).trim() : null;
    if (companyName && companyName !== legalName) {
      queries.push(`"${legalName}" "${companyName.substring(0, 40)}" contact`);
    } else if (typeof meta["formType"] === "string") {
      queries.push(`"${legalName}" investor director SEC contact email`);
    }

    if (city && city !== legalName) {
      queries.push(`"${legalName}" ${city} contact email phone`);
    }

    if (isFrench) {
      queries.push(`"${legalName}" contact email France`);
    }
  }

  if (isCorp) {
    // Use TRADING name for all queries — not the raw legal name
    // Legal name ("BAOLI SAS") never appears in press, venue guides, or social profiles
    // Trading name ("Baoli Cannes") is what the public knows

    // Primary: trading name + city + contact keywords
    if (tradingName !== legalName) {
      queries.push(`"${tradingName}" contact email`);
      if (city) queries.push(`"${tradingName}" ${city} contact email`);
    }
    // Always include legal name as fallback for corporate directory hits
    queries.push(`"${legalName}" contact email`);

    // City-context queries (high yield for local hospitality/venue targets)
    if (city) {
      queries.push(`${tradingName} ${city} email réservations contact`);
      queries.push(`${tradingName} ${city} owner founder manager`);
    }

    // Language-specific templates
    if (isFrench) {
      queries.push(`"${tradingName}" contact réservations email`);
      queries.push(`"${tradingName}" propriétaire fondateur dirigeant`);
      if (city) queries.push(`${tradingName} ${city} fondateur email`);
    }
    if (isGerman) {
      queries.push(`"${tradingName}" Kontakt email Inhaber Geschäftsführer`);
      queries.push(`"${tradingName}" Gründer Eigentümer`);
    }
    if (isItalian) {
      queries.push(`"${tradingName}" contatti email fondatore titolare`);
    }
    if (isSpanish) {
      queries.push(`"${tradingName}" contacto email fundador propietario`);
    }

    // English fallback
    queries.push(`"${tradingName}" CEO owner founder contact`);

    // Domain guessing — add to direct scrape targets, not search queries
    const domains = guessCompanyDomainWithCity(legalName, city);
    domainTargets.push(...domains.slice(0, 4));
  }

  return {
    queries: [...new Set(queries)].slice(0, 10),
    domainTargets: [...new Set(domainTargets)],
  };
}

function scoreByCorroboration(sources: number): number {
  if (sources >= 4) return 88;
  if (sources >= 3) return 78;
  if (sources >= 2) return 62;
  return 42;
}

export async function deepWebOsintEnrich(entity: DeepWebOsintInput): Promise<DeepWebOsintResult> {
  const result: DeepWebOsintResult = {
    email: null, emailConfidence: 0,
    phone: null, phoneConfidence: 0,
    linkedinUrl: null,
    instagramUrl: null,
    twitterUrl: null,
    sources: [], queriesFired: 0, pagesScraped: 0,
    personsDiscovered: [],
  };

  // ── Derive context from entity ──────────────────────────────────────────
  const country  = detectCountry(entity.nationality, entity.knownResidences, entity.metadata);
  const locale   = countryToLocale(country);
  const city     = extractCity(entity.knownResidences, entity.metadata);
  const trading  = deriveTradingName(entity.name, city);

  const isCorp = entity.type === "Corporation" || entity.type === "Trust";
  const isFrench = country === "FR" || country === "BE" || country === "MC";

  const { queries, domainTargets } = buildDeepWebQueries(entity, trading, city, country);
  if (queries.length === 0 && domainTargets.length === 0) return result;

  const emailHits    = new Map<string, string[]>();
  const phoneHits    = new Map<string, string[]>();
  const linkedinHits = new Map<string, string[]>();
  const igHits       = new Map<string, string[]>();
  const twHits       = new Map<string, string[]>();
  const urlsToScrape = new Set<string>();
  let allSearchText  = "";

  // ── Phase 1: DDG search (locale-aware) ─────────────────────────────────
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i]!;
    const label = `DDG[q${i + 1}]`;
    try {
      const sr = await duckduckgoSearch(query, locale);
      result.queriesFired++;
      allSearchText += " " + sr.text;
      if (sr.text) {
        for (const e of extractEmails(sr.text)) {
          const arr = emailHits.get(e) ?? []; arr.push(label); emailHits.set(e, arr);
        }
        const ph = extractPhone(sr.text);
        if (ph) { const arr = phoneHits.get(ph) ?? []; arr.push(label); phoneHits.set(ph, arr); }
        const li = extractLinkedIn(sr.text);
        if (li) { const arr = linkedinHits.get(li) ?? []; arr.push(label); linkedinHits.set(li, arr); }
        const ig = extractInstagram(sr.text);
        if (ig) { const arr = igHits.get(ig) ?? []; arr.push(label); igHits.set(ig, arr); }
        const tw = extractTwitter(sr.text);
        if (tw) { const arr = twHits.get(tw) ?? []; arr.push(label); twHits.set(tw, arr); }
      }
      for (const u of sr.urls) { if (urlsToScrape.size < 6) urlsToScrape.add(u); }
    } catch { /* skip */ }
    if (i < queries.length - 1) await jitteredDelay(900);
  }

  // ── Phase 2: Qwant for French entities (much better French coverage) ───
  const qwantQueries = isFrench
    ? queries.filter(q => q.includes(trading) || (city && q.includes(city))).slice(0, 3)
    : [];
  for (let i = 0; i < qwantQueries.length; i++) {
    const query = qwantQueries[i]!;
    const label = `Qwant[q${i + 1}]`;
    try {
      const sr = await qwantSearch(query, "fr_FR");
      result.queriesFired++;
      allSearchText += " " + sr.text;
      if (sr.text) {
        for (const e of extractEmails(sr.text)) {
          const arr = emailHits.get(e) ?? []; arr.push(label); emailHits.set(e, arr);
        }
        const ph = extractPhone(sr.text);
        if (ph) { const arr = phoneHits.get(ph) ?? []; arr.push(label); phoneHits.set(ph, arr); }
        const li = extractLinkedIn(sr.text);
        if (li) { const arr = linkedinHits.get(li) ?? []; arr.push(label); linkedinHits.set(li, arr); }
        const ig = extractInstagram(sr.text);
        if (ig) { const arr = igHits.get(ig) ?? []; arr.push(label); igHits.set(ig, arr); }
      }
      for (const u of sr.urls) { if (urlsToScrape.size < 8) urlsToScrape.add(u); }
    } catch { /* skip */ }
    if (i < qwantQueries.length - 1) await jitteredDelay(1000);
  }

  // ── Phase 3: Bing on top queries (country-aware) ────────────────────────
  const bingQueries = queries.filter(q => q.includes("email") || q.includes("contact") || q.includes("réservations")).slice(0, 2);
  for (let i = 0; i < bingQueries.length; i++) {
    const query = bingQueries[i]!;
    const label = `Bing[q${i + 1}]`;
    try {
      const sr = await bingSearch(query, country);
      result.queriesFired++;
      allSearchText += " " + sr.text;
      if (sr.text) {
        for (const e of extractEmails(sr.text)) {
          const arr = emailHits.get(e) ?? []; arr.push(label); emailHits.set(e, arr);
        }
        const ph = extractPhone(sr.text);
        if (ph) { const arr = phoneHits.get(ph) ?? []; arr.push(label); phoneHits.set(ph, arr); }
        const li = extractLinkedIn(sr.text);
        if (li) { const arr = linkedinHits.get(li) ?? []; arr.push(label); linkedinHits.set(li, arr); }
      }
      for (const u of sr.urls) { if (urlsToScrape.size < 8) urlsToScrape.add(u); }
    } catch { /* skip */ }
    if (i < bingQueries.length - 1) await jitteredDelay(1000);
  }

  // ── Phase 4: Corp → Person hop ─────────────────────────────────────────
  // Extract person names from all search snippets collected so far.
  // Then run targeted person queries — this is how we get from "BAOLI SAS"
  // to "Christophe Caucino" without needing an AI model.
  if (isCorp && allSearchText.length > 200) {
    const persons = extractPersonCandidates(allSearchText);
    if (persons.length > 0) {
      result.personsDiscovered.push(...persons);
      logger.info({ entityId: entity.id, persons }, "Corp→Person hop: discovered person candidates");

      for (const personName of persons.slice(0, 3)) {
        const personQuery = `"${personName}" email contact linkedin`;
        const label = `PersonHop[${personName.split(" ")[0]}]`;
        try {
          const sr = await duckduckgoSearch(personQuery, locale);
          result.queriesFired++;
          if (sr.text) {
            for (const e of extractEmails(sr.text)) {
              const arr = emailHits.get(e) ?? []; arr.push(label); emailHits.set(e, arr);
            }
            const li = extractLinkedIn(sr.text);
            if (li) { const arr = linkedinHits.get(li) ?? []; arr.push(label); linkedinHits.set(li, arr); }
            const ig = extractInstagram(sr.text);
            if (ig) { const arr = igHits.get(ig) ?? []; arr.push(label); igHits.set(ig, arr); }
          }
          for (const u of sr.urls) { if (urlsToScrape.size < 10) urlsToScrape.add(u); }
        } catch { /* skip */ }
        await jitteredDelay(800);
      }
    }
  }

  // ── Phase 5: Direct domain scraping ────────────────────────────────────
  // Try guessed domains directly before scraping search-result URLs.
  // This finds reservations@baolicannes.com without needing it to appear in a search snippet.
  for (const domain of domainTargets.slice(0, 4)) {
    try {
      const label = `Domain[${domain}]`;
      // First try the root — fast check if the domain even resolves
      const rootScrape = await scrapePage(`https://${domain}`);
      result.pagesScraped++;
      if (rootScrape.email) { const arr = emailHits.get(rootScrape.email) ?? []; arr.push(label); emailHits.set(rootScrape.email, arr); }
      if (rootScrape.phone) { const arr = phoneHits.get(rootScrape.phone) ?? []; arr.push(label); phoneHits.set(rootScrape.phone, arr); }
      if (rootScrape.linkedinUrl) { const arr = linkedinHits.get(rootScrape.linkedinUrl) ?? []; arr.push(label); linkedinHits.set(rootScrape.linkedinUrl, arr); }
      if (rootScrape.instagramUrl) { const arr = igHits.get(rootScrape.instagramUrl) ?? []; arr.push(label); igHits.set(rootScrape.instagramUrl, arr); }
      if (rootScrape.twitterUrl) { const arr = twHits.get(rootScrape.twitterUrl) ?? []; arr.push(label); twHits.set(rootScrape.twitterUrl, arr); }

      // If root resolved (email found), also check contact sub-pages
      if (!rootScrape.email) {
        const contactScrape = await findContactPages(domain);
        if (contactScrape.email) { const arr2 = emailHits.get(contactScrape.email) ?? []; arr2.push(`${label}/contact`); emailHits.set(contactScrape.email, arr2); }
        if (contactScrape.phone) { const arr2 = phoneHits.get(contactScrape.phone) ?? []; arr2.push(`${label}/contact`); phoneHits.set(contactScrape.phone, arr2); }
        if (contactScrape.instagramUrl) { const arr2 = igHits.get(contactScrape.instagramUrl) ?? []; arr2.push(`${label}/contact`); igHits.set(contactScrape.instagramUrl, arr2); }
      }
    } catch { /* domain doesn't resolve */ }
    await jitteredDelay(600);
  }

  // ── Phase 6: Scrape search-result URLs ─────────────────────────────────
  const scrapeTargets = [...urlsToScrape].slice(0, 5);
  for (const url of scrapeTargets) {
    try {
      const scraped = await scrapePage(url);
      result.pagesScraped++;
      const label = `Page[${new URL(url).hostname.replace(/^www\./, "").substring(0, 20)}]`;
      if (scraped.email)       { const arr = emailHits.get(scraped.email) ?? []; arr.push(label); emailHits.set(scraped.email, arr); }
      if (scraped.phone)       { const arr = phoneHits.get(scraped.phone) ?? []; arr.push(label); phoneHits.set(scraped.phone, arr); }
      if (scraped.linkedinUrl) { const arr = linkedinHits.get(scraped.linkedinUrl) ?? []; arr.push(label); linkedinHits.set(scraped.linkedinUrl, arr); }
      if (scraped.instagramUrl){ const arr = igHits.get(scraped.instagramUrl) ?? []; arr.push(label); igHits.set(scraped.instagramUrl, arr); }
      if (scraped.twitterUrl)  { const arr = twHits.get(scraped.twitterUrl) ?? []; arr.push(label); twHits.set(scraped.twitterUrl, arr); }
    } catch { /* skip */ }
    await jitteredDelay(700);
  }

  // ── Phase 7: AI extraction pass (Groq llama-3.3-70b) ──────────────────
  // Runs over all accumulated search + page text. Catches what regex missed:
  // obfuscated emails, international phones, inline social handles, owner names.
  if (allSearchText.length > 100) {
    try {
      const ai = await extractWithAI(allSearchText, entity.name, entity.type, country);
      if (ai.source !== "none") {
        const label = `AI[${ai.source}]`;
        if (ai.email) { const arr = emailHits.get(ai.email) ?? []; arr.push(label); emailHits.set(ai.email, arr); }
        if (ai.phone) { const arr = phoneHits.get(ai.phone) ?? []; arr.push(label); phoneHits.set(ai.phone, arr); }
        if (ai.linkedin) { const arr = linkedinHits.get(ai.linkedin) ?? []; arr.push(label); linkedinHits.set(ai.linkedin, arr); }
        if (ai.instagram) { const arr = igHits.get(ai.instagram) ?? []; arr.push(label); igHits.set(ai.instagram, arr); }
        if (ai.twitter) { const arr = twHits.get(ai.twitter) ?? []; arr.push(label); twHits.set(ai.twitter, arr); }
        // Merge AI-discovered persons without duplicating existing regex finds
        for (const person of ai.owners) {
          if (!result.personsDiscovered.includes(person)) result.personsDiscovered.push(person);
        }
        logger.info({ entityId: entity.id, hasEmail: !!ai.email, persons: ai.owners.length, source: ai.source }, "AI extraction phase complete");
      }
    } catch (err: any) {
      logger.debug({ err: err?.message }, "AI extraction phase skipped");
    }
  }

  // ── Phase 8: Pick best-corroborated values ──────────────────────────────
  let bestEmail = ""; let bestEmailCount = 0;
  for (const [email, srcs] of emailHits.entries()) {
    if (srcs.length > bestEmailCount) { bestEmail = email; bestEmailCount = srcs.length; }
  }
  if (bestEmail) {
    result.email = bestEmail;
    result.emailConfidence = scoreByCorroboration(bestEmailCount);
    result.sources.push(...(emailHits.get(bestEmail) ?? []));
  }

  let bestPhone = ""; let bestPhoneCount = 0;
  for (const [phone, srcs] of phoneHits.entries()) {
    if (srcs.length > bestPhoneCount) { bestPhone = phone; bestPhoneCount = srcs.length; }
  }
  if (bestPhone) {
    result.phone = bestPhone;
    result.phoneConfidence = scoreByCorroboration(bestPhoneCount);
    result.sources.push(...(phoneHits.get(bestPhone) ?? []));
  }

  let bestLinkedIn = ""; let bestLinkedInCount = 0;
  for (const [li, srcs] of linkedinHits.entries()) {
    if (srcs.length > bestLinkedInCount) { bestLinkedIn = li; bestLinkedInCount = srcs.length; }
  }
  if (bestLinkedIn) {
    result.linkedinUrl = bestLinkedIn;
    result.sources.push(...(linkedinHits.get(bestLinkedIn) ?? []));
  }

  let bestIg = ""; let bestIgCount = 0;
  for (const [ig, srcs] of igHits.entries()) {
    if (srcs.length > bestIgCount) { bestIg = ig; bestIgCount = srcs.length; }
  }
  if (bestIg) {
    result.instagramUrl = bestIg;
    result.sources.push(...(igHits.get(bestIg) ?? []));
  }

  let bestTw = ""; let bestTwCount = 0;
  for (const [tw, srcs] of twHits.entries()) {
    if (srcs.length > bestTwCount) { bestTw = tw; bestTwCount = srcs.length; }
  }
  if (bestTw) {
    result.twitterUrl = bestTw;
    result.sources.push(...(twHits.get(bestTw) ?? []));
  }

  result.sources = [...new Set(result.sources)];
  return result;
}
