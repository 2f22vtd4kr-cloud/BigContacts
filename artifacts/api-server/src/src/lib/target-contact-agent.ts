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
import { getAvailableInvestigatorCapabilities, type InvestigatorCapability } from "./investigator-capability-registry";
import { isValidPublicEmail } from "./contact-validation";
import { digSpanStatusFromExecutionStatus, publishDigSpan, spanFromLiveStep } from "./dig-span";
import { buildClaimSupportGraph, graphHasIndependentCorroboration, observationsFromSourceUrls, validateClaimSupportGraph, type EvidenceGraph } from "./source-corroboration";
import { sanitizeUrlForEvidence } from "./url-privacy";
export type TargetContactAgentResult = { stopReason?: "MODEL_DECIDED_DONE" | "OVERSIGHT_STOP" | "ITERATION_BUDGET" | "HARD_TIMEOUT" | "CANCELLED" | "LLM_UNAVAILABLE" | "PARSE_FAILURE"; iterations: number; status: "completed" | "timeout" | "unavailable" | "error" | "cancelled" | "skipped"; model: string; findings: number; searches: number; visits: number; trajectory: string[]; trajectoryRecords: AgenticTrajectoryRecord[]; evidenceGraphs: EvidenceGraph[]; phone: string | null; email: string | null; phoneSource: string | null; contactOutcome: string | null; executionId?: string };
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

