/**
 * Web Enricher — Layer 1/2 Web OSINT + Deep Web OSINT
 *
 * Consolidates two web-based contact discovery layers:
 *   Layer 1: Web OSINT (web-osint-enricher) — DuckDuckGo, EDGAR, GLEIF, OpenCorporates
 *   Layer 2: Deep Web OSINT (deep-web-osint)  — Multi-engine, multi-query, UA-rotating
 *
 * Both layers are deterministic TypeScript, no LLM, no paid API.
 */

import { logger } from "./logger";
import { isValidPublicEmail, sanitizePublicEmail } from "./contact-validation";

// ── Shared utilities ──────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/** Extract first LinkedIn URL from text */
function extractLinkedIn(text: string): string | null {
  const m = text.match(/https?:\/\/(www\.)?linkedin\.com\/(in|pub|company)\/[a-zA-Z0-9\-_%]+\/?/i);
  return m ? m[0].replace(/\/$/, "") : null;
}

const EMAIL_RE = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g;

// ══════════════════════════════════════════════════════════════════════════════
// SECTION A — Web OSINT Enricher (Layer 1)
// ══════════════════════════════════════════════════════════════════════════════

const DDG_API   = "https://api.duckduckgo.com/";
const EDGAR_FT  = "https://efts.sec.gov/LATEST/search-index?q=";
const OC_API    = "https://api.opencorporates.com/v0.4/companies/search";
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

// Simple phone regex for Layer 1 (US-centric)
const PHONE_RE_SIMPLE = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g;

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

async function ocWebsite(name: string): Promise<string | null> {
  try {
    const url = `${OC_API}?q=${encodeURIComponent(name)}&per_page=1&fields=registered_address,website`;
    const resp = await fetch(url, FETCH_OPTS);
    if (!resp.ok) return null;
    const data = await resp.json() as any;
    const co = data?.results?.companies?.[0]?.company;
    return co?.website ?? null;
  } catch {
    return null;
  }
}

async function ddgHtmlSearch(query: string): Promise<string> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
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

