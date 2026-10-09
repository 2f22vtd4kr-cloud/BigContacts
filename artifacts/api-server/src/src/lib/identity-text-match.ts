/**
 * Normalize an identity string for conservative full-name comparison.
 * NFKC reduces compatibility-form mismatches; punctuation and whitespace are
 * separators, never evidence that two different name tokens are equivalent.
 */
export function normalizeCandidateIdentityName(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[^\\p{L}\\p{N}]+/gu, " ").trim().replace(/\\s+/g, " ");
}

/**
 * Match a candidate's normalized full name as a token-bounded phrase.
 * Substring matching can incorrectly attribute "Joann Li" to "Ann Li".
 */
export function candidateIdentityObserved(personName: string, observation: unknown): boolean {
  const normalizedName = normalizeCandidateIdentityName(personName);
  const normalizedText = normalizeCandidateIdentityName(typeof observation === "string" ? observation : "");
  return normalizedName.length >= 3 && ` ${normalizedText} `.includes(` ${normalizedName} `);
}
