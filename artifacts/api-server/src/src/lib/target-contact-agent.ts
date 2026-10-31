/** Target contact Investigator — model owns findings; deterministic code validates evidence. */
import { eq } from "drizzle-orm";
import { db, entitiesTable, researchCasesTable } from "@workspace/db";
import { logger } from "./logger";
import { getJobStrict } from "./job-queue";
import { runAgenticWebResearch, type AgenticFinding, type AgenticTrajectoryRecord } from "./agentic-web-research";
import { supportsCandidateContactOnSameObservation, isClaimGradeObservationAction, persistSourceBackedBureauContactsForEntity, supportsContactClaimAcrossObservations, type BureauContactLike, type InvestigatorPromotionProvenance } from "./bureau-contact-persist-strict";
import { resolveResearchDepth } from "./research-depth";
import { publishBureauEvent } from "./bureau-live-log";
import { computeContactOutcome } from "./contact-confidence";
import { assessTargetReachability, formatReachabilityDirective } from "./reachability-realism";
import { getAvailableInvestigatorCapabilities, type InvestigatorCapability } from "./investigator-capability-registry";
import { isValidPublicEmail } from "./contact-validation";
import { digSpanStatusFromExecutionStatus, publishDigSpan, spanFromLiveStep } from "./dig-span";
import { buildClaimSupportGraph, graphHasIndependentCorroboration, observationsFromSourceUrls, validateClaimSupportGraph, type EvidenceGraph } from "./source-corroboration";
import { sanitizeUrlForEvidence } from "./url-privacy";
export type TargetContactAgentResult = { stopReason?: "MODEL_DECIDED_DONE" | "OVERSIGHT_STOP" | "ITERATION_BUDGET" | "HARD_TIMEOUT" | "CANCELLED" | "LLM_UNAVAILABLE" | "PARSE_FAILURE" | "UNEXPECTED_ERROR"; iterations: number; status: "completed" | "timeout" | "unavailable" | "error" | "cancelled" | "skipped"; model: string; findings: number; searches: number; visits: number; trajectory: string[]; trajectoryRecords: AgenticTrajectoryRecord[]; evidenceGraphs: EvidenceGraph[]; phone: string | null; email: string | null; phoneSource: string | null; contactOutcome: string | null; executionId?: string; promotionCandidates?: BureauContactLike[]; observedSourceUrls?: string[]; promotionProvenance?: InvestigatorPromotionProvenance };
type InvestigationAct = { action: string; provider?: string; query?: string; url?: string; summary?: string };
function normalizeObservedUrl(raw: string): string | null { try { const safe = sanitizeUrlForEvidence(raw); if (safe.startsWith("[")) return null; const url = new URL(safe); if (url.protocol !== "https:") return null; url.hash = ""; url.hostname = url.hostname.toLowerCase(); return url.href.endsWith("/") ? url.href.slice(0, -1) : url.href; } catch { return null; } }
function observedUrlsFromTrajectory(trajectory: string[], records: AgenticTrajectoryRecord[] = []): Set<string> {
  const observed = new Set<string>();
  for (const record of records) {
    if (record.execution !== "success") continue;
    for (const raw of record.observedUrls ?? []) {
      const normalized = normalizeObservedUrl(raw); if (normalized) observed.add(normalized);
    }
  }
  if (observed.size === 0) {
    for (const line of trajectory) {
      const match = String(line).match(/step\d+:\s+(?:visit|browser_fetch)\s+https?:\/\/\S+\s+execution=success(?:\s+observed=(https?:\/\/\S+))?/i);
      if (match?.[1]) { const normalized = normalizeObservedUrl(match[1]); if (normalized) observed.add(normalized); }
    }
  }
  return observed;
}
function isReviewableObservation(record: AgenticTrajectoryRecord): boolean {
  return record.execution === "success"
    && isClaimGradeObservationAction(record.action)
    && typeof record.observation === "string"
    && record.observation.trim().length > 0;
}
function claimGradeSourceUrlsFromTrajectory(records: AgenticTrajectoryRecord[] = []): Set<string> {
  const observed = new Set<string>();
  for (const record of records) {
    if (!isReviewableObservation(record)) continue;
    for (const raw of record.observedUrls ?? []) {
      const normalized = normalizeObservedUrl(raw);
      if (normalized) observed.add(normalized);
    }
  }
  return observed;
}
function claimAppearsInObservedMaterial(finding: AgenticFinding, records: AgenticTrajectoryRecord[]): boolean {
  const sourceSet = new Set(finding.sourceUrls.map(normalizeObservedUrl).filter((url): url is string => Boolean(url)));
  if (!sourceSet.size) return false;
  const observations = records
    .filter((record) => isReviewableObservation(record))
    .map((record) => ({
      observationText: record.observation ?? "",
      sourceUrls: (record.observedUrls ?? []).map(normalizeObservedUrl).filter((url): url is string => url !== null && sourceSet.has(url)),
    }))
    .filter((record) => record.sourceUrls.length > 0);
  // A candidate's identity and contact value must co-occur in at least one
  // individual claim-grade observation. Cross-page identity/value joins remain
  // reviewable in the Bureau pass, but are not source-backed candidate contacts.
  if (String(finding.scope ?? "").toLowerCase() === "candidate") {
    const locallyBound = observations.some((observation) =>
      observation.sourceUrls.length > 0
      && supportsCandidateContactOnSameObservation(
        observation.observationText,
        finding,
        finding.value,
        finding.vectorType,
      ),
    );
    if (!locallyBound) return false;
  }
  return supportsContactClaimAcrossObservations(observations, finding, finding.value, finding.vectorType);
}

