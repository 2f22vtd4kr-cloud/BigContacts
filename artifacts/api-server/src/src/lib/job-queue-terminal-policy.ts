const TERMINAL_JOB_STATUSES = new Set(["done", "failed", "cancelled"]);

/**
 * Job IDs identify one execution, not a reusable lane. Once a job is terminal,
 * later progress/result/error callbacks must not mutate its final snapshot.
 */
export function canApplyJobPatch(currentStatus: string | null | undefined): boolean {
  return !TERMINAL_JOB_STATUSES.has(currentStatus ?? "");
}

/** Only explicitly memory-only jobs may accept updates while Redis is unavailable. */
export function canApplyJobPatchWithoutRedis(currentStatus: string | null | undefined, memoryOnly: boolean): boolean {
  return memoryOnly && canApplyJobPatch(currentStatus);
}