async function scrapeContactEmail(website: string): Promise<string | null> {
  try {
    const base = website.replace(/\/$/, "");
    const attempts = [base, `${base}/contact`, `${base}/contact-us`, `${base}/about`];
    for (const url of attempts) {
      try {
        const resp = await fetch(url, {
          signal: AbortSignal.timeout(8_000),
          headers: { "User-Agent": "Mozilla/5.0 (compatible; ApexFinder/1.0)", Accept: "text/html" },
        });
        if (!resp.ok) continue;
        const html = await resp.text();
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

  // Step 2: Email via DDG HTML deep search
  try {
    const emailQuery = isIndividual
      ? `"${name}" email contact site:linkedin.com OR site:bloomberg.com OR site:crunchbase.com`
      : `"${name}" contact email official`;
    const html = await ddgHtmlSearch(emailQuery);
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
            const country = legalAddress.country ?? "";
            if (city || country) result.sources.push(`GLEIF-LEI(${city},${country})`);
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

  // Step 4: OpenCorporates website (for corporations)
  if (isCorp && !result.website && !result.email) {
    try {
      const website = await ocWebsite(name);
      if (website) {
        result.website = website;
        result.sources.push("OpenCorporates-Website");
        const contactEmail = await scrapeContactEmail(website);
        if (contactEmail) { result.email = contactEmail; result.sources.push("Website-Scrape"); }
      }
    } catch (err: any) {
      logger.debug({ err: err.message }, "OC website search failed");
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
}

export interface DeepWebOsintResult {
  email:           string | null;
  emailConfidence: number;
  phone:           string | null;
  phoneConfidence: number;
  linkedinUrl:     string | null;
  sources:         string[];
  queriesFired:    number;
  pagesScraped:    number;
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
  // Search engines and aggregators — no useful HNWI data to scrape
  "google.com", "bing.com", "yahoo.com", "duckduckgo.com",
  // E-commerce — irrelevant
  "amazon.com", "ebay.com", "apple.com", "microsoft.com",
  // Encyclopaedias — scraped separately by in-house enricher
  "wikipedia.org", "wikidata.org",
  // Video / image platforms — no email/contact data
  "youtube.com", "tiktok.com", "pinterest.com",
  // NOTE: linkedin.com, twitter.com, x.com, instagram.com intentionally
  // REMOVED so that social profile URLs found in search results are followed.
  // Dedicated social-discovery module handles structured extraction from these domains.
]);

const EMAIL_BLOCK = new Set([
  "example.com", "domain.com", "email.com", "test.com", "sample.com",
  "noreply.com", "no-reply.com", "invalid.com", "placeholder.com",
  "privacy.com", "domainsbyproxy.com", "whoisguard.com", "privacyprotect.org",
  "whoisprivacycorp.com", "registrant.com",
]);

// Multi-pattern phone regex for Layer 2 (international-aware)
const PHONE_RE_MULTI = [
  /\+\d{1,3}[\s.\-]?\(?\d{1,4}\)?[\s.\-]?\d{1,4}[\s.\-]?\d{1,9}/,
  /\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/,
];

const LINKEDIN_RE = /https?:\/\/(www\.)?linkedin\.com\/(in|pub|company)\/[a-zA-Z0-9\-_%]{3,}\/?/i;

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

function extractEmails(text: string): string[] {
  const all = [...text.matchAll(EMAIL_RE)].map(m => m[0]!.toLowerCase());
  return [...new Set(all.filter(e => {
    const d = e.split("@")[1] ?? "";
    return isValidPublicEmail(e) && e.length < 80;
  }))];
}

function extractPhone(text: string): string | null {
  for (const p of PHONE_RE_MULTI) {
    const m = text.match(p);
    if (m) {
      const c = m[0]!.replace(/\s+/g, " ").trim();
      if ((c.match(/\d/g) ?? []).length >= 7) return c;
    }
  }
  return null;
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

interface SearchResult {
  text:   string;
  urls:   string[];
  engine: string;
}

async function duckduckgoSearch(query: string): Promise<SearchResult> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=us-en`;
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
    if (!resp.ok) return { text: "", urls: [], engine: "DDG" };
    const html = await resp.text();
    return { text: stripHtml(html).slice(0, 12_000), urls: extractDdgUrls(html), engine: "DDG" };
  } catch (err: any) {
    logger.debug({ err: err?.message, query }, "DDG search failed");
    return { text: "", urls: [], engine: "DDG" };
  }
}

async function bingSearch(query: string): Promise<SearchResult> {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en&cc=US&first=1`;
  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(14_000),
      headers: {
        "User-Agent": randomUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        Referer: "https://www.bing.com/",
      },
    });
    if (!resp.ok) return { text: "", urls: [], engine: "Bing" };
    const html = await resp.text();
    return { text: stripHtml(html).slice(0, 12_000), urls: extractBingUrls(html), engine: "Bing" };
  } catch (err: any) {
    logger.debug({ err: err?.message, query }, "Bing search failed");
    return { text: "", urls: [], engine: "Bing" };
  }
}

async function scrapePage(url: string): Promise<{ email: string | null; phone: string | null; linkedinUrl: string | null }> {
  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        "User-Agent": randomUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });
    if (!resp.ok) return { email: null, phone: null, linkedinUrl: null };
    const html = await resp.text().then(h => h.slice(0, 80_000));

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

    const text = stripHtml(html).slice(0, 15_000);
    if (!email) email = extractEmails(text)[0] ?? null;
    const phone = extractPhone(text);
    if (!linkedinUrl) linkedinUrl = extractLinkedIn(text);

    return { email, phone, linkedinUrl };
  } catch {
    return { email: null, phone: null, linkedinUrl: null };
  }
}

