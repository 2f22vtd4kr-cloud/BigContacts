/**
 * Semantic contract for Reactor Live.
 *
 * The UI is a renderer, not a research engine. A live surface may only
 * visualize facts carried by an actual Bureau event. In particular, it must
 * never invent a search query, URL, result, or "typing" state merely because
 * a scene would look better with one.
 */

export type ReactorMethod =
  | "search"
  | "browser"
  | "registry"
  | "domain"
  | "social"
  | "graph"
  | "llm"
  | "case"
  | "unknown";

export type ReactorEventStatus = "queued" | "active" | "done" | "failed";

export interface ReactorSource {
  title?: string;
  url: string;
  sourceType?: string;
}

export interface ReactorLiveEvent {
  id: string;
  timestamp?: string;
  status: ReactorEventStatus;
  method: ReactorMethod;
  title: string;
  actor?: string;
  provider?: string;
  targetName?: string;
  query?: string;
  url?: string;
  prompt?: string;
  resultSummary?: string;
  sourceUrls?: string[];
  sources?: ReactorSource[];
  evidenceCount?: number;
  why?: string;
  narration?: string;
  links?: ReactorSource[];
}

const INTERNAL = [
  /research contract/i,
  /query template/i,
  /lane\s*[-–]/i,
  /HNWI target/i,
  /provider fan/i,
  /complementary_lane/i,
  /resolve_identity/i,
  /official_routes/i,
  /contact_routes:/i,
  /people_press/i,
];

export function isInternalResearchText(value?: string | null): boolean {
  if (!value) return false;
  return INTERNAL.some((pattern) => pattern.test(value));
}

export function cleanResearchText(value?: string | null, max = 240): string | undefined {
  if (!value || isInternalResearchText(value)) return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length < 2) return undefined;
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

export function classifyReactorMethod(event: Pick<ReactorLiveEvent, "method" | "provider" | "title" | "query" | "url">): ReactorMethod {
  if (event.method !== "unknown") return event.method;
  const blob = [event.provider, event.title, event.query, event.url].filter(Boolean).join(" ").toLowerCase();
  if (/companies.?house|sec|edgar|registry|filing/.test(blob)) return "registry";
  if (/whois|rdap|dns|domain/.test(blob)) return "domain";
  if (/linkedin|social|telegram|instagram|twitter|sherlock|maigret|holehe/.test(blob)) return "social";
  if (/browser|fetch|scrapfly|zenrows|page/.test(blob)) return "browser";
  if (/graph|relationship|network/.test(blob)) return "graph";
  if (/gemini|groq|mistral|nvidia|llm|extract|reason/.test(blob)) return "llm";
  if (/search|serper|serpapi|tavily|exa|google|perplexity/.test(blob)) return "search";
  if (/case|card|evidence/.test(blob)) return "case";
  return "unknown";
}

/**
 * Extract only an explicit search query. Deliberately no target-name fallback:
 * showing "John Smith contact email phone" would be UI fiction if the agent
 * did not actually issue that query.
 */
export function explicitResearchQuery(value?: string | null): string | undefined {
  const text = cleanResearchText(value, 180);
  if (!text) return undefined;
  const match = text.match(/(?:^|\b)(?:query|search(?:ing)?(?:\s+for)?):\s*["“]?(.+?)["”]?$/i);
  return cleanResearchText(match?.[1] ?? text, 180);
}

export function sourceList(event: Pick<ReactorLiveEvent, "sources" | "links" | "sourceUrls">): ReactorSource[] {
  const direct = event.sources?.length ? event.sources : event.links?.length ? event.links : (event.sourceUrls ?? []).map((url) => ({ url }));
  const seen = new Set<string>();
  return direct.filter((source) => {
    try {
      const url = new URL(source.url);
      if (!/^https?:$/i.test(url.protocol)) return false;
      if (seen.has(url.href)) return false;
      seen.add(url.href);
      return true;
    } catch {
      return false;
    }
  }).slice(0, 8);
}

export function eventIsRenderable(event: Pick<ReactorLiveEvent, "status" | "title" | "resultSummary" | "query" | "url">): boolean {
  return Boolean(
    cleanResearchText(event.title, 120)
      || cleanResearchText(event.resultSummary, 240)
      || cleanResearchText(event.query, 180)
      || cleanResearchText(event.url, 240),
  );
}
