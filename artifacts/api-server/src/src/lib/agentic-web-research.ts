/**
 * Agentic web research loop — ReAct-style, not a fixed playbook.
 *
 * Same model class as Grok Agent / Gemini AI Mode, plus Apex OSINT tools:
 *   web_search(query) → SERP snippets + URLs
 *   visit(url)        → page text
 *   done              → structured findings with source URLs
 *
 * The LLM invents queries each turn from observations. No template checklist.
 * Contacts without http(s) source URLs are dropped (fail-closed admission).
 */

import { logger } from "./logger";
import { filterClaimUrls, filterPassagesForQuery } from "./passage-filter";
import { sanitizePublicEmail, sanitizePublicPhone, isTrashContactValue } from "./contact-validation";
import {
  extractWalletSeedsFromText,
  buildWalletSeedPlan,
  formatWalletSeedPlanForPrompt,
  objectiveLooksWalletFirst,
} from "./wallet-seed";
import { lookupDomainSurface, findingsFromDomainSurface } from "./domain-surface";
import { setAgenticLlmHealth, getAgenticLlmHealth } from "./agentic-llm-health";
import { GROQ_CHAT_MODELS } from "./groq-models";
export { getAgenticLlmHealth };

export type AgenticFinding = {
  vectorType: "email" | "phone" | "linkedin" | "website" | "other" | "social";
  value: string;
  personName: string | null;
  role: string | null;
  scope: "organization" | "candidate" | "unknown";
  sourceUrls: string[];
  note: string;
};

export type AgenticWebResearchResult = {
  status: "completed" | "unavailable" | "error" | "timeout";
  model: string;
  iterations: number;
  searches: number;
  visits: number;
  findings: AgenticFinding[];
  trajectory: string[];
  error?: string;
};

type AgentAction =
  | { action: "web_search"; query: string; thought?: string }
  | { action: "visit"; url: string; thought?: string }
  | { action: "done"; findings: AgenticFinding[]; thought?: string };

const MAX_ITER = 20;
const MAX_OBS = 5_000;
/** First N steps are free ReAct only — force-hops must not starve the multi-LLM loop
 *  (root cause of single-agent Grok beating the bureau on the same target). */

function randomUA(): string {
  const uas = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  ];
  return uas[Math.floor(Math.random() * uas.length)]!;
}

/** Decode Cloudflare email-protection href hashes (public contact-page recovery). */
function decodeCloudflareEmail(hex: string): string | null {
  try {
    const data = hex.replace(/[^a-fA-F0-9]/g, "");
    if (data.length < 4 || data.length % 2 !== 0) return null;
    const key = parseInt(data.slice(0, 2), 16);
    let out = "";
    for (let i = 2; i < data.length; i += 2) {
      out += String.fromCharCode(parseInt(data.slice(i, i + 2), 16) ^ key);
    }
    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(out)) return null;
    return out.toLowerCase();
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function toolWebSearchSerper(query: string): Promise<{ text: string; urls: string[] } | null> {
  const key = process.env.SERPER_API_KEY ?? "";
  if (!key) return null;
  try {
    const resp = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 10, gl: "us", hl: "en" }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      organic?: Array<{ title?: string; link?: string; snippet?: string }>;
      knowledgeGraph?: { description?: string };
    };
    const urls: string[] = [];
    const parts: string[] = [];
    if (data.knowledgeGraph?.description) parts.push(data.knowledgeGraph.description);
    for (const row of data.organic ?? []) {
      if (row.link && /^https?:\/\//i.test(row.link)) urls.push(row.link);
      if (row.title || row.snippet) parts.push([row.title, row.snippet].filter(Boolean).join(" — "));
    }
    const text = filterPassagesForQuery(parts.join("\n"), query, { maxChars: MAX_OBS });
    return { text, urls: [...new Set(urls)].slice(0, 10) };
  } catch (err: any) {
    logger.debug({ err: err?.message, query }, "agentic serper search failed");
    return null;
  }
}


async function toolWebSearchTavily(query: string): Promise<{ text: string; urls: string[] } | null> {
  const keys = ["TAVILY_API_KEY", ...Array.from({ length: 8 }, (_, i) => `TAVILY_API_KEY_${i + 1}`)]
    .map((n) => process.env[n] ?? "")
    .filter((k) => k.length > 0);
  if (!keys.length) return null;
  for (const key of keys) {
    try {
      const resp = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          search_depth: "advanced",
          include_answer: true,
          max_results: 8,
          include_raw_content: false,
        }),
        signal: AbortSignal.timeout(18_000),
      });
      if (!resp.ok) continue;
      const data = (await resp.json()) as {
        answer?: string;
        results?: Array<{ title?: string; url?: string; content?: string }>;
      };
      const urls: string[] = [];
      const parts: string[] = [];
      if (data.answer) parts.push(data.answer);
      for (const row of data.results ?? []) {
        if (row.url && /^https?:\/\//i.test(row.url)) urls.push(row.url);
        if (row.title || row.content) parts.push([row.title, row.content].filter(Boolean).join(" — "));
      }
      if (!urls.length && !parts.length) continue;
      const text = filterPassagesForQuery(parts.join("\n"), query, { maxChars: MAX_OBS });
      return { text, urls: [...new Set(urls)].slice(0, 10) };
    } catch (err: any) {
      logger.debug({ err: err?.message, query }, "agentic tavily search failed");
      continue;
    }
  }
  return null;
}


async function toolWebSearchExa(query: string): Promise<{ text: string; urls: string[] } | null> {
  const keys = ["EXA_API_KEY", "EXA_1", "EXA_2", ...Array.from({ length: 8 }, (_, i) => `EXA_API_KEY_${i + 1}`)]
    .map((n) => process.env[n] ?? "")
    .filter((k) => k.length > 0);
  if (!keys.length) return null;
  for (const key of keys) {
    try {
      const resp = await fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: {
          "x-api-key": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          type: "auto",
          numResults: 8,
          contents: { text: { maxCharacters: 1200 } },
        }),
        signal: AbortSignal.timeout(18_000),
      });
      if (!resp.ok) continue;
      const data = (await resp.json()) as {
        results?: Array<{ title?: string; url?: string; text?: string }>;
      };
      const urls: string[] = [];
      const parts: string[] = [];
      for (const row of data.results ?? []) {
        if (row.url && /^https?:\/\//i.test(row.url)) urls.push(row.url);
        if (row.title || row.text) parts.push([row.title, row.text].filter(Boolean).join(" — "));
      }
      if (!urls.length && !parts.length) continue;
      const text = filterPassagesForQuery(parts.join("\n"), query, { maxChars: MAX_OBS });
      return { text, urls: [...new Set(urls)].slice(0, 10) };
    } catch (err: any) {
      logger.debug({ err: err?.message, query }, "agentic exa search failed");
      continue;
    }
  }
  return null;
}

