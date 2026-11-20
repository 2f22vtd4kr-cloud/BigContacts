import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { desc, eq } from "drizzle-orm";
import { resetGroqRateLimitSnapshotsForTests } from "../lib/agentic-web-research-core";
import { resetProviderGateForTests } from "../lib/provider-gate";
import { DEFAULT_ATLAS_DISCOVERY_OBJECTIVE } from "../lib/atlas-launch-defaults";

const mocks = vi.hoisted(() => ({
  jobStatus: "running" as string,
  jobState: {} as Record<string, unknown>,
  jobId: "" as string,
  activeJobId: null as string | null,
  jobUpdates: [] as Array<Record<string, unknown>>,
  scenario: "model-stops" as "model-stops" | "operator-cap",
  targetCalls: [] as number[],
  controlCalls: 0,
  generateGroqBossText: vi.fn(),
  getJobStrict: vi.fn(),
  getActiveJobStrict: vi.fn(),
  createJob: vi.fn(),
  updateJob: vi.fn(),
  updateTerminalJobAudit: vi.fn(),
  clearActiveJobIfOwned: vi.fn(),
  claimCanonicalJob: vi.fn(),
  releaseCanonicalJob: vi.fn(),
  fenceStaleCanonicalJob: vi.fn(),
  enablePermanentRedis: vi.fn(),
  probeGroqInvestigatorCapabilities: vi.fn(),
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
    getActiveJobStrict: mocks.getActiveJobStrict,
    createJob: mocks.createJob,
    updateJob: mocks.updateJob,
    updateTerminalJobAudit: mocks.updateTerminalJobAudit,
    clearActiveJobIfOwned: mocks.clearActiveJobIfOwned,
  };
});
vi.mock("../lib/canonical-job-lock", async () => {
  const actual = await vi.importActual<typeof import("../lib/canonical-job-lock")>("../lib/canonical-job-lock");
  return {
    ...actual,
    isCanonicalJobOwner: vi.fn(async () => true),
    claimCanonicalJob: mocks.claimCanonicalJob,
    releaseCanonicalJob: mocks.releaseCanonicalJob,
    fenceStaleCanonicalJob: mocks.fenceStaleCanonicalJob,
  };
});
vi.mock("../lib/redis", async () => {
  const actual = await vi.importActual<typeof import("../lib/redis")>("../lib/redis");
  return {
    ...actual,
    delCachePattern: vi.fn(async () => undefined),
    enablePermanentRedis: mocks.enablePermanentRedis,
  };
});
vi.mock("../lib/agentic-web-research-core", async () => {
  const actual = await vi.importActual<typeof import("../lib/agentic-web-research-core")>("../lib/agentic-web-research-core");
  return { ...actual, probeGroqInvestigatorCapabilities: mocks.probeGroqInvestigatorCapabilities };
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
  const middleName = `Alex Middle ${runToken.slice(0, 8)}`;
  const directorName = `Morgan Late ${runToken.slice(0, 8)}`;
  const distinctiveTailQuote = `FINAL PAGE QUOTATION: The board appointed ${directorName} as Managing Director effective 18 November 2026.`;

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
    mocks.jobState = { status: "running" };
    mocks.jobId = `offline-route-${runToken}`;
    mocks.activeJobId = null;
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
      jobId,
      type: "atlas-run",
      status: mocks.jobStatus,
      errors: 0,
      result: mocks.jobState.result ?? null,
      outcome: mocks.jobState.outcome,
      finishedAt: mocks.jobState.finishedAt,
      cancelRequested: false,
    }));
    mocks.getActiveJobStrict.mockImplementation(async () => mocks.activeJobId);
    mocks.createJob.mockImplementation(async () => mocks.jobId);
    mocks.updateJob.mockImplementation(async (_jobId: string, patch: Record<string, unknown>) => {
      mocks.jobUpdates.push(patch);
      mocks.jobState = { ...mocks.jobState, ...patch };
      if (typeof patch.status === "string") mocks.jobStatus = patch.status;
      return true;
    });
    mocks.updateTerminalJobAudit.mockImplementation(async (_jobId: string, status: string, patch: Record<string, unknown>) => {
      if (mocks.jobStatus !== status) return false;
      mocks.jobState = { ...mocks.jobState, ...patch };
      return true;
    });
    mocks.claimCanonicalJob.mockImplementation(async (_type: string, jobId: string) => {
      mocks.activeJobId = jobId;
      return true;
    });
    mocks.releaseCanonicalJob.mockImplementation(async (_type: string, jobId: string) => {
      if (mocks.activeJobId !== jobId) return false;
      mocks.activeJobId = null;
      return true;
    });
    mocks.fenceStaleCanonicalJob.mockResolvedValue("missing");
    mocks.enablePermanentRedis.mockResolvedValue(undefined);
    mocks.probeGroqInvestigatorCapabilities.mockResolvedValue({
      ok: true,
      checked: [],
      excludedCapabilities: [],
      sampleSummary: [],
      error: null,
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
      { vectorType: "other", value: "Chief Executive Officer", personName: firstName, role: "Chief Executive Officer", scope: "candidate", sourceUrls: [sourceUrl], note: "Investigator-selected provisional person lead.", contactAttribution: "person_specific", exactQuote: `${firstName} is Chief Executive Officer.`, identityAssessment: "same_person", identityRationale: "The fetched source names this exact person in the stated executive role.", hypothesisRelation: "supports", hypothesisRationale: "The fetched source directly supports the person and professional role.", relationshipType: "professional_role", temporalStatus: "current", interpretationConfidence: 0.95, ambiguityNotes: "", promotionDecision: "promote", promotionReason: "The fetched source directly binds the person name and current executive role." },
      { vectorType: "other", value: "Chief Financial Officer", personName: secondName, role: "Chief Financial Officer", scope: "candidate", sourceUrls: [sourceUrl], note: "Investigator-selected provisional person lead.", contactAttribution: "person_specific", exactQuote: `${secondName} is Chief Financial Officer.`, identityAssessment: "same_person", identityRationale: "The fetched source names this exact person in the stated executive role.", hypothesisRelation: "supports", hypothesisRationale: "The fetched source directly supports the person and professional role.", relationshipType: "professional_role", temporalStatus: "current", interpretationConfidence: 0.95, ambiguityNotes: "", promotionDecision: "promote", promotionReason: "The fetched source directly binds the person name and current executive role." },
    ];
    const middleFinding = {
      ...findings[0]!,
      value: "Chief Operating Officer",
      personName: middleName,
      role: "Chief Operating Officer",
      note: "Investigator-selected person lead observed in the middle section of the fetched page.",
      exactQuote: `${middleName} is Chief Operating Officer.`,
      promotionReason: "The fetched page directly attributes the current operating role to this named person.",
    };
    const directorFinding = {
      ...findings[0]!,
      value: "Managing Director",
      personName: directorName,
      role: "Managing Director",
      note: "Investigator-selected director lead observed only in the final retained page section.",
      exactQuote: distinctiveTailQuote,
      promotionReason: "The exact final-page quotation directly attributes the Managing Director role to this person.",
    };
    const allFindings = [...findings, middleFinding, directorFinding];
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
        thought: "Fetch the discovered page and inspect the names and roles available in its opening and middle sections.",
        hypothesis: "The fetched company page may bind several people to their roles.",
        purpose: "Verify source-backed leadership names while preserving any unread remainder.",
        expectedInformationGain: 0.9,
        findings: [...findings, middleFinding],
      },
      {
        action: "visit",
        query: null,
        url: sourceUrl,
        thought: "Read the remaining section of the same source to inspect its final director entry and quotation.",
        hypothesis: "The retained remainder may contain another relevant director and an exact role quotation.",
        purpose: "Inspect the unread tail of the already fetched source without issuing another network request.",
        expectedInformationGain: 0.95,
        findings: [directorFinding],
      },
      {
        action: "done",
        query: null,
        thought: "The opening, middle, and final sections of the same fetched source support the identified leadership roles.",
        hypothesis: "The page attributes the named people to their stated current executive roles.",
        purpose: "Return the source-backed findings and exact final-page quotation for independent Boss adjudication.",
        expectedInformationGain: 0.95,
        findings: allFindings,
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
        const pageHtml = [
          "<html><body><h1>Apex Offline Holdings</h1>",
          `<p>${firstName} is Chief Executive Officer.</p>`,
          `<p>${"Historical public filing narrative with no additional named officers. ".repeat(82)} ${secondName} is Chief Financial Officer.</p>`,
          `<p>${"Corporate governance directory entries and filing history. ".repeat(82)} ${middleName} is Chief Operating Officer.</p>`,
          `<p>${"Additional annual-report narrative and board-history text. ".repeat(145)} ${distinctiveTailQuote}</p>`,
          "</body></html>",
        ].join("");
        const response = new Response(pageHtml, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
        Object.defineProperty(response, "url", { value: sourceUrl });
        return response;
      }
      throw new Error(`Unexpected outbound request in offline integration test: ${url}`);
    });
    mocks.generateGroqBossText.mockImplementation(async (_selection: any, prompt: string, _options: any) => {
      // Route the mock by the actual cognitive task, not by an assumed global
      // call index. Target-act oversight has a deliberately narrower contract
      // than discovery and must not receive discovery candidate fields.
      if (prompt.includes("You are Groq Boss supervising ONE Investigator act")) {
        return {
          model: "mock-groq-boss",
          raw: JSON.stringify({ action: "stop", direction: null, reason: "The completed target act is supported by its durable source evidence.", confidence: 0.9 }),
          error: null,
          attempts: [],
        };
      }
      const call = mocks.controlCalls++;
      let action: string;
      let candidateName: string | null = null;
      let candidateType: string | null = null;
      if (call === 0) action = "continue_discovery";
      else if (call === 1) { action = "research_candidate"; candidateName = firstName; candidateType = "person"; }
      else if (mocks.scenario === "operator-cap") { action = "research_candidate"; candidateName = secondName; candidateType = "person"; }
      else action = "stop";
      const direction = action === "continue_discovery" ? "Test whether public business disclosures can identify a person whose documented role and business interests may be relevant to credible wealth potential; verify any candidate from fetched source material." : null;
      return { model: "mock-groq-boss", raw: JSON.stringify({ action, candidateName, candidateType, direction, reason: "Mock provider response: Boss makes the control decision.", confidence: 0.9 }), error: null, attempts: [] };
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
    // Keep the fixture objective below the Right-hand semantic-compaction
    // threshold. Objective compaction is a separate model workflow; this test
    // isolates terminal oversight and must not accidentally invoke an unmocked
    // memory-compactor provider path.
    await pipeline(jobId, {
      targetCount: 1,
      researchDepth: "standard",
      targetTimeoutMs: 60_000,
    });
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
        const metadata = typeof entity.metadata === "string" ? JSON.parse(entity.metadata) : entity.metadata ?? {};
        return Number(metadata.discoveryCaseId) === ownedCase.id && (metadata.partialPersonLead === true || metadata.admission === "investigator-explicit-promotion");
      } catch { return false; }
    });
    const evidence = admittedEntities.length
      ? await db.select().from(tables.researchEvidenceTable)
          .where(eq(tables.researchEvidenceTable.entityId, admittedEntities[0].id))
      : [];
    const resultPatch = mocks.jobUpdates.filter((entry) => entry.status === "done" || entry.status === "failed").slice(-1)[0];
    const eventPayloads = events.map((event: any) => { try { return JSON.parse(event.payload ?? "{}"); } catch { return {}; } });
    const controlDecisions = events.filter((event: any) => event.eventType === "control_decision").map((event: any) => { try { return JSON.parse(event.payload ?? "{}"); } catch { return {}; } });
    return { jobId, ownedCase, events, eventPayloads, controlDecisions, targetCases, jobUpdate: resultPatch ?? jobUpdate, evidence, admittedEntities };
  }

  it("executes multi-turn discovery, target Investigator act, independent oversight, and terminal gating through the canonical pipeline", async () => {
    const outcome = await runScenario("model-stops");
    expect(mocks.runGroqBossDiscovery).toHaveBeenCalledTimes(2);
    expect(outcome.ownedCase.objective).toBe(DEFAULT_ATLAS_DISCOVERY_OBJECTIVE);
    const investigatorCalls = mocks.outboundUrls.filter((url) => url.endsWith("/chat/completions")).length;
    expect(investigatorCalls).toBe(4);
    expect(mocks.outboundUrls).toContain("https://google.serper.dev/search");
    expect(mocks.outboundUrls.filter((url) => url === mocks.pageUrl || url.startsWith(mocks.pageUrl + "?"))).toHaveLength(1);
    const visitEvents = outcome.events.filter((event: any) => {
      if (event.eventType !== "tool_observation") return false;
      try { return JSON.parse(event.payload ?? "{}").action === "visit"; } catch { return false; }
    });
    expect(visitEvents).toHaveLength(2);
    expect(visitEvents.every((event: any) => event.actorRole === "head_investigator" && event.eventType === "tool_observation")).toBe(true);
    const visitPayloads = visitEvents.map((event: any) => JSON.parse(event.payload ?? "{}"));
    expect(visitPayloads[0]).toMatchObject({
      execution: "success",
      observedUrls: [mocks.pageUrl],
      args: { pageHasMore: true, pageArtifactAvailable: true, pageArtifactDurable: true },
    });
    expect(visitPayloads[0].observation).toContain(firstName);
    expect(visitPayloads[1]).toMatchObject({
      execution: "success",
      observedUrls: [mocks.pageUrl],
      args: { pageReadSource: "retained_fetch_artifact", pageHasMore: false },
    });
    expect(visitPayloads[1].args.pageReadOffset).toBeGreaterThan(0);
    expect(visitPayloads[1].observation).toContain(directorName);
    expect(visitPayloads[1].observation).toContain(distinctiveTailQuote);
    const pageArtifactChunks = outcome.events
      .filter((event: any) => event.status === "page_artifact")
      .map((event: any) => JSON.parse(event.payload ?? "{}"));
    expect(pageArtifactChunks.length).toBeGreaterThan(1);
    expect(pageArtifactChunks.every((chunk: any) => chunk.kind === "fetched_page_artifact_chunk"
      && chunk.sourceUrl === mocks.pageUrl && chunk.sourceVerified === true)).toBe(true);
    expect(new Set(pageArtifactChunks.map((chunk: any) => chunk.sha256)).size).toBe(1);
    expect(pageArtifactChunks).toHaveLength(pageArtifactChunks[0].chunkCount);
    const lateDirectorClaim = outcome.events
      .filter((event: any) => event.eventType === "claim")
      .map((event: any) => { try { return JSON.parse(event.payload ?? "{}"); } catch { return {}; } })
      .find((payload: any) => payload.claim?.personName === directorName);
    expect(lateDirectorClaim?.claim).toMatchObject({
      personName: directorName,
      role: "Managing Director",
      exactQuote: distinctiveTailQuote,
      sourceUrls: [mocks.pageUrl],
    });
    expect(lateDirectorClaim?.observationEventIds?.length).toBeGreaterThan(0);
    expect(JSON.parse(outcome.ownedCase.caseFile).jobId).toBe(outcome.jobId);
    expect(outcome.eventPayloads).toEqual(expect.arrayContaining([expect.objectContaining({ action: "done", execution: "success", findings: expect.arrayContaining([expect.objectContaining({ scope: "candidate", promotionDecision: "promote" })]) })]));
    const rawDiagnosticResult = (outcome.jobUpdate as any)?.result;
    const diagnosticResult = typeof rawDiagnosticResult === "string" ? JSON.parse(rawDiagnosticResult) : rawDiagnosticResult ?? {};
    expect(outcome.admittedEntities, JSON.stringify({
      phaseSummary: diagnosticResult?.phaseSummary,
      terminal: diagnosticResult?.terminal,
      controlDecisions: outcome.controlDecisions.map((decision: any) => ({ action: decision.action, candidateName: decision.candidateName, candidateType: decision.candidateType, reason: decision.reason })),
      caseStatus: outcome.ownedCase.status,
      currentAction: outcome.ownedCase.currentAction,
      targetCalls: mocks.targetCalls,
      outboundUrls: mocks.outboundUrls,
    })).toHaveLength(4);
    expect(outcome.admittedEntities.map((entity: any) => entity.name)).toContain(directorName);
    expect(outcome.controlDecisions.map((decision: any) => decision.action)).toContain("research_candidate");
    expect(mocks.runTargetContactAgent).toHaveBeenCalledTimes(1);
    expect(mocks.targetCalls).toHaveLength(1);
    expect(outcome.ownedCase.status, JSON.stringify({
      targetCases: outcome.targetCases.map((row: any) => {
        try {
          const file = JSON.parse(row.caseFile ?? "{}");
          return { status: row.status, currentAction: row.currentAction, oversight: file.investigatorActOversight };
        } catch {
          return { status: row.status, currentAction: row.currentAction, caseFile: row.caseFile };
        }
      }),
      jobUpdate: outcome.jobUpdate,
      discoveryControlCalls: mocks.controlCalls,
    })).toBe("complete");
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
    expect(completedOversight?.oversight.rightHand).toMatchObject({ status: "completed", model: "mock-groq-right-hand" });
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

  it("runs the actual Atlas launch finalizer through PostgreSQL reconciliation, model-trace read-back, terminal audit, and lock release", async () => {
    const workspaceRoot = fileURLToPath(new URL("../../../../../", import.meta.url));
    const jobId = `offline-launch-finalizer-${runToken}`;
    mocks.jobId = jobId;
    mocks.scenario = "model-stops";

    const auditKeys = [
      "NODE_ENV",
      "APEX_CAPTURE_MODEL_PROMPTS",
      "APEX_CAPTURE_MODEL_PROMPTS_IN_TEST",
      "APEX_MODEL_AUDIT_FILE",
      "APEX_MODEL_AUDIT_INCLUDE_CONTACT_DATA",
      "APEX_MODEL_AUDIT_ALLOW_VISIBLE_FILE",
      "APEX_MODEL_AUDIT_ALLOW_VISIBLE_CONTACT_DATA",
    ];
    const priorAuditEnvironment = new Map(auditKeys.map((key) => [key, process.env[key]]));
    const auditPath = resolve(workspaceRoot, `private-audits/apex-atlas-run-${jobId}.md`);
    let server: ReturnType<typeof createServer> | null = null;

    try {
      process.env.NODE_ENV = "test";
      process.env.APEX_CAPTURE_MODEL_PROMPTS = "true";
      process.env.APEX_CAPTURE_MODEL_PROMPTS_IN_TEST = "true";
      process.env.APEX_MODEL_AUDIT_FILE = "private-audits/apex-atlas-run-{jobId}.md";
      process.env.APEX_MODEL_AUDIT_INCLUDE_CONTACT_DATA = "false";
      process.env.APEX_MODEL_AUDIT_ALLOW_VISIBLE_FILE = "false";
      process.env.APEX_MODEL_AUDIT_ALLOW_VISIBLE_CONTACT_DATA = "false";

      // The real Investigator wrapper records each of the four model turns below.
      // Do not seed synthetic audit records: the terminal route must attach the actual
      // request/response trace produced during this investigation.
      const { default: launchRouter } = await import("../routes/research/canonical-atlas-launch");
      const app = express();
      app.use(express.json());
      app.use(launchRouter);
      server = createServer(app);
      await new Promise<void>((resolveListen, rejectListen) => {
        server!.once("error", rejectListen);
        server!.listen(0, "127.0.0.1", resolveListen);
      });
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Could not resolve the ephemeral Atlas test server port.");

      const response = await fetch(`http://127.0.0.1:${address.port}/ingest/atlas-run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          targetCount: 1,
          researchDepth: "standard",
          targetTimeoutMs: 60_000,
          discoveryObjective: "Verify current named leadership with exact quotations from the fetched public source.",
        }),
      });
      const launchBody = await response.json() as Record<string, unknown>;
      expect(response.status).toBe(202);
      expect(launchBody.jobId).toBe(jobId);

      let terminalAudit: Record<string, any> | null = null;
      const verifiedCorrelation = `${jobId}:terminal-reconciliation:verified`;
      const incompleteCorrelation = `${jobId}:terminal-reconciliation:incomplete`;
      for (let attempt = 0; attempt < 240; attempt += 1) {
        const rows = await db.select({
          id: tables.researchCaseEventsTable.id,
          payload: tables.researchCaseEventsTable.payload,
          correlationKey: tables.researchCaseEventsTable.correlationKey,
        }).from(tables.researchCaseEventsTable)
          .where(eq(tables.researchCaseEventsTable.correlationKey, verifiedCorrelation));
        const failedRows = rows.length ? [] : await db.select({
          id: tables.researchCaseEventsTable.id,
          payload: tables.researchCaseEventsTable.payload,
          correlationKey: tables.researchCaseEventsTable.correlationKey,
        }).from(tables.researchCaseEventsTable)
          .where(eq(tables.researchCaseEventsTable.correlationKey, incompleteCorrelation));
        const auditRows = rows.length ? rows : failedRows;
        if (auditRows.length) {
          const payload = auditRows[0]?.payload;
          terminalAudit = typeof payload === "string" ? JSON.parse(payload) as Record<string, any> : null;
          break;
        }
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
      }

      expect(terminalAudit, "The route's finally block must persist and read back its terminal reconciliation audit").toBeTruthy();
      if (!terminalAudit) throw new Error("Atlas launch finalizer did not persist a terminal reconciliation audit.");
      expect(terminalAudit).toMatchObject({
        jobId,
        terminalJobStatus: "done",
        pipelineOutcome: "complete",
        reconciliationAuthorityVerified: true,
        organizationReconciliation: { status: "succeeded" },
        personReconciliation: { status: "succeeded" },
        modelAuditAttachment: { complete: true, requestCount: 4, responseCount: 4, pairedRequestCount: 4 },
        lockReleaseCallReturned: true,
        lockReleasedReadBack: true,
        terminalChecksPassed: true,
        terminalChecks: {
          terminalStatusVerified: true,
          pipelineOutcomeVerified: true,
          reconciliationVerified: true,
          persistedCountsVerified: true,
          sourceEvidenceVerified: true,
          traceAttachmentVerified: true,
          durableTraceVerified: true,
          lockReleaseVerified: true,
        },
      });
      expect(Number(terminalAudit.durableTraceEventCountReadBack)).toBeGreaterThan(0);
      expect(Number(terminalAudit.sourceBackedNamedFindingCountReadBack)).toBeGreaterThan(0);
      expect(Number(terminalAudit.persistedCardCountReadBack)).toBeGreaterThanOrEqual(Number(terminalAudit.expectedNewCardCount));
      expect(Number(terminalAudit.persistedEvidenceCountReadBack)).toBeGreaterThanOrEqual(Number(terminalAudit.expectedNewEvidenceRowCount));
      expect(mocks.releaseCanonicalJob).toHaveBeenCalledWith("atlas-run", jobId);
      expect(mocks.activeJobId).toBeNull();

      const [readBack] = await db.select({
        id: tables.researchCaseEventsTable.id,
        payload: tables.researchCaseEventsTable.payload,
      }).from(tables.researchCaseEventsTable)
        .where(eq(tables.researchCaseEventsTable.correlationKey, verifiedCorrelation)).limit(1);
      expect(readBack?.id).toBeTruthy();
      expect(JSON.parse(String(readBack?.payload ?? "{}"))).toMatchObject({
        jobId,
        terminalChecksPassed: true,
        lockReleasedReadBack: true,
      });
    } finally {
      if (server) {
        await new Promise<void>((resolveClose) => server!.close(() => resolveClose()));
      }
      for (const key of auditKeys) {
        const previous = priorAuditEnvironment.get(key);
        if (previous === undefined) delete process.env[key];
        else process.env[key] = previous;
      }
      if (existsSync(auditPath)) unlinkSync(auditPath);
    }
  }, 30_000);

});
