import { describe, expect, it } from "vitest";
import {
  buildAtlasBossControlPrompt,
  buildAtlasRightHandControlPrompt,
  ATLAS_BOSS_CONTROL_PROMPT_BUDGET,
  ATLAS_RIGHT_HAND_PROMPT_BUDGET,
} from "../lib/atlas-control-decision";
import { renderAtlasCapabilityGuidanceCompact, renderAtlasCapabilityGuidance } from "../lib/atlas-capability-registry";
import { buildInvestigatorContext, getInvestigatorContextBudget } from "../lib/investigation-context-compaction";\nimport { buildStepPrompt } from "../lib/agentic-web-research-core";

describe("Apex Atlas prompt budget optimization", () => {
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
    expect(getInvestigatorContextBudget().maxChars).toBe(4_200);
    expect(context).toContain("Named Person");
    expect(context).toContain("RESEARCH FRONTIER");
  });

  it("bounds the complete Investigator message envelope, including the stable system prompt", () => {
    const prompt = buildStepPrompt({
      targetName: "Named Person",
      objective: "Resolve identity and public contact routes.",
      history: Array.from({ length: 50 }, (_, i) => "history " + i + " ".repeat(400)),
      trajectoryRecords: Array.from({ length: 40 }, (_, i) => ({
        turn: i + 1, action: "visit", execution: "success",
        observedUrls: ["https://source-" + i + ".example/page"], observation: "observation ".repeat(800), findings: [],
      })),
      lastObservation: "latest ".repeat(2_000),
      findings: [],
      intelligenceContext: "intelligence ".repeat(2_000),
      mode: "target",
    });
    const systemInstruction = "Return one JSON action object only.";
    expect(prompt.length + systemInstruction.length).toBeLessThanOrEqual(9_000 + 200);
    expect(prompt.length).toBeLessThanOrEqual(9_000);
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
