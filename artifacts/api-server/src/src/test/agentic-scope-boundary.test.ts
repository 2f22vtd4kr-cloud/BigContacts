import { describe, expect, it, vi } from "vitest";

// This suite exercises pure evidence-shaping boundaries. The production wrapper
// imports the database for its persistence path, so keep the unit boundary
// database-free rather than requiring DATABASE_URL for a pure transformation test.
vi.mock("@workspace/db", () => ({
  db: {},
  researchCasesTable: {},
  researchCaseEventsTable: {},
}));

import { findingsToContactEvidence, findingsToBureauContacts } from "../lib/bureau-agentic-pass";
import { findingsToContacts } from "../lib/target-contact-agent";
import type { AgenticFinding, AgenticTrajectoryRecord } from "../lib/agentic-web-research";
import { getAgenticExecutionScope, getAgenticSelectedInvestigator, withAgenticExecutionScope } from "../lib/agentic-execution-context";

const source = "https://example.com/contact";
const trajectory = [`step1: visit ${source} execution=success observed=${source}`];
function observedRecord(observation: string): AgenticTrajectoryRecord {
  return {
    turn: 1,
    model: "test-investigator",
    action: "visit",
    args: { url: source },
    execution: "success",
    observation,
    observedUrls: [source],
    findings: [],
  };
}

describe("agentic evidence scope boundary", () => {
  it("keeps explicit candidate findings personal", () => {
    const finding: AgenticFinding = {
      vectorType: "email",
      value: "jane@example.com",
      personName: "Jane Example",
      role: "Founder",
      scope: "candidate",
      sourceUrls: [source],
      note: "named email on source",
    };
    const records = [observedRecord("Jane Example — Founder — jane@example.com")];

    expect(findingsToBureauContacts([finding], "Jane Example", trajectory, records)[0]).toMatchObject({
      scope: "candidate",
      personName: "Jane Example",
      promote: false,
    });
    const evidence = findingsToContactEvidence([finding], trajectory, records);
    expect(evidence[0]).toMatchObject({
      scope: "candidate",
      personName: "Jane Example",
    });
    expect(findingsToContacts(evidence, "Jane Example")[0]).toMatchObject({
      scope: "candidate",
      personName: "Jane Example",
    });
  });

  it("marks an explicit investigator promotion for card application", () => {
    const finding: AgenticFinding = {
      vectorType: "email",
      value: "jane@example.com",
      personName: "Jane Example",
      role: "Founder",
      scope: "candidate",
      sourceUrls: [source],
      note: "named email on source",
      promotionDecision: "promote",
      promotionReason: "Exact named contact on the visited company page.",
    };
    const records = [observedRecord("Jane Example — Founder — jane@example.com")];

    expect(findingsToBureauContacts([finding], "Jane Example", trajectory, records)[0]).toMatchObject({
      promote: true,
    });
  });

  it("turns unknown scope into organization scope instead of inheriting the target", () => {
    const finding: AgenticFinding = {
      vectorType: "email",
      value: "info@example.com",
      personName: null,
      role: null,
      scope: "unknown" as AgenticFinding["scope"],
      sourceUrls: [source],
      note: "generic public mailbox",
    };
    const records = [observedRecord("Contact email: info@example.com")];

    expect(findingsToBureauContacts([finding], "Jane Example", trajectory, records)[0]).toMatchObject({
      scope: "organization",
      personName: null,
      promote: false,
    });
    const evidence = findingsToContactEvidence([finding], trajectory, records);
    expect(evidence[0]).toMatchObject({
      scope: "organization",
      personName: null,
    });
    expect(findingsToContacts(evidence, "Jane Example")[0]).toMatchObject({
      scope: "organization",
      personName: null,
    });
  });
});


describe("per-run execution identity", () => {
  it("keeps case identity while distinguishing separate runs", async () => {
    const first = await withAgenticExecutionScope("agentic:case:case-1:run:run-1:investigator:groq-investigator-1", async () => ({
      scope: getAgenticExecutionScope(),
      provider: getAgenticSelectedInvestigator(),
    }));
    const second = await withAgenticExecutionScope("agentic:case:case-1:run:run-2:investigator:groq-investigator-1", async () => ({
      scope: getAgenticExecutionScope(),
      provider: getAgenticSelectedInvestigator(),
    }));
    expect(first.scope).not.toBe(second.scope);
    expect(first.provider).toBe("groq");
    expect(second.provider).toBe("groq");
  });

  it("retains provider extraction for non-case and legacy case scopes", async () => {
    await withAgenticExecutionScope("agentic:run-3:investigator:groq-investigator-2", async () => {
      expect(getAgenticSelectedInvestigator()).toBe("groq");
    });
    await withAgenticExecutionScope("agentic:case:case-2:investigator:mistral", async () => {
      expect(getAgenticSelectedInvestigator()).toBe("mistral");
    });
  });
});
