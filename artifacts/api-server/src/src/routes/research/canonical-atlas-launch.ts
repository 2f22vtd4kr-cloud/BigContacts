import { Router, type Request, type Response } from "express";
import { or, sql } from "drizzle-orm";
import { db, researchCasesTable } from "@workspace/db";
import { createJob, getActiveJob, getJob, updateJob } from "../../lib/job-queue";
import { claimCanonicalJob, releaseCanonicalJob } from "../../lib/canonical-job-lock";
import { enablePermanentRedis } from "../../lib/redis";
import { runCanonicalAtlasPipeline } from "../../lib/canonical-atlas-discovery";
import { runCanonicalSingleTargetInvestigation } from "../../lib/canonical-single-target-runner";

const router = Router();

/** Canonical Atlas launch boundary: every public Atlas launch enters the model-owned control plane. */
router.post("/ingest/atlas-run", async (req: Request, res: Response): Promise<void> => {
  await enablePermanentRedis();

  const existingId = await getActiveJob("atlas-run");
  if (existingId) {
    const existing = await getJob(existingId);
    if (existing?.status === "running" || existing?.status === "paused") {
      res.status(409).json({ error: "Atlas pipeline already running.", jobId: existingId, status: existing });
      return;
    }
    try {
      await releaseCanonicalJob("atlas-run", existingId);
    } catch {
      res.status(503).json({ error: "Atlas launch lock could not be safely released; refusing a new launch." });
      return;
    }
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const singleTargetRaw = body.singleTargetId !== undefined ? Number(body.singleTargetId) : NaN;
  const singleTargetId = Number.isInteger(singleTargetRaw) && singleTargetRaw > 0 ? singleTargetRaw : undefined;
  const targetCount = Math.max(1, Math.min(20, Math.trunc(Number(body.targetCount) || 3)));
  const researchDepth = typeof body.researchDepth === "string" && ["fast", "standard", "deep"].includes(body.researchDepth)
    ? body.researchDepth as "fast" | "standard" | "deep"
    : undefined;
  const targetTimeoutMs = Math.min(Math.max(Number(body.targetTimeoutMs) || 420_000, 30_000), 600_000);

  const atlasJobId = await createJob("atlas-run");
  const claimed = await claimCanonicalJob("atlas-run", atlasJobId);
  if (!claimed) {
    await updateJob(atlasJobId, { status: "cancelled", outcome: "incomplete", message: "Canonical Atlas launch rejected: another instance owns the distributed launch lock.", finishedAt: new Date().toISOString() });
    res.status(409).json({ error: "Atlas pipeline already running." });
    return;
  }

  // claimCanonicalJob owns the distributed pointer. Do not perform a second
  // unconditional SET here: if the process is descheduled long enough for its
  // lease to expire and another launch claims the key, an unconditional write
  // would overwrite the newer owner's lock.
  await updateJob(atlasJobId, {
    status: "running",
    progress: 0,
    total: singleTargetId ? 1 : targetCount,
    atlasPhase: 0,
    atlasPhaseTotal: singleTargetId ? 1 : 4,
    message: singleTargetId ? "Canonical single-target investigation initializing…" : "Canonical model-owned discovery initializing…",
  });

  void (async () => {
    try {
      if (singleTargetId) {
        await runCanonicalSingleTargetInvestigation(atlasJobId, singleTargetId, { researchDepth, targetTimeoutMs });
      } else {
        await runCanonicalAtlasPipeline(atlasJobId, { targetCount, researchDepth, targetTimeoutMs });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Canonical Atlas pipeline failed";
      await updateJob(atlasJobId, { status: "failed", outcome: "incomplete", message, finishedAt: new Date().toISOString() });
    } finally {
      try {
        await releaseCanonicalJob("atlas-run", atlasJobId);
      } catch {
        // Keep the durable TTL lease when release is unavailable; never delete another owner's lock.
      }
    }
  })();

  res.status(202).json({
    jobId: atlasJobId,
    pollUrl: `/api/ingest/job/${atlasJobId}`,
    message: singleTargetId ? `Canonical single-target investigation started (job: ${atlasJobId}).` : `Canonical model-owned discovery started (job: ${atlasJobId}).`,
    options: { targetCount, singleTargetId: singleTargetId ?? null, researchDepth: researchDepth ?? "configured", targetTimeoutMs },
  });
});

/**
 * Canonical operator stop. Cancellation is durable in PostgreSQL before the
 * Redis job state is changed, so trusted-contact promotion cannot race a stop
 * and win merely because the Redis and database operations were ordered apart.
 */
router.post("/ingest/atlas-stop", async (req: Request, res: Response): Promise<void> => {
  const activeJobId = await getActiveJob("atlas-run");
  if (!activeJobId) {
    res.status(404).json({ ok: false, message: "No active Atlas job to stop." });
    return;
  }
  const requestedJobId = typeof req.body?.jobId === "string" ? req.body.jobId.trim() : "";
  if (requestedJobId && requestedJobId !== activeJobId) {
    res.status(409).json({ ok: false, message: "Requested job is not the active Atlas job.", activeJobId });
    return;
  }
  const now = new Date();
  try {
    await db.update(researchCasesTable)
      .set({ status: "review", currentAction: "canonical-atlas-cancelled", updatedAt: now })
      .where(or(
        sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${activeJobId}`,
        sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${activeJobId}`,
      ));
  } catch (error) {
    res.status(503).json({ ok: false, message: "Atlas stop could not establish the durable database cancellation fence; job remains active.", error: error instanceof Error ? error.message : String(error) });
    return;
  }

  await updateJob(activeJobId, {
    status: "cancelled",
    outcome: "incomplete",
    message: "Stopped by operator.",
    finishedAt: now.toISOString(),
  });
  res.json({ ok: true, jobId: activeJobId, status: "cancelled", message: "Atlas stopped." });
});

export default router;
