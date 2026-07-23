/**
 * Contact confidence score — pure deterministic function.
 *
 * Returns 0–100:
 *   email present        → +35
 *   phone present        → +25
 *   linkedinUrl          → +15
 *   telegramHandle       → +12  (primary for CIS/Russian HNWIs)
 *   twitterHandle        → +8
 *   instagramHandle      → +5
 *   any known address    → +5   (IRS/charity filing address adds directness)
 *
 * Max possible = 105, capped at 100.
 * Previously missed Twitter, Instagram, Telegram signals entirely.
 */

export function computeContactConfidence(entity: {
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  telegramHandle?: string | null;
  twitterHandle?: string | null;
  instagramHandle?: string | null;
  knownResidences?: string | null;
}): number {
  let score = 0;
  if (entity.email?.trim())          score += 35;
  if (entity.phone?.trim())          score += 25;
  if (entity.linkedinUrl?.trim())    score += 15;
  if (entity.telegramHandle?.trim()) score += 12;
  if (entity.twitterHandle?.trim())  score += 8;
  if (entity.instagramHandle?.trim()) score += 5;
  const res = entity.knownResidences;
  if (res && res !== "[]" && res !== "null" && res.trim().length > 2) score += 5;
  return Math.min(score, 100);
}
