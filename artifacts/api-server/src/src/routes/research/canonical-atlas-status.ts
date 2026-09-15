import { Router, type Request, type Response } from "express";
import { getActiveJob, getJob, getLatestJob } from "../../lib/job-queue";
import { getRecentDigSpans } from "../../lib/dig-span";

const router = Router();

/**
 * Canonical Atlas status plane.
 *
 * The historical atlas router is intentionally quarantined at HTTP 410, but
 * Reactor Live still needs a read-only status/telemetry boundary. Keep that
 * boundary separate from the retired launch/control router so UI telemetry
 * cannot accidentally resurrect legacy Atlas execution.
 */
router.get("/ingest/atlas-status", async (_req: Request, res: Response): Promise<void> => {
  const activeJobId = await getActiveJob("atlas-run");
  const job = activeJobId
    ? await getJob(activeJobId)
    : await getLatestJob("atlas-run");
  const jobId = activeJobId ?? job?.jobId ?? null;
  const recentSpans = jobId ? getRecentDigSpans(jobId, 50) : [];

  res.setHeader("Cache-Control", "no-store");
  res.json({
    runStatus: job?.status ?? "idle",
    status: job?.status ?? "idle",
    jobId,
    job,
    recentSpans,
    updatedAt: new Date().toISOString(),
  });
});

export default router;
