import { appendFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";

const AUDIT_PATH = path.resolve(process.cwd(), "../../audits/apex-atlas-development-control-plane-audit-2026-09-29.md");

async function appendAudit(action: string, command: string, observed: unknown, interpretation: string, nextAction: string): Promise<void> {
  const entry = [
    `\n## ${new Date().toISOString()}`,
    `- action: ${action}`,
    `- exact command/request: ${command}`,
    `- observed result: ${JSON.stringify(observed)}`,
    `- interpretation: ${interpretation}`,
    `- next action: ${nextAction}`,
  ].join("\n") + "\n";
  await appendFile(AUDIT_PATH, entry, "utf8");
}

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

const discoveryControlState = vi.hoisted(() => ({ turns: 0 }));

vi.mock("../lib/case-bureau", async () => {
  const actual = await vi.importActual<typeof import("../lib/case-bureau")>("../lib/case-bureau");
  return {
    ...actual,
    runGroqBossDiscovery: vi.fn(async () => ({
      status: "completed" as const,
      model: "development-test-boss",
      investigatorLlm: (process.env.MISTRAL_API_KEY ? "mistral" : "groq") as "groq" | "mistral",
      report: "Development-only control-plane substitution; downstream research remains canonical.",
      candidates: [],
      citations: [],
      nextDirections: ["Start model-owned discovery with the selected Investigator."],
      uncertainties: ["Groq Boss opening reasoning was substituted for this development test."],
      error: null,
    })),
    resolveGroqBossModel: vi.fn(async () => ({
      model: "development-test-boss",
      status: "resolved" as const,
      inspectedKeyCount: 0,
      candidateCount: 1,
      candidateModels: ["development-test-boss"],
      keyName: "development-test",
    })),
    generateGroqBossText: vi.fn(async (_selection: unknown, prompt: string) => {
      if (prompt.includes("You are Groq Boss supervising ONE Investigator act")) {
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

      if (prompt.includes("You are Groq Boss controlling the Apex Atlas research bureau")) {
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
            : (() => {
              discoveryControlState.turns += 1;
              if (discoveryControlState.turns <= 4) {
                return {
                  action: "continue_discovery",
                  candidateName: null,
                  direction: "Continue model-owned public-web discovery for one exact named OpenAI executive or founder. Prefer an official OpenAI page or another directly retrieved authoritative page that identifies the person. Choose the next search or visit yourself; do not invent a person, URL, or evidence.",
                  reason: "No admission-grade candidate exists yet; the development surrogate is allowing another real Investigator discovery turn without fabricating a candidate.",
                  confidence: 0.8,
                };
              }
              return {
                action: "stop",
                candidateName: null,
                direction: null,
                reason: "The bounded development discovery budget produced no admission-grade candidate; stop without fabricating one.",
                confidence: 0.95,
              };
            })()),
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

vi.mock("../lib/groq-right-hand-reasoning", async () => {
  const actual = await vi.importActual<typeof import("../lib/groq-right-hand-reasoning")>("../lib/groq-right-hand-reasoning");
  return {
    ...actual,
    runGroqRightHandFreeJson: vi.fn(async () => ({
      status: "completed" as const,
      model: "development-test-right-hand",
      raw: JSON.stringify({
        decision: "continue_discovery",
        reason: "Development-only surrogate reviewed the supplied state without browsing, selecting tools, or inventing evidence.",
          direction: null,
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

it("runs the real canonical downstream pipeline with only Groq Boss and Right-hand substituted", async () => {
  const { db, entitiesTable, researchCasesTable, researchCaseEventsTable } = await import("@workspace/db");
  const { clearActiveJobIfOwned, createJob, getJob, setActiveJob, updateJob } = await import("../lib/job-queue");
  const { enablePermanentRedis, disconnectRedis } = await import("../lib/redis");
  const { runCanonicalAtlasPipeline } = await import("../lib/canonical-atlas-discovery");

  await enablePermanentRedis();
  await appendAudit("enabled the repository permanent Redis service for the opt-in harness", "`enablePermanentRedis()`", { enabled: true }, "The harness uses the repository lock/lease implementation; no alternate Redis path is introduced.", "Create the canonical Atlas job and claim the atlas-run lane.");
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
  await appendAudit("created and claimed the canonical Atlas job", `createJob("atlas-run") + setActiveJob("atlas-run", ${jobId})`, { jobId }, "The real canonical job queue owns the run; only Groq Boss/Right-hand model calls are substituted.", "Run the canonical Atlas pipeline with a bounded, high-signal discovery objective.");

  try {
    const result = await runCanonicalAtlasPipeline(jobId, {
      targetCount: 1,
      researchDepth: "standard",
      targetTimeoutMs: 420_000,
      discoveryObjective: "Discover one real named executive or founder associated with OpenAI using public web evidence. The Investigator must choose every search, page visit, registry/OSINT action, and stopping point itself. A candidate is valid only when the real Investigator produces an exact named-person promote finding backed by a directly retrieved source page that identifies that person. Never invent a person, contact, or URL.",
      discoveryGeography: "Public web; global; prefer authoritative public company or professional sources",
    });
    const finalJob = await getJob(jobId);
    await appendAudit("completed the canonical downstream pipeline invocation", `runCanonicalAtlasPipeline(${jobId}, targetCount=1, researchDepth=standard, targetTimeoutMs=420000, bounded discovery objective)`, { pipelineResult: result, finalJob }, "The canonical downstream path ran with real Investigator/tools/persistence while Groq Boss and Right-hand were the only substituted roles.", "Inspect target-scoped durable cases/events and entity/card projection for this exact job.");

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
          inArray(researchCaseEventsTable.caseId, targetCaseIds),
          eq(researchCaseEventsTable.eventType, "tool_observation"),
          eq(researchCaseEventsTable.actorRole, "head_investigator"),
        ));

    const jobEntities = await db
      .select({ id: entitiesTable.id, name: entitiesTable.name, metadata: entitiesTable.metadata })
      .from(entitiesTable);

    const entitiesForJob = jobEntities.filter(
      (row) => typeof row.metadata === "string" && row.metadata.includes(jobId),
    );

    await appendAudit("verified durable downstream research and card state", `read-only durable queries filtered to Atlas job ${jobId}`, { targetCases: targetCases.filter((row) => targetCaseIds.includes(row.id)), investigatorObservationCount: investigatorObservations.length, entitiesForJob }, "The durable ledger is the source of truth for whether real target research and entity/card projection occurred.", "Assert the full downstream success contract, then release the canonical job lane.");

    console.log(JSON.stringify({
      jobId,
      pipelineResult: result,
      finalJob,
      targetCases: targetCases.filter((row) => targetCaseIds.includes(row.id)),
      investigatorObservationCount: investigatorObservations.length,
      entitiesForJob,
      substitutedRoles: ["groq_boss", "groq_right_hand"],
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
    await appendAudit("released the development harness resources", `clearActiveJobIfOwned("atlas-run", ${jobId}) + disconnectRedis()`, { jobId }, "The opt-in harness does not leave the canonical Atlas lane or permanent Redis client held after the run.", "Finish the test with the durable success assertions; any failure must remain visible and unsuppressed.");
  }
}, 30 * 60 * 1000);
