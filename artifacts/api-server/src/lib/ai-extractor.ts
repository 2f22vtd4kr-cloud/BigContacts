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
 *
 * Falls back silently if GROQ_API_KEY is unset or quota is hit — pipeline continues
 * with regex-only results.
 */

import { logger } from "./logger";

const GROQ_API   = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
// Fallback model if primary hits rate limit
const GROQ_MODEL_FAST = "llama-3.1-8b-instant";

export interface AIExtractResult {
  email:     string | null;
  phone:     string | null;
  linkedin:  string | null;
  instagram: string | null;
  twitter:   string | null;
  owners:    string[];   // Discovered person names (review-only, never auto-merged)
  source:    "groq-llama-70b" | "groq-llama-8b" | "none";
}

const EMPTY: AIExtractResult = {
  email: null, phone: null, linkedin: null,
  instagram: null, twitter: null, owners: [], source: "none",
};

function getKey(): string | null {
  return process.env["GROQ_API_KEY"] ?? null;
}

/**
 * Build the prompt. Keeps it tight — Groq charges by token.
 * Text is capped at 6 000 chars to leave room for the response.
 */
function buildPrompt(text: string, entityName: string, entityType: string, country: string | null): string {
  const ctx = country ? ` (${country})` : "";
  const truncated = text.slice(0, 6000);
  return `You are an OSINT research assistant. Analyze this web search text about "${entityName}"${ctx} (${entityType}) and extract verifiable contact information and person names that are EXPLICITLY stated in the text.

TEXT:
${truncated}

Return ONLY a valid JSON object — no explanation, no markdown:
{
  "email": "address@domain.com or null",
  "phone": "full international number or null",
  "linkedin": "https://linkedin.com/in/handle or null",
  "instagram": "https://instagram.com/handle or null",
  "twitter": "https://x.com/handle or null",
  "owners": ["Full Name", "Full Name 2"]
}

Rules:
- Only extract what is EXPLICITLY present in the text above
- email: prefer business/venue contact over personal; must contain @
- phone: include country code if present; must have ≥7 digits
- linkedin/instagram/twitter: full URL only
- owners: founders, owners, CEOs, directors named in text; full names (First + Last minimum); max 5
- Return null for any field not found; return [] for owners if none found
- Do NOT invent or infer anything not stated`;
}

async function callGroq(
  text: string,
  entityName: string,
  entityType: string,
  country: string | null,
  model: string,
): Promise<AIExtractResult | null> {
  const key = getKey();
  if (!key) return null;

  const prompt = buildPrompt(text, entityName, entityType, country);

  const body = JSON.stringify({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
    max_tokens: 400,
    response_format: { type: "json_object" },
  });

  try {
    const resp = await fetch(GROQ_API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body,
      signal: AbortSignal.timeout(20_000),
    });

    if (resp.status === 429) {
      // Rate limit — caller handles fallback
      logger.debug({ model }, "Groq rate limit hit");
      return null;
    }

    if (!resp.ok) {
      const err = await resp.text().catch(() => "");
      logger.debug({ status: resp.status, err: err.slice(0, 200), model }, "Groq API error");
      return null;
    }

    const data = await resp.json() as any;
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Record<string, unknown>;

    const clean = (v: unknown): string | null => {
      if (typeof v !== "string" || !v.trim()) return null;
      const s = v.trim();
      return (s === "null" || s === "undefined" || s.length < 3) ? null : s;
    };

    const owners: string[] = [];
    if (Array.isArray(parsed["owners"])) {
      for (const o of parsed["owners"]) {
        if (typeof o === "string" && o.trim().includes(" ") && o.trim().length >= 4 && o.trim().length <= 60) {
          owners.push(o.trim());
        }
      }
    }

    const src = model === GROQ_MODEL ? "groq-llama-70b" : "groq-llama-8b";
    return {
      email:     clean(parsed["email"]),
      phone:     clean(parsed["phone"]),
      linkedin:  clean(parsed["linkedin"]),
      instagram: clean(parsed["instagram"]),
      twitter:   clean(parsed["twitter"]),
      owners:    owners.slice(0, 5),
      source:    src,
    };
  } catch (err: any) {
    logger.debug({ err: err?.message, model }, "Groq extraction failed");
    return null;
  }
}

/**
 * Main extraction entry point.
 * Tries llama-3.3-70b first; falls back to llama-3.1-8b-instant on rate limit.
 * Returns EMPTY result (source: "none") if Groq is unavailable — never throws.
 */
export async function extractWithAI(
  text: string,
  entityName: string,
  entityType: string,
  country: string | null = null,
): Promise<AIExtractResult> {
  if (!getKey() || !text || text.trim().length < 50) return EMPTY;

  try {
    const result = await callGroq(text, entityName, entityType, country, GROQ_MODEL);
    if (result) {
      logger.debug({ entityName, source: result.source, hasEmail: !!result.email, owners: result.owners.length }, "AI extraction complete");
      return result;
    }

    // Rate limit on primary — try faster model
    const fallback = await callGroq(text, entityName, entityType, country, GROQ_MODEL_FAST);
    if (fallback) {
      logger.debug({ entityName, source: fallback.source, hasEmail: !!fallback.email }, "AI extraction (fallback model) complete");
      return fallback;
    }
  } catch (err: any) {
    logger.debug({ err: err?.message }, "AI extractor outer catch");
  }

  return EMPTY;
}
