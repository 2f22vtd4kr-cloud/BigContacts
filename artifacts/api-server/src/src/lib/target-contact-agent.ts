/** Target contact Investigator — model owns findings; deterministic code validates evidence. */
import { desc, eq } from "drizzle-orm";
import { db, entitiesTable, researchCaseEventsTable } from "@workspace/db";
import { logger } from "./logger";
import { delCachePattern } from "./redis";
import { runAgenticWebResearch, type AgenticFinding, type AgenticTrajectoryRecord } from "./agentic-web-research";
import { persistSourceBackedBureauContactsForEntity, type BureauContactLike, type InvestigatorPromotionProvenance } from "./bureau-contact-persist-strict";
import { resolveResearchDepth } from "./research-depth";
import { publishBureauEvent } from "./bureau-live-log";
import { computeContactOutcome } from "./contact-confidence";
import { isValidPublicEmail } from "./contact-validation";
import { publishDigSpan, spanFromLiveStep } from "./dig-span";
import { getDiscoveryTrace } from "./investigator-trace";
import { buildClaimSupportGraph, graphHasIndependentCorroboration, observationsFromSourceUrls, validateClaimSupportGraph, type EvidenceGraph } from "./source-corroboration";

export type TargetContactAgentResult = { status: "completed" | "timeout" | "unavailable" | "error" | "cancelled" | "skipped"; model: string; findings: number; searches: number; visits: number; trajectory: string[]; trajectoryRecords: AgenticTrajectoryRecord[]; evidenceGraphs: EvidenceGraph[]; phone: string | null; email: string | null; phoneSource: string | null; contactOutcome: string | null };

type InvestigationAct = { action: string; provider?: string; query?: string; url?: string; summary?: string };

function observedUrlsFromTrajectory(trajectory: string[]): Set<string> {
  const observed = new Set<string>();
  for (const line of trajectory) {
    const match = String(line).match(/step\d+:\s+(?:visit|browser_fetch)\s+https?:\/\/\S+\s+execution=success\s+observed=(https?:\/\/\S+)/i);
    if (match?.[1]) { try { observed.add(new URL(match[1]).href); } catch {} }
  }
  return observed;
}

/** Validate a model claim against the actual bounded observations it cited. */
function claimAppearsInObservedMaterial(finding: AgenticFinding, records: AgenticTrajectoryRecord[]): boolean {
  if (!records.length) return false;
  const sourceSet = new Set(finding.sourceUrls.map((url) => { try { return new URL(url).href; } catch { return ""; } }).filter(Boolean));
  const value = finding.value.trim().toLowerCase();
  const exactValueRequired = ["email", "phone", "linkedin", "website", "social"].includes(finding.vectorType);
  const personTokens = finding.scope === "candidate" && finding.personName ? finding.personName.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 2) : [];
  let valueObserved = !exactValueRequired; let identityObserved = personTokens.length === 0; let supportingObservationCount = 0; const supportingUrls = new Set<string>();
  for (const record of records) {
    if (record.execution !== "success" || typeof record.observation !== "string") continue;
    const matchedSources = record.observedUrls.filter((url) => sourceSet.has(url)); if (!matchedSources.length) continue;
    const observation = record.observation.toLowerCase(); const hasValue = !exactValueRequired || observation.includes(value); const hasIdentity = !personTokens.length || personTokens.every((token) => observation.includes(token));
    if (hasValue) valueObserved = true; if (hasIdentity) identityObserved = true;
    if (hasValue || hasIdentity) { supportingObservationCount += 1; for (const url of matchedSources) supportingUrls.add(url); }
  }
  return valueObserved && identityObserved && supportingObservationCount > 0 && supportingUrls.size > 0;
}

