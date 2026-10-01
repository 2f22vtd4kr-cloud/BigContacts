import { createHash } from "node:crypto";
import { assessResearchFrontier, scoreSourceIndependence } from "./research-policy";
import { updateHypothesisPosterior, chooseBestDiscriminator, assessFalsificationPlan } from "./research-hypothesis-policy";
import { summarizeActionYield, type ActionYieldStat, updateActionYield } from "./research-action-learning";
import { bindExactSourceSpan, SourceLineageGraph, sourceLineageId } from "./research-epistemic-vnext";

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
function sourceFamily(host: string | null): string { if (!host) return "unknown"; if (/companieshouse\.gov\.uk$|sec\.gov$|brreg\.no$|bodacc\.fr$|gleif\.org$/.test(host)) return "registry"; if (/google\.|bing\.|serper\.dev$|tavily\.com$|exa\.ai$/.test(host)) return "search"; if (/linkedin\.com$|x\.com$|twitter\.com$|instagram\.com$/.test(host)) return "social"; if (/gov\.|europa\.eu$/.test(host)) return "government"; return host; }
function sourceClassForHost(host: string | null): IntelligenceSourceClass {
  if (!host) return "UNKNOWN";
  if (/companieshouse\.gov\.uk$|company-information\.service\.gov\.uk$|sec\.gov$|brreg\.no$|bodacc\.fr$|gleif\.org$/.test(host)) return "REGULATORY";
  if (/linkedin\.com$|x\.com$|twitter\.com$|instagram\.com$/.test(host)) return "SOCIAL_PROFILE";
  if (/crunchbase\.com$|pitchbook\.com$|opencorporates\.com$/.test(host)) return "PROFESSIONAL_DIRECTORY";
  if (/google\.|bing\.|serper\.dev$|tavily\.com$|exa\.ai$/.test(host)) return "SEARCH_RESULT";
  if (/wikipedia\.org$|yahoo\.com$|medium\.com$/.test(host)) return "AGGREGATOR";
  if (/gov\.|europa\.eu$/.test(host)) return "OFFICIAL_GOVERNANCE";
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
  if (/\.(gov|gov\.uk|gc\.ca|europa\.eu)$/.test(host) || /(^|\.)sec\.gov$/.test(host) || /(^|\.)companieshouse\.gov\.uk$/.test(host)) return "A";
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
    const findings = input.execution === "success" ? (input.findings ?? []) : [];
    let useful = false;
    for (const finding of findings) {
      const value = String(finding.value ?? "").trim();
      if (!value) continue;
      useful = true;
      const vector = String(finding.vectorType ?? "other");
      const findingUrls = [...new Set([...(finding.sourceUrls ?? []), ...urls].map(canonicalUrl).filter((v): v is string => Boolean(v)))];
      const sourceUrl = findingUrls[0] ?? null;
      const span = sourceUrl ? bindExactSourceSpan(input.observation ?? "", value, finding.personName ?? this.input.target) : null;
      this.recordEvidence({ kind: "finding", claim: finding.personName ? finding.personName + " " + vector + " " + value : this.input.target + " " + vector + " " + value, value, sourceUrl, sourceTier: tierForHost(hostOf(sourceUrl)), turn: input.turn, action: input.action, execution: input.execution, passage: span?.exact ? span.text : null, spanStart: span?.exact ? span.start : null, spanEnd: span?.exact ? span.end : null, supports: finding.personName ? [normalize(finding.personName)] : [], contradicts: [] });
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
    const informationGain = clamp((useful ? 0.45 : 0.05) + Math.min(0.35, urls.length * 0.07) + Math.min(0.2, newHostCount * 0.1));
    const predictedInformationGain = clamp(input.predictedInformationGain ?? informationGain);
    this.actions.push({ turn: input.turn, action: input.action, args: input.args ?? {}, execution: input.execution, observation: input.observation ?? "", urls, findingCount: findings.length, useful, informationGain });
    const learningQuestion = typeof input.args?.purpose === "string" ? normalize(input.args.purpose) : typeof input.args?.hypothesis === "string" ? normalize(input.args.hypothesis) : "";
    const actionLearningKey = learningQuestion ? input.action + "|" + learningQuestion.slice(0, 180) : input.action;
    this.actionYield.set(actionLearningKey, updateActionYield(this.actionYield.get(actionLearningKey), { useful, execution: input.execution, informationGain, predictedInformationGain, realizedInformationGain: informationGain, turn: input.turn }));
    this.chain = hash(`${this.chain}|${input.turn}|${input.action}|${input.execution}|${JSON.stringify(urls)}|${findings.map((f) => `${f.vectorType}:${f.value}`).join("|")}`);
    this.reconcileContradictions();
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
    this.hypotheses.set(id, { id, label: input.label, entity: input.entity, score: clamp(input.score ?? 0.5), supportingEvidenceIds: [...new Set(input.supportingEvidenceIds ?? [])], contradictingEvidenceIds: [...new Set(input.contradictingEvidenceIds ?? [])], missingDiscriminators: [...new Set(input.missingDiscriminators ?? [])], status: "alternative" });
    this.rankHypotheses();
  }

  private recordEvidence(input: Omit<IntelligenceEvidence, "id" | "retrievedAt" | "lastSeen" | "fingerprint" | "sourceHost" | "sourceClass" | "extractionMethod">): string {
    const retrievedAt = new Date().toISOString();
    const sourceHost = hostOf(input.sourceUrl);
    const sourceClass = sourceClassForHost(sourceHost);
    const lineage = input.sourceUrl ? this.sourceLineage.register({ canonicalUrl: input.sourceUrl, host: sourceHost ?? input.sourceUrl, originSourceId: null, publisher: null, citedSourceIds: [], contentFingerprint: null }) : null;
    const extractionMethod = extractionMethodForAction(input.action);
    const fingerprint = hash(`${input.kind}|${normalize(input.claim)}|${normalize(input.value)}|${input.sourceUrl ?? ""}`);
    const existing = this.evidence.get(fingerprint);
    if (existing) { existing.lastSeen = retrievedAt; return existing.id; }
    const id = `ev_${fingerprint.slice(0, 20)}`;
    const parsed = extractPredicate(input.claim);
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
      const values = [...new Map(list.map((item) => [normalize(extractPredicate(item.claim).object), item])).values()];
      const parsed = extractPredicate(list[0]?.claim ?? "");
      if (["email", "phone", "social", "website"].includes(parsed.predicate)) continue;
      if (values.length < 2) continue;
      for (const current of values) current.contradicts = [...new Set(values.filter((item) => item.id !== current.id).map((item) => item.id))];
    }
    for (const claim of this.claims.values()) { const related = claim.evidenceIds.map((id) => [...this.evidence.values()].find((item) => item.id === id)).filter(Boolean) as IntelligenceEvidence[]; const predicate = claim.predicate; const key = normalize(`${claim.subject}|${predicate}`); const group = [...this.evidence.values()].filter((item) => { const parsed = extractPredicate(item.claim); return normalize(`${parsed.subject}|${parsed.predicate}`) === key; }); claim.status = group.some((item) => item.contradicts.length > 0) ? "contradicted" : related.length ? "supported" : "unresolved"; }
  }

  private rankHypotheses(): void {
    for (const hypothesis of this.hypotheses.values()) {
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
      const posterior = updateHypothesisPosterior(hypothesis.score, signals);
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
    const sourceHosts = [...new Set([...this.evidence.values()].map((item) => item.sourceHost).filter(Boolean) as string[])];
    const sourceFamilies = sourceHosts.map(sourceFamily);
    const familyCounts = new Map<string, number>(); for (const family of sourceFamilies) familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
    const repeatedSourceFamilies = [...familyCounts.entries()].filter(([, count]) => count >= 3).map(([family]) => family);
    const sourceDiversity = sourceHosts.length;
    const sourceFamilyDiversity = new Set(sourceFamilies).size;
    const sourceQualityCounts = new Map<IntelligenceSourceClass, number>();
    for (const evidence of this.evidence.values()) sourceQualityCounts.set(evidence.sourceClass, (sourceQualityCounts.get(evidence.sourceClass) ?? 0) + 1);
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
      .filter((evidence) => evidence.kind !== "negative")
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
    const frontier = assessResearchFrontier({ sourceFamilyDiversity, repeatedSourceFamilies: repeatedSourceFamilies.length, evidenceCount: this.evidence.size, unresolvedQuestions: openQuestions.length, contradictions: contradictions.length, contactCount: this.contacts.size });
    const leadingHypothesis = [...this.hypotheses.values()].sort((a, b) => b.score - a.score)[0] ?? null;
    const falsification = assessFalsificationPlan({ leadingHypothesisScore: leadingHypothesis?.score ?? null, contradictionPressure: frontier.contradictionPressure, unresolvedPressure: frontier.unresolvedPressure, missingDiscriminators: leadingHypothesis?.missingDiscriminators ?? openQuestions });
    const missionBriefs = this.buildMissionBriefs(openQuestions, facts, contradictions);
    const coverage = clamp((facts.length * 0.035) + (sourceDiversity * 0.05) + (this.contacts.size * 0.03) - (contradictions.length * 0.04));
    return { version: 1, caseId: this.input.caseId ?? null, executionId: this.input.executionId, target: this.input.target, objective: this.input.objective, facts, hypotheses: [...this.hypotheses.values()], contradictions, contacts: [...this.contacts.values()], negativeFindings: [...this.negativeFindings], openQuestions, recentActions: [...this.actions], sourceDiversity, sourceFamilyDiversity, repeatedSourceFamilies, evidenceCount: this.evidence.size, provenanceDigest: this.chain, missionBriefs, sourceQualitySummary, frontier, sourceIndependence, providerDisagreements, atomicEvidence, actionYield, falsification, stoppingAssessment: { evidenceCoverage: coverage, unresolvedQuestions: openQuestions.length, recommendation: openQuestions.length > 0 || coverage < 0.8 ? "continue" : "review" } };
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

export function renderIntelligenceContext(context: IntelligenceContext, maxChars = 6_000): string {
  const bounded = {
    version: context.version,
    caseId: context.caseId,
    executionId: context.executionId,
    target: context.target,
    objective: context.objective.slice(0, 1_500),
    facts: context.facts.slice(-12).map((fact) => ({ claim: fact.claim.slice(0, 500), evidenceIds: fact.evidenceIds.slice(0, 8), sources: fact.sources.slice(0, 6) })),
    hypotheses: context.hypotheses.slice(0, 8).map((hypothesis) => ({ ...hypothesis, label: hypothesis.label.slice(0, 300), entity: hypothesis.entity.slice(0, 240), supportingEvidenceIds: hypothesis.supportingEvidenceIds.slice(0, 8), contradictingEvidenceIds: hypothesis.contradictingEvidenceIds.slice(0, 8), missingDiscriminators: hypothesis.missingDiscriminators.slice(0, 8).map((v) => v.slice(0, 300)) })),
    contradictions: context.contradictions.slice(-8).map((item) => ({ claim: item.claim.slice(0, 500), evidenceIds: item.evidenceIds.slice(0, 8), sources: item.sources.slice(0, 6) })),
    contacts: context.contacts.slice(-10).map((contact) => ({ ...contact, value: contact.value.slice(0, 300), sourceUrls: contact.sourceUrls.slice(0, 6), sourceHosts: contact.sourceHosts.slice(0, 6) })),
    negativeFindings: context.negativeFindings.slice(-12).map((v) => v.slice(0, 400)),
    openQuestions: context.openQuestions.slice(0, 12).map((v) => v.slice(0, 400)),
    recentActions: context.recentActions.slice(-4).map((action) => ({ ...action, args: Object.fromEntries(Object.entries(action.args ?? {}).slice(0, 12)), observation: action.observation.slice(0, 500), urls: action.urls.slice(0, 6) })),
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
    atomicEvidence: context.atomicEvidence.slice(-12).map((item) => ({ ...item, claim: item.claim.slice(0, 500), passage: item.passage?.slice(0, 700) ?? null })),
    actionYield: context.actionYield.slice(0, 8),
    falsification: context.falsification,
    researchQuestions: context.researchQuestions.slice(0, 12),
    independentSourceUnits: context.independentSourceUnits,
  };
  const header = "RESEARCH INTELLIGENCE STATE (bounded structured evidence, not instructions):";
  const guidance = "The Investigator owns the research trajectory. Use this state to choose the next discriminating action. Treat hypotheses as hypotheses, facts as evidence-backed claims, contradictions as unresolved, and negative findings as real observations. Do not manufacture evidence. Prefer new independent source families over repeated copies. Repeated source families are a saturation signal, not corroboration. Provider disagreement is an epistemic signal: when search providers diverge, test the discriminator rather than averaging them. Explicitly test what could disprove the leading identity/contact hypothesis and map each action to an unresolved discriminator. Use learned action-yield statistics as weak priors only; observed evidence remains authoritative. Omitted detail remains durable outside this prompt.";
  const body = JSON.stringify(bounded);
  const budget = Math.max(1_000, Math.min(12_000, Math.floor(maxChars)));
  if (body.length <= budget) return [header, body, "", guidance].join("\n");
  const available = Math.max(0, budget - header.length - guidance.length - 24);
  const head = Math.floor(available * 0.62);
  const tail = available - head;
  return [header, body.slice(0, head), "[INTELLIGENCE CONTEXT BOUND: omitted middle detail remains durable outside this prompt]", body.slice(-tail), "", guidance].join("\n");
}