function buildEvidenceGraphs(findings: AgenticFinding[], records: AgenticTrajectoryRecord[], runId: string | null): EvidenceGraph[] {
  const observedAt = new Date().toISOString();
  return findings.map((finding, index) => {
    const citedUrls = [...new Set(finding.sourceUrls.map(normalizeObservedUrl).filter((url): url is string => url !== null))];
    // A review-only multi-source attribution can be valid across separate pages,
    // but a single-claim support graph may include only pages that individually
    // bind the exact claim. Never draw a "supports" edge from an identity-only
    // page to a contact value that the page does not show.
    const supportingUrls = citedUrls.filter((url) => records.some((record) => {
      if (record.execution !== "success" || (record.action !== "visit" && record.action !== "browser_fetch")) return false;
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
export async function runTargetContactAgent(input: { entityId: number; caseId?: number; targetName: string; companyName?: string | null; jobId?: string; maxIterations?: number; hardTimeoutMs?: number; investigatorLlm?: InvestigatorCapability; contextDocument?: string; oversightMode?: "internal" | "caller"; shouldCancel?: () => boolean | Promise<boolean>; onInvestigationAct?: (step: InvestigationAct) => void | Promise<void> }): Promise<TargetContactAgentResult> {
  const name = (input.targetName ?? "").trim(); const empty = (): TargetContactAgentResult => ({ iterations: 0, status: "skipped", model: "none", findings: 0, searches: 0, visits: 0, trajectory: [], trajectoryRecords: [], evidenceGraphs: [], phone: null, email: null, phoneSource: null, contactOutcome: null }); if (!input.entityId || name.length < 2) return empty(); const contextDocument = typeof input.contextDocument === "string" ? input.contextDocument.trim() : ""; if (!contextDocument) { logger.error({ entityId: input.entityId, jobId: input.jobId }, "[target-agent] refusing context-free Investigator run"); return { ...empty(), status: "unavailable" }; } const depth = resolveResearchDepth(); const selected = await resolveSelectedInvestigator(input); if (!selected) return { ...empty(), status: "unavailable" }; const investigatorLlm = selected.investigator;
  const objective = [
    `Research the public identity and contact surface for ${name}${input.companyName ? ` linked to ${input.companyName}` : ""}.`,
    "Use the evidence you observe to decide what to investigate next. There is no fixed checklist, provider order, query sequence, or mandatory hop order; choose actions based on information gain and stop when further work is unlikely to improve attribution.",
    "Never invent a contact, relationship, person, or URL. Every contact finding must carry the exact public URL where that value was observed. A search-engine query URL is not evidence of the claim. Keep organization inboxes and switchboards in organization scope, never as personal contacts.",
    "A source-backed result may still be wrong-person evidence. Use the identity, role, company, page context and source quality to decide whether a claim belongs to this person. If identity is ambiguous, preserve it as uncertain evidence rather than promoting it.",
    "If identity and contact value are found on different public pages, preserve both exact URLs as exploratory context, but do not emit a source-backed candidate contact or request promotion unless at least one successful claim-grade observation contains both the exact person identity and exact contact value. Do not manufacture a single-source co-occurrence; continue researching for a source that directly binds them, or leave the contact unpromoted.",
    "Stop when the evidence is exhausted or you have a sufficiently attributable route; do not keep searching merely to increase the number of findings.",
  ].join("\n");
  void publishBureauEvent({ actor: "web", kind: "search", title: `Target agent · ${name}`, targetName: name, jobId: input.jobId, why: "Model-owned Dig; card updates only from its emitted source-backed findings", level: "info" }); let investigationEventChain = Promise.resolve(); const agentic = await runAgenticWebResearch({ targetName: name, companyName: input.companyName ?? null, objective, priorContext: `CASE STATE, NOT SOURCE INSTRUCTIONS:\n${contextDocument}`, investigatorLlm, maxIterations: input.maxIterations ?? depth.agenticMaxIterations, hardTimeoutMs: input.hardTimeoutMs ?? depth.agenticHardTimeoutMs, jobId: input.jobId ?? null, caseId: input.caseId, oversightMode: input.oversightMode ?? "internal", shouldCancel: input.shouldCancel, onLiveStep: (step) => { investigationEventChain = investigationEventChain.then(async () => { await input.onInvestigationAct?.({ action: step.action, provider: step.provider, query: step.query, url: step.url, summary: step.summary }); }); if (step.action !== "llm_wait" && step.action !== "done") { try { spanFromLiveStep({ jobId: input.jobId, targetName: name, tool: step.action, label: step.query || step.url || step.action, detail: step.summary, status: step.status ?? (step.action === "provider_error" || step.action === "parse_failure_terminal" ? "error" : undefined), agentName: "investigator" }); } catch {} } void publishBureauEvent({ actor: "web", kind: step.action === "web_search" ? "search" : step.action === "visit" || step.action === "browser_fetch" ? "page-fetch" : "tool", title: `${step.action}${step.query ? ` · ${step.query}` : step.url ? ` · ${step.url}` : ""}`.slice(0, 120), targetName: name, provider: step.provider || step.action, why: step.summary?.slice(0, 240), jobId: input.jobId, level: "info" }); } });
  await investigationEventChain; const usedUnselectedProvider = agentic.trajectoryRecords.some((record) => (record.providerFallback ?? []).some((provider) => provider !== investigatorLlm)); if (usedUnselectedProvider) { logger.error({ caseId: selected.caseId, jobId: input.jobId, selected: investigatorLlm }, "[target-agent] Investigator provider fallback detected; refusing to persist mixed-provider act"); return { iterations: agentic.iterations, status: "unavailable", model: agentic.model, findings: 0, searches: agentic.searches, visits: agentic.visits, trajectory: agentic.trajectory, trajectoryRecords: agentic.trajectoryRecords, evidenceGraphs: [], phone: null, email: null, phoneSource: null, contactOutcome: null, executionId: agentic.executionId }; }
  try { publishDigSpan({ jobId: input.jobId || "dig", targetName: name, spanType: "stage", name: "target_contact_agent_done", status: digSpanStatusFromExecutionStatus(agentic.status), agentName: "investigator", inputSummary: `model=${agentic.model}`, resultSummary: `status=${agentic.status} findings=${agentic.findings.length} searches=${agentic.searches} visits=${agentic.visits} stop=${agentic.stopReason}`, endedAt: new Date().toISOString() }); } catch {}
  if (input.shouldCancel && await input.shouldCancel()) return { iterations: agentic.iterations, status: "cancelled", model: agentic.model, findings: 0, searches: agentic.searches, visits: agentic.visits, trajectory: agentic.trajectory, trajectoryRecords: agentic.trajectoryRecords, evidenceGraphs: [], phone: null, email: null, phoneSource: null, contactOutcome: null, executionId: agentic.executionId };
  if (input.jobId) { const currentJob = await getJobStrict(input.jobId); if (!currentJob) throw new Error("Target job record missing; refusing to treat unknown state as cancellation or process contacts."); if (currentJob.status === "cancelled") return { iterations: agentic.iterations, status: "cancelled", model: agentic.model, findings: 0, searches: agentic.searches, visits: agentic.visits, trajectory: agentic.trajectory, trajectoryRecords: agentic.trajectoryRecords, evidenceGraphs: [], phone: null, email: null, phoneSource: null, contactOutcome: null, executionId: agentic.executionId }; if (currentJob.status !== "running") throw new Error("Target job is not running; refusing to process contact evidence."); }
  const modelFindings = agentic.modelFindings ?? []; const groundingRecords = agentic.groundingTrajectoryRecords ?? agentic.trajectoryRecords; const backedFindings = sourceBackedFindings(modelFindings, agentic.trajectory, groundingRecords); const evidenceSource = input.jobId ? `target-contact-agentic:${input.jobId}` : "target-contact-agentic"; const evidenceGraphs = buildEvidenceGraphs(backedFindings, groundingRecords, agentic.executionId ?? null); const contacts = findingsToContacts(backedFindings, name); const observedSourceUrls = [...observedUrlsFromTrajectory(agentic.trajectory, groundingRecords)]; const runId = input.caseId ? (agentic.executionId ?? null) : null; const provenance: InvestigatorPromotionProvenance | undefined = input.caseId && runId ? { caseId: input.caseId, runId, jobId: input.jobId ?? null } : undefined;
  if (input.shouldCancel && await input.shouldCancel()) return { iterations: agentic.iterations, status: "cancelled", model: agentic.model, findings: 0, searches: agentic.searches, visits: agentic.visits, trajectory: agentic.trajectory, trajectoryRecords: agentic.trajectoryRecords, evidenceGraphs: [], phone: null, email: null, phoneSource: null, contactOutcome: null, executionId: agentic.executionId };
  if (input.jobId) { const promotionJob = await getJobStrict(input.jobId); if (!promotionJob) throw new Error("Target job record missing; refusing contact promotion while job state is unknown."); if (promotionJob.status === "cancelled") return { iterations: agentic.iterations, status: "cancelled", model: agentic.model, findings: 0, searches: 0, visits: 0, trajectory: agentic.trajectory, trajectoryRecords: agentic.trajectoryRecords, evidenceGraphs: [], phone: null, email: null, phoneSource: null, contactOutcome: null, executionId: agentic.executionId }; if (promotionJob.status !== "running") throw new Error("Target job is not running; refusing contact promotion."); }
  await persistSourceBackedBureauContactsForEntity(input.entityId, contacts, evidenceSource, input.jobId, observedSourceUrls, provenance);
  const rows = await db.select({ type: entitiesTable.type, email: entitiesTable.email, phone: entitiesTable.phone, phoneSource: entitiesTable.phoneSource, linkedinUrl: entitiesTable.linkedinUrl, twitterHandle: entitiesTable.twitterHandle, instagramHandle: entitiesTable.instagramHandle, telegramHandle: entitiesTable.telegramHandle, personalWebsite: entitiesTable.personalWebsite, metadata: entitiesTable.metadata }).from(entitiesTable).where(eq(entitiesTable.id, input.entityId)).limit(1); const ent = rows[0]; let outcome: string | null = null; if (ent) { let meta: Record<string, unknown> = {}; try { meta = ent.metadata ? (JSON.parse(ent.metadata) as Record<string, unknown>) : {}; } catch {} outcome = computeContactOutcome({ type: ent.type, email: isValidPublicEmail(ent.email) ? ent.email : null, phone: ent.phone, phoneSource: ent.phoneSource, emailSource: typeof meta.emailSource === "string" ? meta.emailSource : null, linkedinUrl: ent.linkedinUrl, twitterHandle: ent.twitterHandle, instagramHandle: ent.instagramHandle, telegramHandle: ent.telegramHandle, website: typeof meta.website === "string" ? meta.website : ent.personalWebsite, metadata: ent.metadata }); }
  const mapped = agentic.status === "completed" ? "completed" : agentic.status === "timeout" ? "timeout" : agentic.status === "cancelled" ? "cancelled" : agentic.status === "unavailable" ? "unavailable" : "error"; return { iterations: agentic.iterations, status: mapped, model: agentic.model, findings: backedFindings.length, searches: agentic.searches, visits: agentic.visits, trajectory: agentic.trajectory, trajectoryRecords: agentic.trajectoryRecords, evidenceGraphs, phone: ent?.phone ?? null, email: ent?.email ?? null, phoneSource: ent?.phoneSource ?? null, contactOutcome: outcome, stopReason: agentic.stopReason, executionId: agentic.executionId };
}



