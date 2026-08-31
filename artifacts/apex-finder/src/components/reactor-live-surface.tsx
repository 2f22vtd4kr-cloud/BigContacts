import React, { useMemo } from "react";
import {
  Activity,
  ArrowUpRight,
  Brain,
  Building2,
  CheckCircle2,
  CircleDashed,
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
 * Renderer for the first implementation slice of Reactor Live.
 *
 * It intentionally renders a small number of semantic scenes instead of
 * pretending that every tool is a browser. The event itself remains the
 * source of truth; no synthetic query/result is generated here.
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

function statusIcon(status: ReactorLiveEvent["status"]) {
  if (status === "active") return <CircleDashed className="h-3.5 w-3.5 animate-spin" />;
  if (status === "done") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === "failed") return <XCircle className="h-3.5 w-3.5" />;
  return <CircleDashed className="h-3.5 w-3.5" />;
}

function hostname(url?: string) {
  if (!url) return undefined;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return undefined; }
}

function BrowserScene({ event }: { event: ReactorLiveEvent }) {
  const query = explicitResearchQuery(event.query);
  const url = event.url;
  const sources = sourceList(event);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#080b0f] shadow-2xl" data-testid="reactor-browser-scene">
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#11161d] px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <div className="ml-2 min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-1 font-mono text-[11px] text-stone-400">
          {url || "browser session — source not yet opened"}
        </div>
      </div>
      <div className="border-b border-white/10 px-4 py-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Actual research action</div>
        <div className="mt-1 flex min-h-6 items-center gap-2 font-mono text-sm text-stone-200">
          {query ? <><Search className="h-3.5 w-3.5 text-[#b8ff4d]" />{query}</> : <span className="text-stone-500">No explicit query recorded by the event</span>}
        </div>
      </div>
      <div className="min-h-[150px] px-4 py-4">
        {event.resultSummary ? (
          <p className="max-w-3xl text-sm leading-6 text-stone-300">{cleanResearchText(event.resultSummary, 700)}</p>
        ) : (
          <div className="flex h-[110px] items-center justify-center text-xs text-stone-600">Waiting for page evidence…</div>
        )}
        {sources.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {sources.map((source) => (
              <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="group rounded-lg border border-white/8 bg-white/[.02] px-3 py-2 hover:border-[#b8ff4d]/30">
                <div className="flex items-center gap-2 text-xs text-stone-300">
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#b8ff4d]" />
                  <span className="truncate">{source.title || hostname(source.url) || source.url}</span>
                </div>
                <div className="mt-1 truncate font-mono text-[10px] text-stone-600">{hostname(source.url) || source.url}</div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SemanticScene({ event }: { event: ReactorLiveEvent }) {
  const method = classifyReactorMethod(event);
  const sources = sourceList(event);
  return (
    <div className="rounded-xl border border-white/10 bg-white/[.025] p-4" data-testid="reactor-semantic-scene">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#b8ff4d]/15 bg-[#b8ff4d]/5 text-[#b8ff4d]">
          {methodIcon(method)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium text-stone-200">{cleanResearchText(event.title, 100) || "Research action"}</span>
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-stone-500">{statusIcon(event.status)} {event.status}</span>
          </div>
          {event.why && <p className="mt-1 text-xs text-stone-500">{cleanResearchText(event.why, 240)}</p>}
          {event.resultSummary && <p className="mt-3 text-sm leading-6 text-stone-300">{cleanResearchText(event.resultSummary, 700)}</p>}
          {sources.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {sources.map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-stone-400 hover:text-stone-200">
                  <span className="truncate">{source.title || hostname(source.url) || source.url}</span>
                  <ArrowUpRight className="h-3 w-3 shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReactorLiveSurface({ events, targetName, compact = false }: { events: ReactorLiveEvent[]; targetName?: string; compact?: boolean }) {
  const renderable = useMemo(
    () => events.filter(eventIsRenderable).slice(0, compact ? 3 : 12),
    [events, compact],
  );

  return (
    <section className="space-y-3" aria-label="Reactor live research" data-testid="reactor-live-surface">
      <header className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b8ff4d]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#b8ff4d]" /> Reactor Live
          </div>
          <h2 className="mt-1 text-base font-medium text-stone-100">{targetName ? `Researching ${targetName}` : "Live research"}</h2>
        </div>
        <div className="hidden text-right text-[10px] uppercase tracking-wider text-stone-600 sm:block">Rendered from Bureau events</div>
      </header>

      {renderable.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-stone-600">
          No live research evidence has arrived yet.
        </div>
      ) : (
        <div className="space-y-3">
          {renderable.map((event) => {
            const method = classifyReactorMethod(event);
            return method === "search" || method === "browser"
              ? <BrowserScene key={event.id} event={event} />
              : <SemanticScene key={event.id} event={event} />;
          })}
        </div>
      )}
    </section>
  );
}
