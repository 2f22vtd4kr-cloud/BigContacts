const WRITABLE_JOB_STATUSES = new Set(["queued", "running", "paused"]);

/**
 * Job IDs identify one execution, not a reusable lane. Only known nonterminal
 * snapshots are writable; missing or unknown states fail closed because they
 * cannot safely establish that the job is still active.
 */
export function canApplyJobPatch(currentStatus: string | null | undefined): boolean {
  return WRITABLE_JOB_STATUSES.has(currentStatus ?? "");
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

export type ActiveJobReadClassification =
  | { state: "active"; jobId: string }
  | { state: "idle"; jobId: null }
  | { state: "unavailable"; jobId: null };

/**
 * A failed Redis read is not proof that a lane is idle. Keep those states
 * distinct so operator status surfaces never manufacture an "inactive" result.
 */
export function classifyActiveJobRead(
  readSucceeded: boolean,
  jobId: string | null,
): ActiveJobReadClassification {
  if (!readSucceeded) return { state: "unavailable", jobId: null };
  return jobId ? { state: "active", jobId } : { state: "idle", jobId: null };
}

export type ActiveJobLaneClassification = "active" | "terminal" | "unknown";

/** Classify only known job states; a malformed persisted status is not idle. */
export function classifyActiveJobLaneStatus(status: string | null | undefined): ActiveJobLaneClassification {
  if (status === "queued" || status === "running" || status === "paused") return "active";
  if (status === "done" || status === "failed" || status === "cancelled") return "terminal";
  return "unknown";
}
