/**
 * Contact confidence score — pure deterministic function.
 *
 * Returns 0–100:
 *   email present    → +40
 *   phone present    → +30
 *   linkedinUrl      → +20
 *   any known address→ +10
 */

export function computeContactConfidence(entity: {
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  knownResidences?: string | null;
}): number {
  let score = 0;
  if (entity.email?.trim()) score += 40;
  if (entity.phone?.trim()) score += 30;
  if (entity.linkedinUrl?.trim()) score += 20;
  const res = entity.knownResidences;
  if (res && res !== "[]" && res !== "null" && res.trim().length > 2) score += 10;
  return Math.min(score, 100);
}
