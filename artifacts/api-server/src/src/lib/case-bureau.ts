import type { Entity } from "@workspace/db";
import { logger } from "./logger";

export type BureauSpecialist = {
  id: string;
  title: string;
  mission: string;
  tools: string[];
  status: "ready" | "waiting_for_key";
};

export type BureauAction = {
  id: string;
  title: string;
  purpose: string;
  specialistId: string;
  tools: string[];
  priority: number;
  status: "queued" | "active" | "complete" | "review";
  rationale: string;
};

export type BureauContactRoute = {
  rank: number;
  tier: string;
  tierLabel: string;
  value: string;
  vectorType: string;
  personName: string | null;
  role: string | null;
  relationship: string | null;
  score: number;
  state: string;
  sourceUrls: string[];
  sourceDomains: string[];
  rationale: string;
  humanReview: "use_judgment";
};

export type ResearchCaseFile = {
  version: 1;
  discoveryContext?: {
    caseId: number;
    humanBrief: DiscoveryCaseFile["humanBrief"];
    bossPremise: string;
    initialResearch: DiscoveryCaseFile["initialResearch"];
  };
  target: {
    name: string;
    type: string;
    nationality: string | null;
    knownResidences: string[];
    knownDomains: string[];
  };
  hypotheses: string[];
  evidenceSummary: {
    sourceRegistries: string[];
    discoveredPeople: string[];
    relatedOrganizations: string[];
    evidenceCount: number;
    searchGaps: string[];
    negativeFindings: string[];
  };
  specialistRoster: BureauSpecialist[];
  actionQueue: BureauAction[];
  contactRoutes: BureauContactRoute[];
  humanDirectives: string[];
  decisionLog: Array<{
    iteration: number;
    decision: string;
    reason: string;
    createdAt: string;
  }>;
  nextBestAction: BureauAction | null;
  lastUpdatedBy: string;
};

export type DiscoveryCaseFile = {
  version: 2;
  caseType: "discovery";
  humanBrief: {
    objective: string;
    motivation: string;
    geography: string;
    exclusions: string[];
  };
  bossPremise: string;
  investigationRules: string[];
  candidateLanes: string[];
  initialAction: {
    id: "broad-web-discovery";
    title: string;
    purpose: string;
    status: "ready" | "waiting_for_gemini";
  };
  initialResearch: {
    status: "not_started" | "recorded" | "reviewed";
    researchResponse: string | null;
    bossCommentary: string | null;
    sourceUrls: string[];
    recordedAt: string | null;
  };
  discoveredCandidates: Array<{
    name: string;
    type: string;
    relevance: string;
    reachability: string;
    sourceUrls: string[];
    state: "review_only";
  }>;
  humanDirectives: string[];
  decisionLog: Array<{
    iteration: number;
    decision: string;
    reason: string;
    createdAt: string;
  }>;
  lastUpdatedBy: string;
};

/**
 * The Boss model is selected from the catalog exposed by the configured
 * Gemini key. We intentionally do not hard-code a version because model
 * availability and pricing vary by key/project and change over time.
 */
export const GEMINI_BOSS_MODEL_PENDING = "auto-low-cost-pending";
const GEMINI_MODELS_API = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_KEY_NAMES = [
  "GEMINI_API_KEY",
  ...Array.from({ length: 13 }, (_, index) => `GEMINI_API_KEY_${index + 1}`),
];

type GeminiModelCatalogEntry = {
  name?: string;
  supportedGenerationMethods?: string[];
};

export type GeminiBossModelSelection = {
  model: string;
  status: "resolved" | "pending" | "unavailable";
  inspectedKeyCount: number;
  candidateCount: number;
  candidateModels?: string[];
  keyName?: string;
};

export type GeminiBossDiscoveryResult = {
  status: "completed" | "pending" | "unavailable";
  model: string;
  report: string | null;
  candidates: Array<{
    name: string;
    type?: string;
    relevance?: string;
    reachability?: string;
    sourceUrls?: string[];
  }>;
  citations: string[];
  error: string | null;
};

