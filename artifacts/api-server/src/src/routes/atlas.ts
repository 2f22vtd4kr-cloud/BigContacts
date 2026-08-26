/**
 * Atlas Routes
 *
 * POST /api/ingest/atlas-run   — Launch the full 10-phase Apex Atlas pipeline
 * DELETE /api/ingest/atlas-lock — Clear ghost Atlas lock
 * GET  /api/ingest/atlas-status — Current Atlas job status
 */

import { Router, type Request, type Response } from "express";
import {
  createJob, getActiveJob, getLatestJob, getJob, getJobLog, setActiveJob,
  updateJob, clearActiveJobIfOwned, clearActiveJobIfMatches, forceClearActiveJob, getAutoPipelineScheduler,
} from "../lib/job-queue";
import { runAtlasPipeline, type AtlasOptions } from "../lib/atlas-orchestrator";
import { CANONICAL_ATLAS_LAUNCH_BODY } from "../lib/atlas-launch-defaults";
import { logger } from "../lib/logger";
import { getRecentDigSpans, clearDigSpansForJob, publishDigSpan } from "../lib/dig-span";
import { normalizeAtlasStatusMessage } from "../lib/atlas-phase-progress";

const router = Router();

const ATLAS_ZOMBIE_MS = 90 * 60 * 1_000;
const ATLAS_STALE_PROGRESS_MS = 90 * 1_000;
const ATLAS_LATEST_DISPLAY_TTL_MS = 15 * 60 * 1_000;
/** Status plane must not wait on Redis forever while dig holds the event loop / connection pool. */
const STATUS_REDIS_BUDGET_MS = 1_200;

function withBudget<T>(p: Promise<T>, fallback: T, ms = STATUS_REDIS_BUDGET_MS): Promise<T> {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(fallback);
      }
    }, ms);
    p.then(
      (v) => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(v);
        }
      },
      () => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(fallback);
        }
      },
    );
  });
}


function lastLogActivityMs(log: string[]): number {
  for (const line of log.slice(0, 12)) {
    const m = String(line).match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)/);
    if (m) {
      const t = Date.parse(m[1]);
      if (Number.isFinite(t)) return t;
    }
  }
  return NaN;
}


