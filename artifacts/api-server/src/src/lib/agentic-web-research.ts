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
  status: "completed" | "unavailable" | "error";
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

const MAX_ITER = 12;
const MAX_OBS = 3_500;

function randomUA(): string {
  const uas = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  ];
  return uas[Math.floor(Math.random() * uas.length)]!;
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
  for (const m of html.matchAll(/\b([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/gi)) {
    const addr = m[1]!.toLowerCase();
    if (!/example\.|sentry\.|schema\.|wixpress|cloudflare|wordpress|github\.com|google\.com/.test(addr)) {
      push(`EMAIL: ${addr}`);
    }
  }
  // Obfuscated org inboxes common on WordPress/SMB sites: info [at] domain.com
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
  // US-centric phone patterns common on company contact pages
  for (const m of html.matchAll(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g)) {
    push(`PHONE: ${m[0]!.replace(/\s+/g, " ").trim()}`);
  }
  // Street-ish address lines — require real street type tokens (blocks CSS class noise)
  for (const m of html.matchAll(
    /\b\d{1,5}\s+[A-Za-z0-9.'\-]+(?:\s+[A-Za-z0-9.'\-]+){0,4}\s+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Drive|Dr\.?|Boulevard|Blvd\.?|Lane|Ln\.?|Court|Ct\.?|Way|Highway|Hwy\.?|HWY)\b[^<\n]{0,40}/gi,
  )) {
    const line = m[0]!.replace(/\s+/g, " ").trim().slice(0, 120);
    if (!/\bast-|\buagb-|\bwp-|\brmp-|[{};]/.test(line)) push(`ADDRESS: ${line}`);
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
    /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\s*[,–—-]\s*((?:Owner|President|CEO|Director|Principal Contact|Company Contact)[^<\n,]{0,30})/g,
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

  if (facts.length === 0) return "";
  return "CONTACT FACTS (visible on page):\n" + facts.slice(0, 40).join("\n") + "\n\n";
}

