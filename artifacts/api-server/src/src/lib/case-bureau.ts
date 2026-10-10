import { GROQ_BOSS_MODEL_PENDING, getGroqBossLatencyConfig, getGroqBossStatus, resolveGroqBossModel, generateGroqBossText, formatGroqBossAttemptSummary } from "./groq-boss";
import type { Entity } from "@workspace/db";
import { apexOrientationCompact } from "./apex-bureau-orientation";
import { buildApexAtlasBossPlanPrompt } from "./case-bureau-prompt";
import { extractWalletSeedsFromText, buildWalletSeedPlan, formatWalletSeedPlanForPrompt, objectiveLooksWalletFirst } from "./wallet-seed";
import { getAvailableInvestigatorCapabilities, type InvestigatorCapability } from "./investigator-capability-registry";

/** Boss may proceed with an allowlisted action, reject the target, or reframe scope. */
export type BossPlanOutcome = "proceed" | "reject_target" | "reframe";

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

export type DiscoveryContactEvidence = {
  // Discovery is provider/model-selected and may surface new public route labels;
  // downstream persistence still validates scope, source URLs and promotion state.
  vectorType: string;
  value: string;
  // Provider/model discovery may carry additional review-only scope labels; promotion validates final scope.
  scope: string;
  personName: string | null;
  role: string | null;
  sourceUrls: string[];
  // Provider-originated evidence may omit a note.
  note: string | null | undefined;
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
  rightHandAdvice?: {
    provider: "groq";
    model: string;
    status: "completed" | "unavailable";
    actionId: string | null;
    decision: string | null;
    reason: string | null;
    confidence: number | null;
    error: string | null;
    createdAt: string;
  };
  bossPlan?: {
    provider: "groq";
    model: string;
    status: "completed" | "unavailable";
    outcome?: BossPlanOutcome;
    actionId: string | null;
    decision: string | null;
    reason: string | null;
    investigatorPrompt: string | null;
    investigatorLlm?: InvestigatorCapability | null;
    restrictions: string[];
    tools: string[];
    evidenceRequirements: string[];
    confidence: number | null;
    progressAssessment?: string | null;
    reprioritize?: string[];
    suggestedScope?: string | null;
    rightHandDisposition?: "accept" | "override" | "unknown";
    rightHandNote?: string | null;
    error: string | null;
    createdAt: string;
  };
  nextBestAction: BureauAction | null;
  lastUpdatedBy: string;
  /** Phase 2: mandatory contact-vector progress map */
  investigationProgress?: import("./investigation-progress").InvestigationProgress;
  researchDepth?: import("./research-depth").ResearchDepth;
  /** Consecutive advances with no increase in foundAnyCount */
  noProgressStreak?: number;
};

export type DiscoveryCaseFile = {

  version: 3;
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
    status: "ready" | "waiting_for_boss" | "waiting_for_gemini" | "waiting_for_provider";
  };
  initialResearch: {
    status: "not_started" | "recorded" | "reviewed";
    researchResponse: string | null;
    bossCommentary: string | null;
    sourceUrls: string[];
    recordedAt: string | null;
  };
  investigatorReports: Array<{
    id: string;
    lane: "groq-boss" | "gemini-boss" | "groq-right-hand" | "groq-web" | "broad-web" | "registry";
    provider: string;
    status: "completed" | "unavailable" | "failed";
    iteration: number;
    summary: string;
    findings: string[];
    candidateNames: string[];
    sourceUrls: string[];
    nextQuestions: string[];
    contactEvidence?: DiscoveryContactEvidence[];
    error: string | null;
    createdAt: string;
  }>;
  currentProgress: {
    reportCount: number;
    completedLanes: string[];
    openQuestions: string[];
    lastReviewedBy: string | null;
    refreshedAt: string | null;
  };
  nextInvestigation?: {
    rightHand: {
      status: "completed" | "unavailable";
      decision: string | null;
      reason: string | null;
      focusLanes: string[];
      confidence: number | null;
      error: string | null;
      reviewedAt: string;
    } | null;
    boss: {
      status: "completed" | "unavailable";
      decision: string | null;
      candidateNames: string[];
      nextDirections: string[];
      uncertainties: string[];
      error: string | null;
      reviewedAt: string;
    } | null;
  };
  rightHandAdvice?: {
    provider: "groq";
    model: string;
    status: "completed" | "unavailable";
    decision: string | null;
    reason: string | null;
    focusLanes: string[];
    confidence: number | null;
    error: string | null;
    createdAt: string;
  };
  discoveredCandidates: Array<{
    name: string;
    type: string;
    relevance: string;
    reachability: string;
    sourceUrls: string[];
    contactEvidence?: DiscoveryContactEvidence[];
    state: "review_only";
    admittedEntityId?: number | null;
  }>;
  /** GHOST-style person↔org graph for the review deck (evidence-backed only). */
  entityLinks?: Array<{
    from: string;
    to: string;
    relation: string;
    evidence: string[];
  }>;
  /** Org-footprint recovery status after discovery lanes (evidence-led, not a script). */
  orgFootprint?: {
    website: boolean;
    orgPhone: boolean;
    orgEmail: boolean;
    address: boolean;
    relatedOfficers: boolean;
    registryMention: boolean;
    notes: string[];
  };
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
 * Boss compatibility surface. The canonical Boss transport is Groq GPT-OSS;
 * these legacy names are retained only so the established Bureau call graph stays stable.
 */
export const GEMINI_BOSS_MODEL_PENDING = GROQ_BOSS_MODEL_PENDING;
export type GeminiBossModelSelection = import("./groq-boss").GroqBossModelSelection;
export type GeminiBossAttemptDiagnostic = import("./groq-boss").GroqBossAttemptDiagnostic;
export function formatGeminiBossAttemptSummary(attempts: GeminiBossAttemptDiagnostic[]): string { return formatGroqBossAttemptSummary(attempts); }
export type GeminiBossDiscoveryResult = {
  status: "completed" | "pending" | "unavailable";
  model: string;
  investigatorLlm: InvestigatorCapability | null;
  report: string | null;
  candidates: Array<{
    name: string;
    type?: string;
    relevance?: string;
    reachability?: string;
    sourceUrls?: string[];
    contactEvidence?: DiscoveryContactEvidence[];
  }>;
  citations: string[];
  nextDirections: string[];
  uncertainties: string[];
  error: string | null;
};
export type DiscoveryInvestigatorReport = DiscoveryCaseFile["investigatorReports"][number];
export type GeminiBossPlanResult = {
  status: "completed" | "unavailable";
  model: string;
  outcome: BossPlanOutcome;
  actionId: string | null;
  decision: string | null;
  reason: string | null;
  investigatorPrompt: string | null;
  investigatorLlm: InvestigatorCapability | null;
  restrictions: string[];
  tools: string[];
  evidenceRequirements: string[];
  confidence: number | null;
  suggestedScope: string | null;
  progressAssessment: string | null;
  reprioritize: string[];
  rightHandDisposition: "accept" | "override" | "unknown";
  rightHandNote: string | null;
  error: string | null;
};
export type GeminiBossStatus = {
  configured: boolean;
  model: string;
  role: "head_investigator";
  capability: "text_generation_and_case_planning";
  webSearchGrounding: false;
  provider?: "groq";
};
export type GeminiBossLatencyConfig = {
  requestTimeoutMs: number;
  overallTimeoutMs: number;
  minimumOverallTimeoutMs: number;
  overallTimeoutClamped: boolean;
};

