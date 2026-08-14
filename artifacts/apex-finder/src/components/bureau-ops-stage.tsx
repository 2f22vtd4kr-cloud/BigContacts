/**
 * Bureau Ops Stage — visual simulation of real OSINT work.
 * Chrome is simulated; queries, URLs, prompts, results come from live events.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  ProviderIcon,
  detectProviderKind,
  providerLabel,
  type ProviderKind,
} from "./provider-icons";
import { REACTOR_PAUSE_MS, REACTOR_SCENE_MS, REACTOR_SHIMMER_MS, REACTOR_UI_MS, REACTOR_AUTO_ADVANCE_MS, REACTOR_SWIPE_VELOCITY, REACTOR_SWIPE_PX, motionOrNone } from "../lib/reactor-motion";

export type OpsEvent = {
  timestamp?: string;
  stage?: string;
  status?: string;
  kind?: string;
  targetName?: string;
  targetType?: string;
  activeToolId?: string;
  toolIds?: string[];
  prompt?: string;
  inputSummary?: string;
  resultSummary?: string;
  sources?: number;
  evidence?: number;
  contacts?: number;
  raw?: string;
};

type SceneKind = "google" | "browser" | "prompt" | "domain" | "footprint" | "serp" | "bureau";

type Scene = {
  id: string;
  kind: SceneKind;
  provider: ProviderKind;
  title: string;
  subtitle?: string;
  query?: string;
  url?: string;
  prompt?: string;
  resultLines: string[];
  status: string;
  targetName?: string;
  timestamp?: string;
  live: boolean;
  story: string;
};

function pickTool(e: OpsEvent): string {
  return String(e.activeToolId || e.toolIds?.[0] || e.stage || e.kind || "");
}

function extractQuery(e: OpsEvent): string | undefined {
  const blob = [e.inputSummary, e.resultSummary, e.stage, e.raw, e.prompt].filter(Boolean).join(" ");
  const m =
    blob.match(/Query:\s*([^\n|]+)/i) ||
    blob.match(/search(?:ing)?\s+(?:for\s+)?["\u201c]?([^"\u201d\n]{8,140})/i) ||
    blob.match(/site:[^\s]+[^\n]{0,80}/i);
  if (m?.[1]) return m[1].trim();
  if (/discover|serp|search|tavily|perplexity|google|gemini|serper/i.test(pickTool(e) + (e.stage || ""))) {
    return e.targetName ? `${e.targetName} owner email contact` : undefined;
  }
  return undefined;
}

function extractUrl(e: OpsEvent): string | undefined {
  const blob = [e.resultSummary, e.inputSummary, e.raw].filter(Boolean).join(" ");
  const m = blob.match(/https?:\/\/[^\s)'"]+/i);
  return m?.[0];
}

function storyFor(kind: SceneKind, e: OpsEvent, query?: string): string {
  const t = e.targetName || "target";
  switch (kind) {
    case "google":
      return `Open web · people behind ${t}`;
    case "browser":
      if (/mailto:|contact.?attribut/i.test(`${e.resultSummary || ""} ${e.activeToolId || ""}`))
        return `Recovering reachable contact`;
      return `Reading a public page`;
    case "prompt":
      return `Extract attributable contacts only`;
    case "domain":
      return `Domain registration · ownership clues`;
    case "footprint":
      return `Username footprint across platforms`;
    case "serp":
      return `${providerLabel(detectProviderKind(pickTool(e)))} · ${t}`;
    default:
      return e.stage || query || `Bureau step on ${t}`;
  }
}

function toScene(e: OpsEvent, index: number): Scene {
  const tool = pickTool(e);
  const provider = detectProviderKind(`${tool} ${e.stage || ""} ${e.resultSummary || ""}`);
  const status = String(e.status || "active");
  const live = !/complete|done|success/i.test(status);
  const query = extractQuery(e);
  const url = extractUrl(e);
  const resultLines = [
    e.resultSummary,
    e.inputSummary && e.inputSummary !== e.resultSummary ? e.inputSummary : null,
    e.sources != null ? `${e.sources} sources` : null,
    e.contacts != null ? `${e.contacts} contacts` : null,
    e.evidence != null ? `${e.evidence} evidence` : null,
  ].filter(Boolean) as string[];

  const toolBlob = `${tool} ${e.stage || ""} ${e.resultSummary || ""} ${e.inputSummary || ""}`;
  let kind: SceneKind = "bureau";
  // Order matters: specific tools first so each gets a distinct visual language
  if (provider === "domain" || /domain-surface|domain-resolver|rdap|whois|whoxy|dns/i.test(toolBlob)) kind = "domain";
  else if (provider === "google" || /\bgoogle\b/i.test(toolBlob)) kind = "google";
  else if (["serp", "serper", "serpapi", "tavily", "exa", "perplexity"].includes(provider) || /tavily|exa|perplexity|serper|serpapi|web.?search/i.test(tool)) kind = "serp";
  else if (provider === "prompt" || e.prompt || /groq|llm|extract|persona-review|gemini/i.test(tool)) kind = "prompt";
  else if (provider === "sherlock" || provider === "maigret" || /footprint|holehe|sherlock|maigret/i.test(toolBlob)) kind = "footprint";
  else if (
    provider === "browser" ||
    /scrapfly|zenrows|visit|fetch|mailto|contact-attribution|contact-facts|browser|webdisc|inhouse/i.test(toolBlob)
  ) kind = "browser";

  const title =
    kind === "google" ? "Google"
      : kind === "browser" ? "Browser"
      : kind === "prompt" ? "Analyst"
      : kind === "domain" ? "Domain"
      : kind === "footprint" ? "Footprint"
      : kind === "serp" ? providerLabel(provider)
      : e.stage || "Bureau";

  return {
    id: `${e.timestamp || index}-${tool}-${index}`,
    kind,
    provider,
    title,
    subtitle: e.stage,
    query,
    url,
    prompt: e.prompt,
    resultLines: resultLines.slice(0, 3),
    status,
    targetName: e.targetName,
    timestamp: e.timestamp,
    live,
    story: storyFor(kind, e, query),
  };
}

function useTyped(text: string | undefined, active: boolean, cps = 40) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!text) {
      setOut("");
      return;
    }
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (!active || reduced) {
      setOut(text);
      return;
    }
    setOut("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, Math.max(10, 1000 / cps));
    return () => window.clearInterval(id);
  }, [text, active, cps]);
  return out;
}

function timeLabel(ts?: string) {
  if (!ts) return "";
  try {
    return ts.slice(11, 19);
  } catch {
    return "";
  }
}

function WindowChrome({
  favicon,
  title,
  urlBar,
  children,
  accent = "#22d3ee",
  live,
  compact,
}: {
  favicon?: React.ReactNode;
  title: string;
  urlBar?: string;
  children: React.ReactNode;
  accent?: string;
  live?: boolean;
  compact?: boolean;
}) {
  // Patterns drawn from high-signal dark dashboards (glass + cut corner + live ping)
  // without swapping the whole design system.
  return (
    <div
      className="relative overflow-hidden border backdrop-blur-md"
      data-live={live ? "true" : "false"}
      style={{
        borderColor: live ? `${accent}99` : `${accent}55`,
        background: "linear-gradient(165deg, rgba(17,24,39,0.92) 0%, rgba(11,18,32,0.98) 100%)",
        borderRadius: 12,
        // cut-corner only on roomy desktop chrome — compact mobile must not clip content
        clipPath: compact ? undefined : "polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)",
        boxShadow: live
          ? `0 0 0 1px ${accent}55, 0 0 24px ${accent}22, 0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)`
          : "0 8px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      {/* top sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}66, transparent)` }}
      />
      <div
        className={`flex items-center gap-2 border-b border-white/5 ${compact ? "px-2.5 py-1.5" : "px-3 py-2"}`}
        style={{ background: "rgba(17,24,39,0.85)" }}
      >
        <div className="flex items-center gap-[6px] pl-0.5">
          <span className="w-[10px] h-[10px] rounded-full bg-[#FF5F57] shadow-[inset_0_-0.5px_0_rgba(0,0,0,0.15)]" />
          <span className="w-[10px] h-[10px] rounded-full bg-[#FEBC2E] shadow-[inset_0_-0.5px_0_rgba(0,0,0,0.15)]" />
          <span className="w-[10px] h-[10px] rounded-full bg-[#28C840] shadow-[inset_0_-0.5px_0_rgba(0,0,0,0.15)]" />
        </div>
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          {favicon}
          <span className={`font-mono text-slate-300 truncate ${compact ? "text-[10px]" : "text-[11px]"}`}>{title}</span>
          {live && (
            <span className="relative inline-flex items-center gap-1 shrink-0 rounded-full border border-emerald-400/50 bg-emerald-400/15 px-1.5 py-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              </span>
              <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-emerald-300">live</span>
            </span>
          )}
        </div>
      </div>
      {urlBar != null && (
        <div className={`relative border-b border-white/5 bg-[#0f172a] ${compact ? "px-2.5 py-1.5" : "px-3 py-2"}`}>
          <div className="flex items-center gap-1.5 rounded-full bg-[#1e293b] px-2.5 py-1 border border-white/5 overflow-hidden">
            <span className="text-[9px] text-slate-500 shrink-0">{"\uD83D\uDD12"}</span>
            <span className={`font-mono text-slate-300 truncate ${compact ? "text-[10px]" : "text-[11px]"}`}>{urlBar}</span>
            {live && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 opacity-40"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.35), transparent)",
                  animation: motionOrNone(`reactorShimmer ${REACTOR_SHIMMER_MS}ms ease-in-out infinite`),
                }}
              />
            )}
          </div>
        </div>
      )}
      <div className={compact ? "p-2.5" : "p-3.5"}>{children}</div>
    </div>
  );
}

function GoogleScene({ scene, compact }: { scene: Scene; compact?: boolean }) {
  const q = scene.query || scene.targetName || "owner contact email";
  const typed = useTyped(q, scene.live, 44);
  return (
    <WindowChrome
      title="Google Search"
      live={scene.live}
      accent="#4285F4"
      compact={compact}
      favicon={<ProviderIcon kind="google" size={compact ? 12 : 14} />}
      urlBar={`google.com/search?q=${encodeURIComponent(q).slice(0, 48)}`}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ProviderIcon kind="google" size={compact ? 18 : 22} />
          <div className="flex-1 rounded-full border border-slate-600 bg-[#1f2937] px-3 py-2 flex items-center gap-2 min-w-0">
            <span className={`text-slate-100 flex-1 truncate ${compact ? "text-[12px]" : "text-[13px]"}`}>
              {typed}
              {scene.live && typed.length < q.length && (
                <span className="inline-block w-0.5 h-3.5 bg-slate-200 ml-0.5 animate-pulse align-middle" />
              )}
            </span>
            <span className="text-[10px] text-blue-400 font-mono shrink-0">Search</span>
          </div>
        </div>
        {(scene.resultLines.length ? scene.resultLines : ["Scanning public results\u2026"]).slice(0, compact ? 2 : 3).map((line, i) => (
          <div key={i} className="rounded-lg bg-[#111827] border border-white/5 px-2.5 py-1.5">
            <div className="text-[9px] text-emerald-500/80 font-mono mb-0.5">result · {i + 1}</div>
            <div className={`text-slate-200 leading-snug ${compact ? "text-[11px]" : "text-[12px]"}`}>{line}</div>
          </div>
        ))}
      </div>
    </WindowChrome>
  );
}

function BrowserScene({ scene, compact }: { scene: Scene; compact?: boolean }) {
  const url =
    scene.url ||
    (scene.targetName
      ? `https://${scene.targetName.replace(/\s+/g, "").toLowerCase()}.com/contact`
      : "https://\u2026");
  const lines = scene.resultLines.length ? scene.resultLines : ["Reading mailto, tel, team cards\u2026"];
  const contactHit = lines.some((l) => /mailto:|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(l));
  return (
    <WindowChrome
      title={scene.subtitle || "Public page"}
      live={scene.live}
      accent={contactHit ? "#34d399" : "#f59e0b"}
      compact={compact}
      favicon={<ProviderIcon kind="browser" size={compact ? 12 : 14} />}
      urlBar={url}
    >
      <div className="space-y-1.5">
        {contactHit && (
          <div className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[9px] font-mono uppercase tracking-[0.16em] text-emerald-300">
            Contact found · reachable vector
          </div>
        )}
        <div className="text-[9px] font-mono uppercase tracking-widest text-amber-400/80">On the page</div>
        <div className={`rounded-lg border p-2.5 font-mono text-[11px] leading-relaxed space-y-1 ${
          contactHit ? "border-emerald-500/30 bg-[#0a1f18] text-slate-200" : "border-amber-500/20 bg-[#0f172a] text-slate-300"
        }`}>
          {lines.map((l, i) => (
            <div key={i}>
              {/@|mailto:/i.test(l) ? <span className="text-emerald-300 font-semibold">{l}</span> : l}
            </div>
          ))}
        </div>
      </div>
    </WindowChrome>
  );
}

function PromptScene({ scene, compact }: { scene: Scene; compact?: boolean }) {
  const body = scene.prompt || scene.resultLines[0] || scene.subtitle || "";
  const typed = useTyped(body.slice(0, compact ? 160 : 260), scene.live, 52);
  return (
    <WindowChrome
      title={`${providerLabel(scene.provider)} · prompt`}
      live={scene.live}
      accent="#a3e635"
      compact={compact}
      favicon={<ProviderIcon kind={scene.provider} size={compact ? 12 : 14} />}
    >
      <div className="rounded-lg bg-black/50 border border-lime-500/20 p-2.5 font-mono text-[11px] text-lime-100/90 leading-relaxed min-h-[72px]">
        <span className="text-lime-500/70">{">>> "}</span>
        {typed}
        {scene.live && <span className="inline-block w-1.5 h-3 bg-lime-400 ml-0.5 animate-pulse" />}
      </div>
      {scene.resultLines[0] && scene.prompt && (
        <div className="mt-1.5 text-[10px] text-slate-400 font-mono line-clamp-2">{scene.resultLines[0]}</div>
      )}
    </WindowChrome>
  );
}

function DomainScene({ scene, compact }: { scene: Scene; compact?: boolean }) {
  return (
    <WindowChrome
      title="RDAP / WHOIS"
      live={scene.live}
      accent="#67e8f9"
      compact={compact}
      favicon={<ProviderIcon kind="domain" size={compact ? 12 : 14} />}
      urlBar="rdap · whoisjson"
    >
      <pre className={`font-mono text-cyan-100/90 leading-relaxed whitespace-pre-wrap ${compact ? "text-[10px]" : "text-[11px]"}`}>
        {(scene.resultLines.length ? scene.resultLines : ["Resolving registrant tokens\u2026"]).join("\n")}
      </pre>
    </WindowChrome>
  );
}

function SerpScene({ scene, compact }: { scene: Scene; compact?: boolean }) {
  const q = scene.query || scene.targetName || scene.subtitle || "owner email contact";
  const typed = useTyped(q, scene.live, 42);
  const hits = scene.resultLines.length ? scene.resultLines : ["Streaming public results…"];
  return (
    <WindowChrome
      title={`${providerLabel(scene.provider)} · web search`}
      live={scene.live}
      accent="#38bdf8"
      compact={compact}
      favicon={<ProviderIcon kind={scene.provider} size={compact ? 12 : 14} />}
      urlBar={`search · ${q.slice(0, 40)}`}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-full border border-sky-500/30 bg-[#0c1929] px-3 py-2.5">
          <ProviderIcon kind={scene.provider} size={16} />
          <span className="min-w-0 flex-1 truncate text-[13px] text-sky-50">
            {typed}
            {scene.live && typed.length < q.length && (
              <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-sky-200 align-middle" />
            )}
          </span>
          <span className="shrink-0 rounded-full bg-sky-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-300">
            Search
          </span>
        </div>
        <div className="space-y-2">
          {hits.slice(0, compact ? 3 : 4).map((l, i) => (
            <div key={i} className="rounded-lg border border-white/5 bg-[#0b1220] px-3 py-2">
              <div className="mb-0.5 text-[9px] font-mono text-sky-500/80">result · {i + 1}</div>
              <div className="text-[12px] leading-snug text-slate-200">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </WindowChrome>
  );
}

function FootprintScene({ scene, compact }: { scene: Scene; compact?: boolean }) {
  return (
    <WindowChrome
      title="Username footprint"
      live={scene.live}
      accent="#c4b5fd"
      compact={compact}
      favicon={<ProviderIcon kind="sherlock" size={compact ? 12 : 14} />}
    >
      <div className={`font-mono text-violet-100/90 space-y-1 ${compact ? "text-[10px]" : "text-[11px]"}`}>
        {(scene.resultLines.length ? scene.resultLines : ["Checking public platforms\u2026"]).map((l, i) => (
          <div key={i}>{"\u25B8"} {l}</div>
        ))}
      </div>
    </WindowChrome>
  );
}

function BureauScene({ scene, compact }: { scene: Scene; compact?: boolean }) {
  return (
    <WindowChrome
      title={scene.title}
      live={scene.live}
      accent="#22d3ee"
      compact={compact}
      favicon={<ProviderIcon kind="bureau" size={compact ? 12 : 14} />}
    >
      <div className="space-y-1">
        {scene.targetName && (
          <div className="text-[9px] font-mono text-cyan-400/80 uppercase tracking-wider">{scene.targetName}</div>
        )}
        {(scene.resultLines.length ? scene.resultLines : [scene.subtitle || "Bureau desk"]).map((l, i) => (
          <div key={i} className={`text-slate-200 leading-snug ${compact ? "text-[11px]" : "text-[12px]"}`}>
            {l}
          </div>
        ))}
      </div>
    </WindowChrome>
  );
}

function SceneCard({ scene, compact }: { scene: Scene; compact?: boolean }) {
  switch (scene.kind) {
    case "google":
      return <GoogleScene scene={scene} compact={compact} />;
    case "browser":
      return <BrowserScene scene={scene} compact={compact} />;
    case "prompt":
      return <PromptScene scene={scene} compact={compact} />;
    case "domain":
      return <DomainScene scene={scene} compact={compact} />;
    case "serp":
      return <SerpScene scene={scene} compact={compact} />;
    case "footprint":
      return <FootprintScene scene={scene} compact={compact} />;
    default:
      return <BureauScene scene={scene} compact={compact} />;
  }
}

/** Mobile: one focused scene + story + swipe + auto-advance on live */
function MobileWorkstage({
  scenes,
  onEdgeSwipe,
}: {
  scenes: Scene[];
  /** Called when user swipes past first/last scene — e.g. open full History */
  onEdgeSwipe?: (dir: "prev" | "next") => void;
}) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [pauseEndsAt, setPauseEndsAt] = useState<number | null>(null);
  const [pauseLeft, setPauseLeft] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const touchStart = React.useRef<{ x: number; y: number; t: number } | null>(null);
  const axisLock = React.useRef<"h" | "v" | null>(null);
  const idxRef = React.useRef(0);
  const scenesLenRef = React.useRef(scenes.length);
  const onEdgeRef = React.useRef(onEdgeSwipe);
  const pauseTimerRef = React.useRef<number | null>(null);
  const safeIdx = Math.min(idx, Math.max(0, scenes.length - 1));
  const scene = scenes[safeIdx];
  const sceneKey = scenes.map((s) => s.id).join("|");

  idxRef.current = safeIdx;
  scenesLenRef.current = scenes.length;
  onEdgeRef.current = onEdgeSwipe;

  /** Pause auto-advance for 8s after any touch/nav (audit P2) */
  const pauseForReading = React.useCallback((ms = REACTOR_PAUSE_MS) => {
    setPaused(true);
    const ends = Date.now() + ms;
    setPauseEndsAt(ends);
    setPauseLeft(Math.ceil(ms / 1000));
    if (pauseTimerRef.current) window.clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = window.setTimeout(() => {
      setPaused(false);
      setPauseEndsAt(null);
      setPauseLeft(0);
    }, ms);
  }, []);

  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) window.clearTimeout(pauseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const liveIdx = scenes.findIndex((s) => s.live);
    setIdx(liveIdx >= 0 ? liveIdx : Math.max(0, scenes.length - 1));
    setDragX(0);
  }, [sceneKey]);

  // Auto-advance every 5.2s while multiple scenes and not paused (live mode only)
  useEffect(() => {
    if (paused || scenes.length < 2) return;
    const hasLive = scenes.some((s) => s.live);
    if (!hasLive) return; // history: user-driven only
    const id = window.setInterval(() => {
      setSlideDir(1);
      setIdx((i) => (i + 1) % scenes.length);
    }, REACTOR_AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [paused, scenes.length, sceneKey]);

  // Countdown label while reading pause is held
  React.useEffect(() => {
    if (!paused || !pauseEndsAt) return;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((pauseEndsAt - Date.now()) / 1000));
      setPauseLeft(left);
      if (left <= 0) {
        setPaused(false);
        setPauseEndsAt(null);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [paused, pauseEndsAt]);


  const goPrev = React.useCallback(() => {
    pauseForReading(REACTOR_PAUSE_MS);
    setSlideDir(-1);
    setIdx((i) => {
      if (i <= 0) {
        onEdgeRef.current?.("prev");
        return 0;
      }
      return i - 1;
    });
  }, [pauseForReading]);

  const goNext = React.useCallback(() => {
    pauseForReading(REACTOR_PAUSE_MS);
    setSlideDir(1);
    setIdx((i) => {
      if (i >= scenesLenRef.current - 1) {
        onEdgeRef.current?.("next");
        return Math.max(0, scenesLenRef.current - 1);
      }
      return i + 1;
    });
  }, [pauseForReading]);

  // Native non-passive listeners so preventDefault works on horizontal lock
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t) return;
      touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
      axisLock.current = null;
      pauseForReading(REACTOR_PAUSE_MS);
      setDragX(0);
    };

    const onMove = (e: TouchEvent) => {
      const start = touchStart.current;
      const t = e.touches[0];
      if (!start || !t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (!axisLock.current) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        axisLock.current = Math.abs(dx) >= Math.abs(dy) * 1.15 ? "h" : "v";
      }
      if (axisLock.current !== "h") return;
      e.preventDefault();
      const i = idxRef.current;
      const n = scenesLenRef.current;
      let visual = dx;
      if ((i <= 0 && dx > 0) || (i >= n - 1 && dx < 0)) visual = dx * 0.25;
      setDragX(visual);
    };

    const onEnd = (e: TouchEvent) => {
      const start = touchStart.current;
      touchStart.current = null;
      const lock = axisLock.current;
      axisLock.current = null;
      setDragX(0);
      if (!start || lock !== "h") {
        pauseForReading(REACTOR_PAUSE_MS);
        return;
      }
      const t = e.changedTouches[0];
      const dx = (t?.clientX ?? start.x) - start.x;
      const dt = Math.max(16, Date.now() - start.t);
      const velocity = Math.abs(dx) / dt; // px/ms
      const threshold = velocity > REACTOR_SWIPE_VELOCITY ? Math.round(REACTOR_SWIPE_PX * 0.45) : REACTOR_SWIPE_PX;
      if (Math.abs(dx) < threshold) {
        pauseForReading(REACTOR_PAUSE_MS);
        return;
      }
      if (dx < 0) goNext();
      else goPrev();
      // goNext/goPrev already schedule 8s pause
    };

    const onCancel = () => {
      touchStart.current = null;
      axisLock.current = null;
      setDragX(0);
      pauseForReading(REACTOR_PAUSE_MS);
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onCancel);
    };
  }, [goNext, goPrev, pauseForReading]);

  // Keyboard arrows only while pointer is over the stage or it contains focus
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON" || tag === "A") return;
      const active = document.activeElement;
      const over =
        root.matches(":hover") ||
        (active instanceof Node && root.contains(active));
      if (!over) return;
      if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      if (e.key === "Home") {
        e.preventDefault();
        pauseForReading(REACTOR_PAUSE_MS);
        setSlideDir(-1);
        setIdx(0);
      }
      if (e.key === "End") {
        e.preventDefault();
        pauseForReading(REACTOR_PAUSE_MS);
        setSlideDir(1);
        setIdx(Math.max(0, scenes.length - 1));
      }
      if (e.key === " " || e.key === "Spacebar") {
        // Space toggles reading pause
        e.preventDefault();
        if (paused) {
          setPaused(false);
          setPauseEndsAt(null);
          setPauseLeft(0);
          if (pauseTimerRef.current) window.clearTimeout(pauseTimerRef.current);
        } else {
          pauseForReading(REACTOR_PAUSE_MS);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, pauseForReading, paused, scenes.length]);


  if (!scene) return null;

  return (
    <div
      ref={rootRef}
      className="space-y-2.5 select-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071018]"
      style={{ touchAction: "pan-y" }}
      data-testid="mobile-workstage-swipe"
      tabIndex={0}
      role="region"
      aria-label="Tool scene workstage"
    >
      <span className="sr-only" style={{ position:"absolute", width:1, height:1, padding:0, margin:-1, overflow:"hidden", clip:"rect(0,0,0,0)", whiteSpace:"nowrap", border:0 }}>
        Scene {safeIdx + 1} of {scenes.length}: {scene.story}
        {scene.live ? " (live)" : ""}
      </span>

      {/* Progress of this step in the run */}
      <div className="flex items-center gap-2">
        <div className={`relative flex-1 rounded-full bg-slate-800 overflow-hidden ${scene.live ? "h-1.5" : "h-1"}`}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${((safeIdx + 1) / Math.max(scenes.length, 1)) * 100}%`,
              background: scene.live
                ? "linear-gradient(90deg,#22d3ee,#a3e635)"
                : "#475569",
              boxShadow: scene.live ? "0 0 10px rgba(34,211,238,0.45)" : undefined,
              transition: `width ${REACTOR_UI_MS * 2}ms ease-out`,
            }}
          />
          {scene.live && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                animation: motionOrNone(`reactorShimmer ${REACTOR_SHIMMER_MS}ms ease-in-out infinite`),
              }}
            />
          )}
        </div>
        <span className="text-[9px] font-mono tabular-nums text-slate-400 shrink-0" aria-hidden>
          {safeIdx + 1}/{scenes.length}
        </span>
      </div>
      <div className="text-[8px] font-mono uppercase tracking-wider text-slate-500 px-0.5">
        {scene.live ? "Live step" : "Step"} {safeIdx + 1} of {scenes.length}
        {scene.title ? ` · ${scene.title}` : ""}
      </div>

      <div className="flex items-center gap-2 px-0.5" aria-live="polite" aria-atomic="true">
        <ProviderIcon kind={scene.provider} size={14} />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium text-slate-100 truncate">{scene.story}</div>
          <div className="text-[9px] font-mono text-slate-500 truncate">
            {scene.live ? "Now" : "Done"} · {scene.title}
            {scene.targetName ? ` · ${scene.targetName}` : ""}
          </div>
        </div>
        {scene.timestamp && (
          <span className="shrink-0 text-[9px] font-mono text-slate-600">{timeLabel(scene.timestamp)}</span>
        )}
      </div>

      <div
        className="min-h-[280px]"
        style={{
          transform: dragX ? `translate3d(${dragX}px,0,0)` : undefined,
          transition: dragX ? "none" : `transform ${REACTOR_UI_MS}ms ease-out`,
          willChange: "transform",
        }}
      >
        {/* Scene enter: 280ms direction-aware slide (audit P0) */}
        <div
          key={scene.id}
          style={{
            animation: dragX
              ? undefined
              : motionOrNone(`${slideDir === 1 ? "sceneSlideLeft" : "sceneSlideRight"} ${REACTOR_SCENE_MS}ms cubic-bezier(0.22,1,0.36,1) both`),
          }}
        >
          <SceneCard scene={scene} compact={false} />
        </div>
      </div>

      {scenes.length > 1 && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="reactor-pressable rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-mono text-slate-300 disabled:opacity-30 disabled:pointer-events-none min-h-[40px]"
            disabled={safeIdx <= 0}
            onClick={goPrev}
            aria-label="Previous scene"
          >
            ← Prev
          </button>
          <div className="flex items-center gap-1.5">
            {scenes.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Scene ${i + 1}${s.live ? " live" : ""}`}
                aria-current={i === safeIdx ? "true" : undefined}
                onClick={() => {
                  pauseForReading(REACTOR_PAUSE_MS);
                  setSlideDir(i > safeIdx ? 1 : -1);
                  setIdx(i);
                }}
                className="reactor-pressable rounded-full touch-manipulation"
                style={{
                  width: i === safeIdx ? 18 : 8,
                  height: i === safeIdx ? 8 : 8,
                  background: i === safeIdx ? (s.live ? "#22d3ee" : "#94a3b8") : "#1e293b",
                  boxShadow: i === safeIdx && s.live ? "0 0 10px #22d3eecc" : undefined,
                  minWidth: i === safeIdx ? 18 : 8,
                }}
              />
            ))}
          </div>
          <button
            type="button"
            className="reactor-pressable rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-mono text-slate-300 disabled:opacity-30 disabled:pointer-events-none min-h-[40px]"
            disabled={safeIdx >= scenes.length - 1}
            onClick={goNext}
            aria-label="Next scene"
          >
            Next →
          </button>
        </div>
      )}

      {paused && scenes.some((s) => s.live) && (
        <button
          type="button"
          className="reactor-pressable mx-auto block text-center text-[8px] font-mono uppercase tracking-wider text-cyan-200"
          data-testid="status-reading-pause"
          style={{ animation: `armIn ${REACTOR_UI_MS}ms ease-out both` }}
          onClick={() => {
            setPaused(false);
            setPauseEndsAt(null);
            setPauseLeft(0);
            if (pauseTimerRef.current) window.clearTimeout(pauseTimerRef.current);
          }}
          aria-label="Resume auto-advance"
        >
          {`Reading pause · ${pauseLeft}s · tap to resume`}
        </button>
      )}

      {scenes.length > 1 && (
        <div
          className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none"
          style={{
            maskImage: "linear-gradient(90deg, transparent, #000 12px, #000 calc(100% - 12px), transparent)",
            WebkitMaskImage: "linear-gradient(90deg, transparent, #000 12px, #000 calc(100% - 12px), transparent)",
          }}
        >
          {scenes.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                pauseForReading(REACTOR_PAUSE_MS);
                setSlideDir(i > safeIdx ? 1 : -1);
                setIdx(i);
              }}
              className="reactor-pressable shrink-0 rounded-lg border px-2 py-1.5 text-left w-[128px]"
              aria-current={i === safeIdx ? "true" : undefined}
              style={{
                borderColor: i === safeIdx ? "#22d3ee66" : s.live ? "#22d3ee33" : "#ffffff10",
                background: i === safeIdx ? "#22d3ee14" : "#0f172a",
                boxShadow: i === safeIdx ? "0 0 12px rgba(34,211,238,0.12)" : undefined,
              }}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-[8px] font-mono text-slate-600">{i + 1}</span>
                <ProviderIcon kind={s.provider} size={10} />
                <span className="text-[8px] font-mono uppercase tracking-wider text-slate-400 truncate">{s.title}</span>
                {s.live && (
                  <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                )}
              </div>
              <div className={`text-[9px] line-clamp-2 leading-tight ${i === safeIdx ? "text-slate-100" : "text-slate-300"}`}>{s.story}</div>
            </button>
          ))}
        </div>
      )}

      {scenes.length > 1 && (
        <div className="text-center text-[8px] font-mono text-slate-500 tracking-wider pb-1">
          {paused
            ? "auto-advance paused · space or tap cue to resume"
            : "swipe or arrows · space pauses · home/end jumps"}
        </div>
      )}
    </div>
  );
}

