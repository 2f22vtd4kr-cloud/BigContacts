/**
 * Deep Web OSINT Enricher — Multi-engine · Multi-query · UA-rotating
 *
 * Designed as an ADDITIVE layer on top of the in-house enricher.
 * Targets entities that structured databases (Wikidata, GitHub, ORCID) missed —
 * primarily FAA aircraft owners and HMLR property buyers who are not public figures.
 *
 * Strategy:
 *   1. Build 4–7 context-aware query templates per entity using ALL available metadata:
 *      N-number (FAA), company name (EDGAR/CH), location, filing type, asset type
 *   2. Fire each query against DuckDuckGo HTML (html.duckduckgo.com/html)
 *      rotating through 12 real browser User-Agent signatures
 *   3. Fire the 2 most targeted queries against Bing HTML (separate index, complementary results)
 *   4. Parse HTML snippets for emails, phones, LinkedIn URLs
 *   5. Follow the top 3 non-social result URLs to scrape actual pages
 *   6. Cross-validate: same value appearing in N independent sources → confidence score
 *   7. Results stored in Upstash slot 2 contact cache (REDIS_URL_2) for persistence
 */

import { logger } from "./logger";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  emailConfidence: number;   // 0–100; higher when found in more independent sources
  phone:           string | null;
  phoneConfidence: number;
  linkedinUrl:     string | null;
  sources:         string[];  // which queries/engines produced the find
  queriesFired:    number;
  pagesScraped:    number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// 12 real browser fingerprints — rotated randomly per search request
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

// Domains never worth scraping for personal contact info.
// NOTE: linkedin.com, twitter.com, x.com, instagram.com intentionally REMOVED —
// the dedicated social-discovery module handles structured extraction from those domains.
// Keeping them here would silently drop the most valuable HNWI contact surfaces.
const SKIP_DOMAINS = new Set([
  // Search engines and aggregators
  "google.com", "bing.com", "yahoo.com", "duckduckgo.com",
  // E-commerce — no HNWI contact data
  "amazon.com", "ebay.com", "apple.com", "microsoft.com",
  // Video / image platforms
  "youtube.com", "tiktok.com", "pinterest.com",
  // Encyclopaedias — scraped separately by in-house enricher
  "wikipedia.org", "wikidata.org",
  // Government registries — scraped via dedicated ingestors, not general scraper
  "sec.gov", "gov.uk", "faa.gov", "irs.gov",
]);

// Email blocklist — not real contact emails
const EMAIL_BLOCK = new Set([
  "example.com", "domain.com", "email.com", "test.com", "sample.com",
  "noreply.com", "no-reply.com", "invalid.com", "placeholder.com",
  "privacy.com", "domainsbyproxy.com", "whoisguard.com", "privacyprotect.org",
  "whoisprivacycorp.com", "registrant.com",
]);

const EMAIL_RE  = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g;
const PHONE_RE  = [
  /\+\d{1,3}[\s.\-]?\(?\d{1,4}\)?[\s.\-]?\d{1,4}[\s.\-]?\d{1,9}/,
  /\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/,
];
const LINKEDIN_RE = /https?:\/\/(www\.)?linkedin\.com\/(in|pub|company)\/[a-zA-Z0-9\-_%]{3,}\/?/i;

// ─── Utilities ────────────────────────────────────────────────────────────────

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!;
}

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

function jitteredDelay(baseMs: number) {
  return sleep(baseMs + Math.floor(Math.random() * 600));
}

function safeJson<T>(str: string | null | undefined, fallback: T): T {
  try { return str ? JSON.parse(str) as T : fallback; } catch { return fallback; }
}

// Normalise ALL-CAPS "LAST FIRST" (FAA/EDGAR) → "First Last"
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
    return !EMAIL_BLOCK.has(d) && !d.includes("privacy") && !d.includes("proxy") && e.length < 80;
  }))];
}

function extractPhone(text: string): string | null {
  for (const p of PHONE_RE) {
    const m = text.match(p);
    if (m) {
      const c = m[0]!.replace(/\s+/g, " ").trim();
      if ((c.match(/\d/g) ?? []).length >= 7) return c;
    }
  }
  return null;
}

