/**
 * Validate the canonical active-job response before projecting it into UI state.
 * A malformed HTTP-200 payload is not evidence that a previously active job is idle.
 */

export type AtlasRunSnapshot = {
  active: boolean;
  status?: string;
  message?: string;
  jobId?: string;
  targetName?: string;
  phase?: number;
  phaseTotal?: number;
};

type JsonRecord = Record<string, unknown>;

const ACTIVE_STATUSES = new Set(["queued", "running", "paused"]);
const TERMINAL_STATUSES = new Set(["done", "failed", "cancelled"]);

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isJobId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function snapshotFor(jobId: string, job: JsonRecord, status: string, active: boolean): AtlasRunSnapshot {
  return {
    active,
    status,
    message: optionalString(job.message),
    jobId,
    targetName: optionalString(job.targetName) ?? optionalString(job.currentTarget),
    phase: optionalNumber(job.atlasPhase ?? job.progress),
    phaseTotal: optionalNumber(job.atlasPhaseTotal ?? job.total),
  };
}

/**
 * The server contract is:
 * - idle: active=false, jobId=null, job=null, no jobStatus;
 * - active: active=true, jobId matches job.jobId, with an active lane status;
 * - terminal: active=false, jobId matches job.jobId, and jobStatus matches its
 *   terminal job.status.
 *
 * Unknown or contradictory successful payloads return null so callers keep the
 * last known snapshot rather than manufacturing an idle run.
 */
export function parseAtlasRunSnapshot(value: unknown): AtlasRunSnapshot | null {
  if (!isRecord(value) || value.type !== "atlas-run" || typeof value.active !== "boolean") return null;

  const jobId = value.jobId;
  const job = isRecord(value.job) ? value.job : null;

  if (value.active) {
    if (!isJobId(jobId) || !job || job.jobId !== jobId) return null;
    const status = job.status;
    if (typeof status !== "string" || !ACTIVE_STATUSES.has(status)) return null;
    return snapshotFor(jobId, job, status, true);
  }

  if (jobId === null) {
    return value.job === null && value.jobStatus === undefined
      ? { active: false }
      : null;
  }

  if (!isJobId(jobId) || !job || job.jobId !== jobId) return null;
  const status = value.jobStatus;
  if (typeof status !== "string" || !TERMINAL_STATUSES.has(status) || job.status !== status) return null;
  return snapshotFor(jobId, job, status, false);
}
