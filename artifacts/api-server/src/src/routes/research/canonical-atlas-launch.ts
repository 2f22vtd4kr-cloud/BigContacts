import { Router, type Request, type Response } from "express";
import { and, eq, or, sql } from "drizzle-orm";
import { db, researchCasesTable } from "@workspace/db";
import { clearJobCancellationRequest, createJob, getActiveJobStrict, getJob, getJobStrict, requestJobCancellation, updateJob } from "../../lib/job-queue";
import { claimCanonicalJob, releaseCanonicalJob } from "../../lib/canonical-job-lock";
import { enablePermanentRedis } from "../../lib/redis";
import { runCanonicalAtlasPipeline } from "../../lib/canonical-atlas-discovery";
import { runCanonicalSingleTargetInvestigation } from "../../lib/canonical-single-target-runner";
import { checkAtlasSchemaReadiness } from "../../lib/schema-readiness";
import { describeThrownProviderError } from "../../lib/provider-error-diagnostics";
import { classifyActiveJobLaneStatus } from "../../lib/job-queue-terminal-policy";
import { withProviderScope } from "../../lib/provider-gate";
import { parseCanonicalSingleTargetId } from "../../middlewares/normalize-atlas-launch-body";

const router = Router();

async function fenceStaleCanonicalCases(currentJobId: string): Promise<void> {
  await db.update(researchCasesTable)
    .set({
      status: "review",
      currentAction: "canonical-lease-lost",
      updatedAt: new Date(),
    })
    .where(and(
      eq(researchCasesTable.status, "active"),
      or(
        sql`(${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId') IS NOT NULL AND ${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' <> ${currentJobId}`,
        sql`(${researchCasesTable.caseFile}::jsonb ->> 'caseType') = 'discovery' AND (${researchCasesTable.caseFile}::jsonb ->> 'jobId') IS NOT NULL AND ${researchCasesTable.caseFile}::jsonb ->> 'jobId' <> ${currentJobId}`,
      ),
    ));
}

