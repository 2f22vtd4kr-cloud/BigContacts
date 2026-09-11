import { and, eq } from "drizzle-orm";
import { db, entitiesTable, researchCasesTable } from "@workspace/db";
import { getJob, updateJob, clearActiveJobIfOwned } from "./job-queue";
import { runGeminiBossDiscovery } from "./case-bureau";
import { runTargetContactAgent } from "./target-contact-agent";
import { resolveResearchDepth, type ResearchDepth } from "./research-depth";
import { compactInvestigationContext } from "./investigation-context-compaction";

export type CanonicalSingleTargetOptions = { researchDepth?: ResearchDepth; targetTimeoutMs?: number };

type StoredOversight = { action: "continue" | "redirect" | "stop"; direction?: string | null; reason?: string | null; status?: string; bossModel?: string | null; error?: string | null };
type TargetCase = { id: number; targetEntityId: number; status: string; iteration: number; objective: string; caseFile: string | null };

function parseCaseFile(raw: string | null): Record<string, unknown> {
  try { const value = raw ? JSON.parse(raw) : {}; return value && typeof value === "object" ? value as Record<string, unknown> : {}; } catch { return {}; }
}

function readOversight(caseFile: Record<string, unknown>): StoredOversight | null {
  const history = Array.isArray(caseFile.investigatorActOversight) ? caseFile.investigatorActOversight : [];
  const latest = history[history.length - 1];
  if (!latest || typeof latest !== "object") return null;
  const value = (latest as Record<string, unknown>).oversight;
  if (!value || typeof value !== "object") return null;
  const action = (value as Record<string, unknown>).action;
  if (action !== "continue" && action !== "redirect" && action !== "stop") return null;
  const oversight = value as Record<string, unknown>;
  return { action, direction: typeof oversight.direction === "string" ? oversight.direction : null, reason: typeof oversight.reason === "string" ? oversight.reason : null, status: typeof oversight.status === "string" ? oversight.status : undefined, bossModel: typeof oversight.bossModel === "string" ? oversight.bossModel : null, error: typeof oversight.error === "string" ? oversight.error : null };
}

async function ensureTargetCase(target: { id: number; name: string; type: string }, companyName: string | null, atlasJobId: string): Promise<TargetCase> {
  const [existing] = await db.select({ id: researchCasesTable.id, targetEntityId: researchCasesTable.targetEntityId, status: researchCasesTable.status, iteration: researchCasesTable.iteration, objective: researchCasesTable.objective, caseFile: researchCasesTable.caseFile }).from(researchCasesTable).where(and(eq(researchCasesTable.targetEntityId, target.id), eq(researchCasesTable.caseType, "target"))).limit(1);
  if (existing?.targetEntityId) {
    const existingCaseFile = parseCaseFile(existing.caseFile);
    if (existingCaseFile.atlasJobId !== atlasJobId || JSON.stringify(existingCaseFile.target) !== JSON.stringify({ id: target.id, name: target.name, type: target.type })) {
      existingCaseFile.atlasJobId = atlasJobId;
      existingCaseFile.target = { id: target.id, name: target.name, type: target.type };
      await db.update(researchCasesTable).set({ caseFile: JSON.stringify(existingCaseFile), updatedAt: new Date() }).where(eq(researchCasesTable.id, existing.id));
    }
    return { ...existing, targetEntityId: existing.targetEntityId, iteration: Number(existing.iteration ?? 0), objective: existing.objective ?? `Investigate ${target.name} for realistic public contact routes.` };
  }
  const objective = `Investigate the exact named target ${target.name}${companyName ? ` at ${companyName}` : ""} for realistic public contact routes.`;
  const [created] = await db.insert(researchCasesTable).values({ targetEntityId: target.id, caseType: "target", status: "active", directorMode: "gemini_boss_pending", directorProvider: "gemini", directorModel: "auto-low-cost-pending", objective, motivation: "Target-scoped Apex Atlas investigation with continuous Gemini Boss + DeepSeek Right Hand oversight.", openingPrompt: objective, caseFile: JSON.stringify({ version: 2, target: { id: target.id, name: target.name, type: target.type }, atlasJobId, investigatorActOversight: [] }), currentAction: "right-hand-preflight", iteration: 0 }).returning({ id: researchCasesTable.id, targetEntityId: researchCasesTable.targetEntityId, status: researchCasesTable.status, iteration: researchCasesTable.iteration, objective: researchCasesTable.objective, caseFile: researchCasesTable.caseFile });
  if (!created?.targetEntityId) throw new Error(`Unable to create investigation case for ${target.name}.`);
  return { ...created, targetEntityId: created.targetEntityId, iteration: Number(created.iteration ?? 0), objective: created.objective ?? objective };
}

