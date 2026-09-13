/**
 * Supplemental Bureau events for Reactor desk narration and terminal history.
 *
 * IMPORTANT: recentSpans are the authoritative live execution feed. This hook
 * may poll bureau-events for right-hand narration, but it deliberately does
 * not expose those events as desktop live scenes. That prevents the legacy
 * BureauOpsStage from becoming a second, independently interpreted live feed.
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
  // Bureau events are supplemental. They may only carry active chrome while
  // Atlas is actually running and the producer explicitly emitted a recent event.
  const recordedStatus = String(parsed?.status ?? "").toLowerCase();
  let status = recordedStatus === "failed" || recordedStatus === "error"
    ? "failed"
    : recordedStatus === "active" || recordedStatus === "running"
      ? "active"
      : "done";
  if (status === "done" && atlasLive) {
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

/**
 * Merge job history for terminal views, while keeping bureau-events strictly
 * supplemental during a live run. The live scene consumer is recentSpans.
 */
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
    if (!atlasLive) {
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
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) {
          setBureauEvents([]);
        }
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

  const terminalEvents = useMemo(() => {
    const fromLog = Array.isArray(eventLog) ? eventLog : [];
    if (atlasLive) return [];

    const seen = new Set<string>();
    const out: BureauDeskEvent[] = [];
    for (const event of fromLog) {
      const normalized = { ...event, status: "done" };
      const key = `${normalized.timestamp || ""}|${normalized.kind || ""}|${normalized.stage || normalized.story || normalized.narration || ""}`.slice(0, 160);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(normalized);
    }
    return out.slice(0, 80);
  }, [eventLog, atlasLive]);

  const latestNarration = useMemo(() => {
    if (!atlasLive) return null;
    for (const event of bureauEvents) {
      if (event.narration && event.narration.length > 8) return event.narration;
      if (event.kind === "narration" && (event.story || event.stage)) return event.story || event.stage;
    }
    return null;
  }, [bureauEvents, atlasLive]);

  return {
    // During a live run this is intentionally empty. The legacy scene stage
    // must not render a second interpretation of live execution telemetry.
    deskEvents: terminalEvents,
    bureauCount: bureauEvents.length,
    latestNarration,
  };
}
