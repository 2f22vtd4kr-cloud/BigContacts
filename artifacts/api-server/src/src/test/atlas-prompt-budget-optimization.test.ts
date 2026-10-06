import { describe, expect, it } from "vitest";
import {
  buildAtlasBossControlPrompt,
  buildAtlasRightHandControlPrompt,
  buildAtlasControlState,
  ATLAS_BOSS_CONTROL_PROMPT_BUDGET,
  ATLAS_RIGHT_HAND_PROMPT_BUDGET,
} from "../lib/atlas-control-decision";
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
    expect(compact.length).toBeLessThanOrEqual(10_000);
    expect(compact).toContain("Candidate 25");
    expect(compact).toContain("LATE_NEGATIVE_FINDING");
    expect(compact).toContain('"promotionDecision":"reject"');
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