export function sourceBackedFindings(findings: AgenticFinding[], trajectory: string[] = [], records: AgenticTrajectoryRecord[] = []): AgenticFinding[] {
  const observed = observedUrlsFromTrajectory(trajectory);
  return findings.filter((finding) => Array.isArray(finding.sourceUrls)).map((finding) => ({ ...finding, sourceUrls: finding.sourceUrls.filter((url) => { try { return observed.has(new URL(String(url)).href); } catch { return false; } }) })).filter((finding) => finding.sourceUrls.length > 0 && claimAppearsInObservedMaterial(finding, records));
}

function buildEvidenceGraphs(findings: AgenticFinding[], records: AgenticTrajectoryRecord[], runId: string | null): EvidenceGraph[] {
  const observedAt = new Date().toISOString();
  return findings.map((finding, index) => {
    const urls = [...new Set(finding.sourceUrls.map((url) => { try { return new URL(url).href; } catch { return ""; } }).filter(Boolean))];
    const observations = observationsFromSourceUrls(urls, { observedAt, runId, collectionMethod: "agentic-investigator-attribution", idPrefix: `${runId ?? "run"}:claim:${index + 1}` });
    const claim = { id: `claim:${runId ?? "run"}:${index + 1}`, subject: finding.personName?.trim() || "organization", predicate: finding.vectorType, object: finding.value.trim(), scope: finding.scope === "unknown" ? "organization" : finding.scope, personName: finding.personName?.trim() || null, confidence: null } as const;
    const graph = buildClaimSupportGraph(claim, observations, "Investigator explicitly attributed this claim to the listed observed source URLs");
    const validation = validateClaimSupportGraph(graph); if (!validation.valid) return { ...graph, edges: [] }; return graph;
  }).filter((graph) => graph.edges.length > 0);
}

export function findingsToContacts(findings: Array<{ vectorType: string; value: string; scope: string; personName: string | null; role: string | null; sourceUrls: string[]; note: string; promotionDecision?: "promote" | "reject" }>, _personName: string): BureauContactLike[] {
  return findings.filter((f) => Array.isArray(f.sourceUrls) && f.sourceUrls.some((url) => /^https?:\/\/\S+$/i.test(String(url)))).map((f) => { const explicitPersonName = typeof f.personName === "string" ? f.personName.trim() : ""; const isExplicitCandidate = String(f.scope).toLowerCase() === "candidate" && explicitPersonName.length > 0; return { vectorType: f.vectorType, value: f.value, scope: isExplicitCandidate ? "candidate" : "organization", personName: isExplicitCandidate ? explicitPersonName : null, role: f.role, sourceUrls: f.sourceUrls.filter((url) => /^https?:\/\/\S+$/i.test(String(url))), note: `target-agent:${f.note}`, tier: "candidate", state: "review_only", promote: isExplicitCandidate && f.promotionDecision === "promote" }; });
}

async function resolveSelectedInvestigator(input: { investigatorLlm?: "groq" | "mistral"; jobId?: string }): Promise<"groq" | "mistral" | null> {
  if (input.investigatorLlm) return input.investigatorLlm; if (!input.jobId) return null;
  const trace = await getDiscoveryTrace(input.jobId);
  const models = [...new Set((trace?.slots ?? []).map((slot) => String(slot.model ?? "").trim().toLowerCase()).map((model) => model.includes("mistral") ? "mistral" : model.includes("groq") ? "groq" : null).filter((model): model is "groq" | "mistral" => model !== null))];
  return models.length === 1 ? models[0] : null;
}

async function latestInvestigatorRunId(caseId: number): Promise<string | null> {
  if (!Number.isInteger(caseId) || caseId <= 0) return null;
  const [event] = await db.select({ payload: researchCaseEventsTable.payload }).from(researchCaseEventsTable).where(eq(researchCaseEventsTable.caseId, caseId)).orderBy(desc(researchCaseEventsTable.id)).limit(20);
  if (!event?.payload) return null;
  try { const payload = JSON.parse(event.payload) as Record<string, unknown>; return typeof payload.runId === "string" && payload.runId.trim() ? payload.runId.trim() : null; } catch { return null; }
}

