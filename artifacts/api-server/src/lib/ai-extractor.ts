/**
 * AI Extractor — Groq-powered contact & person extraction from scraped web text
 *
 * Uses Groq's llama-3.3-70b-versatile (free, 6 000 req/day, 32k context window)
 * via the OpenAI-compatible REST API — no SDK, pure fetch.
 *
 * Role in the pipeline:
 *   After deterministic regex extraction runs against search snippets + scraped pages,
 *   the AI pass reads the same accumulated text and pulls out anything regex missed:
 *   - Emails in obfuscated or sentence form ("contact us at reservations [at] venue")
 *   - Phone numbers in international or formatted form ("call +33 4 93 43 03 43")
 *   - Social handles mentioned inline ("find us on Instagram @baolicannes")
 *   - Owner/founder names from press snippets, bios, registry filings in any language
 *   - Personal social handles for named owners (e.g. @christoph_cau for Christophe Caucino)
 *
 * Falls back silently if GROQ_API_KEY is unset or quota is hit — pipeline continues
 * with regex-only results.
 */

import { logger } from "./logger";

const GROQ_API        = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL      = "llama-3.3-70b-versatile";
const GROQ_MODEL_FAST = "llama-3.1-8b-instant";

const OPENROUTER_API   = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct"; // fast + free-tier friendly

// Track which keys hit quota this process lifetime so we skip them quickly
const _exhaustedGroqKeys    = new Set<string>();
const _exhaustedORKeys      = new Set<string>();

function getGroqKeys(): string[] {
  return ["GROQ_API_KEY", "GROQ_API_KEY_2", "GROQ_API_KEY_3"]
    .map(k => process.env[k] ?? "")
    .filter(k => k.length > 0);
}

function getOpenRouterKeys(): string[] {
  return ["OPENROUTER_API_KEY", "OPENROUTER_API_KEY_2"]
    .map(k => process.env[k] ?? "")
    .filter(k => k.length > 0);
}

/** Personal contact vector for a named owner/founder discovered in text */
export interface OwnerContact {
  name:      string;        // Full name (First Last)
  instagram: string | null; // Personal Instagram URL — NOT the venue account
  twitter:   string | null; // Personal Twitter/X URL
  linkedin:  string | null; // Personal LinkedIn /in/ profile URL
  email:     string | null; // Personal or direct email if stated
}

export interface AIExtractResult {
  // ── Org-level contact vectors (for the entity being researched) ─────────
  email:     string | null;
  phone:     string | null;
  linkedin:  string | null; // org LinkedIn /company/ page
  instagram: string | null; // venue/org Instagram
  twitter:   string | null; // venue/org Twitter
  // ── Person discoveries ──────────────────────────────────────────────────
  owners:        string[];        // flat list of owner names (backward compat)
  ownerContacts: OwnerContact[];  // structured per-owner data with personal handles
  source:    "groq-llama-70b" | "groq-llama-8b" | "openrouter" | "none";
}

const EMPTY: AIExtractResult = {
  email: null, phone: null, linkedin: null,
  instagram: null, twitter: null,
  owners: [], ownerContacts: [],
  source: "none",
};


/**
 * Build the prompt. Separates org-level contact from personal owner contacts —
 * this is the key distinction that lets us find @christoph_cau (personal) vs
 * @baolicannes (venue), matching what Google/Gemini AI overview produces.
 * Text is capped at 5 500 chars to leave room for the response.
 */
