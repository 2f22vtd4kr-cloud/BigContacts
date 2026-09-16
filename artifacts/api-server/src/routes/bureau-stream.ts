/**
 * Bureau live stream routes (SSE + snapshot).
 * GET /api/ingest/bureau-events  — recent JSON events
 * GET /api/ingest/bureau-stream  — SSE with heartbeats
 */

import { Router, type Request, type Response } from "express";
import {
  listBureauEvents,
  publishBureauEvent,
  sseComment,
  sseSend,
  writeSseHeaders,
} from "../lib/bureau-live-log";
import { logger } from "../lib/logger";

const router = Router();

const HEARTBEAT_MS = 15_000;
const POLL_MS = 2_000;

router.get("/ingest/bureau-events", async (req: Request, res: Response): Promise<void> => {
  const caseId = typeof req.query.caseId === "string" ? req.query.caseId : null;
  const limit = Number(req.query.limit) || 80;
  const events = listBureauEvents({ caseId, limit });
  res.json({
    events,
    count: events.length,
    timestampFormat: "ISO-8601 UTC with milliseconds",
  });
});

/** Optional: POST a bureau event (internal / test). Body is partial BureauLiveEvent. */
router.post("/ingest/bureau-events", async (req: Request, res: Response): Promise<void> => {
  try {
    const event = publishBureauEvent((req.body ?? {}) as any);
    res.status(201).json({ ok: true, event });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "invalid event" });
  }
});

router.get("/ingest/bureau-stream", async (req: Request, res: Response): Promise<void> => {
  const caseId = typeof req.query.caseId === "string" ? req.query.caseId : null;
  writeSseHeaders(res);
  res.write(`retry: 3000\n\n`);

  let lastTsMs = 0;
  let closed = false;
  let pollId: NodeJS.Timeout | undefined;
  let hbId: NodeJS.Timeout | undefined;

  const close = () => {
    if (closed) return;
    closed = true;
    if (pollId) clearInterval(pollId);
    if (hbId) clearInterval(hbId);
  };
  req.on("close", close);

  const sendSnapshot = () => {
    if (closed) return;
    const events = listBureauEvents({ caseId, limit: 50 });
    if (events.length) lastTsMs = Math.max(lastTsMs, events[0]!.tsMs);
    if (closed) return;
    sseSend(res, "snapshot", { events, caseId, serverTime: new Date().toISOString() });
  };

  const tick = () => {
    if (closed) return;
    try {
      const events = listBureauEvents({ caseId, limit: 40 });
      const fresh = events.filter((e) => e.tsMs > lastTsMs).reverse();
      for (const event of fresh) {
        if (closed) return;
        lastTsMs = Math.max(lastTsMs, event.tsMs);
        sseSend(res, "bureau", event);
      }
    } catch (err: any) {
      if (!closed) logger.debug?.({ err: err?.message }, "bureau-stream poll failed");
    }
  };

  sendSnapshot();
  if (closed) return;

  pollId = setInterval(tick, POLL_MS);
  hbId = setInterval(() => {
    if (!closed) sseComment(res, `hb ${new Date().toISOString()}`);
  }, HEARTBEAT_MS);
});

export default router;
