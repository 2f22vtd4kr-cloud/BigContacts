import {
  researchWithExa,
  researchWithPerplexity,
  researchWithTavily,
  type AIExtractResult,
  type AIResearchContext,
  type AIResearchLane,
} from "./ai-extractor";
import {
  ABSOLUTE_ADAPTIVE_ACTION_CAP,
  resolveResearchDepth,
  type ResearchDepthConfig,
} from "./research-depth";

export type AdaptiveActionKind =
  | "resolve_identity"
  | "resolve_structure"
  | "identify_people"
  | "official_routes"
  | "follow_person"
  | "verify_exact_claim"
  | "complementary_lane"
  | "stop_review";

export interface AdaptiveResearchState {
  targetName: string;
  targetType: string;
  country: string | null;
  relatedOrganizations: string[];
  candidateDomains: string[];
  discoveredPeople: string[];
  followedPeople: string[];
  followedDomains: string[];
  completedActions: AdaptiveActionKind[];
  completedLanes: AIResearchLane[];
  identityAssessment: AIExtractResult["identityAssessment"];
  identityBasis: string | null;
  evidenceCount: number;
  claimUrls: number;
  noProgressPasses: number;
  depth: ResearchDepthConfig;
}

export interface AdaptiveAction {
  kind: AdaptiveActionKind;
  lane: AIResearchLane | null;
  subject: string;
  reason: string;
  signature: string;
}

export interface AdaptiveProviderResult {
  provider: "perplexity" | "tavily" | "exa";
  action: AdaptiveAction;
  result: AIExtractResult;
}

export interface AdaptiveResearchDirectorResult {
  actions: AdaptiveAction[];
  providerResults: AdaptiveProviderResult[];
  discoveredPeople: string[];
  candidateDomains: string[];
  searchGaps: string[];
  negativeFindings: string[];
  stoppedBecause: string;
}

export interface AdaptiveResearchSnapshot {
  actions: Array<{
    kind: AdaptiveActionKind;
    lane: AIResearchLane | null;
    subject: string;
    reason: string;
  }>;
  providerResults: Array<{
    provider: AdaptiveProviderResult["provider"];
    action: AdaptiveActionKind;
    subject: string;
    source: AIExtractResult["source"];
    citations: string[];
    people: string[];
    identityAssessment: AIExtractResult["identityAssessment"];
  }>;
  discoveredPeople: string[];
  candidateDomains: string[];
  searchGaps: string[];
  negativeFindings: string[];
  stoppedBecause: string;
}

/** Compact persisted audit view; full provider payloads remain in the evidence ledger. */
export function summarizeAdaptiveResearch(
  result: AdaptiveResearchDirectorResult,
): AdaptiveResearchSnapshot {
  return {
    actions: result.actions.slice(0, 8).map((action) => ({
      kind: action.kind,
      lane: action.lane,
      subject: action.subject,
      reason: action.reason,
    })),
    providerResults: result.providerResults.slice(0, 8).map((item) => ({
      provider: item.provider,
      action: item.action.kind,
      subject: item.action.subject,
      source: item.result.source,
      citations: (item.result.citations ?? []).slice(0, 8),
      people: [
        ...(item.result.ownerResolutions ?? []).map((owner) => owner.name),
        ...(item.result.ownerContacts ?? []).map((owner) => owner.name),
      ].filter((name, index, names) => names.indexOf(name) === index).slice(0, 12),
      identityAssessment: item.result.identityAssessment,
    })),
    discoveredPeople: result.discoveredPeople.slice(0, 12),
    candidateDomains: result.candidateDomains.slice(0, 12),
    searchGaps: result.searchGaps.slice(0, 16),
    negativeFindings: result.negativeFindings.slice(0, 16),
    stoppedBecause: result.stoppedBecause,
  };
}

export interface AdaptiveResearchDirectorInput {
  targetName: string;
  targetType: string;
  country: string | null;
  context: Omit<AIResearchContext, "lane">;
  maxActions?: number;
  /** fast | standard | deep — default from env RESEARCH_DEPTH or standard */
  depth?: string | null;
  onStep?: (step: {
    action: AdaptiveAction;
    status: "active" | "complete" | "review";
    summary?: string;
  }) => void | Promise<void>;
}