function buildPrompt(text: string, entityName: string, entityType: string, country: string | null): string {
  const ctx = country ? ` (${country})` : "";
  const truncated = text.slice(0, 5500);
  const isOrg = entityType === "Corporation" || entityType === "Trust";

  return `You are an OSINT research assistant. Analyze this web text about "${entityName}"${ctx} (${entityType}) and extract verifiable contact information EXPLICITLY stated in the text.

TEXT:
${truncated}

Return ONLY valid JSON — no explanation, no markdown:
{
  "email": "venue/org contact email or null",
  "phone": "full international number with country code (e.g. +33 4 93 43 03 43) or null",
  "linkedin": "${isOrg ? "https://linkedin.com/company/... org page or null" : "https://linkedin.com/in/profile or null"}",
  "instagram": "${isOrg ? "venue/brand Instagram URL (e.g. https://instagram.com/baolicannes) or null" : "personal Instagram URL or null"}",
  "twitter": "venue/org Twitter/X URL or null",
  "ownerContacts": [
    {
      "name": "Full Name (First Last minimum)",
      "instagram": "PERSONAL Instagram URL (not the venue account — e.g. https://instagram.com/christoph_cau) or null",
      "twitter": "personal Twitter/X URL or null",
      "linkedin": "personal LinkedIn /in/ profile URL or null",
      "email": "personal or direct email if explicitly stated or null"
    }
  ]
}

Rules:
- Only extract what is EXPLICITLY present in the text above — never guess or infer
- email/phone: prefer the primary business/venue contact (reservations@, contact@, info@)
- phone: must have ≥7 digits; include country code when present
- instagram/twitter (top level): the venue or org account (handle matches the business name)
- ownerContacts: named founders, owners, CEOs, directors found in the text
  * max 5 owners; full name required (at least First + Last)
  * instagram/twitter in ownerContacts: their PERSONAL handles (not the venue account)
    e.g. if text says "Christophe Caucino (@christoph_cau)" → instagram: "https://instagram.com/christoph_cau"
  * linkedin in ownerContacts: /in/ profiles only (not /company/)
  * email in ownerContacts: personal or named email only (not info@ or reservations@)
- Return null for any field not found; return [] for ownerContacts if none found
- Do NOT invent anything not stated in the text`;
}

/** Parse the raw JSON response content into an AIExtractResult */
function parseAIResponse(raw: string, source: AIExtractResult["source"]): AIExtractResult | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    const clean = (v: unknown): string | null => {
      if (typeof v !== "string" || !v.trim()) return null;
      const s = v.trim();
      return (s === "null" || s === "undefined" || s.length < 3) ? null : s;
    };

    const owners: string[] = [];
    const ownerContacts: OwnerContact[] = [];

    if (Array.isArray(parsed["ownerContacts"])) {
      for (const oc of parsed["ownerContacts"]) {
        if (typeof oc !== "object" || !oc) continue;
        const name = clean((oc as any)["name"]);
        if (!name || !name.includes(" ") || name.length < 4 || name.length > 80) continue;
        const contact: OwnerContact = {
          name,
          instagram: clean((oc as any)["instagram"]),
          twitter:   clean((oc as any)["twitter"]),
          linkedin:  clean((oc as any)["linkedin"]),
          email:     clean((oc as any)["email"]),
        };
        if (contact.instagram && !contact.instagram.includes("instagram.com")) contact.instagram = null;
        if (contact.twitter   && !contact.twitter.includes("twitter.com") && !contact.twitter.includes("x.com")) contact.twitter = null;
        if (contact.linkedin  && !contact.linkedin.includes("linkedin.com")) contact.linkedin = null;
        ownerContacts.push(contact);
        owners.push(name);
      }
    }

    if (owners.length === 0 && Array.isArray(parsed["owners"])) {
      for (const o of parsed["owners"]) {
        if (typeof o === "string" && o.trim().includes(" ") && o.trim().length >= 4 && o.trim().length <= 60) {
          owners.push(o.trim());
        }
      }
    }

    return {
      email:         clean(parsed["email"]),
      phone:         clean(parsed["phone"]),
      linkedin:      clean(parsed["linkedin"]),
      instagram:     clean(parsed["instagram"]),
      twitter:       clean(parsed["twitter"]),
      owners:        owners.slice(0, 5),
      ownerContacts: ownerContacts.slice(0, 5),
      source,
    };
  } catch {
    return null;
  }
}