/** Canonical Atlas launch boundary: every public Atlas launch enters the model-owned control plane. */
router.post("/ingest/atlas-run", async (req: Request, res: Response): Promise<void> => {
  let atlasJobId: string | null = null;
  let lockClaimed = false;
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const parsedTargetId = parseCanonicalSingleTargetId(body);
    if (parsedTargetId.kind === "invalid") {
      res.status(400).json({
        error: "singleTargetId must be a positive safe integer when supplied.",
        code: "INVALID_SINGLE_TARGET_ID",
      });
      return;
    }
    const singleTargetId = parsedTargetId.kind === "single-target" ? parsedTargetId.id : undefined;

    const schema = await checkAtlasSchemaReadiness();
    if (!schema.ready) {
      res.status(503).json({
        error: "Atlas database schema is not ready for canonical research.",
        code: "DATABASE_SCHEMA_INCOMPATIBLE",
        missingTables: schema.missingTables,
        missingColumns: schema.missingColumns,
        missingInvariants: schema.missingInvariants,
        remediation: "Run the repository's explicit schema initialization command, then restart the canonical API workflow.",
      });
      return;
    }

    await enablePermanentRedis();

  const existingId = await getActiveJobStrict("atlas-run");
  if (existingId) {
    const existing = await getJobStrict(existingId);
    if (!existing) {
      res.status(503).json({ error: "Atlas launch lock points to a missing job record; refusing to assume the lane is idle.", code: "JOB_STATE_INCONSISTENT", jobId: existingId });
      return;
    }
    // A lock owner is authoritative until its job reaches a terminal state.
    // This includes queued jobs: superseding one during the tiny window between
    // lock claim and job-state persistence could orphan a live pipeline owner.
    const terminal = existing?.status === "done" || existing?.status === "failed" || existing?.status === "cancelled";
    if (!terminal) {
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

  const targetCount = Math.max(1, Math.min(20, Math.trunc(Number(body.targetCount) || 3)));
  const researchDepth = typeof body.researchDepth === "string" && ["fast", "standard", "deep"].includes(body.researchDepth)
    ? body.researchDepth as "fast" | "standard" | "deep"
    : undefined;
  const targetTimeoutMs = Math.min(Math.max(Number(body.targetTimeoutMs) || 420_000, 30_000), 600_000);

  atlasJobId = await createJob("atlas-run");
  const claimed = await claimCanonicalJob("atlas-run", atlasJobId);
  if (!claimed) {
    await updateJob(atlasJobId, { status: "cancelled", outcome: "incomplete", message: "Canonical Atlas launch rejected: another instance owns the distributed launch lock.", finishedAt: new Date().toISOString() });
    res.status(409).json({ error: "Atlas pipeline already running." });
    return;
  }

  lockClaimed = true;
  // A crashed/partitioned owner can disappear after the Redis lease expires
  // without getting a final renewal callback. Once this job owns the canonical
  // lock, any other active canonical case is therefore stale and must be fenced
  // before the new pipeline can mutate the control plane.
  await fenceStaleCanonicalCases(atlasJobId);
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
      await withProviderScope(`atlas-run:${atlasJobId}`, async () => {
        if (singleTargetId) {
          await runCanonicalSingleTargetInvestigation(atlasJobId!, singleTargetId, { researchDepth, targetTimeoutMs });
        } else {
          await runCanonicalAtlasPipeline(atlasJobId!, { targetCount, researchDepth, targetTimeoutMs });
        }
      });
    } catch (error) {
      const diagnostic = describeThrownProviderError(error);
      const message = `Canonical Atlas pipeline failed (class=${diagnostic.errorName}; code=${diagnostic.errorCode ?? "none"}; digest=${diagnostic.messageDigest ?? "none"})`;
      try {
        await db.update(researchCasesTable)
          .set({ status: "review", currentAction: "canonical-atlas-failed", updatedAt: new Date() })
          .where(and(
            eq(researchCasesTable.caseType, "target"),
            eq(researchCasesTable.status, "active"),
            sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${atlasJobId}`,
          ));
      } catch {
        // Preserve the original job failure even if durable case cleanup is unavailable.
      }
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
  } catch (error) {
    const diagnostic = describeThrownProviderError(error);
    const message = `Canonical Atlas launch infrastructure unavailable (class=${diagnostic.errorName}; code=${diagnostic.errorCode ?? "none"}; digest=${diagnostic.messageDigest ?? "none"})`;
    if (atlasJobId) {
      await updateJob(atlasJobId, { status: "failed", outcome: "incomplete", message, finishedAt: new Date().toISOString() }).catch(() => undefined);
    }
    if (atlasJobId) {
      await releaseCanonicalJob("atlas-run", atlasJobId).catch(() => undefined);
    }
    if (!res.headersSent) res.status(503).json({ error: message, jobId: atlasJobId });
  }
});

/**
 * Canonical operator stop. Cancellation is durable in PostgreSQL before the
 * Redis job state is changed, so trusted-contact promotion cannot race a stop
 * and win merely because the Redis and database operations were ordered apart.
 */
router.post("/ingest/atlas-stop", async (req: Request, res: Response): Promise<void> => {
  let activeJobId: string | null;
  try {
    await enablePermanentRedis();
    activeJobId = await getActiveJobStrict("atlas-run");
  } catch {
    res.status(503).json({ ok: false, code: "JOB_STATE_UNAVAILABLE", message: "Atlas cannot confirm whether a job is active because the job-state store is unavailable; no stop was claimed." });
    return;
  }
  if (!activeJobId) {
    res.status(404).json({ ok: false, message: "No active Atlas job to stop." });
    return;
  }
  const requestedJobId = typeof req.body?.jobId === "string" ? req.body.jobId.trim() : "";
  if (requestedJobId && requestedJobId !== activeJobId) {
    res.status(409).json({ ok: false, message: "Requested job is not the active Atlas job.", activeJobId });
    return;
  }
  let activeJob;
  try {
    activeJob = await getJobStrict(activeJobId);
  } catch {
    res.status(503).json({ ok: false, code: "JOB_STATE_UNAVAILABLE", message: "Atlas cannot confirm the job record because the job-state store is unavailable; no stop was claimed." });
    return;
  }
  if (!activeJob) {
    res.status(503).json({ ok: false, code: "JOB_STATE_INCONSISTENT", message: "Atlas active-job lock points to a missing job record; no stop was claimed." });
    return;
  }

  // An active-job key can briefly outlive its job's terminal transition.
  // Never overwrite the real terminal result or mutate completed cases just
  // because the lease-release callback has not yet run.
  const laneStatus = classifyActiveJobLaneStatus(activeJob.status);
  if (laneStatus === "terminal") {
    res.json({
      ok: true,
      jobId: activeJobId,
      status: activeJob.status,
      message: activeJob.status === "cancelled"
        ? "Atlas was already stopped."
        : "Atlas job is already terminal; no stop was applied.",
    });
    return;
  }
  if (laneStatus !== "active") {
    res.status(503).json({
      ok: false,
      code: "JOB_STATE_INCONSISTENT",
      message: "Persisted Atlas job status is unrecognized; no stop was claimed.",
      jobId: activeJobId,
      status: activeJob.status,
    });
    return;
  }

  const now = new Date();
  const casePredicate = and(
    eq(researchCasesTable.status, "active"),
    or(
      sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${activeJobId}`,
      sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${activeJobId}`,
    ),
    sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled', 'canonical-lease-lost')`,
  );
  let matchingCases: Array<{ id: number }>;
  try {
    matchingCases = await db.select({ id: researchCasesTable.id })
      .from(researchCasesTable)
      .where(casePredicate)
      .limit(2);
  } catch (error) {
    res.status(503).json({
      ok: false,
      code: "CANCELLATION_FENCE_UNCONFIRMED",
      message: "Atlas could not identify the durable active case; no stop was claimed.",
      error: `database cancellation lookup failure (digest=${describeThrownProviderError(error).messageDigest ?? "none"})`,
    });
    return;
  }
  if (matchingCases.length !== 1) {
    res.status(503).json({
      ok: false,
      code: "JOB_STATE_INCONSISTENT",
      message: "Atlas stop requires exactly one matching active case; no stop was claimed.",
      jobId: activeJobId,
      matchedCaseCount: matchingCases.length,
    });
    return;
  }

  // Recheck the strict job snapshot immediately before the durable fence. The
  // case update below is also conditional on status=active, so if completion
  // wins the DB transition first, the stop cannot mutate the terminal case.
  let beforeFence: Awaited<ReturnType<typeof getJobStrict>>;
  try {
    beforeFence = await getJobStrict(activeJobId);
  } catch {
    res.status(503).json({
      ok: false,
      code: "JOB_STATE_UNAVAILABLE",
      message: "Atlas could not reconfirm the job before the durable case fence; no stop was claimed.",
      jobId: activeJobId,
    });
    return;
  }
  if (!beforeFence) {
    res.status(503).json({
      ok: false,
      code: "JOB_STATE_INCONSISTENT",
      message: "The active-job lock points to a missing job record before the durable case fence; no stop was claimed.",
      jobId: activeJobId,
    });
    return;
  }
  const beforeFenceStatus = classifyActiveJobLaneStatus(beforeFence.status);
  if (beforeFenceStatus === "terminal") {
    res.json({
      ok: true,
      jobId: activeJobId,
      status: beforeFence.status,
      message: beforeFence.status === "cancelled"
        ? "Atlas was already stopped."
        : "Atlas job is already terminal; no stop was applied.",
    });
    return;
  }
  if (beforeFenceStatus !== "active") {
    res.status(503).json({
      ok: false,
      code: "JOB_STATE_INCONSISTENT",
      message: "Persisted Atlas job status changed to an unrecognized value; no stop was claimed.",
      jobId: activeJobId,
      status: beforeFence.status,
    });
    return;
  }

  // Reserve the race atomically without terminalizing the job. While this marker
  // exists, updateJob refuses competing progress/completion/failure patches. The
  // durable DB case fence must still land before the final cancelled status.
  const cancellationRequest = await requestJobCancellation(activeJobId);
  if (cancellationRequest !== "requested") {
    let current: Awaited<ReturnType<typeof getJobStrict>> = null;
    try { current = await getJobStrict(activeJobId); } catch { /* state remains unknown */ }
    if (current && classifyActiveJobLaneStatus(current.status) === "terminal") {
      res.json({
        ok: true,
        jobId: activeJobId,
        status: current.status,
        message: current.status === "cancelled"
          ? "Atlas was already stopped."
          : "Atlas job is already terminal; no stop was applied.",
      });
      return;
    }
    res.status(503).json({
      ok: false,
      code: cancellationRequest === "missing" ? "JOB_STATE_INCONSISTENT" : "JOB_STATE_UNAVAILABLE",
      message: cancellationRequest === "missing"
        ? "The active-job record disappeared before cancellation could be reserved; no stop was claimed."
        : "Atlas could not atomically reserve cancellation; no stop was claimed.",
      jobId: activeJobId,
      status: current?.status ?? "unknown",
    });
    return;
  }

  let fencedCases: Array<{ id: number }>;
  try {
    fencedCases = await db.update(researchCasesTable)
      .set({ status: "review", currentAction: "canonical-atlas-cancelled", updatedAt: now })
      .where(and(
        eq(researchCasesTable.id, matchingCases[0]!.id),
        eq(researchCasesTable.status, "active"),
        or(
          sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${activeJobId}`,
          sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${activeJobId}`,
        ),
        sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled', 'canonical-lease-lost')`,
      ))
      .returning({ id: researchCasesTable.id });
  } catch (error) {
    let markerCleared = false;
    try { markerCleared = await clearJobCancellationRequest(activeJobId); } catch { /* report unknown cancellation state */ }
    res.status(503).json({
      ok: false,
      code: markerCleared ? "CANCELLATION_FENCE_UNCONFIRMED" : "CANCELLATION_STATE_UNCONFIRMED",
      message: markerCleared
        ? "Atlas stop could not establish the durable database cancellation fence; the job remains eligible to continue."
        : "The database cancellation fence failed and the cancellation reservation could not be cleared; job state needs operator review.",
      error: `database cancellation failure (digest=${describeThrownProviderError(error).messageDigest ?? "none"})`,
    });
    return;
  }
  if (fencedCases.length !== 1) {
    let markerCleared = false;
    try { markerCleared = await clearJobCancellationRequest(activeJobId); } catch { /* state remains unknown */ }
    if (!markerCleared) {
      res.status(503).json({
        ok: false,
        code: "CANCELLATION_STATE_UNCONFIRMED",
        message: "The case transitioned before the stop fence, and the cancellation reservation could not be cleared.",
        jobId: activeJobId,
      });
      return;
    }
    let latest: Awaited<ReturnType<typeof getJobStrict>> = null;
    try { latest = await getJobStrict(activeJobId); } catch { /* state remains unknown */ }
    if (latest && classifyActiveJobLaneStatus(latest.status) === "terminal") {
      res.json({
        ok: true,
        jobId: activeJobId,
        status: latest.status,
        message: latest.status === "cancelled"
          ? "Atlas was already stopped."
          : "Atlas job reached a terminal state before the case cancellation fence; no stop was applied.",
      });
      return;
    }
    res.status(409).json({
      ok: false,
      code: "CANCELLATION_FENCE_NOT_APPLIED",
      message: "The case transitioned before the stop fence could be applied; no job cancellation was attempted.",
      jobId: activeJobId,
      status: latest?.status ?? "unknown",
    });
    return;
  }

  await updateJob(activeJobId, {
    status: "cancelled",
    outcome: "incomplete",
    message: "Stopped by operator.",
    finishedAt: now.toISOString(),
  });

  // updateJob's Redis Lua script refuses to overwrite a terminal job. Confirm
  // that cancellation won before acknowledging the operator request.
  let confirmedJob: Awaited<ReturnType<typeof getJobStrict>>;
  try {
    confirmedJob = await getJobStrict(activeJobId);
  } catch {
    res.status(503).json({
      ok: false,
      code: "CANCELLATION_STATE_UNCONFIRMED",
      message: "The durable case cancellation fence was recorded, but the job state could not confirm cancellation.",
      jobId: activeJobId,
    });
    return;
  }
  if (!confirmedJob) {
    res.status(503).json({
      ok: false,
      code: "JOB_STATE_INCONSISTENT",
      message: "The active-job lock points to a missing job record after the stop request; cancellation is unconfirmed.",
      jobId: activeJobId,
    });
    return;
  }
  if (confirmedJob.status !== "cancelled") {
    const confirmedLaneStatus = classifyActiveJobLaneStatus(confirmedJob.status);
    if (confirmedLaneStatus === "terminal") {
      res.status(409).json({
        ok: false,
        jobId: activeJobId,
        status: confirmedJob.status,
        message: "Atlas reached a different terminal state before cancellation could be confirmed; stop is not reported as successful.",
      });
      return;
    }
    res.status(503).json({
      ok: false,
      code: "CANCELLATION_STATE_UNCONFIRMED",
      message: "The job state did not confirm cancellation; stop is not reported as successful.",
      jobId: activeJobId,
      status: confirmedJob.status,
    });
    return;
  }

  res.json({ ok: true, jobId: activeJobId, status: "cancelled", message: "Atlas stopped." });
});

export default router;
