import { Router, type Request, type Response } from "express";
import {
  clearActiveJobIfMatches,
  createJob,
  getActiveJob,
  getJob,
  setActiveJob,
  updateJob,
} from "../../lib/job-queue";
import { enablePermanentRedis } from "../../lib/redis";
import { runCanonicalAtlasPipeline } from "../../lib/canonical-atlas-discovery";
import { runCanonicalSingleTargetInvestigation } from "../../lib/canonical-single-target-runner";

const router = Router();

/**
 * Canonical Atlas launch boundary.
 *
 * The historical atlas-orchestrator remains in the repository for controlled
 * retirement, but it is not a launch path. Every public Atlas launch enters
 * the model-owned discovery/single-target control plane here.
 */
router.post("/ingest/atlas-run", async (req: Request, res: Response): Promise<void> => {
  // Manual mode intentionally defers permanent Redis until an operator starts
  // a run. Canonical launch is itself that explicit operator action; enable it
  // before reading/writing the job lock so canonical launches get the same
  // durable job semantics as the retired launch path.
  await enablePermanentRedis();

  const existingId = await getActiveJob("atlas-run");
  if (existingId) {
    const existing = await getJob(existingId);
    if (existing?.status === "running" || existing?.status === "paused") {
      res.status(409).json({ error: "Atlas pipeline already running.", jobId: existingId, status: existing });
      return;
    }
    await clearActiveJobIfMatches("atlas-run", existingId);
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const singleTargetRaw = body.singleTargetId !== undefined ? Number(body.singleTargetId) : NaN;
  const singleTargetId = Number.isInteger(singleTargetRaw) && singleTargetRaw > 0 ? singleTargetRaw : undefined;
  const targetCount = Math.max(1, Math.min(20, Math.trunc(Number(body.targetCount) || 3)));
  const researchDepth = typeof body.researchDepth === "string"
    && ["fast", "standard", "deep"].includes(body.researchDepth)
    ? body.researchDepth as "fast" | "standard" | "deep"
    : undefined;
  const targetTimeoutMs = Math.min(Math.max(Number(body.targetTimeoutMs) || 420_000, 30_000), 600_000);

  const atlasJobId = await createJob("atlas-run");
  await setActiveJob("atlas-run", atlasJobId);
  await updateJob(atlasJobId, {
    status: "running",
    progress: 0,
    total: singleTargetId ? 1 : targetCount,
    atlasPhase: 0,
    atlasPhaseTotal: singleTargetId ? 1 : 4,
    message: singleTargetId
      ? "Canonical single-target investigation initializing…"
      : "Canonical model-owned discovery initializing…",
  });

  void (async () => {
    try {
      if (singleTargetId) {
        await runCanonicalSingleTargetInvestigation(atlasJobId, singleTargetId, {
          researchDepth,
          targetTimeoutMs,
        });
      } else {
        await runCanonicalAtlasPipeline(atlasJobId, {
          targetCount,
          researchDepth,
          targetTimeoutMs,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Canonical Atlas pipeline failed";
      await updateJob(atlasJobId, {
        status: "failed",
        outcome: "incomplete",
        message,
        finishedAt: new Date().toISOString(),
      });
      await clearActiveJobIfMatches("atlas-run", atlasJobId);
    }
  })();

  res.status(202).json({
    jobId: atlasJobId,
    pollUrl: `/api/ingest/job/${atlasJobId}`,
    message: singleTargetId
      ? `Canonical single-target investigation started (job: ${atlasJobId}).`
      : `Canonical model-owned discovery started (job: ${atlasJobId}).`,
    options: { targetCount, singleTargetId: singleTargetId ?? null, researchDepth: researchDepth ?? "configured", targetTimeoutMs },
  });
});

export default router;
