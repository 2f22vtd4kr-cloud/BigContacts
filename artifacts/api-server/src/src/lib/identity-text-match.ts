/**
 * Match a candidate's normalized full name as a token-bounded phrase.
 * Substring matching can incorrectly attribute "Joann Li" to "Ann Li".
 */
export function candidateIdentityObserved(personName: string, observation: unknown): boolean {
  const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
  const normalizedName = normalize(personName);
  const normalizedText = normalize(typeof observation === "string" ? observation : "");
  return normalizedName.length >= 3 && ` ${normalizedText} `.includes(` ${normalizedName} `);
}
