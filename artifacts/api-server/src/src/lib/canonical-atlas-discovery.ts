import { eq } from "drizzle-orm";
import { db, entitiesTable, contactEvidenceTable } from "@workspace/db";
import { updateJob, clearActiveJobIfOwned } from "./job-queue";
import { runDeepSeekDiscoveryAdvice, runGeminiBossDiscovery } from "./case-bureau";
import { runBureauAgenticWebPass } from "./bureau-agentic-pass";
import { resolveResearchDepth } from "./research-depth";

export type CanonicalAtlasOptions = {
  targetCount?: number;
  researchDepth?: "fast" | "standard" | "deep";
  targetTimeoutMs?: number;
};

export type CanonicalAtlasResult = {
  phase: number;
  ingested: number;
  enriched: number;
  contactsFound: number;
  hotLeads: number;
  durationMs: number;
  phaseSummary: Record<string, string>;
};

function uniqueNames(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length >= 3))];
}

/**
 * Public Atlas discovery control plane. Gemini/DeepSeek coordinate; the selected
 * Groq/Mistral Investigator performs the actual open-web work. Deterministic code
 * only validates and persists model-emitted evidence.
 */
export async function runCanonicalAtlasPipeline(
  atlasJobId: string,
  opts: CanonicalAtlasOptions = {},
): Promise<CanonicalAtlasResult> {
  const startedAt = Date.now();
  const depth = resolveResearchDepth({ explicit: opts.researchDepth });
  const targetCount = Math.max(1, Math.min(20, Math.trunc(opts.targetCount ?? 3)));
  const phaseSummary: Record<string, string> = {};

  await updateJob(atlasJobId, {
    status: "running",
    progress: 0,
    total: 4,
    atlasPhase: 0,
    atlasPhaseTotal: 4,
    message: "Gemini Boss + DeepSeek Right-hand opening model-owned discovery…",
  });

  try {
    const rightHand = await runDeepSeekDiscoveryAdvice({
      file: undefined as never,
      iteration: 1,
    }).catch((error) => ({
      status: "unavailable" as const,
      model: "none",
      decision: null,
      reason: null,
      focusLanes: [],
      confidence: null,
      error: error instanceof Error ? error.message : "Right-hand unavailable",
    }));

    const boss = await runGeminiBossDiscovery({
      objective: "Discover real named people who may be worth a target-scoped public-contact investigation. Favor attributable operating-company, filing, leadership, foundation, transaction, and other primary-source paths. Do not invent people or contacts.",
      motivation: "Find a small set of real people for deep target-scoped investigation.",
      geography: "Public web; geography selected by the research objective",
      exclusions: [
        "Do not browse as Boss.",
        "Do not prescribe a fixed tool or search sequence.",
        "Do not invent people, contacts, relationships, or URLs.",
        "Select only groq or mistral as Investigator.",
      ],
      rightHandAdvice: rightHand,
      startingLane: "model-selected discovery",
    });

    if (!boss.investigatorLlm) {
      phaseSummary.assignment = "No usable Gemini-selected Investigator; fail closed.";
      await updateJob(atlasJobId, {
        status: "failed",
        progress: 1,
        atlasPhase: 1,
        outcome: "incomplete",
        message: "Gemini Boss did not select a Groq/Mistral Investigator; no fallback was attempted.",
        result: JSON.stringify({ rightHand, boss }),
        finishedAt: new Date().toISOString(),
      });
      await clearActiveJobIfOwned("atlas-run", atlasJobId);
      return { phase: 1, ingested: 0, enriched: 0, contactsFound: 0, hotLeads: 0, durationMs: Date.now() - startedAt, phaseSummary };
    }

    await updateJob(atlasJobId, {
      progress: 1,
      atlasPhase: 1,
      message: `${boss.investigatorLlm.toUpperCase()} Investigator running free-ReAct discovery…`,
      result: JSON.stringify({ rightHand, boss: { status: boss.status, model: boss.model, investigatorLlm: boss.investigatorLlm } }),
    });

    const discovery = await runBureauAgenticWebPass({
      targetName: "Discovery slot",
      objective: "Discover real named people for subsequent target-scoped public-contact research. Choose every search, page visit, registry/domain/OSINT action and stopping point yourself. Emit a person only when you can attribute the observed source to that person; use promotionDecision=promote only for an exact named-person admission candidate. Never invent a person, contact, or URL.",
      investigatorLlm: boss.investigatorLlm,
      jobId: atlasJobId,
      maxIterations: depth.agenticMaxIterations,
      hardTimeoutMs: opts.targetTimeoutMs ?? depth.agenticHardTimeoutMs,
    });

    const admitted = uniqueNames(
      discovery.findings
        .filter((finding) => finding.promotionDecision === "promote")
        .filter((finding) => finding.personName && finding.personName.trim().length >= 3)
        .map((finding) => finding.personName as string),
    ).slice(0, targetCount);

    let materialized = 0;
    let evidenceRows = 0;
    for (const name of admitted) {
      const finding = discovery.findings.find(
        (candidate) => candidate.personName?.trim().toLowerCase() === name.toLowerCase() && candidate.promotionDecision === "promote",
      );
      const sourceUrl = finding?.sourceUrls?.[0] ?? null;
      const existing = await db.select({ id: entitiesTable.id })
        .from(entitiesTable)
        .where(sqlNameEquals(name))
        .limit(1);
      let entityId = existing[0]?.id ?? null;
      if (!entityId) {
        const [created] = await db.insert(entitiesTable).values({
          name,
          type: "HNWI",
          bayesianScore: 0.05,
          contactConfidence: 0,
          contactOutcome: "evidence_only",
          isHot: false,
          isStarred: false,
          isHidden: false,
          sourceRegistries: JSON.stringify(["canonical-agentic-discovery"]),
          notes: "Model-selected discovery candidate; target-scoped Investigator research required before contact promotion.",
          metadata: JSON.stringify({ reviewOnly: true, admission: "investigator-explicit-promotion", sourceUrl }),
        }).returning({ id: entitiesTable.id });
        entityId = created?.id ?? null;
        if (entityId) materialized += 1;
      }
      if (!entityId || !sourceUrl) continue;
      await db.insert(contactEvidenceTable).values({
        entityId,
        vectorType: "other",
        value: `person:${name}`,
        source: `canonical-agentic-discovery:${atlasJobId}`,
        sourceUrl,
        extractionMethod: "agentic-model-finding",
        sourceReliability: 0.55,
        identityMatch: 0.85,
        recencyScore: 0.7,
        directnessScore: 0.5,
        independentCorroboration: 1,
        validationStatus: "candidate",
        metadata: JSON.stringify({
          scope: "candidate",
          personName: name,
          promotionDecision: "promote",
          reviewOnly: true,
        }),
      }).onConflictDoNothing();
      evidenceRows += 1;
    }

    phaseSummary.assignment = `${boss.investigatorLlm} selected by Gemini; discovery completed=${discovery.status}.`;
    phaseSummary.discovery = `admitted=${admitted.length}; materialized=${materialized}; evidenceRows=${evidenceRows}; searches=${discovery.searches}; visits=${discovery.visits}`;

    await updateJob(atlasJobId, {
      progress: 2,
      atlasPhase: 2,
      message: admitted.length
        ? `Deep target research queued for ${admitted.length} exact named candidate(s).`
        : "No exact named-person admission candidate was emitted; run closed without synthetic targets.",
    });

    let researched = 0;
    let contactsFound = 0;
    for (const name of admitted) {
      const [entity] = await db.select({ id: entitiesTable.id, name: entitiesTable.name }).from(entitiesTable).where(eq(entitiesTable.name, name)).limit(1);
      if (!entity) continue;
      const target = await runBureauAgenticWebPass({
        targetName: entity.name,
        objective: `Deep target-scoped investigation of the exact admitted person ${entity.name}. Start from the admission evidence and choose every next action yourself. Recover realistic public contact routes only when attributable to this exact person. Emit promotionDecision=promote only for a value you personally judge attributable and source-backed.`,
        investigatorLlm: boss.investigatorLlm,
        jobId: atlasJobId,
        maxIterations: depth.agenticMaxIterations,
        hardTimeoutMs: opts.targetTimeoutMs ?? depth.agenticHardTimeoutMs,
        entityId: entity.id,
        persist: true,
      });
      researched += 1;
      contactsFound += target.findings.filter((finding) => finding.promotionDecision === "promote").length;
    }

    phaseSummary.research = `researched=${researched}; explicitPromotions=${contactsFound}`;
    await updateJob(atlasJobId, {
      status: "done",
      progress: 4,
      total: 4,
      atlasPhase: 4,
      atlasPhaseTotal: 4,
      outcome: "complete",
      message: `Canonical Investigator discovery/research complete: ${researched} target(s), ${contactsFound} explicit promotion finding(s).`,
      result: JSON.stringify({ rightHand, boss: { status: boss.status, model: boss.model, investigatorLlm: boss.investigatorLlm }, discovery: { status: discovery.status, findings: discovery.findings.length, searches: discovery.searches, visits: discovery.visits }, phaseSummary }),
      finishedAt: new Date().toISOString(),
    });
    await clearActiveJobIfOwned("atlas-run", atlasJobId);
    return { phase: 4, ingested: 0, enriched: materialized, contactsFound, hotLeads: admitted.length, durationMs: Date.now() - startedAt, phaseSummary };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Canonical Atlas discovery failed.";
    await updateJob(atlasJobId, { status: "failed", outcome: "incomplete", message, finishedAt: new Date().toISOString() });
    await clearActiveJobIfOwned("atlas-run", atlasJobId);
    throw error;
  }
}

function sqlNameEquals(name: string) {
  return eq(entitiesTable.name, name);
}
