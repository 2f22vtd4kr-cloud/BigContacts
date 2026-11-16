import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { resetGroqRateLimitSnapshotsForTests } from "../lib/agentic-web-research-core";
import { resetProviderGateForTests } from "../lib/provider-gate";

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
  safeOutboundFetch: vi.fn(),
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
vi.mock("../lib/ssrf-safe-fetch", () => ({ safeOutboundFetch: mocks.safeOutboundFetch }));
vi.mock("../lib/bureau-live-log", async () => {
  const actual = await vi.importActual<typeof import("../lib/bureau-live-log")>("../lib/bureau-live-log");
  return { ...actual, publishBureauEvent: vi.fn(async () => undefined) };
});
vi.mock("../lib/investigator-trace", async () => {
  const actual = await vi.importActual<typeof import("../lib/investigator-trace")>("../lib/investigator-trace");
  return { ...actual, recordDiscoveryTrace: vi.fn(async () => undefined) };
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
  let pool: any;
  let tables: any;
  let pipeline: typeof import("../lib/canonical-atlas-discovery").runCanonicalAtlasPipeline;
  let lockResearchCaseEventAppendStream: typeof import("../lib/research-case-event-iteration").lockResearchCaseEventAppendStream;
  let nextResearchCaseEventIteration: typeof import("../lib/research-case-event-iteration").nextResearchCaseEventIteration;
  const environmentKeys = ["GROQ_INVESTIGATOR_API_KEY", "SERPER_API_KEY", "APEX_PROVIDER_MIN_INTERVAL_MS_GROQ", "APEX_GROQ_TPM_BUDGET", "APEX_GROQ_TPM_MAX_WAIT_MS", "APEX_GROQ_DAILY_TOKEN_BUDGET", "APEX_GROQ_DAILY_TOKEN_BUDGET_MODEL", "APEX_GROQ_DAILY_TOKEN_BUDGET_120B", "APEX_GROQ_DAILY_TOKEN_BUDGET_20B"];
  const originalEnvironment = new Map(environmentKeys.map((key) => [key, process.env[key]]));
  const runToken = randomUUID();

  beforeAll(async () => {
    const dbModule = await import("@workspace/db");
    db = dbModule.db;
    pool = dbModule.pool;
    tables = dbModule;
    ({ runCanonicalAtlasPipeline: pipeline } = await import("../lib/canonical-atlas-discovery"));
    ({ lockResearchCaseEventAppendStream, nextResearchCaseEventIteration } = await import("../lib/research-case-event-iteration"));
    process.env.GROQ_INVESTIGATOR_API_KEY = "offline-integration-test-credential";
    process.env.SERPER_API_KEY = "offline-integration-test-serper-key";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    process.env.APEX_GROQ_TPM_BUDGET = "1000000";
    process.env.APEX_GROQ_TPM_MAX_WAIT_MS = "50";
    process.env.APEX_GROQ_DAILY_TOKEN_BUDGET = "0";
    process.env.APEX_GROQ_DAILY_TOKEN_BUDGET_MODEL = "0";
    process.env.APEX_GROQ_DAILY_TOKEN_BUDGET_120B = "0";
    process.env.APEX_GROQ_DAILY_TOKEN_BUDGET_20B = "0";
  }, 30_000);

  beforeEach(() => {
    mocks.jobStatus = "running";
    mocks.jobUpdates.length = 0;
    mocks.targetCalls.length = 0;
    mocks.controlCalls = 0;
    vi.clearAllMocks();
    resetProviderGateForTests();
    resetGroqRateLimitSnapshotsForTests();

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

    let groqTurn = 0;
    const sourceUrl = `https://example.com/apex-offline/${runToken}/company`;
    const firstName = `Jane Offline ${runToken.slice(0, 8)}`;
    const secondName = `John Offline ${runToken.slice(0, 8)}`;
    const findings = [
      { vectorType: "other", value: firstName, personName: firstName, role: "Chief Executive Officer", scope: "candidate", sourceUrls: [sourceUrl], note: "Investigator-selected provisional person lead." },
      { vectorType: "other", value: secondName, personName: secondName, role: "Chief Financial Officer", scope: "candidate", sourceUrls: [sourceUrl], note: "Investigator-selected provisional person lead." },
    ];
    const common = {
      query: null, provider: null, url: null, email: null, username: null, domain: null, registry: null,
      thought: "The next action tests a concrete evidence gap.",
      hypothesis: "The source may contain relevant identity and role evidence.",
      purpose: "Test whether the public source supports a provisional person lead.",
      expectedInformationGain: 0.8, searches: [], findings: [], locale: null, market: null, target: null, targetType: null, profile: null,
    };
    const actions = [
      { ...common, action: "web_search", query: `Apex Offline Holdings ${runToken.slice(0, 8)} leadership`, provider: "serper", url: null, hypothesis: "A public company page may identify current leadership.", purpose: "Find a readable source that can be fetched and checked." },
      { ...common, action: "visit", url: sourceUrl, query: null, provider: null, hypothesis: "The fetched company page may bind both names to their roles.", purpose: "Verify the exact names and roles in observed page text.", findings },
      { ...common, action: "done", query: null, provider: null, url: null, thought: "The requested discovery observations have been collected; return control for model adjudication.", hypothesis: null, purpose: null, expectedInformationGain: 0, findings: [] },
    ];
    mocks.safeOutboundFetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/models")) return new Response(JSON.stringify({ data: [{ id: "openai/gpt-oss-120b" }] }), { status: 200, headers: { "content-type": "application/json" } });
      if (url.endsWith("/chat/completions")) {
        const payload = actions[Math.min(groqTurn, actions.length - 1)];
        groqTurn += 1;
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) }, finish_reason: "stop" }], usage: { prompt_tokens: 180, completion_tokens: 90, total_tokens: 270 } }), {
          status: 200, headers: { "content-type": "application/json", "x-ratelimit-remaining-tokens": "999000", "x-ratelimit-limit-tokens": "1000000", "x-ratelimit-reset-tokens": "60s" },
        });
      }
      if (url === "https://google.serper.dev/search") return new Response(JSON.stringify({ organic: [{ title: "Apex Offline Holdings — Leadership", link: sourceUrl, snippet: `${firstName} is Chief Executive Officer; ${secondName} is Chief Financial Officer.` }] }), { status: 200, headers: { "content-type": "application/json" } });
      if (url === sourceUrl) {
        const response = new Response(`<html><body><h1>Apex Offline Holdings</h1><p>${firstName} is Chief Executive Officer.</p><p>${secondName} is Chief Financial Officer.</p></body></html>`, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
        Object.defineProperty(response, "url", { value: sourceUrl });
        return response;
      }
      throw new Error(`Unexpected outbound request in offline integration test: ${url}`);
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

  afterAll(async () => {
    for (const key of environmentKeys) {
      const original = originalEnvironment.get(key);
      if (original === undefined) delete process.env[key];
      else process.env[key] = original;
    }
    resetProviderGateForTests();
    resetGroqRateLimitSnapshotsForTests();
    if (pool) await pool.end();
  }, 30_000);

  async function runScenario(scenario: "model-stops" | "operator-cap") {
    mocks.scenario = scenario;
    const jobId = `offline-atlas-${scenario}-${runToken}`;
    await pipeline(jobId, { targetCount: 1, researchDepth: "fast", targetTimeoutMs: 30_000 });
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
        return Number(metadata.discoveryCaseId) === ownedCase.id && metadata.partialPersonLead === true;
      } catch { return false; }
    });
    const evidence = admittedEntities.length
      ? await db.select().from(tables.researchEvidenceTable)
          .where(eq(tables.researchEvidenceTable.entityId, admittedEntities[0].id))
      : [];
    const resultPatch = mocks.jobUpdates.filter((entry) => entry.status === "done" || entry.status === "failed").slice(-1)[0];
    return { jobId, ownedCase, events, jobUpdate: resultPatch ?? jobUpdate, evidence, admittedEntities };
  }

  it("executes mocked Investigator discovery, evidence persistence, target research, and model-owned stop through the canonical pipeline", async () => {
    const outcome = await runScenario("model-stops");
    expect(mocks.runGroqBossDiscovery).toHaveBeenCalledTimes(1);
    expect(mocks.safeOutboundFetch.mock.calls.filter(([url]) => String(url).endsWith("/chat/completions"))).toHaveLength(3);
    expect(mocks.safeOutboundFetch).toHaveBeenCalledWith("https://google.serper.dev/search", expect.any(Object));
    expect(mocks.runCanonicalSingleTargetInvestigation).toHaveBeenCalledTimes(1);
    expect(mocks.targetCalls).toHaveLength(1);
    expect(outcome.ownedCase.status).toBe("complete");
    expect(outcome.admittedEntities).toHaveLength(2);
    expect(outcome.evidence).toEqual(expect.arrayContaining([expect.objectContaining({ claimType: "partial_person_role_lead", status: "review" })]));
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
