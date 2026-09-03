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
  /** Preferred operator one-liner from the pipeline */
  story?: string;
  /** Adaptive right-hand prose (not a scripted template) */
  narration?: string;
  why?: string;
  actor?: "boss" | "investigator" | "registry" | "tool" | "system" | "right_hand" | "web" | "discovery";
  methodKind?: string;
  sourceUrls?: string[];
  links?: Array<{ title?: string; url: string }>;
  caseUpdate?: string;
  provider?: string;
};

type SceneKind = "google" | "browser" | "prompt" | "domain" | "footprint" | "serp" | "bureau" | "boss" | "case" | "registry" | "persona";

type Scene = {
  id: string;
  kind: SceneKind;
  provider: ProviderKind;
  title: string;
  subtitle?: string;
  /** discovery = purple neon tone; research = lime */
  phaseTone: "discovery" | "research";
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
  /** Adaptive right-hand narration for the desk */
  narration?: string;
};

function pickTool(e: OpsEvent): string {
  return String(e.activeToolId || e.toolIds?.[0] || e.stage || e.kind || "");
}

function isLogGarbage(s: string): boolean {
  if (!s) return true;
  const t = s.trim();
  if (t.length < 3) return true;
  if (/^[{[]/.test(t)) return true;
  if (/BOSS_DISCOVERY_DIRECTION|DISCOVERY_MODEL_STEP|DISCOVERY_ADMIT|DURABLE_PROMOTION|BUREAU|/i.test(t)) return true;
  if (/modelFindings|vectorType|atlasPhase|sourceUrls.{0,40}https/i.test(t) && t.length > 90) return true;
  if (/slot=\d+\/\d+.*concurrent=/i.test(t)) return true;
  return /DIRECTOR\s+\d{4}-|jobId=/i.test(t) && t.length > 100;
}

function isInternalLanePrompt(s: string): boolean {
  return /LANE\s*[–-]\s*people_press|RESEARCH (LANE|CONTRACT)|REALISM\s*\/\s*REACHABILITY|Phase 0 OSINT|You are conducting/i.test(s)
    || /query template|domain target|search query template|HNWI target\s*[·•]|0 domain target|AI PROVIDER FAN|PROVIDER FA\b/i.test(s)
    || /complementary_lane|resolve_identity|official_routes|contact_routes:\s*|people_press/i.test(s)
    || isLogGarbage(s);
}

/** Strip job-log / telemetry dumps from operator-facing story lines. */
function sanitizeStoryText(s: string | undefined): string | undefined {
  if (!s) return undefined;
  let t = s.replace(/\s+/g, " ").trim();
  if (isLogGarbage(t)) {
    const name = t.match(/(?:targetName|TARGET)[\"':\s]+([A-Za-z][A-Za-z .'-]{2,60})/i);
    if (name?.[1]) return `working on ${name[1].trim()}`;
    return undefined; // caller falls back to plain storyFor body
  }
  // Drop leading ISO + DIRECTOR noise
  t = t.replace(/^DIRECTOR\s+\d{4}-\d{2}-\d{2}T[^\s]+\s*/i, "");
  t = t.replace(/^\d{4}-\d{2}-\d{2}T[\d:.Z+-]+\s*/i, "");
  t = t.replace(/^researching\s*[“"]?/i, "").replace(/[”"]\s*$/, "");
  if (isLogGarbage(t) || t.length < 4) return undefined;
  if (t.length > 140) t = t.slice(0, 137) + "…";
  return t;
}

/** Human stage label — spoken English, never internal codes. */
function humanStageTitle(stage: string | undefined, tool: string): string {
  const s = `${stage || ""} ${tool || ""}`.toLowerCase();
  if (/discover|ingest|western|hnwi.?pool|broad.?categor/i.test(s)) return "Finding new people";
  if (/edgar|proxy|sec\b|13d|13g|form\s*[34]/i.test(s)) return "Reading company filings";
  if (/companies.?house|opencorporates|registry/i.test(s)) return "Checking company records";
  if (/domain|whois|rdap|dns/i.test(s)) return "Checking websites";
  if (/adaptive|director|research director/i.test(s)) return "Choosing next research step";
  if (/tavily|exa|serper|serp|web.?search|provider fan/i.test(s)) return "Searching the web";
  if (/social|messenger|linkedin|sherlock|maigret/i.test(s)) return "Checking social profiles";
  if (/in-?house|osint|holehe/i.test(s)) return "Running contact tools";
  if (/ensemble|adjudic|final.?review|persona/i.test(s)) return "Reviewing what we found";
  if (/contact.?route|email|phone|mailto/i.test(s)) return "Looking for contact details";
  if (/enrich|phase\s*j|attribution/i.test(s)) return "Deepening the case file";
  if (/graph|relationship/i.test(s)) return "Linking people and companies";
  if (stage && stage.length < 40 && !isLogGarbage(stage)) {
    return stage.replace(/[_·]+/g, " ").replace(/\s+/g, " ").trim();
  }
  return "Working on this person";
}

function isDiscoveryPhase(stage: string | undefined, tool: string, methodKind?: string): boolean {
  const s = `${stage || ""} ${tool || ""} ${methodKind || ""}`.toLowerCase();
  return /discover|ingest|western.?hnwi|broad.?categor|phase\s*[01]\b|pre-?run|pool/i.test(s)
    && !/enrich|contact|email|phone|final.?review|persona|phase\s*j/i.test(s);
}

function cleanQueryText(s: string): string {
  return s
    .replace(/\\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractQuery(e: OpsEvent): string | undefined {
  // Never surface internal research-contract / lane prompts / template meta as the search box query
  const safeParts = [e.inputSummary, e.resultSummary, e.stage, e.raw]
    .filter((x): x is string => Boolean(x) && !isInternalLanePrompt(String(x)));
  const blob = safeParts.join(" ");
  const m =
    blob.match(/Query:\s*([^\n|]+)/i) ||
    blob.match(/search(?:ing)?\s+(?:for\s+)?["\u201c]?([^"\u201d\n]{8,140})/i) ||
    blob.match(/site:[^\s]+[^\n]{0,80}/i);
  if (m?.[1] && !isInternalLanePrompt(m[1])) return cleanQueryText(m[1]);
  // Prefer short operator inputSummary when it is a real human query — not template inventory
  if (e.inputSummary && !isInternalLanePrompt(e.inputSummary)) {
    const ins = cleanQueryText(e.inputSummary);
    if (ins.length >= 6 && ins.length <= 120 && !/^the .+ is still uncovered$/i.test(ins)) {
      const stripped = ins.replace(/^(resolve_identity|official_routes|complementary_lane|contact_routes):\s*/i, "").trim();
      if (stripped.length >= 3 && !isInternalLanePrompt(stripped)) {
        return stripped.length <= 100 ? stripped : stripped.slice(0, 97) + "…";
      }
    }
  }
  // Fallback: honest synthetic query from target name only (never template meta)
  if (/discover|serp|search|tavily|perplexity|google|gemini|serper|exa|perp/i.test(pickTool(e) + (e.stage || ""))) {
    return e.targetName ? `${e.targetName} contact email phone` : undefined;
  }
  return undefined;
}

/** Slot counts from /api/healthz — 0 means not configured / not usable. */
export type ProviderSlotMap = Partial<Record<string, number>>;

/**
 * Provider was attempted but is offline / missing / returned nothing usable.
 * Prefer live healthz slot counts over telemetry theater.
 */
function providerUnavailable(e: OpsEvent, slots?: ProviderSlotMap | null): boolean {
  const tool = `${pickTool(e)} ${e.toolIds?.join(" ") || ""}`;
  const isPerp = /perp|perplexity/i.test(tool);
  const isGroq = /\bgroq\b/i.test(tool);
  const isTavily = /\btavily\b/i.test(tool);
  const isExa = /\bexa\b/i.test(tool);
  const isSerper = /\bserper|serpapi\b/i.test(tool);

  // Hard truth from healthz: zero slots ⇒ never LIVE
  if (slots) {
    if (isPerp && (slots.perplexity ?? 0) <= 0) return true;
    if (isGroq && (slots.groq ?? 0) <= 0) return true;
    if (isTavily && (slots.tavily ?? 0) <= 0) return true;
    if (isExa && (slots.exa ?? 0) <= 0) return true;
    if (isSerper && (slots.serper ?? 0) <= 0) return true;
  }

  const blob = `${e.resultSummary || ""} ${e.inputSummary || ""} ${e.status || ""}`;
  if (/no usable result|not configured|provider availability|quota|missing key|api key|returned no usable|0 citation|rate.?limit/i.test(blob)
    && /perplexity|perp0|groq|provider/i.test(tool + blob)) {
    return true;
  }
  // Fan-out telemetry that only lists template inventory — not a real search
  if (isPerp && /query template|0 domain target|HNWI target/i.test(blob) && !(e.sourceUrls && e.sourceUrls.length)) {
    return true;
  }
  return false;
}

function extractUrl(e: OpsEvent): string | undefined {
  if (e.links?.[0]?.url) return e.links[0].url;
  if (e.sourceUrls?.[0]) return e.sourceUrls[0];
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
 * First-glance operator story. Short, plain spoken English.
 * Pattern: "Now: …" while live, "Done: …" when finished.
 * Never surfaces ATLAS_EVENT / DIRECTOR log dumps.
 */
function storyFor(kind: SceneKind, e: OpsEvent, query?: string): string {
  const live = !/complete|done|success/i.test(String(e.status || "active"));
  const failed = /fail|error|blocked/i.test(String(e.status || ""));
  const prefix = failed ? "Failed:" : live ? "Now:" : "Done:";
  const t = (e.targetName || "this person").trim();

  if (e.story && e.story.trim().length >= 8) {
    const cleaned = sanitizeStoryText(e.story.trim());
    if (cleaned && !isLogGarbage(cleaned)) {
      // Avoid double "Now: Now:"
      const body = cleaned.replace(/^(Now|Done|Failed):\s*/i, "");
      return `${prefix} ${body}`;
    }
  }
  if (e.caseUpdate && e.caseUpdate.trim() && !isLogGarbage(e.caseUpdate)) {
    return `${prefix} updating the case file — ${e.caseUpdate.trim().slice(0, 140)}`;
  }
  if (e.actor === "boss") {
    return `${prefix} ${live ? "boss is briefing the team on" : "boss briefed the team on"} ${t}`;
  }

  const tool = pickTool(e);
  const blob = `${tool} ${e.stage || ""} ${e.resultSummary || ""} ${e.inputSummary || ""}`;
  const qRaw = (query || "").trim();
  const q = qRaw && !isLogGarbage(qRaw) && !isInternalLanePrompt(qRaw) ? qRaw : "";
  const shortQ = q.length > 48 ? q.slice(0, 45) + "…" : q;

  // Prefer plain result summary when it reads like English
  const rs = (e.resultSummary || "").trim();
  if (rs && rs.length >= 12 && rs.length <= 140 && !isLogGarbage(rs) && !isInternalLanePrompt(rs)) {
    return `${prefix} ${rs.charAt(0).toLowerCase()}${rs.slice(1)}`;
  }

  let body: string;
  switch (kind) {
    case "google":
      body = shortQ ? `searching Google for “${shortQ}”` : `searching Google for ${t}`;
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
      body = /persona|quality|review|adjudic/i.test(blob)
        ? `checking whether contacts really belong to ${t}`
        : `writing down what we can prove about ${t}`;
      break;
    case "domain":
      body = `checking which websites belong to ${t}`;
      break;
    case "footprint":
      body = `checking whether ${t} shows up on other sites`;
      break;
    case "registry":
      body = `reading official filings about ${t}`;
      break;
    case "serp":
      body = shortQ
        ? `searching the web for “${shortQ}”`
        : /email|contact|phone|owner|ceo|president/i.test(blob)
          ? `searching the web for ways to reach ${t}`
          : `searching the web for ${t}`;
      break;
    case "boss":
      body = `boss is directing research on ${t}`;
      break;
    case "case":
      body = `updating the case file for ${t}`;
      break;
    default: {
      if (/adaptive|director/i.test(blob)) {
        body = live
          ? `deciding what to check next for ${t}`
          : `chose the next research step for ${t}`;
      } else if (/opencorporates|companies.?house|sec\b|edgar|sam\.gov|registry|corporate/i.test(blob)) {
        body = `searching company records for ${t}`;
      } else if (/whois|rdap|dns|domain/i.test(blob)) {
        body = `checking domain records for ${t}`;
      } else if (/linkedin/i.test(blob)) {
        body = `looking up ${t} on LinkedIn`;
      } else if (/social|messenger/i.test(blob)) {
        body = `checking social profiles for ${t}`;
      } else if (/in-?house|osint/i.test(blob)) {
        body = `running contact-discovery tools for ${t}`;
      } else if (/wealth|net.?worth|hnwi/i.test(blob)) {
        body = `looking up public background on ${t}`;
      } else if (/graph|relationship|link/i.test(blob)) {
        body = `linking people and companies around ${t}`;
      } else {
        body = `${humanStageTitle(e.stage, tool).toLowerCase()} — ${t}`;
      }
      break;
    }
  }

  return `${prefix} ${body}`;
}

function toScene(e: OpsEvent, index: number, slots: ProviderSlotMap | null = null): Scene {
  const tool = pickTool(e);
  const provider = detectProviderKind(`${tool} ${e.stage || ""} ${e.resultSummary || ""}`);
  const status = String(e.status || "active");
  const unavailable = providerUnavailable(e, slots);
  // Do not show LIVE chrome for missing/offline providers (e.g. Perplexity with 0 keys)
  let live = !/complete|done|success/i.test(status) && !unavailable;
  // Stale events must not stay LIVE (Redis tail / job idle). Short window — no theater after dig stops.
  try {
    const ts = e.timestamp ? Date.parse(String(e.timestamp)) : NaN;
    if (!Number.isFinite(ts) || Date.now() - ts > 45_000) live = false;
  } catch {
    live = false;
  }
  if (unavailable && !/complete|done|success/i.test(status)) {
    // Force terminal failed so UI shows OFF / failed instead of LIVE theater
  }
  const terminal: "done" | "failed" | null = unavailable || /fail|error|blocked/i.test(status)
    ? "failed"
    : (!live ? "done" : null);
  if (unavailable) live = false;
  const query = extractQuery(e);
  const url = extractUrl(e);
  const resultLines = [
    e.resultSummary,
    e.inputSummary && e.inputSummary !== e.resultSummary ? e.inputSummary : null,
    e.sources != null ? `${e.sources} sources` : null,
    e.contacts != null ? `${e.contacts} contacts` : null,
    e.evidence != null ? `${e.evidence} evidence` : null,
  ].filter(Boolean) as string[];

  const toolBlob = `${tool} ${e.stage || ""} ${e.resultSummary || ""} ${e.inputSummary || ""} ${e.methodKind || ""} ${e.actor || ""}`;
  let kind: SceneKind = "bureau";
  // Explicit pipeline method/actor first, then tool heuristics
  if (e.kind === "narration" || e.actor === "right_hand") kind = "boss";
  else if (e.methodKind === "boss" || e.actor === "boss") kind = "boss";
  else if (e.methodKind === "case" || e.caseUpdate) kind = "case";
  else if (e.methodKind === "registry" || e.actor === "registry" || /edgar|companies.?house|brreg|registry/i.test(toolBlob)) kind = "registry";
  else if (e.methodKind === "persona" || /persona-review/i.test(toolBlob)) kind = "persona";
  else if (e.methodKind === "domain" || provider === "domain" || /domain-surface|domain-resolver|rdap|whois|whoxy|dns/i.test(toolBlob)) kind = "domain";
  else if (e.methodKind === "search" || provider === "google" || /\bgoogle\b/i.test(toolBlob)) kind = "google";
  else if (e.methodKind === "search" || ["serp", "serper", "serpapi", "tavily", "exa", "perplexity"].includes(provider) || /tavily|exa|perplexity|serper|serpapi|web.?search/i.test(tool)) kind = "serp";
  else if (e.methodKind === "extract" || provider === "prompt" || e.prompt || /groq|llm|extract|gemini/i.test(tool)) kind = "prompt";
  else if (e.methodKind === "footprint" || provider === "sherlock" || provider === "maigret" || provider === "holehe" || /footprint|holehe|sherlock|maigret|harvest/i.test(toolBlob)) kind = "footprint";
  else if (/browser_fetch|scrapfly|zenrows/i.test(toolBlob)) kind = "browser";
  else if (
    e.methodKind === "fetch" ||
    provider === "browser" ||
    /scrapfly|zenrows|visit|fetch|mailto|contact-attribution|contact-facts|browser|webdisc|inhouse/i.test(toolBlob)
  ) kind = "browser";

  // Honest labeling when provider is not configured / returned nothing
  let honestSubtitle = e.resultSummary || undefined;
  if (unavailable) {
    const tool = pickTool(e);
    if (/perp|perplexity/i.test(tool)) {
      honestSubtitle = "Perplexity not configured or returned no result — not a live search";
      kind = "serp";
    } else if (/groq/i.test(tool) && /rate.?limit|no usable/i.test(`${e.resultSummary||""}`)) {
      honestSubtitle = "Groq unavailable or rate-limited";
    }
  }

  const discovery = isDiscoveryPhase(e.stage, tool, e.methodKind);
  const title =
    unavailable && /perp|perplexity/i.test(tool) ? "Search offline"
      : kind === "boss" ? "Team briefing"
      : kind === "case" ? "Case file"
      : kind === "registry" ? "Official records"
      : kind === "persona" ? "Contact check"
      : kind === "google" ? "Web search"
      : kind === "browser" ? "Reading a page"
      : kind === "prompt" ? "Writing findings"
      : kind === "domain" ? "Website check"
      : kind === "footprint" ? "Profile search"
      : kind === "serp" ? (providerLabel(provider) === "Unknown" ? "Web search" : providerLabel(provider))
      : humanStageTitle(e.stage, tool);

  // Never put research-contract prompts in the search chrome
  const safePrompt =
    e.prompt && !isInternalLanePrompt(e.prompt) && kind === "prompt"
      ? e.prompt
      : undefined;
  const lines = resultLines
    .map((line) => sanitizeStoryText(line) || (isLogGarbage(line) ? null : line))
    .filter((line): line is string => Boolean(line) && !isInternalLanePrompt(line))
    .slice(0, 3);
  if (unavailable && honestSubtitle) {
    lines.unshift(honestSubtitle);
  }
  const safeQuery = query && !isLogGarbage(query) && !isInternalLanePrompt(query)
    ? query
    : (e.targetName ? `${e.targetName}` : undefined);
  return {
    id: `${e.timestamp || index}-${tool}-${index}`,
    kind,
    provider,
    title,
    subtitle: unavailable
      ? (honestSubtitle || "This search tool is offline")
      : (discovery ? "Discovery" : "Research"),
    phaseTone: discovery ? "discovery" : "research",
    query: unavailable ? (e.targetName ? `${e.targetName} (search offline)` : safeQuery) : safeQuery,
    url,
    prompt: safePrompt,
    resultLines: lines.slice(0, 4),
    status: unavailable ? "failed" : status,
    targetName: e.targetName,
    timestamp: e.timestamp,
    live,
    terminal,
    narration:
      e.narration
      || (e.kind === "narration" || e.actor === "right_hand" ? (e.story || e.resultSummary || e.why) : undefined)
      || undefined,
    story: unavailable
      ? (honestSubtitle || "This search tool is offline or returned nothing useful")
      : (e.narration || storyFor(kind, e, safeQuery)),
    links: (e.links && e.links.length
      ? e.links
      : (e.sourceUrls ?? []).map((url) => ({ url }))
    ).slice(0, 5),
    actor: e.actor,
    caseUpdate: e.caseUpdate,
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
function SourceLinkRow({ links }: { links?: Array<{ title?: string; url: string }> }) {
  if (!links?.length) return null;
  return (
    <ul className="mt-1.5 space-y-1" data-testid="scene-source-links">
      {links.slice(0, 5).map((l, i) => {
        let host = "";
        try { host = new URL(l.url).hostname.replace(/^www\./, ""); } catch { host = l.url.slice(0, 40); }
        return (
          <li key={`${l.url}-${i}`}>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="reactor-pressable group flex items-center gap-1.5 rounded-md border border-[#9CFF1A]/15 bg-[#0d1219]/80 px-2 py-1 text-[14px] text-stone-300 hover:border-[#9CFF1A]/40 hover:text-[#fef9c3]"
            >
              <span className="shrink-0 text-[13px] text-[#9CFF1A]/90">↗</span>
              <span className="min-w-0 truncate font-medium">{l.title || host}</span>
              <span className="ml-auto shrink-0 font-mono text-[12px] text-stone-500 group-hover:text-stone-400">{host}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function StoryLine({
  story,
  className = "",
  clamp = true,
}: {
  story: string;
  className?: string;
  clamp?: boolean;
}) {
  const cleaned = sanitizeStoryText(story) || story;
  const m = cleaned.match(/^(Now|Done|Failed):\s*(.*)$/i);
  if (!m) {
    return (
      <div className={`${clamp ? "line-clamp-2" : ""} ${className}`.trim()}>
        {cleaned}
      </div>
    );
  }
  const kind = m[1].toLowerCase();
  const prefixColor =
    kind === "now" ? "text-lime-300" : kind === "failed" ? "text-rose-300" : "text-lime-200";
  const body = sanitizeStoryText(m[2]) || m[2];
  return (
    <div className={`${clamp ? "line-clamp-2" : ""} ${className}`.trim()}>
      <span className={`font-bold ${prefixColor}`}>{m[1]}:</span>
      {body ? <span> {body}</span> : null}
    </div>
  );
}

function WindowChrome({
  favicon,
  title,
  urlBar,
  children,
  accent = "#9CFF1A",
  live,
  compact,
  terminal,
  method,
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
  /** Research method lane — drives chrome language (not browser traffic lights) */
  method?: "browser" | "serp" | "google" | "prompt" | "domain" | "footprint" | "bureau" | "registry";
}) {
  // Method-aware desk chrome (Linear/Figma-style work surface — not OS window controls)
  const methodLabel =
    method === "browser" ? "Fetch"
      : method === "serp" || method === "google" ? "Search"
      : method === "prompt" ? "Extract"
      : method === "domain" ? "Domain"
      : method === "footprint" ? "Footprint"
      : method === "registry" ? "Registry"
      : "Bureau";

  return (
    <div
      className="relative overflow-hidden border backdrop-blur-md"
      data-live={live ? "true" : "false"}
      data-method={method || "bureau"}
      style={{
        borderColor: live ? `${accent}99` : `${accent}55`,
        background: "linear-gradient(165deg, rgba(12,12,12,0.96) 0%, rgba(8,8,8,0.99) 100%)",
        borderRadius: 12,
        clipPath: compact ? undefined : "polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)",
        boxShadow: live
          ? `0 0 0 1px ${accent}55, 0 0 24px ${accent}22, 0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)`
          : "0 8px 28px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}66, transparent)` }}
      />
      <div
        className={`flex items-center gap-2 border-b border-[#9CFF1A]/10 ${compact ? "px-2.5 py-1.5" : "px-3 py-2"}`}
        style={{ background: "rgba(10,10,10,0.92)" }}
      >
        {/* Method tile — replaces decorative traffic lights */}
        <div
          className="grid shrink-0 place-items-center rounded-md border border-[#9CFF1A]/25 bg-[#9CFF1A]/10 text-[#d4ff8a]"
          style={{ width: compact ? 22 : 26, height: compact ? 22 : 26 }}
          aria-hidden
        >
          {favicon || (
            <span className="font-mono text-[12px] font-bold uppercase tracking-wider">{methodLabel.slice(0, 2)}</span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className={`truncate font-mono text-stone-200 ${compact ? "text-[14px]" : "text-[11px]"}`}>
            {title}
          </span>
          <span className="hidden shrink-0 rounded border border-stone-600/50 bg-stone-800/80 px-1.5 py-0.5 font-mono text-[12px] uppercase tracking-wider text-stone-400 sm:inline">
            {methodLabel}
          </span>
          {live && (
            <span
              className="relative inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#9CFF1A]/50 bg-[#9CFF1A]/15 px-2 py-0.5 shadow-[0_0_12px_rgba(156,255,26,0.25)]"
              aria-label="Tool is live"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#9CFF1A] opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#9CFF1A] shadow-[0_0_8px_#9CFF1A]" />
              </span>
              <span className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[13px] font-bold uppercase tracking-wider text-[#111827] bg-[#9CFF1A]">
                NOW
              </span>
            </span>
          )}
          {!live && terminal === "done" && (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#9CFF1A]/35 bg-[#9CFF1A]/10 px-2 py-0.5"
              aria-label="Tool complete"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#9CFF1A]" />
              <span className="font-mono text-[13px] font-bold uppercase tracking-wider text-[#d4ff8a]/90">DONE</span>
            </span>
          )}
          {!live && terminal === "failed" && (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-400/40 bg-rose-400/10 px-2 py-0.5"
              aria-label="Tool failed"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              <span className="font-mono text-[13px] font-bold uppercase tracking-wider text-rose-200/90">FAIL</span>
            </span>
          )}
        </div>
      </div>
      {urlBar != null && (
        <div className={`relative border-b border-[#9CFF1A]/08 bg-[#0d1219] ${compact ? "px-2.5 py-1.5" : "px-3 py-2"}`}>
          <div
            className="flex items-center gap-1.5 rounded-full bg-[#1e293b] px-2.5 py-1 border border-[#9CFF1A]/08 overflow-hidden"
            aria-label={live ? `Live query or URL: ${urlBar}` : `Query or URL: ${urlBar}`}
          >
            <span className="text-[13px] text-stone-500 shrink-0" aria-hidden>{"\uD83D\uDD12"}</span>
            <span className={`font-mono text-stone-300 truncate ${compact ? "text-[14px]" : "text-[11px]"}`}>{urlBar}</span>
            {live && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 opacity-40"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(156,255,26,0.35), transparent)",
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
  const hits = (scene.resultLines.length ? scene.resultLines : (scene.live ? ["Looking through public search results…"] : ["Step finished — no detail text stored."])).slice(0, compact ? 2 : 3);
  return (
    <WindowChrome
      title="Google Search"
      method="google"
      live={scene.live} terminal={scene.terminal}
      accent="#9CFF1A"
      compact={compact}
      favicon={<ProviderIcon kind="google" size={compact ? 12 : 14} />}
      urlBar={`google.com/search?q=${encodeURIComponent(q).slice(0, 48)}`}
    >
      <div className="space-y-2.5">
        {/* Search box — browser imitation */}
        <div className="flex items-center gap-2">
          <ProviderIcon kind="google" size={compact ? 18 : 22} />
          <div className="flex-1 rounded-full border border-stone-600 bg-[#141414] px-3 py-2 flex items-center gap-2 min-w-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <span className={`text-stone-100 flex-1 truncate ${compact ? "text-[12px]" : "text-[13px]"}`}>
              {typed}
              {scene.live && typed.length < q.length && (
                <span className="inline-block w-0.5 h-3.5 bg-stone-200 ml-0.5 animate-pulse align-middle" />
              )}
            </span>
            <span className="text-[14px] text-[#b8ff4d]/80 font-mono shrink-0">Search</span>
          </div>
        </div>
        {/* SERP-style result cards */}
        <div className="space-y-2 border-t border-white/5 pt-2">
          {hits.map((line, i) => (
            <div key={i} className="group rounded-md px-1 py-1 hover:bg-white/[0.03]">
              <div className={`font-medium leading-snug text-[#8ab4f8] ${compact ? "text-[12px]" : "text-[13px]"}`}>
                {line.slice(0, 90)}{line.length > 90 ? "…" : ""}
              </div>
              <div className="mt-0.5 font-mono text-[13px] text-emerald-500/70 truncate">
                public source · result {i + 1}
              </div>
              {!compact && line.length > 40 && (
                <div className="mt-0.5 text-[11px] leading-snug text-stone-400 line-clamp-2">{line}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </WindowChrome>
  );
}

function BrowserScene({ scene, compact }: { scene: Scene; compact?: boolean }) {
  // Never invent a vanity domain from the person's name — only real extracted URLs.
  const url = scene.url || undefined;
  const lines = scene.resultLines.length
    ? scene.resultLines
    : (scene.live ? ["Reading public page…"] : ["Step finished — no detail text stored."]);
  const contactHit = lines.some((l) => /mailto:|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(l));
  return (
    <WindowChrome
      title={scene.subtitle || (url ? "Public page" : "Public sources")}
      method="browser"
      live={scene.live} terminal={scene.terminal}
      accent="#9CFF1A"
      compact={compact}
      favicon={<ProviderIcon kind="browser" size={compact ? 12 : 14} />}
      urlBar={url || "awaiting verified URL from live fetch…"}
    >
      <div className="space-y-1.5">
        {contactHit && (
          <div className="rounded-md border border-lime-400/40 bg-lime-500/10 px-2 py-1 text-[13px] font-mono uppercase tracking-[0.16em] text-lime-200">
            Contact found · reachable vector
          </div>
        )}
        <div className="text-[13px] font-mono uppercase tracking-widest text-[#9CFF1A]">On the page</div>
        <div className={`rounded-lg border p-2.5 font-mono text-[11px] leading-relaxed space-y-1 ${
          contactHit ? "border-lime-500/30 bg-[#1a1008] text-stone-200" : "border-[#9CFF1A]/20 bg-[#0d1219] text-stone-300"
        }`}>
          {lines.map((l, i) => (
            <div key={i}>
              {/@|mailto:/i.test(l) ? <span className="text-lime-200 font-semibold">{l}</span> : l}
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
      title={`${providerLabel(scene.provider)} · extract`}
      method="prompt"
      live={scene.live} terminal={scene.terminal}
      accent="#9CFF1A"
      compact={compact}
      favicon={<ProviderIcon kind={scene.provider} size={compact ? 12 : 14} />}
    >
      <div className="rounded-lg bg-black/50 border border-lime-500/20 p-2.5 font-mono text-[11px] text-lime-100/90 leading-relaxed min-h-[72px]">
        <span className="text-lime-500/70">{">>> "}</span>
        {typed}
        {scene.live && <span className="inline-block w-1.5 h-3 bg-lime-400 ml-0.5 animate-pulse" />}
      </div>
      {scene.resultLines[0] && scene.prompt && (
        <div className="mt-1.5 text-[14px] text-stone-400 font-mono line-clamp-2">{scene.resultLines[0]}</div>
      )}
    </WindowChrome>
  );
}

function DomainScene({ scene, compact }: { scene: Scene; compact?: boolean }) {
  return (
    <WindowChrome
      title="RDAP / WHOIS"
      method="domain"
      live={scene.live} terminal={scene.terminal}
      accent="#9CFF1A"
      compact={compact}
      favicon={<ProviderIcon kind="domain" size={compact ? 12 : 14} />}
      urlBar="rdap · whoisjson"
    >
      <pre className={`font-mono text-lime-100/90 leading-relaxed whitespace-pre-wrap ${compact ? "text-[14px]" : "text-[11px]"}`}>
        {(scene.resultLines.length ? scene.resultLines : (scene.live ? ["Checking domain registration details…"] : ["Step finished — no detail text stored."])).join("\n")}
      </pre>
    </WindowChrome>
  );
}

function SerpScene({ scene, compact }: { scene: Scene; compact?: boolean }) {
  const q = scene.query || scene.targetName || scene.subtitle || "owner email contact";
  const typed = useTyped(q, scene.live, 42);
  const hits = scene.resultLines.length ? scene.resultLines : (scene.live ? ["Looking through public search results…"] : ["Step finished — no detail text stored."]);
  return (
    <WindowChrome
      title={`${providerLabel(scene.provider)} · web search`}
      method="serp"
      live={scene.live} terminal={scene.terminal}
      accent="#9CFF1A"
      compact={compact}
      favicon={<ProviderIcon kind={scene.provider} size={compact ? 12 : 14} />}
      urlBar={`${providerLabel(scene.provider).toLowerCase()} · ${q.slice(0, 36)}`}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-full border border-lime-500/30 bg-[#0d1219] px-3 py-2.5">
          <ProviderIcon kind={scene.provider} size={16} />
          <span className="min-w-0 flex-1 truncate text-[13px] text-lime-50">
            {typed}
            {scene.live && typed.length < q.length && (
              <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-yellow-200 align-middle" />
            )}
          </span>
          <span className="shrink-0 rounded-full bg-lime-500/20 px-2 py-0.5 text-[13px] font-bold uppercase tracking-wider text-lime-300">
            Search
          </span>
        </div>
        <div className="space-y-2">
          {hits.slice(0, compact ? 3 : 4).map((l, i) => (
            <div key={i} className="rounded-lg border border-[#9CFF1A]/08 bg-[#0d1219] px-3 py-2">
              <div className="mb-0.5 text-[13px] font-mono text-lime-500/80">finding {i + 1}</div>
              <div className="text-[12px] leading-snug text-stone-200">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </WindowChrome>
  );
}

function FootprintScene({ scene, compact }: { scene: Scene; compact?: boolean }) {
  const p = (scene.provider || scene.tool || "").toLowerCase();
  const title = /holehe/i.test(p) ? "Email footprint · Holehe"
    : /maigret/i.test(p) ? "Username dossier · Maigret"
    : /harvester|theharvester/i.test(p) ? "Domain harvest · theHarvester"
    : /sherlock/i.test(p) ? "Username footprint · Sherlock"
    : "Public footprint check";
  return (
    <WindowChrome
      title={title}
      method="footprint"
      live={scene.live} terminal={scene.terminal}
      accent="#9CFF1A"
      compact={compact}
      favicon={<ProviderIcon kind={/holehe/i.test(p) ? "holehe" : "sherlock"} size={compact ? 12 : 14} />}
    >
      <div className={`font-mono text-lime-100/90 space-y-1 ${compact ? "text-[14px]" : "text-[11px]"}`}>
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
      method="bureau"
      live={scene.live} terminal={scene.terminal}
      accent="#9CFF1A"
      compact={compact}
      favicon={<ProviderIcon kind="bureau" size={compact ? 12 : 14} />}
    >
      <div className="space-y-1">
        {scene.targetName && (
          <div className="text-[13px] font-mono text-lime-400/80 uppercase tracking-wider">{scene.targetName}</div>
        )}
        {(scene.resultLines.length ? scene.resultLines : [scene.subtitle || "Working on this person…"]).map((l, i) => (
          <div key={i} className={`text-stone-200 leading-snug ${compact ? "text-[11px]" : "text-[12px]"}`}>
            {l}
          </div>
        ))}
      </div>
    </WindowChrome>
  );
}


/** Adaptive right-hand voice — never a static script (desktop + mobile) */
function RightHandNarration({ text, compact }: { text?: string; compact?: boolean }) {
  if (!text || text.length < 8) return null;
  return (
    <div
      className={`mb-2 rounded-xl border border-violet-400/40 bg-gradient-to-br from-violet-950/70 via-[#12101c] to-[#0c1018] shadow-[0_0_24px_rgba(139,92,246,0.12)] ${compact ? "px-3 py-2.5 text-[11px]" : "px-3 py-2.5 text-[12px]"}`}
      data-testid="right-hand-narration"
      role="status"
      aria-live="polite"
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-violet-300 shadow-[0_0_10px_rgba(167,139,250,0.95)]" />
        <span className="font-mono text-[13px] font-bold uppercase tracking-[0.16em] text-violet-200">
          Right-hand · under the hood
        </span>
      </div>
      <p className={`leading-snug text-violet-50 ${compact ? "line-clamp-4" : "line-clamp-5"}`}>{text}</p>
    </div>
  );
}

function SceneCard({ scene, compact }: { scene: Scene; compact?: boolean }) {
  const body = (() => {
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
  })();
  return (
    <div className="flex flex-col gap-0">
      <RightHandNarration text={scene.narration} compact={compact} />
      {body}
    </div>
  );
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


  if (!scene) {
    return (
      <div className="rounded-lg border border-stone-700/50 bg-stone-900/40 px-3 py-4 text-center" data-testid="desk-empty">
        <p className="font-mono text-[11px] text-stone-400">No live tool windows yet</p>
        <p className="mt-1 text-[14px] text-stone-600">Waiting for search, visit, or registry steps…</p>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="space-y-2.5 select-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-lime-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827]"
      style={{ touchAction: "pan-y", overscrollBehaviorX: "contain" }}
      data-testid="mobile-workstage-swipe"
      tabIndex={0}
      role="region"
      aria-label="Tool scene workstage"
    >
      <span className="sr-only" style={{ position:"absolute", width:1, height:1, padding:0, margin:-1, overflow:"hidden", clip:"rect(0,0,0,0)", whiteSpace:"nowrap", border:0 }}>
        {scene.live ? "Happening now" : "Earlier activity"}: {scene.story}
      </span>

      {/* Single compact status row — no duplicate Now/Done labels */}
      <div className="flex items-center gap-2 px-0.5" aria-live="polite" aria-atomic="true">
        <ActivityGlyph
          kind={scene.kind}
          live={scene.live}
          terminal={scene.terminal}
          size={24}
        />
        <div className="min-w-0 flex-1">
          {scene.narration ? (
            <p className="mb-1 text-[11px] leading-snug text-violet-100/95 line-clamp-3" data-testid="mobile-right-hand-line">
              {scene.narration}
            </p>
          ) : (
            <StoryLine story={scene.story} className="text-[12px] font-medium leading-snug tracking-tight text-stone-100 line-clamp-2" />
          )}
          <SourceLinkRow links={scene.links} />
          <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[13px] text-stone-500">
            <span className={scene.live ? "text-[#9CFF1A]" : "text-stone-500"}>
              {scene.live ? "Now" : scene.terminal === "failed" ? "Fail" : "Done"}
            </span>
            {/* Free dig: never "N of M steps" — only a log position, not a fixed plan */}
            <span className="tabular-nums text-stone-600" title="Tool activity log position (not a fixed dig plan)">
              · activity {safeIdx + 1}
            </span>
            {scene.title ? <span className="truncate text-stone-400">· {scene.title}</span> : null}
            {scene.targetName ? <span className="hidden truncate text-stone-500 sm:inline">· {scene.targetName}</span> : null}
          </div>
        </div>
        {scene.timestamp && (
          <span
            className="shrink-0 font-mono text-[13px] tabular-nums text-stone-500"
            title={absoluteTimeLabel(scene.timestamp)}
          >
            {timeLabel(scene.timestamp)}
          </span>
        )}
      </div>

      {/* Slim progress under story — purple = discovery, lime = research */}
      <div
        className={`relative overflow-hidden rounded-full bg-stone-800 ${scene.live ? "h-1" : "h-0.5"}`}
        role="progressbar"
        aria-valuenow={scene.live ? 1 : 0}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-label={scene.live ? "Tool activity in progress" : "Earlier tool activity"}
      >
        <div
          className="h-full rounded-full"
          style={{
            /* Free dig: no "plan completion" bar — pulse width only while live */
            width: scene.live ? "100%" : "100%",
            opacity: scene.live ? 1 : 0.35,
            background: !scene.live
              ? "#57534e"
              : scene.phaseTone === "discovery"
                ? "linear-gradient(90deg,#a855f7,#c084fc)"
                : "linear-gradient(90deg,#9CFF1A,#b8ff4d)",
            transition: `opacity ${REACTOR_UI_MS * 2}ms ease-out`,
          }}
        />
      </div>

      <div
        className="h-[200px] sm:h-[220px] overflow-hidden"
        style={{
          transform: dragX ? `translate3d(${dragX}px,0,0)` : undefined,
          transition: dragX ? "none" : `transform ${REACTOR_UI_MS}ms ease-out`,
          willChange: "transform",
        }}
      >
        <div
          key={scene.id}
          className="h-full overflow-y-auto overscroll-contain"
          style={{
            animation: dragX
              ? undefined
              : motionOrNone(`${slideDir === 1 ? "sceneSlideLeft" : "sceneSlideRight"} ${REACTOR_SCENE_MS}ms cubic-bezier(0.22,1,0.36,1) both`),
          }}
        >
          {scene.narration ? (
            <div className="sticky top-0 z-10 -mx-0.5 mb-2 backdrop-blur-sm">
              <RightHandNarration text={scene.narration} compact />
            </div>
          ) : null}
          <SceneCard scene={{ ...scene, narration: undefined }} compact />
        </div>
      </div>

      {/* Step position — past = dim, current = labeled, no mystery middle glow */}
      {scenes.length > 1 && (
        <div className="flex flex-col items-center gap-1.5 py-0.5">
          <div className="flex items-center justify-center gap-1.5" role="tablist" aria-label="Past and current steps">
            {scenes.map((s, i) => {
              const isHere = i === safeIdx;
              const accent = s.phaseTone === "discovery" ? "#c084fc" : "#9CFF1A";
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-label={`Tool activity ${i + 1}: ${s.title}${s.live ? " live" : " done"}`}
                  aria-current={isHere ? "true" : undefined}
                  aria-selected={isHere}
                  onClick={() => {
                    pauseForReading(REACTOR_PAUSE_MS);
                    setSlideDir(i > safeIdx ? 1 : -1);
                    setIdx(i);
                  }}
                  className="reactor-pressable rounded-full touch-manipulation transition-[width,background,box-shadow] duration-150"
                  style={{
                    width: isHere ? 16 : 6,
                    height: 6,
                    background: isHere ? accent : i < safeIdx ? "#57534e" : "#3f3f46",
                    boxShadow: isHere ? `0 0 6px ${accent}88` : undefined,
                    minWidth: isHere ? 16 : 6,
                    opacity: isHere ? 1 : 0.7,
                  }}
                />
              );
            })}
          </div>
          <p className="font-mono text-[13px] text-stone-500">
            {scene.live
              ? "Happening now — dig is open-ended"
              : "Earlier tool activity (not a fixed plan)"}
          </p>
        </div>
      )}

      {paused && (
        <button
          type="button"
          className="reactor-pressable mx-auto flex items-center justify-center gap-1.5 rounded-full border border-stone-500/40 bg-stone-900/80 px-3 py-1.5 text-center font-mono text-[13px] text-stone-300"
          data-testid="status-reading-pause"
          onClick={() => {
            setPaused(false);
            setPauseEndsAt(null);
            setPauseLeft(0);
            if (pauseTimerRef.current) window.clearTimeout(pauseTimerRef.current);
          }}
          aria-label="Continue to next activity"
        >
          {`Holding · ${pauseLeft}s · tap to continue`}
        </button>
      )}
    </div>
  );
}


function sceneBodyText(scene: { prompt?: string; inputSummary?: string; resultSummary?: string; raw?: string; status?: string }) {
  const t = [scene.resultSummary, scene.inputSummary, scene.prompt, scene.raw].map(s => String(s || "").trim()).find(Boolean);
  if (t) return t;
  const st = String(scene.status || "").toLowerCase();
  if (/complete|done|success/.test(st)) return "Step finished — no detail text stored.";
  if (/active|running|live/.test(st)) return "In progress…";
  return "Waiting for bureau detail…";
}

export function BureauOpsStage({
  events,
  compact = false,
  maxScenes = 12,
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
  // Live provider slot counts — never paint LIVE for a zero-slot provider (e.g. Perplexity)
  const [providerSlots, setProviderSlots] = React.useState<ProviderSlotMap | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/healthz")
        .then(async (r) => {
          const t = await r.text();
          if (t.trimStart().startsWith("<")) return null;
          try { return JSON.parse(t); } catch { return null; }
        })
        .then((d) => {
          if (cancelled || !d?.providers) return;
          setProviderSlots({
            perplexity: Number(d.providers.perplexity) || 0,
            groq: Number(d.providers.groq) || 0,
            tavily: Number(d.providers.tavily) || 0,
            exa: Number(d.providers.exa) || 0,
            serper: Number(d.providers.serper) || 0,
            gemini: Number(d.providers.gemini) || 0,
            mistral: Number(d.providers.mistral) || 0,
            nvidiaNim: Number(d.providers.nvidiaNim) || 0,
          });
        })
        .catch(() => {});
    };
    load();
    const id = window.setInterval(load, 15000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  const scenes = useMemo(() => {
    const raw = events || [];
    // Prefer the current target so the strip is not a mix of past people
    const liveName = [...raw].reverse().find((e) =>
      e.targetName && !/complete|done|success/i.test(String(e.status || "active")),
    )?.targetName;
    const scoped = liveName
      ? raw.filter((e) => !e.targetName || e.targetName === liveName)
      : raw;
    const list = scoped
      .map((e, i) => toScene(e, i, providerSlots))
      .filter((s) => s.story || s.resultLines.length || s.query || s.prompt || s.url || s.narration);

    // Fold right-hand narration events onto the previous tool scene so the
    // desk shows AI voice *on* the Google/browser/registry chrome (desktop + mobile).
    const folded: Scene[] = [];
    for (const s of list) {
      const isNarrationOnly =
        Boolean(s.narration)
        && (s.kind === "boss" || s.title === "Team briefing")
        && !s.query
        && !s.url
        && !s.prompt
        && s.resultLines.length === 0;
      if (isNarrationOnly && folded.length > 0) {
        const prev = folded[folded.length - 1]!;
        folded[folded.length - 1] = {
          ...prev,
          narration: s.narration || prev.narration,
          story: s.narration || prev.story,
        };
        continue;
      }
      folded.push(s);
    }

    // Chronological: last N steps only (past + current — never invented future)
    const capped = folded.slice(-maxScenes);
    // At most one LIVE window: the freshest active scene
    let liveSeen = false;
    for (let i = capped.length - 1; i >= 0; i--) {
      if (capped[i].live && !liveSeen) {
        liveSeen = true;
      } else if (capped[i].live) {
        capped[i] = { ...capped[i], live: false, terminal: capped[i].terminal ?? "done" };
      }
    }
    return capped;
  }, [events, maxScenes, providerSlots]);

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
      <div className={`rounded-xl border border-dashed border-[#9CFF1A]/20 bg-[#0d1219]/50 ${compact ? "p-3" : "p-5"}`}>
        <div className="text-[14px] font-mono uppercase tracking-[0.2em] text-stone-500 mb-1">{title}</div>
        <div className="text-[12px] text-stone-400">Idle — tool windows and right-hand live narration appear here when Atlas runs a step (desktop + mobile).</div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {title ? (
          <div className="flex items-center justify-between gap-2">
            <div className="text-[13px] font-mono uppercase tracking-[0.14em] text-stone-500">{title}</div>
            <div className="text-[13px] font-mono text-stone-600 tabular-nums">{scenes.length}</div>
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
          <div className="text-[14px] font-mono uppercase tracking-[0.2em] text-lime-400/90">{title}</div>
        </div>
        <div className="text-[13px] font-mono text-stone-500 tabular-nums">{scenes.length}</div>
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
                borderColor: selected ? "#9CFF1A66" : s.live ? "#9CFF1A40" : "#ffffff18",
                background: selected ? "#9CFF1A14" : "#ffffff08",
                boxShadow: selected ? "0 0 12px rgba(156,255,26,0.12)" : undefined,
              }}
            >
              <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
                <span className="text-[13px] font-mono text-stone-500 shrink-0">{i + 1}</span>
                <ActivityGlyphMini kind={s.kind} live={s.live} terminal={s.terminal} />
                <span className="text-[13px] font-mono text-stone-300 truncate min-w-0">{s.title}</span>
                {s.narration && (
                  <span className="shrink-0 rounded px-1 py-px text-[11px] font-mono font-bold tracking-wide text-violet-100 bg-violet-500/40 border border-violet-300/30" title="Right-hand narration">
                    RH
                  </span>
                )}
                {s.live && (
                  <span className="shrink-0 rounded px-1 py-px text-[12px] font-mono font-bold tracking-wide text-[#111827] bg-[#9CFF1A]">
                    NOW
                  </span>
                )}
              </div>
              <StoryLine story={s.narration || s.story} className="text-[14px] text-stone-300 leading-snug" />
            </button>
          );
        })}
      </div>

      <div className={compact ? "flex flex-col gap-2.5" : "grid gap-3 grid-cols-1 xl:grid-cols-2"}>
        {scenes.map((s) => {
          const anyLive = scenes.some((x) => x.live);
          const focused = (focusId ?? scenes.find((x) => x.live)?.id ?? scenes[0]?.id) === s.id;
          // Side panel (compact): never dim/scale sibling cards — that reads as overlap mess
          const dim = compact ? false : (anyLive ? !s.live && !focused : !focused && scenes.length > 1);
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
                outline: focused ? "1px solid rgba(156,255,26,0.35)" : undefined,
                borderRadius: 8,
                scrollMarginTop: 12,
                position: "relative",
                zIndex: focused || s.live ? 2 : 1,
                minWidth: 0,
              }}
            >
              <SceneCard scene={s} compact={compact} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BureauOpsStage;
