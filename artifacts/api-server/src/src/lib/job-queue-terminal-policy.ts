const TERMINAL_JOB_STATUSES = new Set(["done", "failed", "cancelled"]);

/**
 * Job IDs identify one execution, not a reusable lane. Once a job is terminal,
 * later progress/result/error callbacks must not mutate its final snapshot.
 */
export function canApplyJobPatch(currentStatus: string | null | undefined): boolean {
  return !TERMINAL_JOB_STATUSES.has(currentStatus ?? "");
}