function buildQueries(entity: DeepWebOsintInput): string[] {
  const meta = safeJson<Record<string, unknown>>(entity.metadata, {});
  const name = normaliseName(entity.name.trim());
  if (!name || name.length < 4) return [];

  if (/^\d+\s/.test(name) || /\b(flat|house|cottage|manor|farm|apartment)\s+\d/i.test(name)) return [];

  const isIndividual = entity.type === "HNWI" || entity.type === "Gatekeeper" ||
    /^[A-Z][a-z]+ [A-Z]/.test(name);
  const isCorp = !isIndividual;

  const queries: string[] = [];

  if (isIndividual) {
    queries.push(`"${name}" email contact`);
    queries.push(`"${name}" linkedin`);

    const nNumber = typeof meta["nNumber"] === "string" ? meta["nNumber"] as string : null;
    if (nNumber) {
      queries.push(`"${nNumber}" aircraft owner contact email`);
      queries.push(`"${name}" pilot aviation email`);
    }

    const companyName = typeof meta["companyName"] === "string" ? (meta["companyName"] as string).trim() : null;
    if (companyName && companyName !== name) {
      queries.push(`"${name}" "${companyName.substring(0, 40)}" contact`);
    } else if (typeof meta["formType"] === "string") {
      queries.push(`"${name}" investor director SEC contact email`);
    }

    const bizLocation = typeof meta["bizLocation"] === "string" ? meta["bizLocation"] as string : null;
    const residences = safeJson<string | string[]>(entity.knownResidences, []);
    const firstResidence = Array.isArray(residences) ? residences[0] : residences;
    const geoContext = bizLocation || (typeof firstResidence === "string" ? firstResidence : null);
    if (geoContext) {
      const city = geoContext.split(",")[0]?.trim();
      if (city && city.length > 2 && city !== name) {
        queries.push(`"${name}" "${city}" contact email phone`);
      }
    }
  }

  if (isCorp) {
    const clean = name
      .replace(/\b(llc|ltd|limited|corp|corporation|inc|incorporated|group|holdings|trust|co)\b\.?$/gi, "")
      .trim();

    queries.push(`"${name}" CEO director email contact`);
    queries.push(`"${clean}" registered office contact phone`);
    queries.push(`"${name}" head office address`);

    const chId = typeof meta["chId"] === "string" ? meta["chId"] as string : null;
    if (chId || /uk|ltd|plc/i.test(entity.sourceRegistries ?? "")) {
      queries.push(`site:companies-house.gov.uk "${clean}"`);
    }

    queries.push(`"${name}" management team email`);
  }

  return queries.slice(0, 7);
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
    sources: [], queriesFired: 0, pagesScraped: 0,
  };

  const queries = buildQueries(entity);
  if (queries.length === 0) return result;

  const emailHits    = new Map<string, string[]>();
  const phoneHits    = new Map<string, string[]>();
  const linkedinHits = new Map<string, string[]>();
  const urlsToScrape = new Set<string>();

  // Phase 1: DDG HTML search on all queries
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i]!;
    const label = `DDG[q${i + 1}]`;
    try {
      const sr = await duckduckgoSearch(query);
      result.queriesFired++;
      if (sr.text) {
        for (const e of extractEmails(sr.text)) {
          const arr = emailHits.get(e) ?? []; arr.push(label); emailHits.set(e, arr);
        }
        const ph = extractPhone(sr.text);
        if (ph) { const arr = phoneHits.get(ph) ?? []; arr.push(label); phoneHits.set(ph, arr); }
        const li = extractLinkedIn(sr.text);
        if (li) { const arr = linkedinHits.get(li) ?? []; arr.push(label); linkedinHits.set(li, arr); }
      }
      for (const u of sr.urls) { if (urlsToScrape.size < 6) urlsToScrape.add(u); }
    } catch { /* skip */ }
    if (i < queries.length - 1) await jitteredDelay(900);
  }

  // Phase 2: Bing on top 2 most specific queries
  const bingQueries = queries.filter(q => q.includes("email") || q.includes("contact")).slice(0, 2);
  for (let i = 0; i < bingQueries.length; i++) {
    const query = bingQueries[i]!;
    const label = `Bing[q${i + 1}]`;
    try {
      const sr = await bingSearch(query);
      result.queriesFired++;
      if (sr.text) {
        for (const e of extractEmails(sr.text)) {
          const arr = emailHits.get(e) ?? []; arr.push(label); emailHits.set(e, arr);
        }
        const ph = extractPhone(sr.text);
        if (ph) { const arr = phoneHits.get(ph) ?? []; arr.push(label); phoneHits.set(ph, arr); }
        const li = extractLinkedIn(sr.text);
        if (li) { const arr = linkedinHits.get(li) ?? []; arr.push(label); linkedinHits.set(li, arr); }
      }
      for (const u of sr.urls) { if (urlsToScrape.size < 6) urlsToScrape.add(u); }
    } catch { /* skip */ }
    if (i < bingQueries.length - 1) await jitteredDelay(1000);
  }

  // Phase 3: Scrape top result URLs
  const scrapeTargets = [...urlsToScrape].slice(0, 3);
  for (const url of scrapeTargets) {
    try {
      const scraped = await scrapePage(url);
      result.pagesScraped++;
      const label = `Page[${new URL(url).hostname.replace(/^www\./, "").substring(0, 20)}]`;
      if (scraped.email) { const arr = emailHits.get(scraped.email) ?? []; arr.push(label); emailHits.set(scraped.email, arr); }
      if (scraped.phone) { const arr = phoneHits.get(scraped.phone) ?? []; arr.push(label); phoneHits.set(scraped.phone, arr); }
      if (scraped.linkedinUrl) { const arr = linkedinHits.get(scraped.linkedinUrl) ?? []; arr.push(label); linkedinHits.set(scraped.linkedinUrl, arr); }
    } catch { /* skip */ }
    await jitteredDelay(700);
  }

  // Phase 4: Pick best-corroborated values
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

  result.sources = [...new Set(result.sources)];
  return result;
}
