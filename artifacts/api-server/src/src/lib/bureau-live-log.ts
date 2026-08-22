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
  /** Short action kind: plan | gate | search | page-fetch | extract | decision | registry … */
  kind?: string;
  /** Operator-facing reason (rendered as WHY). */
  why?: string;
  ask?: string;
  responseSummary?: string;
  detail?: string;
  level?: "info" | "warn" | "error";
};

const GLOBAL_KEY = "apex:bureau:live:events";
const CAP = 300;
const TTL_SEC = 60 * 60 * 24 * 3;

let mirrorWindowStart = 0;
let mirrorWindowCount = 0;
const MIRROR_WINDOW_MS = 10_000;
const MIRROR_MAX_PER_WINDOW = 40;

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
    kind: partial.kind,
    why: partial.why,
    ask: partial.ask,
    responseSummary: partial.responseSummary,
    detail: partial.detail,
    level: partial.level ?? "info",
  };
}

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

  // Mirror into Atlas job log so Reactor atlas-status eventLog sees dig steps
  if (event.jobId) {
    void import("./job-queue")
      .then(({ appendJobLog }) =>
        appendJobLog(
          event.jobId!,
          `BUREAU|${JSON.stringify({
            actor: event.actor,
            kind: event.kind,
            title: event.title,
            targetName: event.targetName,
            provider: event.provider,
            why: event.why,
            ask: event.ask,
            responseSummary: event.responseSummary,
            timestamp: event.timestamp,
            narration: event.kind === "narration" ? event.title : undefined,
          })}`,
        ),
      )
      .catch(() => {});
  }

  // Right-hand adaptive narration for Reactor (non-blocking; never delays research)
  if (event.kind !== "narration") {
    try {
      const { scheduleBureauLiveNarration } = await import("./bureau-live-narration");
      scheduleBureauLiveNarration(event);
    } catch {
      /* optional */
    }
  }

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

export function formatBureauEventLine(event: BureauLiveEvent): string {
  const bits = [
    event.timestamp,
    event.actor.toUpperCase(),
    event.kind ? event.kind : "",
    event.provider ? `[${event.provider}]` : "",
    event.title,
  ].filter(Boolean);
  if (event.why) bits.push(`WHY: ${event.why}`);
  if (event.ask) bits.push(`ASK: ${event.ask}`);
  if (event.responseSummary) bits.push(`OUT: ${event.responseSummary}`);
  else if (event.detail) bits.push(event.detail);
  return bits.join(" · ");
}

export function classifyJobLogLine(line: string): {
  publish: boolean;
  actor: BureauActor;
  title: string;
} {
  const trimmed = (line || "").trim();
  if (trimmed.length < 8) return { publish: false, actor: "system", title: trimmed };

  const lower = trimmed.toLowerCase();
  if (/^\d+%/.test(trimmed)) return { publish: false, actor: "system", title: trimmed };
  if (/\b(heartbeat|ping|noop)\b/.test(lower) && trimmed.length < 40) {
    return { publish: false, actor: "system", title: trimmed };
  }

  let actor: BureauActor = "system";
  if (/\b(gemini|boss|case bureau decision|decision:)\b/.test(lower)) actor = "boss";
  else if (/\b(nvidia|right[- ]hand|advisor)\b/.test(lower)) actor = "right_hand";
  else if (/\b(tavily|perplexity|exa|web search|open-web|serper)\b/.test(lower)) actor = "web";
  else if (/\b(maigret|holehe|sherlock|python-tool|footprint)\b/.test(lower)) actor = "tool";
  else if (/\b(registry|edgar|companies house|brreg|bodacc|gleif)\b/.test(lower)) actor = "registry";
  else if (/\b(discovery|broad categor|intake)\b/.test(lower)) actor = "discovery";

  const interesting =
    actor !== "system" ||
    /\b(phase|started|failed|error|complete|admitted|target|contact|email|phone|telegram|instagram)\b/.test(lower);

  return { publish: interesting, actor, title: trimmed.slice(0, 240) };
}

/** Rate-limited mirror used by job-queue.appendJobLog */
export async function mirrorJobLogLine(jobId: string, line: string): Promise<void> {
  const structured = tryParseBureauLogLine(line);
  if (structured) {
    await publishBureauEvent({ ...structured, jobId: structured.jobId ?? jobId });
    return;
  }
  const { publish, actor, title } = classifyJobLogLine(line);
  if (!publish) return;

  const now = Date.now();
  if (now - mirrorWindowStart > MIRROR_WINDOW_MS) {
    mirrorWindowStart = now;
    mirrorWindowCount = 0;
  }
  if (mirrorWindowCount >= MIRROR_MAX_PER_WINDOW) return;
  mirrorWindowCount += 1;

  await publishBureauEvent({
    actor,
    title,
    jobId,
    detail: line.length > 240 ? line.slice(0, 500) : undefined,
  });
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
  res.setHeader("Access-Control-Allow-Origin", "*");
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