function extractLinkedIn(text: string): string | null {
  const m = text.match(LINKEDIN_RE);
  return m ? m[0]!.replace(/\/$/, "") : null;
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

// Extract actual result URLs from DDG HTML (uses uddg= redirect parameter)
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

// Extract actual result URLs from Bing HTML
function extractBingUrls(html: string): string[] {
  const urls: string[] = [];
  // Bing result URLs appear as href attributes in <h2><a href="https://...">
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

// ─── Search Engines ───────────────────────────────────────────────────────────

interface SearchResult {
  text:   string;       // plain text of all snippets
  urls:   string[];     // actual result URLs (non-social)
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
    const urls = extractDdgUrls(html);
    const text = stripHtml(html).slice(0, 12_000);
    return { text, urls, engine: "DDG" };
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
    const urls = extractBingUrls(html);
    const text = stripHtml(html).slice(0, 12_000);
    return { text, urls, engine: "Bing" };
  } catch (err: any) {
    logger.debug({ err: err?.message, query }, "Bing search failed");
    return { text: "", urls: [], engine: "Bing" };
  }
}

// Scrape a URL for contact info — light, respects 10s timeout
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

    // Extract mailto: hrefs first (highest accuracy)
    let email: string | null = null;
    const mailtoRe = /href=["']mailto:([^"'?\s]+)/gi;
    for (const m of html.matchAll(mailtoRe)) {
      const addr = m[1]!.toLowerCase().trim();
      const domain = addr.split("@")[1] ?? "";
      if (addr.includes("@") && !EMAIL_BLOCK.has(domain) && addr.length < 80) {
        email = addr;
        break;
      }
    }

    // LinkedIn from href
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

// ─── Query Builder ────────────────────────────────────────────────────────────

function buildQueries(entity: DeepWebOsintInput): string[] {
  const meta = safeJson<Record<string, unknown>>(entity.metadata, {});
  const name = normaliseName(entity.name.trim());
  if (!name || name.length < 4) return [];

  // Skip address-named HMLR entries (e.g. "23 High Street London")
  if (/^\d+\s/.test(name) || /\b(flat|house|cottage|manor|farm|apartment)\s+\d/i.test(name)) return [];

  const isIndividual = entity.type === "HNWI" || entity.type === "Gatekeeper" ||
    /^[A-Z][a-z]+ [A-Z]/.test(name);
  const isCorp = !isIndividual;

  const queries: string[] = [];

  if (isIndividual) {
    // Core contact queries
    queries.push(`"${name}" email contact`);
    queries.push(`"${name}" linkedin`);

    // Aviation context — N-number and aircraft type are strong identifiers
    const nNumber = typeof meta["nNumber"] === "string" ? meta["nNumber"] as string : null;
    if (nNumber) {
      queries.push(`"${nNumber}" aircraft owner contact email`);
      queries.push(`"${name}" pilot aviation email`);
    }

    // Company / filing context
    const companyName = typeof meta["companyName"] === "string" ? (meta["companyName"] as string).trim() : null;
    if (companyName && companyName !== name) {
      queries.push(`"${name}" "${companyName.substring(0, 40)}" contact`);
    } else if (typeof meta["formType"] === "string") {
      // EDGAR-sourced entity — professional investor context
      queries.push(`"${name}" investor director SEC contact email`);
    }

    // Geographic context — narrows to the right person
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
    // Strip legal suffix for cleaner search
    const clean = name
      .replace(/\b(llc|ltd|limited|corp|corporation|inc|incorporated|group|holdings|trust|co)\b\.?$/gi, "")
      .trim();

    queries.push(`"${name}" CEO director email contact`);
    queries.push(`"${clean}" registered office contact phone`);
    queries.push(`"${name}" head office address`);

    // CH-registered companies
    const chId = typeof meta["chId"] === "string" ? meta["chId"] as string : null;
    if (chId || /uk|ltd|plc/i.test(entity.sourceRegistries ?? "")) {
      queries.push(`site:companies-house.gov.uk "${clean}"`);
    }

    queries.push(`"${name}" management team email`);
  }

  return queries.slice(0, 7);
}

// ─── Cross-validation scoring ─────────────────────────────────────────────────
// More independent sources confirming the same value = higher confidence

function scoreByCorroboration(sources: number): number {
  if (sources >= 4) return 88;
  if (sources >= 3) return 78;
  if (sources >= 2) return 62;
  return 42;
}

// ─── Main enricher ────────────────────────────────────────────────────────────

export async function deepWebOsintEnrich(entity: DeepWebOsintInput): Promise<DeepWebOsintResult> {
  const result: DeepWebOsintResult = {
    email: null, emailConfidence: 0,
    phone: null, phoneConfidence: 0,
    linkedinUrl: null,
    sources: [], queriesFired: 0, pagesScraped: 0,
  };

  const queries = buildQueries(entity);
  if (queries.length === 0) return result;

  // Accumulators for cross-validation
  const emailHits = new Map<string, string[]>();  // email → [source labels]
  const phoneHits = new Map<string, string[]>();
  const linkedinHits = new Map<string, string[]>();
  const urlsToScrape = new Set<string>();

  // ── Phase 1: DDG HTML search on all queries ──────────────────────────────
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i]!;
    const label = `DDG[q${i + 1}]`;

    try {
      const sr = await duckduckgoSearch(query);
      result.queriesFired++;

      if (sr.text) {
        for (const e of extractEmails(sr.text)) {
          const arr = emailHits.get(e) ?? [];
          arr.push(label);
          emailHits.set(e, arr);
        }
        const ph = extractPhone(sr.text);
        if (ph) {
          const arr = phoneHits.get(ph) ?? [];
          arr.push(label);
          phoneHits.set(ph, arr);
        }
        const li = extractLinkedIn(sr.text);
        if (li) {
          const arr = linkedinHits.get(li) ?? [];
          arr.push(label);
          linkedinHits.set(li, arr);
        }
      }

      // Collect result URLs for later scraping (cap at 6 total)
      for (const u of sr.urls) {
        if (urlsToScrape.size < 6) urlsToScrape.add(u);
      }
    } catch { /* skip failed query */ }

    // Polite delay between DDG requests — vary to avoid fingerprinting
    if (i < queries.length - 1) await jitteredDelay(900);
  }

  // ── Phase 2: Bing on top 2 most specific queries (different index) ────────
  const bingQueries = queries.filter(q => q.includes("email") || q.includes("contact")).slice(0, 2);
  for (let i = 0; i < bingQueries.length; i++) {
    const query = bingQueries[i]!;
    const label = `Bing[q${i + 1}]`;

    try {
      const sr = await bingSearch(query);
      result.queriesFired++;

      if (sr.text) {
        for (const e of extractEmails(sr.text)) {
          const arr = emailHits.get(e) ?? [];
          arr.push(label);
          emailHits.set(e, arr);
        }
        const ph = extractPhone(sr.text);
        if (ph) {
          const arr = phoneHits.get(ph) ?? [];
          arr.push(label);
          phoneHits.set(ph, arr);
        }
        const li = extractLinkedIn(sr.text);
        if (li) {
          const arr = linkedinHits.get(li) ?? [];
          arr.push(label);
          linkedinHits.set(li, arr);
        }
      }

      for (const u of sr.urls) {
        if (urlsToScrape.size < 6) urlsToScrape.add(u);
      }
    } catch { /* skip */ }

    if (i < bingQueries.length - 1) await jitteredDelay(1000);
  }

  // ── Phase 3: Scrape top result URLs for actual page content ──────────────
  const scrapeTargets = [...urlsToScrape].slice(0, 3);
  for (const url of scrapeTargets) {
    try {
      const scraped = await scrapePage(url);
      result.pagesScraped++;
      const label = `Page[${new URL(url).hostname.replace(/^www\./, "").substring(0, 20)}]`;

      if (scraped.email) {
        const arr = emailHits.get(scraped.email) ?? [];
        arr.push(label);
        emailHits.set(scraped.email, arr);
      }
      if (scraped.phone) {
        const arr = phoneHits.get(scraped.phone) ?? [];
        arr.push(label);
        phoneHits.set(scraped.phone, arr);
      }
      if (scraped.linkedinUrl) {
        const arr = linkedinHits.get(scraped.linkedinUrl) ?? [];
        arr.push(label);
        linkedinHits.set(scraped.linkedinUrl, arr);
      }
    } catch { /* skip */ }

    await jitteredDelay(700);
  }

  // ── Phase 4: Pick best-corroborated values ────────────────────────────────
  let bestEmail = "";
  let bestEmailCount = 0;
  for (const [email, srcs] of emailHits.entries()) {
    if (srcs.length > bestEmailCount) { bestEmail = email; bestEmailCount = srcs.length; }
  }
  if (bestEmail) {
    result.email = bestEmail;
    result.emailConfidence = scoreByCorroboration(bestEmailCount);
    result.sources.push(...(emailHits.get(bestEmail) ?? []));
  }

  let bestPhone = "";
  let bestPhoneCount = 0;
  for (const [phone, srcs] of phoneHits.entries()) {
    if (srcs.length > bestPhoneCount) { bestPhone = phone; bestPhoneCount = srcs.length; }
  }
  if (bestPhone) {
    result.phone = bestPhone;
    result.phoneConfidence = scoreByCorroboration(bestPhoneCount);
    result.sources.push(...(phoneHits.get(bestPhone) ?? []));
  }

  let bestLinkedIn = "";
  let bestLinkedInCount = 0;
  for (const [li, srcs] of linkedinHits.entries()) {
    if (srcs.length > bestLinkedInCount) { bestLinkedIn = li; bestLinkedInCount = srcs.length; }
  }
  if (bestLinkedIn) {
    result.linkedinUrl = bestLinkedIn;
    result.sources.push(...(linkedinHits.get(bestLinkedIn) ?? []));
  }

  // Deduplicate sources list
  result.sources = [...new Set(result.sources)];

  return result;
}
