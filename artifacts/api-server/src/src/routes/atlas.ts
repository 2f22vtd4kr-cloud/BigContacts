/**
 * Atlas Routes
 *
 * POST /api/ingest/atlas-run   — Launch Apex Atlas research
 * DELETE /api/ingest/atlas-lock — Clear ghost Atlas lock
 * GET  /api/ingest/atlas-status — Current Atlas job status
 */

import { Router, type Request, type Response } from "express";
import { db, entitiesTable, contactEvidenceTable } from "@workspace/db";
import { sql, desc, inArray, and } from "drizzle-orm";
import {
  createJob, getActiveJob, getLatestJob, getJob, getJobLog, setActiveJob,
  updateJob, clearActiveJobIfOwned, clearActiveJobIfMatches, forceClearActiveJob, getAutoPipelineScheduler,
} from "../lib/job-queue";
import { runAtlasPipeline, type AtlasOptions } from "../lib/atlas-orchestrator";
import { CANONICAL_ATLAS_LAUNCH_BODY } from "../lib/atlas-launch-defaults";
import { logger } from "../lib/logger";
import { getRecentDigSpans, clearDigSpansForJob, publishDigSpan } from "../lib/dig-span";
import { scoreFixtureCard, meanScore, passesScoreboardMilestone } from "../lib/scoreboard-rubric";
import { buildLanesHonestySnapshot } from "../lib/lanes-honesty";
import { suggestLcode } from "../lib/lcode-suggest";
import { normalizeAtlasStatusMessage } from "../lib/atlas-phase-progress";
import { enablePermanentRedis } from "../lib/redis";

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
  // Redis is opt-in in manual mode. This endpoint is the explicit operator
  // action that permits durable job state and contact-cache writes.
  await enablePermanentRedis();
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
  // "run bureau" path is the same operator procedure (UI, curl, Replit agent).
  const C = CANONICAL_ATLAS_LAUNCH_BODY;
  let discoveryFirst = body.discoveryFirst !== undefined ? Boolean(body.discoveryFirst) : C.discoveryFirst;
  const singleTargetRaw = body.singleTargetId !== undefined ? Number(body.singleTargetId) : undefined;
  // Dig one person: never run discovery-agent / template farm first.
  if (singleTargetRaw != null && Number.isFinite(singleTargetRaw) && singleTargetRaw > 0) {
    discoveryFirst = false;
  }
  const opts: AtlasOptions = {
    /* roadmap: discoveryFirst default targetCount 3 */
    targetCount:        Number(body.targetCount)
      || (Boolean(body.discoveryFirst !== undefined ? body.discoveryFirst : C.discoveryFirst) ? 3 : C.targetCount),
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
    singleTargetId:     singleTargetRaw != null && Number.isFinite(singleTargetRaw) && singleTargetRaw > 0 ? singleTargetRaw : undefined,
    researchDepth:     typeof body.researchDepth === "string" ? body.researchDepth : undefined,
  };

  const atlasJobId = await createJob("atlas-run");
  // Ensure Redis lock sticks — silent SET failures caused Launch to self-cancel.
  for (let attempt = 0; attempt < 3; attempt++) {
    await setActiveJob("atlas-run", atlasJobId);
    const pinned = await getActiveJob("atlas-run");
    if (pinned === atlasJobId) break;
    logger.warn({ atlasJobId, pinned, attempt }, "atlas-run: active job pointer mismatch after setActiveJob");
  }
  if ((await getActiveJob("atlas-run")) !== atlasJobId) {
    // Last resort: pin in-process only (Redis quota exhausted).
    await setActiveJob("atlas-run", atlasJobId);
    logger.warn({ atlasJobId }, "atlas-run: proceeding with in-process lock only (Redis unavailable)");
  }

  const modelSelectedBureau = discoveryFirst && opts.singleTargetId == null;
  await updateJob(atlasJobId, modelSelectedBureau
    ? {
        status: "running",
        progress: 0,
        total: Math.max(1, opts.targetCount),
        atlasPhase: 0,
        atlasPhaseTotal: 2,
        message: "AI discovery agent initializing — model selects the public research lane…",
      }
    : {
        status: "running",
        progress: 0,
        total: opts.singleTargetId ? 1 : 10,
        atlasPhase: 0,
        atlasPhaseTotal: opts.singleTargetId ? 1 : 10,
        message: opts.singleTargetId
          ? "Single-target Dig initializing — model selects research actions…"
          : "Atlas pipeline initializing — legacy multi-phase mode…",
      } as any);

  // Fire and forget — run fully in background.
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

  const phases = modelSelectedBureau
    ? [
        "0 — Model-selected public discovery (free ReAct)",
        "1 — Model-selected target research, evidence persistence, and contact promotion",
      ]
    : opts.singleTargetId
      ? ["0 — Model-selected single-target Dig"]
      : [
          "0 — Legacy multi-phase Atlas mode (explicit non-discoveryFirst request)",
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
        ];

  res.status(202).json({
    jobId: atlasJobId,
    pollUrl: `/api/ingest/job/${atlasJobId}`,
    phases,
    options: opts,
    message: modelSelectedBureau
      ? `Apex Atlas model-selected discovery started (job: ${atlasJobId}). Poll ${`/api/ingest/job/${atlasJobId}`} for progress.`
      : `Atlas pipeline started (job: ${atlasJobId}). Poll ${`/api/ingest/job/${atlasJobId}`} for progress.`,
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
  try { clearDigSpansForJob(jobId); } catch { /* non-fatal */ }
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
  try { clearDigSpansForJob(jobId); } catch { /* non-fatal */ }
  _atlasStatusCache = null;
  res.json({ cleared: true, jobId, status: "cancelled", message: activeJobId ? "Atlas stopped." : "Stale Atlas job marked cancelled." });
});

