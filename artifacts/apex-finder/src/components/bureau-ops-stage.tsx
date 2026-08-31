import React, { useMemo, useRef } from "react";
import { Activity, AlertTriangle, CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import { ReactorLiveSurface } from "./reactor-live-surface";
import { classifyReactorMethod, cleanResearchText, type ReactorLiveEvent, type ReactorMethod, type ReactorEventStatus } from "../lib/reactor-live-model";

/** Normalize legacy Bureau telemetry before it reaches the research theatre. */
export type OpsEvent = {
  timestamp?: string; stage?: string; status?: string; kind?: string; targetName?: string; targetType?: string;
  activeToolId?: string; toolIds?: string[]; query?: string; prompt?: string; inputSummary?: string; resultSummary?: string;
  sources?: number; evidence?: number; contacts?: number; raw?: string; story?: string; narration?: string; why?: string;
  actor?: "boss" | "investigator" | "registry" | "tool" | "system" | "right_hand" | "web" | "discovery";
  methodKind?: string; sourceUrls?: string[]; links?: Array<{ title?: string; url: string }>;
  caseUpdate?: string; provider?: string;
};

function statusOf(value?: string): ReactorEventStatus {
  const s = String(value || "").toLowerCase();
  if (/queue|pending|waiting/.test(s)) return "queued";
  if (/fail|error|blocked|cancel/.test(s)) return "failed";
  if (/complete|done|success|finished/.test(s)) return "done";
  return "active";
}

function methodOf(event: OpsEvent): ReactorMethod {
  const explicit = String(event.methodKind || "").toLowerCase();
  const map: Record<string, ReactorMethod> = {
    search: "search", browser: "browser", fetch: "browser", page: "browser", registry: "registry",
    domain: "domain", social: "social", graph: "graph", llm: "llm", extract: "llm", case: "case", persona: "case",
  };
  if (map[explicit]) return map[explicit];
  return classifyReactorMethod({ method: "unknown", provider: event.provider || event.activeToolId, title: event.stage || event.kind || "", query: event.query, url: event.sourceUrls?.[0] || event.links?.[0]?.url });
}

function recordedQuery(event: OpsEvent): string | undefined {
  if (event.query) return cleanResearchText(event.query, 180);
  const candidates = [event.inputSummary, event.prompt, event.raw].filter(Boolean).map(String);
  for (const candidate of candidates) {
    const match = candidate.match(/(?:^|\b)(?:query|search(?:ing)?(?:\s+for)?):\s*["“]?(.+?)["”]?(?:$|\n|\r)/i);
    if (match?.[1]) return cleanResearchText(match[1], 180);
    const searching = candidate.match(/\bsearch(?:ing)?\s+(?:for\s+)?["“]([^"”\n]{4,180})["”]/i);
    if (searching?.[1]) return cleanResearchText(searching[1], 180);
  }
  return undefined;
}

function safeSources(event: OpsEvent) {
  const values = [...(event.links || []), ...(event.sourceUrls || []).map((url) => ({ url }))];
  const seen = new Set<string>();
  return values.filter((source) => {
    try {
      const url = new URL(source.url);
      if (!/^https?:$/i.test(url.protocol) || seen.has(url.href)) return false;
      seen.add(url.href); return true;
    } catch { return false; }
  }).slice(0, 8);
}

function toReactorEvent(event: OpsEvent, index: number): ReactorLiveEvent | null {
  const status = statusOf(event.status);
  const method = methodOf(event);
  const sources = safeSources(event);
  const title = cleanResearchText(event.stage || event.kind || event.activeToolId, 120);
  const result = cleanResearchText(event.resultSummary || event.story || event.caseUpdate, 760);
  const prompt = cleanResearchText(event.prompt, 560);
  const why = cleanResearchText(event.why || event.inputSummary, 260);
  const query = recordedQuery(event);
  const narration = cleanResearchText(event.narration, 360);
  if (!title && !result && !prompt && !why && !sources.length && !narration) return null;

  // Stale active telemetry must not masquerade as current work after a run stops.
  let effectiveStatus = status;
  if (status === "active" && event.timestamp) {
    const ts = Date.parse(event.timestamp);
    if (Number.isFinite(ts) && Date.now() - ts > 90_000) effectiveStatus = "done";
  }

  return {
    id: `${event.timestamp || "event"}-${event.activeToolId || event.stage || event.kind || "unknown"}-${index}`,
    timestamp: event.timestamp,
    status: effectiveStatus,
    method,
    title: title || "Research action",
    actor: event.actor,
    provider: event.provider || event.activeToolId,
    targetName: event.targetName,
    query,
    url: sources[0]?.url,
    prompt,
    resultSummary: result,
    sourceUrls: sources.map((source) => source.url),
    sources,
    evidenceCount: typeof event.evidence === "number" ? event.evidence : undefined,
    why,
    narration,
    links: sources,
  };
}

function summaryIcon(status: ReactorEventStatus) {
  if (status === "active") return <CircleDashed className="h-3.5 w-3.5 animate-spin" />;
  if (status === "done") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === "failed") return <XCircle className="h-3.5 w-3.5" />;
  return <Activity className="h-3.5 w-3.5" />;
}

function methodLabel(method: ReactorMethod) {
  return ({ search: "web search", browser: "page research", registry: "public record", domain: "domain intelligence", social: "public profile", graph: "relationship", llm: "analysis", case: "case file", unknown: "research" } as Record<ReactorMethod, string>)[method];
}

function RightHandCallout({ text, compact }: { text?: string; compact: boolean }) {
  if (!text) return null;
  return (
    <aside
      className={`rounded-xl border border-violet-400/20 bg-violet-500/[.045] px-3 py-2 ${compact ? "text-[10px]" : "text-[11px]"}`}
      data-testid="reactor-right-hand"
      aria-label="Adaptive right-hand research note"
    >
      <div className="mb-1 flex items-center gap-2 font-mono text-[8px] font-bold uppercase tracking-[.18em] text-violet-300">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-300" /> Right-hand · research note
      </div>
      <p className="leading-5 text-violet-50/90">{text}</p>
    </aside>
  );
}

/** Shared desktop/mobile Bureau workstage. `compact` is the mobile form. */
export function BureauOpsStage({
  events, compact = false, maxScenes = 12, title = "LIVE DESK",
  onEdgeSwipe, jumpToLiveSignal: _jumpToLiveSignal,
}: {
  events: OpsEvent[]; compact?: boolean; maxScenes?: number; title?: string;
  onEdgeSwipe?: (dir: "prev" | "next") => void; jumpToLiveSignal?: number;
}) {
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const normalized = useMemo(() => {
    const list = (events || []).map(toReactorEvent).filter((event): event is ReactorLiveEvent => Boolean(event));
    const currentTarget = [...list].reverse().find((event) => event.targetName && event.status === "active")?.targetName;
    const scoped = currentTarget ? list.filter((event) => !event.targetName || event.targetName === currentTarget) : list;
    const recent = scoped.slice(-Math.max(1, maxScenes));
    let activeSeen = false;
    return recent.map((event) => {
      if (event.status !== "active") return event;
      if (!activeSeen) { activeSeen = true; return event; }
      return { ...event, status: "done" as ReactorEventStatus };
    });
  }, [events, maxScenes]);

  const targetName = [...normalized].reverse().find((event) => event.targetName)?.targetName;
  const current = [...normalized].reverse().find((event) => event.status === "active") || normalized.at(-1);
  const live = normalized.filter((event) => event.status === "active").length;
  const failures = normalized.filter((event) => event.status === "failed").length;

  if (!normalized.length) {
    return (
      <section className="rounded-2xl border border-dashed border-white/10 bg-[#0d1219]/60 p-4 sm:p-5" data-testid="bureau-ops-stage">
        <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[.2em] text-stone-600"><Activity className="h-3.5 w-3.5" /> {title}</div>
        <p className="mt-2 text-sm text-stone-500">No observable Bureau action has arrived yet.</p>
        <p className="mt-1 text-[10px] leading-5 text-stone-700">Apex does not manufacture search boxes, page visits, or progress states while the backend is idle.</p>
      </section>
    );
  }

  return (
    <section
      className="space-y-3"
      data-testid="bureau-ops-stage"
      onPointerDown={compact ? (event) => { swipeStart.current = { x: event.clientX, y: event.clientY }; } : undefined}
      onPointerUp={compact ? (event) => {
        const start = swipeStart.current;
        swipeStart.current = null;
        if (!start || !onEdgeSwipe) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.abs(dx) < 72 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
        onEdgeSwipe(dx > 0 ? "prev" : "next");
      } : undefined}
      style={compact ? { touchAction: "pan-y" } : undefined}
    >
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/8 bg-[#0d1219]/75 px-3 py-2.5 sm:px-4">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#b8ff4d]/15 bg-[#b8ff4d]/[.04] text-[#b8ff4d]">{summaryIcon(current?.status || "queued")}</div>
        <div className="min-w-0 flex-1">
          <div className="text-[9px] font-semibold uppercase tracking-[.18em] text-stone-600">{title}</div>
          <div className="truncate text-xs font-medium text-stone-200">{targetName ? `Researching ${targetName}` : "Autonomous research"}</div>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-stone-600">
          <span className={live ? "text-[#b8ff4d]" : "text-stone-500"}>{live ? "live" : "quiet"}</span><span>·</span><span>{normalized.length} events</span>
          {failures > 0 ? <><span>·</span><span className="text-rose-300">{failures} failed</span></> : null}
        </div>
      </div>

      <RightHandCallout text={current?.narration} compact={compact} />
      <ReactorLiveSurface events={normalized} targetName={targetName} compact={compact} />

      {!compact && (
        <div className="flex flex-wrap items-center gap-2 px-1 text-[9px] uppercase tracking-[.16em] text-stone-700">
          <span>Observable actions only</span><span>·</span><span>queries and URLs come from Bureau telemetry</span>
          {current?.method ? <><span>·</span><span>{methodLabel(current.method)}</span></> : null}
        </div>
      )}

      {current?.status === "failed" && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-400/15 bg-rose-400/[.04] px-3 py-2 text-[10px] text-rose-200" role="status">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>The latest observable research action failed. The desk is showing the failure rather than inventing a replacement action.</span>
        </div>
      )}
    </section>
  );
}

export default BureauOpsStage;
