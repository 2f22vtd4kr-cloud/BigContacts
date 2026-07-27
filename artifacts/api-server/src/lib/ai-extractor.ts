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

const OPENROUTER_API       = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL     = "meta-llama/llama-3.3-70b-instruct"; // fast + free-tier friendly
const PERPLEXITY_MODEL     = "perplexity/sonar-pro";               // via OpenRouter: live web-search (fallback only)
const PERPLEXITY_FALLBACK  = "perplexity/sonar";                   // via OpenRouter: cheaper fallback

// Direct Perplexity API — preferred over OpenRouter-routed Sonar (no per-key credit balance issues)
const PERPLEXITY_DIRECT_API      = "https://api.perplexity.ai/chat/completions";
const PERPLEXITY_DIRECT_MODEL    = "sonar-pro";   // model name WITHOUT the "perplexity/" prefix when calling directly
const PERPLEXITY_DIRECT_FALLBACK = "sonar";       // cheaper direct fallback

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
const _exhaustedGroqKeys              = new Map<string, number>();
const _exhaustedORKeys                = new Map<string, number>(); // for llama text extraction only
const _exhaustedPerplexityKeys        = new Map<string, number>(); // for OpenRouter-routed Sonar only
const _exhaustedPerplexityDirectKeys  = new Map<string, number>(); // for direct Perplexity API only

function getGroqKeys(): string[] {
  return ["GROQ_API_KEY", "GROQ_API_KEY_2", "GROQ_API_KEY_3"]
    .map(k => process.env[k] ?? "")
    .filter(k => k.length > 0);
}

function getOpenRouterKeys(): string[] {
  // Scan OPENROUTER_API_KEY, OPENROUTER_API_KEY_2 … OPENROUTER_API_KEY_8
  // Any new key added as a secret is picked up automatically on next restart.
  const names = ["OPENROUTER_API_KEY"];
  for (let i = 2; i <= 8; i++) names.push(`OPENROUTER_API_KEY_${i}`);
  return names.map(k => process.env[k] ?? "").filter(k => k.length > 0);
}

/** Returns all direct Perplexity API keys (PERPLEXITY_API_KEY, _1 … _8). */
function getPerplexityDirectKeys(): string[] {
  const names = ["PERPLEXITY_API_KEY"];
  for (let i = 1; i <= 8; i++) names.push(`PERPLEXITY_API_KEY_${i}`);
  return names.map(k => process.env[k] ?? "").filter(k => k.length > 0);
}

/** Personal contact vector for a named owner/founder discovered in text */
export interface OwnerContact {
  name:      string;        // Full name (First Last)
  instagram: string | null; // Personal Instagram URL — NOT the venue account
  twitter:   string | null; // Personal Twitter/X URL
  linkedin:  string | null; // Personal LinkedIn /in/ profile URL
  email:     string | null; // Personal or direct email if stated
}

export type OwnershipRole =
  | "owner"
  | "beneficial_owner"
  | "founder"
  | "controller"
  | "operator"
  | "director_officer"
  | "associated_person";

export interface OwnerResolution extends OwnerContact {
  role: OwnershipRole;
  ownershipStatus: "confirmed" | "probable" | "not_established";
  basis: string | null;
  sourceUrls: string[];
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
  ownerResolutions: OwnerResolution[]; // role + ownership basis; never auto-merged
  ownershipSummary: string | null;
  ownershipSources: string[];
  source:    "groq-llama-70b" | "groq-llama-8b" | "openrouter" | "perplexity-sonar" | "none";
  citations: string[];            // URLs Perplexity actually searched — use as evidence sources
}

const EMPTY: AIExtractResult = {
  email: null, phone: null, linkedin: null,
  instagram: null, twitter: null,
  owners: [], ownerContacts: [], ownerResolutions: [],
  ownershipSummary: null, ownershipSources: [],
  source: "none",
  citations: [],
};


/**
 * Build the prompt. Ownership resolution is deliberately the first objective:
 * finding the public contact page without identifying who owns or controls the
 * business is an incomplete OSINT result.
 * Text is capped at 5 500 chars to leave room for the response.
 */
