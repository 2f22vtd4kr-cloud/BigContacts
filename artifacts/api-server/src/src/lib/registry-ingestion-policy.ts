/**
 * Conservative starting assessment for public-registry ingestion.
 *
 * Registry participation, officer appointments, and a filing are discovery
 * leads, not independently adjudicated wealth or direct-contact evidence.
 * These rows start reviewable; a future source-backed Investigator decision
 * can revise the assessment once immutable evidence has been persisted.
 */
export type RegistryIngestionAssessment = {
  prior: number;
  hasRecentActivity: false;
  recentActivityDays: 400;
  proximityScore: 3;
  confidence: "LOW";
  lastObservedAt: string;
  reviewOnly: boolean;
  wealthStatus: "unverified" | "not_assessed";
};

export function deriveRegistryIngestionAssessment(
  entityType: string,
  observedAt: Date = new Date(),
): RegistryIngestionAssessment {
  const personCandidate = entityType === "PersonCandidate" || entityType === "HNWI" || entityType === "Gatekeeper";
  return {
    // Never import SC 13D/G, officer-role, recent-filing, or entity-name
    // heuristics into the probability that a specific person is an HNWI.
    prior: personCandidate ? 0.15 : 0.2,
    hasRecentActivity: false,
    recentActivityDays: 400,
    proximityScore: 3,
    confidence: "LOW",
    lastObservedAt: observedAt.toISOString(),
    reviewOnly: personCandidate,
    wealthStatus: personCandidate ? "unverified" : "not_assessed",
  };
}