export function sourceBackedFindings(findings: AgenticFinding[], trajectory: string[] = [], records: AgenticTrajectoryRecord[] = []): AgenticFinding[] {
  const observed = claimGradeSourceUrlsFromTrajectory(records);
  return findings
    .filter((finding) => Array.isArray(finding.sourceUrls))
    .map((finding) => ({ ...finding, sourceUrls: [...new Set(finding.sourceUrls.map((url) => normalizeObservedUrl(String(url))).filter((url): url is string => Boolean(url)))] }))
    .filter((finding) => finding.sourceUrls.length > 0 && finding.sourceUrls.every((url) => observed.has(url)) && claimAppearsInObservedMaterial(finding, records));
}

export function buildEvidenceGraphs(findings: AgenticFinding[], records: AgenticTrajectoryRecord[], runId: string | null): EvidenceGraph[] {
  const observedAt = new Date().toISOString();
  return findings.map((finding, index) => {
    const citedUrls = [...new Set(finding.sourceUrls.map(normalizeObservedUrl).filter((url): url is string => url !== null))];
    // A review-only multi-source attribution can be valid across separate pages,
    // but a single-claim support graph may include only pages that individually
    // bind the exact claim. Never draw a "supports" edge from an identity-only
    // page to a contact value that the page does not show.
    const supportingUrls = citedUrls.filter((url) => records.some((record) => {
      if (record.execution !== "success" || !isClaimGradeObservationAction(record.action)) return false;
      const observed = record.observedUrls.map(normalizeObservedUrl).some((observedUrl) => observedUrl === url);
      if (!observed || !record.observation?.trim()) return false;
      return supportsContactClaimAcrossObservations(
        [{ observationText: record.observation, sourceUrls: [url] }],
        { ...finding, sourceUrls: [url] },
        finding.value,
        finding.vectorType,
      );
    }));
    if (!supportingUrls.length) return null;
    const observations = observationsFromSourceUrls(supportingUrls, { observedAt, runId, collectionMethod: "agentic-investigator-attribution", idPrefix: `${runId ?? "run"}:claim:${index + 1}` });
    const claim = {
      id: `claim:${runId ?? "run"}:${index + 1}`,
      subject: finding.personName?.trim() || "organization",
      predicate: finding.vectorType,
      object: finding.value.trim(),
      scope: finding.scope === "unknown" ? "organization" : finding.scope,
      personName: finding.personName?.trim() || null,
      confidence: null,
    } as const;
    const graph = buildClaimSupportGraph(claim, observations, "Investigator-attributed claim supported by an exact observed source span");
    const validation = validateClaimSupportGraph(graph);
    if (!validation.valid) return { ...graph, edges: [] };
    return graph;
  }).filter((graph): graph is EvidenceGraph => Boolean(graph && graph.edges.length > 0));
}
export function findingsToContacts(findings: Array<{ vectorType: string; value: string; scope: string; personName: string | null; role: string | null; sourceUrls: string[]; note: string; promotionDecision?: "promote" | "reject" }>, _personName: string): BureauContactLike[] { return findings.filter((f) => Array.isArray(f.sourceUrls) && f.sourceUrls.some((url) => /^https:\/\/\S+$/i.test(String(url)))).map((f) => { const explicitPersonName = typeof f.personName === "string" ? f.personName.trim() : ""; const isExplicitCandidate = String(f.scope).toLowerCase() === "candidate" && explicitPersonName.length > 0; return { vectorType: f.vectorType, value: f.value, scope: isExplicitCandidate ? "candidate" : "organization", personName: isExplicitCandidate ? explicitPersonName : null, role: f.role, sourceUrls: f.sourceUrls.filter((url) => /^https:\/\/\S+$/i.test(String(url))), note: `target-agent:${f.note}`, tier: "candidate", state: "review_only", promote: isExplicitCandidate && f.promotionDecision === "promote" }; }); }
async function validateTargetCaseBinding(caseId: number | undefined, entityId: number, jobId?: string): Promise<Record<string, unknown> | null> { if (caseId == null || !Number.isSafeInteger(caseId) || caseId <= 0 || !jobId?.trim()) return null; const [row] = await db.select({ targetEntityId: researchCasesTable.targetEntityId, caseType: researchCasesTable.caseType, caseFile: researchCasesTable.caseFile }).from(researchCasesTable).where(eq(researchCasesTable.id, caseId)).limit(1); if (!row || row.caseType !== "target" || row.targetEntityId !== entityId || !row.caseFile) return null; try { const parsed = JSON.parse(row.caseFile) as Record<string, unknown>; if (parsed.atlasJobId === jobId) return parsed; return null; } catch { return null; } }
async function resolveSelectedInvestigator(input: { investigatorLlm?: InvestigatorCapability; caseId?: number; entityId: number; jobId?: string }): Promise<{ investigator: InvestigatorCapability; caseId: number } | null> { if (input.caseId == null || !Number.isSafeInteger(input.caseId)) return null; const parsed = await validateTargetCaseBinding(input.caseId, input.entityId, input.jobId); if (!parsed) { logger.warn({ entityId: input.entityId, caseId: input.caseId, jobId: input.jobId }, "refusing target run with an unbound durable case/job; no durable case-selected Investigator or selection mismatch"); return null; } const selected = parsed.investigatorLlm; if (typeof selected !== "string") return null; const investigator = selected as InvestigatorCapability; if (!getAvailableInvestigatorCapabilities().includes(investigator)) return null; if (input.investigatorLlm && input.investigatorLlm !== investigator) return null; return { investigator, caseId: input.caseId! }; }
function compactReachabilityControl(raw: string): string {
  const value = raw.replace(/\s+/g, " ").trim();
  const fallback = "REALISM / REACHABILITY CONTROL: prefer a realistic, source-backed public/professional/intermediary route; prominence is not access.";
  if (!value) return fallback;
  if (value.length <= 220) return value;

  const status = value.match(/\bStatus:\s*([A-Z_]+)/i);
  const targetMode = value.match(/This is a (RESEARCH-ONLY|TARGETED) (?:target|reachability pass)\./i);
  const score = value.match(/practical access score\s+(\d+)\/100/i);
  const blockers = value.match(/Known blockers:\s*([^\n]+)/i);
  const route = value.match(/prioritize [^.\n]+/i);
  const compact = [
    "REALISM / REACHABILITY CONTROL:",
    status ? `Status ${status[1]!.toUpperCase()}${score ? ` (access score ${score[1]}/100)` : ""}.` : "",
    targetMode?.[0] ?? "",
    route?.[0] ?? "",
    blockers ? `Known blockers: ${blockers[1]!.slice(0, 70)}` : "",
  ].filter(Boolean).join(" ");
  return compact.length > 180 ? compact.slice(0, 177).trimEnd() + "..." : compact || fallback;
}

