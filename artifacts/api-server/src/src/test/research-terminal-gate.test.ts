import { describe, expect, it } from "vitest";
import { evaluateResearchTerminal } from "../lib/research-terminal-gate";
import type { IntelligenceContext } from "../lib/research-intelligence-engine";

function context(independentSourceUnits: number, falsificationAttempt = false): IntelligenceContext {
  return {
    version: 1,
    caseId: 1,
    executionId: "test-execution",
    target: "Test Target",
    objective: "Verify source independence",
    facts: [],
    hypotheses: [],
    contradictions: [],
    contacts: [],
    negativeFindings: [],
    openQuestions: [],
    recentActions: falsificationAttempt ? [{
      turn: 4,
      action: "visit",
      args: { purpose: "seek counterevidence and try to disprove the current executive role", hypothesis: "current executive role" },
      execution: "success",
      observation: "Observed page material relevant to the competing identity hypothesis.",
      urls: ["https://independent.example/profile"],
      findingCount: 0,
      useful: false,
      informationGain: 0.3,
      findingNames: [],
      findingRoles: [],
    }] : [],
    sourceDiversity: 2,
    sourceFamilyDiversity: 1,
    repeatedSourceFamilies: [],
    evidenceCount: 3,
    provenanceDigest: "test",
    missionBriefs: [],
    sourceQualitySummary: [],
    frontier: {
      saturation: 0,
      sourceIndependence: 0.7,
      contradictionPressure: 0,
      unresolvedPressure: 0,
      nextMovePriority: "verify",
      reasons: [],
    },
    sourceIndependence: 0.7,
    providerDisagreements: [],
    atomicEvidence: [
      { evidenceId: "e1", kind: "finding", claimId: "c1", claim: "claim 1", sourceUrl: "https://same.example/a", sourceHost: "same.example", sourceClass: "OFFICIAL_COMPANY", passage: "claim 1", spanBound: true, spanBindingKind: "identity_and_value", attribution: "Test Target" },
      { evidenceId: "e2", kind: "finding", claimId: "c2", claim: "claim 2", sourceUrl: "https://same.example/b", sourceHost: "same.example", sourceClass: "OFFICIAL_COMPANY", passage: "claim 2", spanBound: true, spanBindingKind: "identity_and_value", attribution: "Test Target" },
      { evidenceId: "e3", kind: "finding", claimId: "c3", claim: "claim 3", sourceUrl: "https://same.example/c", sourceHost: "same.example", sourceClass: "OFFICIAL_COMPANY", passage: "claim 3", spanBound: true, spanBindingKind: "identity_and_value", attribution: "Test Target" },
    ],
    actionYield: [],
    sourceLineage: [],
    independentSourceUnits,
    falsification: {
      required: true,
      priority: 0.2,
      discriminator: "current executive role",
      reason: "test",
    },
    researchQuestions: [],
    stoppingAssessment: { evidenceCoverage: 1, unresolvedQuestions: 0, recommendation: "review" },
  };
}

