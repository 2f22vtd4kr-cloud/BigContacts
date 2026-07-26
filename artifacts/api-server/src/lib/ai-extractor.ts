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

const OPENROUTER_API    = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL  = "meta-llama/llama-3.3-70b-instruct"; // fast + free-tier friendly
const PERPLEXITY_MODEL  = "perplexity/sonar-pro";               // live web-search model (Gemini AI Overview equivalent)

// Track which keys hit rate-limits. Map<key, expiresAtMs> — keys auto-recover after 5 min.
const EXHAUSTED_TTL_MS = 5 * 60 * 1000;

function isExhausted(map: Map<string, number>, key: string): boolean {
  const exp = map.get(key);
  if (!exp) return false;
  if (Date.now() > exp) { map.delete(key); return false; }
  return true;
}

// IMPORTANT: Perplexity uses a SEPARATE exhaustion map from OpenRouter-llama extraction.
// A 429 on the llama extraction path must NOT block Perplexity Sonar (different model, different quota).
const _exhaustedGroqKeys       = new Map<string, number>();
const _exhaustedORKeys         = new Map<string, number>(); // for llama text extraction only
const _exhaustedPerplexityKeys = new Map<string, number>(); // for Perplexity Sonar only

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
  source:    "groq-llama-70b" | "groq-llama-8b" | "openrouter" | "perplexity-sonar" | "none";
  citations: string[];            // URLs Perplexity actually searched — use as evidence sources
}

const EMPTY: AIExtractResult = {
  email: null, phone: null, linkedin: null,
  instagram: null, twitter: null,
  owners: [], ownerContacts: [],
  source: "none",
  citations: [],
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

    // Normalize @handle → full URL for instagram and twitter fields
    const normIG  = (v: unknown): string | null => {
      const s = clean(v);
      if (!s) return null;
      if (s.startsWith("@")) return `https://instagram.com/${s.slice(1)}`;
      return s.includes("instagram.com") ? s : null;
    };
    const normTW  = (v: unknown): string | null => {
      const s = clean(v);
      if (!s) return null;
      if (s.startsWith("@")) return `https://twitter.com/${s.slice(1)}`;
      return (s.includes("twitter.com") || s.includes("x.com")) ? s : null;
    };

    const owners: string[] = [];
    const ownerContacts: OwnerContact[] = [];

    if (Array.isArray(parsed["ownerContacts"])) {
      for (const oc of parsed["ownerContacts"]) {
        if (typeof oc !== "object" || !oc) continue;
        const name = clean((oc as any)["name"]);
        if (!name || !name.includes(" ") || name.length < 4 || name.length > 80) continue;
        const rawLinkedin = clean((oc as any)["linkedin"]);
        const contact: OwnerContact = {
          name,
          instagram: normIG((oc as any)["instagram"]),
          twitter:   normTW((oc as any)["twitter"]),
          linkedin:  rawLinkedin?.includes("linkedin.com") ? rawLinkedin : null,
          email:     clean((oc as any)["email"]),
        };
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

    const rawLinkedinTop = clean(parsed["linkedin"]);
    return {
      email:         clean(parsed["email"]),
      phone:         clean(parsed["phone"]),
      linkedin:      rawLinkedinTop?.includes("linkedin.com") ? rawLinkedinTop : null,
      instagram:     normIG(parsed["instagram"]),
      twitter:       normTW(parsed["twitter"]),
      owners:        owners.slice(0, 5),
      ownerContacts: ownerContacts.slice(0, 5),
      source,
      citations: [],
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
      _exhaustedGroqKeys.set(key, Date.now() + EXHAUSTED_TTL_MS);
      logger.debug({ model }, "Groq rate limit — key marked exhausted for 5 min");
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
      _exhaustedORKeys.set(key, Date.now() + EXHAUSTED_TTL_MS);
      logger.debug("OpenRouter (llama) rate limit — key marked exhausted for 5 min");
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

// ─── Perplexity Sonar — live web research ────────────────────────────────────
// perplexity/sonar-pro via OpenRouter is a LIVE WEB-SEARCH model — it searches
// the internet and synthesises results exactly like Gemini AI Overview.
// Unlike extractWithAI (which reads text we already scraped), this sends a
// natural-language research question and Perplexity fetches and reads sources itself.
// This is how Gemini finds "Christophe Caucino" from Nice-Matin in <1 second.

function buildPerplexityPrompt(entityName: string, entityType: string, country: string | null): string {
  const ctx = country ? ` in ${country}` : "";
  const isOrg = entityType === "Corporation" || entityType === "Trust";

  return `Research task: Find verifiable public contact and ownership information for "${entityName}"${ctx}.

${isOrg
  ? `This is a company/business. I need:\n1. Official contact email (e.g. reservations@, contact@, info@)\n2. Phone number with country code\n3. Business Instagram handle and URL\n4. Business Twitter/X handle and URL\n5. Full names of founders, owners, presidents, CEOs, or directors\n6. For each named founder/owner: their personal Instagram (@handle), Twitter/X, and LinkedIn URL\n\nCheck the company website, local/regional press articles, LinkedIn, Instagram, business registries, and news sources. Regional press (e.g. Nice-Matin, local business newspapers) often names owners.`
  : `This is an individual. I need:\n1. Contact email\n2. Phone number\n3. LinkedIn profile URL\n4. Instagram handle and URL\n5. Twitter/X handle and URL\n6. Their associated companies or roles`}

Return ONLY this JSON — no preamble, no explanation, no markdown:
{
  "email": "contact email or null",
  "phone": "+XX XXX XXX or null",
  "linkedin": "LinkedIn URL or null",
  "instagram": "Instagram URL or null",
  "twitter": "Twitter/X URL or null",
  "ownerContacts": [
    {
      "name": "First Last",
      "instagram": "personal Instagram URL or null",
      "twitter": "personal Twitter/X URL or null",
      "linkedin": "personal LinkedIn /in/ URL or null",
      "email": "personal email or null"
    }
  ]
}`;
}

/**
 * Fire a live Perplexity Sonar research query via OpenRouter.
 * Perplexity searches the web itself — this is the Google/Gemini AI Overview equivalent.
 * Returns structured contact + owner data with the URLs Perplexity actually read.
 */
export async function researchWithPerplexity(
  entityName: string,
  entityType: string,
  country: string | null = null,
): Promise<AIExtractResult> {
  const perpKeys = getOpenRouterKeys();
  if (perpKeys.every(k => isExhausted(_exhaustedPerplexityKeys, k))) {
    logger.warn("Phase 0: all OpenRouter keys exhausted for Perplexity — skipping sonar research");
    return EMPTY;
  }
  logger.info({ entityName, entityType, country }, "Phase 0: firing Perplexity Sonar research");
  for (const key of perpKeys) {
    if (isExhausted(_exhaustedPerplexityKeys, key)) continue;
    try {
      const prompt = buildPerplexityPrompt(entityName, entityType, country);
      const body = JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 800,
      });

      const resp = await fetch(OPENROUTER_API, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://apex-finder.replit.app",
          "X-Title": "ApexFinder OSINT",
        },
        body,
        signal: AbortSignal.timeout(35_000),
      });

      if (resp.status === 429) {
        _exhaustedPerplexityKeys.set(key, Date.now() + EXHAUSTED_TTL_MS);
        logger.warn("Perplexity Sonar rate limit — key marked exhausted for 5 min (does NOT affect llama extraction)");
        continue;
      }
      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        logger.warn({ status: resp.status, err: errText.slice(0, 300) }, "Phase 0: Perplexity API error");
        continue;
      }

      const data = await resp.json() as any;
      const raw: string = data?.choices?.[0]?.message?.content ?? "";
      // OpenRouter returns Perplexity citations at the top-level response object
      const citations: string[] = Array.isArray(data?.citations) ? data.citations.slice(0, 8) : [];

      logger.info({ entityName, rawLen: raw.length, citations: citations.length }, "Phase 0: Perplexity raw response received");

      // Perplexity may wrap JSON in text — extract the JSON block
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn({ raw: raw.slice(0, 300) }, "Phase 0: Perplexity — no JSON block in response");
        continue;
      }

      const parsed = parseAIResponse(jsonMatch[0], "perplexity-sonar");
      if (!parsed) {
        logger.warn({ json: jsonMatch[0].slice(0, 300) }, "Phase 0: Perplexity — parseAIResponse returned null");
        continue;
      }

      logger.info(
        { entityName, hasEmail: !!parsed.email, hasPhone: !!parsed.phone, hasIG: !!parsed.instagram, owners: parsed.owners.length, ownerContacts: parsed.ownerContacts.length, citations: citations.length },
        "Phase 0: Perplexity Sonar research complete",
      );
      return { ...parsed, source: "perplexity-sonar", citations };
    } catch (err: any) {
      logger.warn({ err: err?.message, name: (err as any)?.name }, "Phase 0: Perplexity call threw");
    }
  }

  logger.warn({ entityName }, "Phase 0: Perplexity returned no usable data — all keys tried");
  return EMPTY;
}

