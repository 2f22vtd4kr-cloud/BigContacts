/**
 * Operator scoreboard analytic rubric (Vol 87) — pure, no DB.
 * Scores one fixture card vs a baseline agent answer summary.
 *
 * Scale per fixture: -1 | 0 | 1 | 2
 *  -1 harmful wrong-person direct contact
 *   0 empty / useless / baseline strictly better primary
 *   1 organization_contact correct OR social_only with good link OR tied
 *   2 direct_contact_candidate/verified with attributable primary and sources
 */

export type ScoreboardFixtureInput = {
  contactOutcome?: string | null;
  phone?: string | null;
  email?: string | null;
  phoneSource?: string | null;
  emailSource?: string | null;
  linkedinUrl?: string | null;
  hasSourceUrls?: boolean;
  identityCollisionRisk?: boolean;
  /** Operator judged wrong person on card */
  wrongPerson?: boolean;
  /** Baseline agent had a better primary public contact */
  baselineBetterPrimary?: boolean;
};

export function scoreFixtureCard(input: ScoreboardFixtureInput): -1 | 0 | 1 | 2 {
  if (input.wrongPerson || input.identityCollisionRisk) return -1;

  const outcome = String(input.contactOutcome ?? "none");
  const hasContact = Boolean(input.phone?.trim() || input.email?.trim());

  if (input.baselineBetterPrimary && !hasContact) return 0;

  const phoneSrc = String(input.phoneSource ?? "");
  const isNotice = phoneSrc === "EDGAR-Notice-Phone" || phoneSrc === "EDGAR-Notice";
  const isOrgScoped =
    phoneSrc.endsWith("-org") ||
    phoneSrc === "agentic-web-org" ||
    phoneSrc === "EDGAR-Phone" ||
    phoneSrc === "EDGAR-Issuer-Phone" ||
    phoneSrc === "CompaniesHouse-Phone";

  // Notice-line dig wins are first-class primary routes (Vol 296/453)
  if (
    isNotice &&
    hasContact &&
    input.hasSourceUrls !== false
  ) {
    return 2;
  }

  if (
    (outcome === "direct_contact_candidate" || outcome === "direct_contact_verified") &&
    hasContact &&
    input.hasSourceUrls !== false &&
    !isOrgScoped
  ) {
    return 2;
  }

  if (outcome === "organization_contact" && hasContact) return 1;
  if (outcome === "social_only" && input.linkedinUrl?.trim()) return 1;
  if (hasContact && outcome !== "none") return 1;

  if (input.baselineBetterPrimary) return 0;
  return 0;
}

export function meanScore(scores: Array<-1 | 0 | 1 | 2>): number {
  if (!scores.length) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/** Milestone gate Vol 100: mean ≥ 1.0 on ≥8 fixtures, zero -1s */
export function passesScoreboardMilestone(scores: Array<-1 | 0 | 1 | 2>): boolean {
  if (scores.length < 8) return false;
  if (scores.some((s) => s === -1)) return false;
  return meanScore(scores) >= 1.0;
}
