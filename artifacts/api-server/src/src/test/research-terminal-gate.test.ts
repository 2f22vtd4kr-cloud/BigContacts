import { describe, expect, it } from "vitest";
import { evaluateResearchTerminal } from "../lib/research-terminal-gate";
import type { IntelligenceContext } from "../lib/research-intelligence-engine";

function context(independentSourceUnits: number): IntelligenceContext {
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
    recentActions: [],
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
      { evidenceId: "e1", kind: "finding", claimId: "c1", claim: "claim 1", sourceUrl: "https://same.example/a", sourceHost: "same.example", sourceClass: "OFFICIAL_COMPANY", passage: "claim 1", attribution: "Test Target" },
      { evidenceId: "e2", kind: "finding", claimId: "c2", claim: "claim 2", sourceUrl: "https://same.example/b", sourceHost: "same.example", sourceClass: "OFFICIAL_COMPANY", passage: "claim 2", attribution: "Test Target" },
      { evidenceId: "e3", kind: "finding", claimId: "c3", claim: "claim 3", sourceUrl: "https://same.example/c", sourceHost: "same.example", sourceClass: "OFFICIAL_COMPANY", passage: "claim 3", attribution: "Test Target" },
    ],
    actionYield: [],
    sourceLineage: [],
    independentSourceUnits,
    falsification: {
      required: true,
      priority: 0.2,
      rationale: [],
      recommendedDiscriminators: [],
    },
    researchQuestions: [],
    stoppingAssessment: { evidenceCoverage: 1, unresolvedQuestions: 0, recommendation: "review" },
  };
}

describe("research terminal gate", () => {
  it("uses lineage-aware independent source units rather than raw host count", () => {
    const result = evaluateResearchTerminal(context(2), "target");
    expect(result.allowed).toBe(true);
    expect(result.metrics.independentSourceUnits).toBe(2);
  });

  it("still blocks terminal admission when lineage resolves to one source unit", () => {
    const result = evaluateResearchTerminal(context(1), "target");
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain("independent_source_units_below_2");
  });
});