const ACTION_LIMIT = 5;

const SKIP_DOMAINS = new Set([
  "google.com", "bing.com", "yahoo.com", "duckduckgo.com", "qwant.com",
  "linkedin.com", "twitter.com", "x.com", "instagram.com", "facebook.com",
  "youtube.com", "tiktok.com", "wikipedia.org", "wikidata.org",
  "crunchbase.com", "pitchbook.com", "booking.com", "tripadvisor.com",
  "companieshouse.gov.uk", "companies-house.gov.uk", "sec.gov",
]);

const NAVIGATION_NOISE = new Set([
  "cerca vai", "english un", "search menu", "read more", "learn more",
  "privacy policy", "cookie policy", "contact us", "click here",
]);

function cleanDomain(value: string): string | null {
  try {
    const host = new URL(value.includes("://") ? value : `https://${value}`)
      .hostname.toLowerCase().replace(/^www\./, "");
    if (!host || SKIP_DOMAINS.has(host) || host.includes("webcache")) return null;
    return host;
  } catch {
    return null;
  }
}

function domainsFromResult(result: AIExtractResult): string[] {
  return [...new Set((result.citations ?? [])
    .map(cleanDomain)
    .filter((domain): domain is string => Boolean(domain)))].slice(0, 8);
}

function usablePersonName(value: string, targetName: string): boolean {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.toLowerCase() === targetName.trim().toLowerCase()) return false;
  if (name.length < 6 || name.length > 90 || NAVIGATION_NOISE.has(name.toLowerCase())) return false;
  if (/[|/<>@]/.test(name) || /\b(?:contact|menu|search|privacy|cookie|english|cerca|vai)\b/i.test(name)) return false;
  return name.split(" ").filter(Boolean).length >= 2;
}

function addUnique(target: string[], values: readonly string[], limit: number): void {
  for (const value of values) {
    const clean = value.trim();
    if (clean && !target.some((item) => item.toLowerCase() === clean.toLowerCase())) target.push(clean);
    if (target.length >= limit) break;
  }
}

export function createAdaptiveResearchState(input: AdaptiveResearchDirectorInput): AdaptiveResearchState {
  const depth = resolveResearchDepth({ explicit: input.depth });
  return {
    targetName: input.targetName,
    targetType: input.targetType,
    country: input.country,
    relatedOrganizations: [...new Set(input.context.relatedOrganizations ?? [])].slice(0, 6),
    candidateDomains: [...new Set(input.context.candidateDomains ?? [])].slice(0, 8),
    discoveredPeople: [],
    followedPeople: [],
    followedDomains: [],
    completedActions: [],
    completedLanes: [],
    identityAssessment: "not_established",
    identityBasis: null,
    evidenceCount: 0,
    claimUrls: 0,
    noProgressPasses: 0,
    depth,
  };
}

/**
 * Selects one bounded next action from the current evidence state. The order is
 * intentionally gap-driven rather than a fixed provider ladder: a newly found
 * person or official domain changes the next action immediately.
 */
