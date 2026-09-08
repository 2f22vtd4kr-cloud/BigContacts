/**
 * Supplemental desk narration plus the canonical Reactor live-activity snapshot.
 * Tool/model execution comes from DigSpan-derived live activities; bureau-events
 * remains narration/history only and is never allowed to manufacture execution.
 */
import { useEffect, useMemo, useState } from "react";
import { liveActivityToReactorEvent } from "./reactor-live-model";
import { useReactorLiveSnapshot } from "./reactor-live-store";

export type BureauDeskEvent = {
  id?: string;
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
    id: parsed?.id ? String(parsed.id) : undefined,
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

function activityToDeskEvent(activity: ReturnType<typeof useReactorLiveSnapshot>["activities"][number]): BureauDeskEvent {
  const event = liveActivityToReactorEvent(activity);
  return {
    id: event.id,
    timestamp: event.timestamp,
    kind: "telemetry",
    stage: event.title,
    status: event.status === "done" ? "done" : event.status,
    targetName: event.targetName,
    activeToolId: event.provider,
    toolIds: event.provider ? [event.provider] : [],
    inputSummary: event.prompt,
    resultSummary: event.resultSummary,
    story: event.title,
    actor: event.actor,
    methodKind: event.method,
    sourceUrls: event.sourceUrls,
    links: event.links,
    provider: event.provider,
  };
}

/** Merge canonical live telemetry with supplemental bureau narration/history. */
export function useBureauLiveDesk(
  eventLog: BureauDeskEvent[] | undefined,
  opts?: { enabled?: boolean; pollMs?: number; atlasLive?: boolean },
) {
  const enabled = opts?.enabled !== false;
  const atlasLive = Boolean(opts?.atlasLive);
  const pollMs = opts?.pollMs ?? 8_000;
  const [bureauEvents, setBureauEvents] = useState<BureauDeskEvent[]>([]);
  const { activities } = useReactorLiveSnapshot();

  useEffect(() => {
    if (!enabled || !atlasLive) {
      setBureauEvents([]);
      return;
    }

    let cancelled = false;
    let controller: AbortController | null = null;
    const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

    const pull = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const res = await fetch(`${base}/api/ingest/bureau-events?limit=40`, {
          credentials: "same-origin",
          signal: controller.signal,
          cache: "no-store",
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
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) setBureauEvents([]);
      }
    };

    void pull();
    const id = window.setInterval(() => void pull(), pollMs);
    return () => {
      cancelled = true;
      controller?.abort();
      window.clearInterval(id);
    };
  }, [enabled, pollMs, atlasLive]);

  const telemetryEvents = useMemo(
    () => (atlasLive ? activities.map(activityToDeskEvent) : []),
    [activities, atlasLive],
  );

  const merged = useMemo(() => {
    const fromLog = Array.isArray(eventLog) ? eventLog : [];
    const normalize = (e: BureauDeskEvent): BureauDeskEvent => atlasLive ? e : { ...e, status: "done" };
    const seen = new Set<string>();
    const out: BureauDeskEvent[] = [];

    // Telemetry is authoritative and deliberately comes first. Narration/history
    // can enrich the desk, but cannot replace or invent a live tool/model event.
    const source = atlasLive ? [...telemetryEvents, ...bureauEvents, ...fromLog] : fromLog;
    for (const e of source) {
      const n = normalize(e);
      const key = n.id || `${n.timestamp || ""}|${n.kind || ""}|${n.stage || n.story || n.narration || ""}`.slice(0, 160);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(n);
    }
    return out.slice(0, 80);
  }, [eventLog, bureauEvents, telemetryEvents, atlasLive]);

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