function getGeminiKeys(): string[] {
  return GEMINI_KEY_NAMES
    .map((name) => process.env[name] ?? "")
    .filter(Boolean);
}

function getGeminiKeyEntries(): Array<{ name: string; key: string }> {
  return GEMINI_KEY_NAMES
    .map((name) => ({ name, key: process.env[name] ?? "" }))
    .filter((entry) => Boolean(entry.key));
}

function modelVersion(name: string): [number, number] {
  const match = name.match(/gemini-(\d+)(?:\.(\d+))?/i);
  return [Number(match?.[1] ?? 99), Number(match?.[2] ?? 99)];
}

function modelRank(name: string): [number, number, number, number, string] {
  const normalized = name.toLowerCase();
  const [major, minor] = modelVersion(normalized);
  // Flash-Lite is preferred over Flash, and both are preferred over Pro or
  // specialized/preview models for the Boss's broad first-pass work.
  const family = normalized.includes("flash-lite")
    ? 0
    : normalized.includes("flash")
      ? 1
      : 2;
  const lifecycle = normalized.includes("preview") || normalized.includes("experimental") ? 1 : 0;
  const specialized = normalized.includes("image")
    || normalized.includes("audio")
    || normalized.includes("embedding")
    || normalized.includes("tts")
    || normalized.includes("deep-research")
    ? 1
    : 0;
  return [family, specialized, lifecycle, major * 100 + minor, normalized];
}

