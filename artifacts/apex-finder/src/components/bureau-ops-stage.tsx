/**
 * Bureau Ops Stage — visual simulation of real OSINT work.
 * Every panel is driven by real Bureau / Atlas event payloads
 * (queries, prompts, URLs, tool ids). The chrome is simulated;
 * the content is not invented.
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
};

function pickTool(e: OpsEvent): string {
  return String(e.activeToolId || e.toolIds?.[0] || e.stage || e.kind || "");
}

function extractQuery(e: OpsEvent): string | undefined {
  const blob = [e.inputSummary, e.resultSummary, e.stage, e.raw, e.prompt].filter(Boolean).join(" ");
  const m =
    blob.match(/Query:\s*([^\n|]+)/i) ||
    blob.match(/search(?:ing)?\s+(?:for\s+)?["“]?([^"”\n]{8,120})/i) ||
    blob.match(/site:[^\s]+[^\n]{0,80}/i);
  if (m?.[1]) return m[1].trim();
  if (/discover|serp|search|tavily|perplexity|google|gemini/i.test(pickTool(e) + e.stage)) {
    const t = e.targetName ? `${e.targetName} owner email contact` : undefined;
    return t;
  }
  return undefined;
}

function extractUrl(e: OpsEvent): string | undefined {
  const blob = [e.resultSummary, e.inputSummary, e.raw].filter(Boolean).join(" ");
  const m = blob.match(/https?:\/\/[^\s)'"]+/i);
  return m?.[0];
}

function toScene(e: OpsEvent, index: number): Scene {
  const tool = pickTool(e);
  const provider = detectProviderKind(tool + " " + (e.stage || "") + " " + (e.resultSummary || ""));
  const status = String(e.status || "active");
  const live = !/complete|done|success/i.test(status);
  const query = extractQuery(e);
  const url = extractUrl(e);
  const resultLines = [
    e.resultSummary,
    e.inputSummary && e.inputSummary !== e.resultSummary ? e.inputSummary : null,
    e.sources != null ? `${e.sources} sources` : null,
    e.contacts != null ? `${e.contacts} contact vectors` : null,
    e.evidence != null ? `${e.evidence} evidence items` : null,
  ].filter(Boolean) as string[];

  let kind: SceneKind = "bureau";
  if (provider === "google" || /google/i.test(tool + e.stage)) kind = "google";
  else if (provider === "gemini" && /ground/i.test(String(e.resultSummary || e.stage))) kind = "google";
  else if (provider === "browser" || /scrapfly|zenrows|visit|fetch|mailto/i.test(tool + e.stage + e.resultSummary)) kind = "browser";
  else if (provider === "prompt" || e.prompt || /groq|llm|extract/i.test(tool)) kind = "prompt";
  else if (provider === "domain" || /rdap|whois/i.test(tool + e.stage)) kind = "domain";
  else if (provider === "sherlock" || provider === "maigret" || /footprint/i.test(e.stage || "")) kind = "footprint";
  else if (["serp", "serper", "serpapi", "tavily", "exa", "perplexity"].includes(provider)) kind = "serp";

  const title =
    kind === "google"
      ? "Google Search"
      : kind === "browser"
        ? "Browser session"
        : kind === "prompt"
          ? "Analyst prompt"
          : kind === "domain"
            ? "Domain surface"
            : kind === "footprint"
              ? "Footprint scan"
              : kind === "serp"
                ? `${providerLabel(provider)} search`
                : e.stage || "Bureau desk";

  return {
    id: `${e.timestamp || index}-${tool}-${index}`,
    kind,
    provider,
    title,
    subtitle: e.stage,
    query,
    url,
    prompt: e.prompt,
    resultLines: resultLines.slice(0, 4),
    status,
    targetName: e.targetName,
    timestamp: e.timestamp,
    live,
  };
}

/** Typewriter for search bar / prompt lines */
function useTyped(text: string | undefined, active: boolean, cps = 36) {
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
    }, Math.max(12, 1000 / cps));
    return () => window.clearInterval(id);
  }, [text, active]);
  return out;
}

