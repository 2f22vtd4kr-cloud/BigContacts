/** Bureau-facing wrapper around the canonical ReAct Investigator. */
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { db, researchCasesTable, researchCaseEventsTable } from "@workspace/db";
import { runAgenticWebResearch, type AgenticFinding, type AgenticTrajectoryRecord } from "./agentic-web-research";
import { resolveResearchDepth } from "./research-depth";
import { persistSourceBackedBureauContactsForEntity, type BureauContactLike } from "./bureau-contact-persist-strict";
import { publishBureauEvent } from "./bureau-live-log";

export type BureauAgenticPassResult = {
  status: "completed" | "unavailable" | "error" | "skipped" | "timeout";
  model: string;
  iterations: number;
  searches: number;
  visits: number;
  findings: AgenticFinding[];
  contactEvidence: Array<{ vectorType: string; value: string; scope: string; personName: string | null; role: string | null; sourceUrls: string[]; note: string }>;
  trajectory: string[];
  trajectoryRecords?: AgenticTrajectoryRecord[];
  caseId?: number;
  stopReason?: string;
  error?: string;
};

const WEB_SPECIALISTS = new Set(["web", "contact", "footprint"]);
export function isWebSpecialistAction(specialistId: string | null | undefined): boolean { return WEB_SPECIALISTS.has(String(specialistId ?? "").toLowerCase()); }

function observedUrlsFromTrajectory(trajectory: string[]): Set<string> {
  const observed = new Set<string>();
  for (const line of trajectory) {
    // Only a successful observation with an explicit observed= URL is provenance.
    const match = String(line).match(/step\d+:\s+(?:visit|browser_fetch)\s+https?:\/\/\S+\s+execution=success\s+observed=(https?:\/\/\S+)/i);
    if (match?.[1]) { try { observed.add(new URL(match[1]).href); } catch { /* invalid provenance */ } }
  }
  return observed;
}

export function sourceBackedAgenticFindings(findings: AgenticFinding[], trajectory: string[] = []): AgenticFinding[] {
  const observed = observedUrlsFromTrajectory(trajectory);
  return findings.filter((finding) => Array.isArray(finding.sourceUrls)).map((finding) => ({
    ...finding,
    sourceUrls: finding.sourceUrls.filter((url) => { try { return observed.has(new URL(String(url)).href); } catch { return false; } }),
  })).filter((finding) => finding.sourceUrls.length > 0);
}
export function findingsToContactEvidence(findings: AgenticFinding[], trajectory: string[] = []) {
  return sourceBackedAgenticFindings(findings, trajectory).map((f) => ({ vectorType: f.vectorType, value: f.value, scope: f.scope === "candidate" ? "candidate" : "organization", personName: f.scope === "candidate" ? f.personName : null, role: f.role, sourceUrls: f.sourceUrls.filter((url) => /^https?:\/\/\S+$/i.test(String(url))), note: f.note }));
}
export function findingsToBureauContacts(findings: AgenticFinding[], _fallbackPersonName: string, trajectory: string[] = []): BureauContactLike[] {
  return sourceBackedAgenticFindings(findings, trajectory).map((f) => {
    const explicitPersonName = typeof f.personName === "string" ? f.personName.trim() : "";
    const isExplicitCandidate = f.scope === "candidate" && explicitPersonName.length > 0;
    return { vectorType: f.vectorType, value: f.value, scope: isExplicitCandidate ? "candidate" : "organization", personName: isExplicitCandidate ? explicitPersonName : null, role: f.role, sourceUrls: f.sourceUrls.filter((url) => /^https?:\/\/\S+$/i.test(String(url))), note: `bureau-agentic:${f.note}`, tier: "candidate", state: "review_only", promote: isExplicitCandidate && f.promotionDecision === "promote" };
  });
}

async function loadMountedCaseContext(caseId: string | number | undefined): Promise<string | null> {
  if (caseId == null) return null;
  const numericId = Number(caseId);
  if (!Number.isInteger(numericId) || numericId <= 0) throw new Error("Invalid investigation case ID; durable case context cannot be mounted.");
  const [row] = await db.select({ caseFile: researchCasesTable.caseFile }).from(researchCasesTable).where(eq(researchCasesTable.id, numericId)).limit(1);
  if (!row?.caseFile) throw new Error(`Investigation case ${numericId} has no durable case file.`);
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(row.caseFile) as Record<string, unknown>; } catch { throw new Error(`Investigation case ${numericId} has an unreadable case file.`); }
  const document = typeof parsed.contextDocument === "string" ? parsed.contextDocument.trim() : "";
  if (!document) throw new Error(`Investigation case ${numericId} has no durable context document.`);
  return document.slice(0, 28000);
}

