/** Resolve an Investigator turn against the durable case-event iteration high-water mark. */
export function resolveMonotonicResearchCaseIteration(recordTurn: number, latestPersistedIteration: number): number {
  const normalize = (value: number): number =>
    Number.isSafeInteger(value) && value >= 0 ? value : 0;
  return Math.max(normalize(recordTurn), normalize(latestPersistedIteration));
}

/**
 * Choose the next event iteration after both the case counter and durable
 * event ledger. The ledger may be ahead after earlier partial/non-coupled
 * writes, so the case counter alone is not a safe high-water mark.
 */
export function nextResearchCaseEventIteration(
  caseIteration: number | null | undefined,
  latestPersistedIteration: number | null | undefined,
): number {
  const normalize = (value: number | null | undefined): number =>
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
  return Math.max(normalize(caseIteration), normalize(latestPersistedIteration)) + 1;
}