export function selectNextAdaptiveAction(
  state: AdaptiveResearchState,
  maxActions = ACTION_LIMIT,
): AdaptiveAction {
  const hasAction = (kind: AdaptiveActionKind) => state.completedActions.includes(kind);
  const hasLane = (lane: AIResearchLane) => state.completedLanes.includes(lane);
  const subject = state.targetName;
  const depth = state.depth;
  const noProgressLimit = depth.noProgressLimit;
  const maxPerson = depth.maxPersonFollowUps;
  const maxDomain = depth.maxDomainFollowUps;

  if (state.completedActions.length >= maxActions || state.noProgressPasses >= noProgressLimit) {
    return {
      kind: "stop_review",
      lane: null,
      subject,
      reason: state.noProgressPasses >= noProgressLimit
        ? "consecutive passes added no new research lead"
        : "adaptive action budget exhausted",
      signature: `stop:${state.completedActions.length}:${state.noProgressPasses}`,
    };
  }
  if (state.identityAssessment !== "confirmed" && !hasAction("resolve_identity")) {
    return {
      kind: "resolve_identity",
      lane: "official_records",
      subject,
      reason: "identity is not yet confirmed; establish exact target anchors before trusting people or routes",
      signature: `identity:${subject}`,
    };
  }
  if (state.relatedOrganizations.length > 0 && !hasAction("resolve_structure")) {
    return {
      kind: "resolve_structure",
      lane: "semantic_discovery",
      subject: state.relatedOrganizations[0]!,
      reason: "an operator, parent, or C/O lead exists and should be resolved before generic contact searching",
      signature: `structure:${state.relatedOrganizations[0]!.toLowerCase()}`,
    };
  }

  // Corporations/trusts without a known domain must discover the official website
  // before people-press noise (Campione: independent research found leadership on
  // the official domain; Atlas spent budget on unrelated org signals).
  const isOrg = state.targetType === "Corporation" || state.targetType === "Trust";
  if (
    isOrg &&
    state.candidateDomains.length === 0 &&
    !hasAction("official_routes") &&
    (state.identityAssessment === "confirmed" || hasAction("resolve_identity"))
  ) {
    return {
      kind: "official_routes",
      lane: "official_records",
      subject: state.targetName,
      reason:
        "no official domain known yet — discover the organization website and leadership/contact pages before people-press noise",
      signature: `official-discover:${state.targetName.toLowerCase()}`,
    };
  }

  const nextDomain = state.candidateDomains.find((d) => !state.followedDomains.includes(d));
  if (nextDomain && state.followedDomains.length < maxDomain) {
    return {
      kind: "official_routes",
      lane: "official_records",
      subject: nextDomain,
      reason: "candidate official domain available — fetch team, leadership, contact, and about pages",
      signature: `official:${nextDomain}`,
    };
  }
  if (state.candidateDomains.length > 0 && !hasAction("official_routes")) {
    return {
      kind: "official_routes",
      lane: "official_records",
      subject: state.candidateDomains[0]!,
      reason: "a candidate official domain is available; fetch its team, leadership, and contact routes",
      signature: `official:${state.candidateDomains.slice(0, 3).join(",")}`,
    };
  }

  const nextPerson = state.discoveredPeople.find((person) => !state.followedPeople.includes(person));
  if (nextPerson && state.followedPeople.length < maxPerson) {
    return {
      kind: "follow_person",
      lane: "people_press",
      subject: nextPerson,
      reason: "named person discovered — person-scoped press, bio, LinkedIn, and public contact search in target context",
      signature: `person:${nextPerson.toLowerCase()}`,
    };
  }
  if (state.discoveredPeople.length > 0 && state.candidateDomains.length > 0 && !hasAction("verify_exact_claim")) {
    return {
      kind: "verify_exact_claim",
      lane: "official_records",
      subject: state.discoveredPeople[0]!,
      reason: "a named person and official domain now exist; verify the role or route on an exact page",
      signature: `claim:${state.discoveredPeople[0]!.toLowerCase()}:${state.candidateDomains[0]}`,
    };
  }

  if ((state.discoveredPeople.length > 0 || state.candidateDomains.length > 0) && !hasLane("contact_routes")) {
    return {
      kind: "complementary_lane",
      lane: "contact_routes",
      subject,
      reason: "people or domains are on the case — prioritize public contact routes (email, phone, socials)",
      signature: "lane:contact_routes",
    };
  }

  const lanes: AIResearchLane[] = ["semantic_discovery", "people_press", "contact_routes", "official_records"];
  const missingLane = lanes.find((lane) => !hasLane(lane));
  if (missingLane) {
    return {
      kind: "complementary_lane",
      lane: missingLane,
      subject,
      reason: `the ${missingLane} evidence lane is still uncovered`,
      signature: `lane:${missingLane}`,
    };
  }
  return {
    kind: "stop_review",
    lane: null,
    subject,
    reason: "available lanes and follow-up leads are exhausted; retain the result for review",
    signature: `stop:complete:${state.completedActions.length}`,
  };
}

function providerForAction(action: AdaptiveAction): AdaptiveProviderResult["provider"] {
  if (action.lane === "official_records") return "tavily";
  if (action.lane === "semantic_discovery") return "exa";
  if (action.lane === "contact_routes") return "tavily";
  return "perplexity";
}

function looksLikeDomain(value: string): boolean {
  const v = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(v) && !/\s/.test(v);
}

