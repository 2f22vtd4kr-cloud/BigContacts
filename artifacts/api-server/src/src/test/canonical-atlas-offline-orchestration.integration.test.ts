import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";

const mocks = vi.hoisted(() => ({
  jobStatus: "running" as string,
  jobUpdates: [] as Array<Record<string, unknown>>,
  scenario: "model-stops" as "model-stops" | "operator-cap",
  targetCalls: [] as number[],
  controlCalls: 0,
  getJobStrict: vi.fn(),
  updateJob: vi.fn(),
  clearActiveJobIfOwned: vi.fn(),
  runGroqBossDiscovery: vi.fn(),
  runGroqRightHandFreeJson: vi.fn(),
  runBureauAgenticWebPass: vi.fn(),
  runCanonicalSingleTargetInvestigation: vi.fn(),
  decideAtlasNextAction: vi.fn(),
}));

vi.mock("../lib/job-queue", async () => {
  const actual = await vi.importActual<typeof import("../lib/job-queue")>("../lib/job-queue");
  return {
    ...actual,
    getJobStrict: mocks.getJobStrict,
    updateJob: mocks.updateJob,
    clearActiveJobIfOwned: mocks.clearActiveJobIfOwned,
  };
});
vi.mock("../lib/canonical-job-lock", async () => {
  const actual = await vi.importActual<typeof import("../lib/canonical-job-lock")>("../lib/canonical-job-lock");
  return { ...actual, isCanonicalJobOwner: vi.fn(async () => true) };
});
vi.mock("../lib/redis", async () => {
  const actual = await vi.importActual<typeof import("../lib/redis")>("../lib/redis");
  return { ...actual, delCachePattern: vi.fn(async () => undefined) };
});
vi.mock("../lib/case-bureau", async () => {
  const actual = await vi.importActual<typeof import("../lib/case-bureau")>("../lib/case-bureau");
  return { ...actual, runGroqBossDiscovery: mocks.runGroqBossDiscovery };
});
vi.mock("../lib/groq-right-hand-reasoning", async () => {
  const actual = await vi.importActual<typeof import("../lib/groq-right-hand-reasoning")>("../lib/groq-right-hand-reasoning");
  return { ...actual, runGroqRightHandFreeJson: mocks.runGroqRightHandFreeJson };
});
vi.mock("../lib/bureau-agentic-pass", async () => {
  const actual = await vi.importActual<typeof import("../lib/bureau-agentic-pass")>("../lib/bureau-agentic-pass");
  return { ...actual, runBureauAgenticWebPass: mocks.runBureauAgenticWebPass };
});
vi.mock("../lib/canonical-single-target-runner", async () => {
  const actual = await vi.importActual<typeof import("../lib/canonical-single-target-runner")>("../lib/canonical-single-target-runner");
  return { ...actual, runCanonicalSingleTargetInvestigation: mocks.runCanonicalSingleTargetInvestigation };
});
vi.mock("../lib/atlas-control-decision", async () => {
  const actual = await vi.importActual<typeof import("../lib/atlas-control-decision")>("../lib/atlas-control-decision");
  return { ...actual, decideAtlasNextAction: mocks.decideAtlasNextAction };
});

const databaseEnabled = Boolean(process.env.DATABASE_URL?.trim());