router.delete("/ingest/atlas-lock/:jobId", async (req: Request, res: Response): Promise<void> => {
  const jobId = String(req.params.jobId ?? "");
  if (!jobId) { res.json({ cleared: false, message: "No Atlas job ID supplied." }); return; }
  await updateJob(jobId, { status: "cancelled", message: "Stopped by operator.", finishedAt: new Date().toISOString() } as any);
  await clearActiveJobIfOwned("atlas-run", jobId);
  try { clearDigSpansForJob(jobId); } catch { /* non-fatal */ }
  res.json({ cleared: true, jobId, status: "cancelled", message: "Atlas stopped." });
});

// Terminal Atlas jobs older than this are not surfaced as "current" Reactor
// state. Permanent Redis keeps history for 7 days; without a freshness gate a
// completed single-target pass stays stuck on the Reactor across re-imports.

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
let _atlasStatusCache: { at: number; body: unknown } | null = null;
const ATLAS_STATUS_CACHE_MS = 15_000;

// GET /ingest/scoreboard-snapshot — score recent cards for COMPARE_*.md
router.get("/ingest/scoreboard-snapshot", async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20) || 20));
    const rows = await db
      .select({
        id: entitiesTable.id,
        name: entitiesTable.name,
        contactOutcome: entitiesTable.contactOutcome,
        phone: entitiesTable.phone,
        phoneSource: entitiesTable.phoneSource,
        email: entitiesTable.email,
        linkedinUrl: entitiesTable.linkedinUrl,
        cookedAt: entitiesTable.cookedAt,
      })
      .from(entitiesTable)
      .where(sql`${entitiesTable.cookedAt} IS NOT NULL`)
      .orderBy(desc(entitiesTable.cookedAt))
      .limit(limit);
    const ids = rows.map((r) => r.id);
    const evidenceCountByEntity = new Map<number, number>();
    if (ids.length) {
      try {
        const evRows = await db
          .select({
            entityId: contactEvidenceTable.entityId,
            n: sql<number>`count(*)::int`,
          })
          .from(contactEvidenceTable)
          .where(
            and(
              inArray(contactEvidenceTable.entityId, ids),
              inArray(contactEvidenceTable.vectorType, ["phone", "email", "social"]),
            ),
          )
          .groupBy(contactEvidenceTable.entityId);
        for (const er of evRows) {
          evidenceCountByEntity.set(er.entityId, Number(er.n) || 0);
        }
      } catch {
        /* non-fatal — L-code falls back without evidence counts */
      }
    }
    const scored = rows.map((r) => {
      const phoneSrc = String(r.phoneSource ?? "");
      let outcome = r.contactOutcome;
      if (
        (outcome === "direct_contact_candidate" || outcome === "direct_contact_verified") &&
        (phoneSrc === "agentic-web-org" || phoneSrc.endsWith("-org") ||
          phoneSrc === "EDGAR-Phone" || phoneSrc === "EDGAR-Issuer-Phone" ||
          phoneSrc === "CompaniesHouse-Phone")
      ) {
        outcome = "organization_contact";
      }
      const score = scoreFixtureCard({
        contactOutcome: outcome,
        phone: r.phone,
        email: r.email,
        phoneSource: r.phoneSource,
        linkedinUrl: r.linkedinUrl,
        hasSourceUrls: true,
      });
      const evidenceContactCount = evidenceCountByEntity.get(r.id) ?? 0;
      const src = String(r.phoneSource ?? "");
      const digLike =
        /^agentic-web/i.test(src) ||
        src === "EDGAR-Notice-Phone" ||
        src === "EDGAR-Notice" ||
        Boolean(r.phone || r.email || r.linkedinUrl) ||
        evidenceContactCount > 0;
      const suggestedLcode = suggestLcode({
        hadSearchSpan: digLike,
        hadVisitSpan: digLike,
        evidenceContactCount,
        cardPhone: r.phone,
        cardEmail: r.email,
        phoneSource: r.phoneSource,
        contactOutcome: outcome,
        betterPublicRouteKnown: false,
      });
      return {
        ...r,
        contactOutcome: outcome,
        score,
        evidenceContactCount,
        suggestedLcode: score <= 0 ? suggestedLcode : "none",
        cookedAt: r.cookedAt ? r.cookedAt.toISOString() : null,
      };
    });
    const scores = scored.map((s) => s.score);
    const lanes = buildLanesHonestySnapshot();
    const integrity = lanes.bureauIntegrity;
    const milestonePass = integrity !== "critical" && passesScoreboardMilestone(scores);
    res.json({
      count: scored.length,
      mean: meanScore(scores),
      milestonePass,
      bureauIntegrity: integrity,
      bureauIntegrityReasons: lanes.bureauIntegrityReasons,
      rows: scored,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/ingest/atlas-status", async (_req: Request, res: Response): Promise<void> => {
  if (_atlasStatusCache && Date.now() - _atlasStatusCache.at < ATLAS_STATUS_CACHE_MS) {
    res.json(_atlasStatusCache.body);
    return;
  }
  const scheduler = await withBudget(getAutoPipelineScheduler(), { enabled: false, active: false, cycles: 0, skippedDueToLock: 0, providerNoTarget: 0 } as any);
  const jobId = await withBudget(getActiveJob("atlas-run"), null);
  if (!jobId) {
    const latest = await withBudget(getLatestJob("atlas-run"), null);
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
  if (job && (job.status === "done" || job.status === "failed" || job.status === "cancelled")) {
    await clearActiveJobIfMatches("atlas-run", jobId);
    _atlasStatusCache = null;
    res.json({ status: "idle", message: "No Atlas run in progress.", scheduler });
    return;
  }
  if (job && (job.status === "running" || job.status === "paused")) {
    const startedMs = job.startedAt ? Date.parse(job.startedAt) : NaN;
    const logMs = lastLogActivityMs(log);
    const lastActivity = Number.isFinite(logMs)
      ? logMs
      : (Number.isFinite(startedMs) ? startedMs : Date.now());
    const ageMs = Date.now() - lastActivity;
    const hardZombie = Number.isFinite(startedMs) && Date.now() - startedMs > ATLAS_ZOMBIE_MS;
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
        const body = { ...newer, jobId: stillActive, active: true, scheduler, log: newerLog.slice(0, 80) };
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
      res.json({ status: "idle", message: "Stale Atlas job was auto-cleared. Launch again when ready.", clearedZombieJobId: jobId, scheduler });
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