function contextForAction(
  input: AdaptiveResearchDirectorInput,
  state: AdaptiveResearchState,
  action: AdaptiveAction,
): AIResearchContext {
  const isPersonFollowUp = action.kind === "follow_person" || action.kind === "verify_exact_claim";
  const isOfficialDomain = action.kind === "official_routes" && looksLikeDomain(action.subject);
  const domainFocus = isOfficialDomain
    ? action.subject.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    : null;
  return {
    ...input.context,
    lane: action.lane ?? "people_press",
    relatedOrganizations: [
      ...(input.context.relatedOrganizations ?? []),
      ...(isPersonFollowUp ? [input.targetName] : []),
    ].slice(0, 6),
    candidateDomains: domainFocus
      ? [domainFocus, ...state.candidateDomains.filter((d) => d !== domainFocus)].slice(0, 4)
      : state.candidateDomains.slice(0, 4),
    anchors: [
      ...(input.context.anchors ?? []),
      ...(isPersonFollowUp ? [`target relationship: ${input.targetName}`, `research subject: ${action.subject}`] : []),
      ...(domainFocus
        ? [
            `official domain: ${domainFocus}`,
            `fetch leadership team management about contact pages on ${domainFocus}`,
          ]
        : []),
    ].slice(0, 8),
    disambiguationNotes: [
      ...(input.context.disambiguationNotes ?? []),
      ...(isPersonFollowUp ? [`follow-up role/person lead: ${action.subject}`] : []),
      ...(domainFocus ? [`prefer primary pages on ${domainFocus} over press reprints`] : []),
    ].slice(0, 8),
  };
}

async function runProvider(
  provider: AdaptiveProviderResult["provider"],
  action: AdaptiveAction,
  input: AdaptiveResearchDirectorInput,
  state: AdaptiveResearchState,
): Promise<AIExtractResult> {
  const subject = action.kind === "follow_person" || action.kind === "verify_exact_claim"
    ? action.subject
    : input.targetName;
  const type = action.kind === "follow_person" || action.kind === "verify_exact_claim"
    ? "HNWI"
    : input.targetType;
  const context = contextForAction(input, state, action);
  if (provider === "tavily") return researchWithTavily(subject, type, input.country, context);
  if (provider === "exa") return researchWithExa(subject, type, input.country, context);
  return researchWithPerplexity(subject, type, input.country, context);
}



/**
 * Free Boss assignment — models reason over case state like a human researcher.
 * Tools are available capabilities, not a forced script ladder.
 * Mapping to AdaptiveAction is only for the existing executor; Boss is not
 * asked to pick from an enum menu.
 */
function mapBossToolToAction(
  tool: string,
  query: string,
  state: AdaptiveResearchState,
): AdaptiveAction | null {
  const q = (query || state.targetName).trim().slice(0, 200);
  if (!q) return null;
  const t = tool.toLowerCase().replace(/[\s-]+/g, "_");

  if (t === "stop" || t === "done" || t === "stop_review") {
    return {
      kind: "stop_review",
      lane: null,
      subject: state.targetName,
      reason: q || "Boss judged public surface sufficient or exhausted",
      signature: `stop:boss-free:${state.completedActions.length}:${q.slice(0, 40)}`,
    };
  }
  if (t.includes("person") || t.includes("people") || t === "follow_person" || t === "identify_people") {
    const person =
      state.discoveredPeople.find((p) => q.toLowerCase().includes(p.toLowerCase()))
      || (q !== state.targetName ? q : state.discoveredPeople[0])
      || q;
    return {
      kind: q === state.targetName || !state.discoveredPeople.length ? "identify_people" : "follow_person",
      lane: "people_press",
      subject: person,
      reason: q,
      signature: `person-free:${person.toLowerCase().slice(0, 80)}`,
    };
  }
  if (t.includes("domain") || t.includes("official") || t.includes("contact") || t.includes("website")) {
    const domain =
      state.candidateDomains.find((d) => q.toLowerCase().includes(d.toLowerCase()))
      || state.candidateDomains.find((d) => !state.followedDomains.includes(d))
      || q;
    return {
      kind: "official_routes",
      lane: "contact_routes",
      subject: domain,
      reason: q,
      signature: `official-free:${String(domain).toLowerCase().slice(0, 80)}`,
    };
  }
  if (t.includes("identity") || t.includes("registry") || t.includes("filing") || t.includes("structure")) {
    return {
      kind: t.includes("structure") ? "resolve_structure" : "resolve_identity",
      lane: t.includes("structure") ? "semantic_discovery" : "official_records",
      subject: state.relatedOrganizations[0] || state.targetName,
      reason: q,
      signature: `identity-free:${q.slice(0, 60).toLowerCase()}`,
    };
  }
  if (t.includes("verify") || t.includes("claim") || t.includes("source")) {
    return {
      kind: "verify_exact_claim",
      lane: "official_records",
      subject: q,
      reason: q,
      signature: `verify-free:${q.slice(0, 60).toLowerCase()}`,
    };
  }
  if (t.includes("exa") || t.includes("semantic") || t.includes("complement")) {
    return {
      kind: "complementary_lane",
      lane: "semantic_discovery",
      subject: q,
      reason: q,
      signature: `semantic-free:${q.slice(0, 60).toLowerCase()}`,
    };
  }
  // Default: broad research on the query (Tavily/Perplexity via identify_people or complementary)
  return {
    kind: "complementary_lane",
    lane: "semantic_discovery",
    subject: q,
    reason: q,
    signature: `free:${t}:${q.slice(0, 60).toLowerCase()}`,
  };
}

