import { describe, expect, it } from "vitest";
import {
  buildAtlasBossControlPrompt,
  buildAtlasRightHandControlPrompt,
  buildAtlasControlState,
  ATLAS_BOSS_CONTROL_PROMPT_BUDGET,
  ATLAS_RIGHT_HAND_PROMPT_BUDGET,
} from "../lib/atlas-control-decision";
import { buildDiscoveryProgressSnapshot } from "../lib/case-bureau";
import { renderAtlasCapabilityGuidanceCompact, renderAtlasCapabilityGuidance } from "../lib/atlas-capability-registry";
import { boundInvestigatorPromptSection, buildInvestigatorContext, getInvestigatorContextBudget } from "../lib/investigation-context-compaction";
import { renderIntelligenceContextCompact } from "../lib/research-intelligence-engine";

describe("Apex Atlas prompt budget optimization", () => {
  it("does not silently re-cap the assembled Investigator prompt below the provider ceiling", () => {
    const prompt = boundInvestigatorPromptSection("P".repeat(18_000), 20_000);
    expect(prompt.length).toBe(18_000);
    expect(prompt).not.toContain("EMERGENCY REQUEST-SIZE COMPACTION");
  });

  it("keeps the per-turn capability contract materially smaller than the full registry", () => {
    const full = renderAtlasCapabilityGuidance();
    const compact = renderAtlasCapabilityGuidanceCompact();
    expect(compact.length).toBeLessThan(full.length * 0.65);
    expect(compact).toContain("search.serper");
    expect(compact).toContain("registry.search");
    expect(compact).toContain("osint.spiderfoot");
  });

  it("keeps Investigator working context under the tighter default without losing frontier anchors", () => {
    const records = Array.from({ length: 40 }, (_, i) => ({
      turn: i + 1,
      action: i % 2 ? "visit" : "web_search",
      execution: "success",
      observedUrls: [`https://source-${i + 1}.example/page`],
      observation: "long observation ".repeat(600),
      findings: [{ vectorType: "website", value: `https://target-${i + 1}.example`, sourceUrls: [`https://source-${i + 1}.example/page`], personName: i === 39 ? "Named Person" : null, role: null, scope: "candidate", note: "evidence" }],
    }));
    const context = buildInvestigatorContext({
      targetName: "Named Person",
      objective: "Resolve identity and a public contact route.",
      trajectoryRecords: records,
      lastObservation: "Latest evidence ".repeat(1_000),
      findings: records.at(-1)!.findings,
    });
    expect(context.length).toBeLessThanOrEqual(getInvestigatorContextBudget().maxChars);
    expect(getInvestigatorContextBudget().maxChars).toBe(10_000);
    expect(context).toContain("Named Person");
    expect(context).toContain("RESEARCH FRONTIER");
  });

  it("preserves decision-critical intelligence categories inside the compact projection", () => {
    const compact = renderIntelligenceContextCompact({
      objective: "Resolve the target identity and public contact route.",
      facts: [{ claim: "POSITIVE_IDENTITY_ANCHOR" }],
      hypotheses: [{ entity: "LEADING_PERSON_IDENTITY", score: 0.82, status: "leading", supportingEvidenceIds: ["ev-1"], contradictingEvidenceIds: [], missingDiscriminators: ["confirm official role"] }],
      contradictions: [{ claim: "CONTRADICTORY_IDENTITY_SIGNAL" }],
      negativeFindings: ["NEGATIVE_SOURCE_RESULT"],
      openQuestions: ["UNRESOLVED_DISCRIMINATOR"],
      contacts: [],
      recentActions: [],
      providerDisagreements: [{ query: "identity query", providers: ["serper", "tavily"], sourceHosts: ["a.example", "b.example"] }],
      frontier: { unresolvedPressure: 0.8 },
      falsification: { missingDiscriminators: ["identity discriminator"] },
      stoppingAssessment: { recommendation: "continue" },
      sourceIndependence: { score: 0.5 },
      repeatedSourceFamilies: [],
      independentSourceUnits: 2,
    } as any, 4_000);
    expect(compact.length).toBeLessThanOrEqual(4_000);
    expect(compact).toContain("IDENTITY HYPOTHESES:");
    expect(compact).toContain("LEADING_PERSON_IDENTITY");
    expect(compact).toContain("CONTRADICTIONS:");
    expect(compact).toContain("CONTRADICTORY_IDENTITY_SIGNAL");
    expect(compact).toContain("NEGATIVE FINDINGS:");
    expect(compact).toContain("NEGATIVE_SOURCE_RESULT");
    expect(compact).toContain("OPEN QUESTIONS:");
    expect(compact).toContain("UNRESOLVED_DISCRIMINATOR");
    expect(compact).toContain("PROVIDER DISAGREEMENTS:");
  });

  it("keeps admitted candidates and bounded finding state visible to the control plane", () => {
    const compact = buildAtlasControlState({
      objective: "Resolve candidates and identify the strongest attributable person.",
      discoveryStatus: "active",
      admittedCandidates: Array.from({ length: 25 }, (_, i) => ({
        name: "Candidate " + (i + 1),
        role: "operator",
        sourceUrls: ["https://source.example/" + (i + 1)],
      })),
      discoveryTrajectory: [],
      discoveryFindings: Array.from({ length: 8 }, (_, i) => ({
        personName: "Candidate " + (i + 1),
        role: "operator",
        scope: "candidate",
        promotionDecision: i === 7 ? "reject" : "promote",
        sourceUrls: ["https://source.example/" + (i + 1)],
        note: i === 7 ? "LATE_NEGATIVE_FINDING" : "supported finding",
      })),
      priorAction: "continue_discovery",
      priorCandidate: null,
    });
    expect(compact.length).toBeLessThanOrEqual(6_500);
    expect(compact).toContain("Candidate 25");
    expect(compact).toContain("LATE_NEGATIVE_FINDING");
    expect(compact).toContain('"promotionDecision":"reject"');
  });

  it("reserves Investigator context for the frontier instead of exhausting it on recent history", () => {
    const context = buildInvestigatorContext({
      targetName: "Decision Target",
      objective: "Resolve identity",
      trajectoryRecords: Array.from({ length: 20 }, (_, i) => ({
        turn: i + 1,
        model: "groq",
        action: "visit",
        execution: "success",
        observation: "LONG_OBSERVATION_" + (i + 1) + " ".repeat(1_700),
        observedUrls: ["https://source.example/" + (i + 1)],
        findings: [],
      })),
      lastObservation: "LATEST_DECISION_SIGNAL",
      findings: [{ value: "CURRENT_FINDING", sourceUrls: ["https://source.example/finding"], vectorType: "other" }],
      mode: "target",
    });
    expect(context.length).toBeLessThanOrEqual(getInvestigatorContextBudget().maxChars);
    expect(context).toContain("RESEARCH FRONTIER");
    expect(context).toContain("LATEST_DECISION_SIGNAL");
    expect(context).toContain("CURRENT_FINDING");
  });

  it("enforces an aggregate Bureau snapshot budget while retaining newest findings", () => {
    const file = {
      humanBrief: { objective: "OBJECTIVE", motivation: "MOTIVATION", geography: "GLOBAL", exclusions: [] },
      bossPremise: "PREMISE",
      investigationRules: [],
      discoveredCandidates: Array.from({ length: 30 }, (_, i) => ({
        name: "Candidate " + (i + 1),
        type: "person",
        sourceUrls: Array.from({ length: 8 }, (_, n) => "https://source.example/" + i + "/" + n),
        contactEvidence: Array.from({ length: 8 }, (_, n) => ({
          vectorType: "other", value: "CONTACT_" + i + "_" + n, scope: "candidate",
          personName: "Candidate " + (i + 1), role: "role",
          sourceUrls: ["https://source.example/contact/" + i + "/" + n], note: "N".repeat(300),
        })),
      })),
      currentProgress: { reportCount: 30, completedLanes: [], openQuestions: ["OPEN"], lastReviewedBy: null, refreshedAt: null },
      investigatorReports: Array.from({ length: 20 }, (_, i) => ({
        id: String(i), lane: "groq-web", provider: "groq", status: "completed", iteration: i,
        summary: "SUMMARY_" + i + " ".repeat(900),
        findings: Array.from({ length: 10 }, (_, n) => "FINDING_" + i + "_" + n + " ".repeat(300)),
        candidateNames: ["Candidate " + (i + 1)],
        sourceUrls: Array.from({ length: 10 }, (_, n) => "https://report.example/" + i + "/" + n),
        nextQuestions: Array.from({ length: 10 }, (_, n) => "QUESTION_" + i + "_" + n + " ".repeat(200)),
        error: null, createdAt: new Date().toISOString(),
      })),
      decisionLog: [],
    } as any;
    const snapshot = buildDiscoveryProgressSnapshot(file);
    expect(snapshot.length).toBeLessThanOrEqual(12_000);
    expect(snapshot).toContain("Candidate 30");
    expect(snapshot).toContain("FINDING_19_9");
    expect(() => JSON.parse(snapshot)).not.toThrow();
  });

  it("does not duplicate a giant Investigator report into the control prompt budget", () => {
    const report = JSON.stringify({
      provider: "groq-investigator-1",
      status: "completed",
      searches: 12,
      visits: 9,
      findings: Array.from({ length: 50 }, (_, i) => ({
        vectorType: "website",
        value: "https://example.com/" + i + " ".repeat(500),
        personName: "Named Person",
        role: "director",
        sourceUrls: ["https://source.example/" + i],
      })),
      modelFindings: Array.from({ length: 30 }, (_, i) => ({ value: "finding-" + i + " ".repeat(300) })),
      targetInvestigation: { observation: "X".repeat(20_000) },
      openQuestions: Array.from({ length: 30 }, (_, i) => "Question " + i + " ".repeat(300)),
    });
    const state = JSON.stringify({
      findings: Array.from({ length: 40 }, (_, i) => ({ personName: "Named Person", sourceUrls: ["https://source.example/" + i] })),
      trajectory: Array.from({ length: 40 }, (_, i) => ({ turn: i + 1, action: "visit", observation: "Y".repeat(1_000), observedUrls: ["https://source.example/" + i] })),
    });
    const right = buildAtlasRightHandControlPrompt({ investigatorReport: report, compactState: state });
    const boss = buildAtlasBossControlPrompt({
      investigatorReport: report,
      compactState: state,
      rightHand: { status: "completed", decision: "continue_discovery", reason: "new discriminator", direction: "test identity", confidence: 0.8, model: "openai/gpt-oss-120b", error: null },
    });
    expect(right.length).toBeLessThanOrEqual(ATLAS_RIGHT_HAND_PROMPT_BUDGET);
    expect(boss.length).toBeLessThanOrEqual(ATLAS_BOSS_CONTROL_PROMPT_BUDGET);
    expect(right.length).toBeLessThan(12_000);
    expect(boss.length).toBeLessThan(12_000);
  });
});
