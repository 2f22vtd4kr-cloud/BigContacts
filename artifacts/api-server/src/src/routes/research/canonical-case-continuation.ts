import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, researchCasesTable, researchCaseEventsTable } from "@workspace/db";
import { createJob, getActiveJob, getJob, setActiveJob, updateJob, clearActiveJobIfOwned } from "../../lib/job-queue";
import { runGeminiBossDiscovery } from "../../lib/case-bureau";
import { runDeepSeekFreeJson } from "../../lib/deepseek-case-reasoning";
import { runBureauAgenticWebPass } from "../../lib/bureau-agentic-pass";
import { resolveResearchDepth } from "../../lib/research-depth";

const router = Router();
function parseFile(raw: string | null): Record<string, any> | null { try { const value = raw ? JSON.parse(raw) : null; return value && typeof value === "object" ? value : null; } catch { return null; } }
function contextOf(file: Record<string, any>): string { const context = typeof file.contextDocument === "string" ? file.contextDocument.trim() : ""; if (!context) throw new Error("Canonical discovery case has no durable context document; refusing context-free continuation."); return context.slice(0, 28000); }

router.post("/research/bureau/cases/:caseId/run-next-pass", async (req, res): Promise<void> => {
  const caseId = Number(req.params.caseId); if (!Number.isInteger(caseId) || caseId <= 0) { res.status(400).json({ error: "Invalid bureau case ID" }); return; }
  const [current] = await db.select().from(researchCasesTable).where(eq(researchCasesTable.id, caseId)).limit(1); if (!current) { res.status(404).json({ error: "Bureau case not found" }); return; }
  const file = parseFile(current.caseFile); if (!file || file.caseType !== "discovery") { res.status(409).json({ error: "Only a discovery case can run the canonical continuation" }); return; }
  const active = await getActiveJob("case-bureau-discovery"); if (active) { const existing = await getJob(active); if (existing?.status === "running" || existing?.status === "queued") { res.status(409).json({ error: "A bureau discovery investigation is already running.", jobId: active }); return; } }
  let initialContext: string; try { initialContext = contextOf(file); } catch (error) { res.status(409).json({ error: error instanceof Error ? error.message : "Durable case context is missing." }); return; }
  const jobId = await createJob("case-bureau-discovery"); await setActiveJob("case-bureau-discovery", jobId); const iteration = Number(current.iteration ?? 0) + 1;
  try {
    await db.transaction(async (tx) => {
      const [locked] = await tx.select({ caseFile: researchCasesTable.caseFile, caseType: researchCasesTable.caseType }).from(researchCasesTable).where(eq(researchCasesTable.id, caseId)).for("update").limit(1);
      if (!locked || locked.caseType !== "discovery") throw new Error("Discovery case disappeared or changed type before continuation binding.");
      const lockedFile = parseFile(locked.caseFile); if (!lockedFile) throw new Error("Discovery case state is unreadable before continuation binding.");
      const priorJobs = Array.isArray(lockedFile.jobIds) ? lockedFile.jobIds.filter((value: unknown): value is string => typeof value === "string" && value.trim()) : [];
      const nextFile = { ...lockedFile, jobId, jobIds: [...new Set([...priorJobs, jobId])].slice(-32) };
      await tx.update(researchCasesTable).set({ caseFile: JSON.stringify(nextFile), status: "active", currentAction: "canonical-case-continuation", updatedAt: new Date() }).where(eq(researchCasesTable.id, caseId));
      await tx.insert(researchCaseEventsTable).values({ caseId, iteration, actorRole: "head_investigator", eventType: "assignment", summary: "Canonical case continuation started from shared investigation context; no fixed search/registry lane is used.", correlationKey: `discovery-continuation:case:${caseId}:job:${jobId}:turn:${iteration}:assignment`, payload: JSON.stringify({ jobId, mode: "discovery", caseId, controlTurn: iteration }) });
    }, { isolationLevel: "serializable" });
  } catch (error) {
    await updateJob(jobId, { status: "failed", outcome: "incomplete", message: error instanceof Error ? error.message : "Discovery continuation binding failed.", finishedAt: new Date().toISOString() }).catch(() => undefined);
    await clearActiveJobIfOwned("case-bureau-discovery", jobId).catch(() => undefined);
    res.status(409).json({ error: error instanceof Error ? error.message : "Discovery continuation binding failed.", jobId });
    return;
  }
  await updateJob(jobId, { status: "running", progress: 0, total: 4, message: "DeepSeek Right-hand reviewing the accumulated case context…" });
  void (async () => {
    try {
      const depth = resolveResearchDepth({ explicit: typeof file.researchDepth === "string" ? file.researchDepth : undefined });
      const rightRaw = await runDeepSeekFreeJson(`Review the accumulated discovery investigation before Gemini decides whether another Investigator pass is useful.\n\nSHARED INVESTIGATION CONTEXT:\n${initialContext}\n\nDo not browse. Do not choose a person or contact. Return JSON with decision, reason, focusLanes, confidence.`, "You are the DeepSeek/NVIDIA Right-hand Advisor. Review case state only; never act as Investigator and never invent evidence. Reply with ONE JSON object.").catch((error) => ({ status: "unavailable" as const, model: "deepseek-ai/deepseek-v4-flash-0731", raw: null, error: error instanceof Error ? error.message : "DeepSeek unavailable" }));
      let rightHand = { status: rightRaw.status === "completed" ? "completed" as const : "unavailable" as const, model: rightRaw.model, decision: null as string | null, reason: null as string | null, focusLanes: [] as string[], confidence: null as number | null, error: rightRaw.error ?? null };
      if (rightRaw.status === "completed" && rightRaw.raw) { try { const parsed = JSON.parse(rightRaw.raw) as Record<string, unknown>; rightHand = { status: "completed", model: rightRaw.model, decision: typeof parsed.decision === "string" ? parsed.decision.slice(0, 500) : null, reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 1000) : null, focusLanes: Array.isArray(parsed.focusLanes) ? parsed.focusLanes.filter((v): v is string => typeof v === "string").slice(0, 8) : [], confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : null, error: null }; } catch { rightHand.error = "Right-hand returned invalid JSON."; } }
      const boss = await runGeminiBossDiscovery({ objective: `Review this existing discovery case and decide whether a selected Investigator should continue it. Do not start a fixed research sequence.\n\nSHARED INVESTIGATION CONTEXT:\n${initialContext}`, motivation: "Continuation of one existing Bureau investigation. Use accumulated evidence, avoid duplicate work, and preserve model-owned research trajectory.", geography: String(file.humanBrief?.geography ?? "Public web"), exclusions: Array.isArray(file.humanBrief?.exclusions) ? file.humanBrief.exclusions : [], rightHandAdvice: rightHand, startingLane: "model-selected continuation from shared case context" });
      await updateJob(jobId, { progress: 1, message: boss.investigatorLlm ? `${boss.investigatorLlm.toUpperCase()} Investigator continuing from shared context…` : "Gemini did not select an Investigator; continuation closed.", result: JSON.stringify({ rightHand, boss }) }); if (!boss.investigatorLlm) throw new Error("Gemini Boss did not select a Groq/Mistral Investigator.");
      const discovery = await runBureauAgenticWebPass({ mode: "discovery", targetName: "", objective: ["Continue the existing discovery investigation from the mounted case context.", "Do not repeat resolved work. Choose your own next query/tool/pivot from the evidence and open questions.", "Only emit a promotion decision for an exact named person with observed source-backed evidence."].join("\n"), investigatorLlm: boss.investigatorLlm, caseId, jobId, maxIterations: depth.agenticMaxIterations, hardTimeoutMs: depth.agenticHardTimeoutMs });
      const report = { id: `canonical-continuation-${jobId}`, lane: "broad-web", provider: `Agentic-ReAct ${discovery.model}`, status: discovery.status === "completed" ? "completed" : discovery.status === "unavailable" ? "unavailable" : "failed", iteration, summary: `Canonical continuation: ${discovery.findings.length} source-backed finding(s).`, findings: discovery.trajectory.slice(-16), candidateNames: discovery.findings.filter((f) => f.promotionDecision === "promote" && f.scope === "candidate" && typeof f.personName === "string" && f.personName.trim()).map((f) => f.personName!.trim()), sourceUrls: discovery.findings.flatMap((f) => f.sourceUrls).slice(0, 30), nextQuestions: [], contactEvidence: discovery.contactEvidence, error: discovery.error ?? null, createdAt: new Date().toISOString() };
      await db.transaction(async (tx) => {
        const [locked] = await tx.select({ caseFile: researchCasesTable.caseFile, caseType: researchCasesTable.caseType }).from(researchCasesTable).where(eq(researchCasesTable.id, caseId)).for("update").limit(1);
        if (!locked || locked.caseType !== "discovery") throw new Error("Discovery case disappeared before continuation projection.");
        const lockedFile = parseFile(locked.caseFile); if (!lockedFile) throw new Error("Discovery case state became unreadable before continuation projection.");
        const nextFile = { ...lockedFile, investigatorReports: [...(Array.isArray(lockedFile.investigatorReports) ? lockedFile.investigatorReports : []), report], currentProgress: { ...(lockedFile.currentProgress ?? {}), reportCount: Number(lockedFile.currentProgress?.reportCount ?? 0) + 1, lastReviewedBy: "gemini-boss", refreshedAt: new Date().toISOString() }, nextInvestigation: { rightHand, boss: { status: boss.status === "completed" ? "completed" : "unavailable", decision: boss.report, candidateNames: boss.candidates.map((c) => c.name), nextDirections: boss.nextDirections, uncertainties: boss.uncertainties, error: boss.error, reviewedAt: new Date().toISOString() } }, lastUpdatedBy: "canonical-case-continuation", jobId, jobIds: [...new Set([...(Array.isArray(lockedFile.jobIds) ? lockedFile.jobIds : []), jobId])].slice(-32) };
        await tx.update(researchCasesTable).set({ caseFile: JSON.stringify(nextFile), status: "review", currentAction: "human-review-discovery-candidates", iteration, lastDecisionAt: new Date(), updatedAt: new Date() }).where(eq(researchCasesTable.id, caseId));
        await tx.insert(researchCaseEventsTable).values({ caseId, iteration, actorRole: "specialist", eventType: "observation", status: "recorded", summary: `Canonical continuation completed with ${discovery.findings.length} source-backed finding(s); no deterministic research lane executed.`, correlationKey: `discovery-continuation:case:${caseId}:job:${jobId}:turn:${iteration}:observation`, payload: JSON.stringify({ jobId, caseId, investigatorLlm: boss.investigatorLlm, searches: discovery.searches, visits: discovery.visits, status: discovery.status }) }).onConflictDoNothing({ target: [researchCaseEventsTable.caseId, researchCaseEventsTable.correlationKey] });
      }, { isolationLevel: "serializable" });
      await updateJob(jobId, { status: "done", progress: 4, total: 4, outcome: "complete", message: `Canonical continuation complete; ${discovery.findings.length} source-backed finding(s) recorded.`, finishedAt: new Date().toISOString() });
    } catch (error) { const message = error instanceof Error ? error.message : "Canonical case continuation failed."; await db.update(researchCasesTable).set({ status: "review", currentAction: "canonical-continuation-error", updatedAt: new Date() }).where(eq(researchCasesTable.id, caseId)); await updateJob(jobId, { status: "failed", outcome: "incomplete", message, finishedAt: new Date().toISOString() }); }
    finally { await clearActiveJobIfOwned("case-bureau-discovery", jobId); }
  })();
  res.status(202).json({ jobId, caseId, status: "running", mode: "canonical-model-owned-continuation" });
});
export default router;