function parseFreeBossStep(
  raw: string,
  state: AdaptiveResearchState,
): AdaptiveAction | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const source = fenced || raw.trim();
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(source.slice(start, end + 1)) as Record<string, unknown>;
    const stop = parsed.stop === true || String(parsed.tool ?? "").toLowerCase() === "stop";
    const thought = typeof parsed.thought === "string" ? parsed.thought.trim().slice(0, 400) : "";
    const tool = typeof parsed.tool === "string" ? parsed.tool.trim() : stop ? "stop" : "";
    const query =
      (typeof parsed.query === "string" && parsed.query.trim())
      || (typeof parsed.subject === "string" && parsed.subject.trim())
      || (typeof parsed.focus === "string" && parsed.focus.trim())
      || "";
    if (stop) {
      return {
        kind: "stop_review",
        lane: null,
        subject: state.targetName,
        reason: thought || query || "Boss stopped",
        signature: `stop:boss-free:${state.completedActions.length}`,
      };
    }
    if (!tool && !query) return null;
    const action = mapBossToolToAction(tool || "search", query || state.targetName, state);
    if (!action) return null;
    return {
      ...action,
      reason: thought ? `${thought}${query ? ` → ${query}` : ""}`.slice(0, 280) : action.reason,
    };
  } catch {
    return null;
  }
}

/**
 * Let trained models research: free thought + tool + query.
 * Not an enum menu. Rules only if Boss and right-hand both fail to produce a step.
 */