export function BureauOpsStage({
  events,
  compact = false,
  maxScenes = 6,
  title = "LIVE DESK",
  onEdgeSwipe,
}: {
  events: OpsEvent[];
  compact?: boolean;
  maxScenes?: number;
  title?: string;
  onEdgeSwipe?: (dir: "prev" | "next") => void;
}) {
  const scenes = useMemo(() => {
    const list = (events || []).map(toScene).filter((s) => s.resultLines.length || s.query || s.prompt || s.url);
    return list.slice(0, maxScenes);
  }, [events, maxScenes]);

  if (!scenes.length) {
    return (
      <div className={`rounded-xl border border-dashed border-slate-700/80 bg-slate-950/40 ${compact ? "p-3" : "p-5"}`}>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">{title}</div>
        <div className="text-[12px] text-slate-500">Idle — fills when the desk moves.</div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {title ? (
          <div className="flex items-center justify-between gap-2">
            <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-slate-500">{title}</div>
            <div className="text-[9px] font-mono text-slate-600 tabular-nums">{scenes.length}</div>
          </div>
        ) : null}
        <MobileWorkstage scenes={scenes} onEdgeSwipe={onEdgeSwipe} />
      </div>
    );
  }

  const [focusId, setFocusId] = React.useState<string | null>(
    () => scenes.find((s) => s.live)?.id ?? scenes[0]?.id ?? null,
  );
  React.useEffect(() => {
    const live = scenes.find((s) => s.live);
    if (live) setFocusId(live.id);
  }, [scenes]);

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400/90">{title}</div>
        </div>
        <div className="text-[9px] font-mono text-slate-500 tabular-nums">{scenes.length}</div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Live Desk scenes">
        {scenes.map((s, i) => {
          const selected = (focusId ?? scenes[0]?.id) === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                setFocusId(s.id);
                const el = document.getElementById(`desk-scene-${s.id}`);
                el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }}
              className="reactor-pressable shrink-0 rounded-lg border px-2.5 py-1.5 max-w-[200px] text-left"
              style={{
                borderColor: selected ? "#22d3ee66" : s.live ? "#22d3ee40" : "#ffffff18",
                background: selected ? "#22d3ee14" : "#ffffff08",
                boxShadow: selected ? "0 0 12px rgba(34,211,238,0.12)" : undefined,
              }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[9px] font-mono text-slate-500">{i + 1}</span>
                <ProviderIcon kind={s.provider} size={11} />
                <span className="text-[9px] font-mono text-slate-300 truncate">{s.title}</span>
                {s.live && <span className="text-[8px] text-emerald-300 font-mono font-bold">LIVE</span>}
              </div>
              <div className="text-[10px] text-slate-300 leading-snug line-clamp-2">{s.story}</div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
        {scenes.map((s) => {
          const anyLive = scenes.some((x) => x.live);
          const focused = (focusId ?? scenes.find((x) => x.live)?.id ?? scenes[0]?.id) === s.id;
          const dim = anyLive ? !s.live && !focused : !focused && scenes.length > 1;
          return (
            <div
              key={s.id}
              id={`desk-scene-${s.id}`}
              role="tabpanel"
              style={{
                opacity: dim ? 0.55 : 1,
                transform: dim ? "scale(0.985)" : "scale(1)",
                transition: "opacity 220ms ease, transform 220ms ease",
                filter: dim ? "saturate(0.7)" : undefined,
                outline: focused ? "1px solid rgba(34,211,238,0.35)" : undefined,
                borderRadius: 8,
              }}
            >
              <SceneCard scene={s} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BureauOpsStage;