export function buildTargetContactInvestigatorObjective(input: {
  targetName: string;
  companyName?: string | null;
  targetType?: "person" | "organization" | "asset" | "other";
  reachabilityControl: string;
}): string {
  // Bound the identity labels and realism annotation before composing the prompt.
  // The substantive research and provenance clauses below are fixed, not sliced.
  const targetName = input.targetName.trim();
  const companyName = input.companyName?.trim();
  if (input.targetType === "asset") {
    const assetObjective = [
      `Research the exact public asset or asset record ${targetName}${companyName ? ` (associated in the seed record with ${companyName})` : ""}.`,
      compactReachabilityControl(input.reachabilityControl),
      "Establish the asset's public identity, type, manufacturer/model or registration identifier, jurisdiction, status and source freshness from attributable sources. Preserve historical versus current records.",
      "Distinguish registered owner, beneficial owner, operator, manager, broker, trustee, lienholder and shared/fractional interests. A registrant or operator is not automatically the beneficial owner. Follow entity/person links only when sources explicitly support them; do not infer a natural person from an asset registration.",
      "There is no fixed checklist, provider order, query sequence, or mandatory hop order. The Investigator chooses official registries, operator/issuer publications or other useful public sources based on observed evidence. Preserve exact source URLs and contradictions. Never infer private residence, movements, beneficial ownership, personal wealth or identity from a location or asset alone.",
      "Every contact finding must carry the exact public URL where that value was observed; snippets are leads, not evidence.",
    ].join("\n");
    if (assetObjective.length > 1_900) throw new Error("Asset Investigator objective exceeds its hard prompt budget.");
    return assetObjective;
  }
  if (input.targetType === "other") {
    const generalObjective = [
      `Research the exact public subject ${targetName}${companyName ? ` (seeded association: ${companyName})` : ""} without assuming it is a person, company or asset.`,
      compactReachabilityControl(input.reachabilityControl),
      "First establish what this subject actually represents from the supplied case context and attributable public sources. Preserve its source-record type, identifiers, jurisdiction, date and uncertainty; distinguish people, companies, legal entities, assets, events and transactions rather than coercing one into another.",
      "There is no fixed checklist, provider order, query sequence, or mandatory hop order. The Investigator chooses which useful public records, relationships and contradictions to pursue. Do not infer identity, ownership, beneficial ownership, wealth, family ties or contact routes from a label or association alone. Keep source-backed partial findings reviewable and state what remains unknown.",
      "Every contact finding must carry the exact public URL where that value was observed; snippets are leads, not evidence.",
    ].join("\n");
    if (generalObjective.length > 1_900) throw new Error("General target Investigator objective exceeds its hard prompt budget.");
    return generalObjective;
  }
  if (input.targetType === "organization") {
    const organizationObjective = [
      `Research the organization ${targetName}${companyName ? ` (linked to ${companyName})` : ""} and establish its public business identity and relevant owner/operator/investor routes.`,
      compactReachabilityControl(input.reachabilityControl),
      "Investigate the organization itself, not a guessed person. Verify legal/trading identity, jurisdiction, aliases, operating status, and official website using attributable sources.",
      "Trace directly sourced owners/beneficial owners, controllers, directors/officers, parent/subsidiary links, investments, exits, assets, filings, and material business activity. Distinguish ownership/control from an officer title; do not infer wealth or targetability merely from company size, fame, or a person's role. A relevant person is a separate lead whose name, role, and evidence must remain attributable to that person.",
      "There is no fixed checklist, provider order, query sequence, or mandatory hop order. The Investigator chooses the next action from observed evidence. Every contact finding must carry the exact public URL where that value was observed; snippets are leads, not evidence. Never invent or infer owners, relationships, contacts, assets, or URLs. Keep source-backed company information reviewable even if no person qualifies.",
    ].join("\n");
    if (organizationObjective.length > 1_900) throw new Error("Organization Investigator objective exceeds its hard prompt budget.");
    return organizationObjective;
  }
  const sections = [
    `Research public identity, business interests and realistic public/professional/intermediary routes for ${targetName}${companyName ? ` linked to ${companyName}` : ""}.`,
    compactReachabilityControl(input.reachabilityControl),
    "Investigate the person, not generic company contacts. Verify role, employer, jurisdiction and aliases/transliterations. For wealth potential, require that a public source directly documents a material business, ownership stake, investment, asset, exit or control role; seniority alone is not wealth. Use public beneficial-owner registries and director registries, filings, investment/deal/property records, trade coverage and local-language reporting, with English corroboration when useful. Follow evidence to exact people and ownership/control links; no fixed checklist.",
    "After identity/role verification, seek public, attributable profiles on relevant platforms such as LinkedIn, Facebook, Instagram, X/Twitter or Telegram, plus personal/business websites and official bios through available search/fetch actions; corroborate each profile by exact name plus role/company/location before attributing it. Follow publicly documented family or associate relationships only when a credible public source explicitly states the tie and it clarifies ownership/control, investment or a documented intermediary route. Never infer relationships from surnames, co-location, follows or social-graph proximity. Never guess accounts, handles, private profiles or phone/WhatsApp/Telegram identities.",
    "Prefer a directly published professional contact or documented assistant, office, family-office or intermediary route; a generic inbox, switchboard or social presence alone is not personal access.",
    "Every contact finding must carry the exact public URL where that value was observed. Use the exact URL where observed; snippets are leads, not evidence. Never invent identities, wealth, relationships, contacts or URLs. Do not promote when identity or person/value binding is uncertain. Pivot after failed/repeated fetches and stop when evidence or useful routes are exhausted.",
  ];
  const objective = sections.join("\n");
  if (objective.length <= 1_900) return objective;

  // This fallback keeps the evidence/identity laws intact and only shortens
  // optional route detail; never cut a policy sentence at an arbitrary offset.
  const compactSections = [
    `Target: ${targetName}. Company context is in the case; investigate public identity, business interests and professional routes.`,
    sections[1]!,
    "Investigate the person, not generic company contacts. Verify identity, role and employer. For wealth, require that a public source directly documents a material business, ownership, investment, asset, exit or control; seniority alone is not wealth. Use beneficial-owner registries, filings and local-language reporting; no fixed checklist.",
    "Consider public, attributable profiles (LinkedIn, Facebook, Instagram, X/Twitter, Telegram), official bios and business sites; corroborate name plus role/company/location. Never guess accounts, handles, private profiles or phone/WhatsApp/Telegram identities.",
    "Map family or associate ties only when credible public sources explicitly state them and they clarify ownership/control or a documented intermediary route. Never infer relationships from surnames, co-location, follows or social-graph proximity.",
    "Every contact finding must carry the exact public URL where that value was observed. Use the exact URL where observed; snippets are leads, not evidence. Never invent identities, wealth, ties, contacts or URLs. Do not promote when identity or person/value binding is uncertain; pivot or stop when evidence/routes warrant.",
  ];
  const compactObjective = compactSections.join("\n");
  if (compactObjective.length > 1_900) {
    throw new Error("Target Investigator objective exceeds its hard prompt budget after semantic compaction.");
  }
  return compactObjective;
}

