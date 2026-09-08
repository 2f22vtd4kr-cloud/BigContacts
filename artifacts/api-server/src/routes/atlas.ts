/**
 * Atlas Routes
 *
 * POST /api/ingest/atlas-run   — Launch the full Apex Atlas pipeline
 * DELETE /api/ingest/atlas-lock — Clear ghost Atlas lock
 * GET  /api/ingest/atlas-status — Current Atlas job status
 */

import { Router, type Request, type Response } from "express";
import { createJob, getActiveJob, getLatestJob, getJob, setActiveJob, updateJob, clearActiveJobIfOwned } from "../lib/job-queue";
import { runAtlasPipeline, type AtlasOptions } from "../lib/atlas-orchestrator";
import { CANONICAL_ATLAS_LAUNCH_BODY } from "../lib/atlas-launch-defaults";
import { logger } from "../lib/logger";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

// ── POST /ingest/atlas-run ────────────────────────────────────────────────────
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
  const discoveryFirst = singleTargetId != null
    ? false
    : body.discoveryFirst !== undefined
      ? Boolean(body.discoveryFirst)
      : CANONICAL_ATLAS_LAUNCH_BODY.discoveryFirst;

  const requestedResearchDepth = String(body.researchDepth ?? CANONICAL_ATLAS_LAUNCH_BODY.researchDepth).toLowerCase();
  const researchDepth = ["fast", "standard", "deep"].includes(requestedResearchDepth)
    ? requestedResearchDepth as AtlasOptions["researchDepth"]
    : CANONICAL_ATLAS_LAUNCH_BODY.researchDepth;

  const opts: AtlasOptions = {
    targetCount:        Number(body.targetCount)       || (discoveryFirst ? 3 : CANONICAL_ATLAS_LAUNCH_BODY.targetCount),
    faaMaxRecords:      Number(body.faaMaxRecords)     || 60_000,
    includeLandRegistry: Boolean(body.includeLandRegistry),
    batchSize:          Number(body.batchSize)         || CANONICAL_ATLAS_LAUNCH_BODY.batchSize,
    phaseJBatchSize:    Number(body.phaseJBatchSize)   || CANONICAL_ATLAS_LAUNCH_BODY.phaseJBatchSize,
    skipIngestion:      Boolean(body.skipIngestion),
    hotLeadsOnly:       Boolean(body.hotLeadsOnly),
    runResearch:        body.runResearch !== false,
    researchLimit:      Number(body.researchLimit)     || (singleTargetId != null ? 1 : CANONICAL_ATLAS_LAUNCH_BODY.researchLimit),
    targetTimeoutMs:    Number(body.targetTimeoutMs)  || (singleTargetId != null ? 420_000 : CANONICAL_ATLAS_LAUNCH_BODY.targetTimeoutMs),
    researchDepth,
    singleTargetId,
    discoveryFirst,
    skipFaa:            body.skipFaa !== undefined ? Boolean(body.skipFaa) : CANONICAL_ATLAS_LAUNCH_BODY.skipFaa,
    broadCategories:   Number(body.broadCategories)   || (discoveryFirst ? CANONICAL_ATLAS_LAUNCH_BODY.broadCategories : 1),
  };

  // A single-target operator action is never allowed to accidentally enter the
  // autonomous people-discovery lane.
  if (singleTargetId != null) {
    opts.targetCount = 1;
    opts.researchLimit = 1;
    opts.discoveryFirst = false;
    opts.broadCategories = 0;
  }

  const atlasJobId = await createJob("atlas-run");
  await setActiveJob("atlas-run", atlasJobId);
  await updateJob(atlasJobId, {
    status: "running",
    progress: 0, total: 10,
    atlasPhase: 0, atlasPhaseTotal: 10,
    message: "Atlas pipeline initializing…",
  });

  // Immediately repair isHot only for validated person-level direct contacts.
  // Wealth/registry signals and organisation switchboards are not access signals.
  db.execute(sql`
    UPDATE entities
    SET is_hot = (
      (
        (email IS NOT NULL AND email !~* '^(info|contact|hello|sales|support|office|admin|press|media|enquiries|inquiries|reservations|booking|investor|ir)@')
        OR (phone IS NOT NULL AND COALESCE(phone_source, '') NOT IN ('EDGAR-Phone', 'CompaniesHouse-Phone'))
      )
      AND entity_type NOT IN ('Corporation', 'Corp', 'Trust')
    )
    WHERE is_hot IS DISTINCT FROM (
      (
        (email IS NOT NULL AND email !~* '^(info|contact|hello|sales|support|office|admin|press|media|enquiries|inquiries|reservations|booking|investor|ir)@')
        OR (phone IS NOT NULL AND COALESCE(phone_source, '') NOT IN ('EDGAR-Phone', 'CompaniesHouse-Phone'))
      )
      AND entity_type NOT IN ('Corporation', 'Corp', 'Trust')
    )
  `).catch(() => {});

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
    phases: [
      "0 — Pre-run cross-references",
      "1 — Discovery + full-circle entity enrichment",
      "2 — Identity and contact evidence",
      "3 — Metadata, notes, and registry assets",
      "4 — In-house OSINT",
      "5 — Social and messenger discovery",
      "6 — AI OSINT + footprint tools",
      "7 — Forensic cross-reference and asset discovery",
      "8 — Phase J attribution and graph-assisted analysis",
      "9 — Semantic embeddings, wealth, and confidence recompute",
      "10 — MCTS research on reachable hot leads",
    ],
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