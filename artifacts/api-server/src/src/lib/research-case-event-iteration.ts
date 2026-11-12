import { sql, type SQL } from "drizzle-orm";

/** Only Investigator-authored case events may select or support discovery review cards. */
export function isInvestigatorAuthoredResearchEvent(actorRole: unknown): boolean {
  return actorRole === "head_investigator";
}

/** Acquire the same per-case transaction lock used by the database append-only event trigger. */
type ResearchCaseEventLockExecutor = { execute: (query: SQL) => unknown };
export async function lockResearchCaseEventAppendStream(tx: ResearchCaseEventLockExecutor, caseId: number): Promise<void> {
  if (!Number.isSafeInteger(caseId) || caseId <= 0) throw new Error("Research case event append lock requires a positive case ID.");
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('apex:research_case_events:case:' || ${caseId}::text))`);
}

/** Resolve an Investigator turn against the durable event-iteration high-water mark.
 * Several events (observation, claim, promotion and validation) may legitimately
 * share one Investigator turn. The opening control-plane events use
 * nextResearchCaseEventIteration instead, because they are not Investigator turns.
 */
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