async function toolVisit(url: string): Promise<string> {
  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
      headers: {
        "User-Agent": randomUA(),
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    let html = "";
    if (!resp.ok) {
      html = `HTTP ${resp.status}`;
    } else {
      // Read more of the page; WordPress/Astra themes dump 100k+ of CSS before contact blocks.
      html = (await resp.text()).slice(0, 500_000);
    }

    // Escalate only when blocked and a browser/scrape provider is configured (see docs/PLAYWRIGHT_FALLBACK.md)
    const { isChallengeHtml, browserFetchConfigured, browserFetchHtml } = await import("./browser-fetch");
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
  for (const key of keys) {
    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
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
      if (!resp.ok) continue;
      const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
      const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
      if (raw) return { model: "llama-3.3-70b-versatile", raw };
    } catch {
      continue;
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
  return `You are running an AGENTIC web research loop (like Grok Agent / Gemini AI Mode), NOT a fixed checklist.
You have the same cognitive ability as those agents. Invent creative multi-hop queries. Follow promising URLs. Pivot when results are thin.

TARGET: ${input.targetName}
${input.companyName ? `RELATED COMPANY / ISSUER: ${input.companyName}` : ""}
OBJECTIVE: ${input.objective}

TOOLS (choose exactly one per turn):
1) {"action":"web_search","query":"...","thought":"..."}  — search the live web; invent the query yourself
2) {"action":"visit","url":"https://...","thought":"..."} — open a specific page and read it
3) {"action":"done","findings":[{"vectorType":"email|phone|linkedin|website|social|other","value":"...","personName":null,"role":null,"scope":"organization|candidate","sourceUrls":["https://exact-page"],"note":"..."}],"thought":"..."}

RULES:
- Never invent emails, phones, or profiles. Only report values VISIBLE in observations with exact sourceUrls.
- Prefer primary sources: company contact/about/team/terms pages, BBB profiles, registries, LinkedIn, filings, SEC/EDGAR, officer tables.
- Multi-hop: if you learn a company domain, immediately visit /contact /contact-us /about /team (and root). If CONTACT FACTS appear, emit them as findings with that page as sourceUrl.
- AFTER org email/phone/address are known, do NOT stop. Search "{company} BBB" or "{company} owner officers contacts" and visit BBB/about pages to recover RELATED people (owners, company contacts, co-officers). Emit each as findings with personName + role.
- When CONTACT FACTS lists PERSON: lines, emit each as a finding (vectorType other, personName set, role set, sourceUrls set).
- Search "TARGET company EDGAR" or site:sec.gov for officer tables when public-company context appears.
- Organization inboxes (info@, contact@, office@) are fine as organization scope. Do not mark Personal.
- FIRST ACTION must be web_search when trajectory is empty. Do not return done until: (a) at least 2 web_search AND 1 visit, AND (b) either related people found OR a dedicated related-people search was attempted.
- After any web_search that returns URLs, NEXT action should usually be visit on company/contact/BBB/about — not another search.
- When TARGET is a named person + RELATED COMPANY, search the exact pair first.
- Recover role history when visible. Never invent names.
- When CONTACT FACTS appear, include them in done.findings with that page as sourceUrl.
- Only action=done when public surface is recovered AND related-people hop was attempted (or SERP empty).

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
  try {
    if (pageUrl) {
      const host = new URL(pageUrl).hostname.replace(/^www\./, "").toLowerCase();
      const root = host.split(".").slice(-2).join(".");
      if (domain === host || domain === root || host.endsWith(domain)) return true;
    }
  } catch { /* ignore */ }
  if (companyName) {
    const token = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const domFlat = domain.replace(/[^a-z0-9]/g, "");
    if (token.length >= 4 && domFlat.includes(token.slice(0, Math.min(6, token.length)))) return true;
  }
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
    if (role && role.length >= 3 && !/[{};]|rmp-|style=|--columns|ast-/i.test(role)) {
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
    // Related officers / contacts (BBB, about, team, dealer)
    const person = line.match(/PERSON:\s*(.+)/i)?.[1]?.trim();
    if (person && person.length >= 5 && !/[{};]|ast-|uagb-/i.test(person)) {
      const [pName, pRole] = person.split(/\s*[—–-]\s*/).map((s) => s.trim());
      if (pName && pName.split(/\s+/).length >= 2) {
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
  }
  // Website finding for non-junk primary domains
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./, "");
    if (host && !/linkedin|facebook|twitter|sec\.gov|wikipedia|duckduckgo/i.test(host)) {
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
    const companyDomain =
      (co.length >= 4 && (domFlat.includes(co.slice(0, Math.min(8, co.length))) || co.includes(domFlat.slice(0, 6))))
      || /^(info|contact|sales|office|support|hello)@/i.test(email) && co.length >= 4 && domain.includes(co.slice(0, 4));
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
}): Promise<AgenticWebResearchResult> {
  const name = input.targetName.trim();
  if (name.length < 2) {
    return { status: "unavailable", model: "none", iterations: 0, searches: 0, visits: 0, findings: [], trajectory: [], error: "empty target" };
  }

  const maxIter = Math.min(input.maxIterations ?? MAX_ITER, 12);
  const objective = input.objective
    ?? `Find publicly documented contact routes (email, phone, LinkedIn, website, related people) for ${name}${input.companyName ? ` related to ${input.companyName}` : ""}. Be thorough and creative.`;

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

  const isAggregatorHost = (u: string): boolean =>
    /zoominfo|rocketreach|adapt\.io|signalhire|contactout|growjo|apollo\.io|clearbit|hunter\.io|mibarry|chamber|yelp|dnb\.com|bloomberg\.com\/profile|crunchbase|pitchbook|linkedin\.com\/company/i.test(
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
    // Primary company contact/terms pages first (where org email/phone actually live)
    if (hostMatch && /\/(contact|terms|about|team|people|leadership|privacy|impressum|dealer)/i.test(lower)) return 0;
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
      "/dealer", "/dealers", "/team", "/our-team", "/leadership", "/people",
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
    return true;
  };

  const emailMatchesCompany = (email: string): boolean => {
    const domain = (email.split("@")[1] || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!domain) return false;
    const co = (input.companyName || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (co.length >= 4 && domain.includes(co.slice(0, Math.min(8, co.length)))) return true;
    if (co.length >= 4 && co.includes(domain.slice(0, 6))) return true;
    return false;
  };
  const hasOrgEmail = () =>
    findings.some((f) => f.vectorType === "email" && (!input.companyName || emailMatchesCompany(f.value)));
  const hasOrgPhone = () => findings.some((f) => f.vectorType === "phone");
  const hasOrgEmailOrPhone = () => hasOrgEmail() || hasOrgPhone();
  const hasRelatedPerson = () =>
    findings.some(
      (f) =>
        f.personName
        && f.personName.toLowerCase() !== name.toLowerCase()
        && (f.note?.toLowerCase().includes("related") || f.role === "related_contact"),
    );
  let relatedPeopleSearchDone = false;
  let orgEmailSearchDone = false;

  for (let i = 0; i < maxIter; i++) {
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
    // After primary surface: force a related-people SERP hop (BBB / officers) once
    if (
      hasOrgEmailOrPhone()
      && !relatedPeopleSearchDone
      && !hasRelatedPerson()
      && i < maxIter - 2
    ) {
      relatedPeopleSearchDone = true;
      const co = input.companyName || name;
      // Prefer company /dealer /team pages (BBB is often Cloudflare-blocked to plain fetch)
      const q = `"${co}" (BBB OR owner OR "co-owner" OR "co-founder" OR partner OR officers OR "principal contact" OR "company contact" OR dealer OR president OR OpenCorporates OR "companies house" OR EDGAR) -zoominfo -rocketreach`;
      searches++;
      history.push(`step${i + 1}: force_related_search ${q}`);
      const sr = await toolWebSearch(q);
      for (const u of sr.urls) {
        if (/^https?:\/\//i.test(u) && !candidateUrls.includes(u)) candidateUrls.push(u);
      }
      seedCompanyContactPaths(sr.urls);
      // Always queue company dealer/team paths when domain known from findings
      for (const f of findings) {
        if (f.vectorType === "website" && /^https?:\/\//i.test(f.value)) {
          try {
            const host = new URL(f.value).hostname;
            for (const p of ["/dealer", "/dealers", "/team", "/about", "/about-us"]) {
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
    if (
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
    // Reject done until company-domain org email search attempted (when company locked)
    if (
      input.companyName
      && !hasOrgEmail()
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
    // Reject done before related-people hop when primary surface already found (Grok parity)
    if (
      hasOrgEmailOrPhone()
      && !relatedPeopleSearchDone
      && !hasRelatedPerson()
      && i < maxIter - 2
    ) {
      history.push(`step${i + 1}: done_rejected (related-people hop required)`);
      relatedPeopleSearchDone = true;
      const co = input.companyName || name;
      const q = `"${co}" (BBB OR owner OR "co-owner" OR "co-founder" OR partner OR "principal contact" OR officers OR president OR OpenCorporates OR EDGAR)`;
      searches++;
      history.push(`step${i + 1}: force_related_search ${q}`);
      const sr = await toolWebSearch(q);
      for (const u of sr.urls) {
        if (/^https?:\/\//i.test(u) && !candidateUrls.includes(u)) candidateUrls.push(u);
      }
      lastObservation =
        `Primary surface found. RELATED PEOPLE search:\nURLs: ${sr.urls.slice(0, 8).join(" | ")}\n\n${sr.text.slice(0, MAX_OBS)}\n\n` +
        `Visit BBB/about/team pages. Emit PERSON findings (owners, co-founders, officers) with personName+role. Then you may done.`;
      continue;
    }
    findings = mergeFindings(findings, action.findings);
    history.push(`step${i + 1}: done findings=${findings.length}`);
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
