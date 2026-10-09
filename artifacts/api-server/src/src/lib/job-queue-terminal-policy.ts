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

 
/**
 * Reconcile a possibly committed atomic job-creation script after its response
 * is lost. null means Redis could not confirm state; an empty hash means the
 * record is absent; any conflicting non-empty hash is not safe to launch.
 */
export function classifyJobCreationVerification(
  jobId: string,
  type: string,
  record: Record<string, string> | null,
): "durable" | "absent" | "indeterminate" | "conflict" {
  if (record === null) return "indeterminate";
  if (Object.keys(record).length === 0) return "absent";
  return record.jobId === jobId && record.type === type && record.status === "queued"
    ? "durable"
    : "conflict";
}
