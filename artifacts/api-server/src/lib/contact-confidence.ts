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

// ── J0 Measurement Contract ───────────────────────────────────────────────────

/**
 * Outcome labels for each enriched entity (J0).
 *
 * Only direct_contact_candidate and direct_contact_verified are terminal
 * enrichment states (J1). All other outcomes keep the entity eligible for
 * follow-up passes.
 */
export type ContactOutcome =
  | "none"                      // not enriched / no evidence found
  | "evidence_only"             // website, address, filing, or org record only
  | "social_only"               // LinkedIn/Twitter/Instagram/Telegram, no email/phone
  | "organization_contact"      // company phone/inbox/contact-page (not personal)
  | "direct_contact_candidate"  // person-level email or phone (public evidence)
  | "direct_contact_verified";  // validated person-level contact with attribution

/**
 * Determine the contact outcome for an entity based on its current fields.
 *
 * Used by every enricher to set the contactOutcome column after a pass,
 * and by the backfill endpoint to classify existing records (J0).
 *
 * J1 rule: social_only and evidence_only are NOT terminal — they must remain
 * eligible for direct-contact follow-up passes.
 */
export function computeContactOutcome(entity: {
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  twitterHandle?: string | null;
  instagramHandle?: string | null;
  telegramHandle?: string | null;
  website?: string | null;        // from metadata["website"]
  bizLocation?: string | null;    // from metadata["bizLocation"]
  validatedDirectContact?: boolean;
}): ContactOutcome {
  if (
    entity.validatedDirectContact &&
    (entity.email?.trim() || entity.phone?.trim())
  ) return "direct_contact_verified";

  // Direct contact vectors are the only terminal outcome
  if (entity.email?.trim() || entity.phone?.trim()) return "direct_contact_candidate";

  // Social presence — valuable but not terminal (J1)
  if (
    entity.linkedinUrl?.trim() ||
    entity.twitterHandle?.trim() ||
    entity.instagramHandle?.trim() ||
    entity.telegramHandle?.trim()
  ) return "social_only";

  // Evidence (website, registered address) — useful for follow-up but not contactable
  if (entity.website?.trim() || entity.bizLocation?.trim()) return "evidence_only";

  return "none";
}