function chooseGeminiModelCandidates(entries: GeminiModelCatalogEntry[]): string[] {
  return entries
    .filter((entry) => entry.name && entry.supportedGenerationMethods?.includes("generateContent"))
    .map((entry) => entry.name!.replace(/^models\//, ""))
    .filter((name) => /^gemini-/i.test(name))
    .filter((name) => /flash/i.test(name))
    .filter((name) => /^gemini-\d+(?:\.\d+)?-flash(?:-preview)?$/i.test(name))
    .filter((name) => !/embedding|aqa|robotics|image|tts|deep-research|latest|001/i.test(name))
    .sort((left, right) => {
      // Prefer the currently usable concrete Flash preview before newer
      // catalog entries that may be visible but unavailable to this project.
      const preferred = (name: string) => name.toLowerCase() === "gemini-3-flash-preview" ? 0 : 1;
      const aPreferred = preferred(left);
      const bPreferred = preferred(right);
      if (aPreferred !== bPreferred) return aPreferred - bPreferred;
      const a = modelRank(left);
      const b = modelRank(right);
      return b[3] - a[3] || a[4].localeCompare(b[4]);
    });
}

let cachedBossModelSelection: { expiresAt: number; selection: GeminiBossModelSelection } | null = null;

export async function resolveGeminiBossModel(preferredKeyName?: string): Promise<GeminiBossModelSelection> {
  const entries = getGeminiKeyEntries();
  const keys = preferredKeyName
    ? [
        ...entries.filter((entry) => entry.name === preferredKeyName),
        ...entries.filter((entry) => entry.name !== preferredKeyName),
      ]
    : entries;
  if (keys.length === 0) {
    return {
      model: GEMINI_BOSS_MODEL_PENDING,
      status: "pending",
      inspectedKeyCount: 0,
      candidateCount: 0,
    };
  }
  if (!preferredKeyName && cachedBossModelSelection && cachedBossModelSelection.expiresAt > Date.now()) {
    return cachedBossModelSelection.selection;
  }

  for (const entry of keys) {
    try {
      const response = await fetch(`${GEMINI_MODELS_API}?key=${encodeURIComponent(entry.key)}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) continue;
      const payload = await response.json() as { models?: GeminiModelCatalogEntry[] };
      const entries = Array.isArray(payload.models) ? payload.models : [];
      const candidates = chooseGeminiModelCandidates(entries);
      if (!candidates.length) continue;
      const selection: GeminiBossModelSelection = {
        model: candidates[0],
        status: "resolved",
        inspectedKeyCount: 1,
        candidateCount: candidates.length,
        candidateModels: candidates,
        keyName: entry.name,
      };
      if (!preferredKeyName) {
        cachedBossModelSelection = { expiresAt: Date.now() + 10 * 60 * 1000, selection };
      }
      return selection;
    } catch {
      // Try the next configured slot without exposing key or provider details.
    }
  }

  return {
    model: GEMINI_BOSS_MODEL_PENDING,
    status: "unavailable",
    inspectedKeyCount: keys.length,
    candidateCount: 0,
  };
}

function extractJsonObject(value: string): string | null {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const source = fenced || value.trim();
  const objectStart = source.indexOf("{");
  const arrayStart = source.indexOf("[");
  const start = objectStart < 0 ? arrayStart : arrayStart < 0 ? objectStart : Math.min(objectStart, arrayStart);
  if (start < 0) return null;
  const open = source[start];
  const close = open === "{" ? "}" : "]";
  const end = source.lastIndexOf(close);
  return end > start ? source.slice(start, end + 1) : null;
}

function parseBossDiscoveryResponse(raw: string): {
  report: string;
  candidates: GeminiBossDiscoveryResult["candidates"];
} {
  const json = extractJsonObject(raw);
  if (!json) return { report: raw.trim(), candidates: [] };
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const rawCandidates = Array.isArray(parsed.candidates)
      ? parsed.candidates
      : Array.isArray(parsed.discoveredCandidates)
        ? parsed.discoveredCandidates
        : [];
    const candidates = rawCandidates
      .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object")
      .map((candidate) => ({
        name: String(candidate.name ?? "").trim(),
        type: typeof candidate.type === "string" ? candidate.type : undefined,
        relevance: typeof candidate.relevance === "string" ? candidate.relevance : undefined,
        reachability: typeof candidate.reachability === "string" ? candidate.reachability : undefined,
        sourceUrls: Array.isArray(candidate.sourceUrls)
          ? candidate.sourceUrls.filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url)).slice(0, 8)
          : undefined,
      }))
      .filter((candidate) => candidate.name.length >= 3)
      .slice(0, 30);
    const report = typeof parsed.report === "string"
      ? parsed.report
      : typeof parsed.summary === "string"
        ? parsed.summary
        : raw.trim();
    return { report, candidates };
  } catch {
    return { report: raw.trim(), candidates: [] };
  }
}

/**
 * Opening Boss request for a discovery case. This is deliberately separate
 * from target-scoped extraction: the mission is the subject, Google grounding
 * supplies the first web context, and all returned people remain review-only.
 */
export async function runGeminiBossDiscovery(input: {
  objective: string;
  motivation: string;
  geography?: string;
  exclusions?: string[];
}): Promise<GeminiBossDiscoveryResult> {
  // This bounded verification run intentionally uses the second configured
  // Google account, not the first key slot used by earlier Bureau attempts.
  const selection = await resolveGeminiBossModel("GEMINI_API_KEY_2");
  if (selection.status !== "resolved") {
    return {
      status: selection.status,
      model: selection.model,
      report: null,
      candidates: [],
      citations: [],
      error: selection.status === "pending"
        ? "No Gemini model is available because no Gemini key is configured."
        : "Configured Gemini keys did not expose a usable Boss model.",
    };
  }

  const requestKey = selection.keyName
    ? process.env[selection.keyName]
    : undefined;
  const prompt = `${buildBossOpeningPrompt(input)}

This is the preliminary web request that initializes the durable case context.
Use Google Search grounding now. Do not wait for a preselected entity.
Return ONLY JSON in this shape:
{
  "report": "concise evidence-led opening assessment",
  "candidates": [
    {
      "name": "candidate name",
      "type": "person | company | investment_group | intermediary",
      "relevance": "why this candidate fits the mission",
      "reachability": "realistic public route or unresolved",
      "sourceUrls": ["exact URLs supporting this candidate"]
    }
  ],
  "nextDirections": ["bounded next investigation direction"],
  "uncertainties": ["identity, attribution, or access uncertainty"]
}
Candidates are review-only. Never invent a name, wealth claim, relationship, contact detail, or URL.`;

  let lastProviderError = "All configured Gemini models and keys failed for the preliminary Boss request.";
  const models = selection.candidateModels?.length ? selection.candidateModels.slice(0, 4) : [selection.model];
  // Gemini free-tier request limits are project-wide, not independent per
  // secret. Do not fan a single failed request across every key in the pool.
  const requestKeys = requestKey ? [requestKey] : [];
  for (const model of models) {
    for (const key of requestKeys) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const requestBody = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.1,
          // Keep this contract identical to the already-running Gemini
          // grounded-search lane. Some projects reject JSON MIME mode when
          // Google Search grounding is enabled, even though the model catalog
          // advertises generateContent support.
          maxOutputTokens: 2000,
        },
      };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "x-goog-api-key": key },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(45_000),
      });
      let responseText = "";
      if (!response.ok) {
        responseText = (await response.text().catch(() => "")).slice(0, 300);
        lastProviderError = `Gemini ${model} HTTP ${response.status}${responseText ? `: ${responseText}` : ""}`;
        logger.warn(
          { model, status: response.status, detail: responseText },
          "Case Bureau Boss opening provider rejection",
        );
        // A 429 is a project/model quota response. Rotating keys or trying
        // more catalog models immediately only amplifies the same failure.
        if (response.status === 429) {
          return {
            status: "unavailable",
            model,
            report: null,
            candidates: [],
            citations: [],
            error: lastProviderError,
          };
        }
      }
      if (!response.ok) continue;
      const payload = await response.json() as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
          groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string } }> };
        }>;
      };
      const candidate = payload.candidates?.[0];
      const raw = candidate?.content?.parts?.map((part) => part.text ?? "").join("\n").trim() ?? "";
      if (!raw) {
        lastProviderError = "Gemini returned no text for the preliminary Boss request.";
        logger.warn({ model: selection.model }, "Case Bureau Boss opening returned no text");
        continue;
      }
      const parsed = parseBossDiscoveryResponse(raw);
      const citations = (candidate?.groundingMetadata?.groundingChunks ?? [])
        .map((chunk) => chunk.web?.uri)
        .filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url))
        .slice(0, 40);
      return {
        status: "completed",
        model,
        report: parsed.report || raw,
        candidates: parsed.candidates,
        citations,
        error: null,
      };
      } catch (error) {
        lastProviderError = error instanceof Error ? error.message : "Gemini request failed.";
        logger.warn({ model, err: lastProviderError }, "Case Bureau Boss opening request threw");
      }
    }
  }

  return {
    status: "unavailable",
    model: selection.model,
    report: null,
    candidates: [],
    citations: [],
    error: lastProviderError,
  };
}

const SPECIALISTS: BureauSpecialist[] = [
  {
    id: "identity",
    title: "Identity Investigator",
    mission: "Resolve the exact person, company, aliases, jurisdiction, and target anchors.",
    tools: ["identity-resolver", "registry-client", "llm-name-validator"],
    status: "ready",
  },
  {
    id: "structure",
    title: "Ownership & Structure Investigator",
    mission: "Map operators, parent groups, directors, beneficial ownership, and named principals.",
    tools: ["GLEIF", "OpenOwnership", "Companies House", "EDGAR", "OCCRP Aleph"],
    status: "ready",
  },
  {
    id: "web",
    title: "Open-Web Investigator",
    mission: "Search official sites, press, biographies, venues, memberships, and public activity for useful leads.",
    tools: ["web-enricher", "Gemini", "Perplexity", "Tavily", "Exa"],
    status: "waiting_for_key",
  },
  {
    id: "footprint",
    title: "Digital Footprint Investigator",
    mission: "Expand public usernames and web presence, then return leads tied to the target context.",
    tools: ["Sherlock", "Maigret", "Holehe", "RDAP", "DNS", "certificate transparency"],
    status: "ready",
  },
  {
    id: "contact",
    title: "Contact Route Investigator",
    mission: "Collect direct, executive, operator, intermediary, social, and organization routes without collapsing them.",
    tools: ["contact-enrichment", "contact-attribution", "route-hierarchy", "graph-engine"],
    status: "ready",
  },
  {
    id: "skeptic",
    title: "Contradiction Investigator",
    mission: "Look for name collisions, stale pages, unrelated people, and evidence that weakens the current hypothesis.",
    tools: ["exact-page validation", "source-reliability", "evidence-ledger", "MCTS"],
    status: "ready",
  },
];

export const DEFAULT_DISCOVERY_OBJECTIVE =
  "Find realistic potential investor routes for a startup founder seeking conversations with genuinely wealthy, relevant people in Western countries.";

export const DEFAULT_DISCOVERY_MOTIVATION =
  "The founder has invested substantial personal time and money into a startup and wants practical paths to present the idea to real potential investors, not celebrity names or unreachable institutions.";

export const DEFAULT_DISCOVERY_GEOGRAPHY = "Western countries, prioritizing realistic regional and professional access over fame.";

export const DEFAULT_DISCOVERY_EXCLUSIONS = [
  "Do not invent people, companies, wealth, contact details, relationships, or source claims.",
  "Do not prioritize celebrity billionaires or famous public figures who are unrealistic to reach without a documented connection.",
  "Do not stop at generic reception numbers or irrelevant shared inboxes when a closer public route exists.",
  "Do not treat job titles, company association, fame, or search snippets as proof of personal wealth.",
];

export function buildBossOpeningPrompt(input: {
  objective: string;
  motivation: string;
  geography?: string;
  exclusions?: string[];
}): string {
  const geography = input.geography?.trim() || DEFAULT_DISCOVERY_GEOGRAPHY;
  const exclusions = input.exclusions?.length ? input.exclusions : DEFAULT_DISCOVERY_EXCLUSIONS;
  return `You are the Boss Investigator opening a new discovery-first public-web research case.

Human mission:
${input.objective.trim()}

Why this matters:
${input.motivation.trim()}

Geographic premise:
${geography}

Research broadly and begin with discovery. Do not assume a target company or person in advance. Look for real companies, founders, investors, family offices, investment groups, business owners, operators, advisors, portfolio relationships, and other plausible routes that could lead to a useful investor conversation.

The goal is practical proximity to a real decision-maker, not fame alone. Rank direct routes first, followed by named executives or operators, relevant intermediaries, professional or portfolio relationships, social routes, and organization routes. Search public web sources only and preserve exact source URLs and what each source proves.

Opening research must:
1. Discover promising candidates rather than force a preselected target.
2. Separate evidence of wealth, investment activity, relevance, and practical reachability.
3. Retain plausible candidates for human review even when identity or access is unresolved.
4. Explicitly report uncertainty, name collisions, missing evidence, search gaps, and negative findings.
5. Recommend the strongest next investigation directions after the first broad pass.

Guardrails:
${exclusions.map((rule) => `- ${rule}`).join("\n")}

Return a structured research report with:
- discovered people, companies, and organizations
- why each is relevant to the human mission
- evidence of wealth, investment activity, ownership, or influence
- practical public contact or introduction routes
- exact supporting source URLs
- realistic versus merely famous target assessment
- unresolved identity and attribution questions
- strongest next research directions

Do not claim that a person is wealthy, connected, or reachable unless the public evidence supports that specific claim.`;
}

export function buildDiscoveryCaseFile(input: {
  objective: string;
  motivation: string;
  geography?: string;
  exclusions?: string[];
  now?: string;
}): DiscoveryCaseFile {
  const objective = input.objective.trim();
  const motivation = input.motivation.trim();
  const geography = input.geography?.trim() || DEFAULT_DISCOVERY_GEOGRAPHY;
  const exclusions = input.exclusions?.filter((value) => value.trim()).map((value) => value.trim()).length
    ? input.exclusions.filter((value) => value.trim()).map((value) => value.trim())
    : DEFAULT_DISCOVERY_EXCLUSIONS;
  return {
    version: 2,
    caseType: "discovery",
    humanBrief: { objective, motivation, geography, exclusions },
    bossPremise: "Start broad. Discover realistic public-world investor routes before resolving any one target in depth.",
    investigationRules: [
      "Public evidence only; preserve claim-level provenance.",
      "Wealth, relevance, identity, and practical access are separate questions.",
      "Famous or wealthy does not mean reachable.",
      "Candidates remain review-only until exact identity and attribution are established.",
      "The human operator remains the final decision-maker for contact use.",
    ],
    candidateLanes: [
      "Founder and operator-investors",
      "Family offices and investment groups",
      "Regional business owners and private-company principals",
      "Portfolio-company and advisor relationships",
      "Professional intermediaries and practical introduction routes",
      "Public social and organization routes",
    ],
    initialAction: {
      id: "broad-web-discovery",
      title: "Broad public-web discovery",
      purpose: "Find realistic investor candidates and routes without assuming a target in advance.",
      status: "waiting_for_gemini",
    },
    initialResearch: {
      status: "not_started",
      researchResponse: null,
      bossCommentary: null,
      sourceUrls: [],
      recordedAt: null,
    },
    discoveredCandidates: [],
    humanDirectives: [],
    decisionLog: [{
      iteration: 0,
      decision: "Open a discovery-first case and prepare the Boss broad research brief.",
      reason: "The human request identifies a mission, not a validated target entity.",
      createdAt: input.now ?? new Date().toISOString(),
    }],
    lastUpdatedBy: "boss-brief-generator",
  };
}

export function parseDiscoveryCaseFile(value: string): DiscoveryCaseFile | null {
  try {
    const parsed = JSON.parse(value) as DiscoveryCaseFile;
    return parsed?.caseType === "discovery" && parsed.version === 2 ? parsed : null;
  } catch {
    return null;
  }
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function uniqueStrings(values: unknown[], limit = 20): string[] {
  const strings: string[] = [];
  for (const value of values) {
    if (typeof value === "string" && value.trim()) strings.push(value.trim());
  }
  return [...new Set(strings)].slice(0, limit);
}

function domainsFromUrls(urls: unknown[]): string[] {
  return uniqueStrings(urls.map((value) => {
    if (typeof value !== "string") return null;
    try {
      return new URL(value).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  }).filter(Boolean));
}

function contactTier(route: Record<string, unknown>): { tier: string; label: string; score: number } {
  const relationship = String(route.relationship ?? route.scope ?? "").toLowerCase();
  const tier = String(route.tier ?? "").toLowerCase();
  const value = String(route.value ?? "");
  if (tier.includes("direct") || tier.includes("person") || relationship.includes("target_person")) {
    return { tier: "direct_person", label: "Direct person route", score: 100 };
  }
  if (tier.includes("executive") || relationship.includes("executive") || relationship.includes("director")) {
    return { tier: "executive", label: "Named executive route", score: 82 };
  }
  if (tier.includes("operator") || relationship.includes("operator") || relationship.includes("parent")) {
    return { tier: "operator", label: "Operator / parent route", score: 70 };
  }
  if (tier.includes("intermediary") || relationship.includes("friend") || relationship.includes("family") || relationship.includes("associate")) {
    return { tier: "intermediary", label: "Intermediary route", score: 58 };
  }
  if (/^(info|contact|office|press|hello|enquiries|sales|admin)@/i.test(value) || tier.includes("organization")) {
    return { tier: "organization", label: "Organization route", score: 38 };
  }
  return { tier: "context", label: "Contextual route", score: 24 };
}

function normalizeRoutes(metadata: Record<string, unknown>): BureauContactRoute[] {
  const raw = metadata.routeHierarchy;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((route): route is Record<string, unknown> => Boolean(route) && typeof route === "object")
    .map((route, index) => {
      const urls = uniqueStrings(Array.isArray(route.sourceUrls) ? route.sourceUrls : []);
      const tier = contactTier(route);
      const confidence = typeof route.score === "number" ? route.score : tier.score;
      return {
        rank: index + 1,
        tier: tier.tier,
        tierLabel: tier.label,
        value: String(route.value ?? ""),
        vectorType: String(route.vectorType ?? "route"),
        personName: typeof route.personName === "string" ? route.personName : null,
        role: typeof route.role === "string" ? route.role : null,
        relationship: typeof route.relationship === "string" ? route.relationship : null,
        score: Math.max(0, Math.min(100, Math.round(confidence))),
        state: String(route.state ?? "review"),
        sourceUrls: urls,
        sourceDomains: uniqueStrings(
          Array.isArray(route.sourceDomains) ? route.sourceDomains : domainsFromUrls(urls),
        ),
        rationale: String(route.note ?? "Public route retained for human review."),
        humanReview: "use_judgment",
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((route, index) => ({ ...route, rank: index + 1 }))
    .slice(0, 40);
}

function buildActions(file: Omit<ResearchCaseFile, "actionQueue" | "nextBestAction">): BureauAction[] {
  const actions: BureauAction[] = [];
  const { evidenceSummary, target } = file;
  if (evidenceSummary.discoveredPeople.length === 0) {
    actions.push({
      id: "discover-people",
      title: "Discover named people",
      purpose: "Find principals, executives, operators, staff, and relevant public people tied to the target.",
      specialistId: "web",
      tools: ["web-enricher", "Gemini", "Perplexity", "Tavily", "Exa"],
      priority: 100,
      status: "queued",
      rationale: "The case has no named people to follow yet.",
    });
  }
  if (target.knownDomains.length === 0) {
    actions.push({
      id: "resolve-official-domains",
      title: "Resolve official domains",
      purpose: "Identify the target's official site, operator site, parent group, and exact pages.",
      specialistId: "structure",
      tools: ["domain-resolver", "RDAP", "DNS", "certificate transparency"],
      priority: 96,
      status: "queued",
      rationale: "No trusted domain anchor is present in the case file.",
    });
  }
  if (evidenceSummary.relatedOrganizations.length === 0) {
    actions.push({
      id: "map-ownership-structure",
      title: "Map ownership and structure",
      purpose: "Trace operators, parent groups, entities, directors, and beneficial-owner hypotheses.",
      specialistId: "structure",
      tools: ["GLEIF", "OpenOwnership", "Companies House", "EDGAR", "OCCRP Aleph"],
      priority: 92,
      status: "queued",
      rationale: "Structure evidence is still sparse.",
    });
  }
  actions.push({
    id: "expand-contact-routes",
    title: "Expand the contact hierarchy",
    purpose: "Search direct person, executive, operator, intermediary, social, and organization routes.",
    specialistId: "contact",
    tools: ["contact-enrichment", "contact-attribution", "graph-engine", "route-hierarchy"],
    priority: evidenceSummary.discoveredPeople.length > 0 ? 98 : 80,
    status: "queued",
    rationale: "Every candidate route is retained and ranked for the human operator.",
  });
  actions.push({
    id: "run-digital-footprint",
    title: "Run digital footprint expansion",
    purpose: "Search public usernames and cross-platform traces tied to the target context.",
    specialistId: "footprint",
    tools: ["Sherlock", "Maigret", "Holehe"],
    priority: 72,
    status: "queued",
    rationale: "Digital traces can reveal routes that formal registries miss.",
  });
  actions.push({
    id: "challenge-case",
    title: "Challenge the leading hypothesis",
    purpose: "Search for collisions, stale evidence, unrelated names, and contradictory source material.",
    specialistId: "skeptic",
    tools: ["exact-page validation", "source-reliability", "evidence-ledger", "MCTS"],
    priority: 64,
    status: "queued",
    rationale: "The Head Investigator should actively test its own working theory.",
  });
  return actions.sort((a, b) => b.priority - a.priority);
}

export function buildInitialCaseFile(entity: Entity): ResearchCaseFile {
  const metadata = parseJson<Record<string, unknown>>(entity.metadata, {});
  const investigatorPlan = metadata.investigatorResearchPlan && typeof metadata.investigatorResearchPlan === "object"
    ? metadata.investigatorResearchPlan as Record<string, unknown>
    : {};
  const adaptive = metadata.adaptiveResearchTrace && typeof metadata.adaptiveResearchTrace === "object"
    ? metadata.adaptiveResearchTrace as Record<string, unknown>
    : {};
  const sourceRegistries = parseJson<unknown[]>(entity.sourceRegistries, []);
  const knownResidences = parseJson<unknown[]>(entity.knownResidences, []);
  const discoveredPeople = uniqueStrings([
    ...(Array.isArray(adaptive.discoveredPeople) ? adaptive.discoveredPeople : []),
    ...(Array.isArray(investigatorPlan.namedPeople) ? investigatorPlan.namedPeople : []),
  ]);
  const relatedOrganizations = uniqueStrings([
    ...(Array.isArray(adaptive.relatedOrganizations) ? adaptive.relatedOrganizations : []),
    ...(Array.isArray(investigatorPlan.relatedOrganizations) ? investigatorPlan.relatedOrganizations : []),
  ]);
  const knownDomains = uniqueStrings([
    entity.personalWebsite,
    ...(Array.isArray(adaptive.candidateDomains) ? adaptive.candidateDomains : []),
    ...domainsFromUrls(Array.isArray(adaptive.citations) ? adaptive.citations : []),
  ]);
  const evidenceSummary = {
    sourceRegistries: uniqueStrings(sourceRegistries),
    discoveredPeople,
    relatedOrganizations,
    evidenceCount: typeof adaptive.evidenceCount === "number" ? adaptive.evidenceCount : 0,
    searchGaps: uniqueStrings(Array.isArray(adaptive.searchGaps) ? adaptive.searchGaps : []),
    negativeFindings: uniqueStrings(Array.isArray(adaptive.negativeFindings) ? adaptive.negativeFindings : []),
  };
  const base = {
    version: 1 as const,
    target: {
      name: entity.name,
      type: entity.type,
      nationality: entity.nationality,
      knownResidences: uniqueStrings(knownResidences),
      knownDomains,
    },
    hypotheses: [
      `The target identity is ${entity.type.toLowerCase()} "${entity.name}" and should be resolved before trusting adjacent people.`,
      "Useful access may exist through a named person, operator, executive, intermediary, social presence, or organization.",
    ],
    evidenceSummary,
    specialistRoster: SPECIALISTS,
    contactRoutes: normalizeRoutes(metadata),
    humanDirectives: [],
    decisionLog: [],
    lastUpdatedBy: "local-head-investigator",
  };
  const actionQueue = buildActions(base);
  return {
    ...base,
    actionQueue,
    nextBestAction: actionQueue[0] ?? null,
  };
}

export function parseCaseFile(value: string): ResearchCaseFile | null {
  try {
    const parsed = JSON.parse(value) as ResearchCaseFile;
    return parsed && parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function advanceCaseFile(file: ResearchCaseFile, iteration: number, now = new Date().toISOString()): ResearchCaseFile {
  const next = file.actionQueue.find((action) => action.status === "queued") ?? null;
  const updatedQueue = file.actionQueue.map((action) =>
    action.id === next?.id ? { ...action, status: "active" as const } : action,
  );
  const decision = next
    ? `Assign ${next.title} to ${file.specialistRoster.find((specialist) => specialist.id === next.specialistId)?.title ?? next.specialistId}.`
    : "No queued action remains; keep the case open for a human directive or model-backed re-plan.";
  return {
    ...file,
    actionQueue: updatedQueue,
    nextBestAction: next ? { ...next, status: "active" } : null,
    decisionLog: [...file.decisionLog, { iteration, decision, reason: next?.rationale ?? "Action queue exhausted.", createdAt: now }].slice(-50),
    lastUpdatedBy: "local-head-investigator",
  };
}