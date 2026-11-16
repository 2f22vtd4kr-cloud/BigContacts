import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => {
  const column = (table: string, field: string) => ({ table, field });
  const entitiesTable = {
    id: column("entities", "id"), name: column("entities", "name"), type: column("entities", "type"),
    email: column("entities", "email"), phone: column("entities", "phone"), phoneSource: column("entities", "phoneSource"),
    linkedinUrl: column("entities", "linkedinUrl"), twitterHandle: column("entities", "twitterHandle"),
    instagramHandle: column("entities", "instagramHandle"), telegramHandle: column("entities", "telegramHandle"),
    personalWebsite: column("entities", "personalWebsite"), metadata: column("entities", "metadata"),
  };
  const researchCasesTable = {
    id: column("cases", "id"), targetEntityId: column("cases", "targetEntityId"), caseType: column("cases", "caseType"),
    status: column("cases", "status"), currentAction: column("cases", "currentAction"), caseFile: column("cases", "caseFile"),
  };
  const researchCaseEventsTable = {
    id: column("events", "id"), caseId: column("events", "caseId"), eventType: column("events", "eventType"),
    actorRole: column("events", "actorRole"), status: column("events", "status"), payload: column("events", "payload"),
    correlationKey: column("events", "correlationKey"),
  };
  const contactEvidenceTable = { name: "contactEvidence" };
  const entity = {
    id: 2, name: "Jane Example", type: "PersonCandidate", email: null, phone: null, phoneSource: null,
    linkedinUrl: null, twitterHandle: null, instagramHandle: null, telegramHandle: null, personalWebsite: null,
    metadata: JSON.stringify({ companyName: "Example Engineering GmbH" }),
  };
  const caseRow = {
    id: 1, targetEntityId: 2, caseType: "target", status: "active", currentAction: "target_contact_agent",
    caseFile: JSON.stringify({ atlasJobId: "job-1", investigatorLlm: "groq-investigator-1" }),
  };
  const quote = "Jane Example — Managing Director can be reached directly at jane@acmeengineering.com.";
  const sourceUrl = "https://acmeengineering.com/team/jane-example";
  const events = [
    {
      id: 11, caseId: 1, eventType: "claim", actorRole: "head_investigator", status: "success",
      correlationKey: "run-survival-1:claim:1",
      payload: JSON.stringify({
        runId: "run-survival-1", jobId: "job-1",
        claim: { vectorType: "email", value: "jane@acmeengineering.com", personName: "Jane Example" },
        observationEventIds: [12],
      }),
    },
    {
      id: 12, caseId: 1, eventType: "observation", actorRole: "head_investigator", status: "success",
      correlationKey: "run-survival-1:observation:1",
      payload: JSON.stringify({
        runId: "run-survival-1", jobId: "job-1", action: "visit", observation: quote, observedUrls: [sourceUrl],
      }),
    },
  ];
  const insertedContacts: any[] = [];
  let cardUpdate: any = null;

  const conditions = (condition: any): any[] => {
    if (!condition) return [];
    if (condition.op === "and") return condition.conditions.flatMap(conditions);
    return [condition];
  };
  const rowsFor = (table: any, condition: any): any[] => {
    const rows = table === entitiesTable ? [entity]
      : table === researchCasesTable ? [caseRow]
      : table === researchCaseEventsTable ? events
      : [];
    return rows.filter((row) => conditions(condition).every((entry) => {
      if (entry.op === "eq") return (row as Record<string, any>)[entry.column.field] === entry.value;
      if (entry.op === "like") return String((row as Record<string, any>)[entry.column.field] ?? "").includes(String(entry.value).replaceAll("%", ""));
      return true;
    }));
  };
  const query = () => {
    let table: any = null;
    let condition: any = null;
    const builder: any = {
      from(value: any) { table = value; return builder; },
      where(value: any) { condition = value; return builder; },
      for() { return builder; },
      limit(count: number) { return Promise.resolve(rowsFor(table, condition).slice(0, count)); },
      then(resolve: any, reject: any) { return Promise.resolve(rowsFor(table, condition)).then(resolve, reject); },
    };
    return builder;
  };
  const insert = (table: any) => ({
    values(values: any[]) {
      return {
        onConflictDoNothing: async () => {
          if (table === contactEvidenceTable) insertedContacts.push(...values);
          return [];
        },
      };
    },
  });
  const update = (table: any) => {
    let values: any = null;
    const builder: any = {
      set(next: any) { values = next; return builder; },
      where() { return builder; },
      returning: async () => {
        if (table === entitiesTable) {
          cardUpdate = values;
          if (values?.email) entity.email = values.email;
        }
        return [{ id: entity.id }];
      },
    };
    return builder;
  };
  const execute = async () => ({ rows: [] });
  const tx = { select: query, insert, update, execute };
  const db = {
    select: query,
    insert,
    update,
    execute,
    transaction: async (callback: (tx: any) => Promise<any>) => callback(tx),
  };
  return { db, entitiesTable, researchCasesTable, researchCaseEventsTable, contactEvidenceTable, entity, caseRow, events, quote, sourceUrl, insertedContacts, get cardUpdate() { return cardUpdate; } };
});

