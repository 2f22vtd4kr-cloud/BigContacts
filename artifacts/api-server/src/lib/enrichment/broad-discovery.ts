/**
 * Broad HNWI Discovery Engine
 *
 * Discovers NEW HNWIs from the open web WITHOUT requiring existing entity IDs.
 * Fires broad search queries against DuckDuckGo and generates entities from results.
 *
 * 50+ query templates across 5 categories (10+ each):
 *   1 — Family Office & Private Wealth
 *   2 — Luxury Assets & Aviation
 *   3 — SEC Filings & Corporate
 *   4 — Philanthropy & Foundations
 *   5 — Public Mentions & Networks
 *
 * Template rotation is tracked in Redis key "broad-discovery:last-template-set".
 */

import { logger } from "../logger";
import { db, entitiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getPermanentClient } from "../redis";

// ── Query templates ───────────────────────────────────────────────────────────

const TEMPLATE_CATEGORIES: Record<number, string[]> = {
  1: [
    '"family office" "director" London',
    '"family office" "principal" Switzerland',
    '"private wealth" "manager" Singapore',
    '"single family office" "founder" "New York"',
    '"multi family office" CEO Dubai',
    '"private office" investment "Hong Kong"',
    '"wealth management" partner Geneva',
    '"private banking" director Luxembourg',
    '"family investment" office Monaco',
    '"private trust" beneficiary Jersey',
    '"family office" "chief investment officer"',
    '"private wealth" "portfolio" "ultra high net worth"',
  ],
  2: [
    '"yacht registration" owner Mediterranean',
    '"private jet" "registered owner" "N-number"',
    '"superyacht" "beneficial owner" Cayman',
    '"aircraft registration" owner Bermuda',
    '"luxury real estate" buyer Monaco',
    '"penthouse" sale "New York" LLC',
    '"estate" acquisition Belgravia',
    '"villa" purchase "Cote d\'Azur"',
    '"private island" sale Caribbean',
    '"art collection" collector auction',
    '"superyacht" owner "beneficial ownership"',
    '"private aircraft" owner "turbine"',
  ],
  3: [
    '"Schedule 13D" "beneficial owner" filing',
    '"Schedule 13G" "5% owner" "public company"',
    '"DEF 14A" "executive compensation" director',
    '"Form 4" insider transaction',
    '"10-K" CEO "total compensation"',
    '"beneficial ownership" "5 percent" Schedule',
    '"control person" "public company" SEC',
    '"major shareholder" "10 percent" filing',
    '"acquisition" "beneficial owner" "Schedule D"',
    '"private equity" partner "fund manager"',
    '"hedge fund" manager "Form ADV"',
    '"activist investor" "Schedule 13D"',
  ],
  4: [
    '"private foundation" trustee 990',
    '"charitable trust" donor philanthropy',
    '"family foundation" board grant',
    '"donor advised fund" advisor',
    '"philanthropic" donor foundation',
    '"charity commission" trustee registration',
    '"nonprofit" officer compensation',
    '"endowment" chair board',
    '"gift agreement" donor university',
    '"naming gift" donor pledge',
    '"foundation" "990" "highest compensated"',
    '"private foundation" "assets" "990-PF"',
  ],
  5: [
    '"billionaire" interview portfolio',
    '"HNWI" profile investment',
    '"angel investor" portfolio companies',
    '"board member" "Fortune 500" director',
    '"venture capitalist" partner fund',
    '"hedge fund" manager portfolio',
    '"private equity" "managing partner"',
    '"real estate developer" portfolio million',
    '"art dealer" collection private',
    '"luxury brand" founder CEO',
    '"family office" "net worth" billion',
    '"ultra high net worth" investor',
  ],
};

const TOTAL_CATEGORIES = Object.keys(TEMPLATE_CATEGORIES).length; // 5

// ── Name extraction ───────────────────────────────────────────────────────────

