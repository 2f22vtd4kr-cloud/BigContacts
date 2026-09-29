import { afterEach, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";

function extractAdmittedCandidates(prompt: string): string[] {
  const match = prompt.match(/## Admitted candidates\s+([\s\S]*?)\s+## Investigator text report/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1]!.trim()) as Array<{ name?: unknown }>;
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item?.name === "string").map((item) => String(item.name))
      : [];
  } catch {
    return [];
  }
}

vi.mock("../lib/case-bureau", async () => {
  const actual = await vi.importActual<typeof import("../lib/case-bureau")>("../lib/case-bureau");
  return {
    ...actual,
    runGeminiBossDiscovery: vi.fn(async () => ({
      status: "completed" as const,
      model: "development-test-boss",
      investigatorLlm: "groq" as const,
      report: "Development-only control-plane substitution; downstream research remains canonical.",
      candidates: [],
      citations: [],
      nextDirections: ["Start model-owned discovery with the selected Investigator."],
      uncertainties: ["Gemini Boss opening reasoning was substituted for this development test."],
      error: null,
    })),
    resolveGeminiBossModel: vi.fn(async () => ({
      model: "development-test-boss",
      status: "resolved" as const,
      inspectedKeyCount: 0,
      candidateCount: 1,
      candidateModels: ["development-test-boss"],
      keyName: "development-test",
    })),
    generateGeminiBossText: vi.fn(async (_selection: unknown, prompt: string) => {
      if (prompt.includes("You are Gemini Boss supervising ONE Investigator act")) {
        return {
          model: "development-test-boss",
          raw: JSON.stringify({
            action: "stop",
            direction: null,
            reason: "Development-only surrogate reviewed the completed real Investigator act and found no justified need for another act.",
            confidence: 0.8,
          }),
          error: null,
        };
      }

      if (prompt.includes("You are Gemini Boss controlling the Apex Atlas research bureau")) {
        const candidates = extractAdmittedCandidates(prompt);
        return {
          model: "development-test-boss",
          raw: JSON.stringify(candidates.length > 0
            ? {
                action: "research_candidate",
                candidateName: candidates[0],
                direction: "Investigate the admitted named person for realistic public contact routes.",
                reason: "Development-only surrogate selected the first actually admitted candidate; no candidate was invented.",
                confidence: 0.8,
              }
            : {
                action: "stop",
                candidateName: null,
                direction: null,
                reason: "No exact named admission candidate was produced by the real Investigator, so downstream target research cannot be justified.",
                confidence: 0.9,
              }),
          error: null,
        };
      }

      return {
        model: "development-test-boss",
        raw: JSON.stringify({
          action: "stop",
          candidateName: null,
          direction: null,
          reason: "Development-only surrogate stopped because no recognized canonical control contract was presented.",
          confidence: 0.8,
        }),
        error: null,
      };
    }),
  };
});

vi.mock("../lib/gemini-right-hand-reasoning", async () => {
  const actual = await vi.importActual<typeof import("../lib/gemini-right-hand-reasoning")>("../lib/gemini-right-hand-reasoning");
  return {
    ...actual,
    runGeminiRightHandFreeJson: vi.fn(async () => ({
      status: "completed" as const,
      model: "development-test-right-hand",
      raw: JSON.stringify({
        decision: "continue",
        reason: "Development-only surrogate reviewed the supplied state without browsing, selecting tools, or inventing evidence.",
        focusLanes: ["identity", "source support", "next useful research question"],
        confidence: 0.8,
      }),
      error: null,
    })),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

it("runs the real canonical downstream pipeline with only Gemini Boss and Right-hand substituted", async () => {
  const { db, entitiesTable, researchCasesTable, researchCaseEventsTable } = await import("@workspace/db");
  const { clearActiveJobIfOwned, createJob, getJob, setActiveJob, updateJob } = await import("../lib/job-queue");
  const { enablePermanentRedis, disconnectRedis } = await import("../lib/redis");
  const { runCanonicalAtlasPipeline } = await import("../lib/canonical-atlas-discovery");

  await enablePermanentRedis();
  const jobId = await createJob("atlas-run");
  await setActiveJob("atlas-run", jobId);
  await updateJob(jobId, {
    status: "running",
    progress: 0,
    total: 4,
    atlasPhase: 0,
    atlasPhaseTotal: 4,
    message: "Development-only control-plane substitution test started.",
  });

  try {
    const result = await runCanonicalAtlasPipeline(jobId, {
      targetCount: 1,
      researchDepth: "fast",
      targetTimeoutMs: 120_000,
    });
    const finalJob = await getJob(jobId);

    const targetCases = await db
      .select({
        id: researchCasesTable.id,
        status: researchCasesTable.status,
        caseFile: researchCasesTable.caseFile,
      })
      .from(researchCasesTable)
      .where(eq(researchCasesTable.caseType, "target"));

    const targetCaseIds = targetCases
      .filter((row) => typeof row.caseFile === "string" && row.caseFile.includes(jobId))
      .map((row) => row.id);

    const investigatorObservations = targetCaseIds.length === 0
      ? []
      : await db
        .select({ id: researchCaseEventsTable.id })
        .from(researchCaseEventsTable)
        .where(and(
          eq(researchCaseEventsTable.eventType, "tool_observation"),
          eq(researchCaseEventsTable.actorRole, "head_investigator"),
        ));

    const jobEntities = await db
      .select({ id: entitiesTable.id, name: entitiesTable.name, metadata: entitiesTable.metadata })
      .from(entitiesTable);

    const entitiesForJob = jobEntities.filter(
      (row) => typeof row.metadata === "string" && row.metadata.includes(jobId),
    );

    console.log(JSON.stringify({
      jobId,
      pipelineResult: result,
      finalJob,
      targetCases: targetCases.filter((row) => targetCaseIds.includes(row.id)),
      investigatorObservationCount: investigatorObservations.length,
      entitiesForJob,
      substitutedRoles: ["gemini_boss", "gemini_right_hand"],
      canonicalRolesKeptReal: [
        "groq_or_mistral_investigator",
        "web_tools",
        "evidence_persistence",
        "card_projection",
      ],
    }));

    expect(finalJob?.status).toBe("done");
    expect(finalJob?.outcome).toBe("complete");
    expect(result.phase).toBe(4);
    expect(targetCaseIds.length).toBeGreaterThan(0);
    expect(targetCases.some((row) => targetCaseIds.includes(row.id) && row.status === "complete")).toBe(true);
    expect(investigatorObservations.length).toBeGreaterThan(0);
    expect(entitiesForJob.length).toBeGreaterThan(0);
  } finally {
    await clearActiveJobIfOwned("atlas-run", jobId).catch(() => undefined);
    await disconnectRedis().catch(() => undefined);
  }
}, 30 * 60 * 1000);