// ── POST /ingest/atlas-run ────────────────────────────────────────────────────
router.post("/ingest/atlas-run", async (req: Request, res: Response): Promise<void> => {
  const existing = await getActiveJob("atlas-run");
  if (existing) {
    const job = await getJob(existing);
    if (job?.status === "running" || job?.status === "paused") {
      const log = await getJobLog(existing);
      const startedMs = job.startedAt ? Date.parse(job.startedAt) : NaN;
      const logMs = lastLogActivityMs(log);
      const lastActivity = Number.isFinite(logMs)
        ? logMs
        : (Number.isFinite(startedMs) ? startedMs : 0);
      const ageMs = Date.now() - lastActivity;
      const hardZombie =
        Number.isFinite(startedMs) && Date.now() - startedMs > ATLAS_ZOMBIE_MS;
      const softZombie =
        Number.isFinite(startedMs) &&
        Date.now() - startedMs > ATLAS_STALE_PROGRESS_MS &&
        ageMs > ATLAS_STALE_PROGRESS_MS;
      if (hardZombie || softZombie || !Number.isFinite(startedMs)) {
        await updateJob(existing, {
          status: "cancelled",
          message: "Cleared stale job so a new Launch could start.",
          finishedAt: new Date().toISOString(),
        } as any);
        await clearActiveJobIfMatches("atlas-run", existing);
      } else if (job.status === "paused") {
        res.status(409).json({
          error: "Atlas pipeline is paused. Resume or stop it before starting a new run.",
          jobId: existing,
          status: job,
        });
        return;
      } else {
        res.status(409).json({
          error: "Atlas pipeline already running.",
          jobId: existing,
          status: job,
        });
        return;
      }
    } else {
      await clearActiveJobIfMatches("atlas-run", existing);
    }
  }

  const body = (req.body ?? {}) as Record<string, unknown>;

  // Empty/missing fields fall back to CANONICAL_ATLAS_LAUNCH_BODY so every
  // "run bureau" path is the same procedure (UI, curl, Replit agent).
  const C = CANONICAL_ATLAS_LAUNCH_BODY;
  const discoveryFirst = body.discoveryFirst !== undefined ? Boolean(body.discoveryFirst) : C.discoveryFirst;
  const opts: AtlasOptions = {
    targetCount:        Number(body.targetCount)       || C.targetCount,
    faaMaxRecords:      Number(body.faaMaxRecords)     || 60_000,
    includeLandRegistry: Boolean(body.includeLandRegistry),
    batchSize:          Number(body.batchSize)         || C.batchSize,
    phaseJBatchSize:    Number(body.phaseJBatchSize)   || C.phaseJBatchSize,
    skipIngestion:      Boolean(body.skipIngestion),
    hotLeadsOnly:       body.hotLeadsOnly !== undefined ? Boolean(body.hotLeadsOnly) : C.hotLeadsOnly,
    runResearch:        body.runResearch !== false,
    researchLimit:      Number(body.researchLimit)     || C.researchLimit,
    targetTimeoutMs:    Math.min(Math.max(Number(body.targetTimeoutMs) || C.targetTimeoutMs, 30_000), 600_000),
    discoveryFirst,
    skipFaa:            body.skipFaa !== undefined ? Boolean(body.skipFaa) : (discoveryFirst ? C.skipFaa : false),
    broadCategories:    Number(body.broadCategories)   || C.broadCategories,
    singleTargetId:     body.singleTargetId !== undefined ? Number(body.singleTargetId) : undefined,
  };

  const atlasJobId = await createJob("atlas-run");
  // Ensure Redis lock sticks — silent SET failures caused Launch to self-cancel
  for (let attempt = 0; attempt < 3; attempt++) {
    await setActiveJob("atlas-run", atlasJobId);
    const pinned = await getActiveJob("atlas-run");
    if (pinned === atlasJobId) break;
    logger.warn({ atlasJobId, pinned, attempt }, "atlas-run: active job pointer mismatch after setActiveJob");
  }
  if ((await getActiveJob("atlas-run")) !== atlasJobId) {
    // Last resort: pin in-process only (Redis quota exhausted)
    await setActiveJob("atlas-run", atlasJobId);
    logger.warn({ atlasJobId }, "atlas-run: proceeding with in-process lock only (Redis unavailable)");
  }
  await updateJob(atlasJobId, {
    status: "running",
    progress: 0, total: 10,
    atlasPhase: 0, atlasPhaseTotal: 10,
    message: "Atlas pipeline initializing — 10 phases queued…",
  });

  // Fire and forget — run fully in background
  void (async () => {
    try {
      await runAtlasPipeline(atlasJobId, opts);
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
    // There are eleven numbered checkpoints (0 through 10). `total: 10`
    // remains the phase maximum, while the UI renders all eleven checkpoints.
    phases: [
      "0 — Pre-run cross-references (OCCRP/OFAC, live ADS-B, Companies House, ownership)",
      "1 — Discovery + full-circle entity enrichment loop",
      "2 — Identity and contact evidence",
      "3 — Metadata, notes, and registry assets",
      "4 — In-house OSINT",
      "5 — Social and messenger discovery",
      "6 — AI OSINT + Maigret + Holehe",
      "7 — Forensic cross-reference and asset discovery",
      "8 — Phase J attribution and graph-assisted analysis",
      "9 — Semantic embeddings, wealth, and confidence recompute",
      "10 — MCTS research on reachable hot leads",
    ],
    options: opts,
    message: `Atlas pipeline started (job: ${atlasJobId}). Poll ${`/api/ingest/job/${atlasJobId}`} for progress.`,
  });
});

// ── POST /ingest/atlas-pause ──────────────────────────────────────────────────
router.post("/ingest/atlas-pause", async (req: Request, res: Response): Promise<void> => {
  const activeJobId = await getActiveJob("atlas-run");
  const bodyJobId = typeof req.body?.jobId === "string" ? req.body.jobId : "";
  const jobId = activeJobId ?? bodyJobId;
  if (!jobId) {
    res.status(404).json({ ok: false, message: "No active Atlas job to pause." });
    return;
  }
  const job = await getJob(jobId);
  if (!job || (job.status !== "running" && job.status !== "paused")) {
    res.status(409).json({ ok: false, message: "Atlas job is not running.", jobId, status: job?.status });
    return;
  }
  await updateJob(jobId, {
    status: "paused",
    message: job.message ? `Paused — ${job.message}` : "Paused by operator.",
  } as any);
  res.json({ ok: true, jobId, status: "paused", message: "Atlas paused between targets. Resume to continue." });
});

// ── POST /ingest/atlas-resume ─────────────────────────────────────────────────
router.post("/ingest/atlas-resume", async (req: Request, res: Response): Promise<void> => {
  const activeJobId = await getActiveJob("atlas-run");
  const bodyJobId = typeof req.body?.jobId === "string" ? req.body.jobId : "";
  const jobId = activeJobId ?? bodyJobId;
  if (!jobId) {
    res.status(404).json({ ok: false, message: "No active Atlas job to resume." });
    return;
  }
  const job = await getJob(jobId);
  if (!job || job.status !== "paused") {
    res.status(409).json({ ok: false, message: "Atlas job is not paused.", jobId, status: job?.status });
    return;
  }
  await updateJob(jobId, {
    status: "running",
    message: "Resumed — continuing research…",
  } as any);
  res.json({ ok: true, jobId, status: "running", message: "Atlas resumed." });
});

// ── DELETE /ingest/atlas-lock ─────────────────────────────────────────────────

// ── POST /ingest/atlas-stop ───────────────────────────────────────────────────
router.post("/ingest/atlas-stop", async (req: Request, res: Response): Promise<void> => {
  const activeJobId = await getActiveJob("atlas-run");
  const bodyJobId = typeof req.body?.jobId === "string" ? req.body.jobId : "";
  const jobId = activeJobId ?? bodyJobId;
  if (!jobId) {
    res.status(404).json({ ok: false, message: "No active Atlas job to stop." });
    return;
  }
  await updateJob(jobId, {
    status: "cancelled",
    message: "Stopped by operator.",
    finishedAt: new Date().toISOString(),
  } as any);
  await clearActiveJobIfMatches("atlas-run", jobId);
  _atlasStatusCache = null;
  res.json({ ok: true, jobId, status: "cancelled", message: "Atlas stopped." });
});

router.delete("/ingest/atlas-lock", async (_req: Request, res: Response): Promise<void> => {
  const activeJobId = await getActiveJob("atlas-run");
  const requestedJobId = Array.isArray(_req.query.jobId)
    ? String(_req.query.jobId[0] ?? "")
    : String(_req.query.jobId ?? "");
  const jobId = activeJobId ?? requestedJobId;
  if (!jobId) { res.json({ cleared: false, message: "No active Atlas lock or jobId supplied." }); return; }
  // Operator stop must be cancelled (honest UI), never failed.
  await updateJob(jobId, { status: "cancelled", message: "Stopped by operator.", finishedAt: new Date().toISOString() } as any);
  await clearActiveJobIfMatches("atlas-run", jobId);
  _atlasStatusCache = null;
  res.json({ cleared: true, jobId, status: "cancelled", message: activeJobId ? "Atlas stopped." : "Stale Atlas job marked cancelled." });
});

router.delete("/ingest/atlas-lock/:jobId", async (req: Request, res: Response): Promise<void> => {
  const jobId = String(req.params.jobId ?? "");
  if (!jobId) { res.json({ cleared: false, message: "No Atlas job ID supplied." }); return; }
  await updateJob(jobId, { status: "cancelled", message: "Stopped by operator.", finishedAt: new Date().toISOString() } as any);
  await clearActiveJobIfOwned("atlas-run", jobId);
  res.json({ cleared: true, jobId, status: "cancelled", message: "Atlas stopped." });
});

// Terminal Atlas jobs older than this are not surfaced as "current" Reactor
// state. Permanent Redis keeps history for 7 days; without a freshness gate a
// completed single-target pass (e.g. CarCollect) stays stuck on the Reactor
// across re-imports and idle continuous cycles.
const ATLAS_LATEST_DISPLAY_TTL_MS = 15 * 60 * 1_000;
/** Hard ceiling — running jobs older than this are always cleared. */
function isFreshAtlasTerminal(job: { status?: string; finishedAt?: string; startedAt?: string }): boolean {
  if (job.status !== "done" && job.status !== "failed" && job.status !== "cancelled") return false;
  const finishedMs = job.finishedAt ? Date.parse(job.finishedAt) : NaN;
  const startedMs = job.startedAt ? Date.parse(job.startedAt) : NaN;
  const anchor = Number.isFinite(finishedMs) ? finishedMs : startedMs;
  if (!Number.isFinite(anchor)) return false;
  return Date.now() - anchor < ATLAS_LATEST_DISPLAY_TTL_MS;
}

// ── GET /ingest/atlas-status ──────────────────────────────────────────────────
// Desk polls this often; short in-process cache cuts Redis GETs without lying for long.
let _atlasStatusCache: { at: number; body: unknown } | null = null;
const ATLAS_STATUS_CACHE_MS = 2_000;

router.get("/ingest/atlas-status", async (_req: Request, res: Response): Promise<void> => {
  if (_atlasStatusCache && Date.now() - _atlasStatusCache.at < ATLAS_STATUS_CACHE_MS) {
    res.json(_atlasStatusCache.body);
    return;
  }
  const scheduler = await withBudget(getAutoPipelineScheduler(), { enabled: false, active: false, cycles: 0, skippedDueToLock: 0, providerNoTarget: 0 } as any);
  const jobId = await withBudget(getActiveJob("atlas-run"), null);
  if (!jobId) {
    const latest = await withBudget(getLatestJob("atlas-run"), null);
    // Only expose a terminal latest job while it is still "just finished".
    // Stale completed runs must not appear as CURRENT TARGET in the Reactor.
    if (latest && isFreshAtlasTerminal(latest)) {
      const log = await withBudget(getJobLog(latest.jobId), []);
      const latestBody = { ...latest, message: normalizeAtlasStatusMessage(latest.message), active: false, latest: true, scheduler, log: log.slice(0, 80), recentSpans: getRecentDigSpans(latest.jobId, 50) };
      _atlasStatusCache = { at: Date.now(), body: latestBody };
      res.json(latestBody);
      return;
    }
    const idleBody = {
      status: "idle",
      message: "No Atlas run in progress.",
      scheduler,
      recentSpans: getRecentDigSpans(null, 30),
    };
    _atlasStatusCache = { at: Date.now(), body: idleBody };
    res.json(idleBody);
    return;
  }
  const job = await withBudget(getJob(jobId), null);
  const log = await withBudget(getJobLog(jobId), []);
  if (!job) {
    const idleBody = {
      status: "idle",
      message: "No Atlas run in progress.",
      scheduler,
      recentSpans: getRecentDigSpans(null, 30),
    };
    _atlasStatusCache = { at: Date.now(), body: idleBody };
    res.json(idleBody);
    return;
  }
  // Terminal job still holding the active pointer — drop pointer only
  if (job && (job.status === "done" || job.status === "failed" || job.status === "cancelled")) {
    await clearActiveJobIfMatches("atlas-run", jobId);
    _atlasStatusCache = null;
    res.json({ status: "idle", message: "No Atlas run in progress.", scheduler });
    return;
  }
  // Auto-clear zombie / dead runs so Reactor cannot show LIVE with no real work
  if (job && (job.status === "running" || job.status === "paused")) {
    const startedMs = job.startedAt ? Date.parse(job.startedAt) : NaN;
    const logMs = lastLogActivityMs(log);
    const lastActivity = Number.isFinite(logMs)
      ? logMs
      : (Number.isFinite(startedMs) ? startedMs : Date.now());
    const ageMs = Date.now() - lastActivity;
    const hardZombie =
      Number.isFinite(startedMs) && Date.now() - startedMs > ATLAS_ZOMBIE_MS;
    // Never soft-clear a job under 2 minutes old (Launch was dying in <5s)
    const minAgeForSoftClear = Math.max(ATLAS_STALE_PROGRESS_MS, 120_000);
    const softZombie =
      Number.isFinite(startedMs) &&
      Date.now() - startedMs > minAgeForSoftClear &&
      ageMs > minAgeForSoftClear;
    if (hardZombie || softZombie) {
      const stillActive = await getActiveJob("atlas-run");
      if (stillActive && stillActive !== jobId) {
        const newer = await getJob(stillActive);
        const newerLog = await getJobLog(stillActive);
        const body = {
          ...newer,
          jobId: stillActive,
          active: true,
          scheduler,
          log: newerLog.slice(0, 80),
        };
        _atlasStatusCache = { at: Date.now(), body };
        res.json(body);
        return;
      }
      if (stillActive === jobId) {
        await updateJob(jobId, {
          status: "cancelled",
          message: softZombie && !hardZombie
            ? `Auto-cleared idle Atlas job (no activity > ${Math.round(ATLAS_STALE_PROGRESS_MS / 1000)}s).`
            : `Auto-cleared zombie Atlas job (running > ${Math.round(ATLAS_ZOMBIE_MS / 60000)}m).`,
          finishedAt: new Date().toISOString(),
        } as any);
        await clearActiveJobIfMatches("atlas-run", jobId);
      }
      _atlasStatusCache = null;
      res.json({
        status: "idle",
        message: "Stale Atlas job was auto-cleared. Launch again when ready.",
        clearedZombieJobId: jobId,
        scheduler,
      });
      return;
    }
  }
  const phaseJJobId = await getActiveJob("phase-j-pass");
  const phaseJ = phaseJJobId ? await getJob(phaseJJobId) : null;
  const body = {
    ...job,
    jobId,
    message: normalizeAtlasStatusMessage(job?.message),
    active: true,
    scheduler,
    log: log.slice(0, 80),
    recentSpans: getRecentDigSpans(jobId, 50),
    phaseJ: phaseJ
      ? {
          jobId: phaseJ.jobId,
          status: phaseJ.status,
          progress: phaseJ.progress,
          total: phaseJ.total,
          inserted: phaseJ.inserted,
          errors: phaseJ.errors,
          message: phaseJ.message,
        }
      : null,
  };
  _atlasStatusCache = { at: Date.now(), body };
  res.json(body);
});

export default router;
