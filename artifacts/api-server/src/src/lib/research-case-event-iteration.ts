import { sql, type SQL } from "drizzle-orm";

/** Acquire the same per-case transaction lock used by the database append-only event trigger. */
type ResearchCaseEventLockExecutor = { execute: (query: SQL) => unknown };
export async function lockResearchCaseEventAppendStream(tx: ResearchCaseEventLockExecutor, caseId: number): Promise<void> {
  if (!Number.isSafeInteger(caseId) || caseId <= 0) throw new Error("Research case event append lock requires a positive case ID.");
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('apex:research_case_events:case:' || ${caseId}::text))`);
}

/** Resolve an Investigator turn to a strictly new durable event iteration.
 * Investigator turn numbers and case-event iterations are different clocks:
 * Boss/Right-hand/control events can advance the event ledger between Investigator
 * turns. Preserve the turn number when it is ahead; otherwise advance beyond the
 * event high-water mark so append order never reuses an earlier iteration.
 */
export function resolveMonotonicResearchCaseIteration(recordTurn: number, latestPersistedIteration: number): number {
  const normalize = (value: number): number =>
    Number.isSafeInteger(value) && value >= 0 ? value : 0;
  return Math.max(normalize(recordTurn), normalize(latestPersistedIteration) + 1);
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