const NAME_PATTERNS = [
  // "Mr/Mrs/Dr/Sir First Last" — captures formal titles
  /\b(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Sir|Lord|Lady|Prof\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g,
  // "First Last, [title/role]" — e.g. "John Smith, CEO"
  /\b([A-Z][a-z]+\s+(?:[A-Z][a-z]+\s+)?[A-Z][a-z]+),\s+(?:CEO|CIO|CFO|COO|Founder|Director|Partner|Chairman|President|Managing|Principal|Trustee|Officer)/g,
  // Possessive — "John Smith's family office"
  /\b([A-Z][a-z]+\s+(?:[A-Z][a-z]+\s+)?[A-Z][a-z]+)'s\s+(?:family office|foundation|trust|fund|capital|estate|group|office)/gi,
  // "said [Name]" / "by [Name]" — journalistic patterns
  /\b(?:said|by|from|of|for)\s+([A-Z][a-z]+\s+(?:[A-Z][a-z]+\s+)?[A-Z][a-z]+)\b/g,
];

// Common false positives to exclude
const EXCLUDED_NAMES = new Set([
  "New York", "Hong Kong", "Los Angeles", "United States", "United Kingdom",
  "Wall Street", "Silicon Valley", "New Jersey", "New Mexico", "Las Vegas",
  "San Francisco", "Fort Worth", "Fort Lauderdale", "Palm Beach",
  "North America", "South America", "Middle East", "South East",
  "Schedule 13D", "Schedule 13G", "Form 4", "Form ADV", "DEF 14A",
  "Annual Report", "Proxy Statement", "Board Meeting", "General Meeting",
]);

function extractNames(text: string): string[] {
  const found = new Set<string>();
  for (const pattern of NAME_PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      const name = (m[1] || m[0]).trim();
      // Validate: 2-4 words, each capitalised, not in exclusion list
      const words = name.split(/\s+/);
      if (words.length >= 2 && words.length <= 4 &&
          words.every(w => /^[A-Z][a-zA-Z'-]+$/.test(w)) &&
          !EXCLUDED_NAMES.has(name) &&
          name.length >= 5 && name.length <= 60) {
        found.add(name);
      }
    }
  }
  return [...found];
}

// ── DuckDuckGo HTML search ────────────────────────────────────────────────────

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/126.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
];

function randomUA() { return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]; }

