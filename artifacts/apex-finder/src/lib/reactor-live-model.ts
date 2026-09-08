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

export type LiveActivityStatus = "queued" | "active" | "completed" | "failed";

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
  links?: ReactorSource[];
}

/**
 * The shared semantic unit for live execution. Both the graph and textual
 * feed should eventually render this shape rather than independently
 * interpreting raw Bureau payloads.
 */
export interface LiveActivity {
  id: string;
  parentId?: string;
  jobId?: string;
  target?: string;
  actor?: string;
  agent?: string;
  operation?: string;
  tool?: string;
  spanType?: string;
  status: LiveActivityStatus;
  startedAt?: string;
  endedAt?: string;
  inputSummary?: string;
  resultSummary?: string;
  sourceUrls?: string[];
}

/** Minimal DigSpan shape accepted by the shared live-activity adapter. */
export interface ReactorSpanLike {
  id: string;
  parentSpanId?: string;
  jobId?: string;
  targetName?: string;
  agentName?: string;
  operationName?: string;
  toolName?: string;
  spanType?: string;
  status?: string;
  startedAt?: string;
  endedAt?: string;
  inputSummary?: string;
  resultSummary?: string;
  sourceUrls?: string[];
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

/** Normalize status at the rendering boundary without inventing activity. */
export function normalizeReactorStatus(value?: string | null): ReactorEventStatus {
  const status = String(value ?? "").toLowerCase();
  if (status === "active" || status === "running" || status === "in_progress") return "active";
  if (status === "queued" || status === "pending" || status === "waiting") return "queued";
  if (status === "error" || status === "failed" || status === "failure" || status === "timeout") return "failed";
  return "done";
}

/** Convert raw span status into the shared live-activity vocabulary. */
export function normalizeLiveActivityStatus(value?: string | null): LiveActivityStatus {
  const status = String(value ?? "").toLowerCase();
  if (status === "active" || status === "running" || status === "in_progress") return "active";
  if (status === "queued" || status === "pending" || status === "waiting") return "queued";
  if (status === "error" || status === "failed" || status === "failure" || status === "timeout") return "failed";
  return "completed";
}

/**
 * Normalize a DigSpan once, preserving causal identity and recorded facts.
 * This adapter intentionally performs no polling, inference, or tool
 * catalogue lookup; consumers receive the same semantic truth.
 */
export function normalizeLiveActivity(span: ReactorSpanLike): LiveActivity {
  return {
    id: String(span.id),
    parentId: span.parentSpanId,
    jobId: span.jobId,
    target: span.targetName,
    actor: span.agentName,
    agent: span.agentName,
    operation: span.operationName,
    tool: span.toolName,
    spanType: span.spanType,
    status: normalizeLiveActivityStatus(span.status),
    startedAt: span.startedAt,
    endedAt: span.endedAt,
    inputSummary: cleanResearchText(span.inputSummary, 360),
    resultSummary: cleanResearchText(span.resultSummary, 700),
    sourceUrls: span.sourceUrls?.filter((url) => {
      try {
        return /^https?:$/i.test(new URL(url).protocol);
      } catch {
        return false;
      }
    }).slice(0, 8),
  };
}

/**
 * Normalize the complete span snapshot once. IDs are authoritative: duplicate
 * observations of one span collapse to one activity, while distinct spans
 * remain distinct even when they use the same tool. Chronology is stable so
 * graph and feed consumers can render the same ordering without reinterpreting
 * the telemetry independently.
 */
export function normalizeLiveActivities(spans: ReactorSpanLike[] | null | undefined): LiveActivity[] {
  if (!Array.isArray(spans) || spans.length === 0) return [];
  const byId = new Map<string, LiveActivity>();
  for (const span of spans) {
    if (!span?.id) continue;
    byId.set(String(span.id), normalizeLiveActivity(span));
  }
  return [...byId.values()].sort((a, b) => {
    const at = a.startedAt ? Date.parse(a.startedAt) : 0;
    const bt = b.startedAt ? Date.parse(b.startedAt) : 0;
    if (bt !== at) return bt - at;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Convert the shared activity into the existing feed contract. This is a
 * presentation adapter only: every displayed field comes from the span or
 * from deterministic normalization of that recorded span.
 */
export function liveActivityToReactorEvent(activity: LiveActivity): ReactorLiveEvent {
  const title = cleanResearchText(activity.operation || activity.tool || activity.spanType, 120) || "Research activity";
  const method = classifyReactorMethod({
    method: "unknown",
    provider: activity.tool,
    title,
    query: activity.inputSummary,
    url: activity.sourceUrls?.[0],
  });
  const sourceUrls = activity.sourceUrls ?? [];
  return {
    id: activity.id,
    timestamp: activity.startedAt,
    status: activity.status === "active" ? "active" : activity.status === "queued" ? "queued" : activity.status === "failed" ? "failed" : "done",
    method,
    title,
    actor: activity.actor || activity.agent,
    provider: activity.tool,
    targetName: activity.target,
    prompt: activity.inputSummary,
    resultSummary: activity.resultSummary,
    sourceUrls,
    links: sourceUrls.map((url) => ({ url })),
  };
}

/** Stable identity for a live event. Prefer an instrumentation id when one exists. */
export function reactorEventKey(event: Pick<ReactorLiveEvent, "id" | "timestamp" | "title" | "provider" | "targetName">): string {
  const id = String(event.id || "").trim();
  if (id) return id;
  return [event.timestamp, event.targetName, event.provider, event.title].map((value) => String(value ?? "").trim()).join("|");
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
  return cleanResearchText(match?.[1], 180);
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
