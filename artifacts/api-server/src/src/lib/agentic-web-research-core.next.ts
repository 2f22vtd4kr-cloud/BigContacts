import { logger } from "./logger";
import { apexOrientationCompact } from "./apex-bureau-orientation";
import { withProviderScope } from "./provider-gate";
import { setAgenticLlmHealth, getAgenticLlmHealth } from "./agentic-llm-health";
import { recordAgenticLlmAttempt } from "./agentic-llm-telemetry";
import { GROQ_CHAT_MODELS } from "./groq-models";
import { filterClaimUrls, filterPassagesForQuery } from "./passage-filter";
import { sanitizePublicEmail, sanitizePublicPhone, isTrashContactValue } from "./contact-validation";

export { getAgenticLlmHealth };

/** The only LLMs permitted to execute Investigator turns. */
export const INVESTIGATOR_LLM_CAPABILITY_POOL = ["groq", "mistral"] as const;

export type AgenticFinding = {
  vectorType: "email" | "phone" | "linkedin" | "website" | "other" | "social";
  value: string;
  personName: string | null;
  role: string | null;
  scope: "organization" | "candidate" | "unknown";
  sourceUrls: string[];
  note: string;
  promotionDecision?: "promote" | "reject";
  promotionReason?: string;
};

export type AgenticWebResearchResult = {
  status: "completed" | "unavailable" | "error" | "timeout";
  model: string;
  iterations: number;
  searches: number;
  visits: number;
  findings: AgenticFinding[];
  /** Only findings explicitly authored by the Investigator in action=done. */
  modelFindings: AgenticFinding[];
  stopReason: "MODEL_DECIDED_DONE" | "ITERATION_BUDGET" | "HARD_TIMEOUT" | "CANCELLED" | "LLM_UNAVAILABLE" | "PARSE_FAILURE";
  trajectory: string[];
  error?: string;
};

type AgentAction =
  | { action: "web_search"; query: string; provider: "serper" | "tavily" | "exa"; thought?: string }
  | { action: "visit"; url: string; thought?: string }
  | { action: "footprint_email"; email: string; thought?: string }
  | { action: "footprint_username"; username: string; thought?: string }
  | { action: "domain_lookup"; domain: string; thought?: string }
  | { action: "registry_search"; query: string; registry: string; thought?: string }
  | { action: "harvest_domain"; domain: string; thought?: string }
  | { action: "browser_fetch"; url: string; thought?: string }
  | { action: "done"; findings: AgenticFinding[]; thought?: string };

const MAX_ITER = 40;
const MAX_OBS = 5_000;
const MAX_CONCURRENT_AGENTIC_PROVIDER_DECISIONS = Math.max(1, Number(process.env.APEX_AGENTIC_PROVIDER_CONCURRENCY || "1"));
const PROVIDER_DECISION_TIMEOUT_MS = Math.max(55_000, Number(process.env.AGENTIC_PROVIDER_DECISION_TIMEOUT_MS || "55000"));
let activeAgenticProviderDecisions = 0;
const providerWaiters: Array<() => void> = [];

async function acquireProviderSlot(): Promise<void> {
  if (activeAgenticProviderDecisions < MAX_CONCURRENT_AGENTIC_PROVIDER_DECISIONS) {
    activeAgenticProviderDecisions += 1;
    return;
  }
  await new Promise<void>((resolve) => providerWaiters.push(resolve));
  activeAgenticProviderDecisions += 1;
}

function releaseProviderSlot(): void {
  activeAgenticProviderDecisions = Math.max(0, activeAgenticProviderDecisions - 1);
  providerWaiters.shift()?.();
}

