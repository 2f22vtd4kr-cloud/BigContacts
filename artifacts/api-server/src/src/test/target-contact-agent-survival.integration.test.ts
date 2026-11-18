import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { resetGroqRateLimitSnapshotsForTests } from "../lib/agentic-web-research-core";
import { resetProviderGateForTests } from "../lib/provider-gate";

const offline = vi.hoisted(() => ({
  actions: [] as Array<Record<string, unknown>>,
  sourceUrl: "",
  pageText: "",
  requests: [] as Array<{ url: string; method: string }>,
}));

// Only provider, search and fetched-page network responses are simulated.
// The Investigator core, source binding, contact attribution, evidence writes,
// immutable event checks and canonical card promotion remain production code.
vi.mock("../lib/ssrf-safe-fetch", () => ({
  safeOutboundFetch: vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input instanceof URL ? input.href : String(input);
    const method = String(init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    offline.requests.push({ url, method });

    if (url.endsWith("/chat/completions")) {
      const action = offline.actions.shift();
      if (!action) return new Response("Unexpected extra offline Groq turn", { status: 599 });
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
        organic: [{ title: "Leadership and contact page", link: offline.sourceUrl, snippet: offline.pageText.slice(0, 180) }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    }

    if (url === offline.sourceUrl) {
      const response = new Response(`<!doctype html><html><body><h1>Leadership</h1><p>${offline.pageText}</p></body></html>`, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
      Object.defineProperty(response, "url", { value: offline.sourceUrl });
      return response;
    }

    return new Response("Unexpected offline outbound request", { status: 599 });
  }),
}));

// The canonical lease is infrastructure, not the contact decision under test.
// Redis cache access is disabled in this isolated integration fixture.
vi.mock("../lib/canonical-job-lock", async () => {
  const actual = await vi.importActual<any>("../lib/canonical-job-lock");
  return { ...actual, isCanonicalJobOwner: vi.fn(async () => true) };
});
vi.mock("../lib/redis", async () => {
  const actual = await vi.importActual<any>("../lib/redis");
  return { ...actual, getCache: vi.fn(async () => null), setCache: vi.fn(async () => undefined), delCachePattern: vi.fn(async () => undefined) };
});

const databaseEnabled = Boolean(process.env.DATABASE_URL?.trim());

describe.skipIf(!databaseEnabled)("offline Investigator-to-contact-card survival with PostgreSQL persistence", () => {
  let db: any;
  let pool: any;
  let tables: any;
  let runInvestigatorCore: typeof import("../lib/agentic-web-research-core").runAgenticWebResearch;
  let sourceBackedFindings: typeof import("../lib/target-contact-agent").sourceBackedFindings;
  let findingsToContacts: typeof import("../lib/target-contact-agent").findingsToContacts;
  let persistContacts: typeof import("../lib/bureau-contact-persist-strict").persistSourceBackedBureauContactsForEntity;
  let supportsCandidateContactOnSameObservation: typeof import("../lib/bureau-contact-persist-strict").supportsCandidateContactOnSameObservation;
  let supportsContactClaimAcrossObservations: typeof import("../lib/bureau-contact-persist-strict").supportsContactClaimAcrossObservations;
  const runToken = randomUUID();
  const originalEnv = new Map<string, string | undefined>();

  const envKeys = [
    "GROQ_INVESTIGATOR_API_KEY", "SERPER_API_KEY", "APEX_ENABLE_GROQ_INVESTIGATOR_20B",
    "APEX_GROQ_DAILY_TOKEN_BUDGET", "APEX_GROQ_DAILY_TOKEN_BUDGET_20B",
    "APEX_GROQ_DAILY_TOKEN_BUDGET_120B", "APEX_GROQ_TPM_BUDGET",
    "APEX_PROVIDER_MIN_INTERVAL_MS_GROQ", "APEX_GROQ_TPM_MAX_WAIT_MS", "APEX_CAPTURE_MODEL_PROMPTS",
  ];

  beforeAll(async () => {
    const dbModule = await import("@workspace/db");
    db = dbModule.db;
    pool = dbModule.pool;
    tables = dbModule;
    const [core, target, strict] = await Promise.all([
      import("../lib/agentic-web-research-core"),
      import("../lib/target-contact-agent"),
      import("../lib/bureau-contact-persist-strict"),
    ]);
    runInvestigatorCore = core.runAgenticWebResearch;
    sourceBackedFindings = target.sourceBackedFindings;
    findingsToContacts = target.findingsToContacts;
    persistContacts = strict.persistSourceBackedBureauContactsForEntity;
    supportsCandidateContactOnSameObservation = strict.supportsCandidateContactOnSameObservation;
    supportsContactClaimAcrossObservations = strict.supportsContactClaimAcrossObservations;
    for (const key of envKeys) originalEnv.set(key, process.env[key]);
    process.env.GROQ_INVESTIGATOR_API_KEY = "offline-integration-only-not-a-real-key";
    process.env.SERPER_API_KEY = "offline-integration-only-not-a-real-key";
    process.env.APEX_ENABLE_GROQ_INVESTIGATOR_20B = "true";
    process.env.APEX_GROQ_DAILY_TOKEN_BUDGET = "0";
    process.env.APEX_GROQ_DAILY_TOKEN_BUDGET_20B = "0";
    process.env.APEX_GROQ_DAILY_TOKEN_BUDGET_120B = "0";
    process.env.APEX_GROQ_TPM_BUDGET = "50000";
    process.env.APEX_PROVIDER_MIN_INTERVAL_MS_GROQ = "0";
    process.env.APEX_GROQ_TPM_MAX_WAIT_MS = "50";
    process.env.APEX_CAPTURE_MODEL_PROMPTS = "false";
  }, 30_000);

  beforeEach(() => {
    offline.actions = [];
    offline.requests = [];
    resetProviderGateForTests();
    resetGroqRateLimitSnapshotsForTests();
  });

  afterEach(() => {
    offline.actions = [];
  });

  afterAll(async () => {
    for (const key of envKeys) {
      const value = originalEnv.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    resetProviderGateForTests();
    resetGroqRateLimitSnapshotsForTests();
    if (pool) await pool.end();
  }, 30_000);

  function actionSequence(finding: Record<string, unknown>, sourceUrl: string) {
    return [
      {
        action: "web_search",
        query: "Jane Example Example Engineering Managing Director professional email",
        provider: "serper",
        thought: "Find a public source that may identify the person and contact route.",
        hypothesis: "An official public page may bind the person's role and professional contact.",
        purpose: "Locate a page that can be fetched and assessed directly.",
        expectedInformationGain: 0.7,
        findings: [],
      },
      {
        action: "visit",
        url: sourceUrl,
        thought: "Fetch the page before making an attribution decision.",
        hypothesis: "The fetched page may bind the named person, role and contact.",
        purpose: "Verify the exact source passage and contact value.",
        expectedInformationGain: 0.8,
        findings: [],
      },
      {
        action: "done",
        query: null,
        thought: "Return the model-selected finding and interpretation from the fetched source.",
        hypothesis: "The fetched source supports or fails to support the proposed contact attribution.",
        purpose: "Return the model-supplied finding for evidence verification.",
        expectedInformationGain: 0.9,
        findings: [finding],
      },
    ];
  }

  async function runOfflineInvestigator(input: {
    finding: Record<string, unknown>;
    sourceUrl: string;
    pageText: string;
  }) {
    offline.sourceUrl = input.sourceUrl;
    offline.pageText = input.pageText;
    offline.actions = actionSequence(input.finding, input.sourceUrl);
    const result = await runInvestigatorCore({
      targetName: "Jane Example",
      companyName: "Example Engineering GmbH",
      objective: "Find source-backed public contact leads. Choose relevance and attribution from the fetched evidence.",
      investigatorLlm: "groq-investigator-20b",
      mode: "target",
      maxIterations: 3,
      hardTimeoutMs: 30_000,
    });
    expect(result.model).toBe("openai/gpt-oss-20b");
    expect(result.iterations).toBe(3);
    expect(result.searches).toBe(1);
    expect(result.visits).toBe(1);
    expect(offline.actions).toHaveLength(0);
    expect(offline.requests.some((request) => request.url === "https://google.serper.dev/search")).toBe(true);
    expect(offline.requests.some((request) => request.url === input.sourceUrl)).toBe(true);
    const fetched = result.trajectoryRecords.find((record) => record.action === "visit");
    expect(fetched?.execution).toBe("success");
    expect(fetched?.observedUrls).toContain(input.sourceUrl);
    expect(fetched?.observation).toContain(input.pageText);
    return result;
  }

  async function createTargetEvidence(input: {
    sourceUrl: string;
    observation: string;
    finding: Record<string, any>;
    suffix: string;
  }) {
    const { entitiesTable, researchCasesTable, researchCaseEventsTable } = tables;
    const jobId = `job-${input.suffix}-${runToken}`;
    const runId = `run-${input.suffix}-${runToken}`;
    const [entity] = await db.insert(entitiesTable).values({
      name: "Jane Example",
      type: "PersonCandidate",
      metadata: JSON.stringify({ companyName: "Example Engineering GmbH", reviewOnly: true }),
    }).returning({ id: entitiesTable.id });
    expect(entity?.id).toBeGreaterThan(0);

    const [researchCase] = await db.insert(researchCasesTable).values({
      targetEntityId: entity.id,
      caseType: "target",
      status: "active",
      objective: "Verify the public professional contact route for Jane Example.",
      motivation: "Offline Investigator-to-card survival integration test.",
      currentAction: "target-research",
      caseFile: JSON.stringify({ atlasJobId: jobId, investigatorLlm: "groq-investigator-20b" }),
    }).returning({ id: researchCasesTable.id });
    expect(researchCase?.id).toBeGreaterThan(0);

    const [observationEvent] = await db.insert(researchCaseEventsTable).values({
      caseId: researchCase.id,
      iteration: 2,
      actorRole: "head_investigator",
      eventType: "tool_observation",
      status: "success",
      summary: "Offline Investigator fetched the fixture page.",
      correlationKey: `${runId}:observation:1`,
      payload: JSON.stringify({
        runId, jobId, action: "visit", execution: "success",
        observation: input.observation, sourceUrl: input.sourceUrl, observedUrls: [input.sourceUrl],
      }),
    }).returning({ id: researchCaseEventsTable.id });
    expect(observationEvent?.id).toBeGreaterThan(0);

    await db.insert(researchCaseEventsTable).values({
      caseId: researchCase.id,
      iteration: 3,
      actorRole: "head_investigator",
      eventType: "claim",
      status: "success",
      summary: "Offline Investigator proposed a model-attributed contact finding.",
      correlationKey: `${runId}:claim:1`,
      payload: JSON.stringify({
        runId, jobId,
        claim: { vectorType: input.finding.vectorType, value: input.finding.value, personName: input.finding.personName },
        observationEventIds: [observationEvent.id],
      }),
    });

    return { entityId: entity.id as number, caseId: researchCase.id as number, jobId, runId };
  }

  it("carries a model-selected, fetched person-specific contact through quote verification, evidence persistence and canonical card promotion", async () => {
    const sourceUrl = `https://www.sec.gov/Archives/edgar/data/0000000000/offline-${runToken}.htm`;
    const exactQuote = "Jane Example — Managing Director can be reached directly at jane@acmeengineering.com.";
    const finding = {
      vectorType: "email", value: "jane@acmeengineering.com", personName: "Jane Example",
      role: "Managing Director", scope: "candidate", sourceUrls: [sourceUrl],
      note: "The fetched public team page explicitly attributes the professional address to Jane Example.",
      contactAttribution: "person_specific", exactQuote,
      identityAssessment: "same_person",
      identityRationale: "The same fetched source names Jane Example, states the role and gives this exact professional address.",
      hypothesisRelation: "supports", hypothesisRationale: "The source directly supports the person-specific contact hypothesis.",
      promotionDecision: "promote", promotionReason: "The fetched page explicitly links the person and contact value.",
    };
    const result = await runOfflineInvestigator({ finding, sourceUrl, pageText: exactQuote });
    expect(result.status).toBe("completed");
    expect(result.stopReason).toBe("MODEL_DECIDED_DONE");
    expect(result.modelFindings).toHaveLength(1);
    expect(result.modelFindings[0]).toMatchObject({
      personName: "Jane Example", role: "Managing Director", value: "jane@acmeengineering.com",
      contactAttribution: "person_specific", identityAssessment: "same_person",
      hypothesisRelation: "supports", exactQuote,
    });

    const backed = sourceBackedFindings(result.modelFindings, result.trajectory, result.trajectoryRecords);
    expect(backed).toHaveLength(1);
    const contacts = findingsToContacts(backed, "Jane Example");
    expect(contacts[0]).toMatchObject({ scope: "candidate", promote: true, contactAttribution: "person_specific", exactQuote });
    const persistedContext = await createTargetEvidence({ sourceUrl, observation: exactQuote, finding, suffix: "positive" });
    const inserted = await persistContacts(
      persistedContext.entityId, contacts, "agentic-target-contact", persistedContext.jobId,
      [sourceUrl], { caseId: persistedContext.caseId, runId: persistedContext.runId, jobId: persistedContext.jobId },
    );
    expect(inserted).toBe(1);

    const [stored] = await db.select().from(tables.contactEvidenceTable)
      .where(eq(tables.contactEvidenceTable.entityId, persistedContext.entityId)).limit(1);
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored.metadata)).toMatchObject({
      contactAttribution: "person_specific", exactQuote, sourceUrls: [sourceUrl],
      investigatorSelectedForCard: true, jobId: persistedContext.jobId,
    });
    const [card] = await db.select().from(tables.entitiesTable)
      .where(eq(tables.entitiesTable.id, persistedContext.entityId)).limit(1);
    expect(card.email).toBe("jane@acmeengineering.com");
    expect(JSON.parse(card.metadata)).toMatchObject({
      agenticContactProvenance: { email: {
        value: "jane@acmeengineering.com", personName: "Jane Example",
        contactAttribution: "person_specific", exactQuote,
        sourceUrls: [sourceUrl], observedSourceUrls: [sourceUrl],
        claimEventId: expect.any(Number), observationEventIds: [expect.any(Number)],
        jobId: persistedContext.jobId,
      } },
    });
  });

  it.each([
    {
      name: "fabricated exact quote",
      suffix: "fabricated",
      sourceUrl: `https://www.sec.gov/Archives/edgar/data/0000000000/offline-${runToken}.htm`,
      pageText: "Jane Example — Managing Director can be reached directly at jane@acmeengineering.com.",
      quote: "Jane Example — Managing Director can be reached directly at jane@acmeengineering.com (direct line).",
    },
    {
      name: "aggregator-only exact quote",
      suffix: "aggregator",
      sourceUrl: `https://www.zoominfo.com/p/jane-example/${runToken}`,
      pageText: "Jane Example — Managing Director can be reached directly at jane@acmeengineering.com.",
      quote: "Jane Example — Managing Director can be reached directly at jane@acmeengineering.com.",
    },
    {
      name: "shared inbox mislabeled person-specific without supporting quote",
      suffix: "shared-inbox",
      sourceUrl: `https://www.sec.gov/Archives/edgar/data/0000000000/offline-${runToken}.htm`,
      pageText: "Jane Example — Managing Director. General enquiries: info@acmeengineering.com.",
      quote: "Jane Example — Managing Director can be reached directly at info@acmeengineering.com.",
    },
  ])("does not promote $name", async ({ suffix, sourceUrl, pageText, quote }) => {
    const value = suffix === "shared-inbox" ? "info@acmeengineering.com" : "jane@acmeengineering.com";
    const finding = {
      vectorType: "email", value, personName: "Jane Example", role: "Managing Director",
      scope: "candidate", sourceUrls: [sourceUrl],
      note: "Model-supplied candidate contact requiring exact source attribution.",
      contactAttribution: "person_specific", exactQuote: quote,
      identityAssessment: "same_person",
      identityRationale: "Model-supplied identity assessment for the offline negative fixture.",
      hypothesisRelation: "supports", hypothesisRationale: "Model-supplied hypothesis relation for the offline negative fixture.",
      promotionDecision: "promote",
    };
    const result = await runOfflineInvestigator({ finding, sourceUrl, pageText });
    // A blocked terminal finding is retained as a partial lead, never as an
    // accepted model finding. If the core accepts it, the strict persistence
    // boundary below must still prevent card promotion.
    if (result.modelFindings.length === 0) expect(result.partialFindings?.length).toBeGreaterThan(0);
    else expect(result.modelFindings).toHaveLength(1);

    const contact = findingsToContacts([finding as any], "Jane Example")[0];
    expect(contact).toBeDefined();
    const samePageSupport = supportsCandidateContactOnSameObservation(pageText, contact!, value, "email");
    const strictSupport = supportsContactClaimAcrossObservations(
      [{ observationText: pageText, sourceUrls: [sourceUrl] }], contact!, value, "email",
    );
    if (suffix === "aggregator") {
      expect(samePageSupport).toBe(true);
      expect(strictSupport).toBe(false);
    } else {
      expect(samePageSupport).toBe(false);
      expect(strictSupport).toBe(false);
    }

    const persistedContext = await createTargetEvidence({ sourceUrl, observation: pageText, finding, suffix });
    const inserted = await persistContacts(
      persistedContext.entityId, [contact!], "agentic-target-contact", persistedContext.jobId,
      [sourceUrl], { caseId: persistedContext.caseId, runId: persistedContext.runId, jobId: persistedContext.jobId },
    );
    expect(inserted).toBe(1); // retained as unverified evidence, never promoted to the person card
    const [card] = await db.select().from(tables.entitiesTable)
      .where(eq(tables.entitiesTable.id, persistedContext.entityId)).limit(1);
    expect(card.email).toBeNull();
    const metadata = JSON.parse(card.metadata);
    expect(metadata.agenticContactProvenance?.email).toBeUndefined();
    const [stored] = await db.select().from(tables.contactEvidenceTable)
      .where(eq(tables.contactEvidenceTable.entityId, persistedContext.entityId)).limit(1);
    expect(JSON.parse(stored.metadata)).toMatchObject({ investigatorSelectedForCard: true, contactAttribution: "person_specific" });
  });
});