describe("research terminal gate", () => {
  it("uses lineage-aware independent source units rather than raw host count", () => {
    const result = evaluateResearchTerminal(context(2, true), "target");
    expect(result.allowed).toBe(true);
    expect(result.metrics.independentSourceUnits).toBe(2);
  });

  it("recognizes explicit falsification intent in nested parallel-search queries", () => {
    const sample = context(2);
    sample.recentActions = [{
      turn: 4,
      action: "parallel_web_search",
      args: {
        searches: [
          { query: "find evidence that could disprove the current executive role", provider: "serper" },
        ],
        searchOutcomes: [
          { query: "find evidence that could disprove the current executive role", status: "success", urls: ["https://independent.example/results"] },
        ],
      },
      execution: "success",
      observation: "Parallel search completed.",
      urls: ["https://independent.example/results"],
      findingCount: 0,
      useful: false,
      informationGain: 0.3,
      findingNames: [],
      findingRoles: [],
    }];

    const result = evaluateResearchTerminal(sample, "target");
    expect(result.allowed).toBe(true);
  });

  it("does not treat arbitrary parallel-search queries as falsification", () => {
    const sample = context(2);
    sample.recentActions = [{
      turn: 4,
      action: "parallel_web_search",
      args: {
        searches: [
          { query: "official company page current executive", provider: "serper" },
        ],
      },
      execution: "success",
      observation: "Parallel search completed.",
      urls: ["https://independent.example/results"],
      findingCount: 0,
      useful: false,
      informationGain: 0.3,
      findingNames: [],
      findingRoles: [],
    }];

    const result = evaluateResearchTerminal(sample, "target");
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain("required_falsification_not_satisfied");
  });

  it("blocks a required falsification when the trajectory has no explicit disproof attempt", () => {
    const result = evaluateResearchTerminal(context(2), "target");
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain("required_falsification_not_satisfied");
  });

  it("uses stage-specific falsification rules even when the adaptive plan has no active discriminator", () => {
    const sample = context(2);
    sample.falsification = {
      ...sample.falsification,
      required: false,
      discriminator: null,
      reason: "No discriminator is currently recorded.",
    };

    const targetResult = evaluateResearchTerminal(sample, "target");
    expect(targetResult.allowed).toBe(false);
    expect(targetResult.reasons).toContain("required_falsification_not_satisfied");

    const discoveryResult = evaluateResearchTerminal(sample, "discovery");
    expect(discoveryResult.allowed).toBe(true);
    expect(discoveryResult.reasons).not.toContain("required_falsification_not_satisfied");
  });

  it("does not mistake a high falsification priority score for proof of an attempt", () => {
    const sample = context(2);
    sample.falsification = { required: true, priority: 0.1, discriminator: "competing identity", reason: "test" };
    sample.recentActions = [{
      turn: 4,
      action: "visit",
      args: { purpose: "verify the company profile and identify the current executive" },
      execution: "success",
      observation: "Page fetched successfully.",
      urls: ["https://independent.example/profile"],
      findingCount: 1,
      useful: true,
      informationGain: 0.4,
      findingNames: ["Test Target"],
      findingRoles: ["Executive"],
    }];
    const result = evaluateResearchTerminal(sample, "target");
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain("required_falsification_not_satisfied");
  });

  it("requires falsification intent to match the active discriminator", () => {
    const sample = context(2);
    sample.recentActions = [{
      turn: 5, action: "web_search",
      args: { query: "find counterevidence to the current executive role", purpose: "seek disproof" },
      execution: "success", observation: "Search completed", urls: ["https://independent.example/results"],
      findingCount: 0, useful: false, informationGain: 0.2, findingNames: [], findingRoles: [],
    }];
    expect(evaluateResearchTerminal(sample, "target").allowed).toBe(true);
    sample.recentActions = [{
      turn: 6, action: "web_search",
      args: { query: "official company homepage and address", purpose: "disprove the current executive role" },
      execution: "success", observation: "Search completed", urls: ["https://independent.example/results"],
      findingCount: 0, useful: false, informationGain: 0.2, findingNames: [], findingRoles: [],
    }];
    expect(evaluateResearchTerminal(sample, "target").reasons).toContain("required_falsification_not_satisfied");
  });

  it("does not count a failed nested falsification query hidden by a successful sibling", () => {
    const sample = context(2);
    sample.recentActions = [{
      turn: 7, action: "parallel_web_search",
      args: {
        searches: [
          { query: "find evidence that could disprove the current executive role", provider: "serper" },
          { query: "official company homepage", provider: "serper" },
        ],
        searchOutcomes: [
          { query: "find evidence that could disprove the current executive role", status: "error", urls: [] },
          { query: "official company homepage", status: "success", urls: ["https://independent.example/results"] },
        ],
      },
      execution: "success", observation: "One sibling query returned material", urls: ["https://independent.example/results"],
      findingCount: 0, useful: false, informationGain: 0.2, findingNames: [], findingRoles: [],
    }];
    expect(evaluateResearchTerminal(sample, "target").reasons).toContain("required_falsification_not_satisfied");
  });


  it("does not count a passage as an exact binding when spanBound is false", () => {
    const sample = context(2, true);
    sample.atomicEvidence[0]!.spanBound = false;
    const result = evaluateResearchTerminal(sample, "target");
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain("exact_source_span_binding_incomplete");
    expect(result.metrics.exactSpanBindings).toBe(2);
  });

  it("does not count identity-only or value-only passages as exact claim bindings", () => {
    const sample = context(2, true);
    sample.atomicEvidence[0]!.spanBindingKind = "identity";
    sample.atomicEvidence[1]!.spanBindingKind = "value";
    const result = evaluateResearchTerminal(sample, "target");
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain("exact_source_span_binding_incomplete");
    expect(result.metrics.exactSpanBindings).toBe(1);
  });


  it("still blocks terminal admission when lineage resolves to one source unit", () => {
    const result = evaluateResearchTerminal(context(1), "target");
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain("independent_source_units_below_2");
  });
});