/**
 * Main extraction entry point.
 *
 * Strategy (in order):
 *   1. Each Groq key (GROQ_API_KEY, _2, _3) — tries llama-3.3-70b first, then llama-3.1-8b-instant
 *   2. Each OpenRouter key (OPENROUTER_API_KEY, _2) — llama-3.3-70b-instruct
 *
 * A key that returns 429 is marked exhausted for 5 minutes, then auto-recovers.
 * Falls back silently to EMPTY if all providers are exhausted or unavailable.
 * NOTE: OpenRouter exhaustion here (_exhaustedORKeys) is INDEPENDENT of Perplexity Sonar
 *       exhaustion (_exhaustedPerplexityKeys). A 429 on llama extraction never blocks Sonar.
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
      if (isExhausted(_exhaustedGroqKeys, key)) continue;

      // Primary model
      const result = await callGroq(text, entityName, entityType, country, key, GROQ_MODEL);
      if (result) {
        logger.debug({ entityName, source: result.source, hasEmail: !!result.email, owners: result.owners.length }, "AI extraction complete");
        return result;
      }

      // Fast fallback on same key (if not exhausted by the primary call)
      if (!isExhausted(_exhaustedGroqKeys, key)) {
        const fast = await callGroq(text, entityName, entityType, country, key, GROQ_MODEL_FAST);
        if (fast) {
          logger.debug({ entityName, source: fast.source, hasEmail: !!fast.email }, "AI extraction (fast model) complete");
          return fast;
        }
      }
    }

    // ── 2. Fall back to OpenRouter (llama extraction — separate from Perplexity) ──
    for (const key of getOpenRouterKeys()) {
      if (isExhausted(_exhaustedORKeys, key)) continue;
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
