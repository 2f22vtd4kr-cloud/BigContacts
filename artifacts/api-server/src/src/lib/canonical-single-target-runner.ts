import { and, asc, eq, sql } from "drizzle-orm";
import { db, entitiesTable, researchCasesTable, researchCaseEventsTable } from "@workspace/db";
import { apexOrientationFor } from "./apex-bureau-orientation";
import { getJobStrict, updateJob } from "./job-queue";
import { isCanonicalJobOwner } from "./canonical-job-lock";
import { runGroqBossDiscovery } from "./case-bureau";
import { runTargetContactAgent } from "./target-contact-agent";
import { resolveResearchDepth, type ResearchDepth } from "./research-depth";
import { buildInvestigatorContext, compactInvestigationContext, type CompactionFinding, type CompactionTrajectoryRecord } from "./investigation-context-compaction";
import { deriveCanonicalTerminalDecision } from "./canonical-terminal-state";
import { isCanonicalTargetEpisodeComplete } from "./canonical-terminal-authority";
import { reviewTargetInvestigationAct } from "./target-act-oversight";
import { runGroqRightHandFreeJson } from "./groq-right-hand-reasoning";
import { ATLAS_OPENING_RIGHT_HAND_REVIEW_RESPONSE_FORMAT, validateAtlasOpeningRightHandReview } from "./atlas-control-decision";
import { getAvailableDistinctInvestigatorCapabilities, getAvailableInvestigatorCapabilities, getInvestigatorCredentialAliases, type InvestigatorCapability } from "./investigator-capability-registry";
import { AGENTIC_PROVIDER_DECISION_TIMEOUT_MS, deriveProviderBoundedActTimeoutMs, isTransientInvestigatorCapacityError } from "./agentic-web-research-core";
import { safeThrownErrorSummary } from "./provider-error-diagnostics";
export type CanonicalSingleTargetOptions = { researchDepth?: ResearchDepth; targetTimeoutMs?: number; existingCaseId?: number; initialDirection?: string; manageJobLifecycle?: boolean; maxInvestigatorIterations?: number; excludedInvestigatorLlm?: readonly InvestigatorCapability[] };
type StoredOversight = { action: "continue" | "redirect" | "stop"; direction?: string | null; reason?: string | null; status?: string; bossModel?: string | null; error?: string | null; evidenceGraphCount?: number };
type TargetCase = { id: number; targetEntityId: number; status: string; iteration: number; objective: string; caseFile: string | null };
function parseCaseFile(raw: string | null): Record<string, unknown> { try { const value = raw ? JSON.parse(raw) : {}; return value && typeof value === "object" ? value as Record<string, unknown> : {}; } catch { return {}; } }
function readOversight(caseFile: Record<string, unknown>, runId: string | null, controlTurn: number): StoredOversight | null { const history = Array.isArray(caseFile.investigatorActOversight) ? caseFile.investigatorActOversight : []; const latest = [...history].reverse().find((item) => { if (!item || typeof item !== "object") return false; const value = item as Record<string, unknown>; return value.runId === runId && Number(value.controlTurn) === controlTurn; }); if (!latest || typeof latest !== "object") return null; const value = (latest as Record<string, unknown>).oversight; if (!value || typeof value !== "object") return null; const action = (value as Record<string, unknown>).action; if (action !== "continue" && action !== "redirect" && action !== "stop") return null; const oversight = value as Record<string, unknown>; return { action, direction: typeof oversight.direction === "string" ? oversight.direction : null, reason: typeof oversight.reason === "string" ? oversight.reason : null, status: typeof oversight.status === "string" ? oversight.status : undefined, bossModel: typeof oversight.bossModel === "string" ? oversight.bossModel : null, error: typeof oversight.error === "string" ? oversight.error : null, evidenceGraphCount: Array.isArray((latest as Record<string, unknown>).evidenceGraphs) ? ((latest as Record<string, unknown>).evidenceGraphs as unknown[]).length : 0 }; }
function appendDurableActContext(contextDocument: string, actNumber: number, result: Awaited<ReturnType<typeof runTargetContactAgent>>, oversight: StoredOversight | null): string {
  const durableAct = {
    actNumber,
    executionId: result.executionId,
    investigatorLlm: result.model,
    status: result.status,
    searches: result.searches,
    visits: result.visits,
    findings: result.findings,
    trajectory: result.trajectory,
    trajectoryRecords: result.trajectoryRecords,
    evidenceGraphs: result.evidenceGraphs,
    oversight,
  };
  let serialized: string;
  try {
    serialized = JSON.stringify(durableAct);
  } catch {
    serialized = JSON.stringify({ actNumber, executionId: result.executionId, investigatorLlm: result.model, status: result.status, oversight, serializationError: true });
  }
  return compactInvestigationContext({ raw: `${contextDocument}\n\n## Durable Investigator act ${actNumber}\n${serialized}` });
}
async function ensureTargetCase(target: { id: number; name: string; type: string }, companyName: string | null, atlasJobId: string, existingCaseId?: number): Promise<TargetCase> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`atlas-target-case:${atlasJobId}:${target.id}`}))`);
  if (existingCaseId) {
    const [existing] = await tx.select({ id: researchCasesTable.id, targetEntityId: researchCasesTable.targetEntityId, status: researchCasesTable.status, iteration: researchCasesTable.iteration, objective: researchCasesTable.objective, caseFile: researchCasesTable.caseFile }).from(researchCasesTable).where(and(eq(researchCasesTable.id, existingCaseId), eq(researchCasesTable.caseType, "target"))).limit(1);
    if (!existing?.targetEntityId || existing.targetEntityId !== target.id) throw new Error(`Explicit target case ${existingCaseId} does not belong to target ${target.id}.`);
    const existingCaseFile = parseCaseFile(existing.caseFile); if (existingCaseFile.atlasJobId !== atlasJobId) throw new Error(`Explicit target case ${existingCaseId} is not bound to Atlas job ${atlasJobId}.`);
    return { ...existing, targetEntityId: existing.targetEntityId, iteration: Number(existing.iteration ?? 0), objective: existing.objective ?? `Investigate ${target.name} for realistic public contact routes.` };
  }
  const candidates = await tx.select({ id: researchCasesTable.id, targetEntityId: researchCasesTable.targetEntityId, status: researchCasesTable.status, iteration: researchCasesTable.iteration, objective: researchCasesTable.objective, caseFile: researchCasesTable.caseFile }).from(researchCasesTable).where(and(eq(researchCasesTable.targetEntityId, target.id), eq(researchCasesTable.caseType, "target")));
  const existing = candidates.find((candidate) => { const state = parseCaseFile(candidate.caseFile); return state.atlasJobId === atlasJobId; });
  if (existing?.targetEntityId) {
    const existingCaseFile = parseCaseFile(existing.caseFile); const expectedTarget = { id: target.id, name: target.name, type: target.type }; if (JSON.stringify(existingCaseFile.target) !== JSON.stringify(expectedTarget)) { existingCaseFile.target = expectedTarget; await tx.update(researchCasesTable).set({ caseFile: JSON.stringify(existingCaseFile), updatedAt: new Date() }).where(eq(researchCasesTable.id, existing.id)); }
    return { ...existing, targetEntityId: existing.targetEntityId, iteration: Number(existing.iteration ?? 0), objective: existing.objective ?? `Investigate ${target.name} for realistic public contact routes.` };
  }
  const objective = `Investigate the exact named target ${target.name}${companyName ? ` at ${companyName}` : ""} for realistic public contact routes.`;
  const [created] = await tx.insert(researchCasesTable).values({ targetEntityId: target.id, caseType: "target", status: "active", directorMode: "groq_boss_pending", directorProvider: "groq", directorModel: "auto-low-cost-pending", objective, motivation: "Target-scoped Apex Atlas investigation with continuous Groq Boss + Groq Right-hand oversight.", openingPrompt: objective, caseFile: JSON.stringify({ version: 2, target: { id: target.id, name: target.name, type: target.type }, atlasJobId, investigatorActOversight: [] }), currentAction: "right-hand-preflight", iteration: 0 }).returning({ id: researchCasesTable.id, targetEntityId: researchCasesTable.targetEntityId, status: researchCasesTable.status, iteration: researchCasesTable.iteration, objective: researchCasesTable.objective, caseFile: researchCasesTable.caseFile });
  if (!created?.targetEntityId) throw new Error(`Unable to create investigation case for ${target.name}.`);
  return { ...created, targetEntityId: created.targetEntityId, iteration: Number(created.iteration ?? 0), objective: created.objective ?? objective };
  });
}
async function loadDurableTargetTrajectory(caseId: number): Promise<{ records: CompactionTrajectoryRecord[]; findings: CompactionFinding[] }> {
  const events = await db.select({ id: researchCaseEventsTable.id, iteration: researchCaseEventsTable.iteration, eventType: researchCaseEventsTable.eventType, status: researchCaseEventsTable.status, payload: researchCaseEventsTable.payload })
    .from(researchCaseEventsTable)
    .where(and(eq(researchCaseEventsTable.caseId, caseId), eq(researchCaseEventsTable.eventType, "tool_observation"))).orderBy(asc(researchCaseEventsTable.id));
  const records: CompactionTrajectoryRecord[] = [];
  const findings: CompactionFinding[] = [];
  for (const event of events) {
    if (typeof event.payload !== "string") continue;
    try {
      const payload = JSON.parse(event.payload) as Record<string, unknown>;
      const turn = Number(payload.turn ?? event.iteration ?? 0);
      if (!Number.isFinite(turn) || turn <= 0) continue;
      const action = typeof payload.action === "string" ? payload.action : "react_episode";
      const rawFindings = Array.isArray(payload.findings) && !["web_search", "parallel_web_search"].includes(action) ? payload.findings : [];
      const normalizedFindings = rawFindings.filter((value): value is CompactionFinding => Boolean(value && typeof value === "object"));
      records.push({
        turn,
        model: typeof payload.model === "string" ? payload.model : undefined,
        action,
        args: payload.args && typeof payload.args === "object" ? payload.args as Record<string, unknown> : undefined,
        execution: typeof payload.execution === "string" ? payload.execution : typeof event.status === "string" ? event.status : "unknown",
        observation: typeof payload.observation === "string" ? payload.observation : undefined,
        observedUrls: Array.isArray(payload.observedUrls) ? payload.observedUrls.filter((value): value is string => typeof value === "string") : [],
        findings: normalizedFindings,
        stopReason: typeof payload.stopReason === "string" ? payload.stopReason : undefined,
      });
      findings.push(...normalizedFindings);
    } catch {}
  }
  records.sort((a, b) => a.turn - b.turn);
  return { records, findings };
}

async function loadCase(caseId: number): Promise<TargetCase | null> { const [row] = await db.select({ id: researchCasesTable.id, targetEntityId: researchCasesTable.targetEntityId, status: researchCasesTable.status, iteration: researchCasesTable.iteration, objective: researchCasesTable.objective, caseFile: researchCasesTable.caseFile }).from(researchCasesTable).where(eq(researchCasesTable.id, caseId)).limit(1); if (!row?.targetEntityId) return null; return { ...row, targetEntityId: row.targetEntityId, iteration: Number(row.iteration ?? 0), objective: row.objective ?? "" }; }
async function reconcileTargetCaseCancellation(atlasJobId: string, caseId: number): Promise<void> {
  // A strict read is mandatory here: an unavailable durable record is not an
  // operator cancellation, and target case creation must not proceed blindly.
  let job: Awaited<ReturnType<typeof getJobStrict>>;
  try {
    job = await getJobStrict(atlasJobId);
  } catch (error) {
    await db.update(researchCasesTable)
      .set({ status: "review", currentAction: "canonical-job-state-unavailable", updatedAt: new Date() })
      .where(and(eq(researchCasesTable.id, caseId), eq(researchCasesTable.status, "active"), sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${atlasJobId}`));
    throw new Error("Canonical Atlas job state unavailable; target case creation is blocked.", { cause: error });
  }
  if (!job || job.status === "cancelled") {
    const cancelled = job?.status === "cancelled";
    await db.update(researchCasesTable)
      .set({ status: "review", currentAction: cancelled ? "canonical-atlas-cancelled" : "canonical-atlas-job-missing", updatedAt: new Date() })
      .where(and(eq(researchCasesTable.id, caseId), eq(researchCasesTable.status, "active"), sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${atlasJobId}`));
    if (cancelled) throw new Error("Canonical Atlas job cancelled; target case creation raced operator stop.");
    throw new Error("Canonical Atlas job record missing; target case creation cannot be reconciled safely.");
  }
  if (job.status !== "running") throw new Error(`Canonical Atlas job is ${job.status}; refusing further target control-plane work.`);
  if (!(await isCanonicalJobOwner("atlas-run", atlasJobId))) throw new Error("Canonical Atlas lease was lost; refusing further target control-plane work.");
}
function openingContext(target: { name: string; type: string }, companyName: string | null, caseId: number, objective: string, prior: string): string { return compactInvestigationContext({ raw: ["# Apex Atlas — Investigation Context", `Case: ${caseId}`, `Target: ${target.name}`, `Target type: ${target.type}`, `Company: ${companyName ?? "not established"}`, "## Bureau operating law", "Groq Boss is Boss. Groq Right-hand is Right Hand Advisor. the selected Investigator capability owns the research trajectory. The Investigator owns the research trajectory. Deterministic code validates safety, provenance, budgets, lifecycle and promotion integrity; it does not prescribe research hops.", "## Objective", objective, "## Prior durable context", prior || "No prior target-scoped investigation context exists."].join("\n\n") }); }
export type CanonicalSingleTargetResult = { investigatorIterationsUsed: number; resourceLimited: boolean; status: "complete" | "review" | "cancelled"; exhaustedInvestigatorLlm: InvestigatorCapability[]; investigatorLlm: InvestigatorCapability | null };

export async function runCanonicalSingleTargetInvestigation(atlasJobId: string, targetId: number, options: CanonicalSingleTargetOptions = {}): Promise<CanonicalSingleTargetResult> {
  const manageJobLifecycle = options.manageJobLifecycle !== false;
  const publishJob = async (patch: Parameters<typeof updateJob>[1]) => { if (manageJobLifecycle) await updateJob(atlasJobId, patch); };
  const [target] = await db.select({ id: entitiesTable.id, name: entitiesTable.name, type: entitiesTable.type, metadata: entitiesTable.metadata }).from(entitiesTable).where(eq(entitiesTable.id, targetId)).limit(1); if (!target) throw new Error(`Atlas target entity ${targetId} was not found.`);
  const companyName = (() => { try { const metadata = target.metadata ? JSON.parse(target.metadata) as Record<string, unknown> : {}; return typeof metadata.companyName === "string" ? metadata.companyName : null; } catch { return null; } })();
  const caseRow = await ensureTargetCase(target, companyName, atlasJobId, options.existingCaseId);
  await reconcileTargetCaseCancellation(atlasJobId, caseRow.id);
  if (caseRow.status !== "active") {
    if (manageJobLifecycle) {
      const terminalStatus = caseRow.status === "complete" ? "done" : caseRow.status === "cancelled" ? "cancelled" : "failed";
      await publishJob({
        status: terminalStatus,
        outcome: caseRow.status === "complete" ? "complete" : "incomplete",
        message: `Target runner refused to start because durable case status is ${caseRow.status}.`,
        finishedAt: new Date().toISOString(),
      });
    }
    return { investigatorIterationsUsed: 0, resourceLimited: false, status: caseRow.status === "cancelled" ? "cancelled" : caseRow.status === "complete" ? "complete" : "review", exhaustedInvestigatorLlm: [], investigatorLlm: null };
  }
  try { const depth = resolveResearchDepth({ explicit: options.researchDepth }); const targetIterationCeiling = Math.min(depth.agenticMaxIterations, Math.max(0, Math.trunc(options.maxInvestigatorIterations ?? depth.agenticMaxIterations))); const hardTimeoutMs = Math.min(600_000, Math.max(30_000, Number.isFinite(options.targetTimeoutMs) ? Math.trunc(options.targetTimeoutMs!) : depth.agenticHardTimeoutMs)); const deadline = Date.now() + hardTimeoutMs; let caseState = parseCaseFile(caseRow.caseFile); let contextDocument = typeof caseState.contextDocument === "string" ? caseState.contextDocument : openingContext(target, companyName, caseRow.id, caseRow.objective, ""); const durableTrajectory = await loadDurableTargetTrajectory(caseRow.id); if (durableTrajectory.records.length) contextDocument = buildInvestigatorContext({ targetName: target.name, companyName, objective: caseRow.objective, mode: "target", trajectoryRecords: durableTrajectory.records, lastObservation: durableTrajectory.records[durableTrajectory.records.length - 1]?.observation ?? "", findings: durableTrajectory.findings }); const initialExcludedInput = options.excludedInvestigatorLlm ?? []; const initialExcludedInvestigators = new Set<InvestigatorCapability>([...initialExcludedInput, ...getInvestigatorCredentialAliases(process.env, initialExcludedInput)]);
    const storedInvestigatorCapability = typeof caseState.investigatorLlm === "string" ? caseState.investigatorLlm as InvestigatorCapability : null;
    if (storedInvestigatorCapability && !getAvailableInvestigatorCapabilities().includes(storedInvestigatorCapability)) {
      await db.update(researchCasesTable).set({ status: "review", currentAction: "selected-investigator-capability-unavailable", updatedAt: new Date() }).where(and(eq(researchCasesTable.id, caseRow.id), eq(researchCasesTable.status, "active"), sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${atlasJobId}`));
      await publishJob({ status: "failed", progress: 1, outcome: "incomplete", message: "Previously selected Investigator capability " + storedInvestigatorCapability + " is unavailable; refusing silent capability rotation for " + target.name + ".", result: JSON.stringify({ caseId: caseRow.id, selectedInvestigator: storedInvestigatorCapability }) });
      return { investigatorIterationsUsed: 0, resourceLimited: false, status: "review", exhaustedInvestigatorLlm: [], investigatorLlm: storedInvestigatorCapability };
    }
    let investigatorLlm: InvestigatorCapability | null = storedInvestigatorCapability && !initialExcludedInvestigators.has(storedInvestigatorCapability) ? storedInvestigatorCapability : null; let latestResult: Awaited<ReturnType<typeof runTargetContactAgent>> | null = null; let lastOversight: StoredOversight | null = null; let completedActs = 0; let investigatorIterationsUsed = 0; let resourceLimited = false; let deadlineExceeded = false; let cancelled = false; const recentActs: Parameters<typeof reviewTargetInvestigationAct>[0]["recentActs"] = [];
    const quotaExhaustedInvestigators = new Set<InvestigatorCapability>(initialExcludedInvestigators);
    const isHardQuotaResult = (result: Awaited<ReturnType<typeof runTargetContactAgent>>): boolean => result.status === "unavailable" && (result.trajectoryRecords ?? []).some((record) => record.action === "investigator_provider_error" && /upstream_quota_exhausted/i.test(record.observation ?? ""));
    const reassignTargetInvestigatorAfterHardQuota = async (failedCapability: InvestigatorCapability): Promise<InvestigatorCapability> => {
      quotaExhaustedInvestigators.add(failedCapability);
      const excludedCapabilityAliases = getInvestigatorCredentialAliases(process.env, [...quotaExhaustedInvestigators]);
      const bossExcludedCapabilities = [...new Set([...quotaExhaustedInvestigators, ...excludedCapabilityAliases])];
      const alternates = getAvailableDistinctInvestigatorCapabilities(process.env, bossExcludedCapabilities);
      if (!alternates.length) throw new Error(`Groq Investigator capability ${failedCapability} exhausted its hard request quota and no alternate configured Investigator capability remains for target ${target.name}.`);
      if (!(await isCanonicalJobOwner("atlas-run", atlasJobId))) throw new Error("Canonical Atlas lease was lost; refusing target Investigator reassignment.");
      const boss = await runGroqBossDiscovery({
        objective: `${caseRow.objective}\n\nHARD PROVIDER QUOTA RECOVERY: Target Investigator capability ${failedCapability} returned explicit upstream request-quota exhaustion. Select a different currently configured Investigator capability for this same target. Do not repeat an excluded capability and do not prescribe research steps.`,
        motivation: "Recover the current target investigation from an explicitly exhausted Investigator request quota. Boss selects only the replacement capability; the Investigator retains free-ReAct control of research.",
        geography: "Target-specific public web and official sources",
        exclusions: ["Do not browse.", "Do not invent evidence, contacts, relationships or URLs.", "Do not prescribe a fixed search/tool/provider/query sequence.", "Select only an available Investigator capability not listed as exhausted."],
        startingLane: "Boss-directed target Investigator reassignment after explicit hard request-quota exhaustion",
        excludedInvestigatorLlm: bossExcludedCapabilities,
      });
      const replacement = boss.investigatorLlm;
      if (boss.status !== "completed" || !replacement || replacement === failedCapability || quotaExhaustedInvestigators.has(replacement) || !alternates.includes(replacement)) {
        throw new Error(boss.error ?? "Groq Boss did not select a valid alternate Investigator capability for target recovery.");
      }
      const reassignedCaseState = await db.transaction(async (tx) => {
        const [locked] = await tx.select({ status: researchCasesTable.status, currentAction: researchCasesTable.currentAction, caseFile: researchCasesTable.caseFile, iteration: researchCasesTable.iteration })
          .from(researchCasesTable).where(and(eq(researchCasesTable.id, caseRow.id), sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${atlasJobId}`)).for("update").limit(1);
        if (!locked || locked.status !== "active" || ["canonical-atlas-cancelled", "canonical-lease-lost"].includes(String(locked.currentAction ?? ""))) throw new Error("Canonical Atlas target case is no longer active; refusing Investigator reassignment.");
        let durable = parseCaseFile(locked.caseFile);
        const history = Array.isArray(durable.investigatorCapabilityHistory) ? durable.investigatorCapabilityHistory : [];
        const previous = typeof durable.investigatorLlm === "string" ? durable.investigatorLlm : failedCapability;
        const nextFile = { ...durable, investigatorLlm: replacement, investigatorCapabilityHistory: [...history, { from: previous, to: replacement, trigger: "upstream_quota_exhausted" }].slice(-15) };
        const nextIteration = Number(locked.iteration ?? 0) + 1;
        await tx.update(researchCasesTable).set({ caseFile: JSON.stringify(nextFile), iteration: nextIteration, currentAction: "canonical-target-investigator-reassigned-after-hard-quota", updatedAt: new Date() }).where(and(eq(researchCasesTable.id, caseRow.id), sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${atlasJobId}`));
        await tx.insert(researchCaseEventsTable).values({ caseId: caseRow.id, iteration: nextIteration, actorRole: "groq_boss", eventType: "assignment", status: "recorded", summary: "Groq Boss reassigned the target Investigator after explicit hard request-quota exhaustion; the exhausted capability remains excluded for this job.", correlationKey: `${atlasJobId}:target-investigator-reassignment:${failedCapability}:${replacement}:${nextIteration}`, payload: JSON.stringify({ jobId: atlasJobId, targetId: target.id, from: failedCapability, to: replacement, trigger: "upstream_quota_exhausted", excludedInvestigators: bossExcludedCapabilities, bossModel: boss.model, bossStatus: boss.status, bossReport: boss.report }) });
        return nextFile;
      }, { isolationLevel: "serializable" });
      caseState = reassignedCaseState;

      investigatorLlm = replacement;
      return replacement;
    };
  const [openingFence] = await db.update(researchCasesTable).set({ status: "active", currentAction: "groq-boss-opening-assignment", updatedAt: new Date() }).where(and(eq(researchCasesTable.id, caseRow.id), eq(researchCasesTable.status, "active"), sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${atlasJobId}`, sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled', 'canonical-lease-lost')`)).returning({ id: researchCasesTable.id });
  if (!openingFence?.id) throw new Error("Canonical Atlas target case lost its durable cancellation/ownership fence before Boss opening.");
  await publishJob({ status: "running", progress: 0, total: 1, atlasPhase: 0, atlasPhaseTotal: 1, message: `Groq Boss opening assignment for ${target.name}…` });
  if (!investigatorLlm) {
    if (Date.now() >= deadline) deadlineExceeded = true; else {
      const opening = await runGroqBossDiscovery({ objective: `${caseRow.objective}\n\nSHARED CASE CONTEXT:\n${contextDocument}`, motivation: "Select the Investigator capability for one target-scoped free-ReAct investigation. Groq Boss is not the researcher and must not prescribe a tool sequence.", geography: "Target-specific public web and official sources", exclusions: ["Do not browse.", "Do not invent evidence, contacts, relationships or URLs.", "Do not prescribe a fixed search/tool/provider/query sequence.", "Select one currently available Investigator capability from the runtime capability registry. Do not prescribe a tool, provider, query, or research sequence."], startingLane: "exact target assignment from shared case context", excludedInvestigatorLlm: [...initialExcludedInvestigators] });
      investigatorLlm = opening.investigatorLlm; if (!investigatorLlm) { await db.update(researchCasesTable).set({ status: "review", currentAction: "groq-boss-opening-assignment-failed", updatedAt: new Date() }).where(and(eq(researchCasesTable.id, caseRow.id), eq(researchCasesTable.status, "active"), sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${atlasJobId}`, sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled', 'canonical-lease-lost')`)); await publishJob( { status: "failed", progress: 1, message: `Groq Boss did not select a usable Investigator for ${target.name}; no fallback permitted.`, result: JSON.stringify({ caseId: caseRow.id, opening }) }); return { investigatorIterationsUsed: 0, resourceLimited: false, status: "review", exhaustedInvestigatorLlm: [], investigatorLlm }; }
      contextDocument = compactInvestigationContext({ raw: `${contextDocument}\n\n## Groq Boss opening state\nmodel=${opening.model}\nselectedInvestigator=${investigatorLlm}\nreport=${opening.report}\nnextDirections=${opening.nextDirections.join(" | ")}\nuncertainties=${opening.uncertainties.join(" | ")}` }); caseState.contextDocument = contextDocument; caseState.investigatorLlm = investigatorLlm; const [openingProjection] = await db.update(researchCasesTable).set({ caseFile: JSON.stringify(caseState), directorMode: "groq_boss_active", directorModel: opening.model, currentAction: "investigator-act-1", updatedAt: new Date() }).where(and(eq(researchCasesTable.id, caseRow.id), eq(researchCasesTable.status, "active"), sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${atlasJobId}`, sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled', 'canonical-lease-lost')`)).returning({ id: researchCasesTable.id }); if (!openingProjection?.id) throw new Error("Canonical Atlas target case was cancelled before Boss opening projection.");
       await db.transaction(async (tx) => {
         const [locked] = await tx.select({ status: researchCasesTable.status, currentAction: researchCasesTable.currentAction }).from(researchCasesTable).where(and(eq(researchCasesTable.id, caseRow.id), sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${atlasJobId}`)).for("update").limit(1);
         if (!locked || locked.status !== "active" || ["canonical-atlas-cancelled", "canonical-lease-lost"].includes(String(locked.currentAction ?? ""))) throw new Error("Canonical Atlas target case is no longer active; refusing Boss opening event after cancellation.");
         await tx.insert(researchCaseEventsTable).values({
          caseId: caseRow.id,
          iteration: 0,
          actorRole: "groq_boss",
          eventType: "assignment",
          status: "recorded",
          summary: "Groq Boss opened target investigation and selected the Investigator.",
          correlationKey: `${atlasJobId}:target-boss-opening:${caseRow.id}`,
          payload: JSON.stringify({ jobId: atlasJobId, targetId: target.id, model: opening.model, investigatorLlm, report: opening.report, nextDirections: opening.nextDirections, uncertainties: opening.uncertainties }),
         });
       });
      caseState.currentAction = "groq-right-hand-opening-review";
      const rightHandPrompt = "Review Groq Boss opening target assignment before the Investigator starts. Target: " + target.name + " (" + target.type + "). Objective: " + caseRow.objective + ". Boss selected Investigator capability: " + investigatorLlm + ". Boss report: " + (opening.report ?? "") + ". Next directions: " + JSON.stringify(opening.nextDirections) + ". Uncertainties: " + JSON.stringify(opening.uncertainties) + ". Return concise advisory observations only. Do not browse, choose tools, invent evidence, or replace the Investigator. Return JSON with decision, reason, focusLanes, confidence.";
      const rightHandRaw = await runGroqRightHandFreeJson(rightHandPrompt, apexOrientationFor("right_hand") + "\nYou are Groq Right-hand. Review the Boss opening decision only. Do not browse, choose tools, or replace the selected Investigator capability. Reply with ONE JSON object.", ATLAS_OPENING_RIGHT_HAND_REVIEW_RESPONSE_FORMAT).catch((error) => ({ status: "unavailable" as const, model: "none", raw: null, error: safeThrownErrorSummary("Groq Right-hand opening review unavailable", error) }));
      if (rightHandRaw.status !== "completed" || !rightHandRaw.raw?.trim()) {
        await db.update(researchCasesTable).set({ caseFile: JSON.stringify({ ...caseState, rightHandOpening: { status: "unavailable", model: rightHandRaw.model, error: rightHandRaw.error ?? "Right-hand unavailable" } }), status: "review", currentAction: "groq-right-hand-opening-failed", updatedAt: new Date() }).where(and(eq(researchCasesTable.id, caseRow.id), eq(researchCasesTable.status, "active"), sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${atlasJobId}`, sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled', 'canonical-lease-lost')`));
        await publishJob( { status: "failed", progress: 1, outcome: "incomplete", message: "Groq Right-hand opening review failed for " + target.name + "; Investigator execution blocked.", result: JSON.stringify({ caseId: caseRow.id, opening, rightHand: rightHandRaw }), finishedAt: new Date().toISOString() });
        return { investigatorIterationsUsed: 0, resourceLimited: false, status: "review", exhaustedInvestigatorLlm: [], investigatorLlm };
      }
      let rightHandOpening: Record<string, unknown>;
      try {
        const value: unknown = JSON.parse(rightHandRaw.raw);
        const parsed = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
        if (!validateAtlasOpeningRightHandReview(parsed) || !parsed) throw new Error("Right-hand returned an invalid opening review contract.");
        rightHandOpening = { status: "completed", model: rightHandRaw.model, decision: (parsed.decision as string).trim(), reason: (parsed.reason as string).trim(), focusLanes: (parsed.focusLanes as string[]).map((lane) => lane.trim()), confidence: parsed.confidence as number, error: null };
      } catch {
        await db.update(researchCasesTable).set({ status: "review", currentAction: "groq-right-hand-opening-invalid", updatedAt: new Date() }).where(and(eq(researchCasesTable.id, caseRow.id), eq(researchCasesTable.status, "active"), sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${atlasJobId}`, sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled', 'canonical-lease-lost')`));
        await publishJob( { status: "failed", progress: 1, outcome: "incomplete", message: "Groq Right-hand opening review was invalid for " + target.name + "; Investigator execution blocked.", result: JSON.stringify({ caseId: caseRow.id, opening, rightHand: rightHandRaw }), finishedAt: new Date().toISOString() });
        return { investigatorIterationsUsed: 0, resourceLimited: false, status: "review", exhaustedInvestigatorLlm: [], investigatorLlm };
      }
       await db.transaction(async (tx) => {
         const [locked] = await tx.select({ status: researchCasesTable.status, currentAction: researchCasesTable.currentAction }).from(researchCasesTable).where(and(eq(researchCasesTable.id, caseRow.id), sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${atlasJobId}`)).for("update").limit(1);
         if (!locked || locked.status !== "active" || ["canonical-atlas-cancelled", "canonical-lease-lost"].includes(String(locked.currentAction ?? ""))) throw new Error("Canonical Atlas target case is no longer active; refusing Right-hand opening event after cancellation.");
         await tx.insert(researchCaseEventsTable).values({
          caseId: caseRow.id,
          iteration: 0,
          actorRole: "right_hand",
          eventType: "observation",
          status: "recorded",
          summary: "Groq Right-hand reviewed the Boss opening assignment before Investigator execution.",
          correlationKey: `${atlasJobId}:target-right-hand-opening:${caseRow.id}`,
          payload: JSON.stringify({ jobId: atlasJobId, targetId: target.id, bossModel: opening.model, investigatorLlm, rightHandOpening }),
         });
       });
      caseState.rightHandOpening = rightHandOpening;
      caseState.currentAction = "investigator-act-1";
      await db.update(researchCasesTable).set({ caseFile: JSON.stringify(caseState), directorMode: "groq_boss_active", directorModel: opening.model, currentAction: "investigator-act-1", updatedAt: new Date() }).where(and(eq(researchCasesTable.id, caseRow.id), eq(researchCasesTable.status, "active"), sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${atlasJobId}`, sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled', 'canonical-lease-lost')`));
    }
  }
  const durableActTurn = durableTrajectory.records.reduce((max, record) => Math.max(max, Number(record.turn) || 0), 0);
  const firstActNumber = Math.max(1, durableActTurn + 1);
  for (let actNumber = firstActNumber; !deadlineExceeded && !resourceLimited; actNumber++) {
    const job = await getJobStrict(atlasJobId); if (!job) throw new Error("Canonical Atlas job record missing; target job state cannot be confirmed."); if (job.status === "cancelled") { cancelled = true; break; } if (job.status === "failed") break; if (job.status !== "running") throw new Error("Canonical Atlas job is not running; refusing target act execution."); const remainingMs = deadline - Date.now(); if (remainingMs < 30_000) { deadlineExceeded = true; break; }
    const remainingInvestigatorIterations = Math.max(0, targetIterationCeiling - investigatorIterationsUsed); if (remainingInvestigatorIterations <= 0) { resourceLimited = true; break; } const actIterations = Math.min(depth.investigatorIterationsPerAct, remainingInvestigatorIterations); const direction = lastOversight?.action === "redirect" ? lastOversight.direction : actNumber === 1 ? (options.initialDirection?.trim() || null) : null; const actContext = compactInvestigationContext({ raw: `${contextDocument}\n\n## Current control turn\n${caseRow.iteration + actNumber}${direction ? `\n\n## Investigator research objective\n${direction}` : ""}` }); await publishJob( { progress: 0, atlasPhase: actNumber, atlasPhaseTotal: 0, message: `${investigatorLlm!.toUpperCase()} Investigator act ${actNumber} for ${target.name}; awaiting Boss control after completion…` });
    const actTimeoutMs = deriveProviderBoundedActTimeoutMs(remainingMs, AGENTIC_PROVIDER_DECISION_TIMEOUT_MS);
    let quotaRecoveryIterations = 0;
    while (true) {
      latestResult = await runTargetContactAgent({ entityId: target.id, caseId: caseRow.id, targetName: target.name, companyName, jobId: atlasJobId, investigatorLlm: investigatorLlm!, maxIterations: Math.max(1, actIterations - quotaRecoveryIterations), hardTimeoutMs: actTimeoutMs, contextDocument: actContext, oversightMode: "caller", shouldCancel: async () => { if (Date.now() >= deadline) return true; const current = await getJobStrict(atlasJobId); if (!current) throw new Error("Canonical Atlas job record missing during Investigator act."); if (current.status === "cancelled" || current.status === "failed" || current.status !== "running") return true; const ownsLease = await isCanonicalJobOwner("atlas-run", atlasJobId); if (!ownsLease) throw new Error("Canonical Atlas lease was lost during Investigator act."); return false; } });
      if (!isHardQuotaResult(latestResult)) break;
      quotaRecoveryIterations += Math.max(0, latestResult.iterations ?? latestResult.trajectoryRecords.length);
      if (quotaRecoveryIterations >= actIterations) { resourceLimited = true; break; }
      await reassignTargetInvestigatorAfterHardQuota(investigatorLlm!);
      if (!(await isCanonicalJobOwner("atlas-run", atlasJobId))) throw new Error("Canonical Atlas lease was lost; refusing target Investigator reassignment.");
    }
    // An agentic loop may stop itself when a best-effort cancellation poll cannot
    // read Redis. Confirm durable state before calling that result an operator cancel.
    if (latestResult.status === "cancelled") {
      const stoppedJob = await getJobStrict(atlasJobId);
      if (!stoppedJob) throw new Error("Canonical Atlas job record missing after Investigator stop; cancellation is unconfirmed.");
      if (stoppedJob.status === "cancelled") { cancelled = true; break; }
      if (stoppedJob.status === "failed") break;
      throw new Error("Investigator stopped, but durable Atlas cancellation could not be confirmed.");
    }
    completedActs = latestResult.status === "completed" ? actNumber : completedActs; const finalActIterations = isHardQuotaResult(latestResult) ? 0 : Math.max(0, latestResult?.iterations ?? latestResult?.trajectoryRecords.length ?? 0); investigatorIterationsUsed += quotaRecoveryIterations + finalActIterations; if (investigatorIterationsUsed >= depth.agenticMaxIterations) resourceLimited = true;
    const episodeRecords = latestResult.trajectoryRecords ?? [];
    const currentAct = episodeRecords.length ? {
      turn: episodeRecords[episodeRecords.length - 1]!.turn,
      model: latestResult.model,
      action: "react_episode",
      args: { iterations: latestResult.iterations, searches: latestResult.searches, visits: latestResult.visits },
      thought: episodeRecords[episodeRecords.length - 1]!.thought,
      execution: latestResult.status === "completed" ? "success" : latestResult.status,
      observation: episodeRecords.map((record) => `[turn ${record.turn}] action=${record.action} execution=${record.execution}\n${record.observation ?? ""}`).join("\n\n").slice(-18_000),
      observedUrls: [...new Set(episodeRecords.flatMap((record) => record.observedUrls ?? []))],
      findings: episodeRecords.flatMap((record) => record.findings ?? []),
      providerFallback: [...new Set(episodeRecords.flatMap((record) => record.providerFallback ?? []))],
      stopReason: latestResult.stopReason,
      sourceRecords: episodeRecords.map((record) => ({ turn: record.turn, model: record.model, action: record.action, args: record.args, execution: record.execution, observation: record.observation, observedUrls: record.observedUrls ?? [], findings: record.findings ?? [], stopReason: record.stopReason })),
    } : null;
    if (!currentAct || !latestResult.executionId) {
      lastOversight = {
        status: "unavailable",
        action: "stop",
        direction: null,
        reason: "Completed Investigator act had no durable execution record; continuation is fail-closed.",
        bossModel: null,
        error: "Missing Investigator act record or executionId.",
        evidenceGraphCount: 0,
      };
      break;
    }
    if (isTransientInvestigatorCapacityError(latestResult)) {
      // Token-window capacity is transient provider capacity, not provider death.
      // Preserve the durable trajectory and advance to the next controlled act
      // rather than parking the target or invoking a different model.
      recentActs.push(currentAct);
      if (recentActs.length > 4) recentActs.splice(0, recentActs.length - 4);
      caseState.currentAction = "investigator-act-capacity-wait";
      await db.update(researchCasesTable).set({
        caseFile: JSON.stringify({ ...caseState, contextDocument, lastOversight: null }),
        currentAction: "investigator-act-capacity-wait",
        updatedAt: new Date(),
      }).where(and(
        eq(researchCasesTable.id, caseRow.id),
        eq(researchCasesTable.status, "active"),
        sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${atlasJobId}`,
        sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled', 'canonical-lease-lost')`,
      ));
      lastOversight = null;
      continue;
    }
    lastOversight = await reviewTargetInvestigationAct({
      caseId: caseRow.id,
      controlTurn: actNumber,
      runId: latestResult.executionId,
      targetName: target.name,
      targetType: target.type,
      objective: caseRow.objective,
      sharedContext: contextDocument,
      act: currentAct,
      recentActs: recentActs.slice(-4),
      jobId: atlasJobId,
    });
    recentActs.push(currentAct);
    if (recentActs.length > 4) recentActs.splice(0, recentActs.length - 4);
    const refreshed = await loadCase(caseRow.id); if (!refreshed) { lastOversight = null; break; } caseState = parseCaseFile(refreshed.caseFile ?? null); lastOversight = readOversight(caseState, latestResult.executionId ?? null, actNumber); const durableAfterAct = await loadDurableTargetTrajectory(caseRow.id); contextDocument = durableAfterAct.records.length ? buildInvestigatorContext({ targetName: target.name, companyName, objective: caseRow.objective, mode: "target", trajectoryRecords: durableAfterAct.records, lastObservation: durableAfterAct.records[durableAfterAct.records.length - 1]?.observation ?? "", findings: durableAfterAct.findings }) : appendDurableActContext(typeof caseState.contextDocument === "string" ? caseState.contextDocument : actContext, actNumber, latestResult, lastOversight); caseState.contextDocument = contextDocument; await db.update(researchCasesTable).set({ caseFile: JSON.stringify({ ...caseState, contextDocument, lastOversight }), currentAction: latestResult.status === "completed" ? `investigator-act-${actNumber + 1}` : "investigator-act-failed", updatedAt: new Date() }).where(and(eq(researchCasesTable.id, caseRow.id), eq(researchCasesTable.status, "active"), sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${atlasJobId}`, sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled', 'canonical-lease-lost')`)); const jobAfterAct = await getJobStrict(atlasJobId); if (!jobAfterAct) throw new Error("Canonical Atlas job record missing after target act; terminal state is unknown."); if (jobAfterAct.status === "cancelled") { cancelled = true; break; } if (jobAfterAct.status === "failed") break; if (jobAfterAct.status !== "running") throw new Error("Canonical Atlas job is not running after target act; refusing continuation."); if (latestResult.status !== "completed") break; if (!lastOversight || lastOversight.status !== "completed") break; if (lastOversight.action === "stop") break;
  }
  if (!deadlineExceeded && Date.now() >= deadline) deadlineExceeded = true; const stopped = isCanonicalTargetEpisodeComplete({ investigatorStatus: latestResult?.status ?? null, stopReason: latestResult?.stopReason ?? null, evidenceGraphCount: lastOversight?.evidenceGraphCount ?? 0, oversightStatus: lastOversight?.status ?? null, oversightAction: lastOversight?.action ?? null, cancelled, resourceLimited, deadlineExceeded }); const incomplete = !stopped;
  const finalCase = await db.update(researchCasesTable).set({ status: incomplete ? "review" : "complete", currentAction: incomplete ? (cancelled ? "cancelled" : "investigator-incomplete-or-time-limited") : "awaiting-human-review", iteration: sql<number>`${researchCasesTable.iteration} + ${completedActs}`, lastDecisionAt: new Date(), updatedAt: new Date(), caseFile: JSON.stringify({ ...caseState, contextDocument, lastOversight, completedActs, resourceLimited, deadlineExceeded, cancelled }) }).where(and(eq(researchCasesTable.id, caseRow.id), eq(researchCasesTable.status, "active"), sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${atlasJobId}`, sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled', 'canonical-lease-lost', 'canonical-continuation-cancelled')`)).returning({ status: researchCasesTable.status });

  const authoritativeCase = finalCase[0] ?? await loadCase(caseRow.id);
  const terminal = deriveCanonicalTerminalDecision({ durableCaseStatus: authoritativeCase?.status ?? null, locallyCancelled: cancelled });
  await publishJob( { status: terminal.jobStatus, progress: terminal.outcome === "complete" ? 1 : 0, total: 1, atlasPhase: terminal.outcome === "complete" ? 1 : 0, atlasPhaseTotal: 1, outcome: terminal.outcome, message: stopped ? `Groq Boss explicitly stopped ${target.name} after ${completedActs} Investigator act(s).` : cancelled ? `Target investigation for ${target.name} was cancelled after ${completedActs} controlled act(s).` : deadlineExceeded ? `Target investigation for ${target.name} reached its global deadline after ${completedActs} controlled act(s).` : `Target investigation for ${target.name} preserved for review after ${completedActs} controlled act(s).`, result: JSON.stringify({ caseId: caseRow.id, investigator: latestResult ? { status: latestResult.status, model: latestResult.model, findings: latestResult.findings, searches: latestResult.searches, visits: latestResult.visits, iterations: latestResult.iterations, trajectory: latestResult.trajectory, trajectoryRecords: latestResult.trajectoryRecords, evidenceGraphs: latestResult.evidenceGraphs, executionId: latestResult.executionId } : null, lastOversight, completedActs, investigatorIterationsUsed, resourceLimited, deadlineExceeded, cancelled, hardTimeoutMs, terminal, durableCaseStatus: authoritativeCase?.status ?? null }), finishedAt: new Date().toISOString() }); return { investigatorIterationsUsed, resourceLimited, status: cancelled ? "cancelled" : authoritativeCase?.status === "complete" ? "complete" : "review", exhaustedInvestigatorLlm: [...quotaExhaustedInvestigators].filter((capability) => !initialExcludedInvestigators.has(capability)), investigatorLlm };
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "";
    let currentJob: Awaited<ReturnType<typeof getJobStrict>> = null;
    let jobStateUnavailable = false;
    try { currentJob = await getJobStrict(atlasJobId); } catch { jobStateUnavailable = true; }
    const cancelledByJob = currentJob?.status === "cancelled" || rawMessage.startsWith("Canonical Atlas job cancelled;");
    const parentStateUnavailable = jobStateUnavailable
      || (!currentJob && !cancelledByJob)
      || /job record missing|job state unavailable|job record state is unknown/i.test(rawMessage);
    const leaseUnavailableOrLost = /Canonical Atlas lease (?:was lost|state is unavailable)/i.test(rawMessage);
    const parentAlreadyTerminal = Boolean(currentJob && currentJob.status !== "running" && currentJob.status !== "cancelled");
    const message = cancelledByJob
      ? "Target investigation was cancelled; the result is incomplete."
      : parentStateUnavailable
        ? "Target investigation stopped because durable job state is unavailable; the result is incomplete."
        : safeThrownErrorSummary("Canonical target investigation failed", error);
    await db.update(researchCasesTable).set({
      status: "review",
      currentAction: cancelledByJob ? "canonical-atlas-cancelled" : parentStateUnavailable ? "canonical-job-state-unavailable" : leaseUnavailableOrLost ? "canonical-lease-lost" : parentAlreadyTerminal ? "canonical-parent-job-terminal" : "investigator-execution-failed",
      updatedAt: new Date(),
    }).where(and(
      eq(researchCasesTable.id, caseRow.id),
      eq(researchCasesTable.status, "active"),
      sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${atlasJobId}`,
      sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`,
    ));
    if (currentJob?.status === "running") {
      await publishJob({
        status: cancelledByJob ? "cancelled" : "failed",
        outcome: "incomplete",
        message,
        finishedAt: new Date().toISOString(),
      });
    }
    throw error;
  }

}
