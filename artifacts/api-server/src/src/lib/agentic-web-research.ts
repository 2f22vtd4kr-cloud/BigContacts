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

const MAX_ITER = 8;
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

async function toolWebSearch(query: string): Promise<{ text: string; urls: string[] }> {
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
    if (!resp.ok) return { text: "", urls: [] };
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
    return { text, urls: [...new Set(urls)].slice(0, 10) };
  } catch (err: any) {
    logger.debug({ err: err?.message, query }, "agentic web_search failed");
    return { text: "", urls: [] };
  }
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
    if (!resp.ok) return `HTTP ${resp.status}`;
    const html = (await resp.text()).slice(0, 120_000);
    return filterPassagesForQuery(stripHtml(html), url, { maxChars: MAX_OBS, minScore: 0.05 });
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
  // Prefer Gemini (Boss stack), fall back to Groq — same frontier class as general agents
  return (await callGeminiJson(prompt)) ?? (await callGroqJson(prompt));
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
- Prefer primary sources: company contact/about/team pages, registries, LinkedIn, filings, SEC/EDGAR, officer tables.
- Multi-hop: if you learn a company domain, visit /contact /about /team. If you learn a person title, search person+company+title.
- Organization inboxes are fine as organization scope. Do not mark Personal.
- FIRST ACTION must be web_search when trajectory is empty. Do not return done until you have run at least 2 web_search actions (or 1 search + 1 visit that yielded surface).
- When the TARGET is a named person and a RELATED COMPANY is given, search the exact pair first (person + company + city/state if known) before any broad discovery.
- When you have useful public surface OR 2+ real search attempts with nothing, action=done.

TRAJECTORY SO FAR:
${input.history.join("\n") || "(start)"}

LAST OBSERVATION:
${input.lastObservation.slice(0, MAX_OBS) || "(none — start with web_search on the exact TARGET + company)"}

Return ONE JSON object only.`;
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

  const history: string[] = [];
  let lastObservation = "Begin. Choose an initial web_search query — do not wait for instructions.";
  let modelUsed = "none";
  let searches = 0;
  let visits = 0;
  let findings: AgenticFinding[] = [];

  for (let i = 0; i < maxIter; i++) {
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
      lastObservation = `SEARCH results for: ${action.query}\nURLs: ${sr.urls.slice(0, 8).join(" | ")}\n\n${sr.text.slice(0, MAX_OBS)}`;
      continue;
    }

    if (action.action === "visit") {
      visits++;
      history.push(`step${i + 1}: visit ${action.url}`);
      const page = await toolVisit(action.url);
      lastObservation = `PAGE ${action.url}\n\n${page.slice(0, MAX_OBS)}`;
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
    findings = action.findings;
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