function cleanText(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isSafeHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function mergeFindings(existing: AgenticFinding[], incoming: AgenticFinding[]): AgenticFinding[] {
  const map = new Map<string, AgenticFinding>();
  const key = (f: AgenticFinding) => `${f.vectorType}|${f.value.toLowerCase()}`;
  for (const f of existing) map.set(key(f), f);
  for (const f of incoming) {
    const k = key(f);
    const previous = map.get(k);
    if (!previous) map.set(k, f);
    else map.set(k, { ...previous, sourceUrls: [...new Set([...(previous.sourceUrls || []), ...(f.sourceUrls || [])])] });
  }
  return [...map.values()];
}

/** Observation-only HTML extraction. It returns facts/provenance, never a person identity. */
function extractContactFactsFromHtml(html: string): string {
  const facts: string[] = [];
  for (const m of html.matchAll(/href=["']mailto:([^"'?\s]+)/gi)) facts.push(`EMAIL: ${m[1]!.toLowerCase()}`);
  for (const m of html.matchAll(/href=["']tel:([^"']+)/gi)) facts.push(`PHONE: ${m[1]!.trim()}`);
  for (const m of html.matchAll(/\b([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/gi)) facts.push(`EMAIL: ${m[1]!.toLowerCase()}`);
  return [...new Set(facts)].slice(0, 40).join("\n");
}

function findingsFromProxyPage(page: string, sourceUrl: string): string {
  const text = page.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!/(sec\.gov|edgar|proxy|def\s*14a|beneficial owner)/i.test(sourceUrl + " " + text.slice(0, 500))) return "";
  return `OBSERVED_FILING_CONTEXT source=${sourceUrl}\n${text.slice(0, 1200)}`;
}

function findingsFromContactFacts(page: string, sourceUrl: string): AgenticFinding[] {
  const out: AgenticFinding[] = [];
  const block = extractContactFactsFromHtml(page);
  for (const line of block.split("\n")) {
    const email = line.match(/^EMAIL:\s*(\S+)$/i)?.[1];
    if (email) {
      const value = sanitizePublicEmail(email);
      if (value && !isTrashContactValue("email", value)) out.push({ vectorType: "email", value, personName: null, role: null, scope: "organization", sourceUrls: [sourceUrl], note: "Observed public email on visited page" });
    }
    const phone = line.match(/^PHONE:\s*(.+)$/i)?.[1];
    if (phone) {
      const value = sanitizePublicPhone(phone);
      if (value && !isTrashContactValue("phone", value)) out.push({ vectorType: "phone", value, personName: null, role: null, scope: "organization", sourceUrls: [sourceUrl], note: "Observed public phone on visited page" });
    }
  }
  return out;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function webSearchSerper(query: string): Promise<{ text: string; urls: string[] } | null> {
  const key = [process.env.SERPER_API_KEY, process.env.SERPER_API_KEY_2, process.env.SERPER_API_KEY_3, process.env.SERPER_KEY].map((x) => (x || "").trim()).find(Boolean);
  if (!key) return null;
  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 10, gl: "us", hl: "en" }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;
    const data = await response.json() as { organic?: Array<{ title?: string; link?: string; snippet?: string }> };
    const urls = (data.organic || []).map((r) => r.link || "").filter(isSafeHttpUrl).slice(0, 10);
    const text = filterPassagesForQuery((data.organic || []).map((r) => `${r.title || ""}\nURL: ${r.link || ""}\n${r.snippet || ""}`).join("\n"), query, { maxChars: MAX_OBS });
    return { text, urls };
  } catch (error) {
    logger.debug({ error, query }, "agentic serper failed");
    return null;
  }
}

async function webSearchTavily(query: string): Promise<{ text: string; urls: string[] } | null> {
  const key = [process.env.TAVILY_API_KEY, ...Array.from({ length: 8 }, (_, i) => process.env[`TAVILY_API_KEY_${i + 1}`])].map((x) => (x || "").trim()).find(Boolean);
  if (!key) return null;
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, search_depth: "advanced", include_answer: true, max_results: 8, include_raw_content: false }),
      signal: AbortSignal.timeout(18_000),
    });
    if (!response.ok) return null;
    const data = await response.json() as { answer?: string; results?: Array<{ title?: string; url?: string; content?: string }> };
    const urls = (data.results || []).map((r) => r.url || "").filter(isSafeHttpUrl).slice(0, 10);
    const text = filterPassagesForQuery([data.answer || "", ...(data.results || []).map((r) => `${r.title || ""}\nURL: ${r.url || ""}\n${r.content || ""}`)].join("\n"), query, { maxChars: MAX_OBS });
    return { text, urls };
  } catch (error) {
    logger.debug({ error, query }, "agentic tavily failed");
    return null;
  }
}

async function webSearchExa(query: string): Promise<{ text: string; urls: string[] } | null> {
  const key = [process.env.EXA_API_KEY, process.env.EXA_1, process.env.EXA_2, ...Array.from({ length: 8 }, (_, i) => process.env[`EXA_API_KEY_${i + 1}`])].map((x) => (x || "").trim()).find(Boolean);
  if (!key) return null;
  try {
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "x-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ query, type: "auto", numResults: 8, contents: { text: { maxCharacters: 1600 } } }),
      signal: AbortSignal.timeout(18_000),
    });
    if (!response.ok) return null;
    const data = await response.json() as { results?: Array<{ title?: string; url?: string; text?: string }> };
    const urls = (data.results || []).map((r) => r.url || "").filter(isSafeHttpUrl).slice(0, 10);
    const text = filterPassagesForQuery((data.results || []).map((r) => `${r.title || ""}\nURL: ${r.url || ""}\n${r.text || ""}`).join("\n"), query, { maxChars: MAX_OBS });
    return { text, urls };
  } catch (error) {
    logger.debug({ error, query }, "agentic exa failed");
    return null;
  }
}

