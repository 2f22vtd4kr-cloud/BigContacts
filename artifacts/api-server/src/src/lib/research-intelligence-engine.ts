import { createHash } from "node:crypto";
import { assessResearchFrontier, scoreSourceIndependence } from "./research-policy";
import { updateHypothesisPosterior, chooseBestDiscriminator, assessFalsificationPlan } from "./research-hypothesis-policy";
import { summarizeActionYield, type ActionYieldStat, updateActionYield } from "./research-action-learning";
import { bindExactSourceSpan, SourceLineageGraph, sourceLineageId } from "./research-epistemic-vnext";
import { buildDiscoveryIntelligence, type DiscoveryIntelligence, renderDiscoveryIntelligence } from "./discovery-frontier";

export type IntelligenceSourceTier = "A" | "B" | "C" | "D" | "unknown";
export type IntelligenceEvidenceKind = "observation" | "finding" | "negative" | "contradiction" | "claim";
export type IntelligenceSourceClass = "REGULATORY" | "OFFICIAL_COMPANY" | "OFFICIAL_GOVERNANCE" | "OFFICIAL_PERSONAL" | "REPUTABLE_NEWS" | "PROFESSIONAL_DIRECTORY" | "SOCIAL_PROFILE" | "SEARCH_RESULT" | "AGGREGATOR" | "SCRAPED_DIRECTORY" | "UNKNOWN";
export type IntelligenceClaimStatus = "supported" | "contradicted" | "unresolved";
export type ContactEvidenceState = "DISCOVERED" | "OBSERVED" | "ATTRIBUTED" | "CORROBORATED" | "VERIFIED" | "STALE" | "CONTRADICTED" | "REJECTED";

export interface IntelligenceEvidence {
  id: string;
  kind: IntelligenceEvidenceKind;
  claim: string;
  value: string;
  sourceUrl: string | null;
  sourceHost: string | null;
  sourceTier: IntelligenceSourceTier;
  sourceClass: IntelligenceSourceClass;
  extractionMethod: string;
  retrievedAt: string;
  lastSeen: string;
  turn: number;
  action: string;
  execution: string;
  supports: string[];
  contradicts: string[];
  passage: string | null;
  /** Atomic statement-level binding: claim -> exact observed passage/source/attribution. */
  claimId?: string;
  sourceFamily?: string;
  attribution?: string | null;
  spanStart?: number | null;
  spanEnd?: number | null;
  spanBound?: boolean;
  sourceLineageId?: string;
  fingerprint: string;
}

export interface IntelligenceClaim {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  status: IntelligenceClaimStatus;
  evidenceIds: string[];
  sourceHosts: string[];
  firstSeen: string;
  lastSeen: string;
}

export interface IdentityHypothesis {
  id: string;
  label: string;
  entity: string;
  score: number;
  /** Immutable prior used to recompute posterior from the current evidence set. */
  priorScore?: number;
  logOdds?: number;
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  missingDiscriminators: string[];
  status: "leading" | "alternative" | "rejected";
}

export interface ContactEvidence {
  personName?: string | null;
  value: string;
  vector: string;
  state: ContactEvidenceState;
  sourceUrls: string[];
  sourceHosts: string[];
  firstSeen: string;
  lastSeen: string;
  attributionStrength: number;
}

export interface IntelligenceAction {
  turn: number;
  action: string;
  args: Record<string, unknown>;
  execution: string;
  observation: string;
  urls: string[];
  findingCount: number;
  useful: boolean;
  informationGain: number;
  findingNames: string[];
  findingRoles: string[];
}

export interface IntelligenceMissionBrief {
  mission: "identity" | "organization" | "contact" | "disproof";
  objective: string;
  evidenceGap: string;
  availableCapabilities: string[];
}

export interface ResearchFeedback {
  outcome: "useful" | "wrong_person" | "duplicate" | "outdated" | "bounced" | "successful_outreach" | "rejected";
  value?: string;
  sourceHost?: string;
  note?: string;
}

export interface IntelligenceContext {
  version: 1;
  caseId: number | null;
  executionId: string;
  target: string;
  objective: string;
  facts: Array<{ claim: string; evidenceIds: string[]; sources: string[] }>;
  hypotheses: IdentityHypothesis[];
  contradictions: Array<{ claim: string; evidenceIds: string[]; sources: string[] }>;
  contacts: ContactEvidence[];
  negativeFindings: string[];
  openQuestions: string[];
  recentActions: IntelligenceAction[];
  sourceDiversity: number;
  sourceFamilyDiversity: number;
  repeatedSourceFamilies: string[];
  evidenceCount: number;
  provenanceDigest: string;
  missionBriefs: IntelligenceMissionBrief[];
  sourceQualitySummary: Array<{ sourceClass: IntelligenceSourceClass; count: number }>;
  frontier: ReturnType<typeof assessResearchFrontier>;
  sourceIndependence: number;
  providerDisagreements: Array<{ query: string; providers: string[]; sourceHosts: string[] }>;
  atomicEvidence: Array<{ evidenceId: string; kind: IntelligenceEvidenceKind; claimId?: string; claim: string; sourceUrl: string | null; sourceHost: string | null; sourceClass: IntelligenceSourceClass; passage: string | null; attribution: string | null }>;
  actionYield: ReturnType<typeof summarizeActionYield>[];
  sourceLineage: Array<{ sourceId: string; canonicalUrl: string; host: string; originSourceId: string | null; citedSourceIds: string[] }>;
  independentSourceUnits: number;
  discovery?: DiscoveryIntelligence;
  falsification: ReturnType<typeof assessFalsificationPlan>;
  researchQuestions: Array<{ id: string; question: string; importance: number; uncertainty: number; discriminators: string[]; status: "open" | "answered" | "blocked" }>;
  stoppingAssessment: {
    evidenceCoverage: number;
    unresolvedQuestions: number;
    recommendation: "continue" | "review";
  };
}

const STOPWORDS = new Set(["the", "and", "for", "with", "from", "that", "this", "about", "research", "contact", "person"]);

