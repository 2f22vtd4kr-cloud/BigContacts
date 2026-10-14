/** Resolve an Investigator turn against the durable case-event iteration high-water mark. */
export function resolveMonotonicResearchCaseIteration(recordTurn: number, latestPersistedIteration: number): number {
  const normalize = (value: number): number =>
    Number.isSafeInteger(value) && value >= 0 ? value : 0;
  return Math.max(normalize(recordTurn), normalize(latestPersistedIteration));
}