async function toolWebSearch(query: string, provider: "serper" | "tavily" | "exa"): Promise<{ text: string; urls: string[]; provider: string }> {
  const result = provider === "serper" ? await webSearchSerper(query) : provider === "tavily" ? await webSearchTavily(query) : await webSearchExa(query);
  return result ? { ...result, provider } : { text: `${provider} returned no usable result.`, urls: [], provider };
}

async function toolVisit(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "Apex-Atlas/1.0", Accept: "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8" },
      redirect: "follow",
    });
    if (!response.ok) return `HTTP ${response.status} from ${url}`;
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const raw = (await response.text()).slice(0, 500_000);
    const facts = contentType.includes("html") ? extractContactFactsFromHtml(raw) : "";
    const body = filterPassagesForQuery(stripHtml(raw), url, { maxChars: MAX_OBS, minScore: 0.02 });
    return `${facts ? `CONTACT FACTS (observed, not attributed):\n${facts}\n\n` : ""}PAGE ${url}\n${body}`.slice(0, MAX_OBS + 1200);
  } catch (error: any) {
    return `visit failed for ${url}: ${error?.message || "error"}`;
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
    const value = JSON.parse(json) as Record<string, unknown>;
    const action = cleanText(value.action, 40).toLowerCase();
    if (action === "web_search" && cleanText(value.query, 300) && ["serper", "tavily", "exa"].includes(cleanText(value.provider, 20))) return { action: "web_search", query: cleanText(value.query, 300), provider: cleanText(value.provider, 20) as "serper" | "tavily" | "exa", thought: cleanText(value.thought, 500) || undefined };
    if (action === "visit" && isSafeHttpUrl(cleanText(value.url, 500))) return { action: "visit", url: cleanText(value.url, 500), thought: cleanText(value.thought, 500) || undefined };
    if (action === "footprint_email" && cleanText(value.email, 120).includes("@")) return { action: "footprint_email", email: cleanText(value.email, 120), thought: cleanText(value.thought, 500) || undefined };
    if (action === "footprint_username" && cleanText(value.username, 80).replace(/^@/, "").length >= 2) return { action: "footprint_username", username: cleanText(value.username, 80).replace(/^@/, ""), thought: cleanText(value.thought, 500) || undefined };
    if (action === "domain_lookup" && cleanText(value.domain, 120).includes(".")) return { action: "domain_lookup", domain: cleanText(value.domain, 120).replace(/^https?:\/\//i, "").split("/")[0]!, thought: cleanText(value.thought, 500) || undefined };
    if (action === "registry_search" && cleanText(value.query, 200).length >= 2 && cleanText(value.registry, 60)) return { action: "registry_search", query: cleanText(value.query, 200), registry: cleanText(value.registry, 60).toLowerCase(), thought: cleanText(value.thought, 500) || undefined };
    if (action === "harvest_domain" && cleanText(value.domain, 120).includes(".")) return { action: "harvest_domain", domain: cleanText(value.domain, 120).replace(/^https?:\/\//i, "").split("/")[0]!, thought: cleanText(value.thought, 500) || undefined };
    if (action === "browser_fetch" && isSafeHttpUrl(cleanText(value.url, 500))) return { action: "browser_fetch", url: cleanText(value.url, 500), thought: cleanText(value.thought, 500) || undefined };
    if (action === "done") {
      const rawFindings = Array.isArray(value.findings) ? value.findings : [];
      const findings: AgenticFinding[] = [];
      for (const rawFinding of rawFindings) {
        if (!rawFinding || typeof rawFinding !== "object") continue;
        const f = rawFinding as Record<string, unknown>;
        const vector = cleanText(f.vectorType, 30).toLowerCase();
        const valueText = cleanText(f.value, 500);
        const sourceUrls = filterClaimUrls(Array.isArray(f.sourceUrls) ? f.sourceUrls.filter((u): u is string => typeof u === "string") : []);
        if (!valueText || !["email", "phone", "linkedin", "website", "social", "other"].includes(vector)) continue;
        if (["email", "phone", "linkedin", "social"].includes(vector) && sourceUrls.length === 0) continue;
        let finalValue = valueText;
        if (vector === "email") { const e = sanitizePublicEmail(valueText); if (!e || isTrashContactValue("email", e)) continue; finalValue = e; }
        if (vector === "phone") { const p = sanitizePublicPhone(valueText); if (!p || isTrashContactValue("phone", p)) continue; finalValue = p; }
        if (vector === "website" && !isSafeHttpUrl(finalValue)) continue;
        const personName = typeof f.personName === "string" ? f.personName.trim().slice(0, 120) : null;
        const role = typeof f.role === "string" ? f.role.trim().slice(0, 120) : null;
        const scope = f.scope === "candidate" || f.scope === "organization" ? f.scope : "unknown";
        const promotionDecision = f.promotionDecision === "promote" || f.promotionDecision === "reject" ? f.promotionDecision : undefined;
        findings.push({ vectorType: vector as AgenticFinding["vectorType"], value: finalValue, personName, role, scope, sourceUrls, note: cleanText(f.note, 400) || "Investigator-authored finding", promotionDecision, promotionReason: cleanText(f.promotionReason, 500) || undefined });
      }
      return { action: "done", findings, thought: cleanText(value.thought, 500) || undefined };
    }
  } catch { return null; }
  return null;
}

async function callGroqJson(prompt: string, signal?: AbortSignal): Promise<{ model: string; raw: string } | null> {
  const keys = ["GROQ_API_KEY", ...Array.from({ length: 5 }, (_, i) => `GROQ_API_KEY_${i + 1}`)].map((n) => (process.env[n] || "").trim()).filter(Boolean);
  if (!keys.length) return null;
  let attempt = 0;
  for (const key of keys) for (const model of GROQ_CHAT_MODELS) {
    attempt += 1;
    const started = Date.now();
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, max_completion_tokens: 768, ...(model.startsWith("qwen/") ? { reasoning_effort: "none" } : { reasoning_effort: "low", include_reasoning: false }), response_format: { type: "json_object" }, messages: [{ role: "system", content: apexOrientationCompact("dig_agent") + "\nReturn one JSON action object only." }, { role: "user", content: prompt }] }),
        signal: signal ?? AbortSignal.timeout(PROVIDER_DECISION_TIMEOUT_MS),
      });
      if (!response.ok) {
        recordAgenticLlmAttempt({ provider: "groq", model, promptChars: prompt.length, status: response.status, success: false, latencyMs: Date.now() - started, retryIndex: attempt, reason: response.status === 429 ? "rate_limited" : "provider_rejected" });
        if ([401, 403, 429].includes(response.status)) break;
        continue;
      }
      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const raw = data.choices?.[0]?.message?.content?.trim() || "";
      recordAgenticLlmAttempt({ provider: "groq", model, promptChars: prompt.length, status: response.status, success: Boolean(raw), latencyMs: Date.now() - started, retryIndex: attempt, reason: raw ? undefined : "empty_response" });
      if (raw) return { model, raw };
    } catch (error: any) {
      recordAgenticLlmAttempt({ provider: "groq", model, promptChars: prompt.length, status: error?.name === "TimeoutError" ? "timeout" : "error", success: false, latencyMs: Date.now() - started, retryIndex: attempt, reason: error?.message || "exception" });
    }
  }
  return null;
}

