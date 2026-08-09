/**
 * Apex Atlas Bureau live event log — Redis LIST + optional SSE.
 * Timestamp wire format: ISO-8601 UTC with milliseconds (…Z).
 * Replit-safe: uses existing permanent Redis; fails soft if unavailable.
 */

import { withPermanentClient } from "./redis";
import { logger } from "./logger";

export type BureauActor =
  | "boss"
  | "right_hand"
  | "web"
  | "tool"
  | "system"
  | "registry"
  | "discovery";

export type BureauLiveEvent = {
  id: string;
  timestamp: string;
  tsMs: number;
  actor: BureauActor;
  title: string;
  caseId?: string;
  jobId?: string;
  targetName?: string;
  provider?: string;
  ask?: string;
  responseSummary?: string;
  detail?: string;
  level?: "info" | "warn" | "error";
};

const GLOBAL_KEY = "apex:bureau:live:events";
const CAP = 300;
const TTL_SEC = 60 * 60 * 24 * 3;

function caseKey(caseId: string) {
  return `apex:bureau:live:case:${caseId}`;
}

export function nowIsoMs(date = new Date()): string {
  return date.toISOString();
}

export function createBureauEvent(
  partial: Omit<BureauLiveEvent, "id" | "timestamp" | "tsMs"> & {
    id?: string;
    timestamp?: string;
  },
): BureauLiveEvent {
  const d = partial.timestamp ? new Date(partial.timestamp) : new Date();
  const ts = Number.isFinite(d.getTime()) ? d : new Date();
  return {
    id: partial.id ?? `evt_${ts.getTime().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: ts.toISOString(),
    tsMs: ts.getTime(),
    actor: partial.actor,
    title: partial.title,
    caseId: partial.caseId,
    jobId: partial.jobId,
    targetName: partial.targetName,
    provider: partial.provider,
    ask: partial.ask,
    responseSummary: partial.responseSummary,
    detail: partial.detail,
    level: partial.level ?? "info",
  };
}

/** Persist event (global + optional per-case). Newest first. */
export async function publishBureauEvent(
  input: Omit<BureauLiveEvent, "id" | "timestamp" | "tsMs"> & {
    id?: string;
    timestamp?: string;
  },
): Promise<BureauLiveEvent> {
  const event = createBureauEvent(input);
  const payload = JSON.stringify(event);
  await withPermanentClient(async (rc) => {
    const pipe = rc.pipeline();
    pipe.lpush(GLOBAL_KEY, payload);
    pipe.ltrim(GLOBAL_KEY, 0, CAP - 1);
    pipe.expire(GLOBAL_KEY, TTL_SEC);
    if (event.caseId) {
      const ck = caseKey(event.caseId);
      pipe.lpush(ck, payload);
      pipe.ltrim(ck, 0, CAP - 1);
      pipe.expire(ck, TTL_SEC);
    }
    await pipe.exec();
  }, undefined).catch((err: any) => {
    logger.debug({ err: err?.message }, "bureau-live-log publish failed (non-fatal)");
  });
  return event;
}

export async function listBureauEvents(options?: {
  caseId?: string | null;
  limit?: number;
}): Promise<BureauLiveEvent[]> {
  const limit = Math.min(Math.max(options?.limit ?? 80, 1), CAP);
  const key = options?.caseId ? caseKey(options.caseId) : GLOBAL_KEY;
  const raw = await withPermanentClient((rc) => rc.lrange(key, 0, limit - 1), [] as string[]);
  const out: BureauLiveEvent[] = [];
  for (const line of raw) {
    try {
      const parsed = JSON.parse(line) as BureauLiveEvent;
      if (parsed && typeof parsed.timestamp === "string" && parsed.title) out.push(parsed);
    } catch {
      /* skip */
    }
  }
  return out;
}

/** Parse structured job-log lines emitted as BUREAU|{json} */
export function tryParseBureauLogLine(line: string): BureauLiveEvent | null {
  const idx = line.indexOf("BUREAU|");
  if (idx < 0) return null;
  try {
    const json = line.slice(idx + "BUREAU|".length);
    const parsed = JSON.parse(json) as BureauLiveEvent;
    if (!parsed?.title) return null;
    return createBureauEvent(parsed);
  } catch {
    return null;
  }
}

/** Human one-liner for reactor / SSE fallback text */
export function formatBureauEventLine(event: BureauLiveEvent): string {
  const bits = [
    event.timestamp,
    event.actor.toUpperCase(),
    event.provider ? `[${event.provider}]` : "",
    event.title,
  ].filter(Boolean);
  if (event.ask) bits.push(`ASK: ${event.ask}`);
  if (event.responseSummary) bits.push(`RESPONSE: ${event.responseSummary}`);
  if (event.detail) bits.push(event.detail);
  return bits.join(" · ");
}

export function writeSseHeaders(res: {
  setHeader: (k: string, v: string) => void;
  write: (chunk: string) => unknown;
  flushHeaders?: () => void;
}): void {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
}

export function sseSend(
  res: { write: (chunk: string) => unknown },
  event: string,
  data: unknown,
): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function sseComment(res: { write: (chunk: string) => unknown }, text: string): void {
  res.write(`: ${text}\n\n`);
}