function normalize(value: string): string { return value.toLowerCase().replace(/[^a-z0-9@._:+/-]+/g, " ").replace(/\s+/g, " ").trim(); }
function hostOf(url: string | null): string | null { if (!url) return null; try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; } }
function canonicalUrl(url: string): string | null { try { const parsed = new URL(url); if (!/^https?:$/.test(parsed.protocol)) return null; parsed.hash = ""; parsed.hostname = parsed.hostname.toLowerCase(); return parsed.href.replace(/\/$/, ""); } catch { return null; } }
function hostMatchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}
function isOfficialGovernmentHost(host: string): boolean {
  const normalized = host.toLowerCase().replace(/^www\./, "");
  return normalized === "europa.eu"
    || normalized.endsWith(".europa.eu")
    || [".gov", ".gov.uk", ".gc.ca", ".gov.au", ".govt.nz", ".gov.in", ".gov.sg", ".gov.br", ".gov.za", ".gov.ie"].some((suffix) => normalized.endsWith(suffix));
}
function sourceFamily(host: string | null): string {
  if (!host) return "unknown";
  if (["companieshouse.gov.uk", "sec.gov", "brreg.no", "bodacc.fr", "gleif.org"].some((domain) => hostMatchesDomain(host, domain))) return "registry";
  if (["google.com", "bing.com", "serper.dev", "tavily.com", "exa.ai"].some((domain) => hostMatchesDomain(host, domain))) return "search";
  if (["linkedin.com", "x.com", "twitter.com", "instagram.com"].some((domain) => hostMatchesDomain(host, domain))) return "social";
  if (isOfficialGovernmentHost(host)) return "government";
  return host;
}
function sourceClassForHost(host: string | null): IntelligenceSourceClass {
  if (!host) return "UNKNOWN";
  if (["companieshouse.gov.uk", "company-information.service.gov.uk", "sec.gov", "brreg.no", "bodacc.fr", "gleif.org"].some((domain) => hostMatchesDomain(host, domain))) return "REGULATORY";
  if (["linkedin.com", "x.com", "twitter.com", "instagram.com"].some((domain) => hostMatchesDomain(host, domain))) return "SOCIAL_PROFILE";
  if (["crunchbase.com", "pitchbook.com", "opencorporates.com"].some((domain) => hostMatchesDomain(host, domain))) return "PROFESSIONAL_DIRECTORY";
  if (["google.com", "bing.com", "serper.dev", "tavily.com", "exa.ai"].some((domain) => hostMatchesDomain(host, domain))) return "SEARCH_RESULT";
  if (["wikipedia.org", "yahoo.com", "medium.com"].some((domain) => hostMatchesDomain(host, domain))) return "AGGREGATOR";
  if (isOfficialGovernmentHost(host)) return "OFFICIAL_GOVERNANCE";
  if (["reuters.com", "ft.com", "bloomberg.com", "wsj.com"].some((domain) => hostMatchesDomain(host, domain))) return "REPUTABLE_NEWS";
  return "UNKNOWN";
}
  if (!host) return "UNKNOWN";
  if (/companieshouse\.gov\.uk$|company-information\.service\.gov\.uk$|sec\.gov$|brreg\.no$|bodacc\.fr$|gleif\.org$/.test(host)) return "REGULATORY";
  if (/linkedin\.com$|x\.com$|twitter\.com$|instagram\.com$/.test(host)) return "SOCIAL_PROFILE";
  if (/crunchbase\.com$|pitchbook\.com$|opencorporates\.com$/.test(host)) return "PROFESSIONAL_DIRECTORY";
  if (/google\.|bing\.|serper\.dev$|tavily\.com$|exa\.ai$/.test(host)) return "SEARCH_RESULT";
  if (/wikipedia\.org$|yahoo\.com$|medium\.com$/.test(host)) return "AGGREGATOR";
  if (isOfficialGovernmentHost(host)) return "OFFICIAL_GOVERNANCE";
  if (/news|reuters\.com$|ft\.com$|bloomberg\.com$|wsj\.com$/.test(host)) return "REPUTABLE_NEWS";
  return "UNKNOWN";
}
function extractionMethodForAction(action: string): string {
  if (action.includes("registry")) return "registry_api";
  if (action.includes("search")) return "search_result";
  if (action.includes("browser")) return "browser_fetch";
  if (action.includes("visit")) return "http_page";
  if (action.includes("harvest")) return "domain_harvest";
  if (action.includes("footprint")) return "osint_enrichment";
  return "agent_observation";
}
function tierForHost(host: string | null): IntelligenceSourceTier {
  if (!host) return "unknown";
  if (isOfficialGovernmentHost(host) || /(^|\.)sec\.gov$/.test(host) || /(^|\.)companieshouse\.gov\.uk$/.test(host)) return "A";
  if (/\.(edu|ac\.[a-z]{2})$/.test(host)) return "B";
  if (/linkedin\.com$|crunchbase\.com$|pitchbook\.com$|wikipedia\.org$/.test(host)) return "C";
  return "B";
}
function hash(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function clamp(value: number, min = 0, max = 1): number { return Math.max(min, Math.min(max, value)); }
function tokenize(value: string): string[] { return normalize(value).split(" ").filter((token) => token.length > 2 && !STOPWORDS.has(token)); }
function overlap(a: string, b: string): number { const aa = new Set(tokenize(a)); const bb = new Set(tokenize(b)); if (!aa.size || !bb.size) return 0; let hit = 0; for (const token of aa) if (bb.has(token)) hit += 1; return hit / Math.max(aa.size, bb.size); }
function extractPredicate(claim: string): { subject: string; predicate: string; object: string } {
  const text = claim.trim();
  const match = text.match(/^(.{2,100}?)(?:\s+is\s+|\s+works?\s+at\s+|\s+founded\s+|\s+owns?\s+|\s+email(?:s)?\s+|\s+phone(?:s)?\s+)(.{2,220})$/i);
  if (!match) return { subject: text.slice(0, 120), predicate: "asserts", object: text.slice(0, 220) };
  const lower = text.toLowerCase();
  const predicate = lower.includes(" works at ") ? "works_at" : lower.includes(" founded ") ? "founded" : lower.includes(" owns ") ? "owns" : lower.includes(" email ") || lower.includes(" emails ") ? "email" : lower.includes(" phone ") || lower.includes(" phones ") ? "phone" : "is";
  return { subject: match[1]!.trim(), predicate, object: match[2]!.trim() };
}

function supportsHypothesisClaim(hypothesis: string, claim: string): boolean {
  const parseableHypothesis = hypothesis
    .replace(/\b(?:may|might|could|possibly|probably|likely|perhaps)\b/gi, " ")
    .replace(/\b(?:the|a|an)\b/gi, " ")
    .replace(/\bbe\b/gi, "is")
    .replace(/\s+/g, " ")
    .trim();
  const hypothesisClaim = extractPredicate(parseableHypothesis);
  const evidenceClaim = extractPredicate(claim);
  if (hypothesisClaim.predicate !== "asserts" && evidenceClaim.predicate !== "asserts") {
    if (normalize(hypothesisClaim.subject) !== normalize(evidenceClaim.subject)) return false;
    if (hypothesisClaim.predicate !== evidenceClaim.predicate) return false;
    const normalizeObject = (value: string) => normalize(value).replace(/^(?:the|a|an)\s+/, "");
    if (normalizeObject(hypothesisClaim.object) !== normalizeObject(evidenceClaim.object)) return false;
  }
  return overlap(hypothesis, claim) >= 0.35;
}

export class ResearchIntelligenceEngine {
  private readonly evidence = new Map<string, IntelligenceEvidence>();
  private readonly claims = new Map<string, IntelligenceClaim>();
  private readonly contacts = new Map<string, ContactEvidence>();
  private readonly actions: IntelligenceAction[] = [];
  private readonly negativeFindings = new Set<string>();
  private readonly hypotheses = new Map<string, IdentityHypothesis>();
  private readonly feedback: ResearchFeedback[] = [];
  private readonly actionYield = new Map<string, ActionYieldStat>();
  private readonly sourceLineage = new SourceLineageGraph();
  private chain = "GENESIS";
  constructor(private readonly input: { caseId?: number | null; executionId: string; target: string; objective: string }) {}

  recordAction(input: { turn: number; action: string; args?: Record<string, unknown>; execution: string; observation?: string; urls?: string[]; findings?: Array<{ vectorType?: string; value?: string; personName?: string | null; role?: string | null; sourceUrls?: string[]; note?: string }>, predictedInformationGain?: number }): void {
    const urls = [...new Set((input.urls ?? []).map(canonicalUrl).filter((value): value is string => Boolean(value)))];
    const newHostCount = this.countNewHosts(urls);
    // Only a positively completed tool execution can contribute positive findings. An errored/failed tool result may be recorded as a negative finding, but it can never become a finding/contact merely because a caller supplied model output alongside the failure.
    const findings = input.execution === "success" && !["web_search", "parallel_web_search"].includes(input.action) ? (input.findings ?? []) : [];
    let useful = false;
    for (const finding of findings) {
      const value = String(finding.value ?? "").trim();
      if (!value) continue;
      useful = true;
      const vector = String(finding.vectorType ?? "other");
      const observedUrlSet = new Set(urls);
      const findingUrls = [...new Set((finding.sourceUrls ?? []).map(canonicalUrl).filter((v): v is string => Boolean(v)).filter((url) => observedUrlSet.has(url)))];
      const claim = finding.personName ? finding.personName + " " + vector + " " + value : this.input.target + " " + vector + " " + value;
      // Preserve every observed source supporting a multi-source finding. The
      // intelligence projection is compacted later, but collapsing the claim
      // to sourceUrls[0] here destroys independent-corroboration state.
      for (const sourceUrl of findingUrls) {
        const span = bindExactSourceSpan(input.observation ?? "", value, finding.personName ?? this.input.target);
        this.recordEvidence({ kind: "finding", claim, value, sourceUrl, sourceTier: tierForHost(hostOf(sourceUrl)), turn: input.turn, action: input.action, execution: input.execution, passage: span?.exact ? span.text : null, spanStart: span?.exact ? span.start : null, spanEnd: span?.exact ? span.end : null, supports: finding.personName ? [normalize(finding.personName)] : [], contradicts: [] });
      }
      if (["email", "phone", "linkedin", "website", "social"].includes(vector)) this.recordContact(vector, value, findingUrls, finding.personName ?? null);
    }
    if (!useful && input.execution !== "success") {
      const negative = `${input.action} produced no usable evidence (${input.execution})`;
      this.negativeFindings.add(negative);
      this.recordEvidence({ kind: "negative", claim: negative, value: negative, sourceUrl: null, sourceTier: "unknown", turn: input.turn, action: input.action, execution: input.execution, passage: null, supports: [], contradicts: [] });
    }
    if (input.execution === "success") {
      for (const url of urls) this.recordEvidence({ kind: "observation", claim: `Observed source ${url}`, value: url, sourceUrl: url, sourceTier: tierForHost(hostOf(url)), turn: input.turn, action: input.action, execution: input.execution, passage: input.observation?.slice(0, 1200) ?? null, supports: [], contradicts: [] });
    }
    // Search results are leads, not source-backed evidence. A successful search
    // with many URLs must not look like a high-yield research step merely because
    // the provider returned a large result set. Visited/validated observations
    // may contribute modest information even without an attributed finding.
    const searchLeadOnly = input.execution === "success"
      && (input.action === "web_search" || input.action === "parallel_web_search")
      && findings.length === 0;
    const informationGain = searchLeadOnly
      ? clamp(0.05 + Math.min(0.10, newHostCount * 0.02))
      : clamp((useful ? 0.45 : input.execution === "success" ? 0.15 : 0.05)
        + Math.min(0.35, urls.length * 0.07)
        + Math.min(0.2, newHostCount * 0.1));
    const predictedInformationGain = clamp(input.predictedInformationGain ?? informationGain);
    this.actions.push({ turn: input.turn, action: input.action, args: input.args ?? {}, execution: input.execution, observation: input.observation ?? "", urls, findingCount: findings.length, useful, informationGain, findingNames: [...new Set(findings.map((finding) => String(finding.personName ?? "").trim()).filter(Boolean))].slice(0, 8), findingRoles: [...new Set(findings.map((finding) => String(finding.role ?? "").trim()).filter(Boolean))].slice(0, 8) });
    // Recompute live contradictions before hypothesis support is linked or ranked.
    this.reconcileContradictions();
    const modelHypothesis = typeof input.args?.hypothesis === "string" ? input.args.hypothesis.trim() : "";
    const modelPurpose = typeof input.args?.purpose === "string" ? input.args.purpose.trim() : "";
    if (modelHypothesis) {
      const supportingEvidenceIds = [...this.evidence.values()].filter((evidence) => evidence.turn === input.turn && evidence.action === input.action && (evidence.kind === "finding" || evidence.kind === "claim") && supportsHypothesisClaim(modelHypothesis, evidence.claim) && !evidence.contradicts.some((id) => { const competing = this.evidence.get(id); return competing && overlap(modelHypothesis, competing.claim) >= overlap(modelHypothesis, evidence.claim); })).map((evidence) => evidence.id);
      this.addHypothesis({ label: modelHypothesis, entity: modelHypothesis, supportingEvidenceIds, missingDiscriminators: modelPurpose ? [modelPurpose] : [] });
    }
    const learningQuestion = modelPurpose ? normalize(modelPurpose) : modelHypothesis ? normalize(modelHypothesis) : "";
    const actionLearningKey = learningQuestion ? input.action + "|" + learningQuestion.slice(0, 180) : input.action;
    this.actionYield.set(actionLearningKey, updateActionYield(this.actionYield.get(actionLearningKey), { useful, execution: input.execution, informationGain, predictedInformationGain, realizedInformationGain: informationGain, turn: input.turn }));
    this.chain = hash(`${this.chain}|${input.turn}|${input.action}|${input.execution}|${JSON.stringify(urls)}|${findings.map((f) => `${f.vectorType}:${f.value}`).join("|")}`);
  }

  /** Restore durable epistemic state after a process restart. This is projection reconstruction only: it never selects research actions or providers. */
  restoreContext(context: IntelligenceContext): void {
    if (context.version !== 1) return;
    this.evidence.clear(); this.claims.clear(); this.contacts.clear(); this.actions.length = 0;
    this.negativeFindings.clear(); this.hypotheses.clear(); this.feedback.length = 0; this.actionYield.clear();
    this.chain = context.provenanceDigest || "GENESIS";
    const lineageByUrl = new Map(context.sourceLineage.map((node) => [canonicalUrl(node.canonicalUrl) ?? node.canonicalUrl, node]));
    for (const item of context.atomicEvidence) {
      if (item.kind === "observation" && item.sourceClass === "SEARCH_RESULT") continue;
      const parsed = extractPredicate(item.claim); const sourceUrl = item.sourceUrl ? canonicalUrl(item.sourceUrl) : null;
      const sourceHost = item.sourceHost ?? hostOf(sourceUrl); const sourceLineage = sourceUrl ? lineageByUrl.get(sourceUrl) : undefined;
      const fingerprint = hash(item.kind + "|" + normalize(item.claim) + "|" + normalize(parsed.object) + "|" + (sourceUrl ?? ""));
      const evidenceId = item.evidenceId || ("ev_" + fingerprint.slice(0, 20));
      this.evidence.set(fingerprint, { id: evidenceId, kind: item.kind, claim: item.claim, value: parsed.object, sourceUrl, sourceHost,
        sourceTier: tierForHost(sourceHost), sourceClass: item.sourceClass, extractionMethod: "durable_replay",
        retrievedAt: new Date(0).toISOString(), lastSeen: new Date(0).toISOString(), turn: 0, action: "durable_replay",
        execution: "success", supports: item.attribution ? [item.attribution] : [], contradicts: [], passage: item.passage,
        claimId: item.claimId, sourceFamily: sourceFamily(sourceHost), attribution: item.attribution,
        spanStart: item.passage ? 0 : null, spanEnd: item.passage ? item.passage.length : null, spanBound: Boolean(item.passage),
        sourceLineageId: sourceLineage?.sourceId, fingerprint });
    }
    for (const fact of context.facts) {
      const parsed = extractPredicate(fact.claim); const id = "cl_" + hash(fact.claim).slice(0, 20);
      this.claims.set(id, { id, subject: parsed.subject, predicate: parsed.predicate, object: parsed.object, status: "supported",
        evidenceIds: [...new Set(fact.evidenceIds)].filter((evidenceId) => [...this.evidence.values()].some((evidence) => evidence.id === evidenceId)), sourceHosts: [...new Set(fact.sources)],
        firstSeen: new Date(0).toISOString(), lastSeen: new Date(0).toISOString() });
    }
    const knownEvidenceIds = new Set([...this.evidence.values()].map((evidence) => evidence.id));
    for (const hypothesis of context.hypotheses) {
      const supportingEvidenceIds = [...hypothesis.supportingEvidenceIds].filter((id) => knownEvidenceIds.has(id));
      const contradictingEvidenceIds = [...hypothesis.contradictingEvidenceIds].filter((id) => knownEvidenceIds.has(id));
      if ((hypothesis.supportingEvidenceIds.length > 0 || hypothesis.contradictingEvidenceIds.length > 0) && !supportingEvidenceIds.length && !contradictingEvidenceIds.length) continue;
      this.hypotheses.set(hypothesis.id, { ...hypothesis, priorScore: hypothesis.priorScore ?? hypothesis.score, supportingEvidenceIds, contradictingEvidenceIds, missingDiscriminators: [...hypothesis.missingDiscriminators] });
    }
    for (const contact of context.contacts) {
      const sourceUrls = [...new Set(contact.sourceUrls)].filter((url) => sourceClassForHost(hostOf(url)) !== "SEARCH_RESULT");
      if (!sourceUrls.length) continue;
      const sourceHosts = [...new Set(sourceUrls.map(hostOf).filter((host): host is string => Boolean(host)))];
      const key = contact.vector + "|" + normalize(contact.personName ?? "") + "|" + normalize(contact.value);
      this.contacts.set(key, { ...contact, sourceUrls, sourceHosts });
    }
    for (const negative of context.negativeFindings) this.negativeFindings.add(negative);
    for (const action of context.recentActions) this.actions.push({ ...action, args: { ...action.args }, urls: [...action.urls], findingNames: [...action.findingNames], findingRoles: [...action.findingRoles] });
    for (const node of context.sourceLineage) this.sourceLineage.register({ canonicalUrl: node.canonicalUrl, host: node.host, originSourceId: node.originSourceId, publisher: null, citedSourceIds: [...node.citedSourceIds], contentFingerprint: null, sourceId: node.sourceId });
    this.reconcileContradictions(); this.rankHypotheses();
  }
  recordFeedback(feedback: ResearchFeedback): void {
    this.feedback.push({ ...feedback });
    if (feedback.value) {
      const matchingContacts = [...this.contacts.values()].filter((contact) => normalize(contact.value) === normalize(feedback.value!));
      for (const contact of matchingContacts) {
        if (feedback.outcome === "wrong_person" || feedback.outcome === "rejected") contact.state = "REJECTED";
        else if (feedback.outcome === "outdated" || feedback.outcome === "bounced") contact.state = "STALE";
        else if (feedback.outcome === "successful_outreach") contact.state = "VERIFIED";
      }
    }
  }

  addHypothesis(input: { label: string; entity: string; score?: number; supportingEvidenceIds?: string[]; contradictingEvidenceIds?: string[]; missingDiscriminators?: string[] }): void {
    const id = hash(`${normalize(input.label)}|${normalize(input.entity)}`).slice(0, 16);
    const previous = this.hypotheses.get(id);
    const priorScore = previous?.priorScore ?? previous?.score ?? clamp(input.score ?? 0.5);
    this.hypotheses.set(id, {
      id, label: input.label, entity: input.entity, score: priorScore, priorScore,
      supportingEvidenceIds: [...new Set([...(previous?.supportingEvidenceIds ?? []), ...(input.supportingEvidenceIds ?? [])])],
      contradictingEvidenceIds: [...new Set([...(previous?.contradictingEvidenceIds ?? []), ...(input.contradictingEvidenceIds ?? [])])],
      missingDiscriminators: [...new Set([...(previous?.missingDiscriminators ?? []), ...(input.missingDiscriminators ?? [])])],
      status: previous?.status ?? "alternative",
    });
    this.rankHypotheses();
  }

  private recordEvidence(input: Omit<IntelligenceEvidence, "id" | "retrievedAt" | "lastSeen" | "fingerprint" | "sourceHost" | "sourceClass" | "extractionMethod">): string {
    const retrievedAt = new Date().toISOString();
    const sourceHost = hostOf(input.sourceUrl);
    const sourceClass = sourceClassForHost(sourceHost);
    const lineage = input.sourceUrl ? this.sourceLineage.register({ canonicalUrl: input.sourceUrl, host: sourceHost ?? input.sourceUrl, originSourceId: null, publisher: null, citedSourceIds: [], contentFingerprint: input.passage ? hash(normalize(input.passage)) : null }) : null;
    const extractionMethod = extractionMethodForAction(input.action);
    const parsed = extractPredicate(input.claim);
    // The durable projection stores claim + parsed predicate/object, not the
    // original extraction value. Use the same canonical fingerprint inputs on
    // both live writes and restore so resumed duplicate observations stay idempotent.
    const fingerprint = hash(`${input.kind}|${normalize(input.claim)}|${normalize(parsed.object)}|${input.sourceUrl ?? ""}`);
    const existing = this.evidence.get(fingerprint);
    if (existing) { existing.lastSeen = retrievedAt; return existing.id; }
    const id = `ev_${fingerprint.slice(0, 20)}`;
    const claimKey = hash(`${normalize(parsed.subject)}|${normalize(parsed.predicate)}|${normalize(parsed.object)}`);
    const previous = this.claims.get(claimKey);
    const claimId = previous?.id ?? `cl_${claimKey.slice(0, 20)}`;
    const evidenceRecord: IntelligenceEvidence = {
      ...input,
      id,
      retrievedAt,
      lastSeen: retrievedAt,
      sourceHost,
      sourceClass,
      extractionMethod,
      claimId,
      sourceFamily: sourceFamily(sourceHost),
      attribution: input.supports.length ? input.supports.join(", ") : null,
      spanStart: input.spanStart ?? null,
      spanEnd: input.spanEnd ?? null,
      spanBound: Boolean(input.passage && input.spanStart != null && input.spanEnd != null),
      sourceLineageId: lineage?.sourceId,
      fingerprint,
    };
    this.evidence.set(fingerprint, evidenceRecord);
    if (previous) {
      previous.evidenceIds.push(id);
      previous.sourceHosts = [...new Set([...previous.sourceHosts, sourceHost].filter(Boolean) as string[])];
      previous.lastSeen = retrievedAt;
    } else {
      this.claims.set(claimKey, { id: claimId, subject: parsed.subject, predicate: parsed.predicate, object: parsed.object, status: "supported", evidenceIds: [id], sourceHosts: sourceHost ? [sourceHost] : [], firstSeen: retrievedAt, lastSeen: retrievedAt });
    }
    return id;
  }

  private recordContact(vector: string, value: string, urls: string[], personName: string | null): void {
    const key = `${vector}|${normalize(personName ?? "")}|${normalize(value)}`; const existing = this.contacts.get(key); const now = new Date().toISOString(); const hosts = [...new Set(urls.map(hostOf).filter((v): v is string => Boolean(v)))];
    if (existing) {
      existing.lastSeen = now;
      existing.sourceUrls = [...new Set([...existing.sourceUrls, ...urls])];
      existing.sourceHosts = [...new Set([...existing.sourceHosts, ...hosts])];
      existing.attributionStrength = clamp(Math.max(existing.attributionStrength, personName ? 0.85 : 0.45));
      if (existing.sourceHosts.length >= 2 && !["REJECTED", "VERIFIED", "STALE", "CONTRADICTED"].includes(existing.state)) existing.state = "CORROBORATED";
      return;
    }
    this.contacts.set(key, { personName, value, vector, state: personName ? "ATTRIBUTED" : "OBSERVED", sourceUrls: urls, sourceHosts: hosts, firstSeen: now, lastSeen: now, attributionStrength: personName ? 0.85 : 0.45 });
  }

  private countNewHosts(urls: string[]): number { const known = new Set([...this.evidence.values()].map((item) => item.sourceHost).filter(Boolean)); return urls.map(hostOf).filter((host): host is string => Boolean(host) && !known.has(host)).length; }

  private reconcileContradictions(): void {
    const grouped = new Map<string, IntelligenceEvidence[]>();
    for (const evidence of this.evidence.values()) { const parsed = extractPredicate(evidence.claim); const key = normalize(`${parsed.subject}|${parsed.predicate}`); const list = grouped.get(key) ?? []; list.push(evidence); grouped.set(key, list); }
    for (const evidence of this.evidence.values()) evidence.contradicts = [];
    for (const list of grouped.values()) {
      const objectById = new Map(list.map((item) => [item.id, normalize(extractPredicate(item.claim).object)]));
      const distinctObjects = new Set(objectById.values());
      const parsed = extractPredicate(list[0]?.claim ?? "");
      if (["email", "phone", "social", "website"].includes(parsed.predicate)) continue;
      if (distinctObjects.size < 2) continue;
      // Every observation of one side must link to all conflicting objects,
      // not only the last representative retained for each distinct value.
      for (const current of list) {
        current.contradicts = [...new Set(list
          .filter((item) => objectById.get(item.id) !== objectById.get(current.id))
          .map((item) => item.id))];
      }
    }
    for (const claim of this.claims.values()) { const related = claim.evidenceIds.map((id) => [...this.evidence.values()].find((item) => item.id === id)).filter(Boolean) as IntelligenceEvidence[]; const predicate = claim.predicate; const key = normalize(`${claim.subject}|${predicate}`); const group = [...this.evidence.values()].filter((item) => { const parsed = extractPredicate(item.claim); return normalize(`${parsed.subject}|${parsed.predicate}`) === key; }); claim.status = group.some((item) => item.contradicts.length > 0) ? "contradicted" : related.length ? "supported" : "unresolved"; }
  }

  private rankHypotheses(): void {
    for (const hypothesis of this.hypotheses.values()) {
      const linkedContradictions = hypothesis.supportingEvidenceIds.flatMap((id) => this.evidence.get(id)?.contradicts ?? []);
      hypothesis.contradictingEvidenceIds = [...new Set([...hypothesis.contradictingEvidenceIds, ...linkedContradictions])]
        .filter((id) => this.evidence.has(id));
      const signals = [
        ...hypothesis.supportingEvidenceIds.map((id) => this.evidence.get(id)).filter(Boolean).map((evidence) => ({
          direction: "support" as const,
          sourceReliability: evidence!.sourceTier === "A" ? 0.9 : evidence!.sourceTier === "C" ? 0.55 : 0.7,
          sourceIndependence: scoreSourceIndependence({ sourceHosts: evidence!.sourceHost ? [evidence!.sourceHost] : [], sourceClasses: [evidence!.sourceClass] }),
          identitySpecificity: overlap(hypothesis.entity, evidence!.claim),
        })),
        ...hypothesis.contradictingEvidenceIds.map((id) => this.evidence.get(id)).filter(Boolean).map((evidence) => ({
          direction: "contradict" as const,
          sourceReliability: evidence!.sourceTier === "A" ? 0.9 : evidence!.sourceTier === "C" ? 0.55 : 0.7,
          sourceIndependence: scoreSourceIndependence({ sourceHosts: evidence!.sourceHost ? [evidence!.sourceHost] : [], sourceClasses: [evidence!.sourceClass] }),
          identitySpecificity: overlap(hypothesis.entity, evidence!.claim),
        })),
      ];
      // Recompute from the stable prior; buildContext/rankHypotheses may run repeatedly.
      if (hypothesis.priorScore == null) hypothesis.priorScore = hypothesis.score;
      const posterior = updateHypothesisPosterior(hypothesis.priorScore, signals);
      hypothesis.score = posterior.score;
      hypothesis.logOdds = posterior.logOdds;
      if (hypothesis.score >= 0.75) hypothesis.missingDiscriminators = hypothesis.missingDiscriminators.filter((item) => item.trim());
      const discriminator = chooseBestDiscriminator({ missingDiscriminators: hypothesis.missingDiscriminators, contradictionPressure: posterior.contradictionWeight, unresolvedPressure: hypothesis.missingDiscriminators.length });
      if (discriminator && !hypothesis.missingDiscriminators.includes(discriminator)) hypothesis.missingDiscriminators.push(discriminator);
    }
    const ranked = [...this.hypotheses.values()].sort((a, b) => b.score - a.score);
    ranked.forEach((hypothesis, index) => { hypothesis.status = index === 0 ? "leading" : hypothesis.score < 0.2 ? "rejected" : "alternative"; });
  }

  buildContext(): IntelligenceContext {
    this.rankHypotheses();
    const claims = [...this.claims.values()];
    const evidenceFor = (claim: IntelligenceClaim) => claim.evidenceIds.map((id) => this.evidence.get(id)).filter((item): item is IntelligenceEvidence => Boolean(item));
    const substantive = (claim: IntelligenceClaim) => evidenceFor(claim).some((item) => item.kind === "finding" || item.kind === "claim");
    const facts = claims.filter((claim) => claim.status === "supported" && substantive(claim)).sort((a, b) => b.evidenceIds.length - a.evidenceIds.length).map((claim) => ({ claim: `${claim.subject} ${claim.predicate} ${claim.object}`, evidenceIds: [...claim.evidenceIds], sources: [...claim.sourceHosts] })); for (const contact of this.contacts.values()) { const claim = `${contact.personName ?? this.input.target} ${contact.vector} ${contact.value}`; if (!facts.some((fact) => fact.claim === claim)) { const evidenceIds = [...this.evidence.values()].filter((item) => item.value === contact.value && item.claim.toLowerCase().startsWith(`${(contact.personName ?? this.input.target).toLowerCase()} `)).map((item) => item.id); facts.push({ claim, evidenceIds, sources: [...contact.sourceHosts] }); } }
    const contradictionGroups = new Map<string, IntelligenceEvidence[]>(); for (const evidence of this.evidence.values()) { const parsed = extractPredicate(evidence.claim); const key = normalize(`${parsed.subject}|${parsed.predicate}`); const list = contradictionGroups.get(key) ?? []; list.push(evidence); contradictionGroups.set(key, list); } const contradictions = [...contradictionGroups.values()].filter((list) => { const predicate = extractPredicate(list[0]?.claim ?? "").predicate; return !["email", "phone", "social", "website"].includes(predicate) && new Set(list.map((item) => normalize(extractPredicate(item.claim).object))).size > 1; }).map((list) => { const ids = [...new Set(list.map((item) => item.id))]; const first = extractPredicate(list[0]?.claim ?? ""); return { claim: `${first.subject} ${first.predicate} ${first.object}`, evidenceIds: ids, sources: [...new Set(list.map((item) => item.sourceHost).filter(Boolean) as string[])] }; });
    const unresolved = [...this.hypotheses.values()].flatMap((item) => item.missingDiscriminators).filter(Boolean);
    const openQuestions = [...new Set([...unresolved, ...contradictions.map((item) => `Resolve contradiction: ${item.claim}`)])];
    // Search-result URLs are discovery leads. They are retained in atomic
    // observations for the Investigator, but they do not count as corroborated
    // source coverage until a non-search capability observes the source or a
    // model-authored finding binds to it.
    const evidenceBearing = [...this.evidence.values()].filter((item) =>
      item.kind === "finding"
      || item.kind === "claim"
      || (item.kind === "observation" && !["web_search", "parallel_web_search"].includes(item.action)),
    );
    const evidenceCount = [...this.evidence.values()].filter((item) => item.kind === "finding" || item.kind === "claim").length;
    const sourceHosts = [...new Set(evidenceBearing.map((item) => item.sourceHost).filter(Boolean) as string[])];
    const sourceFamilies = sourceHosts.map(sourceFamily);
    const familyCounts = new Map<string, number>(); for (const family of sourceFamilies) familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
    const repeatedSourceFamilies = [...familyCounts.entries()].filter(([, count]) => count >= 3).map(([family]) => family);
    const sourceDiversity = sourceHosts.length;
    const sourceFamilyDiversity = new Set(sourceFamilies).size;
    const sourceQualityCounts = new Map<IntelligenceSourceClass, number>();
    for (const evidence of evidenceBearing) sourceQualityCounts.set(evidence.sourceClass, (sourceQualityCounts.get(evidence.sourceClass) ?? 0) + 1);
    const sourceQualitySummary = [...sourceQualityCounts.entries()].map(([sourceClass, count]) => ({ sourceClass, count })).sort((a, b) => b.count - a.count);
    const sourceIndependence = scoreSourceIndependence({ sourceHosts, sourceClasses: [...sourceQualityCounts.keys()], repeatedFamilyCount: repeatedSourceFamilies.length });
    const independentSourceUnits = this.sourceLineage.independentUnitCount([...this.evidence.values()].filter((e) => e.kind === "finding" || e.kind === "claim").map((e) => e.sourceLineageId).filter((id): id is string => Boolean(id)));
    const providerGroups = new Map<string, Map<string, Set<string>>>();
    for (const action of this.actions) {
      const provider = typeof action.args.provider === "string" ? action.args.provider : null;
      const rawQuestion = typeof action.args.purpose === "string" && action.args.purpose.trim() ? action.args.purpose : typeof action.args.hypothesis === "string" && action.args.hypothesis.trim() ? action.args.hypothesis : typeof action.args.query === "string" ? action.args.query : null;
      const query = rawQuestion ? normalize(rawQuestion) : null;
      if (!provider || !query || action.action !== "web_search") continue;
      const group = providerGroups.get(query) ?? new Map<string, Set<string>>();
      const hosts = group.get(provider) ?? new Set<string>();
      for (const url of action.urls) {
        const host = hostOf(url);
        if (host) hosts.add(host);
      }
      group.set(provider, hosts);
      providerGroups.set(query, group);
    }
    const providerDisagreements = [...providerGroups.entries()]
      .filter(([, providers]) => providers.size >= 2)
      .map(([query, providers]) => ({
        query,
        providers: [...providers.keys()],
        sourceHosts: [...new Set([...providers.values()].flatMap((hosts) => [...hosts]))],
      }))
      .filter((item) => item.sourceHosts.length >= 2);
    const atomicEvidence = [...this.evidence.values()]
      .filter((evidence) => evidence.kind !== "negative" && !(evidence.kind === "observation" && ["web_search", "parallel_web_search"].includes(evidence.action)))
      .slice(-24)
      .map((evidence) => ({
        evidenceId: evidence.id,
        kind: evidence.kind,
        claimId: evidence.claimId,
        claim: evidence.claim,
        sourceUrl: evidence.sourceUrl,
        sourceHost: evidence.sourceHost,
        sourceClass: evidence.sourceClass,
        passage: evidence.passage,
        attribution: evidence.attribution ?? null,
      }));
    const actionYield = [...this.actionYield.entries()].map(([action, stat]) => summarizeActionYield(action, stat));
    const researchQuestions = openQuestions.map((question, index) => ({ id: "rq_" + hash(question).slice(0, 16), question, importance: Math.max(0.5, 1 - index * 0.05), uncertainty: 1, discriminators: [question], status: "open" as const }));
    const frontier = assessResearchFrontier({ sourceFamilyDiversity, repeatedSourceFamilies: repeatedSourceFamilies.length, evidenceCount, unresolvedQuestions: openQuestions.length, contradictions: contradictions.length, contactCount: this.contacts.size });
    const leadingHypothesis = [...this.hypotheses.values()].sort((a, b) => b.score - a.score)[0] ?? null;
    const falsification = assessFalsificationPlan({ leadingHypothesisScore: leadingHypothesis?.score ?? null, contradictionPressure: frontier.contradictionPressure, unresolvedPressure: frontier.unresolvedPressure, missingDiscriminators: leadingHypothesis?.missingDiscriminators ?? openQuestions });
    const discovery = buildDiscoveryIntelligence({
      objective: this.input.objective + String.fromCharCode(10) + "SOURCE_FAMILIES:" + this.actions.map((action) => action.action),
      facts,
      hypotheses: [...this.hypotheses.values()],
      negativeFindings: [...this.negativeFindings],
      actions: this.actions.map((action) => ({
        action: action.action,
        args: action.args,
        execution: action.execution,
        urls: action.urls,
        findingNames: action.findingNames,
        findingRoles: action.findingRoles,
      })),
      sourceFamilyDiversity,
      repeatedSourceFamilies,
    });
    const missionBriefs = this.buildMissionBriefs(openQuestions, facts, contradictions);
    const coverage = clamp((facts.length * 0.035) + (sourceDiversity * 0.05) + (this.contacts.size * 0.03) - (contradictions.length * 0.04));
    return { version: 1, caseId: this.input.caseId ?? null, executionId: this.input.executionId, target: this.input.target, objective: this.input.objective, facts, hypotheses: [...this.hypotheses.values()], contradictions, contacts: [...this.contacts.values()], negativeFindings: [...this.negativeFindings], openQuestions, recentActions: [...this.actions], sourceDiversity, sourceFamilyDiversity, repeatedSourceFamilies, evidenceCount, provenanceDigest: this.chain, missionBriefs, sourceQualitySummary, frontier, sourceIndependence, providerDisagreements, atomicEvidence, actionYield, sourceLineage: this.sourceLineage.snapshot().map((node) => ({ sourceId: node.sourceId, canonicalUrl: node.canonicalUrl, host: node.host, originSourceId: node.originSourceId, citedSourceIds: node.citedSourceIds })), independentSourceUnits, researchQuestions, falsification, discovery, stoppingAssessment: { evidenceCoverage: coverage, unresolvedQuestions: openQuestions.length, recommendation: openQuestions.length > 0 || coverage < 0.8 ? "continue" : "review" } };
  }

  private buildMissionBriefs(openQuestions: string[], facts: Array<{ claim: string }>, contradictions: Array<{ claim: string }>): IntelligenceMissionBrief[] {
    const gaps = openQuestions.length ? openQuestions : ["No explicit gap recorded; independently test the leading hypothesis."];
    return [
      { mission: "identity", objective: `Determine whether the target identity is correctly resolved: ${this.input.target}`, evidenceGap: gaps[0]!, availableCapabilities: ["web_search", "visit", "registry_search", "domain_lookup"] },
      { mission: "organization", objective: "Map current and historical organizations, roles, ownership and authoritative records.", evidenceGap: gaps[1] ?? "Corroborate organization relationships from independent sources.", availableCapabilities: ["web_search", "visit", "registry_search", "domain_lookup", "browser_fetch"] },
      { mission: "contact", objective: "Find an attributable public contact route and verify its relationship to the resolved entity.", evidenceGap: facts.find((fact) => /email|phone|linkedin|website/i.test(fact.claim))?.claim ?? "No strong attributable contact route yet.", availableCapabilities: ["web_search", "visit", "footprint_email", "domain_lookup", "harvest_domain"] },
      { mission: "disproof", objective: "Actively seek evidence that would falsify the leading identity or contact hypothesis.", evidenceGap: contradictions[0]?.claim ?? "No contradiction has been tested yet.", availableCapabilities: ["web_search", "visit", "registry_search", "browser_fetch"] },
    ];
  }

  getFeedbackStats(): Record<ResearchFeedback["outcome"], number> {
    const outcomes: ResearchFeedback["outcome"][] = ["useful", "wrong_person", "duplicate", "outdated", "bounced", "successful_outreach", "rejected"];
    return Object.fromEntries(outcomes.map((outcome) => [outcome, this.feedback.filter((item) => item.outcome === outcome).length])) as Record<ResearchFeedback["outcome"], number>;
  }
}

function headTailItems<T>(values: readonly T[], maxItems: number): T[] {
  if (values.length <= maxItems) return [...values];
  if (maxItems <= 1) return values.slice(-1);
  const head = Math.ceil(maxItems / 2);
  return [...values.slice(0, head), ...values.slice(-(maxItems - head))];
}

function compactActionArgs(args: Record<string, unknown>, maxKeys: number): Record<string, unknown> {
  const priority = /^(?:query|url|target|name|company|domain|email|phone|role|purpose|question|objective|hypothesis|provider|registry)$/i;
  const entries = Object.entries(args);
  const ranked = [...entries].sort(([a], [b]) => Number(priority.test(b)) - Number(priority.test(a)));
  return Object.fromEntries(ranked.slice(0, maxKeys));
}

export function renderIntelligenceContext(context: IntelligenceContext, maxChars = 6_000): string {
  const bounded = {
    version: context.version,
    caseId: context.caseId,
    executionId: context.executionId,
    target: context.target,
    objective: context.objective.slice(0, 1_500),
    facts: headTailItems(context.facts, 12).map((fact) => ({ claim: fact.claim.slice(0, 500), evidenceIds: headTailItems(fact.evidenceIds, 8), sources: headTailItems(fact.sources, 6) })),
    hypotheses: [...context.hypotheses].sort((a, b) => b.score - a.score).slice(0, 8).map((hypothesis) => ({ ...hypothesis, label: hypothesis.label.slice(0, 300), entity: hypothesis.entity.slice(0, 240), supportingEvidenceIds: headTailItems(hypothesis.supportingEvidenceIds, 8), contradictingEvidenceIds: headTailItems(hypothesis.contradictingEvidenceIds, 8), missingDiscriminators: headTailItems(hypothesis.missingDiscriminators, 8).map((v) => v.slice(0, 300)) })),
    contradictions: headTailItems(context.contradictions, 8).map((item) => ({ claim: item.claim.slice(0, 500), evidenceIds: headTailItems(item.evidenceIds, 8), sources: headTailItems(item.sources, 6) })),
    contacts: headTailItems(context.contacts, 10).map((contact) => ({ ...contact, value: contact.value.slice(0, 300), sourceUrls: headTailItems(contact.sourceUrls, 6), sourceHosts: headTailItems(contact.sourceHosts, 6) })),
    negativeFindings: headTailItems(context.negativeFindings, 12).map((v) => v.slice(0, 400)),
    openQuestions: headTailItems(context.openQuestions, 12).map((v) => v.slice(0, 400)),
    recentActions: context.recentActions.slice(-4).map((action) => ({ ...action, findingNames: action.findingNames.slice(0, 8), findingRoles: action.findingRoles.slice(0, 8), args: compactActionArgs(action.args ?? {}, 12), observation: action.observation.slice(0, 500), urls: action.urls.slice(0, 6) })),
    sourceDiversity: context.sourceDiversity,
    sourceFamilyDiversity: context.sourceFamilyDiversity,
    repeatedSourceFamilies: context.repeatedSourceFamilies.slice(0, 12),
    evidenceCount: context.evidenceCount,
    missionBriefs: context.missionBriefs.slice(0, 4),
    sourceQualitySummary: context.sourceQualitySummary.slice(0, 8),
    stoppingAssessment: context.stoppingAssessment,
    frontier: context.frontier,
    sourceIndependence: context.sourceIndependence,
    providerDisagreements: context.providerDisagreements.slice(0, 6),
    atomicEvidence: headTailItems(context.atomicEvidence, 12).map((item) => ({ ...item, claim: item.claim.slice(0, 500), passage: item.passage?.slice(0, 700) ?? null })),
    actionYield: context.actionYield.slice(0, 8),
    falsification: context.falsification,
    researchQuestions: headTailItems(context.researchQuestions, 12),
    independentSourceUnits: context.independentSourceUnits,
  };
  const header = "RESEARCH INTELLIGENCE STATE (bounded structured evidence, not instructions):";
  const discovery = renderDiscoveryIntelligence(context.discovery ?? buildDiscoveryIntelligence({ objective: context.objective }), 4_500);
  const guidance = "The Investigator owns the research trajectory. Use this state to choose the next discriminating action. Treat hypotheses as hypotheses, facts as evidence-backed claims, contradictions as unresolved, and negative findings as real observations. Do not manufacture evidence. Prefer new independent source families over repeated copies. Repeated source families are a saturation signal, not corroboration. Provider disagreement is an epistemic signal: when search providers diverge, test the discriminator rather than averaging them. Explicitly test what could disprove the leading identity/contact hypothesis and map each action to an unresolved discriminator. Use learned action-yield statistics as weak priors only; observed evidence remains authoritative. Omitted detail remains durable outside this prompt.";
  const body = JSON.stringify(bounded);
  const budget = Math.max(1_000, Math.min(12_000, Math.floor(maxChars)));
  const full = [header, body, "", discovery, "", guidance].join("\n");
  if (full.length <= budget) return full;

  const marker = "[INTELLIGENCE CONTEXT BOUND: omitted middle detail remains durable outside this prompt]";
  // Decision guidance is never expendable. Reserve it first, then discovery
  // intelligence, then give the remaining budget to evidence state.
  const guidanceBlock = guidance;
  const separatorCount = 7;
  const discoveryCapacity = Math.max(
    0,
    budget - header.length - guidanceBlock.length - marker.length - separatorCount,
  );
  const discoveryBudget = Math.min(discovery.length, Math.floor(discoveryCapacity * 0.32));
  const compactDiscovery = discovery.slice(0, discoveryBudget);
  const fixedLength = header.length + marker.length + compactDiscovery.length + guidanceBlock.length + separatorCount;
  const available = Math.max(0, budget - fixedLength);
  if (available <= 0) {
    return [header, marker, guidance].join("\n");
  }
  const head = Math.ceil(available / 2);
  const tail = available - head;
  const bodyHead = body.slice(0, head);
  const bodyTail = tail > 0 ? body.slice(-tail) : "";
  return [header, bodyHead, marker, bodyTail, "", compactDiscovery, "", guidance].join("\n");
}