async function toolWebSearch(query: string): Promise<{ text: string; urls: string[] }> {
  // Prefer Serper (stable SERP URLs), then Tavily (keyed advanced search), then DDG HTML.
  // Single-provider starvation is why a general agent can beat the bureau on the same surface.
  const serper = await toolWebSearchSerper(query);
  if (serper && serper.urls.length > 0) return serper;

  const tavily = await toolWebSearchTavily(query);
  if (tavily && (tavily.urls.length > 0 || tavily.text.length > 40)) return tavily;

  const exa = await toolWebSearchExa(query);
  if (exa && (exa.urls.length > 0 || exa.text.length > 40)) return exa;

  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=us-en`;
  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(14_000),
      headers: {
        "User-Agent": randomUA(),
        Accept: "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!resp.ok) return exa ?? tavily ?? serper ?? { text: "", urls: [] };
    const html = await resp.text();
    const urls: string[] = [];
    for (const m of html.matchAll(/uddg=([^&"]+)/g)) {
      try {
        const u = decodeURIComponent(m[1]!);
        if (/^https?:\/\//i.test(u) && !/duckduckgo\.com/i.test(u)) urls.push(u);
      } catch { /* skip */ }
    }
    for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
      const u = m[1]!;
      if (!/duckduckgo|google\.|bing\.|yahoo\./i.test(u)) urls.push(u);
    }
    const text = filterPassagesForQuery(stripHtml(html), query, { maxChars: MAX_OBS });
    const out = { text, urls: [...new Set(urls)].slice(0, 10) };
    if (out.urls.length === 0 && (exa || tavily || serper)) return exa ?? tavily ?? serper!;
    return out;
  } catch (err: any) {
    logger.debug({ err: err?.message, query }, "agentic web_search failed");
    return exa ?? tavily ?? serper ?? { text: "", urls: [] };
  }
}

/** Deterministic contact-surface extractor from raw HTML — survives passage filter.
 *  Prepends high-signal emails/phones/addresses/titles so agentic LLM cannot miss
 *  org inboxes (info@) or phone lines that score poorly against a bare URL query.
 */
function extractContactFactsFromHtml(html: string): string {
  const facts: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const t = s.trim();
    if (t.length < 5 || t.length > 200 || seen.has(t.toLowerCase())) return;
    seen.add(t.toLowerCase());
    facts.push(t);
  };

  for (const m of html.matchAll(/href=["']mailto:([^"'?\s]+)/gi)) {
    push(`EMAIL: ${m[1]!.toLowerCase()}`);
  }
  // Cloudflare email-protection (mastermfg.com and many SMB sites)
  for (const m of html.matchAll(
    /(?:email-protection|cdn-cgi\/l\/email-protection)[#/]([a-fA-F0-9]{4,})/gi,
  )) {
    const decoded = decodeCloudflareEmail(m[1]!);
    if (decoded) push(`EMAIL: ${decoded}`);
  }
  for (const m of html.matchAll(/data-cfemail=["']([a-fA-F0-9]+)["']/gi)) {
    const decoded = decodeCloudflareEmail(m[1]!);
    if (decoded) push(`EMAIL: ${decoded}`);
  }
  for (const m of html.matchAll(/\b([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/gi)) {
    const addr = m[1]!.toLowerCase();
    if (!/example\.|sentry\.|schema\.|wixpress|cloudflare|wordpress|github\.com|google\.com/.test(addr)) {
      push(`EMAIL: ${addr}`);
    }
  }
  // Obfuscated org inboxes common on WordPress/SMB sites: info [at] domain.com / info (at) domain.com
  for (const m of html.matchAll(
    /\b((?:info|contact|sales|office|admin|support|hello)(?:\s*\[at\]\s*|\s*\(at\)\s*|\s+at\s+)[a-z0-9.-]+\.[a-z]{2,})\b/gi,
  )) {
    const normalized = m[1]!.toLowerCase().replace(/\s*\[at\]\s*|\s*\(at\)\s*|\s+at\s+/g, "@");
    if (normalized.includes("@")) push(`EMAIL: ${normalized}`);
  }
  for (const m of html.matchAll(/href=["']tel:([^"']+)/gi)) {
    push(`PHONE: ${m[1]!.replace(/\s+/g, " ").trim()}`);
  }
  // Twin/co-founder narrative: "Norman and Nathan Miller" (require 2-token full names)
  for (const m of html.matchAll(
    /\b(?:twin brothers|brothers|co-founders?)[,:]?\s+([A-Z][a-z]+)\s+and\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/gi,
  )) {
    const last = m[3]!.trim();
    push(`PERSON: ${m[1]!.trim()} ${last} — co-founder`);
    push(`PERSON: ${m[2]!.trim()} ${last} — co-founder`);
  }
  // About-page ownership narrative (Grok reads these; Apex must emit PERSON findings)
  // "founder Harold A. Biddle" / "founded by John Smith"
  for (const m of html.matchAll(
    /\b(?:founder|founded by|co-founder)\s+([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+)\b/gi,
  )) {
    const name = m[1]!.replace(/\s+/g, " ").trim();
    if (name.split(/\s+/).length >= 2 && name.length < 60) push(`PERSON: ${name} — founder`);
  }
  // "sold to current owner and president, David Hammer" / "current owner and president David Hammer"
  for (const m of html.matchAll(
    /\b(?:current\s+)?(?:owner|president|ceo)(?:\s+and\s+(?:owner|president|ceo))?[,\s]+([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+)\b/gi,
  )) {
    const name = m[1]!.replace(/\s+/g, " ").trim();
    if (name.split(/\s+/).length >= 2 && name.length < 60 && !/^(Inc|LLC|Corp|Company)\b/i.test(name)) {
      push(`PERSON: ${name} — owner`);
    }
  }
  // "David Hammer, President" already partially covered; add "President/Owner David Hammer"
  for (const m of html.matchAll(
    /\b(?:President|Owner|CEO|Founder)\s*\/?\s*(?:Owner|President)?\s*,?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g,
  )) {
    const name = m[1]!.replace(/\s+/g, " ").trim();
    if (name.split(/\s+/).length >= 2 && name.length < 50) push(`PERSON: ${name} — principal`);
  }
  // Compound title then name: "President and CEO Bryon Shafer" / "CFO Rick Sykora" (PR buyout style)
  for (const m of html.matchAll(
    /\b(?:President\s+and\s+CEO|CEO\s+and\s+President|President|CEO|Chief Executive Officer|CFO|Chief Financial Officer|COO|Chief Operating Officer|Executive Chairman)\s+([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)?)\b/g,
  )) {
    const name = m[1]!.replace(/\s+/g, " ").trim();
    if (name.split(/\s+/).length >= 2 && name.length < 50 && !/^(Inc|LLC|Corp|Company|Board|the)\b/i.test(name)) {
      push(`PERSON: ${name} — principal`);
    }
  }
  for (const m of html.matchAll(
    /\bco-?founder\s+([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)?)\b/gi,
  )) {
    const name = m[1]!.replace(/\s+/g, " ").trim();
    if (name.split(/\s+/).length >= 2 && name.length < 50) {
      push(`PERSON: ${name} — co-founder`);
    }
  }

  // Same-line Name / Title (KB Tool & Die style): "Alan G. Klinger / President"
  for (const m of html.matchAll(
    /\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+)\s*\/\s*((?:President|CEO|Owner|Founder|Vice President|VP|General Manager|Director|Principal|Treasurer|Chairman|Manager|Supervisor)[^<\n@]{0,40})/g,
  )) {
    const name = m[1]!.replace(/\s+/g, " ").trim();
    const role = m[2]!.replace(/\s+/g, " ").trim().slice(0, 60);
    if (name.split(/\s+/).length >= 2 && name.length < 60) {
      push(`PERSON: ${name} — ${role}`);
    }
  }
  // Ownership transfer: "sold the business to Karl Niemela" / "acquired by John Smith" (Grok reads these)
  for (const m of html.matchAll(
    /\b(?:sold(?:\s+the\s+business)?\s+to|acquired\s+by|purchased\s+by|bought\s+by)\s+([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+)\b/gi,
  )) {
    const name = m[1]!.replace(/\s+/g, " ").trim();
    if (name.split(/\s+/).length >= 2 && name.length < 60 && !/^(Inc|LLC|Corp|Company|the)\b/i.test(name)) {
      push(`PERSON: ${name} — owner`);
      push(`SUCCESSION: sold/acquired → ${name}`);
    }
  }
  // "John H. Fennig, who is the owner and President" / "owned and led by Charles Reitsma"
  for (const m of stripHtml(html).matchAll(
    /\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+),\s*who\s+is\s+the\s+(owner\s+and\s+President|President\s+and\s+owner|owner|President|CEO|founder)/gi,
  )) {
    const name = m[1]!.replace(/\s+/g, " ").trim();
    const role = m[2]!.replace(/\s+/g, " ").trim().slice(0, 40);
    if (name.split(/\s+/).length >= 2 && name.length < 50) push(`PERSON: ${name} — ${role}`);
  }
  for (const m of stripHtml(html).matchAll(
    /\b(?:owned\s+and\s+led\s+by|led\s+by|founded\s+by)\s+([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+)\b/gi,
  )) {
    const name = m[1]!.replace(/\s+/g, " ").trim();
    if (name.split(/\s+/).length >= 2 && name.length < 50) push(`PERSON: ${name} — owner`);
  }
  // "Vince is the second-generation owner" / "Vince Petek\nPresident" narrative
  for (const m of stripHtml(html).matchAll(
    /\b([A-Z][a-z]+)\s+is\s+the\s+(second-generation\s+owner|owner|president|CEO|managing\s+partner)\b/gi,
  )) {
    // first name only — try to expand from nearby full name later; still emit as lead
    const first = m[1]!.trim();
    const role = m[2]!.replace(/\s+/g, " ").trim();
    if (first.length >= 3) push(`PERSON: ${first} — ${role}`);
  }
  for (const m of stripHtml(html).matchAll(
    /\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+)\s+is\s+the\s+(second-generation\s+owner|owner|president|CEO|managing\s+partner)\b/gi,
  )) {
    const name = m[1]!.replace(/\s+/g, " ").trim();
    const role = m[2]!.replace(/\s+/g, " ").trim();
    if (name.split(/\s+/).length >= 2 && name.length < 50) push(`PERSON: ${name} — ${role}`);
  }
  // "Logan Conrad\nManaging Partner" / name then Managing Partner within 2 lines
  for (const m of stripHtml(html).matchAll(
    /\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+)\s*\n\s*(Managing\s+Partner|General\s+Manager|Project\s+Coordinator|VP\s+of\s+Manufacturing)/gi,
  )) {
    const name = m[1]!.replace(/\s+/g, " ").trim();
    const role = m[2]!.replace(/\s+/g, " ").trim();
    if (name.split(/\s+/).length >= 2 && name.length < 50) push(`PERSON: ${name} — ${role}`);
  }
  // "Kendra Fennig who is the Vice President and Secretary Treasurer"
  for (const m of stripHtml(html).matchAll(
    /\b([A-Z][a-z]+(?:\s+[A-Z]\.)?(?:\s+[A-Z][a-z]+)+)\s+who\s+is\s+the\s+((?:Vice\s+President|President|CEO|Owner|Secretary|Treasurer)(?:\s+and\s+(?:Secretary|Treasurer|President|Owner))?)/gi,
  )) {
    const name = m[1]!.replace(/\s+/g, " ").trim();
    const role = m[2]!.replace(/\s+/g, " ").trim().slice(0, 50);
    if (
      name.split(/\s+/).length >= 2
      && name.length < 40
      && !/\b(who|the|and|date|owner|president)\b/i.test(name)
    ) {
      push(`PERSON: ${name} — ${role}`);
    }
  }
  // Heading adjacency: "## Nelson Reyes\n### President and Chief Executive Officer" (Grok reads structure)
  // Allow one newline between name and title — common on about/who-we-are pages.
  for (const m of html.matchAll(
    /(?:<h[1-4][^>]*>|\n)\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+)\s*(?:<\/h[1-4]>)?\s*(?:\n|<br\s*\/?>|\s)*\s*(?:<h[1-4][^>]*>)?\s*((?:President|CEO|Chief Executive Officer|Owner|Founder|Vice President|VP|CFO|Chief Financial Officer|COO|Chief Operating Officer|Director|Principal|Treasurer|Chairman|Executive Chairman)[^<\n]{0,50})/gi,
  )) {
    const name = m[1]!.replace(/\s+/g, " ").trim();
    const role = m[2]!.replace(/\s+/g, " ").trim().slice(0, 60);
    if (name.split(/\s+/).length >= 2 && name.length < 60 && !/^(Inc|LLC|Corp|Company|About|Contact|Home)\b/i.test(name)) {
      push(`PERSON: ${name} — ${role}`);
    }
  }
  // Plain-text multi-line: "Nelson Reyes\nPresident..." / "### Frank K. Chesek\n#### CEO/Company President"
  for (const m of stripHtml(html).matchAll(
    /(?:^|\n)\s*#{0,4}\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+)\s*\n\s*#{0,4}\s*((?:President|CEO|Chief Executive Officer|Owner|Founder|Vice President|VP|CFO|Chief Financial Officer|COO|Chief Operating Officer|Director|Principal|Treasurer|Chairman|Executive Chairman|Executive Assistant|Manager|Controller|Engineer|Supervisor|Managing Partner|Project Coordinator|Human Resources|Technical Sales|Quality Manager|VP of Manufacturing|VP OF HR|VP OF SALES|VP OF MANUFACTURING|VP OF ENGINEERING|FOUNDER|second-generation owner|Office Manager|Operations Manager|Engineering Manager|Administrative Specialist|Head of CNC|Process Engineer|Director of Business Development|Plant Manager)[^\n]{0,60})/gm,
  )) {
    const name = m[1]!.replace(/\s+/g, " ").trim();
    const role = m[2]!.replace(/\s+/g, " ").trim().slice(0, 60);
    if (name.split(/\s+/).length >= 2 && name.length < 60 && !/^(About|Contact|Home|Sales|Company|Directory|General)\b/i.test(name)) {
      push(`PERSON: ${name} — ${role}`);
    }
  }
  // Role-line + email on same line (Micro Manufacturing style): "President / CEO - djolliffe@micromfg.com"
  // Emit EMAIL + ROLE; when local-part looks like a person token, also emit PERSON_EMAIL lead.
  for (const m of html.matchAll(
    /\b((?:President|CEO|Owner|Founder|Vice President|VP|Director|Principal|Manager|Secretary|Treasurer)[^@\n<]{0,40}?)[-–—:]\s*([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/gi,
  )) {
    const role = m[1]!.replace(/\s+/g, " ").trim().slice(0, 60);
    const email = m[2]!.toLowerCase();
    push(`EMAIL: ${email}`);
    push(`ROLE: ${role}`);
    const local = email.split("@")[0] || "";
    // Promote only when local-part is a plausible name token (not info/sales/contact)
    if (
      local.length >= 3
      && !/^(info|contact|sales|office|admin|support|hello|service|parts|inquiries|mail|office|hr|accounting)$/i.test(local)
      && /^[a-z]+(?:[._][a-z]+)?$/i.test(local)
    ) {
      push(`PERSON_EMAIL: ${local} | ${email}`);
      push(`ROLE: ${role} (${email})`);
    }
  }
  // BBB / directory principal lines
  for (const m of html.matchAll(
    /(?:Business Management|Principal Contacts?|Owner\/President|President)[:\s]+(?:Mr\.?|Ms\.?|Mrs\.?)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z.]+)+)/gi,
  )) {
    push(`PERSON: ${m[1]!.replace(/\s+/g, " ").trim()} — principal`);
  }
  for (const m of html.matchAll(
    /\b(?:Mr\.?|Ms\.?|Mrs\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+),\s*(Owner|President|CEO|Principal|Director|Founder)/gi,
  )) {
    push(`PERSON: ${m[1]!.trim()} — ${m[2]!.toLowerCase()}`);
  }
  // US-centric phone patterns common on company contact pages
  for (const m of html.matchAll(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g)) {
    push(`PHONE: ${m[0]!.replace(/\s+/g, " ").trim()}`);
  }
  // Street-ish address lines — require real street type tokens (blocks CSS class noise)
  for (const m of html.matchAll(
    /\b\d{1,6}\s+[A-Za-z0-9.'\-]+(?:\s+[A-Za-z0-9.'\-]+){0,5}\s+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Drive|Dr\.?|Boulevard|Blvd\.?|Lane|Ln\.?|Court|Ct\.?|Way|Highway|Hwy\.?|HWY|Parkway|Pkwy\.?|Place|Pl\.?)\b[^<\n]{0,50}/gi,
  )) {
    const line = m[0]!.replace(/\s+/g, " ").trim().slice(0, 140);
    if (!/\bast-|\buagb-|\bwp-|\brmp-|[{};]/.test(line)) push(`ADDRESS: ${line}`);
  }
  // Full "15700 South Waterloo Rd. Cleveland, OH 44110" contact-page blocks
  for (const m of html.matchAll(
    /\b\d{1,6}\s+[A-Za-z0-9.'\-\s]{3,55}?,\s*[A-Z][a-zA-Z .']{1,28},\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/g,
  )) {
    const line = m[0]!.replace(/\s+/g, " ").trim().slice(0, 160);
    if (!/\bast-|\buagb-|[{};]/.test(line)) push(`ADDRESS: ${line}`);
  }
  for (const m of html.matchAll(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/g)) {
    push(`ADDRESS: ${m[0]!.trim()}`);
  }
  // Role / title cues near officer names (proxy language)
  for (const m of html.matchAll(
    /\b((?:Co-)?(?:Chief Executive Officer|CEO|President|Director|Chairman|Vice President|VP|Secretary|Treasurer|Owner|Principal)[^.<]{0,60})/gi,
  )) {
    const role = m[1]!.replace(/\s+/g, " ").trim().slice(0, 100);
    if (!/\bast-|\buagb-|[{};]/.test(role)) push(`ROLE: ${role}`);
  }
  // Succession / family-ownership facts (Grok Agent recovers these from leadership/blog pages)
  for (const m of html.matchAll(
    /\b((?:family[- ]owned|fourth[- ]generation|4th[- ]generation|third[- ]generation|privately held)[^.<]{0,80})/gi,
  )) {
    const line = m[1]!.replace(/\s+/g, " ").trim().slice(0, 120);
    if (line.length > 12) push(`STRUCTURE: ${line}`);
  }
  for (const m of html.matchAll(
    /\b((?:succession|succeeded|succeeds|named CEO|become CEO|Executive Chairman|Chief Strategy Officer)[^.<]{0,100})/gi,
  )) {
    const line = m[1]!.replace(/\s+/g, " ").trim().slice(0, 140);
    if (line.length > 10 && !/\bast-|[{};]/.test(line)) push(`SUCCESSION: ${line}`);
  }
  // Related people on BBB / about / team pages: "Mr. Name, Owner" / "Name, Company Contact"
  // Also match inside <dd>…</dd> after CF escalate (Scrapfly returns full BBB HTML)
  for (const m of html.matchAll(
    /\b(?:Mr\.|Ms\.|Mrs\.|Dr\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+){1,3})\s*,\s*((?:Owner|President|CEO|Director|Principal|Company Contact|Manager|Secretary|Treasurer)[^<\n,]{0,40})/g,
  )) {
    push(`PERSON: ${m[1]!.trim()} — ${m[2]!.replace(/\s+/g, " ").trim().slice(0, 60)}`);
  }
  for (const m of html.matchAll(
    /<dd[^>]*>\s*(?:Mr\.|Ms\.|Mrs\.|Dr\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+){1,3})\s*,\s*([^<]{2,40})<\/dd>/gi,
  )) {
    push(`PERSON: ${m[1]!.trim()} — ${m[2]!.replace(/\s+/g, " ").trim().slice(0, 60)}`);
  }
  for (const m of html.matchAll(
    /\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+)\s*[,–—-]\s*((?:Owner|President|CEO|Director|Principal Contact|Company Contact|Treasurer)[^<\n,]{0,30})/g,
  )) {
    push(`PERSON: ${m[1]!.trim()} — ${m[2]!.replace(/\s+/g, " ").trim().slice(0, 60)}`);
  }

  // Dealer / team pages: "Tom Jansen … Tel: … tom@domain.com"
  const plain = stripHtml(html).slice(0, 80_000);
  for (const m of plain.matchAll(
    /\b([A-Z][a-z]{1,20}\s+[A-Z][a-z]{1,20})\s+(?:USA|Canada|Tel|Phone|Fax|Email|Distributor|Factory)[:\s][^@]{0,80}?([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi,
  )) {
    const pName = m[1]!.replace(/\s+/g, " ").trim();
    const email = m[2]!.toLowerCase();
    if (pName.split(/\s+/).length === 2 && !/Mensch Manufacturing|Contact Us|Quality Equipment|Home of/i.test(pName)) {
      push(`PERSON: ${pName} — related_contact`);
      push(`EMAIL: ${email}`);
      push(`PERSON_EMAIL: ${pName} | ${email}`);
    }
  }
  for (const m of html.matchAll(
    />([A-Z][a-z]+\s+[A-Z][a-z]+)<[^>]{0,200}href=["']mailto:([^"'?\s]+)/gi,
  )) {
    push(`PERSON: ${m[1]!.trim()} — related_contact`);
    push(`EMAIL: ${m[2]!.toLowerCase()}`);
    push(`PERSON_EMAIL: ${m[1]!.trim()} | ${m[2]!.toLowerCase()}`);
  }
  // Wix / component team cards: <h3>Name</h3> ... role ... mailto within ~2500 chars
  // (Griffin Tool about page — 200-char window missed Lillian/Tim/Rod/Brian)
  for (const m of html.matchAll(
    /<h[1-4][^>]*>\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+)\s*<\/h[1-4]>[\s\S]{0,2500}?href=["']mailto:([a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,})/gi,
  )) {
    const pName = m[1]!.replace(/\s+/g, " ").trim();
    const email = m[2]!.toLowerCase();
    if (pName.split(/\s+/).length >= 2 && pName.length < 45 && !/Contact|Griffin Tool|Meet/i.test(pName)) {
      // Role: first strong title between heading and mailto
      const between = (m[0] || "").replace(/<[^>]+>/g, " ");
      const roleM = between.match(
        /\b(Chief Executive Officer(?:\s+and\s+President)?|President|CEO|CFO|Chief Financial Officer|Owner|Office Manager|Operations Manager|Engineering Manager|Administrative Specialist|Senior Engineer|Head of CNC(?:\s+Department)?|Process Engineer|Director of Business Development|General Manager|Plant Manager|Controller|Manager|Director|Engineer)\b/i,
      );
      const role = roleM ? roleM[1]!.replace(/\s+/g, " ").trim() : "related_contact";
      push(`PERSON: ${pName} — ${role}`);
      push(`EMAIL: ${email}`);
      push(`PERSON_EMAIL: ${pName} | ${email}`);
    }
  }

  // Griffin-style team cards: Name heading → role line → optional Extension → mailto within ~6 lines
  // (Wix/markdown about pages: ### Malcolm Cowan / Chief Executive Officer and President / Extension 229 / mailto)
  for (const m of plain.matchAll(
    /(?:^|\n)\s*#{0,4}\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+)\s*\n\s*((?:Chief Executive Officer(?:\s+and\s+President)?|President|CEO|CFO|Chief Financial Officer|Owner|Office Manager|Operations Manager|Engineering Manager|Administrative Specialist|Senior Engineer|Head of CNC(?:\s+Department)?|Process Engineer|Director of Business Development|General Manager|Plant Manager|Controller|Manager|Director|Engineer)[^\n]{0,50})\s*(?:\n\s*Extension\s*\d+)?\s*(?:\n[^\n]{0,80}){0,4}?([a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,})/gim,
  )) {
    const pName = m[1]!.replace(/\s+/g, " ").trim();
    const role = m[2]!.replace(/\s+/g, " ").trim().slice(0, 70);
    const email = m[3]!.toLowerCase();
    if (pName.split(/\s+/).length >= 2 && pName.length < 45 && !/Griffin Tool|Contact Us|Meet Our/i.test(pName)) {
      push(`PERSON: ${pName} — ${role}`);
      push(`EMAIL: ${email}`);
      push(`PERSON_EMAIL: ${pName} | ${email}`);
    }
  }

  // Name then "Role email@" on next line (Rathburn style): "Angie Holt\nPresident aholt@rathburn..."
  for (const m of plain.matchAll(
    /\b([A-Z][a-z]+(?:[ \t]+[A-Z]\.?)?(?:[ \t]+[A-Z][a-z]+)+)[ \t]*\n[ \t]*((?:President|Owner|CEO|CFO|COO|Controller|Manager|Director|Engineer|Supervisor|Secretary|Treasurer|VP|Vice President)[^\n@]{0,40})[ \t]+([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/gi,
  )) {
    const pName = m[1]!.replace(/\s+/g, " ").trim();
    const role = m[2]!.replace(/\s+/g, " ").trim().slice(0, 60);
    const email = m[3]!.toLowerCase();
    if (pName.split(/\s+/).length >= 2 && pName.length < 40) {
      push(`PERSON: ${pName} — ${role}`);
      push(`EMAIL: ${email}`);
      push(`PERSON_EMAIL: ${pName} | ${email}`);
    }
  }
  // ALL-CAPS name line then Role + email (Rathburn: "APRIL WINFIELD\nOperations Manager\nawinfield@...")
  for (const m of plain.matchAll(
    /\b([A-Z][A-Z]+(?:[ \t]+[A-Z][A-Z]+)+)[ \t]*\n[ \t]*((?:President|Owner|CEO|CFO|COO|Controller|Manager|Director|Engineer|Supervisor|Secretary|Treasurer|Operations|Quality|Human Resources|Technical Sales)[^\n@]{0,40})[ \t]*\n[ \t]*([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/g,
  )) {
    const raw = m[1]!.replace(/\s+/g, " ").trim();
    const pName = raw.split(/\s+/).map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
    const role = m[2]!.replace(/\s+/g, " ").trim().slice(0, 60);
    const email = m[3]!.toLowerCase();
    if (pName.split(/\s+/).length >= 2 && pName.length < 40) {
      push(`PERSON: ${pName} — ${role}`);
      push(`EMAIL: ${email}`);
      push(`PERSON_EMAIL: ${pName} | ${email}`);
    }
  }

  // Public wallet mentions on page (wealth evidence after person lock — not a contact)
  for (const m of plain.matchAll(/\b(0x[a-fA-F0-9]{40})\b/g)) {
    push(`WALLET: eth | ${m[1]!.toLowerCase()}`);
  }
  for (const m of plain.matchAll(/\b(bc1[a-zA-HJ-NP-Z0-9]{25,62})\b/g)) {
    push(`WALLET: btc | ${m[1]!.toLowerCase()}`);
  }

  // Lowercase team cards (Rapid Tool style): "jamie tissue\nbusiness owner\ndie maker"
  for (const m of plain.matchAll(
    /\b([a-z][a-z]+[ \t]+[a-z][a-z]+)[ \t]*\n[ \t]*(business\s+owner|owner|president|project\s+manager|office\s+manager|die\s+maker)[^\n]{0,40}/gi,
  )) {
    const raw = m[1]!.replace(/\s+/g, " ").trim();
    const pName = raw.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    const role = m[2]!.replace(/\s+/g, " ").trim().slice(0, 40);
    if (pName.split(/\s+/).length === 2) push(`PERSON: ${pName} — ${role}`);
  }

  // Directory blocks: split on emails; each segment looks for Name + role just above that email.
  // Willis Machinery team pages — hold EVERY attributable person (Apex objective).
  {
    const parts = plain.split(/\b([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/i);
    for (let i = 1; i < parts.length; i += 2) {
      const email = (parts[i] || "").toLowerCase();
      const local = email.split("@")[0] || "";
      if (!email.includes("@")) continue;
      if (/^(info|sales|contact|support|office|admin|hello|service|parts|inquiries)$/i.test(local)) continue;
      const before = (parts[i - 1] || "").slice(-300);
      const lines = before.split(/\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
      let pName: string | null = null;
      let role = "related_contact";
      for (let li = lines.length - 1; li >= 0; li--) {
        const line = lines[li]!;
        if (!pName) {
          const nm = line.match(/^([A-Z][a-z]+(?:[ \t]+[A-Z]\.?)?(?:[ \t]+[A-Z][a-z]+)+)$/);
          if (nm && nm[1]!.split(/\s+/).length >= 2 && nm[1]!.length < 40
            && !/^(Contact|About|Home|Sales|Company|With|Regional|Shared|Office|Service|Directory|President|Owner)\b/i.test(nm[1]!)) {
            pName = nm[1]!.trim();
            // role may be on line below name (already passed) — scan forward in lines after name
            for (let rj = li + 1; rj < lines.length; rj++) {
              const rm = lines[rj]!.match(/\b((?:President|Owner|CEO|CFO|COO|Controller|Manager|Director|Technician|Machinist|Secretary|Treasurer)(?:[ \t]*\/[ \t]*(?:Owner|President|CEO|Manager))?)\b/i);
              if (rm) { role = rm[1]!.replace(/\s+/g, " ").trim().slice(0, 60); break; }
            }
            break;
          }
        }
      }
      if (!pName) continue;
      push(`PERSON: ${pName} — ${role}`);
      push(`EMAIL: ${email}`);
      push(`PERSON_EMAIL: ${pName} | ${email}`);
    }
  }

  if (facts.length === 0) return "";
  return "CONTACT FACTS (visible on page):\n" + facts.slice(0, 40).join("\n") + "\n\n";
}

/** Pull printable Latin text + emails/phones from a PDF binary (no extra deps). */
function extractTextFromPdfBuffer(buf: ArrayBuffer): string {
  const u8 = new Uint8Array(buf);
  // Prefer latin1 so PDF string objects stay contiguous
  let raw = "";
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    raw += String.fromCharCode(...u8.subarray(i, Math.min(i + chunk, u8.length)));
  }
  // PDF literal strings (...); keep readable runs
  const parts: string[] = [];
  for (const m of raw.matchAll(/\((?:\\.|[^\\)]){3,200}\)/g)) {
    const s = m[0].slice(1, -1)
      .replace(/\\\n/g, "")
      .replace(/\\([nrtbf()\\])/g, (_, c) => ({ n: "\n", r: "\r", t: "\t", b: " ", f: " ", "(": "(", ")": ")", "\\": "\\" } as any)[c] ?? c)
      .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, " ");
    if (/[A-Za-z0-9@]/.test(s)) parts.push(s);
  }
  // Also keep long printable runs outside streams (often emails sit here)
  for (const m of raw.matchAll(/[\x20-\x7e]{8,}/g)) {
    if (/@|\d{3}|Phone|Email|Fax|Mobile|President|CEO|Owner/i.test(m[0])) parts.push(m[0]);
  }
  const text = parts.join("\n").replace(/[ \t]{2,}/g, " ").slice(0, 200_000);
  return text;
}

function isMostlyBinaryGarbage(s: string): boolean {
  if (!s || s.length < 8) return false;
  let bad = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 9 || (c > 13 && c < 32) || c === 0xfffd || c > 0x10ffff) bad++;
  }
  return bad / s.length > 0.15;
}

async function toolVisit(url: string): Promise<string> {
  try {
    const { isChallengeHtml, browserFetchConfigured, browserFetchHtml } = await import("./browser-fetch");
    let html = "";
    const isPdfUrl = /\.pdf(\?|$)/i.test(url);

    // Facebook / Meta pages are almost always JS shells or login walls on plain fetch.
    // Grok Agent reaches the About email field; we must browser-escalate first when configured.
    const isSocialShell = /facebook\.com|fb\.com|instagram\.com|linkedin\.com\/company/i.test(url);
    if (isSocialShell && browserFetchConfigured()) {
      const escalated = await browserFetchHtml(url);
      if (escalated.html && !isChallengeHtml(escalated.html) && escalated.html.length > 500) {
        html = escalated.html.slice(0, 500_000);
      }
    }

    if (!html) {
      const resp = await fetch(url, {
        signal: AbortSignal.timeout(12_000),
        headers: {
          "User-Agent": randomUA(),
          Accept: isPdfUrl
            ? "application/pdf,application/octet-stream,*/*"
            : "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });
      if (!resp.ok) {
        html = `HTTP ${resp.status}`;
      } else {
        const ctype = (resp.headers.get("content-type") || "").toLowerCase();
        if (isPdfUrl || ctype.includes("application/pdf") || ctype.includes("octet-stream")) {
          const buf = await resp.arrayBuffer();
          const pdfText = extractTextFromPdfBuffer(buf);
          // Build a synthetic HTML-ish block so CONTACT FACTS + LLM see the same shape as a page
          html = `<html><body><pre>PDF TEXT EXTRACT\n${pdfText}</pre></body></html>`;
        } else {
          // Read more of the page; WordPress/Astra themes dump 100k+ of CSS before contact blocks.
          html = (await resp.text()).slice(0, 500_000);
        }
      }
    }

    // Escalate when blocked and a browser/scrape provider is configured (see docs/PLAYWRIGHT_FALLBACK.md)
    if ((isChallengeHtml(html) || /^HTTP 403/.test(html) || /^HTTP 503/.test(html)) && browserFetchConfigured()) {
      const escalated = await browserFetchHtml(url);
      if (escalated.html && !isChallengeHtml(escalated.html)) {
        html = escalated.html.slice(0, 500_000);
      } else if (isChallengeHtml(html) || /^HTTP 40|^HTTP 50/.test(html)) {
        return `visit blocked (anti-bot): ${url}`;
      }
    } else if (isChallengeHtml(html)) {
      return `visit blocked (anti-bot): ${url}`;
    }

    // Strip style/script so CONTACT FACTS extraction sees real body content, not theme chrome
    html = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ");
    const facts = extractContactFactsFromHtml(html);
    const body = filterPassagesForQuery(stripHtml(html), url, { maxChars: MAX_OBS, minScore: 0.05 });
    // Always surface contact facts first so LLM can emit findings with sourceUrls.
    return (facts + body).slice(0, MAX_OBS + 800);
  } catch (err: any) {
    return `visit failed: ${err?.message ?? "error"}`;
  }
}

function extractJsonObject(raw: string): string | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const source = fenced || raw.trim();
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  return start >= 0 && end > start ? source.slice(start, end + 1) : null;
}

function parseAction(raw: string): AgentAction | null {
  const json = extractJsonObject(raw);
  if (!json) return null;
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    const action = String(o.action ?? "").toLowerCase();
    if (action === "web_search" && typeof o.query === "string" && o.query.trim()) {
      return { action: "web_search", query: o.query.trim().slice(0, 300), thought: typeof o.thought === "string" ? o.thought : undefined };
    }
    if (action === "visit" && typeof o.url === "string" && /^https?:\/\//i.test(o.url)) {
      return { action: "visit", url: o.url.trim(), thought: typeof o.thought === "string" ? o.thought : undefined };
    }
    if (action === "done") {
      const findings = Array.isArray(o.findings) ? o.findings : [];
      const cleaned: AgenticFinding[] = [];
      for (const f of findings) {
        if (!f || typeof f !== "object") continue;
        const row = f as Record<string, unknown>;
        const value = typeof row.value === "string" ? row.value.trim() : "";
        if (!value) continue;
        if (isMostlyBinaryGarbage(value)) continue;
        const vectorType = ["email", "phone", "linkedin", "website", "other", "social"].includes(String(row.vectorType))
          ? (String(row.vectorType) as AgenticFinding["vectorType"])
          : "other";
        const sourceUrls = filterClaimUrls(row.sourceUrls);
        if (["email", "phone", "linkedin", "social"].includes(vectorType) && sourceUrls.length === 0) continue;
        let finalValue = value;
        if (vectorType === "email") {
          const e = sanitizePublicEmail(value);
          if (!e || isTrashContactValue("email", e)) continue;
          finalValue = e;
        }
        if (vectorType === "phone") {
          const p = sanitizePublicPhone(value);
          if (!p || isTrashContactValue("phone", p)) continue;
          finalValue = p;
        }
        if (vectorType === "website") {
          const host = finalValue.replace(/^https?:\/\//i, "").split("/")[0]?.toLowerCase() || "";
          if (/bbb\.org|mapquest|zoominfo|rocketreach|yelp|dnb\.com|chamber|linkedin|facebook|twitter|wikipedia|growjo|apollo|manta|bizapedia/i.test(host)) continue;
        }
        // Drop CSS/HTML chrome and non-contact "other" noise (theme/directory pollution)
        if (
          vectorType === "other"
          && (/[{};]|rmp-|style=|--columns|standard-menu|Directory Search|\.rmp-|\bast-|\buagb-|\bwp-block|\binline-on-mobile/i.test(finalValue)
            || finalValue.length < 6
            || !/[A-Za-z0-9@]/.test(finalValue)
            || (finalValue.match(/\s/g) || []).length > 20 && !/\d{3}/.test(finalValue))
        ) {
          continue;
        }
        cleaned.push({
          vectorType,
          value: finalValue.slice(0, 500),
          personName: typeof row.personName === "string" ? row.personName.slice(0, 120) : null,
          role: typeof row.role === "string" ? row.role.slice(0, 120) : null,
          scope: row.scope === "organization" || row.scope === "candidate" ? row.scope : "unknown",
          sourceUrls: sourceUrls.length ? sourceUrls : (vectorType === "website" && /^https?:\/\//i.test(finalValue) ? [finalValue] : []),
          note: typeof row.note === "string" ? row.note.slice(0, 400) : "agentic web research",
        });
      }
      return { action: "done", findings: cleaned, thought: typeof o.thought === "string" ? o.thought : undefined };
    }
  } catch {
    return null;
  }
  return null;
}

/** GROQ_CHAT_MODELS from ./groq-models — post Llama 3.3 70B decommission (2026-08-16). */

async function callGroqJson(prompt: string): Promise<{ model: string; raw: string } | null> {
  const keys = ["GROQ_API_KEY", ...Array.from({ length: 5 }, (_, i) => `GROQ_API_KEY_${i + 1}`)]
    .map((n) => process.env[n] ?? "")
    .filter((k) => k.length > 0);
  if (!keys.length) return null;
  for (const key of keys) {
    for (const model of GROQ_CHAT_MODELS) {
      try {
        const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            temperature: 0.25,
            max_tokens: 2048,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  "You are an elite OSINT web research agent. You operate in a ReAct loop. Reply with ONE JSON object only.",
              },
              { role: "user", content: prompt },
            ],
          }),
          signal: AbortSignal.timeout(40_000),
        });
        if (!resp.ok) {
          // model_not_found / access → try next model on same key
          continue;
        }
        const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
        const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
        if (raw) return { model, raw };
      } catch {
        continue;
      }
    }
  }
  return null;
}

async function callGeminiJson(prompt: string): Promise<{ model: string; raw: string } | null> {
  try {
    const { resolveGeminiBossModel, generateGeminiBossText } = await import("./case-bureau");
    const selection = await resolveGeminiBossModel();
    if (!selection?.model) return null;
    const out = await generateGeminiBossText(selection, prompt);
    if (out.raw) return { model: out.model, raw: out.raw };
  } catch (err: any) {
    logger.debug({ err: err?.message }, "agentic Gemini call failed");
  }
  return null;
}

async function callMistralJson(prompt: string): Promise<{ model: string; raw: string } | null> {
  const key = process.env.MISTRAL_API_KEY?.trim();
  if (!key) return null;
  const models = [
    process.env.MISTRAL_AGENTIC_MODEL,
    "mistral-small-latest",
    "mistral-large-latest",
    "open-mistral-nemo",
  ].filter((m): m is string => Boolean(m && m.trim()));
  for (const model of models) {
    try {
      const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.25,
          max_tokens: 2048,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are an elite OSINT web research agent. You operate in a ReAct loop. Reply with ONE JSON object only.",
            },
            { role: "user", content: prompt },
          ],
        }),
        signal: AbortSignal.timeout(45_000),
      });
      if (!resp.ok) continue;
      const data = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
      if (raw) return { model: `mistral:${model}`, raw };
    } catch {
      continue;
    }
  }
  return null;
}

async function callNvidiaJson(prompt: string): Promise<{ model: string; raw: string } | null> {
  const key =
    process.env.NVIDIA_NIM_API_KEY?.trim() ||
    process.env.NVIDIA_API_KEY?.trim() ||
    "";
  if (!key) return null;
  const models = [
    process.env.NVIDIA_AGENTIC_MODEL,
    "meta/llama-3.3-70b-instruct",
    "meta/llama-3.1-70b-instruct",
    "mistralai/mistral-large-2-instruct",
    "google/gemma-2-27b-it",
  ].filter((m): m is string => Boolean(m && m.trim()));
  for (const model of models) {
    try {
      const resp = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.25,
          max_tokens: 2048,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are an elite OSINT web research agent. You operate in a ReAct loop. Reply with ONE JSON object only.",
            },
            { role: "user", content: prompt },
          ],
        }),
        signal: AbortSignal.timeout(50_000),
      });
      if (!resp.ok) continue;
      const data = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
      if (raw) return { model: `nvidia:${model}`, raw };
    } catch {
      continue;
    }
  }
  return null;
}

async function llmStep(prompt: string): Promise<{ model: string; raw: string } | null> {
  // Multi-provider ReAct control plane. Groq first (latency), then Mistral, Gemini, NVIDIA.
  // Never depend on a single vendor — a dead Groq model must not zero the bureau.
  const chain: Array<[string, () => Promise<{ model: string; raw: string } | null>]> = [
    ["groq", callGroqJson],
    ["mistral", callMistralJson],
    ["gemini", callGeminiJson],
    ["nvidia", callNvidiaJson],
  ];
  const errors: string[] = [];
  for (const [name, fn] of chain) {
    try {
      const out = await fn(prompt);
      if (out?.raw) {
        setAgenticLlmHealth(true, out.model, null);
        return out;
      }
      errors.push(`${name}:empty`);
    } catch (err: any) {
      errors.push(`${name}:${err?.message ?? "fail"}`);
    }
  }
  setAgenticLlmHealth(false, null, errors.join("; ").slice(0, 400));
  logger.warn({ errors }, "[agentic] all LLM providers failed for step");
  return null;
}

function formatFindingsBag(findings: AgenticFinding[]): string {
  if (!findings.length) return "(none yet)";
  return findings
    .slice(0, 20)
    .map((f) => {
      const who = f.personName ? ` person=${f.personName}` : "";
      const role = f.role ? ` role=${f.role}` : "";
      const src = f.sourceUrls[0] ? ` src=${f.sourceUrls[0]}` : "";
      return `- ${f.vectorType}: ${f.value}${who}${role} (${f.scope})${src}`;
    })
    .join("\n");
}

function buildStepPrompt(input: {
  targetName: string;
  companyName?: string | null;
  objective: string;
  history: string[];
  lastObservation: string;
  findings?: AgenticFinding[];
}): string {
  // Keep this short. Models already know how to research; do not ship a playbook.
  const bag = formatFindingsBag(input.findings ?? []);
  return `You are running an agentic web research loop for Apex Atlas.
You have the same class of research ability as a strong general agent, plus live tools below.
Invent your own queries and visits from the objective and observations. No fixed search checklist.

TARGET: ${input.targetName}
${input.companyName ? `RELATED COMPANY / ISSUER: ${input.companyName}` : ""}
OBJECTIVE: ${input.objective}

TOOLS (exactly one JSON action per turn):
1) {"action":"web_search","query":"...","thought":"..."}
2) {"action":"visit","url":"https://...","thought":"..."}
3) {"action":"done","findings":[{"vectorType":"email|phone|linkedin|website|social|other","value":"...","personName":null,"role":null,"scope":"organization|candidate","sourceUrls":["https://exact-page"],"note":"..."}],"thought":"..."}

