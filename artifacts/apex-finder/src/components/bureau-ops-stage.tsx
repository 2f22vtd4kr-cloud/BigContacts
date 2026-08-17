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
import { ActivityGlyph, ActivityGlyphMini } from "./activity-glyph";
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
  /** Phase K */
  terminal?: "done" | "failed" | null;
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
  const matches = blob.match(/https?:\/\/[^\s)'"<>]+/gi) || [];
  const target = (e.targetName || "").toLowerCase().replace(/[^a-z]/g, "");
  const TRUSTED =
    /linkedin\.com|companieshouse\.gov|sec\.gov|edgar|opencorporates|wikidata|wikipedia|bbc\.|reuters|bloomberg|ft\.com|nytimes|wsj\.com|forbes|crunchbase|pitchbook|github\.com|archive\.org|gov\.|edu\/|courtlistener|propublica|opencorporates|dnb\.com|bloomberg/i;
  const candidates: string[] = [];
  for (const raw of matches) {
    let u = raw.replace(/[.,);]+$/, "");
    try {
      const parsed = new URL(u);
      if (!/^https?:$/i.test(parsed.protocol)) continue;
      const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
      // Reject vanity domains that are just the target's name (common LLM fabrication)
      const hostKey = host.replace(/\./g, "").replace(/[^a-z]/g, "");
      if (target && target.length >= 8 && (hostKey === target || hostKey.startsWith(target) || target.startsWith(hostKey.replace(/com$|net$|org$/, "")))) {
        if (!TRUSTED.test(host)) continue;
      }
      // Prefer institutional / registry / news hosts
      if (TRUSTED.test(host) || parsed.pathname.length > 1) {
        candidates.push(u);
      }
    } catch {
      /* skip */
    }
  }
  // Prefer trusted hosts first
  candidates.sort((a, b) => {
    const ta = TRUSTED.test(a) ? 0 : 1;
    const tb = TRUSTED.test(b) ? 0 : 1;
    return ta - tb;
  });
  return candidates[0];
}

/**
 * First-glance operator story. Short, plain English.
 * Pattern: "Now: …" while live, "Done: …" when finished.
 */
function storyFor(kind: SceneKind, e: OpsEvent, query?: string): string {
  const t = (e.targetName || "this target").trim();
  const tool = pickTool(e);
  const blob = `${tool} ${e.stage || ""} ${e.resultSummary || ""} ${e.inputSummary || ""}`;
  const q = (query || "").trim();
  const shortQ = q.length > 56 ? q.slice(0, 53) + "…" : q;
  const live = !/complete|done|success/i.test(String(e.status || "active"));
  const failed = /fail|error|blocked/i.test(String(e.status || ""));
  const prefix = failed ? "Failed:" : live ? "Now:" : "Done:";

  let body: string;
  switch (kind) {
    case "google":
      body = shortQ
        ? `searching Google for “${shortQ}”`
        : `searching Google for ${t}`;
      break;
    case "browser": {
      const url = extractUrl(e);
      if (/mailto:|contact.?attribut|contact.?facts|hr@|info@|purchasing@/i.test(blob)) {
        body = `looking for emails and phone numbers for ${t}`;
        break;
      }
      if (url) {
        try {
          const host = new URL(url).hostname.replace(/^www\./, "");
          body = `opening ${host} to read about ${t}`;
        } catch {
          body = `opening a webpage about ${t}`;
        }
        break;
      }
      body = `reading a webpage about ${t}`;
      break;
    }
    case "prompt":
      body = /persona|quality|review/i.test(blob)
        ? `checking contacts really belong to ${t}`
        : `writing down proven contacts for ${t}`;
      break;
    case "domain":
      body = `checking who owns the website for ${t}`;
      break;
    case "footprint":
      body = `checking if ${t} appears on other sites`;
      break;
    case "serp": {
      if (shortQ) {
        body = `searching the web for “${shortQ}”`;
      } else if (/email|contact|phone|owner|ceo|president/i.test(blob)) {
        body = `searching the web for contacts for ${t}`;
      } else {
        body = `searching the web for ${t}`;
      }
      break;
    }
    default: {
      if (/opencorporates|companies.?house|sec\b|edgar|sam\.gov|registry|corporate/i.test(blob)) {
        body = `searching a company registry for ${t}`;
      } else if (/whois|rdap|dns|domain/i.test(blob)) {
        body = `checking domain records for ${t}`;
      } else if (/linkedin/i.test(blob)) {
        body = `looking up ${t} on LinkedIn`;
      } else if (/wealth|net.?worth|hnwi/i.test(blob)) {
        body = `looking up public background on ${t}`;
      } else if (/graph|relationship|link/i.test(blob)) {
        body = `linking people and companies around ${t}`;
      } else if (shortQ) {
        body = `researching “${shortQ}”`;
      } else {
        body = `researching ${t}`;
      }
      break;
    }
  }

  return `${prefix} ${body}`;
}

