/**
 * Live bureau events for Reactor desk (desktop + mobile).
 * Polls /api/ingest/bureau-events and maps right-hand narration into OpsEvent shape.
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

function mapBureauPayload(parsed: any): BureauDeskEvent {
  const isNarration = parsed?.kind === "narration" || parsed?.actor === "right_hand";
  // Age-out LIVE chrome: only recent events stay "active". Stale Redis tails must not
  // keep the desk showing NOW after Atlas is idle.
  let status = "done";
  try {
    const ts = parsed?.timestamp ? Date.parse(String(parsed.timestamp)) : NaN;
    if (Number.isFinite(ts) && Date.now() - ts < 90_000) status = "active";
  } catch {
    status = "done";
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

/** Merge job eventLog with live bureau SSE/poll feed. Narration prefers bureau feed. */
export function useBureauLiveDesk(eventLog: BureauDeskEvent[] | undefined, opts?: { enabled?: boolean; pollMs?: number }) {
  const enabled = opts?.enabled !== false;
  const pollMs = opts?.pollMs ?? 5000;
  const [bureauEvents, setBureauEvents] = useState<BureauDeskEvent[]>([]);

  useEffect(() => {
    if (!enabled) return;
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
          setBureauEvents(list.map(mapBureauPayload).filter((e: BureauDeskEvent) => e.stage || e.narration || e.story));
        }
      } catch {
        /* soft */
      }
    };

    void pull();
    const id = window.setInterval(() => void pull(), pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, pollMs]);

  const merged = useMemo(() => {
    const fromLog = Array.isArray(eventLog) ? eventLog : [];
    // Prefer freshest bureau narration/tool events first, then job log
    const seen = new Set<string>();
    const out: BureauDeskEvent[] = [];
    for (const e of [...bureauEvents, ...fromLog]) {
      const key = `${e.timestamp || ""}|${e.kind || ""}|${e.stage || e.story || e.narration || ""}`.slice(0, 160);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
    }
    return out.slice(0, 80);
  }, [eventLog, bureauEvents]);

  const latestNarration = useMemo(() => {
    for (const e of merged) {
      if (e.narration && e.narration.length > 8) return e.narration;
      if (e.kind === "narration" && (e.story || e.stage)) return e.story || e.stage;
    }
    return null;
  }, [merged]);

  return { deskEvents: merged, bureauCount: bureauEvents.length, latestNarration };
}