async function callMistralJson(prompt: string, signal?: AbortSignal): Promise<{ model: string; raw: string } | null> {
  const key = (process.env.MISTRAL_API_KEY || "").trim();
  if (!key) return null;
  const models = [process.env.MISTRAL_AGENTIC_MODEL, "mistral-small-latest", "mistral-large-latest", "open-mistral-nemo"].filter((m): m is string => Boolean(m?.trim()));
  let attempt = 0;
  for (const model of models) {
    attempt += 1;
    const started = Date.now();
    try {
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, max_tokens: 768, messages: [{ role: "system", content: apexOrientationCompact("dig_agent") + "\nReturn one JSON action object only." }, { role: "user", content: prompt }] }),
        signal: signal ?? AbortSignal.timeout(PROVIDER_DECISION_TIMEOUT_MS),
      });
      if (!response.ok) {
        recordAgenticLlmAttempt({ provider: "mistral", model, promptChars: prompt.length, status: response.status, success: false, latencyMs: Date.now() - started, retryIndex: attempt, reason: response.status === 429 ? "rate_limited" : "provider_rejected" });
        if ([401, 403, 429].includes(response.status)) break;
        continue;
      }
      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const raw = data.choices?.[0]?.message?.content?.trim() || "";
      recordAgenticLlmAttempt({ provider: "mistral", model, promptChars: prompt.length, status: response.status, success: Boolean(raw), latencyMs: Date.now() - started, retryIndex: attempt, reason: raw ? undefined : "empty_response" });
      if (raw) return { model: `mistral:${model}`, raw };
    } catch (error: any) {
      recordAgenticLlmAttempt({ provider: "mistral", model, promptChars: prompt.length, status: error?.name === "TimeoutError" ? "timeout" : "error", success: false, latencyMs: Date.now() - started, retryIndex: attempt, reason: error?.message || "exception" });
    }
  }
  return null;
}

