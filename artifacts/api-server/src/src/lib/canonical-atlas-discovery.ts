import { and, eq, inArray } from "drizzle-orm";
import { db, entitiesTable } from "@workspace/db";
import { updateJob, clearActiveJobIfOwned } from "./job-queue";
import { runGeminiBossDiscovery } from "./case-bureau";
import { runDeepSeekFreeJson } from "./deepseek-case-reasoning";
import { runBureauAgenticWebPass } from "./bureau-agentic-pass";
import { persistSourceBackedBureauContactsForEntity } from "./bureau-contact-persist-strict";
import { runCanonicalSingleTargetInvestigation } from "./canonical-single-target-runner";
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

function isObservedHttpSource(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\/\S+$/i.test(value);
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
    const rightHandRaw = await runDeepSeekFreeJson(
      "Review the Apex Atlas discovery mission before Gemini assigns its Investigator. Return concise research priorities only. Do not browse, do not choose contacts, and do not invent people. Return JSON with decision, reason, focusLanes, confidence.",
      "You are the DeepSeek/NVIDIA Right-hand. Advise the Boss only. Never act as Investigator and never browse. Reply with ONE JSON object.",
    ).catch((error) => ({
      status: "unavailable" as const,
      model: "none",
      raw: null,
      error: error instanceof Error ? error.message : "Right-hand unavailable",
    }));

    let rightHand: {
      status: "completed" | "unavailable";
      model: string;
      decision: string | null;
      reason: string | null;
      focusLanes: string[];
      confidence: number | null;
      error: string | null;
    } = {
      status: rightHandRaw.status === "completed" ? "completed" : "unavailable",
      model: rightHandRaw.model,
      decision: null,
      reason: null,
      focusLanes: [],
      confidence: null,
      error: rightHandRaw.error ?? null,
    };
    if (rightHandRaw.status === "completed" && rightHandRaw.raw) {
      try {
        const parsed = JSON.parse(rightHandRaw.raw) as Record<string, unknown>;
        rightHand = {
          status: "completed",
          model: rightHandRaw.model,
          decision: typeof parsed.decision === "string" ? parsed.decision.slice(0, 500) : null,
          reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 1000) : null,
          focusLanes: Array.isArray(parsed.focusLanes)
            ? parsed.focusLanes.filter((value): value is string => typeof value === "string").slice(0, 8)
            : [],
          confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : null,
          error: null,
        };
      } catch {
        rightHand.error = "Right-hand returned invalid JSON.";
      }
    }

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

    // Admission is an identity boundary. A promotion decision by itself is not
    // enough: the finding must explicitly be person-scoped and backed by an
    // HTTP(S) source actually observed by the Investigator runtime.
    const admitted = uniqueNames(
      discovery.findings
        .filter((finding) => finding.promotionDecision === "promote")
        .filter((finding) => finding.scope === "candidate")
        .filter((finding) => typeof finding.personName === "string" && finding.personName.trim().length >= 3)
        .filter((finding) => Array.isArray(finding.sourceUrls) && finding.sourceUrls.some(isObservedHttpSource))
        .map((finding) => finding.personName as string),
    ).slice(0, targetCount);

    let materialized = 0;
    let evidenceRows = 0;
    for (const name of admitted) {
      const finding = discovery.findings.find(
        (candidate) => candidate.personName?.trim().toLowerCase() === name.toLowerCase()
          && candidate.promotionDecision === "promote"
          && candidate.scope === "candidate"
          && Array.isArray(candidate.sourceUrls)
          && candidate.sourceUrls.some(isObservedHttpSource),
      );
      const sourceUrl = finding?.sourceUrls?.find(isObservedHttpSource) ?? null;
      if (!sourceUrl) continue;

      // Never bind an exact-name admission to an organization/trust entity with
      // the same display name. A person admission may only reuse a person-shaped
      // entity; otherwise create a review-only HNWI record.
      const existingRows = await db.select({ id: entitiesTable.id })
        .from(entitiesTable)
        .where(and(
          eq(entitiesTable.name, name),
          inArray(entitiesTable.type, ["HNWI", "Gatekeeper"]),
        ))
        .limit(1);
      const existing = existingRows[0];
      let entityId = existing?.id ?? null;
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
      if (!entityId) continue;
      await persistSourceBackedBureauContactsForEntity(entityId, [{
        vectorType: "other",
        value: `person:${name}`,
        scope: "candidate",
        personName: name,
        role: finding?.role ?? "discovery candidate",
        sourceUrls: [sourceUrl],
        note: "Explicit Investigator discovery admission; review-only until target-scoped research.",
        tier: "candidate",
        state: "review_only",
        promote: false,
      }], "canonical-agentic-discovery", atlasJobId);
      evidenceRows += 1;
    }

    phaseSummary.assignment = `${boss.investigatorLlm} selected by Gemini; discovery completed=${discovery.status}.`;
    phaseSummary.discovery = `admitted=${admitted.length}; materialized=${materialized}; evidenceRows=${evidenceRows}; searches=${discovery.searches}; visits=${discovery.visits}`;

    await updateJob(atlasJobId, {
      progress: 2,
      atlasPhase: 2,
      message: admitted.length
        ? `Deep target research starting for ${admitted.length} exact named candidate(s).`
        : "No exact named-person admission candidate was emitted; run closed without synthetic targets.",
    });

    let researched = 0;
    let contactsFound = 0;
    for (const name of admitted) {
      const [entity] = await db.select({ id: entitiesTable.id, name: entitiesTable.name })
        .from(entitiesTable)
        .where(and(eq(entitiesTable.name, name), inArray(entitiesTable.type, ["HNWI", "Gatekeeper"])))
        .limit(1);
      if (!entity) continue;

      // Every admitted target must traverse the canonical single-target control
      // plane. This creates/loads durable case state and gives the target its own
      // Gemini Boss -> DeepSeek Right-hand -> Investigator -> Right-hand -> Boss
      // lifecycle. The batch loop may select targets, but it must not bypass the
      // per-target oversight boundary or run a context-free ReAct pass.
      const before = await db.select({
        email: entitiesTable.email,
        phone: entitiesTable.phone,
        linkedinUrl: entitiesTable.linkedinUrl,
        twitterHandle: entitiesTable.twitterHandle,
        instagramHandle: entitiesTable.instagramHandle,
        telegramHandle: entitiesTable.telegramHandle,
        personalWebsite: entitiesTable.personalWebsite,
      }).from(entitiesTable).where(eq(entitiesTable.id, entity.id)).limit(1);
      const beforeCard = before[0] ?? null;

      await runCanonicalSingleTargetInvestigation(atlasJobId, entity.id, {
        researchDepth: opts.researchDepth,
        targetTimeoutMs: opts.targetTimeoutMs,
      });
      researched += 1;

      const after = await db.select({
        email: entitiesTable.email,
        phone: entitiesTable.phone,
        linkedinUrl: entitiesTable.linkedinUrl,
        twitterHandle: entitiesTable.twitterHandle,
        instagramHandle: entitiesTable.instagramHandle,
        telegramHandle: entitiesTable.telegramHandle,
        personalWebsite: entitiesTable.personalWebsite,
      }).from(entitiesTable).where(eq(entitiesTable.id, entity.id)).limit(1);
      const afterCard = after[0] ?? null;
      if (beforeCard && afterCard) {
        const cardFields: Array<keyof typeof beforeCard> = ["email", "phone", "linkedinUrl", "twitterHandle", "instagramHandle", "telegramHandle", "personalWebsite"];
        contactsFound += cardFields.filter((field) => beforeCard[field] !== afterCard[field] && afterCard[field]).length;
      }
    }

    phaseSummary.research = `researched=${researched}; explicitCardPromotions=${contactsFound}`;
    await updateJob(atlasJobId, {
      status: "done",
      progress: 4,
      total: 4,
      atlasPhase: 4,
      atlasPhaseTotal: 4,
      outcome: "complete",
      message: `Canonical Investigator discovery/research complete: ${researched} target(s), ${contactsFound} card field promotion(s).`,
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