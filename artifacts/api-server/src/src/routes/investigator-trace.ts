import { Router } from "express";
import { getRecentDigSpans, type DigSpan } from "../lib/dig-span";
import { getDiscoveryTrace, type DiscoveryTrace } from "../lib/investigator-trace";

const router = Router();

/**
 * Reactor consumes per-action DigSpan records. Durable discovery slots are
 * a separate forensic projection and must not share the same array contract.
 */
export function buildAtlasTracePayload(
  jobId: string,
  spans: DigSpan[],
  discoveryTrace: DiscoveryTrace | null,
) {
  return {
    jobId,
    trace: spans,
    discoveryTrace: discoveryTrace?.slots ?? [],
    updatedAt: discoveryTrace?.updatedAt ?? spans[0]?.startedAt ?? null,
  };
}

router.get("/ingest/atlas-trace/:jobId", async (req, res) => {
  const jobId = String(req.params.jobId || "").trim();
  if (!jobId) return res.status(400).json({ error: "jobId required" });
  const [discoveryTrace, spans] = await Promise.all([
    getDiscoveryTrace(jobId),
    Promise.resolve(getRecentDigSpans(jobId, 50)),
  ]);
  return res.json(buildAtlasTracePayload(jobId, spans, discoveryTrace));
});

export default router;