function buildPrompt(text: string, entityName: string, entityType: string, country: string | null): string {
  const ctx = country ? ` (${country})` : "";
  const truncated = text.slice(0, 7000);
  const isOrg = entityType === "Corporation" || entityType === "Trust";

  return `You are the ownership-resolution lead for an OSINT intelligence platform. Analyze this web text about "${entityName}"${ctx} (${entityType}).

PRIMARY OBJECTIVE — WHO OWNS, CONTROLS, OR RUNS THIS ENTITY?
Do not stop at an organisation email or phone number. Identify every named person explicitly connected to this entity and classify the connection:
- owner / beneficial_owner: the text explicitly says they own, hold, control, or beneficially own it
- founder: explicitly founded or co-founded it (not proof of current ownership)
- controller: explicitly controls the entity, parent, holding company, or operating group
- operator: explicitly runs, manages, or operates the venue/business (not proof of ownership)
- director_officer: an explicitly named director, president, CEO, officer, or legal representative (not proof of ownership)
- associated_person: named in a relevant business context when no stronger role is established

Ownership claims must be evidence-led. Never turn a director, manager, spokesperson, chef, investor, landlord, or person merely mentioned in an article into an owner. If ownership is not established, say so in the role/status fields while still returning the person and their weaker role.

SECONDARY OBJECTIVE — find the entity's public contact vectors and personal handles for the named principals.

TEXT:
${truncated}

Return ONLY valid JSON — no explanation, no markdown:
{
  "ownershipSummary": "one sentence stating the strongest ownership/control finding, or 'Ownership not established in the supplied text.'",
  "email": "venue/org contact email or null",
  "phone": "full international number with country code (e.g. +33 4 93 43 03 43) or null",
  "linkedin": "${isOrg ? "https://linkedin.com/company/... org page or null" : "https://linkedin.com/in/profile or null"}",
  "instagram": "${isOrg ? "venue/brand Instagram URL (e.g. https://instagram.com/baolicannes) or null" : "personal Instagram URL or null"}",
  "twitter": "venue/org Twitter/X URL or null",
  "ownerResolutions": [
    {
      "name": "Full Name (First Last minimum)",
      "role": "owner | beneficial_owner | founder | controller | operator | director_officer | associated_person",
      "ownershipStatus": "confirmed | probable | not_established",
      "basis": "short exact relationship/basis from the text, or null",
      "sourceUrls": ["https://source-url.example/article"],
      "instagram": "PERSONAL Instagram URL (not the venue account — e.g. https://instagram.com/christoph_cau) or null",
      "twitter": "personal Twitter/X URL or null",
      "linkedin": "personal LinkedIn /in/ profile URL or null",
      "email": "personal or direct email if explicitly stated or null"
    }
  ]
}

Rules:
- Only extract what is EXPLICITLY present in the text above — never guess or infer
- ownershipSummary must explicitly say when ownership is not established
- ownerResolutions is the primary output; return named people even when they are only directors/operators, but label those roles honestly
- basis must be a short quote or faithful paraphrase from the text, never an invented explanation
- sourceUrls must contain only URLs explicitly present in the text; return [] when none are present
- email/phone: prefer the primary business/venue contact (reservations@, contact@, info@)
- phone: must have ≥7 digits; include country code when present
- instagram/twitter (top level): the venue or org account (handle matches the business name)
- ownerResolutions: max 8 people; full name required (at least First + Last)
  * instagram/twitter in ownerResolutions: their PERSONAL handles (not the venue account)
    e.g. if text says "Christophe Caucino (@christoph_cau)" → instagram: "https://instagram.com/christoph_cau"
  * linkedin in ownerContacts: /in/ profiles only (not /company/)
  * email in ownerContacts: personal or named email only (not info@ or reservations@)
- Return null for any field not found; return [] for ownerResolutions if none found
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
    const ownerResolutions: OwnerResolution[] = [];
    const validRoles = new Set<OwnershipRole>([
      "owner", "beneficial_owner", "founder", "controller", "operator",
      "director_officer", "associated_person",
    ]);
    const validStatuses = new Set<OwnerResolution["ownershipStatus"]>([
      "confirmed", "probable", "not_established",
    ]);

    const rawResolutions = Array.isArray(parsed["ownerResolutions"])
      ? parsed["ownerResolutions"]
      : parsed["ownerContacts"];
    if (Array.isArray(rawResolutions)) {
      for (const oc of rawResolutions) {
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
        const rawRole = clean((oc as any)["role"])?.toLowerCase() as OwnershipRole | null;
        const rawStatus = clean((oc as any)["ownershipStatus"])?.toLowerCase() as OwnerResolution["ownershipStatus"] | null;
        const rawSources = Array.isArray((oc as any)["sourceUrls"])
          ? (oc as any)["sourceUrls"].filter((u: unknown): u is string => typeof u === "string" && /^https?:\/\//i.test(u)).slice(0, 8)
          : [];
        ownerResolutions.push({
          ...contact,
          role: rawRole && validRoles.has(rawRole) ? rawRole : "associated_person",
          ownershipStatus: rawStatus && validStatuses.has(rawStatus) ? rawStatus : "not_established",
          basis: clean((oc as any)["basis"]),
          sourceUrls: rawSources,
        });
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
      ownerResolutions: ownerResolutions.slice(0, 8),
      ownershipSummary: clean(parsed["ownershipSummary"]),
      ownershipSources: Array.isArray(parsed["sources"])
        ? parsed["sources"]
          .filter((u: unknown): u is string => typeof u === "string" && /^https?:\/\//i.test(u))
          .slice(0, 8)
        : [],
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
    max_tokens: 1000,
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
    max_tokens: 1000,
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

export function buildPerplexityPrompt(
  entityName: string,
  entityType: string,
  country: string | null,
  context: { tradingName?: string | null; city?: string | null } = {},
): string {
  const ctx = country ? ` in ${country}` : "";
  const publicName = context.tradingName && context.tradingName !== entityName
    ? `"${context.tradingName}" (legal/entity name: "${entityName}")`
    : `"${entityName}"`;
  const city = context.city ? `\nKnown city/location context: ${context.city}` : "";
  const isOrg = entityType === "Corporation" || entityType === "Trust";

  // Strong geographic/sector scope guard — prevents name-clash contamination.
  // e.g. "Target Global" (Berlin VC) must not pull in Target Corporation (US retailer).
  const locationCtx = [context.city, country].filter(Boolean).join(", ");
  const disambig = locationCtx
    ? `\nSCOPE LOCK: You are researching ONLY the ${locationCtx}-based ${isOrg ? "company/institution" : "individual"} named ${publicName}. If any other entity (retailer, sports team, consumer brand, government body, etc.) shares this name or a similar name, IGNORE it entirely. Do NOT mix data from different entities. All output must relate exclusively to the ${locationCtx} entity.`
    : "";

  return `You are conducting Phase 0 OSINT for ${publicName}${ctx}. Goal: find every named human decision-maker and their direct contact path.${city}${disambig}

${isOrg ? `This is a company/business/institution. Execute this research in order:

STEP 1 — NAMED DECISION-MAKERS (highest priority for contact purposes):
Find ALL named partners, principals, and executives. For venture capital / private equity / investment firms specifically:
- Every General Partner (GP), Managing Partner, Founding Partner, Partner by full name
- Every Principal, Director, Vice President, Associate Partner involved in deals
- CEO, CFO, COO, and any C-suite if different from the partners
- Every named team member on the official team/people/partners page

For other companies: CEO, Deputy CEO, Managing Director, all C-suite/Executive Committee (COMEX/EXCO) members, department heads.

For EVERY named person: their individual direct email (construct from verified domain pattern even if not explicit), personal LinkedIn /in/ URL, Twitter/X handle.
Search: official website team/people/partners page, LinkedIn company page team section, Crunchbase, press interviews, conference speaker bios, news articles, PitchBook/AngelList for VC firms.

STEP 2 — EMAIL PATTERN:
Identify the organisation's verified email format (e.g. firstname.lastname@domain.fr or f.lastname@domain.com).
Use this pattern to construct direct emails for every named executive even if not explicitly stated.
Include the pattern in ownershipSummary.

STEP 3 — OWNERSHIP / CONTROL (for institutional context):
Who owns, controls, or beneficially owns this entity? Parent company, holding, state body, or private shareholders.
Do not confuse a director/CEO with an owner unless a source explicitly says so.

STEP 4 — ORGANISATION CONTACT:
Official HQ address(es), main phone line(s), general email, LinkedIn company page.` 
  : `This is an individual. Find:\n1. Direct email\n2. Phone\n3. LinkedIn /in/ URL\n4. Instagram, Twitter/X\n5. Associated companies and roles`}

Return ONLY this JSON — no preamble, no explanation, no markdown:
{
  "ownershipSummary": "one sentence: email pattern + strongest ownership finding, e.g. 'Email pattern: firstname.lastname@bpifrance.fr; owned 50/50 by French State and Caisse des Dépôts.'",
  "email": "general org contact email or null",
  "phone": "+XX XXX XXX or null",
  "linkedin": "${isOrg ? "https://linkedin.com/company/... org page or null" : "https://linkedin.com/in/profile or null"}",
  "instagram": "org Instagram URL or null",
  "twitter": "org Twitter/X URL or null",
  "ownerResolutions": [
    {
      "name": "First Last",
      "role": "owner | beneficial_owner | founder | controller | operator | director_officer | associated_person",
      "ownershipStatus": "confirmed | probable | not_established",
      "basis": "their title and organisation, e.g. 'CEO of Bpifrance since 2013'",
      "sourceUrls": ["source URL"],
      "instagram": "personal Instagram URL or null",
      "twitter": "personal Twitter/X URL or null",
      "linkedin": "personal LinkedIn /in/ URL or null",
      "email": "direct personal email constructed from verified pattern, e.g. nicolas.dufourcq@bpifrance.fr, or null"
    }
  ],
  "sources": ["URLs used"]
}

Hard requirements:
- Return up to 8 named HUMAN individuals — executives first, then owners.
- Named executives with director_officer role are MORE valuable than institutional shareholders for contact purposes. Always include them even when the beneficial owner is a state body or holding company.
- Construct direct individual emails from the verified pattern for every named executive.
- ownershipSummary MUST state the verified email pattern if found.
- sourceUrls and sources: only real URLs from your search.
- Return [] for ownerResolutions only if absolutely no named human is found anywhere.
`;
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
  context: { tradingName?: string | null; city?: string | null } = {},
): Promise<AIExtractResult> {
  logger.info({ entityName, entityType, country }, "Phase 0: firing Perplexity Sonar research");
  const prompt = buildPerplexityPrompt(entityName, entityType, country, context);

  /** Shared response parser — same for both direct and OpenRouter paths. */
  function parsePerplexityResponse(
    data: any,
    label: string,
  ): AIExtractResult | null {
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    const citations: string[] = Array.isArray(data?.citations) ? data.citations.slice(0, 8) : [];
    logger.info({ entityName, rawLen: raw.length, citations: citations.length, label }, "Phase 0: Perplexity raw response received");

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn({ raw: raw.slice(0, 300), label }, "Phase 0: no JSON block in response");
      return null;
    }
    const parsed = parseAIResponse(jsonMatch[0], "perplexity-sonar");
    if (!parsed) {
      logger.warn({ json: jsonMatch[0].slice(0, 300), label }, "Phase 0: parseAIResponse returned null");
      return null;
    }
    logger.info(
      { entityName, hasEmail: !!parsed.email, hasPhone: !!parsed.phone, hasIG: !!parsed.instagram,
        hasLinkedIn: !!parsed.linkedin, owners: parsed.owners.length, ownerContacts: parsed.ownerContacts.length,
        citations: citations.length, model: label },
      "Phase 0: Perplexity Sonar research complete",
    );
    return {
      ...parsed, citations,
      ownershipSources: [...new Set([...parsed.ownershipSources, ...citations])].slice(0, 8),
      ownerResolutions: parsed.ownerResolutions.map(o => ({
        ...o, sourceUrls: o.sourceUrls.length > 0 ? o.sourceUrls : citations.slice(0, 4),
      })),
    };
  }

  // ── PATH A: Direct Perplexity API (preferred — no per-key credit balance issues) ──────────
  // Rotates through PERPLEXITY_API_KEY, PERPLEXITY_API_KEY_1 … _8 (any that are set).
  const directKeys = getPerplexityDirectKeys();
  for (const directKey of directKeys) {
    if (isExhausted(_exhaustedPerplexityDirectKeys, directKey)) continue;
    let keySucceeded = false;
    for (const [model, label, maxTokens] of [
      [PERPLEXITY_DIRECT_MODEL,    "sonar-pro[direct]", 2000],
      [PERPLEXITY_DIRECT_FALLBACK, "sonar[direct]",     1000],
    ] as [string, string, number][]) {
      try {
        const resp = await fetch(PERPLEXITY_DIRECT_API, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${directKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_tokens: maxTokens,
          }),
          signal: AbortSignal.timeout(35_000),
        });

        if (resp.status === 429) {
          _exhaustedPerplexityDirectKeys.set(directKey, Date.now() + EXHAUSTED_TTL_MS);
          logger.warn({ label }, "Phase 0: direct Perplexity rate limit — key exhausted 5 min");
          break; // try next key
        }
        if (resp.status === 402) {
          logger.warn({ label }, "Phase 0: direct Perplexity insufficient credits — trying cheaper model");
          continue; // try sonar fallback on same key
        }
        if (!resp.ok) {
          const errText = await resp.text().catch(() => "");
          logger.warn({ status: resp.status, err: errText.slice(0, 300), label }, "Phase 0: direct Perplexity API error");
          continue;
        }

        const data = await resp.json() as any;
        const parsed = parsePerplexityResponse(data, label);
        if (parsed) return { ...parsed, source: "perplexity-sonar" };
        keySucceeded = true;
      } catch (err: any) {
        logger.warn({ err: err?.message, label }, "Phase 0: direct Perplexity call threw");
      }
    }
    if (keySucceeded) break; // parsed returned null but key worked — don't burn remaining keys
  }
  if (directKeys.length > 0) {
    // Had direct keys but all failed or exhausted — fall through to OpenRouter
    logger.warn({ entityName, keyCount: directKeys.length }, "Phase 0: all direct Perplexity keys failed — falling back to OpenRouter-routed Sonar");
  }

  // ── PATH B: OpenRouter-routed Sonar (fallback — subject to per-account credit limits) ─────
  const perpKeys = getOpenRouterKeys();
  if (perpKeys.every(k => isExhausted(_exhaustedPerplexityKeys, k))) {
    logger.warn({ entityName }, "Phase 0: all OpenRouter keys exhausted for Perplexity — skipping");
    return EMPTY;
  }

  /** Call one OpenRouter-routed Perplexity model on one key. */
  async function callViaOpenRouter(
    model: string,
    label: string,
    key: string,
    maxTokens: number,
  ): Promise<{ parsed: AIExtractResult | null; hardFail: boolean }> {
    try {
      const resp = await fetch(OPENROUTER_API, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://apex-finder.replit.app",
          "X-Title": "ApexFinder OSINT",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          max_tokens: maxTokens,
        }),
        signal: AbortSignal.timeout(35_000),
      });

      if (resp.status === 429) {
        _exhaustedPerplexityKeys.set(key, Date.now() + EXHAUSTED_TTL_MS);
        logger.warn({ label }, "Phase 0 [OR]: Perplexity rate limit — key exhausted 5 min");
        return { parsed: null, hardFail: true };
      }
      if (resp.status === 402) {
        const errText = await resp.text().catch(() => "");
        const affordMatch = errText.match(/can only afford (\d+)/);
        const canAfford = affordMatch ? parseInt(affordMatch[1]!) : 0;
        logger.warn({ label, canAfford, requested: maxTokens }, "Phase 0 [OR]: insufficient credits — trying cheaper model");
        return { parsed: null, hardFail: false };
      }
      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        logger.warn({ status: resp.status, err: errText.slice(0, 300), label }, "Phase 0 [OR]: Perplexity API error");
        return { parsed: null, hardFail: false };
      }

      const data = await resp.json() as any;
      const parsed = parsePerplexityResponse(data, label);
      return { parsed, hardFail: false };
    } catch (err: any) {
      logger.warn({ err: err?.message, label }, "Phase 0 [OR]: Perplexity call threw");
      return { parsed: null, hardFail: false };
    }
  }

  // Per-key: try sonar-pro → fall back to sonar on the same key before moving to next key.
  for (const key of perpKeys) {
    if (isExhausted(_exhaustedPerplexityKeys, key)) continue;

    const pro = await callViaOpenRouter(PERPLEXITY_MODEL, "sonar-pro", key, 2000);
    if (pro.parsed) return { ...pro.parsed, source: "perplexity-sonar" };
    if (pro.hardFail) continue;

    const standard = await callViaOpenRouter(PERPLEXITY_FALLBACK, "sonar", key, 1000);
    if (standard.parsed) return { ...standard.parsed, source: "perplexity-sonar" };
    if (standard.hardFail) continue;
  }

  logger.warn({ entityName }, "Phase 0: Perplexity returned no usable data — all paths exhausted");
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