async function selectNextAdaptiveActionWithBoss(
  state: AdaptiveResearchState,
  maxActions: number,
): Promise<{ action: AdaptiveAction; assignedBy: "gemini-boss" | "nvidia-right-hand" | "groq" | "rules" }> {
  if (state.completedActions.length >= maxActions || state.noProgressPasses >= state.depth.noProgressLimit) {
    return {
      action: selectNextAdaptiveAction(state, maxActions),
      assignedBy: "rules",
    };
  }

  const prompt = `You are the lead researcher for Apex Atlas — same job as a strong general agent, not a script.
Understand the target, decide what is still unknown, and choose the single highest-leverage next research move.
You have tools. You do NOT pick from a fixed investigation script. Reason freely.

TARGET: ${state.targetName}
TYPE: ${state.targetType}
COUNTRY: ${state.country ?? "unknown"}
IDENTITY SO FAR: ${state.identityAssessment ?? "unknown"} — ${state.identityBasis ?? "n/a"}
ALREADY DONE: ${state.completedActions.join(", ") || "nothing yet"}
LANES USED: ${state.completedLanes.join(", ") || "none"}
PEOPLE FOUND: ${state.discoveredPeople.slice(0, 10).join("; ") || "none yet"}
DOMAINS FOUND: ${state.candidateDomains.slice(0, 10).join("; ") || "none yet"}
RELATED ORGS: ${state.relatedOrganizations.slice(0, 8).join("; ") || "none"}
EVIDENCE SCORE: ${state.evidenceCount} · claim URLs: ${state.claimUrls} · empty passes: ${state.noProgressPasses}

AVAILABLE TOOLS (use any that fit):
- search_people — find officers, owners, executives, related persons
- search_official — company domain, contact pages, org phones/emails
- search_identity — registries, filings, exact legal identity
- search_structure — parent/operator/C/O relationships
- follow_person — dig a named person already in PEOPLE FOUND (or a clear new name)
- follow_domain — dig a domain already in DOMAINS FOUND
- verify_sources — re-check claim pages / citations
- semantic_search — broad/semantic web discovery (Exa-style)
- stop — only when public contact surface is recovered or clearly exhausted

Never invent emails, phones, or people. Prefer primary company pages and filings over aggregators.

Return ONLY JSON:
{
  "thought": "your reasoning about gaps and what a strong researcher would do next",
  "tool": "one tool name from the list",
  "query": "concrete search subject or query string",
  "stop": false
}`;

  // 1) Boss — free reasoning
  try {
    const { resolveGeminiBossModel, generateGeminiBossText } = await import("./case-bureau");
    const selection = await resolveGeminiBossModel();
    if (selection?.model) {
      const out = await generateGeminiBossText(selection, prompt);
      if (out.raw) {
        const choice = parseFreeBossStep(out.raw, state);
        if (choice) return { action: choice, assignedBy: "gemini-boss" };
      }
    }
  } catch {
    /* fall through */
  }

  // 2) Right-hand — same free brief
  try {
    const { runNvidiaNimFinalReview } = await import("./nvidia-nim-case-reasoning");
    const nv = await runNvidiaNimFinalReview(
      "You are the right-hand researcher advising Gemini Boss. Reason freely; choose the next tool and query.\n\n" + prompt,
    );
    if (nv.status === "completed" && nv.raw) {
      const choice = parseFreeBossStep(nv.raw, state);
      if (choice) return { action: choice, assignedBy: "nvidia-right-hand" };
    }
  } catch {
    /* fall through */
  }

  // 3) Groq free step — still model-led, not the rules ladder
  try {
    const keys = ["GROQ_API_KEY", ...Array.from({ length: 5 }, (_, i) => `GROQ_API_KEY_${i + 1}`)]
      .map((n) => process.env[n] ?? "")
      .filter((k) => k.length > 0);
    if (keys.length) {
      const { GROQ_CHAT_MODELS } = await import("./groq-models");
      outer: for (const key of keys) {
        for (const model of GROQ_CHAT_MODELS) {
          try {
            const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model,
                temperature: 0.3,
                max_tokens: 1024,
                response_format: { type: "json_object" },
                messages: [
                  {
                    role: "system",
                    content:
                      "You are a free web research director. Reply with ONE JSON object only: thought, tool, query, stop.",
                  },
                  { role: "user", content: prompt },
                ],
              }),
              signal: AbortSignal.timeout(35_000),
            });
            if (!resp.ok) continue;
            const data = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
            const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
            if (!raw) continue;
            const choice = parseFreeBossStep(raw, state);
            if (choice) return { action: choice, assignedBy: "groq" };
          } catch {
            continue;
          }
        }
      }
    }
  } catch {
    /* fall through */
  }

  // 4) True last resort — stop, do not run hard-coded research ladder
  return {
    action: {
      kind: "stop_review",
      lane: null,
      subject: state.targetName,
      reason: "Boss, right-hand, and Groq unavailable — stop rather than script research",
      signature: `stop:no-model:${state.completedActions.length}`,
    },
    assignedBy: "rules",
  };
}