Rules:
- Never invent emails, phones, people, or URLs. Only values visible in observations or FINDINGS SO FAR, each with a real sourceUrl.
- Prefer primary sources over aggregators (ZoomInfo, RocketReach, etc.).
- When finished, action=done. You may pass findings:[] if FINDINGS SO FAR already holds the contacts — the runtime keeps the bag.

FINDINGS SO FAR (already extracted — do not drop these):
${bag}

TRAJECTORY SO FAR (recent):
${(input.history.length > 14 ? input.history.slice(-14) : input.history).join("\n") || "(start)"}

LAST OBSERVATION:
${input.lastObservation.slice(0, MAX_OBS) || "(none — begin with web_search)"}

Return ONE JSON object only.`;
}

/** True when email domain aligns with company site or name (drops dealer-network noise). */
function isCompanyAlignedEmail(email: string, companyName?: string | null, pageUrl?: string): boolean {
  const domain = (email.split("@")[1] || "").toLowerCase();
  if (!domain) return false;
  if (/example\.|sentry\.|schema\.|wixpress|cloudflare|wordpress|github\.com|google\.com|microsoft\.com/.test(domain)) return false;
  const local = (email.split("@")[0] || "").toLowerCase();
  const isClassicOrgMailbox = /^(info|contact|sales|office|support|hello|admin|service|parts|inquiries)$/i.test(local);
  try {
    if (pageUrl) {
      const host = new URL(pageUrl).hostname.replace(/^www\./, "").toLowerCase();
      const root = host.split(".").slice(-2).join(".");
      if (domain === host || domain === root || host.endsWith(domain)) return true;
      // Org mailbox on a company-named host whose mail domain differs (e.g. sales@cmi79.com on custom-machine-inc.com)
      if (isClassicOrgMailbox && companyName) {
        const token = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "");
        const hostFlat = host.replace(/[^a-z0-9]/g, "");
        if (token.length >= 4 && (hostFlat.includes(token.slice(0, Math.min(8, token.length))) || token.includes(hostFlat.slice(0, 6)))) {
          return true;
        }
      }
      // Classic org mailbox on a non-directory page we deliberately visited under company research
      if (
        isClassicOrgMailbox
        && host
        && !/zoominfo|rocketreach|mapquest|bbb\.org|yelp|facebook|linkedin|twitter|wikipedia|chamber/i.test(host)
      ) {
        return true;
      }
    }
  } catch { /* ignore */ }
  if (companyName) {
    const token = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const domFlat = domain.replace(/[^a-z0-9]/g, "");
    if (token.length >= 3 && (
      domFlat.includes(token.slice(0, Math.min(6, token.length)))
      || domain.includes(token.slice(0, Math.min(4, token.length)))
    )) return true;
    // Brand-short domains: "Accurate Manufacturing" → acc-mfg.com / "Custom Machine" → cmi79.com
    // Grok keeps tlindblom@acc-mfg.com; Apex must not drop on full-name vs short-domain mismatch.
    const words = companyName.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !/^(and|the|inc|llc|corp|company|co|ltd|of)$/i.test(w));
    if (words.length >= 1 && domFlat.length >= 3 && domFlat.length <= 20) {
      const prefixes = words.map((w) => w.slice(0, 3));
      if (prefixes.some((p) => domFlat.includes(p))) return true;
      // Acronym domains: "South Shore Tool Die" → sstd.net (first letters of significant words)
      if (words.length >= 2) {
        const acronym = words.map((w) => w[0]).join("");
        if (acronym.length >= 3 && (domFlat === acronym || domFlat.startsWith(acronym) || acronym.startsWith(domFlat.slice(0, Math.min(4, domFlat.length))))) {
          return true;
        }
      }
      // Shared long token: "Rathburn Precision Machining" ↔ rathburntool.com / rathburnmachining.com
      for (const w of words) {
        if (w.length >= 6 && domFlat.includes(w.slice(0, Math.min(8, w.length)))) return true;
      }
    }
  }
  // Classic org mailbox with company context even without pageUrl (SERP snippet path)
  if (isClassicOrgMailbox && companyName && companyName.replace(/[^a-z0-9]/gi, "").length >= 4) return true;
  // Reject free-mail as company-aligned unless classic org local (already handled above)
  if (/^(gmail|yahoo|hotmail|outlook|aol|icloud|netzero|protonmail|mail)\./i.test(domain)) return false;
  return false;
}

/** Parse CONTACT FACTS block from a visited page into structured findings (fail-closed, org scope). */

/** Deterministic role/address/related extraction from SEC proxy / DEF 14A-style HTML or text. */
function findingsFromProxyPage(
  page: string,
  sourceUrl: string,
  targetName: string,
  companyName?: string | null,
): AgenticFinding[] {
  const out: AgenticFinding[] = [];
  if (!page || page.length < 80) return out;
  const isSec = /sec\.gov|edgar|proxy|def\s*14a|beneficial owner/i.test(sourceUrl + "\n" + page.slice(0, 500));
  if (!isSec && !/has been .{0,40}President|Director since|Chief Executive/i.test(page)) {
    return out;
  }
  const plain = page
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

  const esc = targetName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const bio = plain.match(new RegExp(`(${esc}[^.]{0,40}?)\\s+has been\\s+([^.]{10,220})\\.`, "i"));
  if (bio?.[2]) {
    const role = bio[2].replace(/\s+/g, " ").trim().slice(0, 120);
    out.push({
      vectorType: "other",
      value: role,
      personName: targetName,
      role,
      scope: "organization",
      sourceUrls: [sourceUrl],
      note: `Proxy/DEF 14A role line on ${sourceUrl}`,
    });
  } else {
    const near = plain.toLowerCase().indexOf(targetName.toLowerCase().replace(/\s+/g, " ").slice(0, 24));
    if (near >= 0) {
      const window = plain.slice(Math.max(0, near - 20), near + 280);
      const titleHit = window.match(
        /\b(President|Co-Chief Executive Officer|Chief Executive Officer|Co-CEO|Director|Chairman|Executive Vice President)[^.]{0,80}/i,
      );
      if (titleHit?.[0]) {
        const role = titleHit[0].replace(/\s+/g, " ").trim().slice(0, 120);
        out.push({
          vectorType: "other",
          value: role,
          personName: targetName,
          role,
          scope: "organization",
          sourceUrls: [sourceUrl],
          note: `Title near target on ${sourceUrl}`,
        });
      }
    }
  }

  const street = plain.match(
    /\b(\d{1,5}\s+(?:North|South|East|West|N\.?|S\.?|E\.?|W\.?)?\s*[A-Za-z0-9.'\-]+(?:\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)\.?))\b/i,
  );
  if (street?.[1]) {
    out.push({
      vectorType: "other",
      value: street[1].trim().slice(0, 160),
      personName: targetName,
      role: companyName ? `address @ ${companyName}` : "address",
      scope: "organization",
      sourceUrls: [sourceUrl],
      note: `Street address on ${sourceUrl}`,
    });
  }

  // Related officer-looking names (exclude target)
  const exclude = new Set(
    targetName.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((x) => x.length >= 2),
  );
  const nameRe = /\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+)\b/g;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = nameRe.exec(plain)) !== null && seen.size < 8) {
    const cand = m[1]!.replace(/\s+/g, " ").trim();
    if (cand.length < 5 || cand.length > 60) continue;
    if (/\b(Inc|LLC|Ltd|Corp|Company|Trust|Fund|Manufacturing|Holdings)\b/i.test(cand)) continue;
    const tokens = cand.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
    if (tokens.filter((t) => exclude.has(t)).length >= 2) continue;
    if (tokens.length < 2) continue;
    const key = tokens.join(" ");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      vectorType: "other",
      value: `related-person:${cand}`,
      personName: cand,
      role: "proxy_table",
      scope: "candidate",
      sourceUrls: [sourceUrl],
      note: `Related name on proxy/filing ${sourceUrl}`,
    });
  }
  return out;
}


/** IR / press / SC13 contact blocks — parity with strong public-page extraction. */
function findingsFromIrAndRelatedBlocks(
  page: string,
  sourceUrl: string,
  targetName: string,
  companyName?: string | null,
): AgenticFinding[] {
  const out: AgenticFinding[] = [];
  if (!page || page.length < 40) return out;
  const plain = page.replace(/\s+/g, " ");
  // Contact blocks
  const blockRe = /(?:Investor\s+Contact|Contact\s+Information|Media\s+Contact|For\s+further\s+information)[:\s]*([\s\S]{0,800}?)(?=Forward\s+Looking|About\s+\w+|SOURCE\s|$)/gi;
  let bm: RegExpExecArray | null;
  const blocks: string[] = [];
  while ((bm = blockRe.exec(page)) !== null) blocks.push(bm[1] || "");
  if (!blocks.length) blocks.push(page.slice(0, 4000)); // also scan head of page
  const seen = new Set<string>();
  for (const block of blocks) {
    for (const em of block.matchAll(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi)) {
      const e = em[0].toLowerCase();
      if (seen.has("e:" + e)) continue;
      if (/example|sentry|wixpress|godaddy/.test(e)) continue;
      seen.add("e:" + e);
      out.push({
        vectorType: "email",
        value: e,
        personName: null,
        role: null,
        scope: "organization",
        sourceUrls: [sourceUrl],
        note: `IR/contact block on ${sourceUrl}`,
      });
    }
    for (const ph of block.matchAll(/\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/g)) {
      const v = ph[0].replace(/\s+/g, " ").trim();
      if (seen.has("p:" + v)) continue;
      seen.add("p:" + v);
      out.push({
        vectorType: "phone",
        value: v,
        personName: null,
        role: null,
        scope: "organization",
        sourceUrls: [sourceUrl],
        note: `Phone in contact block on ${sourceUrl}`,
      });
    }
    for (const pm of block.matchAll(
      /\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+)\s*[,\n]\s*((?:CEO|President|Chief(?:\s+\w+)?|Director|COO|CFO|Founder)[^\n,]{0,50})/g,
    )) {
      const pName = pm[1]!.replace(/\s+/g, " ").trim();
      const role = pm[2]!.replace(/\s+/g, " ").trim().slice(0, 80);
      if (pName.split(/\s+/).length < 2 || pName.length > 50) continue;
      const key = "r:" + pName.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        vectorType: "other",
        value: `${pName} — ${role}`,
        personName: pName,
        role,
        scope: "candidate",
        sourceUrls: [sourceUrl],
        note: `Related officer in contact/IR block on ${sourceUrl}`,
      });
    }
    for (const pem of block.matchAll(
      /\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+)[^\n]{0,50}?(?:E|Email)\s*[:.]?\s*([a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,})/gi,
    )) {
      const pName = pem[1]!.replace(/\s+/g, " ").trim();
      const email = pem[2]!.toLowerCase();
      out.push({
        vectorType: "email",
        value: email,
        personName: pName,
        role: "contact",
        scope: "candidate",
        sourceUrls: [sourceUrl],
        note: `Named email in contact block on ${sourceUrl}`,
      });
    }
  }
  // SC13-style residential / reporting-person address
  for (const m of plain.matchAll(
    /(?:address\s+is|resides\s+at|The\s+Reporting\s+Person'?s\s+address\s+is|Item\s*2\s*\(b\)[^:]{0,40}:)\s*([^.]{12,140})/gi,
  )) {
    const addr = m[1]!.replace(/\s+/g, " ").trim().slice(0, 160);
    if (seen.has("a:" + addr)) continue;
    seen.add("a:" + addr);
    out.push({
      vectorType: "other",
      value: addr,
      personName: targetName,
      role: "residential_address",
      scope: "candidate",
      sourceUrls: [sourceUrl],
      note: `Reporting-person address on ${sourceUrl}`,
    });
  }

  // SC 13D/G notices-and-communications phone (reporting person — not issuer)
  const noticePhoneRe =
    /(?:Notices\s+and\s+Communications|Authorized\s+to\s+Receive\s+Notices)[\s\S]{0,400}?(\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4})/i;
  const npm = plain.match(noticePhoneRe) || page.match(noticePhoneRe);
  if (npm?.[1]) {
    const v = npm[1].replace(/\s+/g, " ").trim();
    if (!seen.has("p:" + v)) {
      seen.add("p:" + v);
      out.push({
        vectorType: "phone",
        value: v,
        personName: targetName,
        role: "sc13_notice",
        scope: "candidate",
        sourceUrls: [sourceUrl],
        note: `SC13 notices-and-communications phone for ${targetName} on ${sourceUrl}`,
      });
    }
  }
  return out;
}

function findingsFromContactFacts(
  pageText: string,
  sourceUrl: string,
  targetName: string,
  companyName?: string | null,
): AgenticFinding[] {
  const out: AgenticFinding[] = [];
  const block = pageText.match(/CONTACT FACTS \(visible on page\):([\s\S]*?)(?:\n\n|$)/i)?.[1] ?? "";
  if (!block.trim()) return out;
  for (const line of block.split("\n")) {
    // PERSON_EMAIL is handled below with personName — bare EMAIL drops off-domain dealer noise
    if (!/^PERSON_EMAIL:/i.test(line.trim())) {
      const email = line.match(/EMAIL:\s*(\S+@\S+)/i)?.[1];
      if (email) {
        const cleaned = sanitizePublicEmail(email);
        if (cleaned && !isTrashContactValue("email", cleaned)) {
          if (!isCompanyAlignedEmail(cleaned, companyName, sourceUrl)) {
            continue;
          }
          out.push({
            vectorType: "email",
            value: cleaned,
            personName: null,
            role: null,
            scope: "organization",
            sourceUrls: [sourceUrl],
            note: `Extracted from ${sourceUrl}`,
          });
        }
      }
    }
    const phone = line.match(/PHONE:\s*(.+)/i)?.[1]?.trim();
    if (phone) {
      const cleaned = sanitizePublicPhone(phone);
      if (cleaned && !isTrashContactValue("phone", cleaned)) {
        out.push({
          vectorType: "phone",
          value: cleaned,
          personName: null,
          role: null,
          scope: "organization",
          sourceUrls: [sourceUrl],
          note: `Extracted from ${sourceUrl}`,
        });
      }
    }
    const addr = line.match(/ADDRESS:\s*(.+)/i)?.[1]?.trim();
    if (
      addr
      && addr.length >= 10
      && !/[{};]|rmp-|style=|--columns|standard-menu|Directory Search/i.test(addr)
      && /\d/.test(addr)
    ) {
      out.push({
        vectorType: "other",
        value: addr.slice(0, 160),
        personName: targetName,
        role: companyName ? `organization_contact @ ${companyName}` : "organization_contact",
        scope: "organization",
        sourceUrls: [sourceUrl],
        note: `Address on ${sourceUrl}`,
      });
    }
    const role = line.match(/ROLE:\s*(.+)/i)?.[1]?.trim();
    if (role && role.length >= 3 && !isMostlyBinaryGarbage(role) && !/[{};]|rmp-|style=|--columns|ast-/i.test(role)) {
      out.push({
        vectorType: "other",
        value: role.slice(0, 120),
        personName: targetName,
        role: role.slice(0, 80),
        scope: "organization",
        sourceUrls: [sourceUrl],
        note: `Role cue on ${sourceUrl}`,
      });
    }
    // Family ownership / succession facts (same public pages Grok Agent reads)
    const structure = line.match(/STRUCTURE:\s*(.+)/i)?.[1]?.trim();
    if (structure && structure.length >= 12 && !/[{};]|ast-/i.test(structure)) {
      out.push({
        vectorType: "other",
        value: structure.slice(0, 160),
        personName: null,
        role: "ownership_structure",
        scope: "organization",
        sourceUrls: [sourceUrl],
        note: `Structure fact on ${sourceUrl}`,
      });
    }
    const succession = line.match(/SUCCESSION:\s*(.+)/i)?.[1]?.trim();
    if (succession && succession.length >= 10 && !/[{};]|ast-/i.test(succession)) {
      out.push({
        vectorType: "other",
        value: succession.slice(0, 180),
        personName: null,
        role: "succession",
        scope: "organization",
        sourceUrls: [sourceUrl],
        note: `Succession fact on ${sourceUrl}`,
      });
    }
    // Related officers / contacts (BBB, about, team, dealer)
    const person = line.match(/PERSON:\s*(.+)/i)?.[1]?.trim();
    if (person && person.length >= 5 && !/[{};]|ast-|uagb-/i.test(person)) {
      const [pName, pRole] = person.split(/\s*[—–-]\s*/).map((s) => s.trim());
      if (pName && pName.split(/\s+/).length >= 2 && !isMostlyBinaryGarbage(pName) && !(pRole && isMostlyBinaryGarbage(pRole))) {
        out.push({
          vectorType: "other",
          value: person.slice(0, 160),
          personName: pName.slice(0, 120),
          role: (pRole || "related_contact").slice(0, 80),
          scope: "organization",
          sourceUrls: [sourceUrl],
          note: `Related person on ${sourceUrl}`,
        });
      }
    }
    const personEmail = line.match(/PERSON_EMAIL:\s*(.+)/i)?.[1]?.trim();
    if (personEmail) {
      const [pName, emailRaw] = personEmail.split(/\s*\|\s*/).map((s) => s.trim());
      const cleaned = emailRaw ? sanitizePublicEmail(emailRaw) : null;
      if (pName && pName.split(/\s+/).length >= 2 && cleaned && !isTrashContactValue("email", cleaned)) {
        out.push({
          vectorType: "email",
          value: cleaned,
          personName: pName.slice(0, 120),
          role: "related_contact",
          scope: "organization",
          sourceUrls: [sourceUrl],
          note: `Named contact email on ${sourceUrl}`,
        });
      }
    }
    const walletLine = line.match(/WALLET:\s*(.+)/i)?.[1]?.trim();
    if (walletLine) {
      const [chainRaw, addrRaw] = walletLine.split(/\s*\|\s*/).map((s) => s.trim());
      const addr = (addrRaw || "").trim();
      if (addr && (/^0x[a-fA-F0-9]{40}$/i.test(addr) || /^bc1[a-z0-9]{25,62}$/i.test(addr))) {
        out.push({
          vectorType: "other",
          value: addr,
          personName: null,
          role: `wallet:${(chainRaw || "unknown").toLowerCase()}`,
          scope: "candidate",
          sourceUrls: [sourceUrl],
          note: `Public wallet mention on ${sourceUrl} — wealth evidence only after person attribution`,
        });
      }
    }
  }
  // Website finding only for real company domains — never bbb/mapquest/directories
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./, "");
    const hostFlat = host.replace(/[^a-z0-9]/g, "");
    const coFlat = (companyName || targetName || "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 10);
    const looksCompany =
      host
      && !/linkedin|facebook|twitter|sec\.gov|wikipedia|duckduckgo|google|bing/i.test(host)
      && !/zoominfo|rocketreach|mapquest|bbb\.org|yelp|dnb\.com|chamber|manta|bizapedia|yellowpages|opencorporates|equilar|prospeo|thebluebook|dot\.report|growjo|apollo/i.test(host)
      && (coFlat.length < 3 || hostFlat.includes(coFlat.slice(0, Math.min(6, coFlat.length))) || coFlat.includes(hostFlat.slice(0, 5)));
    if (looksCompany) {
      out.push({
        vectorType: "website",
        value: `https://${host}`,
        personName: null,
        role: null,
        scope: "organization",
        sourceUrls: [sourceUrl],
        note: "Primary domain from visited page",
      });
    }
  } catch { /* ignore */ }
  return out;
}


