/**
 * Evidence-preserving passage helper.
 *
 * Ranking is still available to callers that want a relevance view, but this
 * boundary never discards observed source material. The bureau must be able
 * to revisit the complete observation rather than inherit a lossy summary.
 */

const SENTENCE_SPLIT = /(?<=[.!?。！？؟؛։।॥])\s*(?=[\p{L}\p{N}"'(])|\n+/u;
const NO_SPACE_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}\p{Script=Tibetan}]/u;

/** Unicode-aware relevance tokens only; observed source text is never rewritten. */
function tokenize(text: string): string[] {
  const normalized = text.normalize("NFKC").toLowerCase().normalize("NFC");
  const words = normalized.match(/[\p{L}\p{M}\p{N}@.+_-]+/gu) ?? [];
  const tokens: string[] = [];
  for (const word of words) {
    tokens.push(word);
    // Add an accent-insensitive alternate for wholly Latin words without removing
    // marks from the primary token. This keeps Unicode names intact while helping
    // common OCR/typing variants such as cafe/café retrieve the same passage.
    const letters = Array.from(word).filter((char) => /\p{L}/u.test(char));
    if (letters.length > 0 && letters.every((char) => /\p{Script=Latin}/u.test(char))) {
      const folded = word.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");
      if (folded !== word) tokens.push(folded);
    }
    // Chinese/Japanese/Korean and several scripts commonly omit spaces between
    // words. Index overlapping bigrams in addition to the whole token so a short
    // query phrase can match inside a longer source string.
    if (NO_SPACE_SCRIPT.test(word)) {
      const chars = Array.from(word);
      for (let index = 0; index + 1 < chars.length; index += 1) {
        tokens.push(chars[index]! + chars[index + 1]!);
      }
      if (chars.length === 1) tokens.push(chars[0]!);
    }
  }
  return [...new Set(tokens)].filter((token) => token.length >= 2 || NO_SPACE_SCRIPT.test(token));
}


export function scorePassage(passage: string, queryTokens: Set<string>): number {
  if (!passage.trim() || queryTokens.size === 0) return 0;
  const tokens = tokenize(passage);
  const normalizedQueryTokens = new Set([...queryTokens].flatMap((token) => tokenize(token)));
  if (tokens.length === 0 || normalizedQueryTokens.size === 0) return 0;
  let hits = 0;
  for (const token of tokens) {
    if (normalizedQueryTokens.has(token)) hits += 1;
  }
  const density = hits / Math.sqrt(tokens.length);
  let boost = 0;
  if (/@|linkedin\.com|tel:|\+\d|\bemail\b|\bphone\b|\bcontact\b/i.test(passage)) boost += 0.35;
  if (/https?:\/\//i.test(passage)) boost += 0.15;
  return density + boost;
}
/**
 * Return the complete supplied material. `maxChars`, `minScore`, and
 * `maxPassages` remain accepted for source compatibility but are deliberately
 * non-destructive: they can no longer remove evidence from the bureau state.
 */
export function filterPassagesForQuery(
  text: string,
  _query: string,
  _opts?: { maxChars?: number; minScore?: number; maxPassages?: number },
): string {
  return String(text ?? "");
}

/** Fail-closed URL gate for contact claims; it validates scheme but does not
 * discard additional observed source URLs merely because there are many. */
export function filterClaimUrls(
  urls: unknown,
  allowed?: Iterable<string> | null,
): string[] {
  if (!Array.isArray(urls)) return [];
  const http = urls
    .filter((u): u is string => typeof u === "string" && /^https:\/\//i.test(u.trim()))
    .map((u) => u.trim());
  if (!allowed) return [...new Set(http)];
  const allow = [...allowed].filter(Boolean);
  if (allow.length === 0) return [...new Set(http)];
  const kept = http.filter((url) => allow.some((a) => url === a || url.includes(a) || a.includes(url)));
  return [...new Set(kept)];
}

export function hasClaimUrlSupport(urls: string[] | null | undefined): boolean {
  return Array.isArray(urls) && urls.some((u) => /^https:\/\/\S+$/i.test(u));
}