export function getGeminiBossLatencyConfig(): GeminiBossLatencyConfig {
  const config = getGroqBossLatencyConfig();
  return {
    requestTimeoutMs: config.requestTimeoutMs,
    overallTimeoutMs: config.overallTimeoutMs,
    minimumOverallTimeoutMs: 30_000,
    overallTimeoutClamped: false,
  };
}

export async function generateGeminiBossText(
  selection: GeminiBossModelSelection,
  prompt: string,
  options?: {
    responseFormat?: Record<string, unknown>;
    maxOutputTokens?: number;
    thinkingLevel?: "minimal" | "low" | "medium" | "high";
  },
): Promise<import("./groq-boss").GroqBossTextGenerationResult> {
  return generateGroqBossText(selection, prompt, options);
}

export async function getGeminiBossStatus(): Promise<GeminiBossStatus> {
  const status = getGroqBossStatus();
  return { ...status };
}

export async function resolveGeminiBossModel(preferredKeyName?: string): Promise<GeminiBossModelSelection> {
  return resolveGroqBossModel(preferredKeyName);
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

function buildBossPlanResponseFormat(availableInvestigators: readonly InvestigatorCapability[]): Record<string, unknown> {
  return {
    type: "text", mime_type: "application/json",
    schema: {
      type: "object",
      properties: {
        outcome: { type: "string", enum: ["proceed", "reject_target", "reframe"] },
        actionId: { type: ["string", "null"] }, decision: { type: "string" }, reason: { type: "string" },
        investigatorPrompt: { type: ["string", "null"] }, investigatorLlm: { type: ["string", "null"], enum: [null, ...availableInvestigators] },
        restrictions: { type: "array", items: { type: "string" } }, tools: { type: "array", items: { type: "string" } },
        evidenceRequirements: { type: "array", items: { type: "string" } }, confidence: { type: ["number", "null"] },
        progressAssessment: { type: ["string", "null"] }, reprioritize: { type: "array", items: { type: "string" } },
        suggestedScope: { type: ["string", "null"] }, rightHandDisposition: { type: ["string", "null"] }, rightHandNote: { type: ["string", "null"] },
      },
      required: ["outcome","actionId","decision","reason","investigatorPrompt","investigatorLlm","restrictions","tools","evidenceRequirements","confidence","progressAssessment","reprioritize","suggestedScope","rightHandDisposition","rightHandNote"],
      additionalProperties: false,
    },
  };
}

function buildBossDiscoveryResponseFormat(availableInvestigators: readonly InvestigatorCapability[]): Record<string, unknown> {
  return {
    type: "text", mime_type: "application/json",
    schema: {
      type: "object",
      properties: {
        report: { type: "string" },
        investigatorLlm: { type: "string", enum: [...availableInvestigators] },
        candidates: {
          type: "array", maxItems: 6,
          items: {
            type: "object",
            properties: {
              name: { type: "string" }, type: { type: "string" }, relevance: { type: "string" }, reachability: { type: "string" },
              sourceUrls: { type: "array", items: { type: "string" }, maxItems: 8 },
              contactEvidence: { type: "array", maxItems: 8, items: {
                type: "object",
                properties: { vectorType: { type: "string" }, value: { type: "string" }, scope: { type: "string", enum: ["person","organization","unknown"] }, personName: { type: ["string","null"] }, role: { type: ["string","null"] }, sourceUrls: { type: "array", items: { type: "string" }, maxItems: 6 }, note: { type: ["string","null"] } },
                required: ["vectorType","value","scope","personName","role","sourceUrls","note"], additionalProperties: false,
              } },
            },
            required: ["name","type","relevance","reachability","sourceUrls","contactEvidence"], additionalProperties: false,
          },
        },
        nextDirections: { type: "array", items: { type: "string" }, maxItems: 8 }, uncertainties: { type: "array", items: { type: "string" }, maxItems: 8 },
      },
      required: ["report","investigatorLlm","candidates","nextDirections","uncertainties"], additionalProperties: false,
    },
  };
}

function parseBossDiscoveryResponse(raw: string, allowedInvestigators: readonly InvestigatorCapability[] = getAvailableInvestigatorCapabilities()): {
  report: string;
  candidates: GeminiBossDiscoveryResult["candidates"];
  investigatorLlm: InvestigatorCapability | null;
  nextDirections: string[];
  uncertainties: string[];
} {
  const json = extractJsonObject(raw);
  if (!json) return { report: "", candidates: [], investigatorLlm: null, nextDirections: [], uncertainties: [] };
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { report: "", candidates: [], investigatorLlm: null, nextDirections: [], uncertainties: [] };
    }
    const object = parsed as Record<string, unknown>;
    const allowed = new Set(["report", "investigatorLlm", "candidates", "nextDirections", "uncertainties"]);
    const required = [...allowed];
    if (Object.keys(object).some((key) => !allowed.has(key)) || required.some((key) => !Object.prototype.hasOwnProperty.call(object, key))) {
      return { report: "", candidates: [], investigatorLlm: null, nextDirections: [], uncertainties: [] };
    }
    const report = typeof object.report === "string" ? object.report.trim() : "";
    const available = allowedInvestigators;
    const investigatorLlm = typeof object.investigatorLlm === "string" && available.includes(object.investigatorLlm as InvestigatorCapability) ? object.investigatorLlm as InvestigatorCapability : null;
    const nextDirections = Array.isArray(object.nextDirections) && object.nextDirections.length <= 8 && object.nextDirections.every((value) => typeof value === "string" && value.trim())
      ? uniqueStrings(object.nextDirections, 8)
      : null;
    const uncertainties = Array.isArray(object.uncertainties) && object.uncertainties.length <= 8 && object.uncertainties.every((value) => typeof value === "string" && value.trim())
      ? uniqueStrings(object.uncertainties, 8)
      : null;
    if (!report || !investigatorLlm || !nextDirections || !uncertainties) {
      return { report: "", candidates: [], investigatorLlm: null, nextDirections: [], uncertainties: [] };
    }

    if (!Array.isArray(object.candidates) || object.candidates.length > 6) {
      return { report: "", candidates: [], investigatorLlm: null, nextDirections: [], uncertainties: [] };
    }
    const candidates = object.candidates.flatMap((candidateValue) => {
      if (!candidateValue || typeof candidateValue !== "object" || Array.isArray(candidateValue)) return [];
      const candidate = candidateValue as Record<string, unknown>;
      const candidateKeys = ["name", "type", "relevance", "reachability", "sourceUrls", "contactEvidence"];
      const candidateAllowed = new Set(candidateKeys);
      if (Object.keys(candidate).some((key) => !candidateAllowed.has(key)) || candidateKeys.some((key) => !Object.prototype.hasOwnProperty.call(candidate, key))) return [];
      const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
      const type = typeof candidate.type === "string" ? candidate.type.trim() : "";
      const relevance = typeof candidate.relevance === "string" ? candidate.relevance.trim() : "";
      const reachability = typeof candidate.reachability === "string" ? candidate.reachability.trim() : "";
      const sourceUrls = Array.isArray(candidate.sourceUrls) && candidate.sourceUrls.length <= 8 && candidate.sourceUrls.every((url) => typeof url === "string" && /^https?:\/\//i.test(url))
        ? candidate.sourceUrls as string[]
        : null;
      const contactEvidence = parseDiscoveryContactEvidenceStrict(candidate.contactEvidence);
      if (name.length < 3 || !type || !relevance || !reachability || !sourceUrls || !contactEvidence) return [];
      return [{ name, type, relevance, reachability, sourceUrls, contactEvidence }];
    });
    if (candidates.length !== object.candidates.length) {
      return { report: "", candidates: [], investigatorLlm: null, nextDirections: [], uncertainties: [] };
    }
    return { report, candidates, investigatorLlm, nextDirections, uncertainties };
  } catch {
    return { report: "", candidates: [], investigatorLlm: null, nextDirections: [], uncertainties: [] };
  }
}