/** Pull company-domain org inboxes out of SERP snippet text (e.g. Facebook About lists info@). */
function findingsFromSearchSnippet(
  text: string,
  urls: string[],
  companyName?: string | null,
): AgenticFinding[] {
  const out: AgenticFinding[] = [];
  if (!text) return out;
  const co = (companyName || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const emails = text.match(/\b([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/gi) || [];
  for (const raw of emails) {
    const email = raw.toLowerCase();
    const domain = email.split("@")[1] || "";
    const domFlat = domain.replace(/[^a-z0-9]/g, "");
    // Classic org mailboxes (info@/contact@) tolerate shorter company tokens so
    // mid-market names like "DYNA" still match dyna-products.com when visible in SERP.
    const isClassicOrgMailbox = /^(info|contact|sales|office|support|hello|admin)@/i.test(email);
    const companyDomain =
      /* SERP_EMAIL_LOOSE_MATCH */ (co.length >= 3 && (domFlat.includes(co.slice(0, Math.min(8, co.length))) || co.includes(domFlat.slice(0, 5))))
      || (isClassicOrgMailbox && co.length >= 3 && (
        domFlat.includes(co.slice(0, Math.min(6, co.length)))
        || domain.includes(co.slice(0, Math.min(4, co.length)))
      ));
    if (!companyDomain) continue;
    if (/example\.|sentry\.|schema\.|wixpress|cloudflare|wordpress|github\.com|google\.com/.test(email)) continue;
    // Prefer a URL that mentions the company or is a public org surface
    const src =
      urls.find((u) => /facebook\.com|linkedin\.com|instagram\.com/i.test(u))
      || urls.find((u) => co.length >= 4 && u.toLowerCase().replace(/[^a-z0-9]/g, "").includes(co.slice(0, 6)))
      || urls[0]
      || null;
    if (!src || !/^https?:\/\//i.test(src)) continue;
    out.push({
      vectorType: "email",
      value: email,
      personName: null,
      role: null,
      scope: "organization",
      sourceUrls: [src],
      note: `Org inbox visible in search snippet; source ${src}`,
    });
  }
  return out;
}

/** Pull principal/owner names out of SERP/BBB snippet text (related-people recovery from public snippets). */
function findingsFromPeopleSnippet(
  text: string,
  urls: string[],
  companyName?: string | null,
): AgenticFinding[] {
  const out: AgenticFinding[] = [];
  if (!text) return out;
  const src = urls.find((u) => /bbb\.org|opencorporates|sec\.gov/i.test(u)) || urls[0];
  if (!src || !/^https?:\/\//i.test(src)) return out;
  // Name atom allows middle initials: "Donald W. Kuchenbecker" (middle initials matter on public pages)
  const patterns = [
    /(?:Mr\.?|Ms\.?|Mrs\.?)\s+([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+),\s*(Owner|President|CEO|Principal|Manager|Director|Founder|Co-Founder|CFO|Chairman|Treasurer)/g,
    /\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+)\s*[—\-,:/]\s*(Owner|President|CEO|Principal|Manager|Director|Founder|Co-Founder|CFO|Chairman|Treasurer|General Manager|Supervisor|Controller|Managing Partner)\b/g,
    /Business Management:\s*(?:Mr\.?|Ms\.?)?\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z.]+)+),\s*(Owner|President|CEO|Treasurer)?/gi,
    /Principal Contacts?\s*(?:Mr\.?|Ms\.?)?\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z.]+)+)/gi,
    /\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+)\s+(?:as\s+)?(?:CEO|President|Founder|Co-Founder|Chief Executive|Treasurer)\b/g,
    /(?:CEO|President|Founder|Co-Founder|Chief Executive(?:\s+Officer)?|Treasurer)\s+([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+)\b/g,
    /\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+),\s*(?:founder|retiring CEO|former CEO|retired CEO|board|President|Owner)/gi,
    // Directory proximity: name within ~40 chars of role; allow one newline (heading style)
    /\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+)\b(?:[^\n.]{0,40}|\s*\n\s*)\b(Owner|President|CEO|Principal|Treasurer|Founder|CFO|Chairman|General Manager|Manager|Director|Controller|Supervisor|Managing Partner|VP of Manufacturing|Project Coordinator)\b/gi,
  ];
  const seen = new Set<string>();
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      let person = (m[1] || "").replace(/\s+/g, " ").trim();
      // Normalize Jr/Sr suffixes; drop garbage captures that swallowed "Jr is the Owner"
      person = person.replace(/\s*,?\s*(Jr\.?|Sr\.?|II|III|IV)\s*$/i, "").trim();
      person = person.replace(/^(Leadership|Meet Our Team|Our Team|Team)\s+/i, "").trim();
      if (/\b(is the|was the|as the)\b/i.test(person)) continue;
      const role = (m[2] || "principal").toLowerCase();
      if (person.length < 4 || person.split(" ").length < 2) continue;
      if (person.split(" ").length > 5) continue; // over-capture guard
      const key = person.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        vectorType: "other",
        value: person,
        personName: person,
        role: role || "related_contact",
        scope: "organization",
        sourceUrls: [src],
        note: `related person from snippet; ${role}`,
      });
    }
  }
  return out;
}

