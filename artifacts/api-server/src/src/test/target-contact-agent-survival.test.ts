import { beforeEach, describe, expect, it, vi } from "vitest";

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
  const quote = "Jane Example — Managing Director can be reached directly at jane@example.org.";
  const sourceUrl = "https://example.org/team/jane-example";
  const events = [
    {
      id: 11, caseId: 1, eventType: "claim", actorRole: "head_investigator", status: "success",
      correlationKey: "run-survival-1:claim:1",
      payload: JSON.stringify({
        runId: "run-survival-1", jobId: "job-1",
        claim: { vectorType: "email", value: "jane@example.org", personName: "Jane Example" },
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
      if (entry.op === "eq") return row[entry.column.field] === entry.value;
      if (entry.op === "like") return String(row[entry.column.field] ?? "").includes(String(entry.value).replaceAll("%", ""));
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
  const tx = { select: query, insert, update };
  const db = {
    select: query,
    insert,
    update,
    transaction: async (callback: (tx: any) => Promise<any>) => callback(tx),
  };
  return { db, entitiesTable, researchCasesTable, researchCaseEventsTable, contactEvidenceTable, entity, caseRow, events, quote, sourceUrl, insertedContacts, get cardUpdate() { return cardUpdate; } };
});

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
  getAvailableInvestigatorCapabilities: vi.fn(() => ["groq-investigator-1"]),
}));
vi.mock("../lib/identity-collision", () => ({
  assessIdentityCollision: vi.fn(() => ({ risk: null, identityMatch: 0.95, reason: null })),
}));

import { runAgenticWebResearch } from "../lib/agentic-web-research";
import { runTargetContactAgent } from "../lib/target-contact-agent";

describe("offline Investigator-to-card survival path", () => {
  beforeEach(() => {
    testState.entity.email = null;
    testState.insertedContacts.length = 0;
    testState.events.splice(0, testState.events.length,
      {
        id: 11, caseId: 1, eventType: "claim", actorRole: "head_investigator", status: "success",
        correlationKey: "run-survival-1:claim:1",
        payload: JSON.stringify({
          runId: "run-survival-1", jobId: "job-1",
          claim: { vectorType: "email", value: "jane@example.org", personName: "Jane Example" },
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
      value: "jane@example.org",
      personName: "Jane Example",
      role: "Managing Director",
      scope: "candidate" as const,
      sourceUrls: [testState.sourceUrl],
      note: "Official team profile identifies Jane Example and gives her direct professional email.",
      contactAttribution: "person_specific" as const,
      exactQuote: testState.quote,
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
    expect(result.email).toBe("jane@example.org");
    expect(testState.insertedContacts).toHaveLength(1);
    const evidenceMetadata = JSON.parse(testState.insertedContacts[0].metadata);
    expect(evidenceMetadata).toMatchObject({
      contactAttribution: "person_specific",
      exactQuote: testState.quote,
      investigatorSelectedForCard: true,
    });
    expect(testState.cardUpdate.email).toBe("jane@example.org");
    const promotionPayload = testState.cardUpdate.metadata.values.find((value: unknown) =>
      typeof value === "string" && value.includes("exactQuote"),
    );
    expect(JSON.parse(String(promotionPayload))).toMatchObject({
      contactAttribution: "person_specific",
      exactQuote: testState.quote,
      jobId: "job-1",
    });
  });
});