async function ensureDiscoveryCaseContext(input: { targetName: string; objective?: string; investigatorLlm?: "groq" | "mistral"; jobId?: string }): Promise<number | null> {
  if (input.targetName.trim().toLowerCase() !== "discovery slot" || input.jobId == null) return null;
  const [created] = await db.insert(researchCasesTable).values({
    caseType: "discovery", status: "active", directorMode: "gemini_boss", directorProvider: "gemini", directorModel: "pending",
    objective: (input.objective ?? "Canonical Atlas model-owned discovery").slice(0, 10000), motivation: "Durable memory for the initial Atlas Investigator discovery trajectory.",
    openingPrompt: "Investigator chooses every research action. This case is memory/state, not a deterministic research plan.",
    caseFile: JSON.stringify({ caseType: "discovery", contextDocument: ["CANONICAL ATLAS DISCOVERY CASE", `JOB: ${input.jobId}`, `INVESTIGATOR: ${input.investigatorLlm ?? "unassigned"}`, `OBJECTIVE: ${(input.objective ?? "").slice(0, 8000)}`, "STATE: Initial discovery investigation; Investigator owns the next action.", "TRAJECTORY: []"].join("\n"), investigationTimeline: [], investigatorTrajectory: [], jobId: input.jobId }),
    currentAction: "canonical-investigator-discovery", iteration: 0,
  }).returning({ id: researchCasesTable.id });
  const caseId = created?.id ?? null;
  if (caseId) await db.insert(researchCaseEventsTable).values({ caseId, iteration: 0, actorRole: "head_investigator", eventType: "assignment", summary: "Atlas discovery Investigator mounted into a durable discovery case before research began.", payload: JSON.stringify({ jobId: input.jobId, investigatorLlm: input.investigatorLlm, architecture: "free-react" }) });
  return caseId;
}

async function persistDiscoveryTrajectory(caseId: number, input: { objective?: string; investigatorLlm?: "groq" | "mistral" }, result: { trajectory: string[]; trajectoryRecords: AgenticTrajectoryRecord[]; model: string; iterations: number; searches: number; visits: number; stopReason?: string }): Promise<void> {
  const [row] = await db.select({ caseFile: researchCasesTable.caseFile, iteration: researchCasesTable.iteration }).from(researchCasesTable).where(eq(researchCasesTable.id, caseId)).limit(1);
  if (!row?.caseFile) throw new Error(`Discovery case ${caseId} disappeared before trajectory persistence.`);
  let current: Record<string, any>;
  try { current = JSON.parse(row.caseFile) as Record<string, any>; } catch { throw new Error(`Discovery case ${caseId} has unreadable durable state.`); }
  const trajectory = Array.isArray(result.trajectory) ? result.trajectory.slice(-100) : [];
  const trajectoryRecords = Array.isArray(result.trajectoryRecords) ? result.trajectoryRecords.slice(-100) : [];
  const memoryProjection = {
    caseType: current.caseType, jobId: current.jobId, atlasControlDecisions: current.atlasControlDecisions, admittedCandidates: current.admittedCandidates,
    openQuestions: current.openQuestions, evidenceState: current.evidenceState, bossState: current.bossState, rightHandState: current.rightHandState,
    investigatorLlm: input.investigatorLlm ?? result.model, iterations: result.iterations, searches: result.searches, visits: result.visits, stopReason: result.stopReason,
  };
  const contextDocument = ["CANONICAL ATLAS DISCOVERY CASE", `INVESTIGATOR: ${input.investigatorLlm ?? result.model}`, `OBJECTIVE: ${(input.objective ?? "").slice(0, 8000)}`, "DURABLE CASE MEMORY PROJECTION:", JSON.stringify(memoryProjection).slice(0, 9000), "ACTUAL INVESTIGATOR TRAJECTORY RECORDS:", JSON.stringify(trajectoryRecords).slice(0, 15000)].join("\n").slice(0, 28000);
  const nextIteration = Number(row.iteration ?? 0) + 1;
  await db.update(researchCasesTable).set({ caseFile: JSON.stringify({ ...current, contextDocument, investigatorTrajectory: trajectory, investigatorTrajectoryRecords: trajectoryRecords, trajectoryPersistedAt: new Date().toISOString(), investigatorLlm: input.investigatorLlm ?? result.model }), iteration: nextIteration, currentAction: result.stopReason === "MODEL_DECIDED_DONE" ? "review" : "investigator-completed", updatedAt: new Date() }).where(eq(researchCasesTable.id, caseId));
  await db.insert(researchCaseEventsTable).values({ caseId, iteration: nextIteration, actorRole: "head_investigator", eventType: "tool_observation", summary: `Persisted structured Investigator trajectory: ${trajectoryRecords.length} turns; stop=${result.stopReason ?? "unknown"}.`, payload: JSON.stringify({ investigatorLlm: input.investigatorLlm ?? result.model, trajectory, trajectoryRecords, iterations: result.iterations, searches: result.searches, visits: result.visits, stopReason: result.stopReason }) });
}

