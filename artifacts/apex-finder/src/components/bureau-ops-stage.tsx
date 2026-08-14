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
  if (provider === "google" || /google/i.test(toolBlob)) kind = "google";
  else if (provider === "gemini" && /ground/i.test(String(e.resultSummary || e.stage))) kind = "google";
  else if (
    provider === "browser" ||
    /scrapfly|zenrows|visit|fetch|mailto|domain-surface|contact-facts|browser|webdisc|inhouse/i.test(toolBlob)
  ) kind = "browser";
  else if (provider === "prompt" || e.prompt || /groq|llm|extract|persona-review/i.test(tool)) kind = "prompt";
  else if (provider === "domain" || /rdap|whois|whoxy|dns/i.test(toolBlob)) kind = "domain";
  else if (provider === "sherlock" || provider === "maigret" || /footprint|holehe|sherlock/i.test(toolBlob)) kind = "footprint";
  else if (["serp", "serper", "serpapi", "tavily", "exa", "perplexity"].includes(provider) || /tavily|exa|perplexity|serper|serpapi/i.test(tool)) kind = "serp";

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
    if (!active) {
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
  }, [text, active]);
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
      style={{
        borderColor: `${accent}55`,
        background: "linear-gradient(165deg, rgba(17,24,39,0.92) 0%, rgba(11,18,32,0.98) 100%)",
        borderRadius: 12,
        // cut-corner only on roomy desktop chrome — compact mobile must not clip content
        clipPath: compact ? undefined : "polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)",
        boxShadow: live
          ? `0 0 0 1px ${accent}33, 0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)`
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
            <span className="relative inline-flex items-center gap-1.5 shrink-0">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <span className="text-[8px] font-mono uppercase tracking-wider text-emerald-400">live</span>
            </span>
          )}
        </div>
      </div>
      {urlBar != null && (
        <div className={`border-b border-white/5 bg-[#0f172a] ${compact ? "px-2.5 py-1.5" : "px-3 py-2"}`}>
          <div className="flex items-center gap-1.5 rounded-full bg-[#1e293b] px-2.5 py-1 border border-white/5">
            <span className="text-[9px] text-slate-500 shrink-0">{"\uD83D\uDD12"}</span>
            <span className={`font-mono text-slate-300 truncate ${compact ? "text-[10px]" : "text-[11px]"}`}>{urlBar}</span>
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
  const q = scene.query || scene.targetName || scene.subtitle || "";
  const typed = useTyped(q, scene.live, 40);
  return (
    <WindowChrome
      title={providerLabel(scene.provider)}
      live={scene.live}
      accent="#fb923c"
      compact={compact}
      favicon={<ProviderIcon kind={scene.provider} size={compact ? 12 : 14} />}
    >
      <div className="space-y-2">
        <div className="rounded-lg border border-orange-400/30 bg-[#1c1917] px-2.5 py-2 flex items-center gap-2">
          <ProviderIcon kind={scene.provider} size={14} />
          <span className="text-[12px] text-orange-50 font-mono truncate flex-1">{typed || "\u2026"}</span>
        </div>
        {(scene.resultLines.length ? scene.resultLines : ["Streaming hits\u2026"]).map((l, i) => (
          <div key={i} className="text-[11px] text-slate-300 font-mono border-l-2 border-orange-400/40 pl-2">
            {l}
          </div>
        ))}
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
function MobileWorkstage({ scenes }: { scenes: Scene[] }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = React.useRef<number | null>(null);
  const safeIdx = Math.min(idx, Math.max(0, scenes.length - 1));
  const scene = scenes[safeIdx];
  const sceneKey = scenes.map((s) => s.id).join("|");

  useEffect(() => {
    const liveIdx = scenes.findIndex((s) => s.live);
    setIdx(liveIdx >= 0 ? liveIdx : 0);
  }, [sceneKey]);

  // Auto-advance every 5s while multiple scenes and not paused
  useEffect(() => {
    if (paused || scenes.length < 2) return;
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % scenes.length);
    }, 5200);
    return () => window.clearInterval(id);
  }, [paused, scenes.length, sceneKey]);

  if (!scene) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.changedTouches[0]?.clientX ?? null;
    setPaused(true);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchX.current;
    touchX.current = null;
    if (start == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(dx) < 40) {
      setPaused(false);
      return;
    }
    if (dx < 0) setIdx((i) => Math.min(scenes.length - 1, i + 1));
    else setIdx((i) => Math.max(0, i - 1));
    window.setTimeout(() => setPaused(false), 4000);
  };

  return (
    <div
      className="space-y-2.5"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Progress of this step in the run */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${((safeIdx + 1) / Math.max(scenes.length, 1)) * 100}%`,
              background: scene.live
                ? "linear-gradient(90deg,#22d3ee,#a3e635)"
                : "#475569",
            }}
          />
        </div>
        <span className="text-[9px] font-mono tabular-nums text-slate-500 shrink-0">
          {safeIdx + 1}/{scenes.length}
        </span>
      </div>

      <div className="rounded-xl border border-cyan-400/35 bg-gradient-to-br from-cyan-400/[0.11] to-transparent px-3 py-2.5 shadow-[0_0_24px_rgba(34,211,238,0.06)]">
        <div className="flex items-center gap-2 mb-1">
          <ProviderIcon kind={scene.provider} size={14} />
          <span className="text-[9px] font-mono uppercase tracking-[0.16em] text-cyan-300/90">
            {scene.live ? "Now" : "Done"} · {scene.title}
          </span>
          {scene.timestamp && (
            <span className="ml-auto text-[9px] font-mono text-slate-500">{timeLabel(scene.timestamp)}</span>
          )}
        </div>
        <div className="text-[13px] leading-snug text-slate-100 font-medium">{scene.story}</div>
        {scene.targetName && (
          <div className="mt-1 text-[10px] font-mono text-slate-400 truncate">on {scene.targetName}</div>
        )}
      </div>

      <SceneCard scene={scene} compact />

      {scenes.length > 1 && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-mono text-slate-300 disabled:opacity-30 active:scale-95"
            disabled={safeIdx <= 0}
            onClick={() => { setPaused(true); setIdx((i) => Math.max(0, i - 1)); }}
          >
            ← Prev
          </button>
          <div className="flex items-center gap-1.5">
            {scenes.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Scene ${i + 1}`}
                onClick={() => { setPaused(true); setIdx(i); }}
                className="rounded-full transition-all duration-300 ease-out"
                style={{
                  width: i === safeIdx ? 18 : 6,
                  height: 6,
                  background: i === safeIdx ? (s.live ? "#22d3ee" : "#94a3b8") : "#1e293b",
                }}
              />
            ))}
          </div>
          <button
            type="button"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-mono text-slate-300 disabled:opacity-30 active:scale-95"
            disabled={safeIdx >= scenes.length - 1}
            onClick={() => { setPaused(true); setIdx((i) => Math.min(scenes.length - 1, i + 1)); }}
          >
            Next →
          </button>
        </div>
      )}

      {scenes.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {scenes.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setPaused(true); setIdx(i); }}
              className="shrink-0 rounded-lg border px-2 py-1.5 text-left w-[128px]"
              style={{
                borderColor: i === safeIdx ? "#22d3ee66" : "#ffffff10",
                background: i === safeIdx ? "#22d3ee14" : "#0f172a",
              }}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-[8px] font-mono text-slate-600">{i + 1}</span>
                <ProviderIcon kind={s.provider} size={10} />
                <span className="text-[8px] font-mono uppercase tracking-wider text-slate-400 truncate">{s.title}</span>
              </div>
              <div className="text-[9px] text-slate-300 line-clamp-2 leading-tight">{s.story}</div>
            </button>
          ))}
        </div>
      )}

      {scenes.length > 1 && (
        <div className="text-center text-[8px] font-mono text-slate-600 tracking-wider pb-1">
          swipe
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
}: {
  events: OpsEvent[];
  compact?: boolean;
  maxScenes?: number;
  title?: string;
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
        <MobileWorkstage scenes={scenes} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400/90">{title}</div>
        </div>
        <div className="text-[9px] font-mono text-slate-500 tabular-nums">{scenes.length}</div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {scenes.map((s, i) => (
          <div
            key={s.id}
            className="shrink-0 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 max-w-[200px]"
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[9px] font-mono text-slate-500">{i + 1}</span>
              <ProviderIcon kind={s.provider} size={11} />
              <span className="text-[9px] font-mono text-slate-400 truncate">{s.title}</span>
              {s.live && <span className="text-[8px] text-emerald-400 font-mono">LIVE</span>}
            </div>
            <div className="text-[10px] text-slate-300 leading-snug line-clamp-2">{s.story}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
        {scenes.map((s) => (
          <SceneCard key={s.id} scene={s} />
        ))}
      </div>
    </div>
  );
}

export default BureauOpsStage;
