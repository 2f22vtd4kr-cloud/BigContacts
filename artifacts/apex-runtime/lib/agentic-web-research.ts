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
import { GROQ_CHAT_MODELS } from "./groq-models";

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
const MAX_OBS = 3_500;
/** First N steps are free ReAct only — force-hops must not starve the multi-LLM loop
 *  (root cause of single-agent Grok beating the bureau on the same target). */
const FREE_REACT_STEPS = 5;

function randomUA(): string {
  const uas = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  ];
  return uas[Math.floor(Math.random() * uas.length)]!;
}

/** Decode Cloudflare email-protection href hashes (Grok parity on contact pages). */
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

async function toolWebSearch(query: string): Promise<{ text: string; urls: string[] }> {
  // Prefer Serper when keyed (stable SERP + real result URLs); DDG HTML is a free fallback.
  const serper = await toolWebSearchSerper(query);
  if (serper && serper.urls.length > 0) return serper;

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
    if (!resp.ok) return serper ?? { text: "", urls: [] };
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
    if (out.urls.length === 0 && serper) return serper;
    return out;
  } catch (err: any) {
    logger.debug({ err: err?.message, query }, "agentic web_search failed");
    return serper ?? { text: "", urls: [] };
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

async function callGroqJson(prompt: string): Promise<{ model: string; raw: string } | null> {
  const keys = ["GROQ_API_KEY", ...Array.from({ length: 5 }, (_, i) => `GROQ_API_KEY_${i + 1}`)]
    .map((n) => process.env[n] ?? "")
    .filter((k) => k.length > 0);
  if (!keys.length) return null;
  // GROQ_CHAT_MODELS — post Llama 3.3 70B decommission (2026-08-16). Never hard-code dead ids.
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
        if (!resp.ok) continue; // model_not_found / access → try next model
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

async function llmStep(prompt: string): Promise<{ model: string; raw: string } | null> {
  // Prefer Groq for agentic ReAct (lower latency, avoids Gemini text-gen 429 capacity fights
  // with Boss). Fall back to Gemini so the loop still runs when Groq is unavailable.
  return (await callGroqJson(prompt)) ?? (await callGeminiJson(prompt));
}

function buildStepPrompt(input: {
  targetName: string;
  companyName?: string | null;
  objective: string;
  history: string[];
  lastObservation: string;
}): string {
  return `You are running an AGENTIC web research loop for Apex Atlas.
GROK IS THE FLOOR, NOT THE CEILING. Recover at least every public org vector Grok would (phone, address, info@/sales@, named officers on contact/about pages).
Then MAXIMIZE attributable RELATED PERSON contacts: owners, presidents, CEOs, founders, co-founders, officers — with personName + role + any role-email or direct phone visible on primary sources.
Apex's objective is to hold MORE strongly-sourced people-contacts than a general agent. Never invent. Never mark org inboxes Personal.
Registries, browser escalate, and bureau tools layer on top of this web loop.

TARGET: ${input.targetName}
${input.companyName ? `RELATED COMPANY / ISSUER: ${input.companyName}` : ""}
OBJECTIVE: ${input.objective}

TOOLS (choose exactly one per turn):
1) {"action":"web_search","query":"...","thought":"..."}  — search the live web; invent the query yourself
2) {"action":"visit","url":"https://...","thought":"..."} — open a specific page and read it
3) {"action":"done","findings":[{"vectorType":"email|phone|linkedin|website|social|other","value":"...","personName":null,"role":null,"scope":"organization|candidate","sourceUrls":["https://exact-page"],"note":"..."}],"thought":"..."}

GROK-PARITY SEARCH ORDER (follow this, then improvise):
1. Exact TARGET + company + city/state (or "contact" / "phone" / "address")
2. Company domain surface: "{company}" (contact OR "contact us" OR phone OR email) -zoominfo -rocketreach
3. Org mailbox: "{company}" ("info@" OR "contact@" OR "sales@") OR site:facebook.com "{company}"
4. Facebook / About: "{company}" site:facebook.com (about OR email OR info@ OR contact)
5. Leadership / succession / family: "{company}" (leadership OR "executive chairman" OR succession OR "family-owned" OR "fourth generation" OR CEO OR president OR officers OR BBB)
6. Related people: "{company}" (owner OR "co-founder" OR officers OR BBB OR "principal contact")
7. Visit every high-value URL before another search: company /contact, /about, /about-us/leadership, /leadership, /team, succession/blog posts, **company PDF sales/contact sheets**, Facebook, BBB
8. Ownership path: "{company}" (founder OR acquired OR "family-owned" OR owner) — recover controlling people, not only sales reps
RULE: If a company leadership or succession page is visible in SERP, VISIT it. Emit PERSON+role AND any succession/family-ownership facts as other findings with that page as sourceUrl. Grok Agent would; so must you.

RULES:
- Never invent emails, phones, or profiles. Only report values VISIBLE in observations with exact sourceUrls.
- Prefer primary sources: company contact/about/team/terms, Facebook About, BBB, registries, LinkedIn, filings, SEC/EDGAR.
- Multi-hop: if you learn a company domain, immediately visit /contact /contact-us /about /team (and root). Emit CONTACT FACTS with that page as sourceUrl.
- Mid-market org email often lives on Facebook About, not the corporate contact form. When company is locked and email is still missing, search site:facebook.com and VISIT the Facebook page.
- AFTER org email/phone/address are known, do NOT stop. Recover RELATED people (owners, co-founders, officers) with personName + role.
- AFTER founders are known, STILL recover the CURRENT CEO/President and sales@ / info@ from company location/contact pages. Founders ≠ sitting executives.
- ALSO recover succession and ownership structure when visible (family-owned, generation, named CEO succession, Executive Chairman). Visit /leadership and succession blog posts. Emit those facts with sourceUrls — same pages Grok Agent would read.
- Organization inboxes (info@, contact@, office@, sales@) are organization scope. Do not mark Personal.
- FIRST ACTION must be web_search when trajectory is empty.
- Do not return done until: (a) ≥2 web_search AND ≥1 visit, (b) company contact/Facebook hop attempted when company known, (c) related-people hop attempted, (d) when org phone/email exists you have emitted ≥1 RELATED person (owner/president/CEO/founder/officer) with personName+role when any such person is visible in observations — do not leave people on the table.
- After any web_search that returns URLs, NEXT action should usually be visit on company/contact/Facebook/BBB/about — not another search.
- When CONTACT FACTS appear, include them in done.findings with that page as sourceUrl.

LLM EXTRACTION MANDATE (you must catch these even if early SERP is noisy/trash — regex is a backstop, not the only path):
- Name / Title same line: "Alan G. Klinger / President", "Name — Role", "Name, President"
- Multi-line headings: Name on one line, title on the next (about/who-we-are pages)
- Compound titles before name: "President and CEO Bryon Shafer", "CFO Rick Sykora", "Executive Chairman Craig Cook"
- Ownership transfer: "sold the business to X", "acquired by X", "current owner and president, X"
- Middle initials: "Donald W. Kuchenbecker", "Frank K. Chesek", "Alan G. Klinger"
- Role-line emails: "President / CEO - djolliffe@domain.com"
- Cloudflare-protected emails when visible in observation text or decoded
- Brand-short domains: person@acc-mfg.com for "Accurate Manufacturing" — still company-aligned
- Org phones and classic org mailboxes (info@, sales@, contact@) — force onto company row, never Personal
- Succession / family-owned / MBE / co-founder facts as other findings with sourceUrls
If a page shows any of the above, emit findings. Do not wait for perfect SERP. Early trash search results do not excuse missing surface on a later successful visit.

TRAJECTORY SO FAR:
${input.history.join("\n") || "(start)"}

LAST OBSERVATION:
${input.lastObservation.slice(0, MAX_OBS) || "(none — start with web_search on the exact TARGET + company)"}

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

/** Pull principal/owner names out of SERP/BBB snippet text (Grok parity on related people). */
function findingsFromPeopleSnippet(
  text: string,
  urls: string[],
  companyName?: string | null,
): AgenticFinding[] {
  const out: AgenticFinding[] = [];
  if (!text) return out;
  const src = urls.find((u) => /bbb\.org|opencorporates|sec\.gov/i.test(u)) || urls[0];
  if (!src || !/^https?:\/\//i.test(src)) return out;
  // Name atom allows middle initials: "Donald W. Kuchenbecker" (Grok parity — was a severe miss)
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
  /** Hard wall-clock timeout (ms). On expiry return whatever findings were already accumulated. Default 150s. */
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
  // URLs seen in SERP — used to force visits when the LLM only searches
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
    // Company-domain PDF contact/sales sheets often hold named person emails (Grok parity)
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
    if (/investor\.|\/ir\/|\/governance|sec\.gov|edgar/i.test(lower)) return 5;
    // Non-company hosts rank last when company is locked (avoid Team Financial pollution visits)
    if (coToken && !hostMatch && !/bbb\.org|sec\.gov/i.test(lower)) return 8;
    if (/\.(com|org|io|co|net)\b/i.test(lower) && !/linkedin|facebook|twitter|youtube|wikipedia|reddit/i.test(lower))
      return 5;
    if (/linkedin\.com\/in\//i.test(lower)) return 6;
    return 7;
  };

  /** From SERP hits, seed /contact and /terms on real company domains so we don't stop at chamber pages. */
  const seedCompanyContactPaths = (urls: string[]) => {
    const paths = [
      "/contact", "/contact-us", "/contactus", "/get-in-touch", "/connect",
      "/pages/contact", "/company/contact", "/about/contact", "/sales-contact-form",
      "/contact-page", "/terms-and-conditions", "/terms", "/about", "/about-us",
      "/about-us/leadership", "/leadership", "/our-leadership", "/company/leadership",
      "/corporate-locations", "/locations", "/our-locations", "/company/locations",
      "/dealer", "/dealers", "/team", "/our-team", "/people",
      "/blog", "/news", "/about-us/history", "/history", "/our-story",
    ];
    for (const u of urls) {
      if (isAggregatorHost(u)) continue;
      try {
        const parsed = new URL(u);
        if (!/\.(com|org|io|co|net|us)$/i.test(parsed.hostname)) continue;
        if (/linkedin|facebook|twitter|youtube|wikipedia|sec\.gov/i.test(parsed.hostname)) continue;
        const coToken = input.companyName
          ? input.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 8)
          : "";
        const hostFlat = parsed.hostname.replace(/[^a-z0-9]/g, "");
        // Prefer domains that look like the company; also seed any non-aggregator corporate host
        if (coToken && !hostFlat.includes(coToken.slice(0, 5)) && !hostFlat.includes(coToken.slice(0, 4))) {
          // still seed if path already contact-like
          if (!/\/(contact|terms|about)/i.test(parsed.pathname)) continue;
        }
        for (const p of paths) {
          const seeded = `${parsed.protocol}//${parsed.hostname}${p}`;
          if (!candidateUrls.includes(seeded)) candidateUrls.push(seeded);
        }
      } catch {
        /* skip */
      }
    }
  };

  const forceVisitNext = async (stepLabel: string): Promise<boolean> => {
    const next = [...new Set(candidateUrls)]
      .filter((u) => !visitedUrls.has(u))
      .sort((a, b) => rankVisitUrl(a) - rankVisitUrl(b))[0];
    if (!next) return false;
    visits++;
    visitedUrls.add(next);
    history.push(`${stepLabel}: force_visit ${next}`);
    const page = await toolVisit(next);
    lastObservation = `PAGE ${next}\n\n${page.slice(0, MAX_OBS)}`;
    // Deterministic findings from CONTACT FACTS block so we never depend solely on LLM memory
    const extracted = findingsFromContactFacts(page, next, name, input.companyName);
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

  const emailMatchesCompany = (email: string): boolean => {
    // Delegate to shared alignment (brand mail domains like cmi79 on company pages)
    return isCompanyAlignedEmail(email, input.companyName, findings.find((f) => f.vectorType === "email" && f.value === email)?.sourceUrls?.[0]);
  };
  const hasOrgEmail = () =>
    findings.some((f) => {
      if (f.vectorType !== "email") return false;
      if (!input.companyName) return true;
      const src = (f.sourceUrls || [])[0];
      return isCompanyAlignedEmail(f.value, input.companyName, src);
    });
  const hasOrgPhone = () => findings.some((f) => f.vectorType === "phone");
  const hasOrgEmailOrPhone = () => hasOrgEmail() || hasOrgPhone();
  const hasRelatedPerson = () =>
    findings.some(
      (f) =>
        f.personName
        && f.personName.toLowerCase() !== name.toLowerCase()
        && f.personName.trim().split(/\s+/).length >= 2
        // Any named person distinct from the target counts (Owner/President/CEO/etc.)
        // Previous gate required note~"related" or role==related_contact and missed BBB principals.
    );
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

  let relatedPeopleSearchDone = false;
  let ownershipSearchDone = false;
  let orgEmailSearchDone = false;

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

    // If company is locked but no company-host URL is queued yet, search the company surface
    // before visiting partner/blog SERP hits (prevents Team-Financial-style first visits).
    if (i >= FREE_REACT_STEPS && 
      searches >= 1
      && visits === 0
      && input.companyName
      && !candidateUrls.some((u) => {
        const co = input.companyName!.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 8);
        return co.length >= 4 && u.toLowerCase().replace(/[^a-z0-9]/g, "").includes(co.slice(0, 5));
      })
      && i < maxIter - 1
      && !history.some((h) => h.includes("force_company_surface_search"))
    ) {
      const co = input.companyName;
      const q = `"${co}" (contact OR "contact us" OR phone OR address OR website) -zoominfo -rocketreach`;
      searches++;
      history.push(`step${i + 1}: force_company_surface_search ${q}`);
      const sr = await toolWebSearch(q);
      for (const u of sr.urls) {
        if (/^https?:\/\//i.test(u) && !candidateUrls.includes(u)) candidateUrls.push(u);
      }
      seedCompanyContactPaths(sr.urls);
      const snippetEmails = findingsFromSearchSnippet(sr.text, sr.urls, input.companyName || name);
      if (snippetEmails.length) {
        findings = mergeFindings(findings, snippetEmails);
        history.push(`step${i + 1}: serp_email_findings=${snippetEmails.length}`);
      }
      lastObservation =
        `COMPANY SURFACE search:\nURLs: ${sr.urls.slice(0, 8).join(" | ")}\n\n${sr.text.slice(0, MAX_OBS)}`;
      continue;
    }
    // Force-visit as soon as we have SERP URLs and zero visits (parity with general agents).
    // Prefer high-rank contact/about/terms pages; do not wait for a second search.
    if (searches >= 1 && visits === 0 && candidateUrls.length > 0) {
      await forceVisitNext(`step${i + 1}`);
      continue;
    }
    // Keep opening high-rank company pages until we have org email/phone or no URLs left
    if (
      visits >= 1
      && searches >= 1
      && !hasOrgEmailOrPhone()
      && candidateUrls.some((u) => !visitedUrls.has(u) && rankVisitUrl(u) <= 3)
      && i < maxIter - 1
    ) {
      const forced = await forceVisitNext(`step${i + 1}`);
      if (forced) continue;
    }
    // Phones without org email is a common mid-market gap vs general agents.
    // Force an email-focused SERP + re-seed contact paths once.
    if (
      (hasOrgPhone() || hasOrgEmailOrPhone() || visits >= 1)
      && !hasOrgEmail()
      && i >= FREE_REACT_STEPS
      && !orgEmailSearchDone
      && i < maxIter - 2
    ) {
      orgEmailSearchDone = true;
      const co = input.companyName || name;
      const q = `"${co}" ("info@" OR "contact@" OR email OR mailto) (contact OR facebook OR "contact us") -zoominfo -rocketreach`;
      searches++;
      history.push(`step${i + 1}: force_org_email_search ${q}`);
      const sr = await toolWebSearch(q);
      for (const u of sr.urls) {
        if (!candidateUrls.includes(u)) candidateUrls.push(u);
      }
      seedCompanyContactPaths(sr.urls.length ? sr.urls : candidateUrls);
      const snippetEmails = findingsFromSearchSnippet(sr.text, sr.urls, input.companyName || name);
      if (snippetEmails.length) {
        findings = mergeFindings(findings, snippetEmails);
        history.push(`step${i + 1}: serp_email_findings=${snippetEmails.length}`);
      }
      lastObservation =
        `SEARCH results for org email: ${q}\nURLs: ${sr.urls.slice(0, 8).join(" | ")}\n\n${sr.text.slice(0, MAX_OBS)}\n\n` +
        `NEXT: visit company /contact /contact-us pages. Emit EMAIL findings (info@, contact@) with exact sourceUrl. Do not invent.`;
      // Prefer Facebook company page when present (common host for info@ on SMBs)
      const fbFirst = [...new Set(candidateUrls)]
        .filter((u) => !visitedUrls.has(u) && /facebook\.com\//i.test(u))
        .sort((a, b) => rankVisitUrl(a) - rankVisitUrl(b))[0];
      if (fbFirst) {
        const idx = candidateUrls.indexOf(fbFirst);
        if (idx > 0) {
          candidateUrls.splice(idx, 1);
          candidateUrls.unshift(fbFirst);
        }
        history.push(`step${i + 1}: prioritize_facebook_org ${fbFirst}`);
      }
      // Prefer an unvisited contact path immediately
      const contactFirst = [...new Set(candidateUrls)]
        .filter((u) => !visitedUrls.has(u) && /\/(contact|get-in-touch|connect)/i.test(u))
        .sort((a, b) => rankVisitUrl(a) - rankVisitUrl(b))[0];
      if (contactFirst) {
        const idx = candidateUrls.indexOf(contactFirst);
        if (idx > 0) {
          candidateUrls.splice(idx, 1);
          candidateUrls.unshift(contactFirst);
        }
      }
      continue;
    }
    // Still missing email: keep force-visiting contact-ranked pages
    if (
      hasOrgPhone()
      && !hasOrgEmail()
      && orgEmailSearchDone
      && candidateUrls.some((u) => !visitedUrls.has(u) && rankVisitUrl(u) <= 2)
      && i < maxIter - 1
    ) {
      const forced = await forceVisitNext(`step${i + 1}`);
      if (forced) continue;
    }
    // Mid-market gap: Facebook About often lists info@ when the corporate /contact page does not.
    // Fail-closed: only admit emails that appear in SERP snippet text (never invent mailboxes).
    if (i >= FREE_REACT_STEPS && 
      input.companyName
      && !hasOrgEmail()
      && orgEmailSearchDone
      && !history.some((h) => h.includes("force_facebook_company_search"))
      && i < maxIter - 2
    ) {
      const co = input.companyName;
      const q = `"${co}" site:facebook.com (info@ OR contact@ OR email OR about OR "contact")`;
      searches++;
      history.push(`step${i + 1}: force_facebook_company_search ${q}`);
      const sr = await toolWebSearch(q);
      for (const u of sr.urls) {
        if (/^https?:\/\//i.test(u) && !candidateUrls.includes(u)) candidateUrls.push(u);
      }
      const snippetEmails = findingsFromSearchSnippet(sr.text, sr.urls, input.companyName || name);
      if (snippetEmails.length) {
        findings = mergeFindings(findings, snippetEmails);
        history.push(`step${i + 1}: serp_email_findings=${snippetEmails.length}`);
      }
      const fbFirst = [...new Set(candidateUrls)]
        .filter((u) => !visitedUrls.has(u) && /facebook\.com\//i.test(u))
        .sort((a, b) => rankVisitUrl(a) - rankVisitUrl(b))[0];
      if (fbFirst) {
        const idx = candidateUrls.indexOf(fbFirst);
        if (idx > 0) {
          candidateUrls.splice(idx, 1);
          candidateUrls.unshift(fbFirst);
        }
        history.push(`step${i + 1}: prioritize_facebook_org ${fbFirst}`);
      }
      lastObservation =
        `FACEBOOK company search:\nURLs: ${sr.urls.slice(0, 6).join(" | ")}\n\n${sr.text.slice(0, MAX_OBS)}\n\n` +
        `NEXT: visit Facebook/About or company /contact. Emit EMAIL only if visible with exact sourceUrl.`;
      continue;
    }
    // When website domain is known but org email still missing, search exact quoted mailboxes.
    // Admit ONLY if the address appears in SERP text (fail-closed — no synthetic info@).
    if (i >= FREE_REACT_STEPS && 
      !hasOrgEmail()
      && findings.some((f) => f.vectorType === "website")
      && !history.some((h) => h.includes("force_domain_mailbox_search"))
      && i < maxIter - 1
    ) {
      const site = findings.find((f) => f.vectorType === "website")?.value || "";
      let domain = "";
      try {
        domain = new URL(site.startsWith("http") ? site : `https://${site}`).hostname.replace(/^www\./, "");
      } catch { /* */ }
      if (domain && domain.includes(".")) {
        const q = `"info@${domain}" OR "contact@${domain}" OR "sales@${domain}"`;
        searches++;
        history.push(`step${i + 1}: force_domain_mailbox_search ${q}`);
        const sr = await toolWebSearch(q);
        for (const u of sr.urls) {
          if (/^https?:\/\//i.test(u) && !candidateUrls.includes(u)) candidateUrls.push(u);
        }
        const snippetEmails = findingsFromSearchSnippet(
          sr.text,
          sr.urls.length ? sr.urls : [`https://${domain}`],
          input.companyName || name,
        );
        if (snippetEmails.length) {
          findings = mergeFindings(findings, snippetEmails);
          history.push(`step${i + 1}: serp_email_findings=${snippetEmails.length}`);
        }
        seedCompanyContactPaths(sr.urls.length ? sr.urls : [`https://${domain}`]);
        lastObservation =
          `DOMAIN MAILBOX search:\n${q}\nURLs: ${sr.urls.slice(0, 8).join(" | ")}\n\n${sr.text.slice(0, MAX_OBS)}\n\n` +
          `NEXT: visit company contact pages. Emit EMAIL only if visible in observation with sourceUrl.`;
        await forceVisitNext(`step${i + 1}`);
        continue;
      }
    }
    // After primary surface: force a related-people SERP hop (BBB / officers) once
    if (
      hasOrgEmailOrPhone()
      && i >= FREE_REACT_STEPS
      && !relatedPeopleSearchDone
      && i < maxIter - 2
    ) {
      relatedPeopleSearchDone = true;
      const co = input.companyName || name;
      // Prefer company /dealer /team pages (BBB is often Cloudflare-blocked to plain fetch)
      const q = `"${co}" (BBB OR owner OR "co-owner" OR "co-founder" OR partner OR officers OR "principal contact" OR leadership OR succession OR "family-owned" OR "executive chairman" OR "company contact" OR dealer OR president OR OpenCorporates OR "companies house" OR EDGAR) -zoominfo -rocketreach`;
      searches++;
      history.push(`step${i + 1}: force_related_search ${q}`);
      const sr = await toolWebSearch(q);
      for (const u of sr.urls) {
        if (/^https?:\/\//i.test(u) && !candidateUrls.includes(u)) candidateUrls.push(u);
      }
      const peopleHits = findingsFromPeopleSnippet(sr.text, sr.urls, input.companyName || name);
      if (peopleHits.length) {
        findings = mergeFindings(findings, peopleHits);
        history.push(`step${i + 1}: serp_people_findings=${peopleHits.length}`);
      }
      // Prefer BBB profile visit (principals live there); browser-escalate handles CF.
      const bbbFirst = [...new Set(sr.urls)]
        .filter((u) => !visitedUrls.has(u) && /bbb\.org\//i.test(u))
        .sort((a, b) => rankVisitUrl(a) - rankVisitUrl(b))[0];
      if (bbbFirst) {
        const idx = candidateUrls.indexOf(bbbFirst);
        if (idx >= 0) candidateUrls.splice(idx, 1);
        candidateUrls.unshift(bbbFirst);
        history.push(`step${i + 1}: prioritize_bbb ${bbbFirst}`);
      }
      seedCompanyContactPaths(sr.urls);
      // Always queue company dealer/team paths when domain known from findings
      for (const f of findings) {
        if (f.vectorType === "website" && /^https?:\/\//i.test(f.value)) {
          try {
            const host = new URL(f.value).hostname;
            for (const p of ["/dealer", "/dealers", "/team", "/about", "/about-us", "/about-us/leadership", "/leadership", "/our-leadership"]) {
              const seeded = `https://${host}${p}`;
              if (!candidateUrls.includes(seeded)) candidateUrls.push(seeded);
            }
          } catch { /* skip */ }
        }
      }
      lastObservation =
        `SEARCH results for related people: ${q}\nURLs: ${sr.urls.slice(0, 8).join(" | ")}\n\n${sr.text.slice(0, MAX_OBS)}\n\n` +
        `NEXT: visit BBB profile (browser escalate if CF) and company /dealer /team pages. Emit PERSON findings with personName+role. Do not invent names.`;
      continue;
    }

    // Ownership / founder / acquisition hop — Atlas goal is contacts that lead to controlling people
    if (
      relatedPeopleSearchDone
      && i >= FREE_REACT_STEPS
      && !ownershipSearchDone
      && i < maxIter - 2
    ) {
      ownershipSearchDone = true;
      const co = input.companyName || name;
      const q = `"${co}" (founder OR "founded by" OR acquired OR "sold to" OR "family-owned" OR "family run" OR owner OR "economic interest" OR "board of directors") -zoominfo -rocketreach`;
      searches++;
      history.push(`step${i + 1}: force_ownership_search ${q}`);
      const sr = await toolWebSearch(q);
      for (const u of sr.urls) {
        if (/^https?:\/\//i.test(u) && !candidateUrls.includes(u)) candidateUrls.push(u);
      }
      // Prioritize PDFs and acquisition/news pages on company-aligned hosts
      const pdfFirst = [...new Set(sr.urls)]
        .filter((u) => !visitedUrls.has(u) && /\.pdf(\?|$)/i.test(u))
        .sort((a, b) => rankVisitUrl(a) - rankVisitUrl(b))[0];
      if (pdfFirst) {
        const idx = candidateUrls.indexOf(pdfFirst);
        if (idx >= 0) candidateUrls.splice(idx, 1);
        candidateUrls.unshift(pdfFirst);
        history.push(`step${i + 1}: prioritize_pdf ${pdfFirst}`);
      }
      const peopleHits = findingsFromPeopleSnippet(sr.text, sr.urls, input.companyName || name);
      if (peopleHits.length) {
        findings = mergeFindings(findings, peopleHits);
        history.push(`step${i + 1}: ownership_people_findings=${peopleHits.length}`);
      }
      const snippetEmails = findingsFromSearchSnippet(sr.text, sr.urls, input.companyName || name);
      if (snippetEmails.length) {
        findings = mergeFindings(findings, snippetEmails);
        history.push(`step${i + 1}: ownership_serp_emails=${snippetEmails.length}`);
      }
      lastObservation =
        `OWNERSHIP / FOUNDER search: ${q}\nURLs: ${sr.urls.slice(0, 8).join(" | ")}\n\n${sr.text.slice(0, MAX_OBS)}\n\n` +
        `NEXT: visit founder/acquisition pages and any company PDF contact sheets. Emit PERSON+role and named emails with sourceUrls.`;
      await forceVisitNext(`step${i + 1}`);
      continue;
    }

    // Current CEO / President hop — founders already on ledger must NOT skip sitting executives
    if (i >= FREE_REACT_STEPS && 
      (relatedPeopleSearchDone || ownershipSearchDone)
      && !history.some((h) => h.includes("force_current_exec_search"))
      && i < maxIter - 2
    ) {
      const co = input.companyName || name;
      const q = `"${co}" ("CEO" OR "chief executive" OR president OR appointed) (CEO OR president) -zoominfo -rocketreach`;
      searches++;
      history.push(`step${i + 1}: force_current_exec_search ${q}`);
      const sr = await toolWebSearch(q);
      for (const u of sr.urls) {
        if (/^https?:\/\//i.test(u) && !candidateUrls.includes(u)) candidateUrls.push(u);
      }
      const peopleHits = findingsFromPeopleSnippet(sr.text, sr.urls, input.companyName || name);
      if (peopleHits.length) {
        findings = mergeFindings(findings, peopleHits);
        history.push(`step${i + 1}: exec_people_findings=${peopleHits.length}`);
      }
      const snippetEmails = findingsFromSearchSnippet(sr.text, sr.urls, input.companyName || name);
      if (snippetEmails.length) {
        findings = mergeFindings(findings, snippetEmails);
        history.push(`step${i + 1}: exec_serp_emails=${snippetEmails.length}`);
      }
      const execUrl = [...new Set(sr.urls)]
        .filter((u) => !visitedUrls.has(u) && /(ceo|president|appoint|leadership|management|about)/i.test(u))
        .sort((a, b) => rankVisitUrl(a) - rankVisitUrl(b))[0];
      if (execUrl) {
        const idx = candidateUrls.indexOf(execUrl);
        if (idx >= 0) candidateUrls.splice(idx, 1);
        candidateUrls.unshift(execUrl);
        history.push(`step${i + 1}: prioritize_exec_page ${execUrl}`);
      }
      lastObservation =
        `CURRENT EXEC search: ${q}\nURLs: ${sr.urls.slice(0, 8).join(" | ")}\n\n${sr.text.slice(0, MAX_OBS)}\n\n` +
        `NEXT: visit CEO/president appointment or leadership pages. Emit PERSON+role for current executives with sourceUrls.`;
      await forceVisitNext(`step${i + 1}`);
      continue;
    }

    // Prefer BBB when anti-bot fetch is configured (Scrapfly/ZenRows) — Principal Contacts live there
    if (
      relatedPeopleSearchDone
      && !hasRelatedPerson()
      && candidateUrls.some((u) => !visitedUrls.has(u) && /bbb\.org/i.test(u))
      && i < maxIter - 1
    ) {
      const bbbFirst = [...new Set(candidateUrls)]
        .filter((u) => !visitedUrls.has(u) && /bbb\.org/i.test(u))[0];
      if (bbbFirst) {
        const idx = candidateUrls.indexOf(bbbFirst);
        if (idx > 0) {
          candidateUrls.splice(idx, 1);
          candidateUrls.unshift(bbbFirst);
        }
      }
      const forced = await forceVisitNext(`step${i + 1}`);
      if (forced) continue;
    }
    // Registry footprint hop (OpenCorporates / EDGAR / BBB) once after related search
    if (i >= FREE_REACT_STEPS && 
      relatedPeopleSearchDone
      && !(findings.some((f) => (f.sourceUrls || []).some((u) => /opencorporates|sec\.gov|bbb\.org|companieshouse/i.test(u))))
      && i < maxIter - 2
      && !history.some((h) => h.includes("force_registry_search"))
    ) {
      const co = input.companyName || name;
      const q = `"${co}" (site:opencorporates.com OR site:sec.gov OR site:bbb.org OR "companies house" OR GLEIF)`;
      searches++;
      history.push(`step${i + 1}: force_registry_search ${q}`);
      const sr = await toolWebSearch(q);
      for (const u of sr.urls) {
        if (/^https?:\/\//i.test(u) && !candidateUrls.includes(u)) candidateUrls.push(u);
      }
      const snippetEmails = findingsFromSearchSnippet(sr.text, sr.urls, input.companyName || name);
      if (snippetEmails.length) {
        findings = mergeFindings(findings, snippetEmails);
        history.push(`step${i + 1}: serp_email_findings=${snippetEmails.length}`);
      }
      lastObservation =
        `REGISTRY / BBB search:\nURLs: ${sr.urls.slice(0, 8).join(" | ")}\n\n${sr.text.slice(0, MAX_OBS)}\n\n` +
        `Visit registry or BBB pages for officers and legal name. Do not invent IDs.`;
      continue;
    }
    // Prefer /dealer /team pages after related search
    if (
      relatedPeopleSearchDone
      && !hasRelatedPerson()
      && candidateUrls.some((u) => !visitedUrls.has(u) && /\/(dealer|dealers|team|about|about-us)/i.test(u))
      && i < maxIter - 1
    ) {
      const dealerFirst = [...new Set(candidateUrls)]
        .filter((u) => !visitedUrls.has(u) && /\/(dealer|dealers|team|about|about-us)/i.test(u))
        .sort((a, b) => rankVisitUrl(a) - rankVisitUrl(b))[0];
      if (dealerFirst) {
        // Temporarily prioritize by visiting this URL via forceVisitNext stack:
        // push to front by ranking — forceVisitNext already sorts by rank; boost dealer hosts
        const idx = candidateUrls.indexOf(dealerFirst);
        if (idx > 0) {
          candidateUrls.splice(idx, 1);
          candidateUrls.unshift(dealerFirst);
        }
      }
      const forced = await forceVisitNext(`step${i + 1}`);
      if (forced) continue;
    }
    // Visit remaining high-rank pages after related search
    if (
      relatedPeopleSearchDone
      && !hasRelatedPerson()
      && candidateUrls.some((u) => !visitedUrls.has(u) && (/bbb\.org|about|team|people|leadership|dealer/i.test(u) || rankVisitUrl(u) <= 4))
      && i < maxIter - 1
    ) {
      const forced = await forceVisitNext(`step${i + 1}`);
      if (forced) continue;
    }
    // After a visit still zero findings and unused URLs remain, force one more high-rank page
    if (visits >= 1 && findings.length === 0 && searches >= 1 && i < maxIter - 1) {
      const forced = await forceVisitNext(`step${i + 1}`);
      if (forced) continue;
    }

    const prompt = buildStepPrompt({
      targetName: name,
      companyName: input.companyName,
      objective,
      history,
      lastObservation,
    });
    const llm = await llmStep(prompt);
    if (!llm) {
      return {
        status: i === 0 ? "unavailable" : "completed",
        model: modelUsed,
        iterations: i,
        searches,
        visits,
        findings,
        trajectory: history,
        error: i === 0 ? "No Gemini/Groq key available for agentic loop" : undefined,
      };
    }
    modelUsed = llm.model;
    const action = parseAction(llm.raw);
    if (!action) {
      history.push(`step${i + 1}: parse_fail`);
      lastObservation = "Invalid JSON. Reply with a valid action object.";
      continue;
    }

    if (action.action === "web_search") {
      searches++;
      history.push(`step${i + 1}: search ${action.query}${action.thought ? ` (${action.thought.slice(0, 80)})` : ""}`);
      const sr = await toolWebSearch(action.query);
      for (const u of sr.urls) {
        if (/^https?:\/\//i.test(u) && !candidateUrls.includes(u)) candidateUrls.push(u);
      }
      // Seed /contact /terms on company domains so force-visit does not stop at chamber directories
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
          `\n\nNEXT: Prefer action=visit on the COMPANY domain contact/terms/about page — not chamber, ZoomInfo, or directory pages. ` +
          `Do not only search again.`;
      }
      continue;
    }

    if (action.action === "visit") {
      visits++;
      visitedUrls.add(action.url);
      history.push(`step${i + 1}: visit ${action.url}`);
      const page = await toolVisit(action.url);
      lastObservation = `PAGE ${action.url}\n\n${page.slice(0, MAX_OBS)}`;
      const extracted = findingsFromContactFacts(page, action.url, name, input.companyName);
      if (extracted.length) {
        findings = mergeFindings(findings, extracted);
        history.push(`step${i + 1}: auto_findings=${extracted.length}`);
        lastObservation += `\n\n(System extracted ${extracted.length} contact fact(s) from this page — include them in done.findings with this URL as sourceUrl.)`;
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

    // done — reject empty early exits so we never finish with searches=0
    const minSearches = 2;
    if (searches < minSearches && action.findings.length === 0 && i < maxIter - 1) {
      history.push(`step${i + 1}: done_rejected (need >=${minSearches} searches before empty done; have ${searches})`);
      lastObservation =
        `You returned done with zero findings after only ${searches} search(es). ` +
        `You MUST run web_search on the exact TARGET${input.companyName ? ` + "${input.companyName}"` : ""} first. ` +
        `Invent a precise query now (person + company + city/state or EDGAR/phone/address).`;
      continue;
    }
    // Reject empty done when we never visited but still have SERP URLs to open
    if (action.findings.length === 0 && findings.length === 0 && visits === 0 && candidateUrls.length > 0 && i < maxIter - 1) {
      history.push(`step${i + 1}: done_rejected (need visit before empty done; ${candidateUrls.length} URLs queued)`);
      await forceVisitNext(`step${i + 1}`);
      continue;
    }
    // Reject done if about/contact still queued and primary surface incomplete (Grok would open them)
    if (
      action.action === "done"
      && i < maxIter - 2
      && candidateUrls.some((u) => !visitedUrls.has(u) && /\/(about|contact|leadership|team|corporate-locations)/i.test(u) && rankVisitUrl(u) <= 3)
      && (!hasOrgEmail() || !hasRelatedPerson())
    ) {
      history.push(`step${i + 1}: done_rejected (about/contact still queued)`);
      await forceVisitNext(`step${i + 1}`);
      continue;
    }
    // Reject done until company-domain org email search attempted (when company locked)
    if (
      input.companyName
      && !hasOrgEmail()
      && i >= FREE_REACT_STEPS
      && !orgEmailSearchDone
      && visits >= 1
      && i < maxIter - 2
    ) {
      history.push(`step${i + 1}: done_rejected (org-email hop required)`);
      // fall through to force_org_email block on next loop by not setting done
      orgEmailSearchDone = false;
      lastObservation =
        `Need company-domain org email (info@/contact@) for ${input.companyName}. Search and visit contact/Facebook pages before done.`;
      continue;
    }
    // Reject done before related-people hop when primary surface already found
    if (
      hasOrgEmailOrPhone()
      && i >= FREE_REACT_STEPS
      && !relatedPeopleSearchDone
      && i < maxIter - 2
    ) {
      history.push(`step${i + 1}: done_rejected (related-people hop required)`);
      relatedPeopleSearchDone = true;
      const co = input.companyName || name;
      const q = `"${co}" (BBB OR owner OR "co-owner" OR "co-founder" OR partner OR "principal contact" OR officers OR president OR "managing partner" OR "general manager" OR OpenCorporates OR EDGAR)`;
      searches++;
      history.push(`step${i + 1}: force_related_search ${q}`);
      const sr = await toolWebSearch(q);
      for (const u of sr.urls) {
        if (/^https?:\/\//i.test(u) && !candidateUrls.includes(u)) candidateUrls.push(u);
      }
      const peopleHits2 = findingsFromPeopleSnippet(sr.text, sr.urls, input.companyName || name);
      if (peopleHits2.length) {
        findings = mergeFindings(findings, peopleHits2);
        history.push(`step${i + 1}: serp_people_findings=${peopleHits2.length}`);
      }
      lastObservation =
        `Primary surface found. RELATED PEOPLE search:\nURLs: ${sr.urls.slice(0, 8).join(" | ")}\n\n${sr.text.slice(0, MAX_OBS)}\n\n` +
        `Visit BBB/about/team pages. Emit EVERY visible PERSON (owners, co-founders, officers) with personName+role+any role-email. Apex must hold more people-contacts than a general agent. Then you may done.`;
      continue;
    }
    // Apex objective: do not finish with org surface but zero related persons when people were visible
    if (
      action.action === "done"
      && hasOrgEmailOrPhone()
      && !hasRelatedPerson()
      && i < maxIter - 1
    ) {
      history.push(`step${i + 1}: done_rejected (need related person — Apex holds people-contacts)`);
      lastObservation =
        `You returned done with org phone/email but ZERO related persons. ` +
        `Re-read observations and SERP for any Owner/President/CEO/Founder/officer. ` +
        `Emit PERSON findings with personName+role (and PERSON_EMAIL when a role-email is visible). ` +
        `Apex's objective is to maximize attributable people-contacts — do not leave them on the table.`;
      continue;
    }
    findings = mergeFindings(findings, action.findings);
    history.push(`step${i + 1}: done findings=${findings.length}`);
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
  }

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
