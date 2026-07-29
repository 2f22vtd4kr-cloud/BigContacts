/**
 * Atlas Routes
 *
 * POST /api/ingest/atlas-run   — Launch the full 10-phase Apex Atlas pipeline
 * DELETE /api/ingest/atlas-lock — Clear ghost Atlas lock
 * GET  /api/ingest/atlas-status — Current Atlas job status
 */

import { Router, type Request, type Response } from "express";
import { createJob, getActiveJob, getJob, setActiveJob, updateJob } from "../lib/job-queue";
import { runAtlasPipeline, type AtlasOptions } from "../lib/atlas-orchestrator";
import { logger } from "../lib/logger";

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

  const opts: AtlasOptions = {
    targetCount:        Number(body.targetCount)     || 15_000,
    faaMaxRecords:      Number(body.faaMaxRecords)   || 60_000,
    includeLandRegistry: Boolean(body.includeLandRegistry),
    batchSize:          Number(body.batchSize)       || 200,
    phaseJBatchSize:    Number(body.phaseJBatchSize) || 50,
    skipIngestion:      Boolean(body.skipIngestion),
    hotLeadsOnly:       Boolean(body.hotLeadsOnly),
    runResearch:        body.runResearch !== false,
    researchLimit:      Number(body.researchLimit)   || 10,
  };

  const atlasJobId = await createJob("atlas-run");
  await setActiveJob("atlas-run", atlasJobId);
  await updateJob(atlasJobId, {
    status: "running",
    progress: 0, total: 10,
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
      await setActiveJob("atlas-run", "");
    }
  })();

  res.status(202).json({
    jobId: atlasJobId,
    pollUrl: `/api/ingest/job/${atlasJobId}`,
    phases: [
      "0 — FAA aircraft + Western HNWI (EDGAR/CH/BRREG)",
      "1 — OCCRP Aleph + OpenSky live flights + CH Company Officers",
      "2 — CH contact enrichment + OpenOwnership BODS + Foundation filings",
      "3 — Notes population + EDGAR stock assets + live-source markers",
      "4 — In-house OSINT (Wikidata/GitHub/RDAP/DNS/Gravatar/ProPublica990)",
      "5 — Social discovery (LinkedIn/Twitter/Instagram) + Messenger (Telegram) + Broad discovery",
      "6 — AI OSINT: Perplexity + Gemini + Tavily + Exa + Groq → Maigret (3k sites) + Holehe (120 services) → flexible re-run",
      "7 — Forensic: ICIJ Offshore Leaks + Whoxy WHOIS + Equasis vessels + ADSB flight history",
      "8 — Phase J: domain resolution + digital footprint + J6 attribution + J7 cooldowns + J8 graph-assisted",
      "9 — Semantic embeddings + net worth backfill + contact outcomes + confidence recompute",
      "10 — MCTS research on top hot leads",
    ],
    options: opts,
    message: `Atlas pipeline started (job: ${atlasJobId}). Poll ${`/api/ingest/job/${atlasJobId}`} for progress.`,
  });
});

// ── DELETE /ingest/atlas-lock ─────────────────────────────────────────────────
router.delete("/ingest/atlas-lock", async (_req: Request, res: Response): Promise<void> => {
  const jobId = await getActiveJob("atlas-run");
  if (!jobId) { res.json({ cleared: false, message: "No active Atlas lock." }); return; }
  await updateJob(jobId, { status: "failed", message: "Killed manually.", finishedAt: new Date().toISOString() } as any);
  await setActiveJob("atlas-run", "");
  res.json({ cleared: true, jobId, message: "Atlas lock cleared." });
});

// ── GET /ingest/atlas-status ──────────────────────────────────────────────────
router.get("/ingest/atlas-status", async (_req: Request, res: Response): Promise<void> => {
  const jobId = await getActiveJob("atlas-run");
  if (!jobId) { res.json({ status: "idle", message: "No Atlas run in progress." }); return; }
  const job = await getJob(jobId);
  res.json({ ...job, jobId });
});

export default router;