function parseDiscoveryContactEvidenceStrict(value: unknown): DiscoveryContactEvidence[] | null {
  if (!Array.isArray(value) || value.length > 8) return null;
  const allowed = new Set(["vectorType", "value", "scope", "personName", "role", "sourceUrls", "note"]);
  const validVectors = new Set<DiscoveryContactEvidence["vectorType"]>([
    "email", "phone", "linkedin", "twitter", "instagram", "telegram", "website", "organization_contact", "other",
  ]);
  const evidence = value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const required = ["vectorType", "value", "scope", "personName", "role", "sourceUrls", "note"];
    if (Object.keys(record).some((key) => !allowed.has(key)) || required.some((key) => !Object.prototype.hasOwnProperty.call(record, key))) return [];
    const valueText = typeof record.value === "string" ? record.value.trim() : "";
    const vectorType = typeof record.vectorType === "string" && validVectors.has(record.vectorType as DiscoveryContactEvidence["vectorType"])
      ? record.vectorType as DiscoveryContactEvidence["vectorType"]
      : null;
    const scope = record.scope === "person" || record.scope === "organization" || record.scope === "unknown" ? record.scope : null;
    const personName = record.personName === null ? null : typeof record.personName === "string" && record.personName.trim() ? record.personName.trim().slice(0, 200) : null;
    const role = record.role === null ? null : typeof record.role === "string" && record.role.trim() ? record.role.trim().slice(0, 200) : null;
    const sourceUrls = Array.isArray(record.sourceUrls) && record.sourceUrls.length <= 6 && record.sourceUrls.every((url) => typeof url === "string" && /^https?:\/\//i.test(url))
      ? record.sourceUrls as string[]
      : null;
    const note = record.note === null ? null : typeof record.note === "string" && record.note.trim() ? record.note.trim().slice(0, 500) : null;
    if (!valueText || !vectorType || !scope || !sourceUrls || note === undefined) return [];
    return [{ vectorType, value: valueText.slice(0, 500), scope, personName, role, sourceUrls, note }];
  });
  return evidence.length === value.length ? evidence : null;
}


/**
 * Opening Boss request for a discovery case. This is deliberately separate
 * from target-scoped extraction: the mission is the subject, while separate
 * search-capable investigators supply web context and all returned people remain review-only.
 */
