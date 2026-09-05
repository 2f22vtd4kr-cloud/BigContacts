/**
 * Lightweight passage / snippet filter before LLM synthesis.
 * Prefer query-relevant sentences over full noisy page text (token economy + less drift).
 * Deterministic — no embeddings required.
 */

const SENTENCE_SPLIT = /(?<=[.!?])\s+(?=[A-Z0-9"'(])|\n+/;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9@.+_\-\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

/**
 * Score a passage against query tokens (overlap + light boosts for contact-ish cues).
 */
export function scorePassage(passage: string, queryTokens: Set<string>): number {
  if (!passage.trim() || queryTokens.size === 0) return 0;
  const tokens = tokenize(passage);
  if (tokens.length === 0) return 0;
  let hits = 0;
  for (const t of tokens) {
    if (queryTokens.has(t)) hits += 1;
  }
  const density = hits / Math.sqrt(tokens.length);
  let boost = 0;
  if (/@|linkedin\.com|tel:|\+\d|\bemail\b|\bphone\b|\bcontact\b/i.test(passage)) boost += 0.35;
  if (/https?:\/\//i.test(passage)) boost += 0.15;
  return density + boost;
}

/**
 * Filter and rank sentences/snippets for a search query.
 * Returns concatenated top passages, capped by maxChars.
 */
export function filterPassagesForQuery(
  text: string,
  query: string,
  opts?: { maxChars?: number; minScore?: number; maxPassages?: number },
): string {
  const maxChars = opts?.maxChars ?? 4_000;
  const minScore = opts?.minScore ?? 0.12;
  const maxPassages = opts?.maxPassages ?? 24;
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) return text.slice(0, maxChars);

  const rawParts = text
    .split(SENTENCE_SPLIT)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 40 && s.length <= 800);

  // Also accept short lines that look like contact evidence
  const extras = text
    .split(/\n+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 12 && s.length < 40 && /@|linkedin\.com|\+\d|\(\d{3}\)/i.test(s));

  const scored = [...rawParts, ...extras]
    .map((passage) => ({ passage, score: scorePassage(passage, queryTokens) }))
    .filter((row) => row.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPassages);

  if (scored.length === 0) {
    // Fallback: keep head of text so callers never get empty when source had content
    return text.slice(0, maxChars);
  }

  let out = "";
  for (const row of scored) {
    if (out.length + row.passage.length + 1 > maxChars) break;
    out += (out ? " " : "") + row.passage;
  }
  return out || text.slice(0, maxChars);
}

/**
 * Fail-closed URL gate for contact claims.
 * Returns only http(s) URLs; if allowed set provided, require membership / loose containment.
 */
export function filterClaimUrls(
  urls: unknown,
  allowed?: Iterable<string> | null,
): string[] {
  if (!Array.isArray(urls)) return [];
  const http = urls
    .filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u.trim()))
    .map((u) => u.trim())
    .slice(0, 12);
  if (!allowed) return [...new Set(http)];
  const allow = [...allowed].filter(Boolean);
  if (allow.length === 0) return [...new Set(http)];
  const kept = http.filter(
    (url) => allow.some((a) => url === a || url.includes(a) || a.includes(url)),
  );
  return [...new Set(kept)];
}

/** True when a contact vector may be admitted (at least one supporting URL). */
export function hasClaimUrlSupport(urls: string[] | null | undefined): boolean {
  return Array.isArray(urls) && urls.some((u) => /^https?:\/\//i.test(u));
}