function toScene(e: OpsEvent, index: number): Scene {
  const tool = pickTool(e);
  const provider = detectProviderKind(`${tool} ${e.stage || ""} ${e.resultSummary || ""}`);
  const status = String(e.status || "active");
  const live = !/complete|done|success/i.test(status);
  const terminal: "done" | "failed" | null = /fail|error|blocked/i.test(status) ? "failed" : (!live ? "done" : null);
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
    terminal,
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

/** Phase Q — relative when recent, absolute clock as title fallback */
function absoluteTimeLabel(ts?: string) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(11, 16) + "Z";
    return ts.slice(11, 16);
  } catch {
    return "";
  }
}

function timeLabel(ts?: string, nowMs = Date.now()) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return absoluteTimeLabel(ts);
    const sec = Math.max(0, Math.floor((nowMs - d.getTime()) / 1000));
    if (sec < 5) return "just now";
    if (sec < 60) return `${sec}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return absoluteTimeLabel(ts);
  } catch {
    return absoluteTimeLabel(ts);
  }
}


/** Color the Now:/Done:/Failed: prefix so status is obvious at a glance */
function StoryLine({
  story,
  className = "",
  clamp = true,
}: {
  story: string;
  className?: string;
  clamp?: boolean;
}) {
  const m = story.match(/^(Now|Done|Failed):\s*(.*)$/i);
  if (!m) {
    return (
      <div className={`${clamp ? "line-clamp-2" : ""} ${className}`.trim()}>
        {story}
      </div>
    );
  }
  const kind = m[1].toLowerCase();
  const prefixColor =
    kind === "now" ? "text-yellow-300" : kind === "failed" ? "text-rose-300" : "text-yellow-200";
  return (
    <div className={`${clamp ? "line-clamp-2" : ""} ${className}`.trim()}>
      <span className={`font-bold ${prefixColor}`}>{m[1]}:</span>
      {m[2] ? <span> {m[2]}</span> : null}
    </div>
  );
}

function WindowChrome({
  favicon,
  title,
  urlBar,
  children,
  accent = "#eab308",
  live,
  compact,
  terminal,
}: {
  favicon?: React.ReactNode;
  title: string;
  urlBar?: string;
  children: React.ReactNode;
  accent?: string;
  live?: boolean;
  compact?: boolean;
  /** Phase K — when tool finished (not live): done | failed */
  terminal?: "done" | "failed" | null;
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
            <span
              className="relative inline-flex items-center gap-1.5 shrink-0 rounded-full border border-yellow-400/50 bg-yellow-400/15 px-2 py-0.5 shadow-[0_0_12px_rgba(234,179,8,0.25)]"
              aria-label="Tool is live"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-70" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400 shadow-[0_0_8px_#eab308]" />
              </span>
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-yellow-200">LIVE</span>
            </span>
          )}
          {!live && terminal === "done" && (
            <span
              className="inline-flex items-center gap-1 shrink-0 rounded-full border border-yellow-400/35 bg-yellow-400/10 px-2 py-0.5"
              aria-label="Tool complete"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-yellow-200/90">DONE</span>
            </span>
          )}
          {!live && terminal === "failed" && (
            <span
              className="inline-flex items-center gap-1 shrink-0 rounded-full border border-rose-400/40 bg-rose-400/10 px-2 py-0.5"
              aria-label="Tool failed"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-rose-200/90">FAIL</span>
            </span>
          )}
        </div>
      </div>
      {urlBar != null && (
        <div className={`relative border-b border-white/5 bg-[#0f172a] ${compact ? "px-2.5 py-1.5" : "px-3 py-2"}`}>
          <div
            className="flex items-center gap-1.5 rounded-full bg-[#1e293b] px-2.5 py-1 border border-white/5 overflow-hidden"
            aria-label={live ? `Live query or URL: ${urlBar}` : `Query or URL: ${urlBar}`}
          >
            <span className="text-[9px] text-slate-500 shrink-0" aria-hidden>{"\uD83D\uDD12"}</span>
            <span className={`font-mono text-slate-300 truncate ${compact ? "text-[10px]" : "text-[11px]"}`}>{urlBar}</span>
            {live && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 opacity-40"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(234,179,8,0.35), transparent)",
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
      live={scene.live} terminal={scene.terminal}
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
            <span className="text-[10px] text-[#facc15]/80 font-mono shrink-0">Search</span>
          </div>
        </div>
        {(scene.resultLines.length ? scene.resultLines : ["Looking through public search results…"]).slice(0, compact ? 2 : 3).map((line, i) => (
          <div key={i} className="rounded-lg bg-[#111827] border border-white/5 px-2.5 py-1.5">
            <div className="text-[9px] text-yellow-500/80 font-mono mb-0.5">finding {i + 1}</div>
            <div className={`text-slate-200 leading-snug ${compact ? "text-[11px]" : "text-[12px]"}`}>{line}</div>
          </div>
        ))}
      </div>
    </WindowChrome>
  );
}

