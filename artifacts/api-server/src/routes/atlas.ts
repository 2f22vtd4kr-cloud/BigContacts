/**
 * Atlas Routes
 *
 * POST /api/ingest/atlas-run   — Launch the full Apex Atlas pipeline
 * DELETE /api/ingest/atlas-lock — Clear ghost Atlas lock
 * GET  /api/ingest/atlas-status — Current Atlas job status
 */

import { Router, type Request, type Response } from "express";
import { createJob, getActiveJob, getLatestJob, getJob, setActiveJob, updateJob, clearActiveJobIfOwned } from "../lib/job-queue";
import { runCanonicalAtlasPipeline, type CanonicalAtlasOptions } from "../src/lib/canonical-atlas-discovery";
import { runCanonicalSingleTargetInvestigation } from "../src/lib/canonical-single-target-runner";
import { CANONICAL_ATLAS_LAUNCH_BODY } from "../lib/atlas-launch-defaults";
import { logger } from "../lib/logger";

const router = Router();

router.post("/ingest/atlas-run", async (req: Request, res: Response): Promise<void> => {
  const existing = await getActiveJob("atlas-run");
  if (existing) {
    const job = await getJob(existing);
    if (job?.status === "running") {
      res.status(409).json({ error: "Atlas pipeline already running.", jobId: existing, status: job });
      return;
    }
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const singleTargetRaw = body.singleTargetId !== undefined ? Number(body.singleTargetId) : undefined;
  const singleTargetId = Number.isInteger(singleTargetRaw) && (singleTargetRaw as number) > 0 ? singleTargetRaw as number : undefined;
  const discoveryFirst = singleTargetId == null;

  const requestedResearchDepth = String(body.researchDepth ?? CANONICAL_ATLAS_LAUNCH_BODY.researchDepth).toLowerCase();
  const researchDepth = ["fast", "standard", "deep"].includes(requestedResearchDepth)
    ? requestedResearchDepth as CanonicalAtlasOptions["researchDepth"]
    : CANONICAL_ATLAS_LAUNCH_BODY.researchDepth;

  const opts: CanonicalAtlasOptions = {
    targetCount: Number(body.targetCount) || (discoveryFirst ? 3 : 1),
    researchDepth,
    targetTimeoutMs: Number(body.targetTimeoutMs) || (singleTargetId != null ? 420_000 : undefined),
  };

  const atlasJobId = await createJob("atlas-run");
  await setActiveJob("atlas-run", atlasJobId);
  await updateJob(atlasJobId, {
    status: "running",
    progress: 0,
    total: singleTargetId != null ? 3 : 4,
    atlasPhase: 0,
    atlasPhaseTotal: singleTargetId != null ? 3 : 4,
    message: "Atlas pipeline initializing…",
  });

  void (async () => {
    try {
      if (singleTargetId != null) {
        await runCanonicalSingleTargetInvestigation(atlasJobId, singleTargetId, {
          researchDepth,
          targetTimeoutMs: opts.targetTimeoutMs,
        });
      } else {
        await runCanonicalAtlasPipeline(atlasJobId, opts);
      }
    } catch (err: any) {
      logger.error({ err: err.message }, "[Atlas] Pipeline crashed");
      await updateJob(atlasJobId, {
        status: "failed",
        message: err.message ?? "Atlas pipeline crashed",
        finishedAt: new Date().toISOString(),
      });
      await clearActiveJobIfOwned("atlas-run", atlasJobId);
    }
  })();

  res.status(202).json({
    jobId: atlasJobId,
    pollUrl: `/api/ingest/job/${atlasJobId}`,
    phases: singleTargetId != null
      ? ["0 — Canonical launch / intake", "1 — Oversight assignment", "2 — Investigator research", "3 — Explicit promotion boundary"]
      : ["0 — Canonical discovery / intake", "1 — Oversight assignment", "2 — Investigator discovery", "3 — Target-scoped Investigator research", "4 — Final state"],
    options: opts,
    message: `Atlas pipeline started (job: ${atlasJobId}). Poll ${`/api/ingest/job/${atlasJobId}`} for progress.`,
  });
});

router.delete("/ingest/atlas-lock", async (_req: Request, res: Response): Promise<void> => {
  const activeJobId = await getActiveJob("atlas-run");
  const requestedJobId = Array.isArray(_req.query.jobId)
    ? String(_req.query.jobId[0] ?? "")
    : String(_req.query.jobId ?? "");
  const jobId = activeJobId ?? requestedJobId;
  if (!jobId) { res.json({ cleared: false, message: "No active Atlas lock or jobId supplied." }); return; }
  await updateJob(jobId, { status: "failed", message: "Killed manually.", finishedAt: new Date().toISOString() } as any);
  await clearActiveJobIfOwned("atlas-run", jobId);
  res.json({ cleared: true, jobId, message: activeJobId ? "Atlas cancellation requested." : "Stale Atlas job marked failed." });
});

router.delete("/ingest/atlas-lock/:jobId", async (req: Request, res: Response): Promise<void> => {
  const jobId = String(req.params.jobId ?? "");
  if (!jobId) { res.json({ cleared: false, message: "No Atlas job ID supplied." }); return; }
  await updateJob(jobId, { status: "failed", message: "Killed manually.", finishedAt: new Date().toISOString() } as any);
  await clearActiveJobIfOwned("atlas-run", jobId);
  res.json({ cleared: true, jobId, message: "Atlas job marked failed." });
});

router.get("/ingest/atlas-status", async (_req: Request, res: Response): Promise<void> => {
  const jobId = await getActiveJob("atlas-run");
  if (!jobId) {
    const latest = await getLatestJob("atlas-run");
    if (latest) {
      res.json({ ...latest, active: false, latest: true });
      return;
    }
    res.json({ status: "idle", message: "No Atlas run in progress." });
    return;
  }
  const job = await getJob(jobId);
  res.json({ ...job, jobId, active: true });
});

export default router;
