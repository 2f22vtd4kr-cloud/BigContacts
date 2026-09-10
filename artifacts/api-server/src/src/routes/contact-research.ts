import { Router, type Request, type Response } from "express";
import {
  getActiveJob,
  getJob,
  getLatestJob,
} from "../lib/job-queue";
import { CONTACT_RESEARCH_JOB_TYPE } from "../lib/contact-research-orchestrator";

const router = Router();

const RETIRED_MESSAGE =
  "The legacy contact-research control plane is retired. Use the canonical Atlas Investigator path; research strategy is model-owned.";

// Kept as an explicit retirement response so old UI/operator clients cannot
// silently invoke the former deterministic coordinator.
router.post("/ingest/contact-research", (_req: Request, res: Response): void => {
  res.status(410).json({ error: "Retired endpoint", message: RETIRED_MESSAGE });
});

router.get("/ingest/contact-research/status", async (_req: Request, res: Response): Promise<void> => {
  const activeId = await getActiveJob(CONTACT_RESEARCH_JOB_TYPE);
  const active = activeId ? await getJob(activeId) : null;
  const latest = await getLatestJob(CONTACT_RESEARCH_JOB_TYPE);
  res.json({
    retired: true,
    message: RETIRED_MESSAGE,
    active: active ? {
      jobId: active.jobId,
      status: active.status,
      progress: active.progress,
      total: active.total,
      targetIndex: active.targetIndex,
      targetTotal: active.targetTotal,
      currentTargetId: active.currentTargetId,
      currentPhase: active.currentPhase,
      errors: active.errors,
      message: active.message,
    } : null,
    latest: latest ? {
      jobId: latest.jobId,
      status: latest.status,
      outcome: latest.outcome,
      progress: latest.progress,
      total: latest.total,
      targetIndex: latest.targetIndex,
      targetTotal: latest.targetTotal,
      completedTargetIds: latest.completedTargetIds,
      failedTargetIds: latest.failedTargetIds,
      currentPhase: latest.currentPhase,
      message: latest.message,
    } : null,
  });
});

router.post("/ingest/contact-research/cancel", (_req: Request, res: Response): void => {
  res.status(410).json({ error: "Retired endpoint", message: RETIRED_MESSAGE });
});

export default router;
