import React, { useMemo } from "react";
import { Activity, ArrowUpRight, Brain, Building2, CheckCircle2, CircleDashed, Clock3, Globe2, Link2, MapPin, Search, ShieldCheck, UserRound, XCircle, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useReactorLiveTelemetry, type LiveActivity } from "../lib/reactor-live-store";
import { classifyReactorMethod, cleanResearchText, eventIsRenderable, explicitResearchQuery, normalizeReactorStatus, reactorEventKey, sourceList, type ReactorLiveEvent, type ReactorMethod } from "../lib/reactor-live-model";

/**
 * Reactor Live is a truthful replay of the Bureau's recorded work, not a
 * simulated "AI typing" scene. Every visible action must originate in a live
 * span/event. The presentation deliberately resembles a human research desk:
 * decision -> action -> source -> finding -> next action.
 */

function CoolingTowerMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <path d="M8 27c1.2-4.5 2-9.4 2.3-14.5C10.5 9.2 13.5 6 16 6s5.5 3.2 5.7 6.5C22 17.6 22.8 22.5 24 27" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M7 27h18M11 12h10M12.2 8.2c1.1-1.8 2.4-2.7 3.8-2.7s2.7.9 3.8 2.7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M13.2 3.5c-.9-1.1-.8-2 .2-3M18.8 3.5c.9-1.1.8-2-.2-3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}

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

function actorLabel(activity: Pick<LiveActivity, "actor" | "agent">): string {
  const value = String(activity.actor ?? activity.agent ?? "").toLowerCase();
  if (value.includes("right") || value.includes("advisor")) return "RIGHT HAND";
  if (value.includes("boss") || value.includes("gemini")) return "BOSS";
  if (value.includes("groq") || value.includes("mistral") || value.includes("investigator") || value.includes("dig")) return "INVESTIGATOR";
  return cleanResearchText(activity.actor ?? activity.agent, 40)?.toUpperCase() || "BUREAU";
}

function actionLabel(event: ReactorLiveEvent): string {
  const method = classifyReactorMethod(event);
  if (event.status === "failed") return "Encountered a blocked step";
  if (event.status === "active") {
    if (method === "search") return "Searching the public web";
    if (method === "browser") return "Reading a public page";
    if (method === "registry") return "Checking a public registry";
    if (method === "domain") return "Resolving domain evidence";
    if (method === "graph") return "Following an evidence relationship";
    if (method === "llm") return "Assessing the evidence";
    return "Working the case";
  }
  if (method === "search") return "Searched the public web";
  if (method === "browser") return "Read a public page";
  if (method === "registry") return "Checked a public registry";
  if (method === "domain") return "Resolved domain evidence";
  if (method === "graph") return "Followed an evidence relationship";
  if (method === "llm") return "Assessed the evidence";
  if (method === "case") return "Updated the evidence case";
  return cleanResearchText(event.title, 90) || "Recorded research action";
}