async function ddgSearch(query: string): Promise<Array<{ snippet: string; url: string }>> {
  try {
    const params = new URLSearchParams({ q: query, kl: "us-en" });
    const resp = await fetch("https://html.duckduckgo.com/html?" + params.toString(), {
      headers: { "User-Agent": randomUA(), "Accept": "text/html" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const results: Array<{ snippet: string; url: string }> = [];
    // Parse snippets from DDG HTML response
    const snippetRe = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    const urlRe = /<a class="result__url"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetMatches = [...html.matchAll(snippetRe)].slice(0, 10);
    const urlMatches = [...html.matchAll(urlRe)].slice(0, 10);
    for (let i = 0; i < snippetMatches.length; i++) {
      const snippet = snippetMatches[i][1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const url = urlMatches[i]?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
      if (snippet.length > 20) results.push({ snippet, url });
    }
    return results;
  } catch (err: any) {
    logger.debug({ err: err?.message, query }, "broad-discovery DDG search error (non-fatal)");
    return [];
  }
}

// ── Dedup against existing names ──────────────────────────────────────────────

async function existingNameSet(): Promise<Set<string>> {
  const rows = await db.select({ name: entitiesTable.name }).from(entitiesTable).limit(100_000);
  return new Set(rows.map(r => r.name.toLowerCase().replace(/[^a-z]/g, "")));
}

function isDuplicateName(candidate: string, existing: Set<string>): boolean {
  const normalized = candidate.toLowerCase().replace(/[^a-z]/g, "");
  if (existing.has(normalized)) return true;
  // Fuzzy: check if any existing name contains all tokens of candidate
  const tokens = candidate.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  for (const ex of existing) {
    const matchCount = tokens.filter(t => ex.includes(t)).length;
    if (matchCount >= 2 && matchCount === tokens.length) return true;
  }
  return false;
}

// ── Template rotation via Redis ───────────────────────────────────────────────

const ROTATION_KEY = "broad-discovery:last-template-set";

async function getNextTemplateSet(rotate: boolean): Promise<number> {
  if (!rotate) return 1;
  try {
    const client = await getPermanentClient();
    if (!client) return 1;
    const last = await client.get(ROTATION_KEY);
    const lastNum = last ? parseInt(last, 10) : 0;
    const next = (lastNum % TOTAL_CATEGORIES) + 1; // cycles 1→2→3→4→5→1
    await client.set(ROTATION_KEY, String(next));
    return next;
  } catch {
    return 1;
  }
}

// ── Entity insertion ──────────────────────────────────────────────────────────

function classifyType(name: string): string {
  // Very simple heuristic — most broad-discovery hits are individuals
  const lower = name.toLowerCase();
  if (/(llc|ltd|inc|corp|group|capital|fund|office|trust|foundation|partners)/i.test(lower)) return "Corporation";
  return "HNWI";
}

// ── Public interface ──────────────────────────────────────────────────────────

export interface BroadDiscoveryResult {
  queriesFired: number;
  resultsScraped: number;
  entitiesDiscovered: number;
  entitiesSkipped: number;   // duplicates
  newEntities: Array<{ name: string; snippet: string; query: string }>;
}

export async function runBroadDiscovery(options: {
  templateSet?: number;       // 1-5, selects which category; overrides rotation
  rotateTemplates?: boolean;  // cycle to next category each run (default true)
  maxQueries?: number;        // default 10
} = {}): Promise<BroadDiscoveryResult> {
  const { rotateTemplates = true, maxQueries = 10 } = options;

  const templateSet = options.templateSet ?? await getNextTemplateSet(rotateTemplates);
  const templates = TEMPLATE_CATEGORIES[templateSet] ?? TEMPLATE_CATEGORIES[1];
  const queries = templates.slice(0, Math.min(maxQueries, templates.length));

  logger.info({ templateSet, queryCount: queries.length }, "Broad discovery: starting");

  let queriesFired = 0;
  let resultsScraped = 0;
  const candidateMap = new Map<string, { snippet: string; query: string }>(); // name → best snippet

  for (const query of queries) {
    const results = await ddgSearch(query);
    queriesFired++;
    resultsScraped += results.length;

    for (const { snippet, url: _url } of results) {
      const names = extractNames(snippet);
      for (const name of names) {
        if (!candidateMap.has(name)) {
          candidateMap.set(name, { snippet, query });
        }
      }
    }

    // Polite delay between queries
    await new Promise(r => setTimeout(r, 2_000 + Math.random() * 1_000));
  }

  logger.info({ queriesFired, resultsScraped, candidates: candidateMap.size }, "Broad discovery: queries done, deduping against DB");

  // Dedup against existing entities
  const existingNames = await existingNameSet();
  const newEntities: Array<{ name: string; snippet: string; query: string }> = [];
  let skipped = 0;

  for (const [name, { snippet, query }] of candidateMap) {
    if (isDuplicateName(name, existingNames)) { skipped++; continue; }
    newEntities.push({ name, snippet, query });
  }

  // Insert new entities
  let inserted = 0;
  for (const { name, snippet, query } of newEntities) {
    try {
      const type = classifyType(name);
      await db.insert(entitiesTable).values({
        name,
        type,
        sourceRegistries: JSON.stringify(["web-discovery"]),
        bayesianScore: 0.3,
        notes: `Discovered via broad web search.\nQuery: ${query}\nSnippet: ${snippet.slice(0, 200)}`,
        liveSource: "broad-web-discovery",
        isHot: false,
        nationality: null,
        estimatedNetWorth: null,
        knownResidences: null,
        contactConfidence: 0,
      } as any).onConflictDoNothing();
      existingNames.add(name.toLowerCase().replace(/[^a-z]/g, "")); // prevent same-run dups
      inserted++;
    } catch (err: any) {
      logger.debug({ err: err?.message, name }, "broad-discovery insert error (non-fatal)");
    }
  }

  logger.info({ inserted, skipped, queriesFired, resultsScraped, templateSet }, "Broad discovery complete");

  return {
    queriesFired,
    resultsScraped,
    entitiesDiscovered: inserted,
    entitiesSkipped: skipped,
    newEntities: newEntities.slice(0, 100), // cap result payload
  };
}