async function loadCase(caseId: number): Promise<TargetCase | null> {
  const [row] = await db.select({ id: researchCasesTable.id, targetEntityId: researchCasesTable.targetEntityId, status: researchCasesTable.status, iteration: researchCasesTable.iteration, objective: researchCasesTable.objective, caseFile: researchCasesTable.caseFile }).from(researchCasesTable).where(eq(researchCasesTable.id, caseId)).limit(1);
  if (!row?.targetEntityId) return null;
  return { ...row, targetEntityId: row.targetEntityId, iteration: Number(row.iteration ?? 0), objective: row.objective ?? "" };
}

function openingContext(target: { name: string; type: string }, companyName: string | null, caseId: number, objective: string, prior: string): string {
  return compactInvestigationContext({ raw: ["# Apex Atlas — Investigation Context", `Case: ${caseId}`, `Target: ${target.name}`, `Target type: ${target.type}`, `Company: ${companyName ?? "not established"}`, "## Bureau operating law", "Gemini is Boss. DeepSeek/NVIDIA is Right Hand Advisor. Groq/Mistral are Investigator capabilities. The Investigator owns the research trajectory. Deterministic code validates safety, provenance, budgets, lifecycle and promotion integrity; it does not prescribe research hops.", "## Objective", objective, "## Prior durable context", prior || "No prior target-scoped investigation context exists."].join("\n\n"), maxChars: 32_000 });
}