export async function runGroqBossDiscovery(input: {
  file?: DiscoveryCaseFile;
  objective: string;
  motivation: string;
  geography?: string;
  exclusions?: string[];
  rightHandAdvice?: {
    status: "completed" | "unavailable";
    model: string;
    decision: string | null;
    reason: string | null;
    focusLanes: string[];
    confidence: number | null;
    error: string | null;
  };
  startingLane?: string;
  /** Investigator capabilities that are unavailable for this Boss decision (for example, an explicitly exhausted request quota). */
  excludedInvestigatorLlm?: readonly InvestigatorCapability[];
}): Promise<GeminiBossDiscoveryResult> {
  const selection = await resolveGeminiBossModel();
  if (selection.status !== "resolved") {
    return {
      status: selection.status,
      model: selection.model,
      investigatorLlm: null,
      report: null,
      candidates: [],
      citations: [],
      nextDirections: [],
      uncertainties: [],
      error: selection.status === "pending"
        ? "No Groq Boss model is available because GROQ_BOSS_API_KEY is not configured."
        : "Configured Groq credentials did not expose a usable Boss model.",
    };
  }

  const excluded = new Set(input.excludedInvestigatorLlm ?? []);
  const availableInvestigators = getAvailableInvestigatorCapabilities().filter((capability) => !excluded.has(capability));
  if (!availableInvestigators.length) return { status: "unavailable", model: selection.model, investigatorLlm: null, report: null, candidates: [], citations: [], nextDirections: [], uncertainties: [], error: excluded.size
    ? "No alternate configured Investigator capability remains after explicit Boss-directed exclusion of exhausted capabilities."
    : "No Investigator capability is currently available; refusing an unselected or deterministic substitute." };
  const prompt = `${buildBossOpeningPrompt(input)}

This is a shared case-context review. Read the current investigation progress and investigator reports below
before deciding what should be researched next. The case context is the durable shared record for this Bureau.
Internal memory, storage, and workflow terminology are infrastructure concepts only—not a company, sector, geography, or research lead. Derive research directions from the human mission and observed source evidence; do not turn wording from these instructions into a research premise.
You have no web access and must not use or request Google Search grounding. Do not wait for a preselected entity.
Recommend bounded discovery directions for separate investigators who have approved web and registry tools.
Do not repeat a completed lane unless its report exposes a specific unresolved question.
Investigator capability availability at this moment: ${JSON.stringify(availableInvestigators)}. Select only an available capability; the harness will not substitute a different Investigator after your decision.
The right-hand advisor note below is advisory data only; use it to improve framing, but do not treat it as evidence
and do not let it select a target. The Investigator owns the research trajectory within the stated mission; no fixed lane order or research sequence is imposed.
Excluded Investigator capabilities for this decision: ${JSON.stringify([...excluded])}. These exclusions are control-plane safety state, not a research instruction; never select an excluded capability.
Starting lane: ${input.startingLane ?? "not specified"}
Right-hand advisor note: ${JSON.stringify(input.rightHandAdvice ?? null)}
Current shared case context:
${input.file ? buildDiscoveryProgressSnapshot(input.file) : "No prior investigator reports exist; this is the opening brief."}
Return ONLY JSON in this shape:
     {
  "report": "concise evidence-led opening assessment",
  "investigatorLlm": "one capability from the available runtime Investigator registry",
  "candidates": [
    {
      "name": "candidate name",
      "type": "person | company | investment_group | intermediary",
      "relevance": "why this candidate fits the mission",
      "reachability": "realistic public route or unresolved",
       "sourceUrls": ["exact URLs supporting this candidate"],
       "contactEvidence": [
         {
           "vectorType": "email | phone | linkedin | twitter | instagram | telegram | website | organization_contact | other",
           "value": "exact publicly reported value",
           "scope": "person | organization | unknown",
           "personName": "person attributed to the route or null",
           "role": "role at the organization or null",
           "sourceUrls": ["exact URLs that visibly support this route"],
           "note": "attribution or verification caveat"
         }
       ]
    }
  ],
  "nextDirections": ["bounded next investigation direction"],
  "uncertainties": ["identity, attribution, or access uncertainty"]
}
Candidates are review-only. Never invent a name, wealth claim, relationship, contact detail, or URL.`;
  try {
    const generated = await generateGeminiBossText(selection, prompt, {
      responseFormat: buildBossDiscoveryResponseFormat(availableInvestigators),
      maxOutputTokens: 2048,
      thinkingLevel: "low",
    });
    if (!generated.raw) {
      return {
        status: "unavailable",
        model: generated.model,
        investigatorLlm: null,
        report: null,
        candidates: [],
        citations: [],
        nextDirections: [],
        uncertainties: [],
        error: generated.error ?? "Groq Boss text generation returned no text for the discovery brief.",
      };
    }
    const parsed = parseBossDiscoveryResponse(generated.raw, availableInvestigators);
    if (!parsed.investigatorLlm || !availableInvestigators.includes(parsed.investigatorLlm)) {
      return {
        status: "unavailable",
        model: generated.model,
        investigatorLlm: null,
        report: parsed.report || generated.raw,
        candidates: parsed.candidates,
        citations: [],
        nextDirections: parsed.nextDirections,
        uncertainties: parsed.uncertainties,
        error: "Groq Boss selected an Investigator capability that is not currently configured; no deterministic substitution is permitted.",
      };
    }
    return {
      status: "completed",
      model: generated.model,
      investigatorLlm: parsed.investigatorLlm,
      report: parsed.report || generated.raw,
      candidates: parsed.candidates,
      citations: [],
      nextDirections: parsed.nextDirections,
      uncertainties: parsed.uncertainties,
      error: null,
    };
  } catch (error) {
    return {
      status: "unavailable",
      model: selection.model,
      investigatorLlm: null,
      report: null,
      candidates: [],
      citations: [],
      nextDirections: [],
      uncertainties: [],
      error: error instanceof Error ? error.message : "Groq Boss discovery failed.",
    };
  }
}

function parseBossPlanResponse(raw: string, queuedActions: BureauAction[]): Omit<GeminiBossPlanResult, "status" | "model" | "error"> | null {
  const json = extractJsonObject(raw);
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const rawOutcome = typeof parsed.outcome === "string" ? parsed.outcome.trim() : "proceed";
    const outcome: BossPlanOutcome =
      rawOutcome === "reject_target" || rawOutcome === "reframe" || rawOutcome === "proceed"
        ? rawOutcome
        : "proceed";
    const decision = typeof parsed.decision === "string" ? parsed.decision.trim() : "";
    const reason = typeof parsed.reason === "string" ? parsed.reason.trim() : "";
    const rawConfidence = typeof parsed.confidence === "number" ? parsed.confidence : null;
    const confidence = rawConfidence === null ? null : Math.max(0, Math.min(1, rawConfidence));
    const suggestedScope =
      typeof parsed.suggestedScope === "string" && parsed.suggestedScope.trim().length > 0
        ? parsed.suggestedScope.trim().slice(0, 500)
        : null;
    const progressAssessment =
      typeof parsed.progressAssessment === "string" && parsed.progressAssessment.trim().length > 0
        ? parsed.progressAssessment.trim().slice(0, 1200)
        : null;
    const allowedIds = new Set(queuedActions.map((a) => a.id));
    const reprioritize = Array.isArray(parsed.reprioritize)
      ? [...new Set(
          parsed.reprioritize
            .filter((id): id is string => typeof id === "string" && allowedIds.has(id.trim()))
            .map((id) => id.trim()),
        )]
      : [];

    // Phase 1: Boss may reject or reframe without selecting an action.
    const rawDisp = typeof parsed.rightHandDisposition === "string" ? parsed.rightHandDisposition.trim().toLowerCase() : "";
    const rightHandDisposition: "accept" | "override" | "unknown" =
      rawDisp === "accept" || rawDisp === "override" ? rawDisp : "unknown";
    const rightHandNote =
      typeof parsed.rightHandNote === "string" && parsed.rightHandNote.trim().length > 0
        ? parsed.rightHandNote.trim().slice(0, 400)
        : null;

    if (outcome === "reject_target" || outcome === "reframe") {
      if (!decision || !reason) return null;
      return {
        outcome,
        actionId: null,
        decision: decision.slice(0, 500),
        reason: reason.slice(0, 700),
        investigatorPrompt: null,
        investigatorLlm: null,
        restrictions: [],
        tools: [],
        evidenceRequirements: [],
        confidence,
        suggestedScope: outcome === "reframe" ? suggestedScope : null,
        progressAssessment,
        reprioritize: [],
        rightHandDisposition,
        rightHandNote,
      };
    }

    const actionId = typeof parsed.actionId === "string" ? parsed.actionId.trim() : "";
    const action = queuedActions.find((candidate) => candidate.id === actionId);
    if (!action) return null;
    const rawInvestigatorLlm = typeof parsed.investigatorLlm === "string" ? parsed.investigatorLlm.trim().toLowerCase() : "";
    const availableInvestigators = getAvailableInvestigatorCapabilities();
    const investigatorLlm: InvestigatorCapability | null =
      availableInvestigators.includes(rawInvestigatorLlm as InvestigatorCapability)
        ? rawInvestigatorLlm as InvestigatorCapability
        : null;
    const investigatorPrompt = typeof parsed.investigatorPrompt === "string" ? parsed.investigatorPrompt.trim() : "";
    if (!decision || !reason || investigatorPrompt.length < 20 || !investigatorLlm) return null;
    // Soft-require progress judgment; if missing, synthesize from reason so control loop stays live.
    const assessed =
      progressAssessment ??
      `Selected ${action.id}: ${reason.slice(0, 400)}`;
    const tools = Array.isArray(parsed.tools)
      ? parsed.tools.filter((tool): tool is string => typeof tool === "string" && action.tools.includes(tool))
      : [];
    const restrictions = Array.isArray(parsed.restrictions)
      ? parsed.restrictions.filter((value): value is string => typeof value === "string" && value.trim().length > 0).map((value) => value.trim())
      : [];
    const evidenceRequirements = Array.isArray(parsed.evidenceRequirements)
      ? parsed.evidenceRequirements.filter((value): value is string => typeof value === "string" && value.trim().length > 0).map((value) => value.trim()).slice(0, 10)
      : [];
    if (tools.length === 0 || restrictions.length === 0 || evidenceRequirements.length === 0) return null;
    // Soft coordination: if disposition missing, infer accept when action matches
    // a known right-hand preference encoded in reason; else unknown (do not fail plan).
    const dispositionNote =
      rightHandNote ??
      (rightHandDisposition === "override"
        ? `Override: selected ${action.id} over right-hand advisory`
        : rightHandDisposition === "accept"
          ? `Accept: aligned with right-hand on ${action.id}`
          : null);

    return {
      outcome: "proceed",
      actionId: action.id,
      decision: decision.slice(0, 500),
      reason: reason.slice(0, 700),
      investigatorPrompt: investigatorPrompt.slice(0, 4000),
      investigatorLlm,
      restrictions: restrictions.map((value) => value.slice(0, 300)),
      tools,
      evidenceRequirements: evidenceRequirements.map((value) => value.slice(0, 300)),
      confidence,
      suggestedScope: null,
      progressAssessment: assessed,
      // Do not include the selected action in remaining reorder list.
      reprioritize: reprioritize.filter((id) => id !== action.id),
      rightHandDisposition,
      rightHandNote: dispositionNote,
    };
  } catch {
    return null;
  }
}