describe.skipIf(!databaseEnabled)("canonical Atlas offline orchestration integration", () => {
  let db: any;
  let tables: any;
  let pipeline: typeof import("../lib/canonical-atlas-discovery").runCanonicalAtlasPipeline;
  let lockResearchCaseEventAppendStream: typeof import("../lib/research-case-event-iteration").lockResearchCaseEventAppendStream;
  let nextResearchCaseEventIteration: typeof import("../lib/research-case-event-iteration").nextResearchCaseEventIteration;
  const originalInvestigatorKey = process.env.GROQ_INVESTIGATOR_API_KEY;
  const runToken = randomUUID();

  beforeAll(async () => {
    const dbModule = await import("@workspace/db");
    db = dbModule.db;
    tables = dbModule;
    ({ runCanonicalAtlasPipeline: pipeline } = await import("../lib/canonical-atlas-discovery"));
    ({ lockResearchCaseEventAppendStream, nextResearchCaseEventIteration } = await import("../lib/research-case-event-iteration"));
    process.env.GROQ_INVESTIGATOR_API_KEY = "offline-integration-test-credential";
  }, 30_000);

  beforeEach(() => {
    mocks.jobStatus = "running";
    mocks.jobUpdates.length = 0;
    mocks.targetCalls.length = 0;
    mocks.controlCalls = 0;
    vi.clearAllMocks();

    mocks.getJobStrict.mockImplementation(async (jobId: string) => ({
      id: jobId,
      status: mocks.jobStatus,
      errors: 0,
      result: null,
    }));
    mocks.updateJob.mockImplementation(async (_jobId: string, patch: Record<string, unknown>) => {
      mocks.jobUpdates.push(patch);
      if (typeof patch.status === "string") mocks.jobStatus = patch.status;
      return true;
    });
    mocks.clearActiveJobIfOwned.mockResolvedValue(true);

    mocks.runGroqBossDiscovery.mockImplementation(async () => ({
      status: "completed",
      model: "mock-groq-boss",
      investigatorLlm: "groq-investigator-1",
      report: "Offline mock: Boss selected the configured Investigator capability.",
      candidates: [],
      citations: [],
      nextDirections: [],
      uncertainties: [],
      error: null,
    }));

    mocks.runGroqRightHandFreeJson.mockImplementation(async () => ({
      status: "completed",
      model: "mock-groq-right-hand",
      raw: JSON.stringify({
        assessment: "support",
        materialGaps: [],
        contradictions: [],
        alternativeInterpretation: "The selected lead remains provisional pending target research.",
        recommendation: "Allow the model-owned target investigation to proceed.",
        confidence: 0.9,
      }),
      error: null,
    }));

    mocks.runBureauAgenticWebPass.mockImplementation(async (input: any) => {
      const runId = `offline-discovery-${runToken}-${mocks.controlCalls}`;
      const leads = [
        { name: `Apex Offline Holdings ${runToken.slice(0, 8)}`, url: `https://evidence.apex-offline.test/${runToken}/one` },
        { name: `Apex Offline Ventures ${runToken.slice(0, 8)}`, url: `https://evidence.apex-offline.test/${runToken}/two` },
      ];
      const findings = leads.map((lead) => ({
        value: lead.name,
        personName: null,
        role: null,
        scope: "organization",
        sourceUrls: [lead.url],
        note: "The Investigator explicitly selected this organization as a provisional research lead.",
        promotionDecision: "promote",
        promotionReason: "The same-run source observation contains the exact organization name.",
      }));
      for (const lead of leads) {
        await db.transaction(async (tx: any) => {
          await lockResearchCaseEventAppendStream(tx, input.caseId);
          const [caseRow] = await tx.select({ iteration: tables.researchCasesTable.iteration })
            .from(tables.researchCasesTable).where(eq(tables.researchCasesTable.id, input.caseId)).for("update").limit(1);
          const [latest] = await tx.select({ iteration: tables.researchCaseEventsTable.iteration })
            .from(tables.researchCaseEventsTable).where(eq(tables.researchCaseEventsTable.caseId, input.caseId))
            .orderBy(desc(tables.researchCaseEventsTable.id)).limit(1);
          const iteration = nextResearchCaseEventIteration(caseRow?.iteration, latest?.iteration);
          await tx.update(tables.researchCasesTable).set({ iteration }).where(eq(tables.researchCasesTable.id, input.caseId));
          await tx.insert(tables.researchCaseEventsTable).values({
            caseId: input.caseId,
            iteration,
            actorRole: "head_investigator",
            eventType: "tool_observation",
            status: "success",
            summary: "Offline mocked Investigator fetched an attributable public source.",
            correlationKey: `${runId}:visit:${lead.name}`,
            payload: JSON.stringify({
              jobId: input.jobId,
              runId,
              turn: 1,
              action: "visit",
              execution: "success",
              observedUrls: [lead.url],
              observation: `${lead.name} is named on the public company information page.`,
              findings,
            }),
          });
        });
      }
      await input.onDiscoveryCheckpoint?.({
        runId,
        turn: 1,
        action: "visit",
        execution: "success",
        findings,
      });
      return {
        status: "completed",
        model: "mock-investigator",
        iterations: 1,
        searches: 0,
        visits: leads.length,
        findings,
        partialFindings: [],
        modelFindings: findings,
        contactEvidence: [],
        trajectory: ["Offline mocked Investigator fetched two source pages and selected two provisional organization leads."],
        trajectoryRecords: [{
          turn: 1,
          model: "mock-investigator",
          action: "visit",
          args: { url: leads[0].url, hypothesis: "The public page may substantiate a provisional organization lead." },
          thought: "The fetched page contains the exact selected organization name.",
          execution: "success",
          observation: `${leads[0].name} is named on the public company information page.`,
          observedUrls: [leads[0].url],
          leadUrls: [],
          findings,
          providerFallback: [],
          stopReason: null,
        }],
        caseId: input.caseId,
        runId,
        stopReason: "MODEL_DECIDED_DONE",
        consecutiveActionParseFailures: 0,
      };
    });

    mocks.runCanonicalSingleTargetInvestigation.mockImplementation(async (jobId: string, entityId: number) => {
      mocks.targetCalls.push(entityId);
      await db.insert(tables.researchCasesTable).values({
        targetEntityId: entityId,
        caseType: "target",
        status: "complete",
        objective: "Offline target verification for a model-selected organization.",
        motivation: "Canonical Atlas orchestration integration test.",
        currentAction: "canonical-target-complete",
        caseFile: JSON.stringify({
          atlasJobId: jobId,
          completedActs: 1,
          resourceLimited: false,
          deadlineExceeded: false,
          cancelled: false,
          evidenceGraph: [{ claim: "Target verification evidence persisted by the mocked target stage." }],
          lastOversight: { status: "completed", action: "stop", model: "mock-groq-right-hand" },
          contextDocument: "Offline target verification completed with a durable evidence graph.",
        }),
      });
      return {
        status: "complete",
        budgetExhausted: false,
        usageLedgerUnavailable: false,
        exhaustedInvestigatorLlm: [],
        investigatorIterationsUsed: 1,
        resourceLimited: false,
        deadlineExceeded: false,
        cancelled: false,
      };
    });

    mocks.decideAtlasNextAction.mockImplementation(async (input: any) => {
      mocks.controlCalls += 1;
      const available = Array.isArray(input.admittedCandidates) ? input.admittedCandidates : [];
      let action: string;
      let selected: any = null;
      if (input.opening) {
        action = "continue_discovery";
      } else if (mocks.controlCalls === 2) {
        action = "research_candidate";
        selected = available[0] ?? null;
      } else if (mocks.scenario === "operator-cap") {
        action = "research_candidate";
        selected = available[1] ?? available[0] ?? null;
      } else {
        action = "stop";
      }
      const decision = {
        status: "completed",
        action,
        candidateName: action === "research_candidate" ? selected?.name ?? null : null,
        candidateType: action === "research_candidate" ? selected?.targetType ?? null : null,
        direction: null,
        reason: "Offline mocked Boss decision; model owns the transition.",
        confidence: 0.9,
        rightHand: {
          status: "deferred",
          decision: null,
          reason: "No separate opening action.",
          direction: null,
          confidence: null,
          model: "none",
          error: null,
        },
        bossModel: "mock-groq-boss",
        error: null,
      };
      await db.transaction(async (tx: any) => {
        await lockResearchCaseEventAppendStream(tx, input.caseId);
        const [caseRow] = await tx.select({ iteration: tables.researchCasesTable.iteration })
          .from(tables.researchCasesTable).where(eq(tables.researchCasesTable.id, input.caseId)).for("update").limit(1);
        const [latest] = await tx.select({ iteration: tables.researchCaseEventsTable.iteration })
          .from(tables.researchCaseEventsTable).where(eq(tables.researchCaseEventsTable.caseId, input.caseId))
          .orderBy(desc(tables.researchCaseEventsTable.id)).limit(1);
        const iteration = nextResearchCaseEventIteration(caseRow?.iteration, latest?.iteration);
        await tx.update(tables.researchCasesTable).set({ iteration }).where(eq(tables.researchCasesTable.id, input.caseId));
        await tx.insert(tables.researchCaseEventsTable).values({
          caseId: input.caseId,
          iteration,
          actorRole: "groq_boss",
          eventType: "control_decision",
          status: "recorded",
          summary: `Offline mocked Boss decision: ${action}.`,
          correlationKey: `${input.jobId}:offline-control:${input.controlTurn}`,
          payload: JSON.stringify({ jobId: input.jobId, controlTurn: input.controlTurn, ...decision }),
        });
      });
      return decision;
    });
  });

  afterAll(() => {
    if (originalInvestigatorKey === undefined) delete process.env.GROQ_INVESTIGATOR_API_KEY;
    else process.env.GROQ_INVESTIGATOR_API_KEY = originalInvestigatorKey;
  });

  async function runScenario(scenario: "model-stops" | "operator-cap") {
    mocks.scenario = scenario;
    const jobId = `offline-atlas-${scenario}-${runToken}`;
    const result = await pipeline(jobId, { targetCount: 1, researchDepth: "fast", targetTimeoutMs: 30_000 });
    const [jobUpdate] = mocks.jobUpdates.filter((entry) => entry.status === "done" || entry.status === "failed").slice(-1);
    const cases = await db.select().from(tables.researchCasesTable)
      .where(eq(tables.researchCasesTable.caseType, "discovery"));
    const ownedCase = cases.find((row: any) => {
      try { return JSON.parse(row.caseFile ?? "{}").jobId === jobId; } catch { return false; }
    });
    if (!ownedCase) throw new Error("Canonical discovery case was not durably persisted for this mocked job.");
    const events = await db.select().from(tables.researchCaseEventsTable)
      .where(eq(tables.researchCaseEventsTable.caseId, ownedCase.id))
      .orderBy(tables.researchCaseEventsTable.id);
    const allEntities = await db.select().from(tables.entitiesTable);
    const admittedEntities = allEntities.filter((entity: any) => {
      try {
        const metadata = JSON.parse(entity.metadata ?? "{}");
        return Number(metadata.discoveryCaseId) === ownedCase.id && metadata.partialOrganizationLead === true;
      } catch { return false; }
    });
    const evidence = admittedEntities.length
      ? await db.select().from(tables.researchEvidenceTable)
          .where(eq(tables.researchEvidenceTable.entityId, admittedEntities[0].id))
      : [];
    const resultPatch = mocks.jobUpdates.filter((entry) => entry.status === "done" || entry.status === "failed").slice(-1)[0];
    return { jobId, result, ownedCase, events, jobUpdate: resultPatch ?? jobUpdate, evidence, admittedEntities };
  }

  it("executes mocked Investigator discovery, evidence persistence, target research, and model-owned stop through the canonical pipeline", async () => {
    const outcome = await runScenario("model-stops");
    expect(mocks.runGroqBossDiscovery).toHaveBeenCalledTimes(1);
    expect(mocks.runBureauAgenticWebPass).toHaveBeenCalledTimes(1);
    expect(mocks.runCanonicalSingleTargetInvestigation).toHaveBeenCalledTimes(1);
    expect(mocks.targetCalls).toHaveLength(1);
    expect(outcome.ownedCase.status).toBe("complete");
    expect(outcome.admittedEntities).toHaveLength(2);
    expect(outcome.evidence).toEqual(expect.arrayContaining([expect.objectContaining({ claimType: "partial_organization_lead", status: "review" })]));
    const eventTypes = outcome.events.map((event: any) => event.eventType);
    expect(eventTypes).toContain("assignment");
    expect(eventTypes).toContain("tool_observation");
    expect(eventTypes).toContain("control_decision");
    expect(outcome.events.some((event: any) => event.actorRole === "right_hand" && event.eventType === "observation")).toBe(true);
    const terminal = JSON.parse(String(outcome.jobUpdate?.result ?? "{}")).terminal;
    expect(terminal).toMatchObject({
      status: "complete",
      evidenceBackedTerminal: true,
      completedTargetInvestigations: 1,
      operatorTargetSpendingCap: 1,
      operatorTargetSpendingCapReached: false,
      finalControlAction: "stop",
    });
  });

  it("records an operator cap as an incomplete resource outcome, never as a model stop", async () => {
    const outcome = await runScenario("operator-cap");
    expect(mocks.runCanonicalSingleTargetInvestigation).toHaveBeenCalledTimes(1);
    expect(mocks.targetCalls).toHaveLength(1);
    expect(outcome.ownedCase.status).toBe("review");
    const terminal = JSON.parse(String(outcome.jobUpdate?.result ?? "{}")).terminal;
    expect(terminal).toMatchObject({
      status: "incomplete",
      evidenceBackedTerminal: true,
      completedTargetInvestigations: 1,
      operatorTargetSpendingCap: 1,
      operatorTargetSpendingCapReached: true,
      finalControlAction: "research_candidate",
      caseAction: "canonical-operator-target-spending-cap",
    });
    expect(mocks.jobStatus).toBe("failed");
  });
});
