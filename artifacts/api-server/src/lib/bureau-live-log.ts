/**
 * Bureau live event ring buffer — backs /api/ingest/bureau-events (+ SSE).
 * Fail-closed: events are observational only; never invent contact facts here.
 */

export type BureauLiveEvent = {
  ts: string;
  tsMs: number;
  caseId?: string | null;
  kind?: string;
  stage?: string;
  title?: string;
  type?: string;
  action?: string;
  status?: string;
  targetName?: string;
  entityName?: string;
  toolId?: string;
  tool?: string;
  activeToolId?: string;
  toolIds?: string[];
  specialistId?: string;
  lane?: string;
  prompt?: string;
  investigatorPrompt?: string;
  inputSummary?: string;
  summary?: string;
  message?: string;
  resultSummary?: string;
  result?: string;
  detail?: string;
  sources?: number;
  evidence?: number;
  contacts?: number;
};

const MAX = 200;
const ring: BureauLiveEvent[] = [];

export function publishBureauEvent(partial: Partial<BureauLiveEvent> & { message?: string }): BureauLiveEvent {
  const now = Date.now();
  const event: BureauLiveEvent = {
    ts: new Date(now).toISOString(),
    tsMs: now,
    kind: partial.kind || "bureau",
    stage: partial.stage || partial.title || partial.action || "Bureau",
    status: partial.status || "active",
    ...partial,
  };
  ring.unshift(event);
  if (ring.length > MAX) ring.length = MAX;
  return event;
}

export function listBureauEvents(opts?: { caseId?: string | null; limit?: number }): BureauLiveEvent[] {
  const limit = Math.min(Math.max(opts?.limit ?? 40, 1), MAX);
  let list = ring;
  if (opts?.caseId) list = list.filter((e) => e.caseId === opts.caseId);
  return list.slice(0, limit);
}

export function writeSseHeaders(res: { setHeader: (k: string, v: string) => void; flushHeaders?: () => void }) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  try { res.flushHeaders?.(); } catch { /* optional */ }
}

export function sseSend(res: { write: (chunk: string) => void }, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function sseComment(res: { write: (chunk: string) => void }, comment: string) {
  res.write(`: ${comment}\n\n`);
}