const offlineNetwork = vi.hoisted(() => ({
  actions: [] as Array<Record<string, unknown>>,
  requests: [] as Array<{ url: string; method: string }>,
  modelRequests: [] as Array<Record<string, unknown>>,
}));

vi.mock("../lib/ssrf-safe-fetch", () => ({
  safeOutboundFetch: vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = String(init?.method ?? "GET").toUpperCase();
    offlineNetwork.requests.push({ url, method });

    if (url.endsWith("/chat/completions")) {
      const requestText = typeof init?.body === "string" ? init.body : "";
      try { offlineNetwork.modelRequests.push(JSON.parse(requestText)); } catch { offlineNetwork.modelRequests.push({ malformedRequestBody: true }); }
      const action = offlineNetwork.actions.shift();
      if (!action) return new Response("Unexpected extra offline model turn", { status: 599 });
      return new Response(JSON.stringify({
        choices: [{ finish_reason: "stop", message: { content: JSON.stringify(action) } }],
        usage: { prompt_tokens: 500, completion_tokens: 120, total_tokens: 620 },
      }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-ratelimit-limit-tokens": "50000",
          "x-ratelimit-remaining-tokens": "49000",
          "x-ratelimit-reset-tokens": "60s",
        },
      });
    }

    if (url === "https://google.serper.dev/search") {
      return new Response(JSON.stringify({
        organic: [{
          title: "Acme Engineering leadership",
          link: testState.sourceUrl,
          snippet: "Jane Example, Managing Director.",
        }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    }

    if (url === testState.sourceUrl) {
      return new Response(`<!doctype html><html><body><h1>Leadership</h1><p>${testState.quote}</p></body></html>`, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Unexpected offline outbound request", { status: 599 });
  }),
}));
vi.mock("../lib/python-osint-worker-client", () => ({
  getAvailablePythonOsintActions: () => [],
  refreshPythonOsintToolAvailability: async () => ({}),
}));

vi.mock("@workspace/db", () => ({
  db: testState.db,
  entitiesTable: testState.entitiesTable,
  researchCasesTable: testState.researchCasesTable,
  researchCaseEventsTable: testState.researchCaseEventsTable,
  contactEvidenceTable: testState.contactEvidenceTable,
}));
vi.mock("drizzle-orm", () => ({
  and: (...conditions: any[]) => ({ op: "and", conditions }),
  eq: (column: any, value: any) => ({ op: "eq", column, value }),
  like: (column: any, value: any) => ({ op: "like", column, value }),
  or: (...conditions: any[]) => ({ op: "or", conditions }),
  isNull: (column: any) => ({ op: "isNull", column }),
  sql: (strings: TemplateStringsArray, ...values: any[]) => ({ op: "sql", strings: [...strings], values }),
}));
vi.mock("../lib/agentic-web-research", () => ({ runAgenticWebResearch: vi.fn() }));
vi.mock("../lib/job-queue", () => ({ getJobStrict: vi.fn(async () => ({ status: "running" })) }));
vi.mock("../lib/bureau-live-log", () => ({ publishBureauEvent: vi.fn() }));
vi.mock("../lib/dig-span", () => ({
  digSpanStatusFromExecutionStatus: vi.fn(() => "success"),
  publishDigSpan: vi.fn(),
  spanFromLiveStep: vi.fn(),
}));
vi.mock("../lib/canonical-job-lock", () => ({ isCanonicalJobOwner: vi.fn(async () => true) }));
vi.mock("../lib/investigator-capability-registry", () => ({
  GROQ_INVESTIGATOR_20B_CAPABILITY: "groq-investigator-20b",
  getAvailableInvestigatorCapabilities: vi.fn(() => ["groq-investigator-1", "groq-investigator-20b"]),
  investigatorCapabilityKeyName: vi.fn(() => "GROQ_INVESTIGATOR_API_KEY"),
}));
vi.mock("../lib/identity-collision", () => ({
  assessIdentityCollision: vi.fn(() => ({ risk: null, identityMatch: 0.95, reason: null })),
}));

import { runAgenticWebResearch } from "../lib/agentic-web-research";
import { isCanonicalTargetEpisodeComplete } from "../lib/canonical-terminal-authority";
import { runAgenticWebResearch as runInvestigatorCore } from "../lib/agentic-web-research-core";
import { findingsToContacts, runTargetContactAgent, sourceBackedFindings } from "../lib/target-contact-agent";

describe("offline Investigator-to-card survival path", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    testState.entity.email = null;
    testState.insertedContacts.length = 0;
    testState.events.splice(0, testState.events.length,
      {
        id: 11, caseId: 1, eventType: "claim", actorRole: "head_investigator", status: "success",
        correlationKey: "run-survival-1:claim:1",
        payload: JSON.stringify({
          runId: "run-survival-1", jobId: "job-1",
          claim: { vectorType: "email", value: "jane@acmeengineering.com", personName: "Jane Example" },
          observationEventIds: [12],
        }),
      },
      {
        id: 12, caseId: 1, eventType: "observation", actorRole: "head_investigator", status: "success",
        correlationKey: "run-survival-1:observation:1",
        payload: JSON.stringify({
          runId: "run-survival-1", jobId: "job-1", action: "visit",
          observation: testState.quote, observedUrls: [testState.sourceUrl],
        }),
      },
    );
  });

  it("persists an explicitly attributed contact and promotes it to the canonical PersonCandidate card", async () => {
    const finding = {
      vectorType: "email" as const,
      value: "jane@acmeengineering.com",
      personName: "Jane Example",
      role: "Managing Director",
      scope: "candidate" as const,
      sourceUrls: [testState.sourceUrl],
      note: "Official team profile identifies Jane Example and gives her direct professional email.",
      contactAttribution: "person_specific" as const,
      exactQuote: testState.quote,
      identityAssessment: "same_person" as const,
      identityRationale: "The official company profile identifies Jane Example as Managing Director and quotes this direct professional address.",
      promotionDecision: "promote" as const,
      promotionReason: "The fetched profile explicitly identifies this as Jane Example's direct route.",
    };
    const record = {
      turn: 1,
      model: "openai/gpt-oss-20b",
      action: "visit",
      args: { url: testState.sourceUrl },
      execution: "success",
      observation: testState.quote,
      observedUrls: [testState.sourceUrl],
      findings: [],
      providerFallback: [],
    };
    const backed = sourceBackedFindings([finding as any], ["turn1 visit success"], [record as any]);
    expect(backed).toHaveLength(1);
    const projected = findingsToContacts(backed, "Jane Example");
    expect(projected[0]).toMatchObject({ scope: "candidate", contactAttribution: "person_specific", exactQuote: testState.quote, promote: true });
    vi.mocked(runAgenticWebResearch).mockResolvedValue({
      status: "completed",
      model: "openai/gpt-oss-20b",
      iterations: 1,
      searches: 0,
      visits: 1,
      trajectory: ["turn1 visit success"],
      trajectoryRecords: [record],
      groundingTrajectoryRecords: [record],
      modelFindings: [finding],
      findings: [finding],
      executionId: "run-survival-1",
      stopReason: "MODEL_DECIDED_DONE",
    } as any);

    const result = await runTargetContactAgent({
      entityId: 2,
      caseId: 1,
      jobId: "job-1",
      targetName: "Jane Example",
      targetType: "person",
      investigatorLlm: "groq-investigator-1",
      contextDocument: "Canonical target case state and prior evidence.",
      oversightMode: "internal",
    });

    expect(result.status).toBe("completed");
    expect(result.findings).toBe(1);
    expect(testState.insertedContacts).toHaveLength(1);
    const evidenceMetadata = JSON.parse(testState.insertedContacts[0].metadata);
    expect(result.email).toBe("jane@acmeengineering.com");
    expect(evidenceMetadata).toMatchObject({
      contactAttribution: "person_specific",
      exactQuote: testState.quote,
      investigatorSelectedForCard: true,
    });
    expect(testState.cardUpdate.email).toBe("jane@acmeengineering.com");
    const promotionPayload = testState.cardUpdate.metadata.values.find((value: unknown) =>
      typeof value === "string" && value.includes("exactQuote"),
    );
    expect(JSON.parse(String(promotionPayload))).toMatchObject({
      contactAttribution: "person_specific",
      exactQuote: testState.quote,
      jobId: "job-1",
    });
  });

  it("runs three real Investigator turns offline through evidence persistence, card promotion and the terminal evidence gate", async () => {
    testState.entity.email = null;
    testState.entity.name = "Jane Example";
    testState.entity.type = "PersonCandidate";
    testState.insertedContacts.length = 0;
    testState.events.splice(0, testState.events.length);

    offlineNetwork.requests = [];
    offlineNetwork.modelRequests = [];
    offlineNetwork.actions = [
      {
        action: "web_search",
        query: "Jane Example Acme Engineering Managing Director professional email leadership",
        provider: "serper",
        thought: "Find a public leadership source that may identify this person and contact route.",
        hypothesis: "A public leadership page may identify Jane Example and an attributable professional contact.",
        purpose: "Locate a page whose contents can be fetched and assessed directly.",
        expectedInformationGain: 0.7,
        findings: [],
      },
      {
        action: "visit",
        url: testState.sourceUrl,
        thought: "Fetch the leadership page before making an attribution decision.",
        hypothesis: "The page may bind Jane Example's role and professional email in one observation.",
        purpose: "Verify the exact source passage and contact value.",
        expectedInformationGain: 0.8,
        findings: [],
      },
      {
        action: "done",
        query: null,
        thought: "The fetched source directly attributes this professional contact to the named person.",
        hypothesis: "Jane Example is the Managing Director and the displayed email is her professional contact.",
        purpose: "Return the source-backed finding and model-owned interpretation.",
        expectedInformationGain: 0.9,
        findings: [{
          vectorType: "email",
          value: "jane@acmeengineering.com",
          personName: "Jane Example",
          role: "Managing Director",
          scope: "candidate",
          sourceUrls: [testState.sourceUrl],
          note: "The leadership page attributes the professional email to Jane Example.",
          contactAttribution: "person_specific",
          exactQuote: testState.quote,
          identityAssessment: "same_person",
          identityRationale: "The same source passage names Jane Example and gives this email as her professional contact.",
          hypothesisRelation: "supports",
          hypothesisRationale: "The fetched source directly supports the candidate identity and contact attribution.",
          relationshipType: "leadership",
          temporalStatus: "current",
          interpretationConfidence: 0.95,
          ambiguityNotes: "",
          promotionDecision: "promote",
          promotionReason: "The page itself explicitly links the person and contact value.",
        }],
      },
    ];

    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("GROQ_INVESTIGATOR_API_KEY", "offline-only-not-a-real-key");
    vi.stubEnv("APEX_GROQ_DAILY_TOKEN_BUDGET", "0");
    vi.stubEnv("APEX_GROQ_DAILY_TOKEN_BUDGET_120B", "0");
    vi.stubEnv("APEX_GROQ_TPM_BUDGET", "50000");
    vi.stubEnv("SERPER_API_KEY", "offline-only-not-a-real-key");
    vi.stubEnv("APEX_CAPTURE_MODEL_PROMPTS", "false");

    const result = await runInvestigatorCore({
      targetName: "Jane Example",
      companyName: "Example Engineering GmbH",
      objective: "Find source-backed public contact leads. Choose relevance and attribution from the fetched evidence.",
      investigatorLlm: "groq-investigator-1",
      mode: "discovery",
      maxIterations: 3,
      hardTimeoutMs: 30_000,
    });

    expect(result.status).toBe("completed");
    expect(result.stopReason).toBe("MODEL_DECIDED_DONE");
    expect(result.researchOutcome).toBe("evidence_backed");
    expect(result.iterations).toBe(3);
    expect(result.searches).toBe(1);
    expect(result.visits).toBe(1);
    expect(offlineNetwork.actions).toHaveLength(0);
    expect(offlineNetwork.requests.filter((request) => request.url.endsWith("/chat/completions"))).toHaveLength(3);
    expect(JSON.stringify(offlineNetwork.modelRequests[1])).toContain("Jane Example, Managing Director.");
    expect(JSON.stringify(offlineNetwork.modelRequests[2])).toContain(testState.quote);
    expect(offlineNetwork.requests.some((request) => request.url === "https://google.serper.dev/search" && request.method === "POST")).toBe(true);
    expect(offlineNetwork.requests.some((request) => request.url === testState.sourceUrl && request.method === "GET")).toBe(true);

    const modelFinding = result.modelFindings[0];
    expect(modelFinding).toMatchObject({
      personName: "Jane Example",
      role: "Managing Director",
      contactAttribution: "person_specific",
      identityAssessment: "same_person",
      hypothesisRelation: "supports",
      promotionDecision: "promote",
      exactQuote: testState.quote,
    });

    const backed = sourceBackedFindings(result.modelFindings, result.trajectory, result.trajectoryRecords);
    expect(backed).toHaveLength(1);
    const contacts = findingsToContacts(backed, "Jane Example");
    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toMatchObject({ scope: "candidate", promote: true, contactAttribution: "person_specific" });

    const runId = "offline-three-turn-run";
    const targetAgentInput = { ...result, executionId: runId };
    const persistedFinding = result.modelFindings[0];
    const fetchedRecord = result.trajectoryRecords.find((record: any) => record.action === "visit");
    expect(fetchedRecord?.observation).toContain(testState.quote);
    expect(fetchedRecord?.observedUrls).toContain(testState.sourceUrl);
    testState.events.splice(0, testState.events.length,
      {
        id: 31, caseId: 1, eventType: "claim", actorRole: "head_investigator", status: "success",
        correlationKey: `${runId}:claim:1`,
        payload: JSON.stringify({
          runId, jobId: "job-1",
          claim: { vectorType: persistedFinding.vectorType, value: persistedFinding.value, personName: persistedFinding.personName },
          observationEventIds: [32],
        }),
      },
      {
        id: 32, caseId: 1, eventType: "observation", actorRole: "head_investigator", status: "success",
        correlationKey: `${runId}:observation:1`,
        payload: JSON.stringify({
          runId, jobId: "job-1", action: fetchedRecord.action,
          observation: fetchedRecord.observation, observedUrls: fetchedRecord.observedUrls,
        }),
      },
    );

    // Hand the actual three-turn Investigator result to the real target-contact
    // orchestration layer. Only the provider-facing wrapper is replaced: the
    // target agent's source checks, evidence persistence and card promotion run.
    vi.mocked(runAgenticWebResearch).mockResolvedValue(targetAgentInput as any);
    const targetResult = await runTargetContactAgent({
      entityId: 2,
      caseId: 1,
      jobId: "job-1",
      targetName: "Jane Example",
      companyName: "Example Engineering GmbH",
      targetType: "person",
      investigatorLlm: "groq-investigator-1",
      contextDocument: "Canonical target case state and prior evidence.",
      oversightMode: "internal",
    });

    expect(targetResult.status).toBe("completed");
    expect(targetResult.stopReason).toBe("MODEL_DECIDED_DONE");
    expect(targetResult.researchOutcome).toBe("evidence_backed");
    expect(targetResult.findings).toBe(1);
    expect(targetResult.iterations).toBe(3);
    expect(targetResult.searches).toBe(1);
    expect(targetResult.visits).toBe(1);
    expect(targetResult.email).toBe("jane@acmeengineering.com");
    expect(testState.insertedContacts).toHaveLength(1);
    const evidenceMetadata = JSON.parse(testState.insertedContacts[0].metadata);
    expect(evidenceMetadata).toMatchObject({
      scope: "candidate",
      personName: "Jane Example",
      contactAttribution: "person_specific",
      exactQuote: testState.quote,
      investigatorSelectedForCard: true,
    });
    expect(testState.entity.email).toBe("jane@acmeengineering.com");
    expect(testState.cardUpdate.email).toBe("jane@acmeengineering.com");
    const promotionPayload = testState.cardUpdate.metadata.values.find((value: unknown) =>
      typeof value === "string" && value.includes("exactQuote"),
    );
    expect(JSON.parse(String(promotionPayload))).toMatchObject({
      contactAttribution: "person_specific",
      exactQuote: testState.quote,
      jobId: "job-1",
    });

    // The persisted claim event is the evidence graph input to the canonical
    // terminal authority. A model's "done" response alone cannot complete a
    // target episode when that evidence is absent.
    const persistedEvidenceCount = testState.events.filter((event) => event.eventType === "claim").length;
    expect(persistedEvidenceCount).toBeGreaterThan(0);
    const terminalInput = {
      investigatorStatus: targetResult.status,
      stopReason: targetResult.stopReason,
      evidenceGraphCount: persistedEvidenceCount,
      oversightStatus: "completed" as const,
      oversightAction: "stop" as const,
      cancelled: false,
      resourceLimited: false,
      deadlineExceeded: false,
    };
    expect(isCanonicalTargetEpisodeComplete(terminalInput)).toBe(true);
    expect(isCanonicalTargetEpisodeComplete({ ...terminalInput, evidenceGraphCount: 0 })).toBe(false);
  });
});
