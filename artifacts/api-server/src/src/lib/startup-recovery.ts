/**
 * Startup recovery — lifecycle-only boot hygiene.
 *
 * This module deliberately contains no research, enrichment, discovery, or
 * HTTP triggers. Startup may recover process-owned job locks, but research
 * trajectory is launched only by the explicit canonical Atlas control plane.
 */
import {
  getActiveJob,
  getJob,
  updateJob,
  clearActiveJob,
} from "./job-queue";
import { logger } from "./logger";

const PROCESS_BOOT_MS = Date.now();

// Job names are lifecycle identifiers only. They do not select research tools
// or define a research sequence.
const PROCESS_OWNED_JOB_TYPES = [
  "atlas-run",
  "contact-research",
  "discovery",
  "target-research",
] as const;

async function clearGhostJobLocks(): Promise<void> {
  for (const type of PROCESS_OWNED_JOB_TYPES) {
    try {
      const jobId = await getActiveJob(type);
      if (!jobId) continue;
      const job = await getJob(jobId);
      const startedAtMs = job?.startedAt ? Date.parse(job.startedAt) : NaN;
      const predatesProcess = Number.isFinite(startedAtMs) && startedAtMs < PROCESS_BOOT_MS;
      if (!predatesProcess) continue;
      if (job?.status !== "running" && job?.status !== "queued" && job?.status !== "paused") continue;

      await updateJob(jobId, {
        status: "failed",
        message: "Job stopped before completion because the server process restarted.",
        finishedAt: new Date().toISOString(),
      });
      await clearActiveJob(type);
      logger.warn({ type, jobId }, "Cleared process-owned job lock after restart");
    } catch (err) {
      logger.warn(
        { type, err: err instanceof Error ? err.message : String(err) },
        "Startup job-lock recovery failed (non-fatal)",
      );
    }
  }
}

/** Main boot recovery entry point. No research is initiated here. */
export async function coldStartRecovery(): Promise<void> {
  await clearGhostJobLocks();
  logger.info("Startup recovery complete — research remains operator/Atlas initiated");
}