function buildGeminiBossPlanPrompt(input: {
  file: ResearchCaseFile;
  rightHandAdvice: ResearchCaseFile["rightHandAdvice"];
  iteration: number;
}): string {
  // Progress-aware Apex Atlas Boss prompt: allowlist only, creative investigator contract,
  // mandatory progress judgment in/out, optional reprioritize among queued actions.
  return buildApexAtlasBossPlanPrompt({
    iteration: input.iteration,
    rightHandAdvice: input.rightHandAdvice,
    file: input.file,
  });
}


/** Compatibility export only; canonical runtime identity is Groq Boss. */
export const runGeminiBossDiscovery = runGroqBossDiscovery;

export async function runGeminiBossPlan(input: {
  file: ResearchCaseFile;
  rightHandAdvice: ResearchCaseFile["rightHandAdvice"];
  iteration: number;
}): Promise<GeminiBossPlanResult> {
  const selection = await resolveGeminiBossModel();
  const unavailable = (error: string): GeminiBossPlanResult => ({
    status: "unavailable",
    model: selection.model,
    outcome: "proceed",
    actionId: null,
    decision: null,
    reason: null,
    investigatorPrompt: null,
    investigatorLlm: null,
    restrictions: [],
    tools: [],
    evidenceRequirements: [],
    confidence: null,
    suggestedScope: null,
    progressAssessment: null,
    reprioritize: [],
    rightHandDisposition: "unknown",
    rightHandNote: null,
    error,
  });
  if (selection.status !== "resolved") {

    return unavailable(selection.status === "pending"
      ? "No Groq Boss model is available because GROQ_BOSS_API_KEY is not configured."
      : "Configured Groq credentials did not expose a usable Boss text model.");
  }
  const queuedActions = input.file.actionQueue.filter((action) => action.status === "queued");
  if (queuedActions.length === 0) return unavailable("The case file has no queued actions.");
  try {
    const planPrompt = buildGeminiBossPlanPrompt(input);
    const generated = await generateGeminiBossText(selection, planPrompt, { responseFormat: buildBossPlanResponseFormat(getAvailableInvestigatorCapabilities()), maxOutputTokens: 1536, thinkingLevel: "minimal" });
    if (!generated.raw) return unavailable(generated.error ?? "Boss plan text generation returned no text.");
    const parsed = parseBossPlanResponse(generated.raw, queuedActions);
    return parsed
      ? { status: "completed", model: generated.model, ...parsed, error: null }
      : unavailable("Boss returned an invalid or unsafe investigator plan.");
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : "Boss planning failed.");
  }
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
    tools: ["web-search:serper", "web-search:tavily", "web-search:exa", "page-fetch", "registry-client"],
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
  const objective = input.objective.trim();
  // Named person + company already supplied → target-locked mode (parity with general agents).
  // Match "First Last / Firm", "First Last at Firm", firm suffixes including Capital/Partners/Foundation.
  const namedTarget =
    /\b(for|about|on|regarding)\s+[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+\b/.test(objective) ||
    /\b[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,3}\b.+\b(Company|Co\.?|Corp\.?|Inc\.?|LLC|LLP|Manufacturing|Holdings|Capital|Partners|Foundation|Group|Advisors?|Management|Investments?)\b/i.test(objective) ||
    /\b[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,3}\s*[\/—–-]\s*[A-Z][A-Za-z0-9&.' -]{2,60}/.test(objective) ||
    /\b(Andrew|John|Mark|David|Michael|Robert|James|William|Thomas|Richard|Katherine|Catherine|Elizabeth|Sarah|Jennifer|Mary|Susan|Patricia|Linda|Barbara|Margaret|Jessica)\s+[A-Z]\.?\s*[A-Z][a-z]+\b/.test(objective);

  if (namedTarget) {
    return `${apexOrientationCompact("boss")}

---

You are the Boss Investigator opening a TARGET-LOCKED public-web research case.

Human mission:
${objective}

Why this matters:
${input.motivation.trim()}

Geographic premise:
${geography}

A specific person and/or company is already named. Do NOT expand into unrelated family offices, random PE firms, or fame-only candidates. Recover the public contact and related surface for the NAMED subject at least as thoroughly as a capable general agent would on the same lead.

Goals (not a forced execution order): identity and role anchors; company website/contact surface; org phone and public org inboxes; officers/related people from primary pages or registries; exact source URLs on every contact claim; honest gaps and name collisions.

Guardrails:
${exclusions.map((rule) => `- ${rule}`).join("\n")}

Return a structured research report with:
- the named person and company with confirmed public identity anchors
- role history and related officers / co-filers
- practical public contact routes (org phone, address, email, website) with exact source URLs
- related-person surface from filings when present
- unresolved identity questions and search gaps
- strongest next research directions

Do not invent contacts. Do not dilute the named target with unrelated discovery noise.`;
  }

  return `${apexOrientationCompact("boss")}

---

You are the Boss Investigator opening a new discovery-first public-web research case.

Human mission:
${objective}

Why this matters:
${input.motivation.trim()}

Geographic premise:
${geography}

Research broadly and begin with discovery. Do not assume a target company or person in advance. Look for real companies, founders, investors, family offices, investment groups, business owners, operators, advisors, portfolio relationships, and other plausible routes that could lead to a useful investor conversation.

The goal is practical proximity to a real decision-maker, not fame alone. Evaluate plausible routes using the evidence currently available, their relevance to the mission, identity/attribution strength, and practical reachability. Do not impose a category order or predetermined research path. Search public web sources only and preserve exact source URLs and what each source proves.

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
  const walletSeeds = extractWalletSeedsFromText(`${objective}\n${motivation}`);
  const walletFirst = walletSeeds.length > 0 || objectiveLooksWalletFirst(objective);
  const walletPlanText = walletSeeds[0]
    ? formatWalletSeedPlanForPrompt(buildWalletSeedPlan(walletSeeds[0], { geography }))
    : null;
  const bossPremise = walletFirst
    ? (
        walletPlanText
          ? `Wallet-first discovery.\n${walletPlanText}\nAfter holder attribution, maximize people-contacts. Fail-closed. After person lock, recover public people-contacts with exact source URLs.`
          : "Wallet-first discovery. Attribute any crypto-wallet holder from public sources before contact hops. Reject exchange/mixer/treasuries. Never invent holder or contacts. After attribution, recover public people-contacts with exact source URLs."
      )
    : "Start broad. Discover realistic public-world investor routes before resolving any one target in depth. " +
      "Company-first public surface: recover org contact routes and related people from primary sources with exact URLs. Never invent contacts. Never mark org inboxes Personal.";
  return {
    version: 3,
    caseType: "discovery",
    humanBrief: { objective, motivation, geography, exclusions },
    bossPremise,
    investigationRules: [
      "Public evidence only; preserve claim-level provenance.",
      "Wealth, relevance, identity, and practical access are separate questions.",
      "Famous or wealthy does not mean reachable.",
      "Candidates remain review-only until exact identity and attribution are established.",
      "Wallet-first seeds: attribute holder from public sources before any contact hop; reject exchange/mixer/protocol treasuries; never invent holder or contacts from chain data alone.",
      "The human operator remains the final decision-maker for contact use.",
    ],
    candidateLanes: [
      "Founder and operator-investors",
      "Family offices and investment groups",
      "Regional business owners and private-company principals",
      "Portfolio-company and advisor relationships",
      "Professional intermediaries and practical introduction routes",
      "Public social and organization routes",
      "Wallet-first: high-value public wallets → attribute holder → contact research",
    ],
    initialAction: {
      id: "broad-web-discovery",
      title: "Broad public-web discovery",
      purpose: "Find realistic investor candidates and routes without assuming a target in advance.",
      status: "waiting_for_provider",
    },
    initialResearch: {
      status: "not_started",
      researchResponse: null,
      bossCommentary: null,
      sourceUrls: [],
      recordedAt: null,
    },
    investigatorReports: [],
    currentProgress: {
      reportCount: 0,
      completedLanes: [],
      openQuestions: walletFirst
        ? [
            "Is the wallet attributable to a named human (public sources only)?",
            "Is the wallet a non-human entity (exchange, mixer, protocol treasury)?",
            "After holder lock: which contact routes are attributable?",
          ]
        : [
            "Which candidates have two independent identity anchors?",
            "Which candidates have attributable investment or ownership evidence?",
            "Which candidates have a practical public introduction route?",
          ],
      lastReviewedBy: null,
      refreshedAt: null,
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
    const parsed = JSON.parse(value) as Partial<DiscoveryCaseFile> & { version?: number };
    if (parsed?.caseType !== "discovery" || (parsed.version !== 3 && parsed.version !== 2)) return null;
    const reports = Array.isArray(parsed.investigatorReports) ? parsed.investigatorReports : [];
    const progress = parsed.currentProgress ?? {
      reportCount: reports.length,
      completedLanes: reports.filter((report) => report.status === "completed").map((report) => report.lane),
      openQuestions: [],
      lastReviewedBy: null,
      refreshedAt: null,
    };
    return {
      ...parsed,
      version: 3,
      investigatorReports: reports as DiscoveryCaseFile["investigatorReports"],
      currentProgress: progress,
    } as DiscoveryCaseFile;
  } catch {
    return null;
  }
}

export function appendDiscoveryReport(
  file: DiscoveryCaseFile,
  report: Omit<DiscoveryInvestigatorReport, "id" | "createdAt"> & { id?: string; createdAt?: string },
): DiscoveryCaseFile {
  const createdAt = report.createdAt ?? new Date().toISOString();
  const entry: DiscoveryInvestigatorReport = {
    ...report,
    id: report.id ?? `${report.lane}-${report.iteration}-${Date.parse(createdAt) || Date.now()}`,
    createdAt,
  };
  const reports = [...file.investigatorReports, entry];
  const completedLanes = [...new Set(reports.filter((item) => item.status === "completed").map((item) => item.lane))];
  const openQuestions = [...new Set([
    ...file.currentProgress.openQuestions,
    ...reports.flatMap((item) => item.nextQuestions),
  ])].filter(Boolean);
  return {
    ...file,
    version: 3,
    investigatorReports: reports,
    currentProgress: {
      ...file.currentProgress,
      reportCount: reports.length,
      completedLanes,
      openQuestions,
      refreshedAt: createdAt,
    },
    lastUpdatedBy: report.provider,
  };
}

export function buildDiscoveryProgressSnapshot(file: DiscoveryCaseFile): string {
  // Model-facing discovery context is bounded deliberately; the durable case file
  // remains complete. Keep both early anchors and recent state so the projection
  // does not become biased toward stale candidates/reports.
  const maxChars = 12_000;
  const clip = (value: unknown, max: number): string | null => {
    if (typeof value !== "string") return value == null ? null : String(value);
    const trimmed = value.trim();
    return trimmed.length <= max ? trimmed : trimmed.slice(0, Math.max(0, max - 1)) + "…";
  };
  const headTail = <T>(values: readonly T[], head: number, tail: number): T[] => {
    if (values.length <= head + tail) return [...values];
    return [...values.slice(0, head), ...values.slice(-tail)];
  };
  const compactCandidates = headTail(file.discoveredCandidates ?? [], 6, 6).map((candidate) => ({
    name: clip(candidate.name, 140),
    type: clip(candidate.type, 80),
    sourceUrls: headTail(candidate.sourceUrls ?? [], 2, 2),
    contactEvidence: headTail(candidate.contactEvidence ?? [], 1, 1).map((contact) => ({
      vectorType: clip(contact.vectorType, 60),
      value: clip(contact.value, 180),
      scope: clip(contact.scope, 40),
      personName: clip(contact.personName, 120),
      role: clip(contact.role, 120),
      sourceUrls: headTail(contact.sourceUrls ?? [], 1, 2),
      note: clip(contact.note, 220),
    })),
  }));
  const compactReports = headTail(file.investigatorReports ?? [], 4, 4).map((report) => ({
    id: report.id,
    lane: report.lane,
    provider: report.provider,
    status: report.status,
    iteration: report.iteration,
    summary: clip(report.summary, 900),
    findings: headTail(report.findings ?? [], 3, 2).map((finding) => clip(finding, 320)),
    candidateNames: headTail(report.candidateNames ?? [], 4, 4).map((name) => clip(name, 120)),
    sourceUrls: headTail(report.sourceUrls ?? [], 3, 3),
    nextQuestions: headTail(report.nextQuestions ?? [], 3, 3).map((question) => clip(question, 260)),
    error: clip(report.error, 400),
  }));
  const base = {
    mission: {
      objective: clip(file.humanBrief.objective, 900),
      motivation: clip(file.humanBrief.motivation, 500),
      geography: clip(file.humanBrief.geography, 240),
      exclusions: headTail(file.humanBrief.exclusions ?? [], 6, 6).map((value) => clip(value, 180)),
    },
    premise: clip(file.bossPremise, 900),
    rules: headTail(file.investigationRules ?? [], 8, 8).map((rule) => clip(rule, 260)),
    candidates: compactCandidates,
    progress: {
      reportCount: file.currentProgress.reportCount,
      completedLanes: headTail(file.currentProgress.completedLanes ?? [], 6, 6),
      openQuestions: headTail(file.currentProgress.openQuestions ?? [], 8, 8).map((question) => clip(question, 280)),
      lastReviewedBy: clip(file.currentProgress.lastReviewedBy, 120),
      refreshedAt: file.currentProgress.refreshedAt,
    },
    investigatorReports: compactReports,
    decisions: headTail(file.decisionLog ?? [], 5, 5).map((decision) => ({
      iteration: decision.iteration,
      decision: clip(decision.decision, 320),
      reason: clip(decision.reason, 420),
      createdAt: decision.createdAt,
    })),
  };
  const serialize = (value: unknown): string => JSON.stringify(value, null, 2);

  let snapshot = serialize(base);
  if (snapshot.length <= maxChars) return snapshot;

  const reduced = {
    mission: base.mission,
    premise: base.premise,
    candidates: headTail(compactCandidates, 2, 2),
    progress: {
      reportCount: file.currentProgress.reportCount,
      completedLanes: headTail(file.currentProgress.completedLanes ?? [], 3, 3),
      openQuestions: headTail(file.currentProgress.openQuestions ?? [], 4, 4).map((question) => clip(question, 220)),
    },
    investigatorReports: headTail(compactReports, 2, 2),
    decisions: headTail(file.decisionLog ?? [], 3, 3).map((decision) => ({
      iteration: decision.iteration,
      decision: clip(decision.decision, 240),
      reason: clip(decision.reason, 300),
    })),
  };
  snapshot = serialize(reduced);
  if (snapshot.length <= maxChars) return snapshot;

  // Guaranteed-small final projection: never slice serialized JSON, because that
  // would turn a valid machine-readable snapshot into malformed context.
  const minimal = {
    mission: {
      objective: clip(file.humanBrief.objective, 500),
      geography: clip(file.humanBrief.geography, 160),
    },
    premise: clip(file.bossPremise, 500),
    progress: {
      reportCount: file.currentProgress.reportCount,
      completedLanes: headTail(file.currentProgress.completedLanes ?? [], 2, 2),
      openQuestions: headTail(file.currentProgress.openQuestions ?? [], 2, 2).map((question) => clip(question, 180)),
    },
    candidates: headTail(compactCandidates, 1, 1),
    investigatorReports: headTail(compactReports, 1, 1),
    decisions: headTail(file.decisionLog ?? [], 2, 2).map((decision) => ({
      iteration: decision.iteration,
      decision: clip(decision.decision, 180),
    })),
    _contextBound: true,
  };
  return serialize(minimal);
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
  return [...new Set(strings)];
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
        humanReview: "use_judgment" as const,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((route, index) => ({ ...route, rank: index + 1 }))
    ;
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
      tools: ["web-enricher", "Perplexity", "Tavily", "Exa"],
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
    lastUpdatedBy: "boss-local-planner",
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
    ? `Boss assigns ${next.title} to ${file.specialistRoster.find((specialist) => specialist.id === next.specialistId)?.title ?? next.specialistId}.`
    : "No queued action remains; keep the case open for a human directive or model-backed re-plan.";
  return {
    ...file,
    actionQueue: updatedQueue,
    nextBestAction: next ? { ...next, status: "active" } : null,
    decisionLog: [...file.decisionLog, { iteration, decision, reason: next?.rationale ?? "Action queue exhausted.", createdAt: now }],
    lastUpdatedBy: "boss-local-planner",
  };
}

export function recordRightHandAdvice(
  file: ResearchCaseFile,
  input: {
    model: string;
    status: "completed" | "unavailable";
    actionId: string | null;
    decision: string | null;
    reason: string | null;
    confidence: number | null;
    error: string | null;
    now?: string;
  },
): ResearchCaseFile {
  const now = input.now ?? new Date().toISOString();
  return {
    ...file,
    rightHandAdvice: {
    provider: "groq",
      model: input.model,
      status: input.status,
      actionId: input.actionId,
      decision: input.decision,
      reason: input.reason,
      confidence: input.confidence,
      error: input.error,
      createdAt: now,
    },
  };
}

export function applyGeminiBossPlan(
  file: ResearchCaseFile,
  input: {
    outcome?: BossPlanOutcome;
    actionId: string | null;
    investigatorLlm?: InvestigatorCapability | null;
    decision: string;
    reason: string;
    iteration: number;
    suggestedScope?: string | null;
    progressAssessment?: string | null;
    /** Remaining queued action ids in Boss-preferred order (allowlist only). */
    reprioritize?: string[];
    now?: string;
  },
): ResearchCaseFile | null {
  const now = input.now ?? new Date().toISOString();
  const outcome = input.outcome ?? "proceed";
  const progressNote =
    typeof input.progressAssessment === "string" && input.progressAssessment.trim().length > 0
      ? ` | progress: ${input.progressAssessment.trim().slice(0, 400)}`
      : "";

  // Phase 1: reject or reframe — do not activate a research action.
  // Park remaining queued actions so a later advance cannot burn budget on a rejected target.
  if (outcome === "reject_target" || outcome === "reframe") {
    const decisionText =
      outcome === "reject_target"
        ? `reject_target: ${input.decision}`
        : `reframe: ${input.decision}${input.suggestedScope ? ` → ${input.suggestedScope}` : ""}`;
    return {
      ...file,
      nextBestAction: null,
      actionQueue: file.actionQueue.map((action) =>
        action.status === "queued" ? { ...action, status: "review" as const } : action,
      ),
      decisionLog: [
        ...file.decisionLog,
        {
          iteration: input.iteration,
          decision: decisionText,
          reason: `${input.reason}${progressNote}`,
          createdAt: now,
        },
      ],
      lastUpdatedBy: "groq-boss",
    };
  }

  if (!input.actionId) return null;
  const next = file.actionQueue.find(
    (action) => action.id === input.actionId && action.status === "queued",
  );
  if (!next) return null;

  // Apply optional allowlist reprioritization to remaining queued actions only.
  // Boss cannot invent tools or new action ids — only reorder existing ones.
  // When no reprioritize list is provided, leave remaining priorities untouched.
  const preferred = (input.reprioritize ?? []).filter(
    (id) => id !== next.id && file.actionQueue.some((a) => a.id === id && a.status === "queued"),
  );
  let updatedQueue = file.actionQueue.map((action) =>
    action.id === next.id ? { ...action, status: "active" as const } : action,
  );
  if (preferred.length > 0) {
    const preferredSet = new Set(preferred);
    const remainingQueued = file.actionQueue
      .filter((a) => a.status === "queued" && a.id !== next.id && !preferredSet.has(a.id))
      .sort((a, b) => b.priority - a.priority);
    const reorderedTail = [
      ...preferred
        .map((id) => file.actionQueue.find((a) => a.id === id && a.status === "queued"))
        .filter((a): a is BureauAction => Boolean(a)),
      ...remainingQueued,
    ].map((action, index) => ({
      ...action,
      priority: Math.max(1, 90 - index),
    }));
    const reorderedById = new Map(reorderedTail.map((a) => [a.id, a]));
    updatedQueue = updatedQueue.map((action) => {
      if (action.id === next.id) return action;
      return reorderedById.get(action.id) ?? action;
    });
    // Preserve the queue's status partitions, but make the stored array order
    // match the Boss-selected order as well as the recalculated priorities.
    let queuedIndex = 0;
    updatedQueue = updatedQueue.map((action) =>
      action.status === "queued"
        ? (reorderedTail[queuedIndex++] ?? action)
        : action,
    );
  }

  const reprioritizeNote =
    preferred.length > 0 ? ` | reprioritize: ${preferred.join(" → ")}` : "";

  return {
    ...file,
    actionQueue: updatedQueue,
    nextBestAction: { ...next, status: "active" },
    decisionLog: [
      ...file.decisionLog,
      {
        iteration: input.iteration,
        decision: input.decision,
        reason: `${input.reason}${progressNote}${reprioritizeNote}`,
        createdAt: now,
      },
    ],
    lastUpdatedBy: "groq-boss",
  };
}



/**
 * Convert discovery/investigator contact evidence into BureauContactRoute rows.
 * Fail-closed: does not mark verified personal; state stays candidate/review.
 */
export function contactEvidenceToRoutes(
  items: ReadonlyArray<{
    vectorType?: string | null;
    value?: string | null;
    scope?: string | null;
    personName?: string | null;
    role?: string | null;
    sourceUrls?: string[] | null;
    note?: string | null;
    state?: string | null;
  }> | null | undefined,
  startRank = 1,
): BureauContactRoute[] {
  if (!items?.length) return [];
  const out: BureauContactRoute[] = [];
  const seen = new Set<string>();
  let rank = startRank;
  for (const item of items) {
    const value = typeof item.value === "string" ? item.value.trim() : "";
    if (!value) continue;
    const vectorType = String(item.vectorType ?? "other").toLowerCase() || "other";
    const key = `${vectorType}|${value.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const scope = String(item.scope ?? "").toLowerCase();
    const tier =
      scope === "person" || scope === "personal"
        ? "person"
        : scope === "organization" || scope === "org"
          ? "organization"
          : "candidate";
    const tierLabel =
      tier === "person"
        ? "Person-scoped candidate route"
        : tier === "organization"
          ? "Organization route"
          : "Candidate route";
    out.push({
      rank: rank++,
      tier,
      tierLabel,
      value,
      vectorType,
      personName: item.personName ?? null,
      role: item.role ?? null,
      relationship: scope || null,
      score: tier === "person" ? 55 : tier === "organization" ? 38 : 30,
      state: item.state ?? "review_only",
      sourceUrls: Array.isArray(item.sourceUrls) ? item.sourceUrls.filter(Boolean) : [],
      sourceDomains: [],
      rationale: item.note ?? "Captured from investigator or discovery contact evidence; human review required before personal promotion.",
      humanReview: "use_judgment",
    });
  }
  return out;
}

/** Merge routes by vectorType|value; prefer richer sourceUrls / higher score. */
export function mergeContactRoutes(
  existing: readonly BureauContactRoute[] | null | undefined,
  incoming: readonly BureauContactRoute[] | null | undefined,
): BureauContactRoute[] {
  const map = new Map<string, BureauContactRoute>();
  for (const route of [...(existing ?? []), ...(incoming ?? [])]) {
    const value = route.value?.trim();
    if (!value) continue;
    const key = `${String(route.vectorType ?? "other").toLowerCase()}|${value.toLowerCase()}`;
    const prior = map.get(key);
    if (!prior) {
      map.set(key, route);
      continue;
    }
    map.set(key, {
      ...prior,
      ...route,
      rank: Math.min(prior.rank, route.rank),
      score: Math.max(prior.score, route.score),
      sourceUrls: [...new Set([...(prior.sourceUrls ?? []), ...(route.sourceUrls ?? [])])],
      sourceDomains: [...new Set([...(prior.sourceDomains ?? []), ...(route.sourceDomains ?? [])])],
      personName: prior.personName || route.personName,
      role: prior.role || route.role,
      rationale: route.rationale || prior.rationale,
    });
  }
  return [...map.values()]
    .sort((a, b) => b.score - a.score || a.rank - b.rank)
    .map((route, index) => ({ ...route, rank: index + 1 }));
}

export function recordGeminiBossPlan(
  file: ResearchCaseFile,
  input: GeminiBossPlanResult & { now?: string },
): ResearchCaseFile {
  return {
    ...file,
    bossPlan: {
      provider: "groq",
      model: input.model,
      status: input.status,
      outcome: input.outcome,
      actionId: input.actionId,
      decision: input.decision,
      reason: input.reason,
      investigatorPrompt: input.investigatorPrompt,
      investigatorLlm: input.investigatorLlm ?? null,
      restrictions: input.restrictions,
      tools: input.tools,
      evidenceRequirements: input.evidenceRequirements,
      confidence: input.confidence,
      progressAssessment: input.progressAssessment,
      reprioritize: input.reprioritize ?? [],
      suggestedScope: input.suggestedScope,
      rightHandDisposition: input.rightHandDisposition ?? "unknown",
      rightHandNote: input.rightHandNote ?? null,
      error: input.error,
      createdAt: input.now ?? new Date().toISOString(),
    },
  };
}