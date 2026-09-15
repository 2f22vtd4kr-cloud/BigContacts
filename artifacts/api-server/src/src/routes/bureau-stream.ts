/**
 * Bureau live stream routes (SSE + snapshot).
 * GET /api/ingest/bureau-events  — recent JSON events
 * GET /api/ingest/bureau-stream  — SSE with heartbeats
 *
 * Live events are emitted by trusted server-side research code. The transport
 * surface is intentionally read-only; an HTTP caller must not be able to forge
 * investigator/control-plane telemetry.
 */

import { Router, type Request, type Response } from "express";
import {
  listBureauEvents,
  sseComment,
  sseSend,
  writeSseHeaders,
} from "../lib/bureau-live-log";
import { logger } from "../lib/logger";

const router = Router();
const HEARTBEAT_MS = 15_000;
const POLL_MS = 2_000;
const SEEN_ID_CAP = 500;

router.get("/ingest/bureau-events", async (req: Request, res: Response): Promise<void> => {
  const caseId = typeof req.query.caseId === "string" ? req.query.caseId : null;
  const parsedLimit = Number(req.query.limit);
  const limit = Math.min(200, Math.max(1, Number.isFinite(parsedLimit) ? Math.trunc(parsedLimit) : 80));
  const events = await listBureauEvents({ caseId, limit });
  res.json({
    events,
    count: events.length,
    timestampFormat: "ISO-8601 UTC with milliseconds (e.g. 2026-08-09T07:42:18.347Z)",
  });
});

router.get("/ingest/bureau-stream", async (req: Request, res: Response): Promise<void> => {
  const caseId = typeof req.query.caseId === "string" ? req.query.caseId : null;
  writeSseHeaders(res);
  res.write(`retry: 3000\n\n`);

  // Do not use timestamp-only cursors here. Multiple Bureau events can be
  // published within the same millisecond; a `tsMs > lastTsMs` cursor can then
  // silently drop real research actions from the live Reactor. Event IDs are
  // unique, so a bounded seen-set gives us exact per-connection de-duplication
  // without inventing an ordering field in the durable event contract.
  const seenIds = new Set<string>();
  const remember = (id: string) => {
    if (!id) return;
    seenIds.add(id);
    if (seenIds.size <= SEEN_ID_CAP) return;
    const oldest = seenIds.values().next().value as string | undefined;
    if (oldest) seenIds.delete(oldest);
  };

  let closed = false;
  const sendSnapshot = async () => {
    const events = await listBureauEvents({ caseId, limit: 50 });
    for (const event of events) remember(event.id);
    sseSend(res, "snapshot", { events, caseId, serverTime: new Date().toISOString() });
  };
  const tick = async () => {
    if (closed) return;
    try {
      const events = await listBureauEvents({ caseId, limit: 50 });
      // Redis returns newest-first. Reverse only the unseen subset so the client
      // receives a causal oldest -> newest burst when several actions arrived
      // between polls. No timestamp tie-breaker is needed for de-duplication.
      const fresh = events.filter((event) => !seenIds.has(event.id)).reverse();
      for (const event of fresh) {
        remember(event.id);
        sseSend(res, "bureau", event);
      }
    } catch (err: any) {
      logger.debug({ err: err?.message }, "bureau-stream poll failed");
    }
  };

  await sendSnapshot().catch(() => undefined);
  const pollId = setInterval(() => { void tick(); }, POLL_MS);
  const hbId = setInterval(() => {
    if (closed) return;
    sseComment(res, "ping");
    sseSend(res, "heartbeat", { serverTime: new Date().toISOString(), caseId });
  }, HEARTBEAT_MS);
  req.on("close", () => { closed = true; clearInterval(pollId); clearInterval(hbId); });
});

// There is deliberately no HTTP event-ingest endpoint. Internal event writers
// call publishBureauEvent in-process so the authenticated public API cannot
// manufacture audit history.
router.post("/ingest/bureau-events", (_req: Request, res: Response): void => {
  res.status(410).json({ error: "Bureau event ingestion is server-internal and cannot be called over HTTP." });
});

export default router;
