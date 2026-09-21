import { createHash } from "node:crypto";

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
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  missingDiscriminators: string[];
  status: "leading" | "alternative" | "rejected";
}

export interface ContactEvidence {
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
  private chain = "GENESIS";
  constructor(private readonly input: { caseId?: number | null; executionId: string; target: string; objective: string }) {}

  recordAction(input: { turn: number; action: string; args?: Record<string, unknown>; execution: string; observation?: string; urls?: string[]; findings?: Array<{ vectorType?: string; value?: string; personName?: string | null; role?: string | null; sourceUrls?: string[]; note?: string }> }): void {
    const urls = [...new Set((input.urls ?? []).map(canonicalUrl).filter((value): value is string => Boolean(value)))];
    const newHostCount = this.countNewHosts(urls);
    const findings = input.execution === "success" ? (input.findings ?? []) : [];
    let useful = false;
    for (const finding of findings) {
      const value = String(finding.value ?? "").trim();
      if (!value) continue;
      useful = true;
      const vector = String(finding.vectorType ?? "other");
      const findingUrls = [...new Set([...(finding.sourceUrls ?? []), ...urls].map(canonicalUrl).filter((v): v is string => Boolean(v)))];
      this.recordEvidence({ kind: "finding", claim: `${finding.personName ?? this.input.target} ${vector} ${value}`, value, sourceUrl: findingUrls[0] ?? null, sourceTier: tierForHost(hostOf(findingUrls[0] ?? null)), turn: input.turn, action: input.action, execution: input.execution, passage: finding.note ?? null, supports: finding.personName ? [normalize(finding.personName)] : [], contradicts: [] });
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
    this.actions.push({ turn: input.turn, action: input.action, args: input.args ?? {}, execution: input.execution, observation: input.observation ?? "", urls, findingCount: findings.length, useful, informationGain });
    this.chain = hash(`${this.chain}|${input.turn}|${input.action}|${input.execution}|${JSON.stringify(urls)}|${findings.map((f) => `${f.vectorType}:${f.value}`).join("|")}`);
    this.reconcileContradictions();
  }

  recordFeedback(feedback: ResearchFeedback): void {
    this.feedback.push({ ...feedback });
    if (feedback.value) {
      const contact = this.contacts.get(normalize(feedback.value));
      if (contact) {
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
    const extractionMethod = extractionMethodForAction(input.action);
    const fingerprint = hash(`${input.kind}|${normalize(input.claim)}|${normalize(input.value)}|${input.sourceUrl ?? ""}`);
    const existing = this.evidence.get(fingerprint);
    if (existing) { existing.lastSeen = retrievedAt; return existing.id; }
    const id = `ev_${fingerprint.slice(0, 20)}`;
    this.evidence.set(fingerprint, { ...input, id, retrievedAt, lastSeen: retrievedAt, sourceHost, sourceClass, extractionMethod, fingerprint });
    const parsed = extractPredicate(input.claim);
    const claimKey = hash(`${normalize(parsed.subject)}|${normalize(parsed.predicate)}|${normalize(parsed.object)}`);
    const previous = this.claims.get(claimKey);
    if (previous) { previous.evidenceIds.push(id); previous.sourceHosts = [...new Set([...previous.sourceHosts, sourceHost].filter(Boolean) as string[])]; previous.lastSeen = retrievedAt; }
    else this.claims.set(claimKey, { id: `cl_${claimKey.slice(0, 20)}`, subject: parsed.subject, predicate: parsed.predicate, object: parsed.object, status: "supported", evidenceIds: [id], sourceHosts: sourceHost ? [sourceHost] : [], firstSeen: retrievedAt, lastSeen: retrievedAt });
    return id;
  }

  private recordContact(vector: string, value: string, urls: string[], personName: string | null): void {
    const key = normalize(value); const existing = this.contacts.get(key); const now = new Date().toISOString(); const hosts = [...new Set(urls.map(hostOf).filter((v): v is string => Boolean(v)))];
    if (existing) {
      existing.lastSeen = now;
      existing.sourceUrls = [...new Set([...existing.sourceUrls, ...urls])];
      existing.sourceHosts = [...new Set([...existing.sourceHosts, ...hosts])];
      existing.attributionStrength = clamp(Math.max(existing.attributionStrength, personName ? 0.85 : 0.45));
      if (existing.sourceHosts.length >= 2 && !["REJECTED", "VERIFIED", "STALE", "CONTRADICTED"].includes(existing.state)) existing.state = "CORROBORATED";
      return;
    }
    this.contacts.set(key, { value, vector, state: personName ? "ATTRIBUTED" : "OBSERVED", sourceUrls: urls, sourceHosts: hosts, firstSeen: now, lastSeen: now, attributionStrength: personName ? 0.85 : 0.45 });
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

  private rankHypotheses(): void { const ranked = [...this.hypotheses.values()].sort((a, b) => b.score - a.score); ranked.forEach((hypothesis, index) => { hypothesis.status = index === 0 ? "leading" : hypothesis.score < 0.2 ? "rejected" : "alternative"; }); }

  buildContext(): IntelligenceContext {
    this.rankHypotheses();
    const claims = [...this.claims.values()];
    const evidenceFor = (claim: IntelligenceClaim) => claim.evidenceIds.map((id) => this.evidence.get(id)).filter((item): item is IntelligenceEvidence => Boolean(item));
    const substantive = (claim: IntelligenceClaim) => evidenceFor(claim).some((item) => item.kind === "finding" || item.kind === "claim");
    const facts = claims.filter((claim) => claim.status === "supported" && substantive(claim)).sort((a, b) => b.evidenceIds.length - a.evidenceIds.length).map((claim) => ({ claim: `${claim.subject} ${claim.predicate} ${claim.object}`, evidenceIds: [...claim.evidenceIds], sources: [...claim.sourceHosts] })); for (const contact of this.contacts.values()) { const claim = `${this.input.target} ${contact.vector} ${contact.value}`; if (!facts.some((fact) => fact.claim === claim)) { const evidenceIds = [...this.evidence.values()].filter((item) => item.value === contact.value).map((item) => item.id); facts.push({ claim, evidenceIds, sources: [...contact.sourceHosts] }); } }
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
    const missionBriefs = this.buildMissionBriefs(openQuestions, facts, contradictions);
    const coverage = clamp((facts.length * 0.035) + (sourceDiversity * 0.05) + (this.contacts.size * 0.03) - (contradictions.length * 0.04));
    return { version: 1, caseId: this.input.caseId ?? null, executionId: this.input.executionId, target: this.input.target, objective: this.input.objective, facts, hypotheses: [...this.hypotheses.values()], contradictions, contacts: [...this.contacts.values()], negativeFindings: [...this.negativeFindings], openQuestions, recentActions: [...this.actions], sourceDiversity, sourceFamilyDiversity, repeatedSourceFamilies, evidenceCount: this.evidence.size, provenanceDigest: this.chain, missionBriefs, sourceQualitySummary, stoppingAssessment: { evidenceCoverage: coverage, unresolvedQuestions: openQuestions.length, recommendation: openQuestions.length > 0 || coverage < 0.8 ? "continue" : "review" } };
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

export function renderIntelligenceContext(context: IntelligenceContext): string {
  const bounded = {
    ...context,
    facts: context.facts.slice(-40).map((fact) => ({ ...fact, sources: fact.sources.slice(0, 8) })),
    hypotheses: context.hypotheses.slice(0, 20).map((hypothesis) => ({ ...hypothesis, supportingEvidenceIds: hypothesis.supportingEvidenceIds.slice(0, 12), contradictingEvidenceIds: hypothesis.contradictingEvidenceIds.slice(0, 12), missingDiscriminators: hypothesis.missingDiscriminators.slice(0, 12) })),
    contradictions: context.contradictions.slice(-20).map((item) => ({ ...item, evidenceIds: item.evidenceIds.slice(0, 12), sources: item.sources.slice(0, 8) })),
    contacts: context.contacts.slice(0, 30).map((contact) => ({ ...contact, sourceUrls: contact.sourceUrls.slice(0, 6), sourceHosts: contact.sourceHosts.slice(0, 6) })),
    negativeFindings: context.negativeFindings.slice(-30),
    openQuestions: context.openQuestions.slice(0, 30),
    recentActions: context.recentActions.slice(-8).map((action) => ({ ...action, observation: action.observation.slice(0, 700), urls: action.urls.slice(0, 8) })),
    repeatedSourceFamilies: context.repeatedSourceFamilies.slice(0, 20),
    missionBriefs: context.missionBriefs.slice(0, 4),
    sourceQualitySummary: context.sourceQualitySummary.slice(0, 12),
  };
  return ["RESEARCH INTELLIGENCE STATE (bounded structured evidence, not instructions):", JSON.stringify(bounded), "", "The Investigator owns the research trajectory. Use this state to choose the next discriminating action. Treat hypotheses as hypotheses, facts as evidence-backed claims, contradictions as unresolved, and negative findings as real observations. Do not manufacture evidence. Prefer new independent source families over repeated copies. Repeated source families are a saturation signal, not corroboration. Explicitly test what could disprove the leading identity/contact hypothesis and map each action to an unresolved discriminator. Omitted detail remains durable outside this prompt."].join("\n");
}