function mergeFindings(existing: AgenticFinding[], incoming: AgenticFinding[]): AgenticFinding[] {
  const key = (f: AgenticFinding) => `${f.vectorType}|${f.value.toLowerCase()}`;
  const map = new Map<string, AgenticFinding>();
  for (const f of existing) map.set(key(f), f);
  for (const f of incoming) {
    const k = key(f);
    const prev = map.get(k);
    if (!prev) map.set(k, f);
    else {
      const urls = [...new Set([...(prev.sourceUrls || []), ...(f.sourceUrls || [])])];
      map.set(k, { ...prev, sourceUrls: urls, note: prev.note || f.note });
    }
  }
  return [...map.values()];
}

/**
 * Run agentic multi-hop web research for a person/company target.
 */
export async function runAgenticWebResearch(input: {
  targetName: string;
  companyName?: string | null;
  objective?: string;
  maxIterations?: number;
  /** Hard wall-clock timeout (ms). On expiry return whatever findings were already accumulated. Default 210s. */
  hardTimeoutMs?: number;
}): Promise<AgenticWebResearchResult> {
  const name = input.targetName.trim();
  if (name.length < 2) {
    return { status: "unavailable", model: "none", iterations: 0, searches: 0, visits: 0, findings: [], trajectory: [], error: "empty target" };
  }

  const maxIter = Math.min(input.maxIterations ?? MAX_ITER, 24);
  const hardTimeoutMs = Math.max(30_000, input.hardTimeoutMs ?? 210_000);
  const startedAt = Date.now();
  let objective = input.objective
    ?? `Find publicly documented contact routes (email, phone, LinkedIn, website, related people) for ${name}${input.companyName ? ` related to ${input.companyName}` : ""}. Be thorough and creative.`;

  // Wallet-first seed: if objective/target carries a wallet, prepend fail-closed attribution plan
  {
    const walletText = `${objective}\n${name}\n${input.companyName || ""}`;
    const seeds = extractWalletSeedsFromText(walletText);
    if (seeds.length > 0 || objectiveLooksWalletFirst(objective)) {
      const seed = seeds[0] || null;
      if (seed) {
        const plan = buildWalletSeedPlan(seed);
        objective = `${formatWalletSeedPlanForPrompt(plan)}\n\nThen maximize attributable people-contacts for the attributed holder.\n\n${objective}`;
      } else {
        objective =
          `WALLET-FIRST mode: objective suggests crypto-wallet discovery. ` +
          `Attribute any holder from public sources before contact hops. ` +
          `Reject exchange/mixer/protocol treasuries. Never invent holder or contacts.\n\n${objective}`;
      }
    }
  }

  // Fresh browser-escalate budget per agentic pass (Scrapfly/ZenRows)
  try {
    const { resetBrowserFetchCount } = await import("./browser-fetch");
    resetBrowserFetchCount();
  } catch { /* optional */ }

  const history: string[] = [];
  let lastObservation = "Begin. Choose an initial web_search query — do not wait for instructions.";
  let modelUsed = "none";
  let searches = 0;
  let visits = 0;
  let findings: AgenticFinding[] = [];
  // URLs seen in SERP — SERP URL queue for model visits
  const candidateUrls: string[] = [];
  const visitedUrls = new Set<string>();
  const domainSurfaceDone = new Set<string>(); // one RDAP/WhoisJSON hop per primary domain

  const isAggregatorHost = (u: string): boolean =>
    /zoominfo|rocketreach|adapt\.io|signalhire|contactout|growjo|apollo\.io|clearbit|hunter\.io|mibarry|chamber|yelp|dnb\.com|bloomberg\.com\/profile|crunchbase|pitchbook|linkedin\.com\/company|mapquest|bbb\.org|yellowpages|superpages|manta\.com|bizapedia|opencorporates|equilar|prospeo|thebluebook|dot\.report/i.test(
      u,
    );

  const rankVisitUrl = (u: string): number => {
    const lower = u.toLowerCase();
    // Directory/aggregator pages pollute contact facts — visit last
    if (isAggregatorHost(lower)) return 9;
    const coToken = input.companyName
      ? input.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 10)
      : "";
    const hostMatch = coToken && lower.replace(/[^a-z0-9]/g, "").includes(coToken.slice(0, 6));
    // Company-domain PDF contact/sales sheets often hold named person emails (public surface recovery)
    if (hostMatch && /\.pdf(\?|$)/i.test(lower) && /(contact|sales|team|staff|directory|rep)/i.test(lower)) return 0;
    if (/\.pdf(\?|$)/i.test(lower) && /(contact|sales|team|staff|directory|rep)/i.test(lower) && coToken) return 1;
    // Primary company contact/terms pages first (where org email/phone actually live)
    if (hostMatch && /\/(contact|terms|about|team|people|leadership|privacy|impressum|dealer|corporate-locations|locations)/i.test(lower)) return 0;
    if (hostMatch && /\/(contact|terms|about|team|people|leadership|privacy|dealer)/i.test(lower)) return 0;
    if (/\/(contact|terms-and-conditions|terms|about\/contact|dealer|dealers|team)/i.test(lower) && hostMatch) return 0;
    // BBB may be CF-walled; still rank if reachable
    if (/bbb\.org/i.test(lower)) return 2;
    if (hostMatch) return 3;
    // Public social often carries org email for SMBs
    if (/facebook\.com|linkedin\.com\/company/i.test(lower) && coToken) return 4;
    if (/\/(about|team|people|leadership|company)/i.test(lower) && hostMatch) return 3;
    // DEF 14A / proxy HTML beats generic EDGAR index pages for officer bios
    if (/sec\.gov/i.test(lower) && /proxy|def14a|def\s*14a|hastproxy/i.test(lower)) return 1;
    if (/investor\.|\/ir\/|\/governance|sec\.gov|edgar/i.test(lower)) return 5;
    // Non-company hosts rank last when company is locked (avoid Team Financial pollution visits)
    if (coToken && !hostMatch && !/bbb\.org|sec\.gov/i.test(lower)) return 8;
    if (/\.(com|org|io|co|net)\b/i.test(lower) && !/linkedin|facebook|twitter|youtube|wikipedia|reddit/i.test(lower))
      return 5;
    if (/linkedin\.com\/in\//i.test(lower)) return 6;
    return 7;
  };

  /** Light touch only: if SERP shows a company-aligned host, offer /contact + /about — not a path playbook. */
  const seedCompanyContactPaths = (urls: string[]) => {
    const paths = ["/contact", "/about"];
    const coToken = input.companyName
      ? input.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 8)
      : "";
    if (coToken.length < 4) return;
    for (const u of urls) {
      if (isAggregatorHost(u)) continue;
      try {
        const parsed = new URL(u);
        if (!/\.(com|org|io|co|net|us)$/i.test(parsed.hostname)) continue;
        if (/linkedin|facebook|twitter|youtube|wikipedia|sec\.gov/i.test(parsed.hostname)) continue;
        const hostFlat = parsed.hostname.replace(/[^a-z0-9]/g, "");
        if (!hostFlat.includes(coToken.slice(0, 5)) && !hostFlat.includes(coToken.slice(0, 4))) continue;
        for (const p of paths) {
          const seeded = `${parsed.protocol}//${parsed.hostname}${p}`;
          if (!candidateUrls.includes(seeded)) candidateUrls.push(seeded);
        }
      } catch {
        /* skip */
      }
    }
  };

  const detVisitNext = async (stepLabel: string): Promise<boolean> => {
    const next = [...new Set(candidateUrls)]
      .filter((u) => !visitedUrls.has(u))
      .sort((a, b) => rankVisitUrl(a) - rankVisitUrl(b))[0];
    if (!next) return false;
    visits++;
    visitedUrls.add(next);
    history.push(`${stepLabel}: det_visit ${next}`);
    const page = await toolVisit(next);
    lastObservation = `PAGE ${next}\n\n${page.slice(0, MAX_OBS)}`;
    // Deterministic findings from CONTACT FACTS block so we never depend solely on LLM memory
    const extracted = mergeFindings(
      mergeFindings(
        findingsFromContactFacts(page, next, name, input.companyName),
        findingsFromProxyPage(page, next, name, input.companyName),
      ),
      findingsFromIrAndRelatedBlocks(page, next, name, input.companyName),
    );
    if (extracted.length) {
      findings = mergeFindings(findings, extracted);
      history.push(`${stepLabel}: auto_findings=${extracted.length}`);
    }
    // Permanent domain surface hop (RDAP-first + WhoisJSON): longevity / stability signal only.
    // Fail-closed — never invent registrant contacts from privacy-redacted records.
    try {
      const site = extracted.find((f) => f.vectorType === "website") || findings.find((f) => f.vectorType === "website");
      if (site?.value) {
        const host = new URL(site.value).hostname.replace(/^www\./, "");
        if (host && !domainSurfaceDone.has(host)) {
          domainSurfaceDone.add(host);
          const surface = await lookupDomainSurface(host);
          const domainFindings = findingsFromDomainSurface(surface, next);
          if (domainFindings.length) {
            findings = mergeFindings(findings, domainFindings as any);
            history.push(`${stepLabel}: domain_surface ${surface.summary}`);
          } else {
            history.push(`${stepLabel}: domain_surface ${surface.summary}`);
          }
        }
      }
    } catch { /* non-fatal */ }
    return true;
  };

  const salvageEmailsFromHistory = () => {
    // Classic org + any company-aligned email seen in trajectory (LLM may drop; regex backstop)
    const classicRe = /\b((?:info|contact|sales|office|support|hello|admin|service|parts|inquiries)@[a-z0-9.-]+\.[a-z]{2,})\b/gi;
    const mailtoRe = /EMAIL:\s*(\S+@\S+)/gi;
    const anyEmailRe = /\b([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/gi;
    for (const line of history) {
      const srcMatch = String(line).match(/https?:\/\/[^\s]+/i);
      const src = srcMatch ? [srcMatch[0].replace(/[),.;]+$/, "")] : [];
      for (const re of [classicRe, mailtoRe, anyEmailRe]) {
        re.lastIndex = 0;
        for (const m of String(line).matchAll(re)) {
          const email = m[1]!.toLowerCase().replace(/[),.;]+$/, "");
          if (!email.includes("@")) continue;
          if (/example\.|sentry\.|schema\.|wixpress|cloudflare|wordpress|github\.com|google\.com/i.test(email)) continue;
          if (input.companyName && !isCompanyAlignedEmail(email, input.companyName, src[0])) continue;
          if (findings.some((f) => f.vectorType === "email" && f.value === email)) continue;
          const local = email.split("@")[0] || "";
          const isClassic = /^(info|contact|sales|office|support|hello|admin|service|parts|inquiries)$/i.test(local);
          findings.push({
            vectorType: "email",
            value: email,
            personName: null,
            role: isClassic ? null : "related_contact",
            scope: "organization",
            sourceUrls: src,
            note: "salvaged from trajectory (LLM backstop)",
          });
        }
      }
    }
  };


  for (let i = 0; i < maxIter; i++) {
    // Hard wall-clock timeout: materialize whatever agentic already found and exit.
    // Prevents the box/worker kill from discarding 10–20 findings (Rayco case).
    if (Date.now() - startedAt >= hardTimeoutMs) {
      history.push(`step${i + 1}: hard_timeout after ${Math.round((Date.now() - startedAt) / 1000)}s findings=${findings.length}`);
      logger.info(
        { target: name, findings: findings.length, searches, visits, elapsedMs: Date.now() - startedAt },
        "[agentic] hard timeout — returning partial findings",
      );
      salvageEmailsFromHistory();
      return {
        status: "timeout",
        model: modelUsed,
        iterations: i,
        searches,
        visits,
        findings,
        trajectory: history,
        error: `hard timeout ${hardTimeoutMs}ms (partial findings preserved)`,
      };
    }


    // Model-led only. detVisitNext only on all-LLM-fail recovery.

    // Soft stagnation: if the last searches repeated the same query, nudge the model.
    {
      const recentSearches = history
        .map((h) => {
          const m = h.match(/web_search\s+(.+)$/i) || h.match(/det_search\s+(.+)$/i) || h.match(/search\s+(.+)$/i);
          return m ? m[1]!.trim().toLowerCase() : null;
        })
        .filter(Boolean) as string[];
      if (recentSearches.length >= 2) {
        const a = recentSearches[recentSearches.length - 1]!;
        const b = recentSearches[recentSearches.length - 2]!;
        if (a === b && a.length > 8 && !/stagnation/i.test(lastObservation)) {
          lastObservation =
            `${lastObservation}\n\n[STAGNATION] The same search query just ran twice. ` +
            `Change the query, visit a queued URL, or done with whatever findings you have — do not repeat the identical search.`;
        }
      }
    }

    const prompt = buildStepPrompt({
      targetName: name,
      companyName: input.companyName,
      objective,
      history,
      lastObservation,
      findings,
    });
    const llm = await llmStep(prompt);
    if (!llm) {
      // All chat LLMs failed this step — do NOT abort the bureau. Run deterministic
      // search/visit so OSINT tools still produce surface vs a general agent.
      history.push(`step${i + 1}: llm_all_failed — deterministic recovery`);
      modelUsed = modelUsed === "none" ? "deterministic" : modelUsed;
      const co = input.companyName || name;
      if (searches === 0) {
        const q = input.companyName
          ? `"${name}" "${input.companyName}"`
          : `"${name}"`;
        searches++;
        history.push(`step${i + 1}: det_search ${q}`);
        const sr = await toolWebSearch(q);
        for (const u of sr.urls) {
          if (u.startsWith("http") && !candidateUrls.includes(u)) candidateUrls.push(u);
        }
        seedCompanyContactPaths(sr.urls);
        const peopleHits = findingsFromPeopleSnippet(sr.text, sr.urls, input.companyName || name);
        if (peopleHits.length) findings = mergeFindings(findings, peopleHits);
        const snippetEmails = findingsFromSearchSnippet(sr.text, sr.urls, input.companyName || name);
        if (snippetEmails.length) findings = mergeFindings(findings, snippetEmails);
        lastObservation =
          `DETERMINISTIC SEARCH (no LLM): ${q}\nURLs: ${sr.urls.slice(0, 8).join(" | ")}\n\n${sr.text.slice(0, MAX_OBS)}`;
      }
      if (candidateUrls.some((u) => !visitedUrls.has(u))) {
        await detVisitNext(`step${i + 1}`);
      }
      if (i >= maxIter - 1 || (searches >= 3 && visits >= 2)) {
        return {
          status: findings.length ? "completed" : "error",
          model: modelUsed,
          iterations: i + 1,
          searches,
          visits,
          findings,
          trajectory: history,
          error: findings.length
            ? undefined
            : "All agentic LLMs failed; deterministic recovery produced no findings",
        };
      }
      continue;
    }
    modelUsed = llm.model;
    let action = parseAction(llm.raw);
    if (!action) {
      // One repair turn — native tool calling is not uniform across providers; JSON can glitch.
      history.push(`step${i + 1}: parse_fail — retry once`);
      const repair = await llmStep(
        `Your previous reply was not valid action JSON.\n` +
        `Reply with ONE object only, e.g. {"action":"web_search","query":"...","thought":"..."} ` +
        `or {"action":"visit","url":"https://..."} or {"action":"done","findings":[...]}.\n` +
        `Target: ${name}. Objective: ${objective.slice(0, 400)}\n` +
        `Last observation (trim):\n${lastObservation.slice(0, 1200)}\n` +
        `Bad reply was:\n${llm.raw.slice(0, 500)}`,
      );
      if (repair?.raw) {
        modelUsed = repair.model;
        action = parseAction(repair.raw);
      }
      if (!action) {
        lastObservation =
          "Invalid JSON twice. Reply with one valid action object only (web_search | visit | done).";
        continue;
      }
    }

    if (action.action === "web_search") {
      searches++;
      history.push(`step${i + 1}: search ${action.query}${action.thought ? ` (${action.thought.slice(0, 80)})` : ""}`);
      const sr = await toolWebSearch(action.query);
      for (const u of sr.urls) {
        if (/^https?:\/\//i.test(u) && !candidateUrls.includes(u)) candidateUrls.push(u);
      }
      // Optional company /contact /about seeds from SERP hosts
      seedCompanyContactPaths(sr.urls);
      const snippetEmails = findingsFromSearchSnippet(sr.text, sr.urls, input.companyName || name);
      if (snippetEmails.length) {
        findings = mergeFindings(findings, snippetEmails);
        history.push(`step${i + 1}: serp_email_findings=${snippetEmails.length}`);
      }
      lastObservation = `SEARCH results for: ${action.query}\nURLs: ${sr.urls.slice(0, 8).join(" | ")}\n\n${sr.text.slice(0, MAX_OBS)}`;
      // Soft nudge: if we already have company-looking URLs and no visits yet, tell the model to visit
      if (visits === 0 && sr.urls.length > 0) {
        lastObservation +=
          `\n\n[Note] ${sr.urls.length} URL(s) available. Visit a primary company/contact page when ready — your choice of which.`;
      }
      continue;
    }

    if (action.action === "visit") {
      if (visitedUrls.has(action.url)) {
        history.push(`step${i + 1}: skip_repeat_visit ${action.url}`);
        lastObservation =
          `Already visited ${action.url}. Pick a different URL or a new search — your judgment.`;
        continue;
      }
      visits++;
      visitedUrls.add(action.url);
      history.push(`step${i + 1}: visit ${action.url}`);
      const page = await toolVisit(action.url);
      lastObservation = `PAGE ${action.url}\n\n${page.slice(0, MAX_OBS)}`;
      const extracted = mergeFindings(
        mergeFindings(
          findingsFromContactFacts(page, action.url, name, input.companyName),
          findingsFromProxyPage(page, action.url, name, input.companyName),
        ),
        findingsFromIrAndRelatedBlocks(page, action.url, name, input.companyName),
      );
      if (extracted.length) {
        findings = mergeFindings(findings, extracted);
        history.push(`step${i + 1}: auto_findings=${extracted.length}`);
        lastObservation += `\n\n(System also extracted ${extracted.length} contact fact(s) from HTML on this page — available for your done.findings with this URL as sourceUrl.)`;
      }
      // Permanent domain surface hop (RDAP-first + WhoisJSON)
      try {
        const site = extracted.find((f) => f.vectorType === "website") || findings.find((f) => f.vectorType === "website");
        if (site?.value) {
          const host = new URL(site.value).hostname.replace(/^www\./, "");
          if (host && !domainSurfaceDone.has(host)) {
            domainSurfaceDone.add(host);
            const surface = await lookupDomainSurface(host);
            const domainFindings = findingsFromDomainSurface(surface, action.url);
            if (domainFindings.length) {
              findings = mergeFindings(findings, domainFindings as any);
            }
            history.push(`step${i + 1}: domain_surface ${surface.summary}`);
          }
        }
      } catch { /* non-fatal */ }
      continue;
    }


    // done — only soft-reject pure no-ops (zero work + zero findings). Model owns when to finish.
    if (action.findings.length === 0 && findings.length === 0 && searches === 0 && visits === 0 && i < maxIter - 1) {
      history.push(`step${i + 1}: done_rejected (no research yet)`);
      lastObservation =
        `You returned done with no searches, visits, or findings. ` +
        `Run web_search or visit a page for "${name}"${input.companyName ? ` / "${input.companyName}"` : ""} — your query.`;
      continue;
    }
    findings = mergeFindings(findings, action.findings);
    history.push(
      `step${i + 1}: done findings=${findings.length}` +
        (action.findings.length === 0 && findings.length > 0 ? " (incl. auto-extracted)" : ""),
    );
    salvageEmailsFromHistory();
    return {
      status: "completed",
      model: modelUsed,
      iterations: i + 1,
      searches,
      visits,
      findings,
      trajectory: history,
    };

    salvageEmailsFromHistory();
  return {
    status: "completed",
    model: modelUsed,
    iterations: maxIter,
    searches,
    visits,
    findings,
    trajectory: history,
    error: "iteration budget exhausted",
  };
}