async function llmStep(prompt: string, selectedInvestigatorLlm?: "groq" | "mistral"): Promise<{ model: string; raw: string } | null> {
  await acquireProviderSlot();
  try {
    const providers: Array<[string, (prompt: string, signal?: AbortSignal) => Promise<{ model: string; raw: string } | null>]> = [
      ...(process.env.GROQ_API_KEY ? [["groq", callGroqJson] as [string, (prompt: string, signal?: AbortSignal) => Promise<{ model: string; raw: string } | null>]] : []),
      ...(process.env.MISTRAL_API_KEY ? [["mistral", callMistralJson] as [string, (prompt: string, signal?: AbortSignal) => Promise<{ model: string; raw: string } | null>]] : []),
    ];
    if (!selectedInvestigatorLlm) {
      setAgenticLlmHealth(false, null, "No Boss-selected Investigator LLM was propagated into ReAct");
      return null;
    }
    const orderedProviders = selectedInvestigatorLlm
      ? [...providers.filter(([name]) => name === selectedInvestigatorLlm), ...providers.filter(([name]) => name !== selectedInvestigatorLlm)]
      : providers;
    const errors: string[] = [];
    for (const [name, fn] of orderedProviders) {
      try {
        const result = await new Promise<{ model: string; raw: string } | null>((resolve, reject) => {
          const controller = new AbortController();
          const timer = setTimeout(() => { controller.abort(); reject(new Error(name + ":timeout")); }, PROVIDER_DECISION_TIMEOUT_MS);
          void fn(prompt, controller.signal).then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
        });
        if (!result?.raw) throw new Error(name + ":empty");
        setAgenticLlmHealth(true, result.model, null);
        return result;
      } catch (error: any) {
        errors.push(name + ":" + (error?.message || "failed"));
      }
    }
    setAgenticLlmHealth(false, null, errors.join(";").slice(0, 1000));
    return null;
  } finally {
    releaseProviderSlot();
  }
}

function formatFindingsBag(findings: AgenticFinding[]): string {
  if (!findings.length) return "(none yet)";
  return findings.slice(-12).map((f) => `- ${f.vectorType}: ${f.value} (${f.scope})${f.personName ? ` person=${f.personName}` : ""}${f.role ? ` role=${f.role}` : ""}${f.sourceUrls[0] ? ` src=${f.sourceUrls[0]}` : ""}`).join("\n");
}

const AGENTIC_ACTION_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", enum: ["web_search", "visit", "footprint_email", "footprint_username", "domain_lookup", "registry_search", "harvest_domain", "browser_fetch", "done"] },
    query: { type: "string" }, provider: { type: "string", enum: ["serper", "tavily", "exa"] }, url: { type: "string" }, email: { type: "string" }, username: { type: "string" }, domain: { type: "string" }, registry: { type: "string" }, thought: { type: "string" },
    findings: { type: "array", items: { type: "object", properties: { vectorType: { type: "string" }, value: { type: "string" }, personName: { type: ["string", "null"] }, role: { type: ["string", "null"] }, scope: { type: "string" }, sourceUrls: { type: "array", items: { type: "string" } }, note: { type: "string" }, promotionDecision: { type: "string" }, promotionReason: { type: "string" } }, required: ["vectorType", "value", "sourceUrls", "note"], additionalProperties: false } },
  },
  required: ["action"],
  additionalProperties: false,
};

