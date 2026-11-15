/**
 * Normalize an identity string for conservative full-name comparison.
 * NFKC reduces compatibility-form mismatches; punctuation and whitespace are
 * separators, never evidence that two different name tokens are equivalent.
 */
export function normalizeCandidateIdentityName(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

/**
 * Match a candidate's normalized full name as a token-bounded phrase.
 * Substring matching can incorrectly attribute "Joann Li" to "Ann Li".
 */
export function hasNonEmptyCandidateName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function candidateIdentityObserved(personName: string, observation: unknown): boolean {
  const normalizedName = normalizeCandidateIdentityName(personName);
  const rawName = personName.normalize("NFKC").trim();
  const rawText = typeof observation === "string" ? observation.normalize("NFKC") : "";
  if (!normalizedName) return false;

  // One-letter names need exact case and token boundaries so a common article
  // such as "a" cannot stand in for a person's name.
  if (Array.from(normalizedName).length === 1 && /^\p{Lu}$/u.test(rawName)) {
    const tokens = rawText.match(/[\p{L}\p{M}\p{N}_]+/gu) ?? [];
    return tokens.includes(rawName);
  }

  const normalizedText = normalizeCandidateIdentityName(rawText);
  return \` \${normalizedText} \`.includes(\` \${normalizedName} \`);
}
