import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Brain,
  Building2,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  Globe2,
  Link2,
  MapPin,
  Search,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import {
  classifyReactorMethod,
  cleanResearchText,
  eventIsRenderable,
  explicitResearchQuery,
  sourceList,
  type ReactorLiveEvent,
  type ReactorMethod,
} from "../lib/reactor-live-model";

/**
 * Reactor Live is a renderer for observable Bureau telemetry.
 *
 * The visual layer may animate real recorded values, but it must never invent
 * a query, URL, source, result, or completed action. This is deliberately a
 * research-theatre UI rather than a chatbot transcript.
 */

function methodIcon(method: ReactorMethod) {
  switch (method) {
    case "search": return <Search className="h-4 w-4" />;
    case "browser": return <Globe2 className="h-4 w-4" />;
    case "registry": return <Building2 className="h-4 w-4" />;
    case "domain": return <MapPin className="h-4 w-4" />;
    case "social": return <UserRound className="h-4 w-4" />;
    case "graph": return <Link2 className="h-4 w-4" />;
    case "llm": return <Brain className="h-4 w-4" />;
    case "case": return <ShieldCheck className="h-4 w-4" />;
    default: return <Activity className="h-4 w-4" />;
  }
}

function methodLabel(method: ReactorMethod) {
  return ({
    search: "WEB SEARCH",
    browser: "PAGE RESEARCH",
    registry: "PUBLIC RECORD",
    domain: "DOMAIN INTELLIGENCE",
    social: "PUBLIC PROFILE",
    graph: "RELATIONSHIP",
    llm: "ANALYSIS",
    case: "CASE FILE",
    unknown: "RESEARCH",
  } as Record<ReactorMethod, string>)[method];
}

function statusIcon(status: ReactorLiveEvent["status"]) {
  if (status === "active") return <CircleDashed className="h-3.5 w-3.5 animate-spin" />;
  if (status === "done") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === "failed") return <XCircle className="h-3.5 w-3.5" />;
  return <CircleDashed className="h-3.5 w-3.5" />;
}

function statusText(status: ReactorLiveEvent["status"]) {
  return status === "active" ? "LIVE" : status === "done" ? "DONE" : status === "failed" ? "FAILED" : "QUEUED";
}

function hostname(url?: string) {
  if (!url) return undefined;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return undefined; }
}

function useTypedPlayback(text: string | undefined, active: boolean, cps = 48) {
  const [visible, setVisible] = useState("");
  useEffect(() => {
    if (!text) {
      setVisible("");
      return;
    }
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (!active || reduced) {
      setVisible(text);
      return;
    }
    setVisible("");
    let index = 0;
    const id = window.setInterval(() => {
      index += 1;
      setVisible(text.slice(0, index));
      if (index >= text.length) window.clearInterval(id);
    }, Math.max(12, Math.round(1000 / cps)));
    return () => window.clearInterval(id);
  }, [text, active, cps]);
  return visible;
}