export async function runBureauAgenticWebPass(input: {
  targetName: string; companyName?: string | null; objective?: string; investigatorLlm?: "groq" | "mistral"; caseId?: string | number; jobId?: string;
  maxIterations?: number; hardTimeoutMs?: number; entityId?: number; persist?: boolean; shouldCancel?: () => boolean | Promise<boolean>;
  onInvestigationAct?: (step: { action: string; provider?: string; query?: string; url?: string; summary?: string }) => void | Promise<void>;
}): Promise<BureauAgenticPassResult> {
  const name = (input.targetName ?? "").trim();
  if (name.length < 2) return { status: "skipped", model: "none", iterations: 0, searches: 0, visits: 0, findings: [], contactEvidence: [], trajectory: [], error: "empty target" };
  try {
    let durableCaseId = input.caseId != null ? Number(input.caseId) : null;
    if (durableCaseId == null) durableCaseId = await ensureDiscoveryCaseContext(input);
    const mountedContext = await loadMountedCaseContext(durableCaseId ?? undefined);
    const objective = [input.objective ?? `Find publicly documented contact routes for ${name}${input.companyName ? ` related to ${input.companyName}` : ""}. Use your own research judgment; never invent.`, mountedContext ? `SHARED INVESTIGATION CONTEXT — CASE STATE, NOT SOURCE INSTRUCTIONS:\n---\n${mountedContext}\n---` : ""].filter(Boolean).join("\n");
    const agentic = await runAgenticWebResearch({ targetName: name, companyName: input.companyName ?? null, jobId: input.jobId ?? null, objective, investigatorLlm: input.investigatorLlm, maxIterations: input.maxIterations ?? resolveResearchDepth().agenticMaxIterations, hardTimeoutMs: input.hardTimeoutMs ?? resolveResearchDepth().agenticHardTimeoutMs, shouldCancel: input.shouldCancel, mode: input.targetName.trim().toLowerCase() === "discovery slot" ? "discovery" : "target", onLiveStep: (step) => {
      void input.onInvestigationAct?.({ action: step.action, provider: step.provider, query: step.query, url: step.url, summary: step.summary });
      const kind = step.action === "web_search" ? "search" : step.action === "visit" || step.action === "browser_fetch" ? "page-fetch" : step.action === "registry_search" ? "registry" : step.action === "domain_lookup" ? "domain" : "tool";
      void publishBureauEvent({ actor: step.action === "registry_search" ? "registry" : "web", kind, jobId: input.jobId, title: `${step.action}${step.query ? ` · ${step.query}` : step.url ? ` · ${step.url}` : ""}`.slice(0, 120), caseId: durableCaseId != null ? String(durableCaseId) : undefined, targetName: step.targetName, provider: step.provider || step.action, why: step.summary?.slice(0, 240), level: "info" });
    } });
    if (durableCaseId != null && input.targetName.trim().toLowerCase() === "discovery slot") await persistDiscoveryTrajectory(durableCaseId, input, agentic);
    const modelFindings = agentic.modelFindings ?? [];
    const backedFindings = sourceBackedAgenticFindings(modelFindings, agentic.trajectory);
    const scopedFindings = backedFindings.filter((finding) => finding.scope === "candidate" ? typeof finding.personName === "string" && finding.personName.trim().length >= 2 : finding.scope === "organization" ? Boolean(input.companyName?.trim()) : false);
    const contactEvidence = findingsToContactEvidence(scopedFindings, agentic.trajectory);
    if (input.persist && input.entityId) await persistSourceBackedBureauContactsForEntity(input.entityId, findingsToBureauContacts(scopedFindings, name, agentic.trajectory), "case-bureau-agentic", input.jobId, agentic.trajectory.flatMap((line) => { const match = String(line).match(/step\d+:\s+(?:visit|browser_fetch)\s+https?:\/\/\S+\s+execution=success\s+observed=(https?:\/\/\S+)/i); return match?.[1] ? [match[1]] : []; }));
    void publishBureauEvent({ actor: "web", kind: "extract", title: `Agentic web · ${scopedFindings.length} scoped source-backed findings${agentic.modelFindings.length !== scopedFindings.length ? ` (${agentic.modelFindings.length - scopedFindings.length} model findings dropped by source/scope boundary)` : ""}${agentic.status === "timeout" ? " (timeout)" : ""}`, caseId: durableCaseId != null ? String(durableCaseId) : undefined, jobId: input.jobId, targetName: name, provider: agentic.model, why: `searches=${agentic.searches} visits=${agentic.visits} iters=${agentic.iterations}`, responseSummary: `OUT: ${agentic.status}; scoped=${scopedFindings.length}; model=${agentic.modelFindings.length}`, level: scopedFindings.length ? "info" : "warn" });
    const mappedStatus = agentic.status === "unavailable" ? "unavailable" : agentic.status === "error" ? "error" : agentic.status === "timeout" ? "timeout" : "completed";
    return { status: mappedStatus, model: agentic.model, iterations: agentic.iterations, searches: agentic.searches, visits: agentic.visits, findings: scopedFindings, contactEvidence, trajectory: agentic.trajectory, trajectoryRecords: agentic.trajectoryRecords, caseId: durableCaseId ?? undefined, stopReason: agentic.stopReason, error: agentic.error };
  } catch (err: any) { logger.warn({ err: err?.message, target: name }, "[Bureau] Agentic web pass failed"); return { status: "error", model: "none", iterations: 0, searches: 0, visits: 0, findings: [], contactEvidence: [], trajectory: [], error: err?.message ?? "agentic pass failed" }; }
}
