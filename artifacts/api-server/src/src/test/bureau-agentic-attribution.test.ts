import { describe, expect, it, vi } from "vitest";

// The assertion covers provenance shaping only; do not bootstrap persistence
// for a unit test whose contract is independent of the database.
vi.mock("@workspace/db", () => ({
  db: {},
  researchCasesTable: {},
  researchCaseEventsTable: {},
}));

import { sourceBackedAgenticFindings } from "../lib/bureau-agentic-pass";
import { supportsContactClaimAcrossObservations, supportsReviewableClaimAcrossObservations } from "../lib/bureau-contact-persist-strict";

describe("Bureau multi-source attribution", () => {
  it("keeps cross-page candidate attribution reviewable but rejects it at trusted-promotion co-binding", () => {
    const finding = { vectorType: "email" as const, value: "jane@example.com", personName: "Jane Smith", role: "CFO", scope: "candidate" as const, sourceUrls: ["https://company.example/leadership", "https://company.example/contact"], note: "multi-source", promotionDecision: "promote" as const };
    const records = [
      { turn: 1, model: "groq", action: "visit", args: {}, execution: "success" as const, observation: "Jane Smith is CFO.", observedUrls: ["https://company.example/leadership"], findings: [] },
      { turn: 2, model: "groq", action: "visit", args: {}, execution: "success" as const, observation: "Email jane@example.com", observedUrls: ["https://company.example/contact"], findings: [] },
    ];
    const result = sourceBackedAgenticFindings([finding], [
      "step1: visit https://company.example/leadership execution=success observed=https://company.example/leadership",
      "step2: visit https://company.example/contact execution=success observed=https://company.example/contact",
    ], records);
    const materials = records.map((record) => ({ observationText: record.observation, sourceUrls: record.observedUrls }));
    expect(result).toHaveLength(1);
    expect(supportsReviewableClaimAcrossObservations(materials, finding, finding.value, finding.vectorType)).toBe(true);
    expect(supportsContactClaimAcrossObservations(materials, finding, finding.value, finding.vectorType)).toBe(false);
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

  it("does not treat an unrelated observed page as evidence for an organization claim", () => {
    const finding = {
      vectorType: "email" as const,
      value: "info@company.example",
      personName: null,
      role: null,
      scope: "organization" as const,
      sourceUrls: ["https://company.example/contact", "https://company.example/about"],
      note: "organization contact",
      promotionDecision: "promote" as const,
    };
    const records = [
      {
        turn: 1,
        model: "groq",
        action: "visit",
        args: {},
        execution: "success" as const,
        observation: "General contact: info@company.example",
        observedUrls: ["https://company.example/contact"],
        findings: [],
      },
      {
        turn: 2,
        model: "groq",
        action: "visit",
        args: {},
        execution: "success" as const,
        observation: "Our history and values",
        observedUrls: ["https://company.example/about"],
        findings: [],
      },
    ];

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

  it("rejects candidate email attribution across separate person entries", () => {
    const item = {
      vectorType: "email",
      value: "john.doe@acme.org",
      personName: "Jane Smith",
      scope: "candidate",
      sourceUrls: ["https://acme.org/team"],
    };
    const observations = [{
      observationText: "Jane Smith — CFO; John Doe — CEO; email: john.doe@acme.org",
      sourceUrls: ["https://acme.org/team"],
    }];

    expect(supportsContactClaimAcrossObservations(observations, item, item.value, item.vectorType)).toBe(false);
  });

  it("rejects candidate phone attribution across separate person entries", () => {
    const item = {
      vectorType: "phone",
      value: "+1 415 555 0162",
      personName: "Jane Smith",
      scope: "candidate",
      sourceUrls: ["https://acme.org/team"],
    };
    const observations = [{
      observationText: "Jane Smith — CFO; John Doe — CEO; phone: +1 415 555 0162",
      sourceUrls: ["https://acme.org/team"],
    }];

    expect(supportsContactClaimAcrossObservations(observations, item, item.value, item.vectorType)).toBe(false);
  });

  it("retains co-binding when identity and contact are in the same entry", () => {
    const item = {
      vectorType: "email",
      value: "jane.smith@acme.org",
      personName: "Jane Smith",
      scope: "candidate",
      sourceUrls: ["https://acme.org/team"],
    };
    const observations = [{
      observationText: "Jane Smith — CFO, email: jane.smith@acme.org",
      sourceUrls: ["https://acme.org/team"],
    }];

    expect(supportsContactClaimAcrossObservations(observations, item, item.value, item.vectorType)).toBe(true);
  });

});