function SourceChips({ event, compact = false }: { event: ReactorLiveEvent; compact?: boolean }) {
  const sources = sourceList(event);
  if (!sources.length) return null;
  return (
    <div className={`flex flex-wrap ${compact ? "gap-1" : "gap-1.5"}`} data-testid="reactor-source-list">
      {sources.map((source) => (
        <a
          key={source.url}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex max-w-full items-center gap-1 rounded-full border border-white/10 bg-black/25 px-2 py-1 text-[10px] text-stone-400 transition-colors hover:border-[#b8ff4d]/35 hover:text-stone-100"
        >
          <span className="truncate">{source.title || hostname(source.url) || source.url}</span>
          <ArrowUpRight className="h-3 w-3 shrink-0 text-[#b8ff4d]/80" />
        </a>
      ))}
    </div>
  );
}

function BrowserScene({ event, compact }: { event: ReactorLiveEvent; compact: boolean }) {
  const query = explicitResearchQuery(event.query);
  const typedQuery = useTypedPlayback(query, event.status === "active", compact ? 64 : 52);
  const sources = sourceList(event);
  const url = event.url || sources[0]?.url;
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#080b0f] shadow-[0_20px_60px_rgba(0,0,0,.28)]" data-testid="reactor-browser-scene">
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#10151b] px-3 py-2">
        <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-[#b8ff4d]/20 bg-[#b8ff4d]/5 text-[#b8ff4d]">
          <Globe2 className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[10px] font-semibold uppercase tracking-[.18em] text-stone-500">Apex research view</div>
          <div className="truncate font-mono text-[11px] text-stone-300">{hostname(url) || "web source not opened"}</div>
        </div>
        {event.status === "active" && <span className="rounded-full bg-[#b8ff4d] px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider text-[#0a0d0f]">LIVE</span>}
      </div>

      <div className="border-b border-white/10 bg-[#0d1117] px-3 py-3 sm:px-4">
        <div className="mb-1 text-[9px] font-semibold uppercase tracking-[.18em] text-stone-600">Actual submitted query</div>
        <div className="flex min-h-8 items-center gap-2 rounded-xl border border-white/10 bg-black/35 px-3 py-2 font-mono text-xs text-stone-200">
          <Search className="h-3.5 w-3.5 shrink-0 text-[#b8ff4d]" />
          {query ? <span className="min-w-0 break-words">{typedQuery}{event.status === "active" && typedQuery.length < query.length ? <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-[#b8ff4d] align-middle" /> : null}</span> : <span className="text-stone-600">No explicit query was recorded for this event.</span>}
        </div>
      </div>

      <div className="px-3 py-3 sm:px-4 sm:py-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-[9px] font-semibold uppercase tracking-[.18em] text-stone-600">Observed result</div>
          {event.evidenceCount != null && <span className="font-mono text-[10px] text-stone-500">{event.evidenceCount} evidence</span>}
        </div>
        {sources.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {sources.slice(0, compact ? 3 : 6).map((source) => (
              <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="group rounded-xl border border-white/8 bg-white/[.02] p-3 transition-colors hover:border-[#b8ff4d]/30 hover:bg-[#b8ff4d]/[.025]">
                <div className="flex items-start gap-2">
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b8ff4d]/80" />
                  <div className="min-w-0">
                    <div className="line-clamp-2 text-xs font-medium text-stone-200">{source.title || hostname(source.url) || source.url}</div>
                    <div className="mt-1 truncate font-mono text-[9px] text-stone-600">{hostname(source.url) || source.url}</div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/8 bg-white/[.02] p-3 text-sm leading-6 text-stone-400">
            {cleanResearchText(event.resultSummary, compact ? 420 : 720) || (event.status === "active" ? "Waiting for the source response…" : "The event contains no stored result text.")}
          </div>
        )}
        {event.resultSummary && sources.length > 0 && (
          <p className="mt-3 text-xs leading-5 text-stone-400">{cleanResearchText(event.resultSummary, compact ? 360 : 560)}</p>
        )}
        <div className="mt-3"><SourceChips event={event} compact={compact} /></div>
      </div>
    </div>
  );
}

function SemanticScene({ event, compact }: { event: ReactorLiveEvent; compact: boolean }) {
  const method = classifyReactorMethod(event);
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[.025] p-3.5 sm:p-4" data-testid="reactor-semantic-scene">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#b8ff4d]/15 bg-[#b8ff4d]/[.04] text-[#b8ff4d]">{methodIcon(method)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[9px] font-semibold uppercase tracking-[.18em] text-[#b8ff4d]/80">{methodLabel(method)}</span>
            <span className="text-[9px] uppercase tracking-[.16em] text-stone-600">{event.provider || "Bureau"}</span>
            <span className="ml-auto inline-flex items-center gap-1 text-[9px] uppercase tracking-[.14em] text-stone-500">{statusIcon(event.status)} {statusText(event.status)}</span>
          </div>
          <h3 className="mt-1 text-sm font-medium text-stone-100">{cleanResearchText(event.title, 120) || "Research action"}</h3>
          {event.why && <p className="mt-1 text-xs leading-5 text-stone-500">{cleanResearchText(event.why, 260)}</p>}
          {event.prompt && <div className="mt-3 rounded-xl border border-white/8 bg-black/25 p-2.5 font-mono text-[10px] leading-5 text-stone-400"><span className="text-stone-600">recorded input · </span>{cleanResearchText(event.prompt, compact ? 360 : 560)}</div>}
          {event.resultSummary && <p className="mt-3 text-sm leading-6 text-stone-300">{cleanResearchText(event.resultSummary, compact ? 480 : 760)}</p>}
          <div className="mt-3"><SourceChips event={event} compact={compact} /></div>
        </div>
      </div>
    </article>
  );
}

function eventFromMaybeUnknown(value: unknown): value is ReactorLiveEvent {
  if (!value || typeof value !== "object") return false;
  const e = value as Partial<ReactorLiveEvent>;
  return typeof e.id === "string" && typeof e.title === "string" && typeof e.status === "string";
}

export function ReactorLiveSurface({
  events,
  targetName,
  compact = false,
}: {
  events: ReactorLiveEvent[];
  targetName?: string;
  compact?: boolean;
}) {
  const renderable = useMemo(
    () => events.filter(eventIsRenderable).filter(eventFromMaybeUnknown).slice(-(compact ? 5 : 12)),
    [events, compact],
  );
  const current = [...renderable].reverse().find((event) => event.status === "active") || renderable.at(-1);
  const liveCount = renderable.filter((event) => event.status === "active").length;
  const sourceCount = renderable.reduce((sum, event) => sum + sourceList(event).length, 0);
  const evidenceCount = renderable.reduce((sum, event) => sum + (event.evidenceCount || 0), 0);

  return (
    <section className="space-y-3" aria-label="Reactor live research" data-testid="reactor-live-surface">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[.22em] text-[#b8ff4d]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#b8ff4d]" /> Reactor Live · observable research
          </div>
          <h2 className="mt-1 truncate text-base font-medium text-stone-100">{targetName ? `Researching ${targetName}` : "Live research"}</h2>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-right">
          {[{ label: "live", value: liveCount }, { label: "sources", value: sourceCount }, { label: "evidence", value: evidenceCount }].map((metric) => (
            <div key={metric.label} className="rounded-lg border border-white/8 bg-white/[.02] px-2.5 py-1.5">
              <div className="font-mono text-xs tabular-nums text-stone-200">{metric.value}</div>
              <div className="text-[8px] uppercase tracking-[.16em] text-stone-600">{metric.label}</div>
            </div>
          ))}
        </div>
      </header>

      {current ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-0.5 text-[9px] font-semibold uppercase tracking-[.18em] text-stone-600">
            <span className="h-px flex-1 bg-white/8" />
            Current observable action
            <span className="h-px flex-1 bg-white/8" />
          </div>
          {classifyReactorMethod(current) === "search" || classifyReactorMethod(current) === "browser"
            ? <BrowserScene event={current} compact={compact} />
            : <SemanticScene event={current} compact={compact} />}

          {renderable.length > 1 && (
            <div className="space-y-2" data-testid="reactor-activity-feed">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[9px] font-semibold uppercase tracking-[.18em] text-stone-600">Under the hood · recent activity</span>
                <span className="font-mono text-[9px] text-stone-700">{renderable.length} observed events</span>
              </div>
              <div className="space-y-1.5">
                {[...renderable].reverse().slice(1).map((event) => {
                  const method = classifyReactorMethod(event);
                  return (
                    <div key={event.id} className="flex items-center gap-2 rounded-xl border border-white/7 bg-white/[.015] px-3 py-2.5">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[.035] text-stone-500">{methodIcon(method)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[11px] font-medium text-stone-300">{cleanResearchText(event.title, 100) || "Research action"}</span>
                          <span className="ml-auto shrink-0 font-mono text-[8px] uppercase tracking-wider text-stone-600">{statusText(event.status)}</span>
                        </div>
                        <div className="mt-0.5 truncate text-[10px] text-stone-600">{cleanResearchText(event.resultSummary || event.why, 180) || "No additional result text recorded."}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center">
          <Activity className="mx-auto h-5 w-5 text-stone-700" />
          <div className="mt-2 text-xs font-medium text-stone-500">No observable research activity yet</div>
          <p className="mx-auto mt-1 max-w-sm text-[10px] leading-5 text-stone-700">The desk stays quiet until a real Bureau event arrives. Apex never fabricates a search or page visit just to make the interface look busy.</p>
        </div>
      )}
    </section>
  );
}
