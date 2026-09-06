import { Router } from "express";
import { getDiscoveryTrace } from "../lib/investigator-trace";

const router = Router();

/** Forensic discovery trace: structured actions/observations/decisions only. */
router.get("/api/ingest/atlas-trace/:jobId", async (req, res) => {
  const jobId = String(req.params.jobId || "").trim();
  if (!jobId) return res.status(400).json({ error: "jobId required" });
  const trace = await getDiscoveryTrace(jobId);
  return res.json({ jobId, trace: trace?.slots ?? [], updatedAt: trace?.updatedAt ?? null });
});

export default router;