/** Call one Groq key + model combination. Returns null on rate-limit (key marked exhausted). */
async function callGroq(
  text: string,
  entityName: string,
  entityType: string,
  country: string | null,
  key: string,
  model: string,
): Promise<AIExtractResult | null> {
  const prompt = buildPrompt(text, entityName, entityType, country);
  const body = JSON.stringify({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
    max_tokens: 600,
    response_format: { type: "json_object" },
  });

  try {
    const resp = await fetch(GROQ_API, {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(20_000),
    });

    if (resp.status === 429) {
      _exhaustedGroqKeys.add(key);
      logger.debug({ model }, "Groq rate limit — key marked exhausted");
      return null;
    }
    if (!resp.ok) {
      const err = await resp.text().catch(() => "");
      logger.debug({ status: resp.status, err: err.slice(0, 200), model }, "Groq API error");
      return null;
    }

    const data = await resp.json() as any;
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    const src: AIExtractResult["source"] = model === GROQ_MODEL ? "groq-llama-70b" : "groq-llama-8b";
    return parseAIResponse(raw, src);
  } catch (err: any) {
    logger.debug({ err: err?.message, model }, "Groq call failed");
    return null;
  }
}

/** Call one OpenRouter key. Returns null on rate-limit (key marked exhausted). */
async function callOpenRouter(
  text: string,
  entityName: string,
  entityType: string,
  country: string | null,
  key: string,
): Promise<AIExtractResult | null> {
  const prompt = buildPrompt(text, entityName, entityType, country);
  const body = JSON.stringify({
    model: OPENROUTER_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
    max_tokens: 600,
    response_format: { type: "json_object" },
  });

  try {
    const resp = await fetch(OPENROUTER_API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://apex-finder.replit.app",
        "X-Title": "ApexFinder OSINT",
      },
      body,
      signal: AbortSignal.timeout(25_000),
    });

    if (resp.status === 429) {
      _exhaustedORKeys.add(key);
      logger.debug("OpenRouter rate limit — key marked exhausted");
      return null;
    }
    if (!resp.ok) {
      const err = await resp.text().catch(() => "");
      logger.debug({ status: resp.status, err: err.slice(0, 200) }, "OpenRouter API error");
      return null;
    }

    const data = await resp.json() as any;
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    return parseAIResponse(raw, "openrouter");
  } catch (err: any) {
    logger.debug({ err: err?.message }, "OpenRouter call failed");
    return null;
  }
}

/**
 * Main extraction entry point.
 *
 * Strategy (in order):
 *   1. Each Groq key (GROQ_API_KEY, _2, _3) — tries llama-3.3-70b first, then llama-3.1-8b-instant
 *   2. Each OpenRouter key (OPENROUTER_API_KEY, _2) — llama-3.3-70b-instruct
 *
 * A key that returns 429 is marked exhausted for the process lifetime and skipped on future calls.
 * Falls back silently to EMPTY if all providers are exhausted or unavailable.
 */
export async function extractWithAI(
  text: string,
  entityName: string,
  entityType: string,
  country: string | null = null,
): Promise<AIExtractResult> {
  if (!text || text.trim().length < 50) return EMPTY;

  try {
    // ── 1. Try all Groq keys ────────────────────────────────────────────────
    for (const key of getGroqKeys()) {
      if (_exhaustedGroqKeys.has(key)) continue;

      // Primary model
      const result = await callGroq(text, entityName, entityType, country, key, GROQ_MODEL);
      if (result) {
        logger.debug({ entityName, source: result.source, hasEmail: !!result.email, owners: result.owners.length }, "AI extraction complete");
        return result;
      }

      // Fast fallback on same key (if not exhausted by the primary call)
      if (!_exhaustedGroqKeys.has(key)) {
        const fast = await callGroq(text, entityName, entityType, country, key, GROQ_MODEL_FAST);
        if (fast) {
          logger.debug({ entityName, source: fast.source, hasEmail: !!fast.email }, "AI extraction (fast model) complete");
          return fast;
        }
      }
    }

    // ── 2. Fall back to OpenRouter ──────────────────────────────────────────
    for (const key of getOpenRouterKeys()) {
      if (_exhaustedORKeys.has(key)) continue;
      const result = await callOpenRouter(text, entityName, entityType, country, key);
      if (result) {
        logger.debug({ entityName, source: result.source, hasEmail: !!result.email }, "AI extraction (OpenRouter) complete");
        return result;
      }
    }
  } catch (err: any) {
    logger.debug({ err: err?.message }, "AI extractor outer catch");
  }

  return EMPTY;
}