function durationLabel(start?: string, end?: string): string | null {
  if (!start) return null;
  const a = Date.parse(start);
  const b = end ? Date.parse(end) : Date.now();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  const ms = b - a;
  if (ms < 1000) return "<1s";
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

function relativeTime(value?: string): string {
  if (!value) return "—";
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (seconds < 2) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

function ToolInput({ prompt }: { prompt?: string }) {
  const text = cleanResearchText(prompt, 360);
  if (!text) return null;
  return (
    <details className="mt-3 rounded-lg border border-white/8 bg-black/25">
      <summary className="cursor-pointer list-none px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-stone-600 hover:text-stone-400">Recorded action input</summary>
      <div className="border-t border-white/6 px-3 py-2 font-mono text-[11px] leading-5 text-stone-400">{text}</div>
    </details>
  );
}

function BrowserScene({ event }: { event: ReactorLiveEvent }) {
  const query = explicitResearchQuery(event.query);
  const url = event.url;
  const sources = sourceList(event);
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#080b0f] shadow-[0_18px_50px_rgba(0,0,0,.28)]">
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#11161d] px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <div className="ml-2 min-w-0 flex-1 truncate rounded-md border border-white/10 bg-black/30 px-3 py-1 font-mono text-[10px] text-stone-500">{url || "public web session — page not yet recorded"}</div>
      </div>
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-stone-600"><Search className="h-3 w-3" /> Actual research action</div>
        <div className="mt-1 font-mono text-sm text-stone-200">{query || <span className="text-stone-500">No explicit query recorded — showing the recorded action only</span>}</div>
      </div>
      <div className="px-4 py-4">
        {event.resultSummary ? <p className="max-w-4xl text-sm leading-6 text-stone-300">{cleanResearchText(event.resultSummary, 900)}</p> : <div className="flex min-h-[72px] items-center text-xs text-stone-600">Waiting for recorded page evidence…</div>}
        <ToolInput prompt={event.prompt} />
        {sources.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2">{sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="group rounded-lg border border-white/8 bg-white/[.02] px-3 py-2 hover:border-[#b8ff4d]/30"><div className="flex items-center gap-2 text-xs text-stone-300"><ArrowUpRight className="h-3.5 w-3.5 text-[#b8ff4d]" /><span className="truncate">{source.title || hostname(source.url) || source.url}</span></div><div className="mt-1 truncate font-mono text-[10px] text-stone-600">{hostname(source.url) || source.url}</div></a>)}</div>}
      </div>
    </div>
  );
}

function SemanticScene({ event }: { event: ReactorLiveEvent }) {
  const method = classifyReactorMethod(event);
  const sources = sourceList(event);
  return (
    <div className="rounded-xl border border-white/10 bg-white/[.025] p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#b8ff4d]/15 bg-[#b8ff4d]/5 text-[#b8ff4d]">{methodIcon(method)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium text-stone-100">{cleanResearchText(event.title, 120) || "Research action"}</span><span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-stone-500">{statusIcon(event.status)} {event.status}</span></div>
          {event.why && <p className="mt-1 text-xs text-stone-500">{cleanResearchText(event.why, 260)}</p>}
          {event.resultSummary && <p className="mt-3 text-sm leading-6 text-stone-300">{cleanResearchText(event.resultSummary, 900)}</p>}
          <ToolInput prompt={event.prompt} />
          {sources.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-stone-400 hover:text-stone-200"><span className="truncate">{source.title || hostname(source.url) || source.url}</span><ArrowUpRight className="h-3 w-3 shrink-0" /></a>)}</div>}
        </div>
      </div>
    </div>
  );
}

function activityToEvent(activity: LiveActivity): ReactorLiveEvent {
  const title = activity.tool || activity.operation || activity.spanType || "Research activity";
  const recordedInput = cleanResearchText(activity.inputSummary, 360);
  const query = explicitResearchQuery(recordedInput);
  const method = classifyReactorMethod({ method: "unknown", provider: activity.tool, title, query, url: activity.sourceUrls?.[0] });
  return { id: activity.id, timestamp: activity.startedAt, status: activity.status === "active" ? "active" : activity.status === "failed" ? "failed" : activity.status === "queued" ? "queued" : "done", method, title, actor: activity.actor, provider: activity.tool, targetName: activity.target, query, prompt: recordedInput, resultSummary: activity.resultSummary, sourceUrls: activity.sourceUrls, url: activity.sourceUrls?.[0] };
}

function EventRow({ event, index, isNewest }: { event: ReactorLiveEvent; index: number; isNewest: boolean }) {
  const method = classifyReactorMethod(event);
  const actor = String(event.actor ?? "").toLowerCase();
  const actorName = actor.includes("right") ? "RIGHT HAND" : actor.includes("boss") || actor.includes("gemini") ? "BOSS" : actor.includes("groq") || actor.includes("mistral") || actor.includes("investigator") ? "INVESTIGATOR" : (cleanResearchText(event.actor, 36)?.toUpperCase() || "BUREAU");
  const action = actionLabel(event);
  const duration = durationLabel(event.timestamp, event.status === "active" ? undefined : event.timestamp);
  const scene = method === "search" || method === "browser" ? <BrowserScene event={event} /> : <SemanticScene event={event} />;
  return (
    <motion.article layout initial={{ opacity: 0, y: 16, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .28, delay: Math.min(index * .025, .15) }} className="relative pl-8 sm:pl-11">
      <div className="absolute left-[8px] top-3 bottom-[-18px] w-px bg-gradient-to-b from-[#9cff1a]/50 via-white/8 to-transparent sm:left-[14px]" aria-hidden="true" />
      <div className="absolute left-[2px] top-2 grid h-4 w-4 place-items-center rounded-full border border-[#9cff1a]/40 bg-[#0b111a] sm:left-[8px]" aria-hidden="true">
        <span className={`h-1.5 w-1.5 rounded-full ${event.status === "failed" ? "bg-rose-400" : event.status === "active" ? "bg-[#b8ff4d] shadow-[0_0_10px_#b8ff4d]" : "bg-[#9cff1a]"}`} />
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] uppercase tracking-[0.14em]">
        <span className="font-semibold text-[#b8ff4d]">{actorName}</span><span className="text-stone-700">·</span><span className="text-stone-500">{action}</span><span className="text-stone-700">·</span><span className="text-stone-700">{relativeTime(event.timestamp)}</span>
        {event.provider && <span className="rounded-full border border-white/8 px-1.5 py-0.5 text-stone-600">{event.provider}</span>}
        {duration && <span className="ml-auto inline-flex items-center gap-1 text-stone-600"><Clock3 className="h-3 w-3" />{duration}</span>}
        {isNewest && event.status === "active" && <span className="inline-flex items-center gap-1 text-[#b8ff4d]"><Zap className="h-3 w-3" />LIVE</span>}
      </div>
      {scene}
    </motion.article>
  );
}

export function ReactorLiveSurface({ events, targetName, compact = false, activities }: { events: ReactorLiveEvent[]; targetName?: string; compact?: boolean; activities?: LiveActivity[] }) {
  const telemetry = useReactorLiveTelemetry();
  const liveActivities = activities ?? telemetry.activities;
  const liveRun = telemetry.runStatus === "running" || telemetry.runStatus === "paused";
  const renderable = useMemo(() => {
    const source = activities ? liveActivities.map(activityToEvent) : liveRun ? liveActivities.map(activityToEvent) : events;
    const seen = new Set<string>();
    return source
      .map((event) => ({ ...event, status: normalizeReactorStatus(event.status) }))
      .filter((event) => { const key = reactorEventKey(event); if (seen.has(key) || !eventIsRenderable(event)) return false; seen.add(key); return true; })
      .sort((a, b) => Date.parse(String(a.timestamp ?? "")) - Date.parse(String(b.timestamp ?? "")))
      .slice(-(compact ? 5 : 18));
  }, [activities, liveActivities, liveRun, events, compact]);

  const activeCount = renderable.filter((event) => event.status === "active").length;
  const sourceCount = new Set(renderable.flatMap((event) => sourceList(event).map((source) => source.url))).size;
  const completedCount = renderable.filter((event) => event.status === "done").length;

  return (
    <section className="space-y-4" aria-label="Reactor live research" data-testid="reactor-live-surface">
      <header className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a1018] shadow-[0_18px_60px_rgba(0,0,0,.24)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/8 px-4 py-3 sm:px-5">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#9cff1a]/20 bg-[#9cff1a]/5 text-[#b8ff4d]"><CoolingTowerMark size={27} /></div>
          <div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b8ff4d]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#b8ff4d]" /> Reactor Live</div><h2 className="mt-1 truncate text-base font-medium text-stone-100">{targetName ? `Researching ${targetName}` : "Bureau research replay"}</h2></div>
          <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-stone-600"><span className="rounded-full border border-white/8 px-2 py-1">{liveRun ? "LIVE TRACE" : "RECORDED TRACE"}</span><span className="hidden rounded-full border border-white/8 px-2 py-1 sm:inline">{renderable.length} EVENTS</span></div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-white/8">
          <div className="px-4 py-3"><div className="text-[9px] uppercase tracking-[0.16em] text-stone-600">Steps observed</div><div className="mt-1 text-lg font-semibold text-stone-200">{renderable.length}</div></div>
          <div className="px-4 py-3"><div className="text-[9px] uppercase tracking-[0.16em] text-stone-600">Sources surfaced</div><div className="mt-1 text-lg font-semibold text-stone-200">{sourceCount}</div></div>
          <div className="px-4 py-3"><div className="text-[9px] uppercase tracking-[0.16em] text-stone-600">{liveRun ? "Working now" : "Completed"}</div><div className="mt-1 flex items-center gap-2 text-lg font-semibold text-stone-200">{liveRun ? activeCount : completedCount}{liveRun && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#b8ff4d]" />}</div></div>
        </div>
      </header>

      {renderable.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0a1018] px-5 py-12 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-white/8 text-stone-600"><Activity className="h-5 w-5" /></div><div className="mt-4 text-sm text-stone-500">{liveRun ? "The Bureau is live, but no research span has arrived yet." : "No recorded research activity is available."}</div><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-stone-700">This surface intentionally stays empty rather than inventing browser actions, queries, findings, or progress.</p></div>
      ) : (
        <div className="space-y-5">
          <AnimatePresence initial={false} mode="popLayout">
            {renderable.map((event, index) => <EventRow key={reactorEventKey(event)} event={event} index={index} isNewest={index === renderable.length - 1} />)}
          </AnimatePresence>
          {liveRun && <div className="ml-8 flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-stone-700 sm:ml-11"><span className="h-1.5 w-1.5 animate-ping rounded-full bg-[#9cff1a]" /> waiting for the Bureau's next recorded action</div>}
        </div>
      )}
    </section>
  );
}