function buildStepPrompt(input: { targetName: string; companyName?: string | null; objective: string; history: string[]; lastObservation: string; findings: AgenticFinding[] }): string {
  return `${apexOrientationCompact("dig_agent")}\n\nINSTITUTIONAL BOOTSTRAP IS ALREADY IN FORCE. The operator supplied case-specific direction; the institution supplies identity, evidence law, autonomy law, and role boundaries. You own the research trajectory. Discovery, target research, revisits, pivots, and stopping are capabilities you may choose, not mandatory phases.\n\nASSIGNMENT TARGET: ${input.targetName}\n${input.companyName ? `RELATED ORGANIZATION CONTEXT: ${input.companyName}\n` : ""}OBJECTIVE: ${input.objective.slice(0, 4500)}\n\nAVAILABLE ACTIONS (choose freely; there is no required first tool and no required hop order):\n${JSON.stringify(AGENTIC_ACTION_SCHEMA)}\n\nEVIDENCE LAW:\n- Observations are leads/facts, not identity attribution.\n- Only you may author a person identity and candidate scope in action=done.\n- If you promote a person, include the exact HTTPS source page you actually observed, promotionDecision=promote, and a concise promotionReason.\n- Never inherit the target name as proof of a person identity. Never invent URLs, contacts, or people.\n- Search results are leads; visit or otherwise verify important claims when useful.\n\nFINDINGS SO FAR (model-visible memory; not automatic promotion):\n${formatFindingsBag(input.findings)}\n\nTRAJECTORY SO FAR:\n${input.history.slice(-10).join("\n") || "(no prior actions)"}\n\nLATEST OBSERVATION:\n${input.lastObservation.slice(0, 4000)}\n\nChoose the next action based on expected information gain. You may stop now. Return ONE JSON action object only.`;
}

