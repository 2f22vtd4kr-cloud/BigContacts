import { describe, expect, it, vi } from "vitest";

// The assertion covers provenance shaping only; do not bootstrap persistence
// for a unit test whose contract is independent of the database.
vi.mock("@workspace/db", () => ({
  db: {},
  researchCasesTable: {},
  researchCaseEventsTable: {},
}));

import { sourceBackedAgenticFindings } from "../lib/bureau-agentic-pass";

describe("Bureau multi-source attribution", () => {
  it("accepts a model claim when identity and value are observed on separate cited pages", () => {
    const finding = { vectorType: "email" as const, value: "jane@example.com", personName: "Jane Smith", role: "CFO", scope: "candidate" as const, sourceUrls: ["https://company.example/leadership", "https://company.example/contact"], note: "multi-source", promotionDecision: "promote" as const };
    const records = [
      { turn: 1, model: "groq", action: "visit", args: {}, execution: "success" as const, observation: "Jane Smith is CFO.", observedUrls: ["https://company.example/leadership"], findings: [] },
      { turn: 2, model: "groq", action: "visit", args: {}, execution: "success" as const, observation: "Email jane@example.com", observedUrls: ["https://company.example/contact"], findings: [] },
    ];
    const result = sourceBackedAgenticFindings([finding], [
      "step1: visit https://company.example/leadership execution=success observed=https://company.example/leadership",
      "step2: visit https://company.example/contact execution=success observed=https://company.example/contact",
    ], records);
    expect(result).toHaveLength(1);
  });
  it("rejects substring identity matches such as Ann Li inside Joann Li", () => {
    const finding = {
      vectorType: "email" as const,
      value: "ann@example.com",
      personName: "Ann Li",
      role: "Director",
      scope: "candidate" as const,
      sourceUrls: ["https://company.example/team"],
      note: "ambiguous name",
      promotionDecision: "promote" as const,
    };
    const records = [{
      turn: 1,
      model: "groq",
      action: "visit",
      args: {},
      execution: "success" as const,
      observation: "Joann Li — ann@example.com",
      observedUrls: ["https://company.example/team"],
      findings: [],
    }];

    expect(sourceBackedAgenticFindings([finding], [], records)).toEqual([]);
  });

  it("rejects candidate claims without a personName even when the value is observed", () => {
    const finding = {
      vectorType: "email" as const,
      value: "jane@example.com",
      personName: null,
      role: null,
      scope: "candidate" as const,
      sourceUrls: ["https://company.example/contact"],
      note: "missing identity",
      promotionDecision: "promote" as const,
    };
    const records = [{
      turn: 1,
      model: "groq",
      action: "visit",
      args: {},
      execution: "success" as const,
      observation: "Contact jane@example.com",
      observedUrls: ["https://company.example/contact"],
      findings: [],
    }];

    expect(sourceBackedAgenticFindings([finding], [], records)).toEqual([]);
  });

  it("rejects an other/generic claim when its claimed value never appears in observed material", () => {
    const finding = {
      vectorType: "other" as const,
      value: "secret office route",
      personName: "Jane Smith",
      role: "CFO",
      scope: "candidate" as const,
      sourceUrls: ["https://company.example/leadership"],
      note: "model-only value",
      promotionDecision: "promote" as const,
    };
    const records = [{
      turn: 1,
      model: "groq",
      action: "visit",
      args: {},
      execution: "success" as const,
      observation: "Jane Smith is CFO.",
      observedUrls: ["https://company.example/leadership"],
      findings: [],
    }];
    const result = sourceBackedAgenticFindings([finding], [
      "step1: visit https://company.example/leadership execution=success observed=https://company.example/leadership",
    ], records);
    expect(result).toHaveLength(0);
  });
});
