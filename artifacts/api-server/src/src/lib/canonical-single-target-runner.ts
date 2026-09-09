import { eq } from "drizzle-orm";
import { db, entitiesTable } from "@workspace/db";
import { getJob, updateJob, clearActiveJobIfOwned } from "./job-queue";
import { runGeminiBossDiscovery } from "./case-bureau";
import { runDeepSeekFreeJson } from "./deepseek-case-reasoning";
import { runTargetContactAgent } from "./target-contact-agent";
import { resolveResearchDepth } from "./research-depth";

/**
 * Canonical single-target control plane.
 *
 * Gemini and DeepSeek only provide oversight/assignment. The selected Groq or
 * Mistral Investigator owns the actual target research and explicit promotion.
 * This runner deliberately contains no deterministic enrichment sequence.
 */
export async function runCanonicalSingleTargetInvestigation(
  atlasJobId: string,
  targetId: number,
): Promise<void> {
  const [target] = await db
    .select({ id: entitiesTable.id, name: entitiesTable.name, type: entitiesTable.type, metadata: entitiesTable.metadata })
    .from(entitiesTable)
    .where(eq(entitiesTable.id, targetId))
    .limit(1);

  if (!target) throw new Error(`Atlas target entity ${targetId} was not found.`);

  const depth = resolveResearchDepth();
  await updateJob(atlasJobId, {
    status: "running",
    progress: 0,
    total: 3,
    atlasPhase: 0,
    atlasPhaseTotal: 3,
    message: `Boss + Right-hand assigning Investigator for ${target.name}…`,
  });

  let rightHand: { status: "completed" | "unavailable"; model: string; decision: string | null; reason: string | null; focusLanes: string[]; confidence: number | null; error: string | null } = {
    status: "unavailable",
    model: "none",
    decision: null,
    reason: null,
    focusLanes: [],
    confidence: null,
    error: null,
  };
  try {
    const raw = await runDeepSeekFreeJson(
      `Review this exact target before Gemini assigns its Investigator: ${target.name} (${target.type}). Give concise research priorities only. Do not browse and do not choose a contact. Return JSON with decision, reason, focusLanes, confidence.`,
      "You are the DeepSeek/NVIDIA Right-hand. Advise the Boss only. Never act as Investigator, never browse, and never invent evidence. Reply with ONE JSON object.",
    );
    if (raw.status === "completed") {
      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(raw.raw ?? "{}"); } catch { parsed = {}; }
      rightHand = {
        status: "completed",
        model: raw.model,
        decision: typeof parsed.decision === "string" ? parsed.decision.slice(0, 500) : null,
        reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 1000) : null,
        focusLanes: Array.isArray(parsed.focusLanes) ? parsed.focusLanes.filter((v): v is string => typeof v === "string").slice(0, 8) : [],
        confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : null,
        error: null,
      };
    } else {
      rightHand.error = raw.error ?? "Right-hand unavailable";
    }
  } catch (error) {
    rightHand.error = error instanceof Error ? error.message : "Right-hand unavailable";
  }

  await updateJob(atlasJobId, {
    progress: 1,
    atlasPhase: 1,
    message: `Gemini Boss assigning Investigator for ${target.name}…`,
    result: JSON.stringify({ rightHand }),
  });

  const companyName = (() => {
    try {
      const meta = target.metadata ? JSON.parse(target.metadata) as Record<string, unknown> : {};
      return typeof meta.companyName === "string" ? meta.companyName : null;
    } catch { return null; }
  })();
  const boss = await runGeminiBossDiscovery({
    objective: `Investigate the exact named target ${target.name}${companyName ? ` at ${companyName}` : ""} for realistic public contact routes. This is a target-scoped assignment, not broad people discovery.`,
    motivation: "Assign one Investigator LLM to a free-ReAct target dig; the Investigator owns tool choice, evidence judgment, stopping, and explicit promotion.",
    geography: "Target-specific public web and official sources",
    exclusions: [
      "Never browse as Boss.",
      "Do not invent contacts, people, relationships, or URLs.",
      "Do not prescribe a fixed tool or search sequence.",
      "Select only groq or mistral as Investigator.",
    ],
    rightHandAdvice: rightHand,
    startingLane: "exact target assignment",
  });
  if (!boss.investigatorLlm) {
    await updateJob(atlasJobId, {
      status: "failed",
      progress: 2,
      atlasPhase: 2,
      message: `Gemini Boss did not select a usable Investigator for ${target.name}; run closed without fallback.`,
      result: JSON.stringify({ rightHand, boss: { status: boss.status, model: boss.model, error: boss.error } }),
      finishedAt: new Date().toISOString(),
    });
    await clearActiveJobIfOwned("atlas-run", atlasJobId);
    return;
  }

  await updateJob(atlasJobId, {
    progress: 2,
    atlasPhase: 2,
    message: `${boss.investigatorLlm.toUpperCase()} Investigator researching ${target.name}…`,
    result: JSON.stringify({ rightHand, boss: { status: boss.status, model: boss.model, investigatorLlm: boss.investigatorLlm } }),
  });

  const result = await runTargetContactAgent({
    entityId: target.id,
    targetName: target.name,
    companyName,
    jobId: atlasJobId,
    investigatorLlm: boss.investigatorLlm,
    maxIterations: depth.agenticMaxIterations,
    hardTimeoutMs: depth.agenticHardTimeoutMs,
  });

  const incomplete = result.status !== "completed";
  await updateJob(atlasJobId, {
    status: incomplete ? "failed" : "done",
    progress: 3,
    total: 3,
    atlasPhase: 3,
    atlasPhaseTotal: 3,
    outcome: incomplete ? "incomplete" : "complete",
    message: incomplete
      ? `Investigator ${result.status} for ${target.name}; no provider fallback was attempted.`
      : `Investigator ${result.model} completed the target dig for ${target.name}; explicit promotions persisted only where emitted.`,
    result: JSON.stringify({
      rightHand,
      boss: { status: boss.status, model: boss.model, investigatorLlm: boss.investigatorLlm },
      investigator: {
        status: result.status,
        model: result.model,
        findings: result.findings,
        searches: result.searches,
        visits: result.visits,
        contactOutcome: result.contactOutcome,
      },
    }),
    finishedAt: new Date().toISOString(),
  });
  await clearActiveJobIfOwned("atlas-run", atlasJobId);

  const current = await getJob(atlasJobId);
  if (!current) return;
}