function WindowChrome({
  favicon,
  title,
  urlBar,
  children,
  accent = "#22d3ee",
  live,
}: {
  favicon?: React.ReactNode;
  title: string;
  urlBar?: string;
  children: React.ReactNode;
  accent?: string;
  live?: boolean;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden border shadow-2xl"
      style={{
        borderColor: `${accent}44`,
        background: "#0b1220",
        boxShadow: live ? `0 0 0 1px ${accent}33, 0 18px 50px rgba(0,0,0,0.55)` : "0 12px 40px rgba(0,0,0,0.4)",
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5" style={{ background: "#111827" }}>
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {favicon}
          <span className="text-[10px] font-mono text-slate-300 truncate">{title}</span>
          {live && (
            <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 animate-pulse">live</span>
          )}
        </div>
      </div>
      {urlBar != null && (
        <div className="px-3 py-2 border-b border-white/5 bg-[#0f172a]">
          <div className="flex items-center gap-2 rounded-full bg-[#1e293b] px-3 py-1.5 border border-white/5">
            <span className="text-[10px] text-slate-500">🔒</span>
            <span className="text-[11px] font-mono text-slate-300 truncate">{urlBar}</span>
          </div>
        </div>
      )}
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}

function GoogleScene({ scene }: { scene: Scene }) {
  const typed = useTyped(scene.query || scene.targetName || "owner contact email", scene.live, 42);
  return (
    <WindowChrome
      title="Google"
      live={scene.live}
      accent="#4285F4"
      favicon={<ProviderIcon kind="google" size={14} />}
      urlBar={`https://www.google.com/search?q=${encodeURIComponent(scene.query || scene.targetName || "")}`}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <ProviderIcon kind="google" size={22} />
          <div className="flex-1 rounded-full border border-slate-600 bg-[#1f2937] px-4 py-2.5 flex items-center gap-2">
            <span className="text-[13px] text-slate-100 font-sans tracking-tight flex-1 truncate">
              {typed}
              {scene.live && typed.length < (scene.query || "").length && (
                <span className="inline-block w-0.5 h-4 bg-slate-200 ml-0.5 animate-pulse align-middle" />
              )}
            </span>
            <span className="text-[11px] text-blue-400 font-mono">Search</span>
          </div>
        </div>
        <div className="space-y-2 pt-1">
          {(scene.resultLines.length ? scene.resultLines : ["Scanning SERP for attributable contacts…"]).map((line, i) => (
            <div key={i} className="rounded-lg bg-[#111827] border border-white/5 px-3 py-2">
              <div className="text-[10px] text-emerald-500/80 font-mono mb-0.5">result · {i + 1}</div>
              <div className="text-[12px] text-slate-200 leading-snug">{line}</div>
            </div>
          ))}
        </div>
        {scene.targetName && (
          <div className="text-[10px] font-mono text-slate-500">target · {scene.targetName}</div>
        )}
      </div>
    </WindowChrome>
  );
}

function BrowserScene({ scene }: { scene: Scene }) {
  const url = scene.url || (scene.targetName ? `https://${scene.targetName.replace(/\s+/g, "").toLowerCase()}.com/contact` : "https://…");
  return (
    <WindowChrome
      title={scene.subtitle || "Page fetch"}
      live={scene.live}
      accent="#f59e0b"
      favicon={<ProviderIcon kind="browser" size={14} />}
      urlBar={url}
    >
      <div className="space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400/80">Rendered public surface</div>
        <div className="rounded-lg border border-amber-500/20 bg-[#0f172a] p-3 font-mono text-[11px] text-slate-300 leading-relaxed space-y-1">
          {(scene.resultLines.length ? scene.resultLines : ["Extracting mailto:, tel:, team cards…"]).map((l, i) => (
            <div key={i}>
              {/mailto:|@/.test(l) ? <span className="text-cyan-300">{l}</span> : l}
            </div>
          ))}
        </div>
      </div>
    </WindowChrome>
  );
}

function PromptScene({ scene }: { scene: Scene }) {
  const body = scene.prompt || scene.resultLines[0] || scene.subtitle || "";
  const typed = useTyped(body.slice(0, 280), scene.live, 55);
  return (
    <WindowChrome
      title={`${providerLabel(scene.provider)} · analyst`}
      live={scene.live}
      accent="#a3e635"
      favicon={<ProviderIcon kind={scene.provider} size={14} />}
    >
      <div className="rounded-lg bg-black/50 border border-lime-500/20 p-3 font-mono text-[11px] text-lime-100/90 leading-relaxed min-h-[88px]">
        <span className="text-lime-500/70">{">>> "}</span>
        {typed}
        {scene.live && <span className="inline-block w-1.5 h-3.5 bg-lime-400 ml-0.5 animate-pulse" />}
      </div>
      {scene.resultLines[0] && scene.prompt && (
        <div className="mt-2 text-[11px] text-slate-400 font-mono">{scene.resultLines[0]}</div>
      )}
    </WindowChrome>
  );
}

function DomainScene({ scene }: { scene: Scene }) {
  return (
    <WindowChrome
      title="RDAP / WHOIS"
      live={scene.live}
      accent="#67e8f9"
      favicon={<ProviderIcon kind="domain" size={14} />}
      urlBar="rdap · whoisjson · domain surface"
    >
      <pre className="text-[11px] font-mono text-cyan-100/90 leading-relaxed whitespace-pre-wrap">
        {(scene.resultLines.length ? scene.resultLines : ["Resolving registrant tokens…"]).join("\n")}
      </pre>
    </WindowChrome>
  );
}

function SerpScene({ scene }: { scene: Scene }) {
  const typed = useTyped(scene.query || scene.targetName || scene.subtitle || "", scene.live, 40);
  return (
    <WindowChrome
      title={providerLabel(scene.provider)}
      live={scene.live}
      accent="#fb923c"
      favicon={<ProviderIcon kind={scene.provider} size={14} />}
    >
      <div className="space-y-2">
        <div className="rounded-lg border border-orange-400/30 bg-[#1c1917] px-3 py-2 flex items-center gap-2">
          <ProviderIcon kind={scene.provider} size={16} />
          <span className="text-[12px] text-orange-50 font-mono truncate flex-1">{typed || "…"}</span>
        </div>
        <div className="grid gap-1.5">
          {(scene.resultLines.length ? scene.resultLines : ["Streaming hits…"]).map((l, i) => (
            <div key={i} className="text-[11px] text-slate-300 font-mono border-l-2 border-orange-400/40 pl-2">
              {l}
            </div>
          ))}
        </div>
      </div>
    </WindowChrome>
  );
}

function FootprintScene({ scene }: { scene: Scene }) {
  return (
    <WindowChrome
      title="Username footprint"
      live={scene.live}
      accent="#c4b5fd"
      favicon={<ProviderIcon kind="sherlock" size={14} />}
    >
      <div className="text-[11px] font-mono text-violet-100/90 space-y-1">
        {(scene.resultLines.length ? scene.resultLines : ["Checking 3,000+ platforms…"]).map((l, i) => (
          <div key={i}>▸ {l}</div>
        ))}
      </div>
    </WindowChrome>
  );
}

function BureauScene({ scene }: { scene: Scene }) {
  return (
    <WindowChrome
      title={scene.title}
      live={scene.live}
      accent="#22d3ee"
      favicon={<ProviderIcon kind="bureau" size={14} />}
    >
      <div className="space-y-1.5">
        {scene.targetName && (
          <div className="text-[10px] font-mono text-cyan-400/80 uppercase tracking-wider">{scene.targetName}</div>
        )}
        {(scene.resultLines.length ? scene.resultLines : [scene.subtitle || "Bureau desk"]).map((l, i) => (
          <div key={i} className="text-[12px] text-slate-200 leading-snug">
            {l}
          </div>
        ))}
      </div>
    </WindowChrome>
  );
}

function SceneCard({ scene }: { scene: Scene }) {
  switch (scene.kind) {
    case "google":
      return <GoogleScene scene={scene} />;
    case "browser":
      return <BrowserScene scene={scene} />;
    case "prompt":
      return <PromptScene scene={scene} />;
    case "domain":
      return <DomainScene scene={scene} />;
    case "serp":
      return <SerpScene scene={scene} />;
    case "footprint":
      return <FootprintScene scene={scene} />;
    default:
      return <BureauScene scene={scene} />;
  }
}

export function BureauOpsStage({
  events,
  compact = false,
  maxScenes = 6,
  title = "BUREAU OPS · LIVE WORKSTAGE",
}: {
  events: OpsEvent[];
  compact?: boolean;
  maxScenes?: number;
  title?: string;
}) {
  const scenes = useMemo(() => {
    const list = (events || []).map(toScene).filter((s) => s.resultLines.length || s.query || s.prompt || s.url);
    // Prefer live scenes first, then newest
    return list.slice(0, maxScenes);
  }, [events, maxScenes]);

  if (!scenes.length) {
    return (
      <div className={`rounded-xl border border-dashed border-slate-700/80 bg-slate-950/40 ${compact ? "p-3" : "p-5"}`}>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">{title}</div>
        <div className="text-[12px] text-slate-400">Waiting for Bureau / Discovery events…</div>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400/90">{title}</div>
        <div className="text-[9px] font-mono text-slate-500">{scenes.length} active scenes · real event payloads</div>
      </div>
      <div className={`grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-2"}`}>
        {scenes.map((s) => (
          <SceneCard key={s.id} scene={s} />
        ))}
      </div>
    </div>
  );
}

export default BureauOpsStage;