async function runAgenticWebResearchUnbounded(input: {
  targetName: string;
  companyName?: string | null;
  objective?: string;
  investigatorLlm?: "groq" | "mistral";
  maxIterations?: number;
  hardTimeoutMs?: number;
  shouldCancel?: () => boolean | Promise<boolean>;
  jobId?: string | null;
  onLiveStep?: (step: { action: string; query?: string; url?: string; provider?: string; summary?: string; targetName: string; companyName?: string | null }) => void;
}): Promise<AgenticWebResearchResult> {
  const name = input.targetName.trim();
  if (name.length < 2) return { status: "unavailable", model: "none", iterations: 0, searches: 0, visits: 0, findings: [], modelFindings: [], stopReason: "LLM_UNAVAILABLE", trajectory: [], error: "empty target" };
  const maxIter = Math.max(1, input.maxIterations ?? MAX_ITER);
  const hardTimeoutMs = Math.max(30_000, input.hardTimeoutMs ?? 210_000);
  const startedAt = Date.now();
  const objective = input.objective || `Research the public web for the strongest attributable public contact path for ${name}${input.companyName ? ` in the context of ${input.companyName}` : ""}. Use your judgment; verify evidence; stop when the evidence is sufficient or reasonable public avenues are exhausted.`;
  const history: string[] = [];
  const initialObservation = `CASE CONTEXT LOADED\nInstitutional mission and role purpose are active. Durable case context and operator objective are available. Capabilities include web search, page retrieval, browser escalation, email/username footprinting, domain lookup, registry search, and domain harvesting. No research action has been selected yet; choose any permitted action based on the case context.`;
  let lastObservation = initialObservation;
  let modelUsed = "none";
  let searches = 0;
  let visits = 0;
  let findings: AgenticFinding[] = [];
  const visited = new Set<string>();

  const emit = (action: string, extra: Record<string, string> = {}) => {
    try { input.onLiveStep?.({ action, ...extra, targetName: name, companyName: input.companyName ?? null }); } catch { /* telemetry only */ }
  };

  for (let i = 0; i < maxIter; i++) {
    if (Date.now() - startedAt >= hardTimeoutMs) return { status: "timeout", model: modelUsed, iterations: i, searches, visits, findings, modelFindings: [], stopReason: "HARD_TIMEOUT", trajectory: history, error: `hard timeout ${hardTimeoutMs}ms` };
    if (input.shouldCancel) {
      try { if (await input.shouldCancel()) return { status: "completed", model: modelUsed, iterations: i, searches, visits, findings, modelFindings: [], stopReason: "CANCELLED", trajectory: history, error: "cancelled by operator" }; } catch { /* continue */ }
    }

    const prompt = buildStepPrompt({ targetName: name, companyName: input.companyName, objective, history, lastObservation, findings });
    emit("llm_wait", { provider: "agentic-provider-pool", summary: "waiting for Investigator decision" });
    const llm = await llmStep(prompt, input.investigatorLlm);
    if (!llm) return { status: "unavailable", model: "none", iterations: i + 1, searches, visits, findings, modelFindings: [], stopReason: "LLM_UNAVAILABLE", trajectory: history, error: "No Boss-selected Investigator adapter available" };
    modelUsed = llm.model;
    const action = parseAction(llm.raw);
    if (!action) {
      history.push(`step${i + 1}: parse_failure`);
      lastObservation = "The previous model response was not valid action JSON. Choose one allowed action and return exactly one JSON object.";
      continue;
    }

    if (action.action === "done") {
      const modelFindings = action.findings;
      findings = mergeFindings(findings, modelFindings);
      history.push(`step${i + 1}: done modelFindings=${modelFindings.length}`);
      emit("done", { summary: action.thought || "model decided to stop" });
      return { status: "completed", model: modelUsed, iterations: i + 1, searches, visits, findings, modelFindings, stopReason: "MODEL_DECIDED_DONE", trajectory: history };
    }

    if (action.action === "web_search") {
      searches += 1;
      history.push(`step${i + 1}: web_search provider=${action.provider} query=${action.query}`);
      const result = await toolWebSearch(action.query, action.provider);
      lastObservation = `WEB_SEARCH provider=${result.provider}\n${result.urls.map((u, n) => `${n + 1}. ${u}`).join("\n")}\n\n${result.text}`.slice(0, MAX_OBS + 800);
      emit("web_search", { query: action.query, provider: result.provider, summary: `${result.urls.length} URLs returned` });
      continue;
    }

    if (action.action === "visit") {
      if (visited.has(action.url)) { lastObservation = `Already visited ${action.url}; choose another action if further evidence is useful.`; history.push(`step${i + 1}: repeat_visit_rejected`); continue; }
      visited.add(action.url);
      visits += 1;
      history.push(`step${i + 1}: visit ${action.url}`);
      const page = await toolVisit(action.url);
      lastObservation = page;
      // Contact extraction is observation-only. It never receives the target identity and never becomes modelFindings automatically.
      const observed = findingsFromContactFacts(page, action.url);
      const filingContext = findingsFromProxyPage(page, action.url);
      if (observed.length) lastObservation += `\n\nOBSERVED PUBLIC CONTACT FACTS (unattributed):\n${observed.map((f) => `${f.vectorType}: ${f.value} source=${f.sourceUrls[0]}`).join("\n")}`;
      if (filingContext) lastObservation += `\n\n${filingContext}`;
      emit("visit", { url: action.url, provider: "page-fetch", summary: observed.length ? `${observed.length} unattributed contact fact(s)` : "page read" });
      continue;
    }

    if (action.action === "browser_fetch") {
      history.push(`step${i + 1}: browser_fetch ${action.url}`);
      try {
        const { browserFetchConfigured, browserFetchHtml } = await import("./browser-fetch");
        if (!browserFetchConfigured()) lastObservation = "Browser escalation is not configured; choose another available capability.";
        else {
          const result = await browserFetchHtml(action.url);
          visits += 1;
          visited.add(action.url);
          const page = result.html || "";
          const observed = findingsFromContactFacts(page, action.url);
          lastObservation = `BROWSER_FETCH provider=${result.provider} url=${action.url}\n${stripHtml(page).slice(0, MAX_OBS)}${observed.length ? `\n\nOBSERVED PUBLIC CONTACT FACTS (unattributed):\n${observed.map((f) => `${f.vectorType}: ${f.value} source=${f.sourceUrls[0]}`).join("\n")}` : ""}`;
        }
      } catch (error: any) { lastObservation = `browser_fetch failed: ${error?.message || "error"}`; }
      emit("browser_fetch", { url: action.url, provider: "browser", summary: lastObservation.slice(0, 180) });
      continue;
    }

    if (action.action === "domain_lookup") {
      history.push(`step${i + 1}: domain_lookup ${action.domain}`);
      try {
        const { lookupDomainSurface } = await import("./domain-surface");
        const result = await lookupDomainSurface(action.domain);
        lastObservation = `DOMAIN_LOOKUP ${action.domain}\n${result.summary}`;
      } catch (error: any) { lastObservation = `domain_lookup failed: ${error?.message || "error"}`; }
      emit("domain_lookup", { query: action.domain, provider: "rdap", summary: lastObservation.slice(0, 180) });
      continue;
    }

    if (action.action === "registry_search") {
      history.push(`step${i + 1}: registry_search ${action.registry} ${action.query}`);
      try {
        const { searchRegistry } = await import("./registry-client");
        const rows = await searchRegistry({ query: action.query, registry: action.registry as any, limit: 8 });
        lastObservation = `REGISTRY ${action.registry} query=${action.query}\n${rows.slice(0, 8).map((r: any, n: number) => `${n + 1}. ${r.name}${r.notes ? ` — ${String(r.notes).slice(0, 160)}` : ""}`).join("\n") || "No registry hits."}`;
      } catch (error: any) { lastObservation = `registry_search failed: ${error?.message || "error"}`; }
      emit("registry_search", { query: action.query, provider: action.registry, summary: lastObservation.slice(0, 180) });
      continue;
    }

    if (action.action === "harvest_domain") {
      history.push(`step${i + 1}: harvest_domain ${action.domain}`);
      try {
        const { runTheHarvester } = await import("./python-tools");
        const result = await runTheHarvester(action.domain);
        lastObservation = `HARVEST_DOMAIN ${action.domain}\nEmails: ${(result.emails || []).slice(0, 20).join(", ") || "none"}\nHosts: ${(result.hosts || result.subdomains || []).slice(0, 20).join(", ") || "none"}`;
      } catch (error: any) { lastObservation = `harvest_domain failed: ${error?.message || "error"}`; }
      emit("harvest_domain", { query: action.domain, provider: "theharvester", summary: lastObservation.slice(0, 180) });
      continue;
    }

    if (action.action === "footprint_email") {
      history.push(`step${i + 1}: footprint_email ${action.email}`);
      try {
        const { runHolehe } = await import("./python-tools");
        const result = await runHolehe(action.email);
        lastObservation = `FOOTPRINT_EMAIL ${action.email}\n${(result.found || []).slice(0, 15).map((h: any) => h.name || h.url || "service").join(", ") || result.error || "no platform hits"}`;
      } catch (error: any) { lastObservation = `footprint_email failed: ${error?.message || "error"}`; }
      emit("footprint_email", { query: action.email, provider: "holehe", summary: lastObservation.slice(0, 180) });
      continue;
    }

    if (action.action === "footprint_username") {
      history.push(`step${i + 1}: footprint_username ${action.username}`);
      try {
        const { runMaigret, runSherlock } = await import("./python-tools");
        const [maigret, sherlock] = await Promise.all([runMaigret(action.username), runSherlock(action.username).catch(() => null)]);
        lastObservation = `FOOTPRINT_USERNAME ${action.username}\nMaigret: ${(maigret.found || []).slice(0, 12).map((h: any) => h.siteName || h.url || "site").join(", ") || "no hits"}\nSherlock: ${(sherlock?.found || []).slice(0, 8).map((h: any) => h.siteName || h.url || "site").join(", ") || "no hits"}`;
      } catch (error: any) { lastObservation = `footprint_username failed: ${error?.message || "error"}`; }
      emit("footprint_username", { query: action.username, provider: "maigret", summary: lastObservation.slice(0, 180) });
      continue;
    }
  }

  return { status: "completed", model: modelUsed, iterations: maxIter, searches, visits, findings, modelFindings: [], stopReason: "ITERATION_BUDGET", trajectory: history, error: "iteration budget exhausted" };
}

export async function runAgenticWebResearch(input: Parameters<typeof runAgenticWebResearchUnbounded>[0]): Promise<AgenticWebResearchResult> {
  const scope = `agentic:${input.jobId ?? input.targetName.trim().toLowerCase()}`;
  return withProviderScope(scope, async () => runAgenticWebResearchUnbounded(input));
}
