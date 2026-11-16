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
  generateGroqBossText: vi.fn(),
  getJobStrict: vi.fn(),
  updateJob: vi.fn(),
  clearActiveJobIfOwned: vi.fn(),
  runGroqBossDiscovery: vi.fn(),
  runGroqRightHandFreeJson: vi.fn(),
  safeOutboundFetch: vi.fn(),
  outboundUrls: [] as string[],
  pageUrl: "",
  runTargetContactAgent: vi.fn(),
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
vi.mock("../lib/target-contact-agent", async () => {
  const actual = await vi.importActual<typeof import("../lib/target-contact-agent")>("../lib/target-contact-agent");
  return { ...actual, runTargetContactAgent: mocks.runTargetContactAgent };
});
vi.mock("../lib/groq-boss", async () => {
  const actual = await vi.importActual<typeof import("../lib/groq-boss")>("../lib/groq-boss");
  return {
    ...actual,
    resolveGroqBossModel: vi.fn(async () => ({
      model: "mock-groq-boss",
      status: "resolved",
      inspectedKeyCount: 1,
      candidateCount: 1,
      candidateModels: ["mock-groq-boss"],
    })),
    generateGroqBossText: mocks.generateGroqBossText,
  };
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
  const sourceUrl = `https://www.sec.gov/Archives/edgar/data/0000320193/offline-${runToken}`;
  const firstName = `Jane Offline ${runToken.slice(0, 8)}`;
  const secondName = `John Offline ${runToken.slice(0, 8)}`;

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
    mocks.outboundUrls.length = 0;
    mocks.pageUrl = sourceUrl;
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

    mocks.runGroqRightHandFreeJson.mockImplementation(async (...args: any[]) => {
      const responseFormat = args[2] ?? {};
      const schema = responseFormat.schema ?? responseFormat.json_schema?.schema ?? {};
      const properties = schema.properties ?? {};
      const raw = "focusLanes" in properties
        ? JSON.stringify({ decision: "support", reason: "The target act is supported by a same-source identity and role excerpt.", focusLanes: ["identity", "professional role"], confidence: 0.95 })
        : "assessment" in properties
          ? JSON.stringify({ assessment: "support", materialGaps: [], contradictions: [], alternativeInterpretation: "The selected lead remains provisional pending target research.", recommendation: "Allow the model-owned target investigation to proceed.", confidence: 0.9 })
          : JSON.stringify({ decision: "continue_discovery", reason: "Continue testing the evidence trajectory.", direction: null, confidence: 0.9 });
      return { status: "completed", model: "mock-groq-right-hand", raw, error: null };
    });

    let groqTurn = 0;
    const findings = [
      { vectorType: "other", value: firstName, personName: firstName, role: "Chief Executive Officer", scope: "candidate", sourceUrls: [sourceUrl], note: "Investigator-selected provisional person lead.", contactAttribution: "person_specific", exactQuote: `${firstName} is Chief Executive Officer.`, identityAssessment: "same_person", identityRationale: "The fetched source names this exact person in the stated executive role.", promotionDecision: "promote", promotionReason: "The fetched source directly binds the person name and current executive role." },
      { vectorType: "other", value: secondName, personName: secondName, role: "Chief Financial Officer", scope: "candidate", sourceUrls: [sourceUrl], note: "Investigator-selected provisional person lead.", contactAttribution: "person_specific", exactQuote: `${secondName} is Chief Financial Officer.`, identityAssessment: "same_person", identityRationale: "The fetched source names this exact person in the stated executive role.", promotionDecision: "promote", promotionReason: "The fetched source directly binds the person name and current executive role." },
    ];
    const actions = [
      {
        action: "web_search",
        query: `Apex Offline Holdings ${runToken.slice(0, 8)} leadership`,
        provider: "serper",
        thought: "Search for a public company leadership page.",
        hypothesis: "A public company page may identify current leadership.",
        purpose: "Find a readable source that can be fetched and checked.",
        expectedInformationGain: 0.8,
        findings: [],
      },
      {
        action: "visit",
        query: null,
        url: sourceUrl,
        thought: "Fetch the discovered page to inspect the named people and roles.",
        hypothesis: "The fetched company page may bind both names to their roles.",
        purpose: "Verify the exact names and roles in observed page text.",
        expectedInformationGain: 0.9,
        findings,
      },
      {
        action: "done",
        query: null,
        thought: "The requested discovery observations have been collected; return control for model adjudication.",
        hypothesis: null,
        purpose: null,
        expectedInformationGain: 0,
        findings: [],
      },
    ];
    mocks.safeOutboundFetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : input instanceof URL ? input.href : String(input);
      mocks.outboundUrls.push(url);
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
    mocks.generateGroqBossText.mockImplementation(async (_selection: any, prompt: string, _options: any) => {
      if (prompt.includes("JUST-COMPLETED ACT:")) {
        return { model: "mock-groq-boss", raw: JSON.stringify({ action: "stop", direction: null, reason: "The target act produced a durable exact-source evidence graph; no additional act is needed for this offline test.", confidence: 0.95 }), error: null, attempts: [] };
      }
      const call = mocks.controlCalls++;
      let action: string;
      let candidateName: string | null = null;
      let candidateType: string | null = null;
      if (call === 0) action = "continue_discovery";
      else if (call === 1) { action = "research_candidate"; candidateName = firstName; candidateType = "person"; }
      else if (mocks.scenario === "operator-cap") { action = "research_candidate"; candidateName = secondName; candidateType = "person"; }
      else action = "stop";
      return { model: "mock-groq-boss", raw: JSON.stringify({ action, candidateName, candidateType, direction: null, reason: "Mock provider response: Boss makes the control decision.", confidence: 0.9 }), error: null, attempts: [] };
    });

    const exactQuote = `${firstName} is the Chief Executive Officer of Apex Offline Holdings.`;
    const targetFinding = {
      vectorType: "other", value: "Chief Executive Officer", personName: firstName, role: "Chief Executive Officer",
      scope: "candidate", sourceUrls: [sourceUrl],
      note: "The target-scoped Investigator found a current professional role in the fetched source.",
      contactAttribution: "professional_person_specific", exactQuote, identityAssessment: "same_person",
      identityRationale: "The fetched source names this person and the role in the same statement.",
      hypothesisRelation: "supports", hypothesisRationale: "The source directly supports the target role hypothesis.",
      relationshipType: "professional_role", temporalStatus: "current", interpretationConfidence: 0.95, ambiguityNotes: null,
      promotionDecision: "promote", promotionReason: "A same-source exact quote supports this professional role.",
    };
    mocks.runTargetContactAgent.mockImplementation(async (input: any) => {
      mocks.targetCalls.push(input.entityId);
      const executionId = `offline-target-${runToken}`;
      const now = new Date().toISOString();
      const records = [
        { turn: 1, model: "groq-investigator-1", action: "web_search", args: { query: "Apex Offline Holdings leadership" }, thought: "Find a public source for the target role.", execution: "success", observation: `Search result for ${firstName} and the company leadership page.`, observedUrls: [], leadUrls: [sourceUrl], findings: [], providerFallback: [] },
        { turn: 2, model: "groq-investigator-1", action: "visit", args: { url: sourceUrl }, thought: "Fetch the source to verify the role and identity.", execution: "success", observation: exactQuote, observedUrls: [sourceUrl], leadUrls: [], findings: [targetFinding], providerFallback: [] },
        { turn: 3, model: "groq-investigator-1", action: "done", args: {}, thought: "The fetched source resolves the current target-role question.", execution: "success", observation: "The target-scoped research act is complete; return control for independent oversight.", observedUrls: [], leadUrls: [], findings: [], providerFallback: [], stopReason: "MODEL_DECIDED_DONE" },
      ];
      for (const record of records) await input.onTrajectoryRecord?.(record);
      const observation = { id: `offline-observation-${runToken}`, sourceUrl, sourceHost: "www.sec.gov", observedAt: now, runId: executionId, caseId: input.caseId, turn: 2, collectionMethod: "visit", excerpt: exactQuote };
      const claim = { id: `offline-claim-${runToken}`, subject: firstName, predicate: "other", object: "Chief Executive Officer", scope: "target", personName: firstName, confidence: 0.95 };
      return { researchOutcome: "evidence_backed", stopReason: "MODEL_DECIDED_DONE", iterations: 3, status: "completed", model: input.investigatorLlm, findings: 1, searches: 1, visits: 1,
        trajectory: ["step1: web_search execution=success", `step2: visit ${sourceUrl} execution=success observed=${sourceUrl}`, "step3: done execution=success"],
        trajectoryRecords: records, evidenceGraphs: [{ observations: [observation], claims: [claim], edges: [{ from: claim.id, to: observation.id, kind: "supports", createdAt: now, reason: "Exact same-source role evidence." }] }],
        phone: null, email: null, phoneSource: null, contactOutcome: "evidence_only", executionId, promotionCandidates: [], observedSourceUrls: [sourceUrl] };
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
    const allTargetCases = await db.select().from(tables.researchCasesTable)
      .where(eq(tables.researchCasesTable.caseType, "target"));
    const targetCases = allTargetCases.filter((row: any) => {
      try { return JSON.parse(row.caseFile ?? "{}").atlasJobId === jobId; } catch { return false; }
    });
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
    const eventPayloads = events.map((event: any) => { try { return JSON.parse(event.payload ?? "{}"); } catch { return {}; } });
    return { jobId, ownedCase, events, eventPayloads, targetCases, jobUpdate: resultPatch ?? jobUpdate, evidence, admittedEntities };
  }

  it("executes multi-turn discovery, target Investigator act, independent oversight, and terminal gating through the canonical pipeline", async () => {
    const outcome = await runScenario("model-stops");
    expect(mocks.runGroqBossDiscovery).toHaveBeenCalledTimes(2);
    const investigatorCalls = mocks.outboundUrls.filter((url) => url.endsWith("/chat/completions")).length;
    expect(investigatorCalls).toBeGreaterThanOrEqual(3);
    expect(investigatorCalls).toBeLessThanOrEqual(4);
    expect(mocks.outboundUrls).toContain("https://google.serper.dev/search");
    expect(mocks.outboundUrls.some((url) => url === mocks.pageUrl || url.startsWith(mocks.pageUrl + "?"))).toBe(true);
    expect(outcome.eventPayloads).toEqual(expect.arrayContaining([expect.objectContaining({ action: "visit", execution: "success", observedUrls: expect.arrayContaining([mocks.pageUrl]), findings: expect.arrayContaining([expect.objectContaining({ scope: "candidate", reviewOnly: true })]) })]));
    expect(mocks.runTargetContactAgent).toHaveBeenCalledTimes(1);
    expect(mocks.targetCalls).toHaveLength(1);
    expect(outcome.ownedCase.status).toBe("complete");
    expect(outcome.admittedEntities).toHaveLength(2);
    expect(outcome.targetCases).toHaveLength(1);
    const targetCaseFile = JSON.parse(outcome.targetCases[0].caseFile);
    const completedOversight = targetCaseFile.investigatorActOversight?.find((entry: any) => entry?.oversight?.action === "stop");
    expect(completedOversight?.oversight).toMatchObject({ action: "stop", status: "completed" });
    expect(completedOversight?.evidenceGraphs).toHaveLength(1);
    expect(outcome.evidence).toEqual(expect.arrayContaining([expect.objectContaining({ claimType: "partial_person_role_lead", status: "review" })]));
    const eventTypes = outcome.events.map((event: any) => event.eventType);
    expect(eventTypes).toContain("assignment");
    expect(eventTypes).toContain("tool_observation");
    const observedActions = outcome.events.filter((event: any) => event.eventType === "tool_observation")
      .map((event: any) => JSON.parse(event.payload ?? "{}").action);
    expect(observedActions).toContain("web_search");
    expect(observedActions).toContain("visit");
    expect(eventTypes).toContain("control_decision");
    expect(outcome.events.some((event: any) => event.actorRole === "right_hand" && event.eventType === "observation" && event.status === "completed")).toBe(true);
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
    expect(mocks.runTargetContactAgent).toHaveBeenCalledTimes(1);
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