export async function runAdaptiveResearchDirector(
  input: AdaptiveResearchDirectorInput,
): Promise<AdaptiveResearchDirectorResult> {
  const state = createAdaptiveResearchState(input);
  const actions: AdaptiveAction[] = [];
  const providerResults: AdaptiveProviderResult[] = [];
  const discoveredPeople: string[] = [];
  const candidateDomains = [...state.candidateDomains];
  const searchGaps: string[] = [];
  const negativeFindings: string[] = [];
  const seenSignatures = new Set<string>();
  const depth = state.depth;
  const budget = input.maxActions ?? depth.adaptiveMaxActions;
  const maxActions = Math.max(1, Math.min(budget, ABSOLUTE_ADAPTIVE_ACTION_CAP));

  for (;;) {
    const { action, assignedBy } = await selectNextAdaptiveActionWithBoss(state, maxActions);
    if (action.kind === "stop_review") {
      actions.push({
        ...action,
        reason: `${action.reason} [assigned:${assignedBy}]`,
      });
      break;
    }
    if (seenSignatures.has(action.signature)) {
      state.noProgressPasses++;
      if (state.noProgressPasses >= depth.noProgressLimit) break;
      continue;
    }
    seenSignatures.add(action.signature);
    actions.push({
      ...action,
      reason: `${action.reason} [assigned:${assignedBy}]`,
    });
    await input.onStep?.({
      action: { ...action, reason: `${action.reason} [assigned:${assignedBy}]` },
      status: "active",
    });

    const provider = providerForAction(action);
    let result: AIExtractResult;
    try {
      result = await runProvider(provider, action, input, state);
    } catch (error) {
      result = {
        source: "none",
        email: null, phone: null, linkedin: null, instagram: null, twitter: null,
        owners: [], ownerContacts: [], ownerResolutions: [], discoveryCandidates: [], ownershipSummary: null,
        ownershipSources: [], citations: [], negativeFindings: [],
        searchGaps: [error instanceof Error ? error.message : "provider call failed"],
      };
    }
    const beforePeople = discoveredPeople.length;
    const beforeDomains = candidateDomains.length;
    for (const owner of result.ownerResolutions ?? []) {
      if (usablePersonName(owner.name, input.targetName)) addUnique(discoveredPeople, [owner.name], 12);
    }
    for (const owner of result.ownerContacts ?? []) {
      if (usablePersonName(owner.name, input.targetName)) addUnique(discoveredPeople, [owner.name], 12);
    }
    for (const candidate of result.discoveryCandidates ?? []) {
      if (usablePersonName(candidate.name, input.targetName)) addUnique(discoveredPeople, [candidate.name], 12);
    }
    addUnique(candidateDomains, domainsFromResult(result), 12);
    addUnique(state.discoveredPeople, discoveredPeople.slice(beforePeople), 12);
    addUnique(state.candidateDomains, candidateDomains.slice(beforeDomains), 12);
    state.identityAssessment = result.identityAssessment ?? state.identityAssessment;
    state.identityBasis = result.identityBasis ?? state.identityBasis;
    state.evidenceCount += (result.citations?.length ?? 0)
      + (result.ownerResolutions?.length ?? 0)
      + (result.email ? 1 : 0)
      + (result.phone ? 1 : 0);
    state.claimUrls += result.citations?.length ?? 0;
    state.completedActions.push(action.kind);
    if (action.lane && !state.completedLanes.includes(action.lane)) state.completedLanes.push(action.lane);
    if (action.kind === "follow_person") state.followedPeople.push(action.subject);
    if (action.kind === "official_routes" && looksLikeDomain(action.subject)) {
      const domain = action.subject.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      if (!state.followedDomains.includes(domain)) state.followedDomains.push(domain);
    }
    for (const gap of result.searchGaps ?? []) if (!searchGaps.includes(gap)) searchGaps.push(gap);
    for (const finding of result.negativeFindings ?? []) if (!negativeFindings.includes(finding)) negativeFindings.push(finding);
    if (beforePeople === discoveredPeople.length && beforeDomains === candidateDomains.length && result.citations?.length === 0) {
      state.noProgressPasses++;
    } else {
      state.noProgressPasses = 0;
    }
    providerResults.push({ provider, action, result });
    await input.onStep?.({
      action,
      status: result.source === "none" ? "review" : "complete",
      summary: `${provider} · ${result.citations?.length ?? 0} citation(s) · ${result.ownerResolutions?.length ?? 0} named person lead(s)`,
    });
  }

  return {
    actions,
    providerResults,
    discoveredPeople: [...new Set(discoveredPeople)].slice(0, 12),
    candidateDomains: [...new Set(candidateDomains)].slice(0, 12),
    searchGaps: searchGaps.slice(0, 16),
    negativeFindings: negativeFindings.slice(0, 16),
    stoppedBecause: actions.at(-1)?.reason ?? "adaptive loop ended",
  };
}
