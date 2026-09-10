import { describe, expect, it } from "vitest";
import { findingsToBureauContacts, sourceBackedAgenticFindings } from "../lib/bureau-agentic-pass";
import { findingsToContacts, sourceBackedFindings } from "../lib/target-contact-agent";
import type { AgenticFinding, AgenticTrajectoryRecord } from "../lib/agentic-web-research";

const finding = (overrides: Partial<AgenticFinding> = {}): AgenticFinding => ({
  vectorType: "email",
  value: "jane@example.com",
  personName: "Jane Example",
  role: "Founder",
  scope: "candidate",
  sourceUrls: ["https://example.com/team/jane"],
  note: "named on the team page",
  ...overrides,
});

const observation = (overrides: Partial<AgenticTrajectoryRecord> = {}): AgenticTrajectoryRecord => ({
  turn: 1,
  model: "groq",
  action: "visit",
  args: { url: "https://example.com/team/jane" },
  execution: "success",
  observation: "Jane Example — Founder — jane@example.com",
  observedUrls: ["https://example.com/team/jane"],
  findings: [],
  ...overrides,
});

const successfulTrajectory = [
  "step1: visit https://example.com/team/jane execution=success observed=https://example.com/team/jane",
];

describe("agentic source provenance", () => {
  it("drops contact findings without a successful observed source", () => {
    const raw = [finding({ sourceUrls: [] }), finding({ sourceUrls: ["google-search://jane@example.com"] })];
    expect(sourceBackedFindings(raw)).toHaveLength(0);
    expect(sourceBackedAgenticFindings(raw)).toHaveLength(0);
  });

  it("accepts a claim only when the cited source was successfully observed and contains the claim", () => {
    const raw = [finding()];
    expect(sourceBackedFindings(raw, successfulTrajectory, [observation()])).toHaveLength(1);
    expect(sourceBackedAgenticFindings(raw, successfulTrajectory, [observation()])).toHaveLength(1);
  });

  it("rejects a candidate claim when identity and contact value are split across observations", () => {
    const raw = [finding()];
    const records = [
      observation({ observation: "Jane Example — Founder", observedUrls: ["https://example.com/team/jane"] }),
      observation({ turn: 2, observation: "jane@example.com", observedUrls: ["https://example.com/contact"] }),
    ];
    const trajectory = [
      "step1: visit https://example.com/team/jane execution=success observed=https://example.com/team/jane",
      "step2: visit https://example.com/contact execution=success observed=https://example.com/contact",
    ];
    expect(sourceBackedFindings(raw, trajectory, records)).toHaveLength(0);
    expect(sourceBackedAgenticFindings(raw, trajectory, records)).toHaveLength(0);
  });

  it("does not allow an attempted or failed observation to establish provenance", () => {
    const raw = [finding()];
    const failed = observation({ execution: "http_error", observation: "Jane Example — Founder — jane@example.com" });
    expect(sourceBackedFindings(raw, successfulTrajectory, [failed])).toHaveLength(0);
    expect(sourceBackedAgenticFindings(raw, successfulTrajectory, [failed])).toHaveLength(0);
  });

  it("does not turn a missing source into a synthetic search URL", () => {
    const contacts = findingsToContacts([
      {
        vectorType: "email",
        value: "jane@example.com",
        scope: "candidate",
        personName: "Jane Example",
        role: "Founder",
        sourceUrls: [],
        note: "model claim without source",
      },
      {
        vectorType: "email",
        value: "jane@example.com",
        scope: "candidate",
        personName: "Jane Example",
        role: "Founder",
        sourceUrls: ["https://example.com/team/jane"],
        note: "source-backed claim",
      },
    ], "Jane Example");

    expect(contacts).toHaveLength(1);
    expect(contacts[0]?.sourceUrls).toEqual(["https://example.com/team/jane"]);
  });

  it("keeps organization scope organization-scoped", () => {
    const contacts = findingsToBureauContacts([
      finding({
        value: "info@example.com",
        personName: "Jane Example",
        scope: "organization",
        sourceUrls: ["https://example.com/contact"],
      }),
    ], "Jane Example");

    expect(contacts).toHaveLength(1);
    expect(contacts[0]?.scope).toBe("organization");
    expect(contacts[0]?.personName).toBeNull();
  });
});
