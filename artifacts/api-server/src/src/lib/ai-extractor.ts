import { apexOrientationFor } from "./apex-bureau-orientation";
/**
 * AI Extractor — Multi-source AI extraction layer for contact & person intelligence
 *
 * Search and extraction providers support the enrichment pipeline:
 *
 *   SEARCH / RESEARCH (return structured answers directly):
 *   - Perplexity Sonar Pro — live web-search model; synthesises from real sources
 *   - Gemini is intentionally absent from this search layer; it is text-only for Boss planning/review
 *
 *   SEARCH + GROQ EXTRACTION (return raw text excerpts, Groq extracts structure):
 *   - Tavily              — AI-native search; 7 live sources per query
 *   - Exa                 — neural/semantic retrieval; strong for people & company lookups
 *
 *   TEXT EXTRACTION (reads accumulated scraped text from all other phases):
 *   - Groq GPT-OSS-120B  — free, 6 000 req/day, 32k context; pulls out anything regex missed:
 *       emails in obfuscated form, phone numbers, social handles, owner names in any language
 *
 * Every source falls back silently if its key is unset or quota is hit.
 */

import { logger } from "./logger";
import {
  sanitizePublicEmail,
  sanitizePublicPhone,
  sanitizePublicSocialUrl,
} from "./contact-validation";
import { formatReachabilityDirective, type ReachabilityDirective } from "./reachability-realism";
import { canonicalizeUrl } from "./evidence-ledger";
import { GROQ_DEFAULT_MODEL as GROQ_MODEL, GROQ_FAST_MODELS } from "./groq-models";
import {
  adjudicateFinalTargetReview,
  buildFinalTargetReviewPrompt,
  type FinalTargetReviewInput,
  type FinalTargetReviewResult,
} from "./final-target-review";

const GROQ_API        = "https://api.groq.com/openai/v1/chat/completions";

const OPENROUTER_API       = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL     = "openai/gpt-oss-120b";
const PERPLEXITY_MODEL     = "perplexity/sonar-pro";
const PERPLEXITY_FALLBACK  = "perplexity/sonar";
const PERPLEXITY_DIRECT_API      = "https://api.perplexity.ai/chat/completions";
const PERPLEXITY_DIRECT_MODEL    = "sonar-pro";
const PERPLEXITY_DIRECT_FALLBACK = "sonar";
const TAVILY_API = "https://api.tavily.com/search";
const EXA_API = "https://api.exa.ai/search";
const EXHAUSTED_TTL_MS = 5 * 60 * 1000;
const PROVIDER_QUOTA_TTL_MS = 24 * 60 * 60 * 1000;
function isExhausted(map: Map<string, number>, key: string): boolean { const exp = map.get(key); if (!exp) return false; if (Date.now() > exp) { map.delete(key); return false; } return true; }
function retryAfterMs(response: Response, fallbackMs = EXHAUSTED_TTL_MS): number { const value = response.headers.get("retry-after"); if (!value) return fallbackMs; const seconds = Number(value); if (Number.isFinite(seconds) && seconds >= 0) return Math.min(Math.max(seconds * 1000, 1_000), 15 * 60 * 1000); const timestamp = Date.parse(value); if (Number.isFinite(timestamp)) return Math.min(Math.max(timestamp - Date.now(), 1_000), 15 * 60 * 1000); return fallbackMs; }
