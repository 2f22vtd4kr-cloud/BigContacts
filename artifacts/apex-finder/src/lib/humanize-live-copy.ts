/**
 * Operator-facing live desk language.
 * Internal codes, JSON job logs, and model dumps must never be the primary UI text.
 */

export function isInternalLiveDump(s: string | undefined | null): boolean {
  if (!s) return true;
  const t = s.trim();
  if (t.length < 2) return true;
  if (/^\{/.test(t) || /^\[/.test(t)) return true;
  if (/BOSS_DISCOVERY_DIRECTION|DISCOVERY_MODEL_STEP|DISCOVERY_ADMIT|DURABLE_PROMOTION|BUREAU\|/i.test(t)) return true;
  if (/modelFindings|sourceUrls|vectorType|atlasPhase|entityProgress/i.test(t) && t.length > 80) return true;
  if (/^step\d+:/i.test(t)) return true;
  if (/slot=\d+\/\d+/i.test(t) && /concurrent=/i.test(t)) return true;
  return false;
}

/** One short plain-English line for a dig span or desk event. */
export function humanizeLiveStep(input: {
  name?: string;
  spanType?: string;
  status?: string;
  toolName?: string;
  inputSummary?: string;
  resultSummary?: string;
  stage?: string;
  story?: string;
  active?: boolean;
}): { title: string; detail: string; tone: "now" | "done" | "error" } {
  const name = String(input.toolName || input.name || input.stage || "").toLowerCase();
  const status = String(input.status || "").toLowerCase();
  const active = input.active ?? status === "active";
  const tone: "now" | "done" | "error" =
    status === "error" || status === "failed" ? "error" : active ? "now" : "done";
  const prefix = tone === "error" ? "Problem" : tone === "now" ? "Now" : "Done";

  let rawIn = String(input.inputSummary || "").trim();
  let rawOut = String(input.resultSummary || "").trim();
  if (isInternalLiveDump(rawIn)) rawIn = "";
  if (isInternalLiveDump(rawOut)) rawOut = "";

  const story = String(input.story || "").trim();
  if (story && !isInternalLiveDump(story) && story.length >= 6) {
    const cleaned = story.replace(/^\s*(Now|Done|Problem)\s*[:\-]?\s*/i, "").trim();
    return { title: prefix, detail: cleaned.slice(0, 160), tone };
  }

  if (/web_search|search|serper|tavily|exa|serp/i.test(name)) {
    const q = rawIn || extractQuery(rawOut) || "the web";
    return {
      title: prefix,
      detail: tone === "now" ? `searching: ${clip(q, 100)}` : `search finished: ${clip(q, 100)}`,
      tone,
    };
  }
  if (/visit|browser_fetch|page|scrapfly|zenrows/i.test(name)) {
    const u = rawIn || rawOut || "a page";
    return {
      title: prefix,
      detail: tone === "now" ? `reading: ${clip(shortUrl(u), 90)}` : `finished reading: ${clip(shortUrl(u), 90)}`,
      tone,
    };
  }
  if (/llm|model|chat|groq|mistral/i.test(name) || input.spanType === "llm") {
    return {
      title: prefix,
      detail: tone === "now" ? "investigator choosing the next step…" : "investigator finished a step",
      tone,
    };
  }
  if (/discovery_slot|discovery_agent|discovery/i.test(name)) {
    return {
      title: prefix,
      detail: tone === "now" ? "looking for a real person to research…" : (rawOut ? clip(rawOut, 120) : "finished a discovery pass"),
      tone,
    };
  }
  if (/investigator_promotion|durable_promotion|promote/i.test(name)) {
    const who = rawIn || extractName(rawOut) || "someone";
    return {
      title: prefix,
      detail: tone === "now" ? `recording ${who} in the case file…` : `added ${who} to the case file`,
      tone,
    };
  }
  if (/boss|direction|brief/i.test(name) || /BOSS/i.test(rawIn + rawOut)) {
    return {
      title: prefix,
      detail: tone === "now" ? "boss setting the research brief…" : "boss brief is ready",
      tone,
    };
  }
  if (/footprint|maigret|holehe|sherlock|username/i.test(name)) {
    return {
      title: prefix,
      detail: tone === "now" ? "checking public profiles…" : "finished profile check",
      tone,
    };
  }
  if (/registry|companies.?house|opencorporates/i.test(name)) {
    return {
      title: prefix,
      detail: tone === "now" ? "checking company records…" : "finished company-records check",
      tone,
    };
  }
  if (/domain|whois|rdap|dns/i.test(name)) {
    return {
      title: prefix,
      detail: tone === "now" ? "checking domain ownership…" : "finished domain check",
      tone,
    };
  }
  if (/error/i.test(name) || tone === "error") {
    return {
      title: "Problem",
      detail: clip(rawOut || rawIn || "something went wrong on this step", 120),
      tone: "error",
    };
  }

  const label = prettyTool(name) || "research step";
  const detail = rawIn || rawOut || label;
  return {
    title: prefix,
    detail: clip(`${label}${detail && detail !== label ? ": " + detail : ""}`, 140),
    tone,
  };
}

function prettyTool(name: string): string {
  if (!name) return "";
  const map: Record<string, string> = {
    web_search: "web search",
    visit: "page read",
    browser_fetch: "page fetch",
    llm_step: "investigator",
    llm_wait: "investigator",
    discovery_slot: "discovery",
    discovery_agent: "discovery",
    footprint_email: "email footprint",
    footprint_username: "username search",
    domain_lookup: "domain check",
    registry_search: "company registry",
    harvest_domain: "domain harvest",
  };
  if (map[name]) return map[name];
  return name.replace(/[_-]+/g, " ").trim();
}

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

function shortUrl(u: string): string {
  try {
    const x = new URL(u.startsWith("http") ? u : "https://" + u);
    return x.hostname + (x.pathname.length > 1 ? x.pathname.slice(0, 40) : "");
  } catch {
    return clip(u, 80);
  }
}

function extractQuery(s: string): string {
  const m = s.match(/(?:query|searching)[:\s]+["']?([^"'\n]{3,120})/i);
  return m?.[1]?.trim() || "";
}

function extractName(s: string): string {
  const m = s.match(/(?:name|person)[=:\s]+["']?([A-Z][A-Za-z .'-]{2,60})/);
  return m?.[1]?.trim() || "";
}