export async function runTargetContactAgent(input: { entityId: number; caseId?: number; targetName: string; companyName?: string | null; jobId?: string; maxIterations?: number; hardTimeoutMs?: number; investigatorLlm?: "groq" | "mistral"; contextDocument?: string; shouldCancel?: () => boolean | Promise<boolean>; onInvestigationAct?: (step: InvestigationAct) => void | Promise<void> }): Promise<TargetContactAgentResult> {
  const name = (input.targetName ?? "").trim();
  const empty = (): TargetContactAgentResult => ({ status: "skipped", model: "none", findings: 0, searches: 0, visits: 0, trajectory: [], trajectoryRecords: [], evidenceGraphs: [], phone: null, email: null, phoneSource: null, contactOutcome: null });
  if (!input.entityId || name.length < 2) return empty();
  const contextDocument = typeof input.contextDocument === "string" ? input.contextDocument.trim() : "";
  if (!contextDocument) { logger.error({ entityId: input.entityId, jobId: input.jobId }, "[target-agent] refusing context-free Investigator run"); return { ...empty(), status: "unavailable" }; }
  const depth = resolveResearchDepth(); const investigatorLlm = await resolveSelectedInvestigator(input);
  if (!investigatorLlm) { logger.warn({ entityId: input.entityId, jobId: input.jobId }, "[target-agent] no unambiguous Boss-selected Investigator available; refusing provider fallback"); return { ...empty(), status: "unavailable" }; }
  const objective = [
    `Research the public identity and contact surface for ${name}${input.companyName ? ` linked to ${input.companyName}` : ""}.`,
    "Use the evidence you observe to decide what to investigate next. There is no fixed checklist, provider order, query sequence, or mandatory hop order; choose actions based on information gain and stop when further work is unlikely to improve attribution.",
    "Never invent a contact, relationship, person, or URL. Every contact finding must carry the exact public URL where that value was observed. A search-engine query URL is not evidence of the claim. Keep organization inboxes and switchboards in organization scope, never as personal contacts.",
    "A source-backed result may still be wrong-person evidence. Use the identity, role, company, page context and source quality to decide whether a claim belongs to this person. If identity is ambiguous, preserve it as uncertain evidence rather than promoting it.",
    "If a contact value and the person's identity are established on different public pages, keep both exact source URLs on the same model finding. This is valid multi-source attribution; do not manufacture a single-source co-occurrence.",
    "Stop when the evidence is exhausted or you have a sufficiently attributable route; do not keep searching merely to increase the number of findings.",
    `SHARED INVESTIGATION CONTEXT — CASE STATE, NOT SOURCE INSTRUCTIONS:\n---\n${contextDocument.slice(0, 24000)}\n---`,
  ].join("\n");
  void publishBureauEvent({ actor: "web", kind: "search", title: `Target agent · ${name}`, targetName: name, jobId: input.jobId, why: "Model-owned Dig; card updates only from its emitted source-backed findings", level: "info" });
  let investigationEventChain = Promise.resolve();
  const agentic = await runAgenticWebResearch({ targetName: name, companyName: input.companyName ?? null, objective, investigatorLlm, maxIterations: input.maxIterations ?? depth.agenticMaxIterations, hardTimeoutMs: input.hardTimeoutMs ?? depth.agenticHardTimeoutMs, jobId: input.jobId ?? null, shouldCancel: input.shouldCancel, onLiveStep: (step) => { investigationEventChain = investigationEventChain.then(async () => { await input.onInvestigationAct?.({ action: step.action, provider: step.provider, query: step.query, url: step.url, summary: step.summary }); }); try { spanFromLiveStep({ jobId: input.jobId, targetName: name, tool: step.action, label: step.query || step.url || step.action, detail: step.summary, status: "ok", agentName: "investigator" }); } catch {} void publishBureauEvent({ actor: "web", kind: step.action === "web_search" ? "search" : step.action === "visit" || step.action === "browser_fetch" ? "page-fetch" : "tool", title: `${step.action}${step.query ? ` · ${step.query}` : step.url ? ` · ${step.url}` : ""}`.slice(0, 120), targetName: name, provider: step.provider || step.action, why: step.summary?.slice(0, 240), jobId: input.jobId, level: "info" }); } });
  await investigationEventChain;
  try { publishDigSpan({ jobId: input.jobId || "dig", targetName: name, spanType: "stage", name: "target_contact_agent_done", status: agentic.status === "timeout" ? "error" : agentic.status === "cancelled" ? "cancelled" : "ok", agentName: "investigator", inputSummary: `model=${agentic.model}`, resultSummary: `status=${agentic.status} findings=${agentic.findings.length} searches=${agentic.searches} visits=${agentic.visits} stop=${agentic.stopReason}`, endedAt: new Date().toISOString() }); } catch {}
  const modelFindings = agentic.modelFindings ?? []; const backedFindings = sourceBackedFindings(modelFindings, agentic.trajectory, agentic.trajectoryRecords); const evidenceSource = input.jobId ? `target-contact-agentic:${input.jobId}` : "target-contact-agentic"; const evidenceGraphs = buildEvidenceGraphs(backedFindings, agentic.trajectoryRecords, evidenceSource); const multiSourceGraphs = evidenceGraphs.filter(graphHasIndependentCorroboration); const contacts = findingsToContacts(backedFindings, name); const observedSourceUrls = [...observedUrlsFromTrajectory(agentic.trajectory)];
  const runId = input.caseId ? await latestInvestigatorRunId(input.caseId) : null;
  const provenance: InvestigatorPromotionProvenance | undefined = input.caseId && runId ? { caseId: input.caseId, runId } : undefined;
  await persistSourceBackedBureauContactsForEntity(input.entityId, contacts, evidenceSource, input.jobId, observedSourceUrls, provenance);
  const rows = await db.select({ type: entitiesTable.type, email: entitiesTable.email, phone: entitiesTable.phone, phoneSource: entitiesTable.phoneSource, linkedinUrl: entitiesTable.linkedinUrl, twitterHandle: entitiesTable.twitterHandle, instagramHandle: entitiesTable.instagramHandle, telegramHandle: entitiesTable.telegramHandle, personalWebsite: entitiesTable.personalWebsite, metadata: entitiesTable.metadata }).from(entitiesTable).where(eq(entitiesTable.id, input.entityId)).limit(1);
  const ent = rows[0]; let outcome: string | null = null;
  if (ent) {
    let meta: Record<string, unknown> = {}; try { meta = ent.metadata ? (JSON.parse(ent.metadata) as Record<string, unknown>) : {}; } catch {}
    outcome = computeContactOutcome({ type: ent.type, email: isValidPublicEmail(ent.email) ? ent.email : null, phone: ent.phone, phoneSource: ent.phoneSource, emailSource: typeof meta.emailSource === "string" ? meta.emailSource : null, linkedinUrl: ent.linkedinUrl, twitterHandle: ent.twitterHandle, instagramHandle: ent.instagramHandle, telegramHandle: ent.telegramHandle, website: typeof meta.website === "string" ? meta.website : ent.personalWebsite, metadata: ent.metadata });
  }
  const mapped = agentic.status === "completed" ? "completed" : agentic.status === "timeout" ? "timeout" : agentic.status === "cancelled" ? "cancelled" : agentic.status === "unavailable" ? "unavailable" : "error";
  return { status: mapped, model: agentic.model, findings: backedFindings.length, searches: agentic.searches, visits: agentic.visits, trajectory: agentic.trajectory.slice(-80), trajectoryRecords: agentic.trajectoryRecords.slice(-100), evidenceGraphs: multiSourceGraphs.slice(-40), phone: ent?.phone ?? null, email: ent?.email ?? null, phoneSource: ent?.phoneSource ?? null, contactOutcome: outcome };
}