function BrowserScene({ scene, compact }: { scene: Scene; compact?: boolean }) {
  // Never invent a vanity domain from the person's name — only real extracted URLs.
  const url = scene.url || undefined;
  const lines = scene.resultLines.length
    ? scene.resultLines
    : [url ? "Reading public page content…" : "Searching public sources — no verified page URL yet"];
  const contactHit = lines.some((l) => /mailto:|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(l));
  return (
    <WindowChrome
      title={scene.subtitle || (url ? "Public page" : "Public sources")}
      live={scene.live} terminal={scene.terminal}
      accent={contactHit ? "#eab308" : "#eab308"}
      compact={compact}
      favicon={<ProviderIcon kind="browser" size={compact ? 12 : 14} />}
      urlBar={url || "awaiting verified URL from live fetch…"}
    >
      <div className="space-y-1.5">
        {contactHit && (
          <div className="rounded-md border border-yellow-400/40 bg-yellow-500/10 px-2 py-1 text-[9px] font-mono uppercase tracking-[0.16em] text-yellow-200">
            Contact found · reachable vector
          </div>
        )}
        <div className="text-[9px] font-mono uppercase tracking-widest text-amber-400/80">On the page</div>
        <div className={`rounded-lg border p-2.5 font-mono text-[11px] leading-relaxed space-y-1 ${
          contactHit ? "border-yellow-500/30 bg-[#1a1508] text-slate-200" : "border-amber-500/20 bg-[#0f172a] text-slate-300"
        }`}>
          {lines.map((l, i) => (
            <div key={i}>
              {/@|mailto:/i.test(l) ? <span className="text-yellow-200 font-semibold">{l}</span> : l}
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
      live={scene.live} terminal={scene.terminal}
      accent="#facc15"
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
      live={scene.live} terminal={scene.terminal}
      accent="#67e8f9"
      compact={compact}
      favicon={<ProviderIcon kind="domain" size={compact ? 12 : 14} />}
      urlBar="rdap · whoisjson"
    >
      <pre className={`font-mono text-yellow-100/90 leading-relaxed whitespace-pre-wrap ${compact ? "text-[10px]" : "text-[11px]"}`}>
        {(scene.resultLines.length ? scene.resultLines : ["Checking domain registration details…"]).join("\n")}
      </pre>
    </WindowChrome>
  );
}

function SerpScene({ scene, compact }: { scene: Scene; compact?: boolean }) {
  const q = scene.query || scene.targetName || scene.subtitle || "owner email contact";
  const typed = useTyped(q, scene.live, 42);
  const hits = scene.resultLines.length ? scene.resultLines : ["Looking through public search results…"];
  return (
    <WindowChrome
      title={`${providerLabel(scene.provider)} · web search`}
      live={scene.live} terminal={scene.terminal}
      accent="#38bdf8"
      compact={compact}
      favicon={<ProviderIcon kind={scene.provider} size={compact ? 12 : 14} />}
      urlBar={`search · ${q.slice(0, 40)}`}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-full border border-yellow-500/30 bg-[#0a0a0a] px-3 py-2.5">
          <ProviderIcon kind={scene.provider} size={16} />
          <span className="min-w-0 flex-1 truncate text-[13px] text-yellow-50">
            {typed}
            {scene.live && typed.length < q.length && (
              <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-yellow-200 align-middle" />
            )}
          </span>
          <span className="shrink-0 rounded-full bg-yellow-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-300">
            Search
          </span>
        </div>
        <div className="space-y-2">
          {hits.slice(0, compact ? 3 : 4).map((l, i) => (
            <div key={i} className="rounded-lg border border-white/5 bg-[#0a0a0a] px-3 py-2">
              <div className="mb-0.5 text-[9px] font-mono text-yellow-500/80">finding {i + 1}</div>
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
      live={scene.live} terminal={scene.terminal}
      accent="#c4b5fd"
      compact={compact}
      favicon={<ProviderIcon kind="sherlock" size={compact ? 12 : 14} />}
    >
      <div className={`font-mono text-yellow-100/90 space-y-1 ${compact ? "text-[10px]" : "text-[11px]"}`}>
        {(scene.resultLines.length ? scene.resultLines : ["Checking public profiles and sites…"]).map((l, i) => (
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
      live={scene.live} terminal={scene.terminal}
      accent="#eab308"
      compact={compact}
      favicon={<ProviderIcon kind="bureau" size={compact ? 12 : 14} />}
    >
      <div className="space-y-1">
        {scene.targetName && (
          <div className="text-[9px] font-mono text-yellow-400/80 uppercase tracking-wider">{scene.targetName}</div>
        )}
        {(scene.resultLines.length ? scene.resultLines : [scene.subtitle || "Working on this target…"]).map((l, i) => (
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
  jumpToLiveSignal = 0,
}: {
  scenes: Scene[];
  /** Called when user swipes past first/last scene — e.g. open full History */
  onEdgeSwipe?: (dir: "prev" | "next") => void;
  /** Increment to force focus on the current live scene */
  jumpToLiveSignal?: number;
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

  useEffect(() => {
    if (!jumpToLiveSignal) return;
    const liveIdx = scenes.findIndex((s) => s.live);
    setIdx(liveIdx >= 0 ? liveIdx : Math.max(0, scenes.length - 1));
    setPaused(false);
    setDragX(0);
  }, [jumpToLiveSignal, sceneKey]);

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
      className="space-y-2.5 select-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
      style={{ touchAction: "pan-y", overscrollBehaviorX: "contain" }}
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
        <div
          className={`relative flex-1 rounded-full bg-slate-800 overflow-hidden ${scene.live ? "h-1.5" : "h-1"}`}
          role="progressbar"
          aria-valuenow={safeIdx + 1}
          aria-valuemin={1}
          aria-valuemax={Math.max(scenes.length, 1)}
          aria-label={`Scene progress, ${safeIdx + 1} of ${scenes.length}`}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${((safeIdx + 1) / Math.max(scenes.length, 1)) * 100}%`,
              background: scene.live
                ? "linear-gradient(90deg,#eab308,#facc15)"
                : "#475569",
              boxShadow: scene.live ? "0 0 10px rgba(234,179,8,0.45)" : undefined,
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
      <div className={`text-[9px] font-mono uppercase tracking-wider px-0.5 ${scene.live ? "text-yellow-400/90" : "text-slate-500"}`}>
        {scene.live ? "Now" : "Done"} · {safeIdx + 1}/{scenes.length}
        {scene.title ? ` · ${scene.title}` : ""}
      </div>

      <div className="flex items-center gap-2.5 px-0.5" aria-live="polite" aria-atomic="true">
        <ActivityGlyph
          kind={scene.kind}
          live={scene.live}
          terminal={scene.terminal}
          size={32}
        />
        <div className="min-w-0 flex-1">
          <StoryLine story={scene.story} className="text-[13px] font-semibold text-slate-50 leading-snug tracking-tight" />
          <div className="text-[9px] font-mono text-slate-400 truncate flex items-center gap-1">
            <ProviderIcon kind={scene.provider} size={10} />
            <span>{scene.live ? "Now" : "Done"} · {scene.title}</span>
            {scene.targetName ? ` · ${scene.targetName}` : ""}
          </div>
        </div>
        {scene.timestamp && (
          <span
            className="shrink-0 text-[9px] font-mono text-slate-400 tabular-nums"
            title={absoluteTimeLabel(scene.timestamp)}
          >{timeLabel(scene.timestamp)}</span>
        )}
      </div>

      <div
        className="min-h-[240px] sm:min-h-[280px]"
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
            className="reactor-pressable rounded-lg border border-white/15 bg-white/[0.05] px-3 py-1.5 text-[10px] font-mono text-slate-200 hover:border-yellow-400/40 hover:text-yellow-100 disabled:opacity-25 disabled:pointer-events-none min-h-[44px] min-w-[72px]"
            disabled={safeIdx <= 0}
            onClick={goPrev}
            aria-label="Previous scene"
          >
            ← Prev
          </button>
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Scene position">
            {scenes.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-label={`Scene ${i + 1}${s.live ? " live" : ""}`}
                aria-current={i === safeIdx ? "true" : undefined}
                aria-selected={i === safeIdx}
                onClick={() => {
                  pauseForReading(REACTOR_PAUSE_MS);
                  setSlideDir(i > safeIdx ? 1 : -1);
                  setIdx(i);
                }}
                className="reactor-pressable rounded-full touch-manipulation transition-[width,background,box-shadow] duration-150"
                style={{
                  width: i === safeIdx ? 20 : 8,
                  height: 8,
                  background: i === safeIdx ? (s.live ? "#eab308" : "#94a3b8") : "#334155",
                  boxShadow: i === safeIdx && s.live ? "0 0 12px #eab308cc" : i === safeIdx ? "0 0 6px rgba(148,163,184,0.4)" : undefined,
                  minWidth: i === safeIdx ? 20 : 8,
                }}
              />
            ))}
          </div>
          <button
            type="button"
            className="reactor-pressable rounded-lg border border-white/15 bg-white/[0.05] px-3 py-1.5 text-[10px] font-mono text-slate-200 hover:border-yellow-400/40 hover:text-yellow-100 disabled:opacity-25 disabled:pointer-events-none min-h-[44px] min-w-[72px]"
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
          className="reactor-pressable mx-auto flex items-center justify-center gap-1.5 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1.5 text-center text-[9px] font-mono uppercase tracking-wider text-yellow-100 shadow-[0_0_16px_rgba(234,179,8,0.12)]"
          data-testid="status-reading-pause"
          style={{ animation: motionOrNone(`armIn ${REACTOR_UI_MS}ms ease-out both`) }}
          onClick={() => {
            setPaused(false);
            setPauseEndsAt(null);
            setPauseLeft(0);
            if (pauseTimerRef.current) window.clearTimeout(pauseTimerRef.current);
          }}
          aria-label="Resume auto-advance"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-300" aria-hidden />
          {`Reading pause · ${pauseLeft}s · tap to resume`}
        </button>
      )}

      {scenes.length > 1 && (
        <div
          className="atlas-h-scroll flex gap-1.5 overflow-x-auto overscroll-x-contain touch-pan-x pb-1 pr-6"
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
              className="reactor-pressable shrink-0 rounded-lg border px-2 py-2 text-left w-[136px] min-h-[52px] transition-[border-color,box-shadow,background] duration-150"
              aria-current={i === safeIdx ? "true" : undefined}
              aria-label={`Scene ${i + 1}: ${s.title}${s.live ? ", live" : ""}`}
              style={{
                borderColor: i === safeIdx ? "#eab30899" : s.live ? "#eab30855" : "#ffffff12",
                background: i === safeIdx ? "#eab30818" : s.live ? "rgba(234,179,8,0.06)" : "#0f172a",
                boxShadow: i === safeIdx
                  ? "0 0 16px rgba(234,179,8,0.2), inset 0 0 0 1px rgba(234,179,8,0.15)"
                  : s.live
                  ? "0 0 8px rgba(234,179,8,0.08)"
                  : undefined,
              }}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <span className={`text-[8px] font-mono tabular-nums ${i === safeIdx ? "text-yellow-400" : "text-slate-600"}`}>{i + 1}</span>
                <ActivityGlyphMini kind={s.kind} live={s.live} terminal={s.terminal} />
                <span className={`text-[8px] font-mono uppercase tracking-wider truncate ${i === safeIdx ? "text-slate-200" : "text-slate-400"}`}>{s.title}</span>
                {s.live && (
                  <span
                    className="ml-auto h-2 w-2 shrink-0 rounded-full bg-yellow-400 shadow-[0_0_8px_#eab308]"
                    aria-hidden
                  />
                )}
                {!s.live && s.terminal === "done" && (
                  <span className="ml-auto text-[7px] font-mono font-bold uppercase tracking-wider text-yellow-400/80">done</span>
                )}
                {!s.live && s.terminal === "failed" && (
                  <span className="ml-auto text-[7px] font-mono font-bold uppercase tracking-wider text-rose-400/80">fail</span>
                )}
              </div>
              <StoryLine story={s.story} className={`text-[9px] leading-tight ${i === safeIdx ? "text-slate-50" : "text-slate-400"}`} />
            </button>
          ))}
        </div>
      )}

      {scenes.length > 1 && (
        <div className="text-center text-[9px] font-mono text-slate-400 tracking-wider pb-1">
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
  jumpToLiveSignal = 0,
}: {
  events: OpsEvent[];
  compact?: boolean;
  maxScenes?: number;
  title?: string;
  onEdgeSwipe?: (dir: "prev" | "next") => void;
  jumpToLiveSignal?: number;
}) {
  const scenes = useMemo(() => {
    const list = (events || []).map(toScene).filter((s) => s.resultLines.length || s.query || s.prompt || s.url);
    return list.slice(0, maxScenes);
  }, [events, maxScenes]);

  // Hooks must run unconditionally (before any early return).
  const [focusId, setFocusId] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!scenes.length) return;
    const live = scenes.find((s) => s.live);
    if (live) setFocusId(live.id);
    else setFocusId((prev) => prev ?? scenes[0]?.id ?? null);
  }, [scenes]);

  if (!scenes.length) {
    return (
      <div className={`rounded-xl border border-dashed border-[#eab308]/20 bg-[#0c0c0c]/50 ${compact ? "p-3" : "p-5"}`}>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">{title}</div>
        <div className="text-[12px] text-slate-400">Idle — tool windows appear here when Atlas runs a step.</div>
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
        <MobileWorkstage scenes={scenes} onEdgeSwipe={onEdgeSwipe} jumpToLiveSignal={jumpToLiveSignal} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-yellow-400/90">{title}</div>
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
              className="reactor-pressable shrink-0 rounded-lg border px-2.5 py-2 max-w-[200px] text-left min-h-[52px]"
              style={{
                borderColor: selected ? "#eab30866" : s.live ? "#eab30840" : "#ffffff18",
                background: selected ? "#eab30814" : "#ffffff08",
                boxShadow: selected ? "0 0 12px rgba(234,179,8,0.12)" : undefined,
              }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[9px] font-mono text-slate-500">{i + 1}</span>
                <ActivityGlyphMini kind={s.kind} live={s.live} terminal={s.terminal} />
                <span className="text-[9px] font-mono text-slate-300 truncate">{s.title}</span>
                {s.live && <span className="text-[8px] text-yellow-200 font-mono font-bold">LIVE</span>}
              </div>
              <StoryLine story={s.story} className="text-[10px] text-slate-300 leading-snug" />
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
                outline: focused ? "1px solid rgba(234,179,8,0.35)" : undefined,
                borderRadius: 8,
                scrollMarginTop: 12,
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
