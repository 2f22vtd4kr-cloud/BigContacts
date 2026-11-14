import { createServer, type Server } from "node:http";
import express from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

vi.mock("../lib/canonical-job-lock", async () => {
  const actual = await vi.importActual<any>("../lib/canonical-job-lock");
  return { ...actual, isCanonicalJobOwner: vi.fn(async () => true) };
});
vi.mock("../lib/redis", async () => {
  const actual = await vi.importActual<any>("../lib/redis");
  return {
    ...actual,
    getCache: vi.fn(async () => null),
    setCache: vi.fn(async () => undefined),
    delCachePattern: vi.fn(async () => undefined),
  };
});

const databaseEnabled = Boolean(process.env.DATABASE_URL?.trim());

describe.skipIf(!databaseEnabled)("PostgreSQL Investigator contact persistence and card readback", () => {
  let db: any;
  let pool: any;
  let tables: any;
  let persistContacts: any;
  let findingsToContacts: any;
  let server: Server | null = null;
  const entityIds: number[] = [];
  const caseIds: number[] = [];
  const runToken = randomUUID();

  beforeAll(async () => {
    const dbModule = await import("@workspace/db");
    db = dbModule.db;
    pool = dbModule.pool;
    tables = dbModule;

    const [strict, targetAgent, route] = await Promise.all([
      import("../lib/bureau-contact-persist-strict"),
      import("../lib/target-contact-agent"),
      import("../routes/entities"),
    ]);
    persistContacts = strict.persistSourceBackedBureauContactsForEntity;
    findingsToContacts = targetAgent.findingsToContacts;

    const app = express();
    app.use(route.default);
    server = createServer(app);
    await new Promise<void>((resolve, reject) => {
      server!.once("error", reject);
      server!.listen(0, "127.0.0.1", resolve);
    });
  }, 30_000);

  afterAll(async () => {
    if (server?.listening) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    if (pool) {
      if (caseIds.length) {
        await pool.query("DELETE FROM research_case_events WHERE case_id = ANY($1::int[])", [caseIds]);
      }
      if (entityIds.length) {
        await pool.query("DELETE FROM contact_evidence WHERE entity_id = ANY($1::int[])", [entityIds]);
      }
      if (caseIds.length) {
        await pool.query("DELETE FROM research_cases WHERE id = ANY($1::int[])", [caseIds]);
      }
      if (entityIds.length) {
        await pool.query("DELETE FROM entities WHERE id = ANY($1::int[])", [entityIds]);
      }
      await pool.end();
    }
  }, 30_000);

  it("persists a model-selected personal route on the canonical card, reads it through GET /entities, and keeps a shared inbox organization-scoped", async () => {
    const { entitiesTable, researchCasesTable, researchCaseEventsTable, contactEvidenceTable } = tables;
    const targetName = `Apex QA Person ${runToken.slice(0, 8)}`;
    const personalEmail = `qa.${runToken.slice(0, 8)}@integration-apex.example.com`;
    const sharedEmail = `info.${runToken.slice(0, 8)}@integration-apex.example.com`;
    const personalUrl = `https://profiles.integration-apex.example.com/team/${runToken}`;
    const sharedUrl = `https://www.integration-apex.example.com/contact`;
    const exactQuote = `${targetName}, Managing Director, can be contacted directly at ${personalEmail}.`;

    const [person] = await db.insert(entitiesTable).values({
      name: targetName,
      type: "PersonCandidate",
      metadata: JSON.stringify({ reviewOnly: true, admission: "investigator-explicit-promotion" }),
    }).returning({ id: entitiesTable.id });
    expect(person?.id).toBeGreaterThan(0);
    entityIds.push(person.id);

    const [personalCase] = await db.insert(researchCasesTable).values({
      targetEntityId: person.id,
      caseType: "target",
      status: "active",
      objective: `Verify the professional contact route for ${targetName}`,
      motivation: "Offline production persistence integration test",
      currentAction: "target-research",
      caseFile: JSON.stringify({ atlasJobId: `job-person-${runToken}` }),
    }).returning({ id: researchCasesTable.id });
    expect(personalCase?.id).toBeGreaterThan(0);
    caseIds.push(personalCase.id);

    const runId = `run-person-${runToken}`;
    const jobId = `job-person-${runToken}`;
    const [observation] = await db.insert(researchCaseEventsTable).values({
      caseId: personalCase.id,
      iteration: 1,
      actorRole: "head_investigator",
      eventType: "tool_observation",
      status: "success",
      summary: "Successfully fetched the public team profile",
      correlationKey: `${runId}:observation:1`,
      payload: JSON.stringify({
        runId,
        jobId,
        action: "visit",
        execution: "success",
        observation: exactQuote,
        sourceUrl: personalUrl,
        observedUrls: [personalUrl],
      }),
    }).returning({ id: researchCaseEventsTable.id });
    expect(observation?.id).toBeGreaterThan(0);

    await db.insert(researchCaseEventsTable).values({
      caseId: personalCase.id,
      iteration: 1,
      actorRole: "head_investigator",
      eventType: "claim",
      status: "success",
      summary: "Investigator attributed the direct email to the named person",
      correlationKey: `${runId}:claim:1`,
      payload: JSON.stringify({
        runId,
        jobId,
        claim: { vectorType: "email", value: personalEmail, personName: targetName },
        observationEventIds: [observation.id],
      }),
    });

    const rawPersonalFinding = {
      vectorType: "email",
      value: personalEmail,
      scope: "candidate",
      personName: targetName,
      role: "Managing Director",
      sourceUrls: [personalUrl],
      note: "The fetched public team profile explicitly attributes this direct professional route.",
      contactAttribution: "person_specific",
      exactQuote,
      promotionDecision: "promote",
      promotionReason: "The exact fetched statement names the person and gives the route.",
    };
    const mappedPersonal = findingsToContacts([rawPersonalFinding], targetName);
    expect(mappedPersonal).toHaveLength(1);
    expect(mappedPersonal[0]).toMatchObject({
      scope: "candidate",
      contactAttribution: "person_specific",
      exactQuote,
      promote: true,
    });

    const persisted = await persistContacts(
      person.id,
      mappedPersonal,
      "agentic-target-contact",
      jobId,
      [personalUrl],
      { caseId: personalCase.id, runId, jobId },
    );
    expect(persisted).toBe(1);

    const [storedEvidence] = await db.select().from(contactEvidenceTable)
      .where((await import("drizzle-orm")).and(
        (await import("drizzle-orm")).eq(contactEvidenceTable.entityId, person.id),
        (await import("drizzle-orm")).eq(contactEvidenceTable.value, personalEmail),
      )).limit(1);
    expect(storedEvidence).toBeTruthy();
    expect(JSON.parse(storedEvidence.metadata)).toMatchObject({
      scope: "candidate",
      contactAttribution: "person_specific",
      exactQuote,
      sourceUrls: [personalUrl],
      investigatorSelectedForCard: true,
      jobId,
    });

    const [updatedPerson] = await db.select().from(entitiesTable)
      .where((await import("drizzle-orm")).eq(entitiesTable.id, person.id)).limit(1);
    expect(updatedPerson.email).toBe(personalEmail);
    expect(JSON.parse(updatedPerson.metadata)).toMatchObject({
      agenticContactProvenance: {
        email: {
          value: personalEmail,
          personName: targetName,
          contactAttribution: "person_specific",
          exactQuote,
          sourceUrls: [personalUrl],
          observedSourceUrls: [personalUrl],
          claimEventId: expect.any(Number),
          observationEventIds: [observation.id],
          jobId,
        },
      },
    });

    const [sharedPerson] = await db.insert(entitiesTable).values({
      name: `Apex QA Shared Inbox ${runToken.slice(0, 8)}`,
      type: "PersonCandidate",
      metadata: JSON.stringify({ reviewOnly: true, admission: "investigator-explicit-promotion" }),
    }).returning({ id: entitiesTable.id });
    expect(sharedPerson?.id).toBeGreaterThan(0);
    entityIds.push(sharedPerson.id);

    const sharedJobId = `job-shared-${runToken}`;
    const [sharedCase] = await db.insert(researchCasesTable).values({
      targetEntityId: sharedPerson.id,
      caseType: "target",
      status: "active",
      objective: "Preserve an organization contact as shared",
      motivation: "Offline shared-inbox safety integration test",
      currentAction: "target-research",
      caseFile: JSON.stringify({ atlasJobId: sharedJobId }),
    }).returning({ id: researchCasesTable.id });
    expect(sharedCase?.id).toBeGreaterThan(0);
    caseIds.push(sharedCase.id);

    const mappedShared = findingsToContacts([{
      vectorType: "email",
      value: sharedEmail,
      scope: "candidate",
      personName: targetName,
      role: "Office contact",
      sourceUrls: [sharedUrl],
      note: "The website lists the organization inbox.",
      contactAttribution: "shared_inbox",
      exactQuote: `Contact the office at ${sharedEmail}.`,
      promotionDecision: "promote",
      promotionReason: "Model explicitly classified the route as shared.",
    }], targetName);
    expect(mappedShared[0]).toMatchObject({
      scope: "organization",
      contactAttribution: "shared_inbox",
      promote: false,
      personName: null,
    });

    expect(await persistContacts(
      sharedPerson.id,
      mappedShared,
      "agentic-target-contact",
      sharedJobId,
      [sharedUrl],
      { caseId: sharedCase.id, runId: `run-shared-${runToken}`, jobId: sharedJobId },
    )).toBe(1);

    const [sharedEvidence] = await db.select().from(contactEvidenceTable)
      .where((await import("drizzle-orm")).and(
        (await import("drizzle-orm")).eq(contactEvidenceTable.entityId, sharedPerson.id),
        (await import("drizzle-orm")).eq(contactEvidenceTable.value, sharedEmail),
      )).limit(1);
    expect(JSON.parse(sharedEvidence.metadata)).toMatchObject({
      scope: "organization",
      contactAttribution: "shared_inbox",
      investigatorSelectedForCard: false,
    });
    const [unchangedSharedPerson] = await db.select().from(entitiesTable)
      .where((await import("drizzle-orm")).eq(entitiesTable.id, sharedPerson.id)).limit(1);
    expect(unchangedSharedPerson.email).toBeNull();

    const address = server?.address();
    if (!address || typeof address === "string") throw new Error("Test API server did not bind a TCP port.");
    const response = await fetch(
      `http://127.0.0.1:${address.port}/entities?type=PersonCandidate&search=${encodeURIComponent(targetName)}`,
    );
    expect(response.status).toBe(200);
    const cards = await response.json() as Array<Record<string, any>>;
    const personalCard = cards.find((card) => card.id === person.id);
    expect(personalCard).toBeTruthy();
    expect(personalCard.email).toBe(personalEmail);
    expect(personalCard.contacts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        vectorType: "email",
        value: personalEmail,
        sourceUrl: personalUrl,
      }),
    ]));

    const sharedResponse = await fetch(
      `http://127.0.0.1:${address.port}/entities?type=PersonCandidate&search=${encodeURIComponent(String(sharedPerson.name ?? ""))}`,
    );
    expect(sharedResponse.status).toBe(200);
    const sharedCards = await sharedResponse.json() as Array<Record<string, any>>;
    const sharedCard = sharedCards.find((card) => card.id === sharedPerson.id);
    expect(sharedCard).toBeTruthy();
    expect(sharedCard.email).toBeNull();
    expect(sharedCard.contacts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        vectorType: "email",
        value: sharedEmail,
        mark: "organization",
        sourceUrl: sharedUrl,
      }),
    ]));
  }, 30_000);
});
