/**
 * Live bureau events for Reactor desk (desktop + mobile).
 * Polls /api/ingest/bureau-events and maps right-hand narration into OpsEvent shape.
 *
 * INTEGRITY: when Atlas is not running, the desk must not look LIVE.
 * Stale Redis tails / carousel spin are not research.
 */
import { useEffect, useMemo, useState } from "react";

export type BureauDeskEvent = {
  timestamp?: string;
  kind?: string;
  stage?: string;
  status?: string;
  targetName?: string;
  activeToolId?: string;
  toolIds?: string[];
  inputSummary?: string;
  resultSummary?: string;
  story?: string;
  narration?: string;
  why?: string;
  actor?: string;
  methodKind?: string;
  sourceUrls?: string[];
  links?: Array<{ title?: string; url: string }>;
  raw?: string;
  provider?: string;
};

function mapBureauPayload(parsed: any, atlasLive: boolean): BureauDeskEvent {
  const isNarration = parsed?.kind === "narration" || parsed?.actor === "right_hand";
  // Only mark active while Atlas is actually running AND event is very recent.
  let status = "done";
  if (atlasLive) {
    try {
      const ts = parsed?.timestamp ? Date.parse(String(parsed.timestamp)) : NaN;
      if (Number.isFinite(ts) && Date.now() - ts < 25_000) status = "active";
    } catch {
      status = "done";
    }
  }
  return {
    timestamp: parsed?.timestamp,
    kind: parsed?.kind || (isNarration ? "narration" : "log"),
    stage: parsed?.title,
    status,
    targetName: parsed?.targetName,
    activeToolId: parsed?.provider,
    toolIds: parsed?.provider ? [String(parsed.provider)] : [],
    inputSummary: parsed?.why,
    resultSummary: parsed?.responseSummary || parsed?.detail,
    story: isNarration ? parsed?.title : (parsed?.why || parsed?.title),
    narration: isNarration ? parsed?.title : parsed?.narration,
    why: parsed?.why,
    actor: parsed?.actor,
    methodKind: parsed?.kind,
    provider: parsed?.provider,
  };
}

/** Merge job eventLog with live bureau poll. When not live, strip active chrome. */
export function useBureauLiveDesk(
  eventLog: BureauDeskEvent[] | undefined,
  opts?: { enabled?: boolean; pollMs?: number; atlasLive?: boolean },
) {
  const enabled = opts?.enabled !== false;
  const atlasLive = Boolean(opts?.atlasLive);
  const pollMs = opts?.pollMs ?? 8_000;
  const [bureauEvents, setBureauEvents] = useState<BureauDeskEvent[]>([]);

  useEffect(() => {
    if (!enabled) return;
    // Idle: do not poll bureau-events — stops fake feed after process death / stop
    if (!atlasLive) {
      setBureauEvents([]);
      return;
    }
    let cancelled = false;
    const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

    const pull = async () => {
      try {
        const res = await fetch(`${base}/api/ingest/bureau-events?limit=40`, {
          credentials: "same-origin",
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const list = Array.isArray(data?.events) ? data.events : [];
        if (!cancelled) {
          setBureauEvents(
            list
              .map((row: any) => mapBureauPayload(row, true))
              .filter((e: BureauDeskEvent) => e.stage || e.narration || e.story),
          );
        }
      } catch {
        /* soft — network down must not invent feed */
        if (!cancelled) setBureauEvents([]);
      }
    };

    void pull();
    const id = window.setInterval(() => void pull(), pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, pollMs, atlasLive]);

  const merged = useMemo(() => {
    const fromLog = Array.isArray(eventLog) ? eventLog : [];
    // When not live: only finished history (no active status), prefer empty for desk chrome
    const normalize = (e: BureauDeskEvent): BureauDeskEvent =>
      atlasLive ? e : { ...e, status: "done" };

    const seen = new Set<string>();
    const out: BureauDeskEvent[] = [];
    const source = atlasLive ? [...bureauEvents, ...fromLog] : fromLog;
    for (const e of source) {
      const n = normalize(e);
      const key = `${n.timestamp || ""}|${n.kind || ""}|${n.stage || n.story || n.narration || ""}`.slice(0, 160);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(n);
    }
    return out.slice(0, 80);
  }, [eventLog, bureauEvents, atlasLive]);

  const latestNarration = useMemo(() => {
    if (!atlasLive) return null;
    for (const e of merged) {
      if (e.narration && e.narration.length > 8) return e.narration;
      if (e.kind === "narration" && (e.story || e.stage)) return e.story || e.stage;
    }
    return null;
  }, [merged, atlasLive]);

  return { deskEvents: merged, bureauCount: bureauEvents.length, latestNarration };
}