export async function runTargetContactAgent(input: { entityId: number; caseId?: number; targetName: string; companyName?: string | null; targetType?: "person" | "organization" | "asset" | "other"; jobId?: string; maxIterations?: number; hardTimeoutMs?: number; investigatorLlm?: InvestigatorCapability; contextDocument?: string; priorTrajectoryRecords?: readonly AgenticTrajectoryRecord[]; oversightMode?: "internal" | "caller"; shouldCancel?: () => boolean | Promise<boolean>; onTrajectoryRecord?: (record: AgenticTrajectoryRecord) => void | Promise<void>; onInvestigationAct?: (step: InvestigationAct) => void | Promise<void> }): Promise<TargetContactAgentResult> {
  const name = (input.targetName ?? "").trim(); const empty = (): TargetContactAgentResult => ({ iterations: 0, status: "skipped", model: "none", findings: 0, searches: 0, visits: 0, trajectory: [], trajectoryRecords: [], evidenceGraphs: [], phone: null, email: null, phoneSource: null, contactOutcome: null }); if (!Number.isSafeInteger(input.entityId) || input.entityId <= 0 || !name) return empty(); const contextDocument = typeof input.contextDocument === "string" ? input.contextDocument.trim() : ""; if (!contextDocument) { logger.error({ entityId: input.entityId, jobId: input.jobId }, "[target-agent] refusing context-free Investigator run"); return { ...empty(), status: "unavailable" }; } const depth = resolveResearchDepth(); const selected = await resolveSelectedInvestigator(input); if (!selected) return { ...empty(), status: "unavailable" }; const investigatorLlm = selected.investigator;
  const baselineRows = await db.select({
    type: entitiesTable.type,
    email: entitiesTable.email,
    phone: entitiesTable.phone,
    phoneSource: entitiesTable.phoneSource,
    linkedinUrl: entitiesTable.linkedinUrl,
    twitterHandle: entitiesTable.twitterHandle,
    instagramHandle: entitiesTable.instagramHandle,
    telegramHandle: entitiesTable.telegramHandle,
    personalWebsite: entitiesTable.personalWebsite,
    metadata: entitiesTable.metadata,
  }).from(entitiesTable).where(eq(entitiesTable.id, input.entityId)).limit(1);
  const baselineEntity = baselineRows[0];
  let baselineMetadata: Record<string, unknown> = {};
  try {
    const parsed = baselineEntity?.metadata ? JSON.parse(baselineEntity.metadata) as unknown : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) baselineMetadata = parsed as Record<string, unknown>;
  } catch {}
  const metadataText = (key: string): string | null => typeof baselineMetadata[key] === "string" ? baselineMetadata[key] as string : null;
  const metadataNumber = (key: string): number | undefined => typeof baselineMetadata[key] === "number" && Number.isFinite(baselineMetadata[key]) ? baselineMetadata[key] as number : undefined;
  const baselineEmailSource = metadataText("emailSource");
  const baselineContactOutcome = baselineEntity ? computeContactOutcome({
    type: baselineEntity.type,
    email: isValidPublicEmail(baselineEntity.email) ? baselineEntity.email : null,
    phone: baselineEntity.phone,
    phoneSource: baselineEntity.phoneSource,
    emailSource: baselineEmailSource,
    linkedinUrl: baselineEntity.linkedinUrl,
    twitterHandle: baselineEntity.twitterHandle,
    instagramHandle: baselineEntity.instagramHandle,
    telegramHandle: baselineEntity.telegramHandle,
    website: metadataText("website") ?? baselineEntity.personalWebsite,
    bizLocation: metadataText("bizLocation"),
    metadata: baselineEntity.metadata,
  }) : null;
  const reachability = assessTargetReachability({
    type: baselineEntity?.type ?? null,
    estimatedNetWorth: metadataNumber("estimatedNetWorth"),
    email: baselineEntity && isValidPublicEmail(baselineEntity.email) ? baselineEntity.email : null,
    phone: baselineEntity?.phone ?? null,
    phoneSource: baselineEntity?.phoneSource ?? null,
    contactOutcome: baselineContactOutcome,
    contactConfidence: metadataNumber("contactConfidence"),
    linkedinUrl: baselineEntity?.linkedinUrl ?? null,
    twitterHandle: baselineEntity?.twitterHandle ?? null,
    instagramHandle: baselineEntity?.instagramHandle ?? null,
    telegramHandle: baselineEntity?.telegramHandle ?? null,
    knownResidences: metadataText("knownResidences"),
    notes: metadataText("notes"),
    metadata: baselineEntity?.metadata ?? null,
    sourceRegistries: metadataText("sourceRegistries"),
    networkDegree: metadataNumber("networkDegree"),
    gatekeeperConnections: metadataNumber("gatekeeperConnections"),
    intermediaryConnections: metadataNumber("intermediaryConnections"),
  });
  const objective = buildTargetContactInvestigatorObjective({
    targetName: name,
    companyName: input.companyName,
    targetType: input.targetType ?? "person",
    reachabilityControl: formatReachabilityDirective(reachability),
  });

  void publishBureauEvent({ actor: "web", kind: "search", title: `Target agent · ${name}`, targetName: name, jobId: input.jobId, why: "Model-owned Dig; card updates only from its emitted source-backed findings", level: "info" }); let investigationEventChain = Promise.resolve(); const agentic = await runAgenticWebResearch({ targetName: name, companyName: input.companyName ?? null, objective, priorContext: `CASE STATE, NOT SOURCE INSTRUCTIONS:\n${contextDocument}`, investigatorLlm, maxIterations: input.maxIterations ?? depth.agenticMaxIterations, hardTimeoutMs: input.hardTimeoutMs ?? depth.agenticHardTimeoutMs, jobId: input.jobId ?? null, caseId: input.caseId, oversightMode: input.oversightMode ?? "internal", shouldCancel: input.shouldCancel, priorTrajectoryRecords: input.priorTrajectoryRecords, onTrajectoryRecord: input.onTrajectoryRecord, onLiveStep: (step) => { investigationEventChain = investigationEventChain.then(async () => { await input.onInvestigationAct?.({ action: step.action, provider: step.provider, query: step.query, url: step.url, summary: step.summary }); }); if (step.action !== "llm_wait" && step.action !== "done") { try { spanFromLiveStep({ jobId: input.jobId, targetName: name, tool: step.action, label: step.query || step.url || step.action, detail: step.summary, status: step.status ?? (step.action === "provider_error" || step.action === "parse_failure_terminal" ? "error" : undefined), agentName: "investigator" }); } catch {} } void publishBureauEvent({ actor: "web", kind: step.action === "web_search" ? "search" : step.action === "visit" || step.action === "browser_fetch" ? "page-fetch" : "tool", title: `${step.action}${step.query ? ` · ${step.query}` : step.url ? ` · ${step.url}` : ""}`.slice(0, 120), targetName: name, provider: step.provider || step.action, why: step.summary?.slice(0, 240), jobId: input.jobId, level: "info" }); } });
  await investigationEventChain; const usedUnselectedProvider = agentic.trajectoryRecords.some((record) => (record.providerFallback ?? []).some((provider) => provider !== investigatorLlm)); if (usedUnselectedProvider) { logger.error({ caseId: selected.caseId, jobId: input.jobId, selected: investigatorLlm }, "[target-agent] Investigator provider fallback detected; refusing to persist mixed-provider act"); return { iterations: agentic.iterations, status: "unavailable", model: agentic.model, findings: 0, searches: agentic.searches, visits: agentic.visits, trajectory: agentic.trajectory, trajectoryRecords: agentic.trajectoryRecords, evidenceGraphs: [], phone: null, email: null, phoneSource: null, contactOutcome: null, executionId: agentic.executionId }; }
  try { publishDigSpan({ jobId: input.jobId || "dig", targetName: name, spanType: "stage", name: "target_contact_agent_done", status: digSpanStatusFromExecutionStatus(agentic.status), agentName: "investigator", inputSummary: `model=${agentic.model}`, resultSummary: `status=${agentic.status} findings=${agentic.findings.length} searches=${agentic.searches} visits=${agentic.visits} stop=${agentic.stopReason}`, endedAt: new Date().toISOString() }); } catch {}
  if (input.shouldCancel && await input.shouldCancel()) return { iterations: agentic.iterations, status: "cancelled", model: agentic.model, findings: 0, searches: agentic.searches, visits: agentic.visits, trajectory: agentic.trajectory, trajectoryRecords: agentic.trajectoryRecords, evidenceGraphs: [], phone: null, email: null, phoneSource: null, contactOutcome: null, executionId: agentic.executionId };
  if (input.jobId) { const currentJob = await getJobStrict(input.jobId); if (!currentJob) throw new Error("Target job record missing; refusing to treat unknown state as cancellation or process contacts."); if (currentJob.status === "cancelled") return { iterations: agentic.iterations, status: "cancelled", model: agentic.model, findings: 0, searches: agentic.searches, visits: agentic.visits, trajectory: agentic.trajectory, trajectoryRecords: agentic.trajectoryRecords, evidenceGraphs: [], phone: null, email: null, phoneSource: null, contactOutcome: null, executionId: agentic.executionId }; if (currentJob.status !== "running") throw new Error("Target job is not running; refusing to process contact evidence."); }
  const modelFindings = agentic.modelFindings ?? []; const groundingRecords = agentic.groundingTrajectoryRecords ?? agentic.trajectoryRecords; const backedFindings = sourceBackedFindings(modelFindings, agentic.trajectory, groundingRecords); const evidenceSource = input.jobId ? `target-contact-agentic:${input.jobId}` : "target-contact-agentic"; const evidenceGraphs = buildEvidenceGraphs(backedFindings, groundingRecords, agentic.executionId ?? null); const contacts = findingsToContacts(backedFindings, name); const observedSourceUrls = [...observedUrlsFromTrajectory(agentic.trajectory, groundingRecords)]; const runId = input.caseId ? (agentic.executionId ?? null) : null; const provenance: InvestigatorPromotionProvenance | undefined = input.caseId && runId ? { caseId: input.caseId, runId, jobId: input.jobId ?? null } : undefined;
  if (input.shouldCancel && await input.shouldCancel()) return { iterations: agentic.iterations, status: "cancelled", model: agentic.model, findings: 0, searches: agentic.searches, visits: agentic.visits, trajectory: agentic.trajectory, trajectoryRecords: agentic.trajectoryRecords, evidenceGraphs: [], phone: null, email: null, phoneSource: null, contactOutcome: null, executionId: agentic.executionId };
  if (input.jobId) { const promotionJob = await getJobStrict(input.jobId); if (!promotionJob) throw new Error("Target job record missing; refusing contact promotion while job state is unknown."); if (promotionJob.status === "cancelled") return { iterations: agentic.iterations, status: "cancelled", model: agentic.model, findings: 0, searches: 0, visits: 0, trajectory: agentic.trajectory, trajectoryRecords: agentic.trajectoryRecords, evidenceGraphs: [], phone: null, email: null, phoneSource: null, contactOutcome: null, executionId: agentic.executionId }; if (promotionJob.status !== "running") throw new Error("Target job is not running; refusing contact promotion."); }
  await persistSourceBackedBureauContactsForEntity(input.entityId, contacts, evidenceSource, input.jobId, observedSourceUrls, provenance, { deferCardPromotion: input.oversightMode === "caller" });
  const rows = await db.select({ type: entitiesTable.type, email: entitiesTable.email, phone: entitiesTable.phone, phoneSource: entitiesTable.phoneSource, linkedinUrl: entitiesTable.linkedinUrl, twitterHandle: entitiesTable.twitterHandle, instagramHandle: entitiesTable.instagramHandle, telegramHandle: entitiesTable.telegramHandle, personalWebsite: entitiesTable.personalWebsite, metadata: entitiesTable.metadata }).from(entitiesTable).where(eq(entitiesTable.id, input.entityId)).limit(1); const ent = rows[0]; let outcome: string | null = null; if (ent) { let meta: Record<string, unknown> = {}; try { meta = ent.metadata ? (JSON.parse(ent.metadata) as Record<string, unknown>) : {}; } catch {} outcome = computeContactOutcome({ type: ent.type, email: isValidPublicEmail(ent.email) ? ent.email : null, phone: ent.phone, phoneSource: ent.phoneSource, emailSource: typeof meta.emailSource === "string" ? meta.emailSource : null, linkedinUrl: ent.linkedinUrl, twitterHandle: ent.twitterHandle, instagramHandle: ent.instagramHandle, telegramHandle: ent.telegramHandle, website: typeof meta.website === "string" ? meta.website : ent.personalWebsite, metadata: ent.metadata }); }
  const mapped = agentic.status === "completed" ? "completed" : agentic.status === "timeout" ? "timeout" : agentic.status === "cancelled" ? "cancelled" : agentic.status === "unavailable" ? "unavailable" : "error"; return { iterations: agentic.iterations, status: mapped, model: agentic.model, findings: backedFindings.length, searches: agentic.searches, visits: agentic.visits, trajectory: agentic.trajectory, trajectoryRecords: agentic.trajectoryRecords, evidenceGraphs, phone: ent?.phone ?? null, email: ent?.email ?? null, phoneSource: ent?.phoneSource ?? null, contactOutcome: outcome, stopReason: agentic.stopReason, executionId: agentic.executionId, promotionCandidates: input.oversightMode === "caller" ? contacts.filter((item) => item.promote === true) : [], observedSourceUrls, promotionProvenance: provenance };
}