/** Canonical target runner: exactly one Investigator ReAct action crosses the observation boundary before DeepSeek Right Hand + Gemini Boss can permit the next action. */
export async function runCanonicalSingleTargetInvestigation(atlasJobId: string, targetId: number, options: CanonicalSingleTargetOptions = {}): Promise<void> {
  const [target] = await db.select({ id: entitiesTable.id, name: entitiesTable.name, type: entitiesTable.type, metadata: entitiesTable.metadata }).from(entitiesTable).where(eq(entitiesTable.id, targetId)).limit(1);
  if (!target) throw new Error(`Atlas target entity ${targetId} was not found.`);
  const companyName = (() => { try { const metadata = target.metadata ? JSON.parse(target.metadata) as Record<string, unknown> : {}; return typeof metadata.companyName === "string" ? metadata.companyName : null; } catch { return null; } })();
  const caseRow = await ensureTargetCase(target, companyName, atlasJobId);
  const depth = resolveResearchDepth({ explicit: options.researchDepth });
  const hardTimeoutMs = Math.max(30_000, options.targetTimeoutMs ?? depth.agenticHardTimeoutMs);
  const deadline = Date.now() + hardTimeoutMs;
  const maxActs = Math.max(1, Math.min(40, depth.agenticMaxIterations));
  let caseState = parseCaseFile(caseRow.caseFile);
  let contextDocument = typeof caseState.contextDocument === "string" ? caseState.contextDocument : openingContext(target, companyName, caseRow.id, caseRow.objective, "");
  let investigatorLlm: "groq" | "mistral" | null = typeof caseState.investigatorLlm === "string" && (caseState.investigatorLlm === "groq" || caseState.investigatorLlm === "mistral") ? caseState.investigatorLlm : null;
  let latestResult: Awaited<ReturnType<typeof runTargetContactAgent>> | null = null;
  let lastOversight: StoredOversight | null = null;
  let completedActs = 0;
  let deadlineExceeded = false;
  let cancelled = false;

  await db.update(researchCasesTable).set({ status: "active", currentAction: "gemini-opening-assignment", updatedAt: new Date() }).where(eq(researchCasesTable.id, caseRow.id));
  await updateJob(atlasJobId, { status: "running", progress: 0, total: maxActs + 2, atlasPhase: 0, atlasPhaseTotal: maxActs + 2, message: `Gemini Boss opening assignment for ${target.name}…` });

  if (!investigatorLlm) {
    if (Date.now() >= deadline) {
      deadlineExceeded = true;
    } else {
      const opening = await runGeminiBossDiscovery({ objective: `${caseRow.objective}\n\nSHARED CASE CONTEXT:\n${contextDocument}`, motivation: "Select the Investigator capability for one target-scoped free-ReAct investigation. Gemini is not the researcher and must not prescribe a tool sequence.", geography: "Target-specific public web and official sources", exclusions: ["Do not browse.", "Do not invent evidence, contacts, relationships or URLs.", "Do not prescribe a fixed search/tool/provider sequence.", "Select only groq or mistral as Investigator."], startingLane: "exact target assignment from shared case context" });
      investigatorLlm = opening.investigatorLlm;
      if (!investigatorLlm) {
        await db.update(researchCasesTable).set({ status: "review", currentAction: "gemini-opening-assignment-failed", updatedAt: new Date() }).where(eq(researchCasesTable.id, caseRow.id));
        await updateJob(atlasJobId, { status: "failed", progress: 1, message: `Gemini Boss did not select a usable Investigator for ${target.name}; no fallback permitted.`, result: JSON.stringify({ caseId: caseRow.id, opening }) });
        await clearActiveJobIfOwned("atlas-run", atlasJobId);
        return;
      }
      contextDocument = compactInvestigationContext({ raw: `${contextDocument}\n\n## Gemini Boss opening state\nmodel=${opening.model}\nselectedInvestigator=${investigatorLlm}\nreport=${opening.report}\nnextDirections=${opening.nextDirections.join(" | ")}\nuncertainties=${opening.uncertainties.join(" | ")}`, maxChars: 32_000 });
      caseState.contextDocument = contextDocument;
      caseState.investigatorLlm = investigatorLlm;
      await db.update(researchCasesTable).set({ caseFile: JSON.stringify(caseState), directorMode: "gemini_boss_active", directorModel: opening.model, currentAction: "investigator-act-1", updatedAt: new Date() }).where(eq(researchCasesTable.id, caseRow.id));
    }
  }

  for (let actNumber = 1; actNumber <= maxActs && !deadlineExceeded; actNumber++) {
    const job = await getJob(atlasJobId);
    if (!job || job.status === "cancelled") { cancelled = true; break; }
    if (job.status === "failed") break;

    const remainingMs = deadline - Date.now();
    // The Investigator wrapper has a 30s minimum hard timeout. Do not start a
    // new act when less than that remains; otherwise the global deadline could
    // be exceeded merely by entering the act.
    if (remainingMs < 30_000) { deadlineExceeded = true; break; }

    const direction = lastOversight?.action === "redirect" ? lastOversight.direction : null;
    const actContext = compactInvestigationContext({ raw: `${contextDocument}\n\n## Current control turn\n${actNumber}${direction ? `\n\n## Gemini research objective\n${direction}` : ""}`, maxChars: 32_000 });
    await updateJob(atlasJobId, { progress: actNumber, atlasPhase: actNumber, message: `${investigatorLlm!.toUpperCase()} Investigator act ${actNumber}/${maxActs} for ${target.name}; awaiting Boss control after completion…` });
    latestResult = await runTargetContactAgent({ entityId: target.id, targetName: target.name, companyName, jobId: atlasJobId, investigatorLlm: investigatorLlm!, maxIterations: 1, hardTimeoutMs: Math.min(55_000, remainingMs), contextDocument: actContext, shouldCancel: async () => { const current = await getJob(atlasJobId); return !current || current.status === "cancelled" || current.status === "failed" || Date.now() >= deadline; } });
    completedActs = actNumber;

    const refreshed = await loadCase(caseRow.id);
    if (!refreshed) { lastOversight = null; break; }
    caseState = parseCaseFile(refreshed.caseFile ?? null);
    lastOversight = readOversight(caseState);
    contextDocument = typeof caseState.contextDocument === "string" ? caseState.contextDocument : actContext;

    if (latestResult.status === "cancelled" || (await getJob(atlasJobId))?.status === "cancelled") { cancelled = true; break; }
    if (latestResult.status !== "completed") break;
    if (!lastOversight || lastOversight.status !== "completed") break;
    if (lastOversight.action === "stop") break;
  }

  if (!deadlineExceeded && Date.now() >= deadline) deadlineExceeded = true;
  const stopped = lastOversight?.action === "stop" && !cancelled;
  const resourceLimited = !stopped && !cancelled && !deadlineExceeded && completedActs >= maxActs;
  const incomplete = cancelled || !latestResult || latestResult.status !== "completed" || resourceLimited || !stopped || deadlineExceeded;
  await db.update(researchCasesTable).set({ status: incomplete ? "review" : "complete", currentAction: incomplete ? (cancelled ? "cancelled" : "investigator-incomplete-or-resource-limited") : "awaiting-human-review", lastDecisionAt: new Date(), updatedAt: new Date(), caseFile: JSON.stringify({ ...caseState, contextDocument, lastOversight, completedActs, resourceLimited, deadlineExceeded, cancelled }) }).where(eq(researchCasesTable.id, caseRow.id));
  await updateJob(atlasJobId, { status: cancelled ? "cancelled" : incomplete ? "failed" : "done", progress: Math.min(maxActs + 2, completedActs + 1), total: maxActs + 2, atlasPhase: Math.min(maxActs + 2, completedActs + 1), atlasPhaseTotal: maxActs + 2, outcome: cancelled ? "cancelled" : incomplete ? "incomplete" : "complete", message: stopped ? `Gemini Boss explicitly stopped ${target.name} after ${completedActs} Investigator act(s).` : cancelled ? `Target investigation for ${target.name} was cancelled after ${completedActs} controlled act(s).` : deadlineExceeded ? `Target investigation for ${target.name} reached its global deadline after ${completedActs} controlled act(s).` : `Target investigation for ${target.name} preserved for review after ${completedActs} controlled act(s).`, result: JSON.stringify({ caseId: caseRow.id, investigator: latestResult ? { status: latestResult.status, model: latestResult.model, findings: latestResult.findings, searches: latestResult.searches, visits: latestResult.visits, contactOutcome: latestResult.contactOutcome, evidenceGraphs: latestResult.evidenceGraphs } : null, lastOversight, completedActs, resourceLimited, deadlineExceeded, cancelled, hardTimeoutMs }), finishedAt: new Date().toISOString() });
  await clearActiveJobIfOwned("atlas-run", atlasJobId);
}
