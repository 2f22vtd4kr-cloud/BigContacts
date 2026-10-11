import { parseAtlasRunSnapshot } from "./atlas-run-status-contract";

export type ReactorAtlasPollStatus = "idle" | "queued" | "running" | "paused" | "done" | "failed" | "cancelled";

export type ReactorAtlasPoll = { runStatus: "idle"; jobId: null; job: null } | { runStatus: Exclude<ReactorAtlasPollStatus, "idle">; jobId: string; job: Record<string, unknown> };

/** Return null for an unknown response; only validated idle may clear UI state. */
export function parseReactorAtlasPoll(value: unknown): ReactorAtlasPoll | null {
  const snapshot = parseAtlasRunSnapshot(value);
  if (!snapshot) return null;
  if (!snapshot.jobId) return snapshot.active ? null : { runStatus: "idle", jobId: null, job: null };
  if (!snapshot.status) return null;
  const payload = value as Record<string, unknown>;
  const job = payload.job && typeof payload.job === "object" && !Array.isArray(payload.job) ? payload.job as Record<string, unknown> : null;
  if (!job || job.jobId !== snapshot.jobId) return null;
  return { runStatus: snapshot.status as Exclude<ReactorAtlasPollStatus, "idle">, jobId: snapshot.jobId, job };
}
