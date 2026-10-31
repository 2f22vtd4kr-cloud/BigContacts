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
  /** A registry record cannot establish a network relationship to a gatekeeper. */
  hasGatekeeperConnection: false;
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
    hasGatekeeperConnection: false,
    recentActivityDays: 400,
    proximityScore: 3,
    confidence: "LOW",
    lastObservedAt: observedAt.toISOString(),
    reviewOnly: personCandidate,
    wealthStatus: personCandidate ? "unverified" : "not_assessed",
  };
}


/**
 * Return the names that need person-name validation before a registry batch is
 * persisted. Unverified registry classifications are deliberately normalised
 * to PersonCandidate before this point; the legacy labels remain included for
 * compatibility with callers that still pass them.
 */
export type RegistryIngestionBatchRow = {
  name?: string | null;
  type?: string | null;
};

export function registryPersonCandidateNames(
  rows: readonly RegistryIngestionBatchRow[],
): string[] {
  return rows
    .filter((row) => ["PersonCandidate", "HNWI", "Gatekeeper"].includes(row.type ?? ""))
    .map((row) => typeof row.name === "string" ? row.name : "")
    .filter((name) => name.trim().length > 0);
}

/**
 * Apply the same persistence policy after person-name validation. Company and
 * trust records remain eligible for broad registry seeding; person candidates
 * survive only when their exact name passed the existing validation gate.
 */
export function filterRegistryIngestionBatchRows<T extends RegistryIngestionBatchRow>(
  rows: readonly T[],
  validPersonNames: ReadonlySet<string>,
  preferPersons: boolean,
): T[] {
  return rows.filter((row) => {
    const type = row.type ?? "";
    if (preferPersons && (type === "Corporation" || type === "Trust")) return false;
    if (type === "Corporation" || type === "Trust") return true;
    return validPersonNames.has(typeof row.name === "string" ? row.name : "");
  });
}
