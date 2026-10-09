import { describe, expect, it } from "vitest";
import {
  buildAtlasBossControlPrompt,
  buildAtlasRightHandControlPrompt,
  ATLAS_BOSS_CONTROL_PROMPT_BUDGET,
  ATLAS_RIGHT_HAND_PROMPT_BUDGET,
} from "../lib/atlas-control-decision";
import { renderAtlasCapabilityGuidanceCompact, renderAtlasCapabilityGuidance } from "../lib/atlas-capability-registry";
import { buildInvestigatorContext, getInvestigatorContextBudget } from "../lib/investigation-context-compaction";
import { buildGroqInvestigatorRequestBody, buildStepPrompt } from "../lib/agentic-web-research-core";
import { apexOrientationCompact } from "../lib/apex-bureau-orientation";
import { buildApexAtlasBossPlanPrompt, getApexAtlasBossPlanPromptMaxChars } from "../lib/case-bureau-prompt";

describe("Apex Atlas prompt budget optimization", () => {
  it("keeps the per-turn capability contract materially smaller than the full registry", () => {
    const full = renderAtlasCapabilityGuidance();
    const compact = renderAtlasCapabilityGuidanceCompact();
    // The compact registry is intentionally bounded below the full registry; keep a small tolerance for registry-label growth.
    expect(compact.length).toBeLessThan(full.length * 0.651);
    expect(compact).toContain("search.serper");
    expect(compact).toContain("registry.search");
    expect(compact).not.toContain("osint.spiderfoot");
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

  it("enforces the message envelope again at the provider request-body boundary", () => {
    const body = buildGroqInvestigatorRequestBody({
      model: "openai/gpt-oss-20b",
      prompt: "OVERSIZED DYNAMIC STATE ".repeat(2_000),
      cognitiveTask: "identity_resolution",
    });
    const messages = body.messages as Array<{ role: string; content: string }>;
    const total = messages.reduce((sum, message) => sum + message.content.length, 0);
    expect(total).toBeLessThanOrEqual(7_200);
    expect(messages.find((message) => message.role === "user")?.content.length).toBeLessThan(7_200);
  });

  it("bounds the complete Investigator message envelope, including the stable system prompt", () => {
    const prompt = buildStepPrompt({
      targetName: "Named Person",
      objective: "Resolve identity and public contact routes.",
      history: Array.from({ length: 50 }, (_, i) => "history " + i + " ".repeat(400)),
      trajectoryRecords: Array.from({ length: 40 }, (_, i) => ({
        turn: i + 1, model: "groq-test", action: "visit",
        args: { query: "long query ".repeat(50), purpose: "test context retention ".repeat(30), hypothesis: "test hypothesis ".repeat(30), expectedInformationGain: 0.7 },
        execution: "success",
        observedUrls: ["https://source-" + i + ".example/page"],
        observation: (i === 39 ? "LATEST_OBSERVATION_SENTINEL " : "") + "observation ".repeat(800),
        findings: [{ vectorType: "email", value: "latest-contact@example.test", personName: "Latest Person", role: "director", scope: "candidate", sourceUrls: ["https://source-" + i + ".example/page"], note: "grounded finding " + "detail ".repeat(40) }],
      })),
      lastObservation: "latest ".repeat(2_000),
      findings: [],
      intelligenceContext: "intelligence ".repeat(2_000),
      mode: "target",
    });
    const systemInstruction = apexOrientationCompact("dig_agent") + "\nReturn one JSON action object only.";
    expect(prompt.length + systemInstruction.length).toBeLessThanOrEqual(7_200);
    expect(prompt.length).toBeLessThanOrEqual(7_200 - systemInstruction.length);
    expect(prompt).toContain("ALL REQUIRED TOP-LEVEL FIELDS");
    expect(prompt).toContain("LATEST TRAJECTORY RECORD");
    expect(prompt).toContain("LATEST_OBSERVATION_SENTINEL");
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
    expect(right.length).toBeLessThanOrEqual(ATLAS_RIGHT_HAND_PROMPT_BUDGET);
    expect(boss.length).toBeLessThanOrEqual(ATLAS_BOSS_CONTROL_PROMPT_BUDGET);
  });
  it("bounds the complete Bureau Boss planning prompt without losing the decision contract", () => {
    const long = "X".repeat(2_000);
    const actionQueue = Array.from({ length: 100 }, (_, i) => ({
      id: "action-" + i,
      title: "Investigate lead " + i + " " + long,
      purpose: "Resolve an evidence gap " + long,
      specialistId: "investigator " + i,
      tools: [long, long, long],
      priority: i,
      status: "queued",
      rationale: "Prior evidence and next information gain " + long,
    }));
    const file = {
      target: {
        name: "Bounded Target " + long,
        type: "person",
        nationality: "US",
        knownDomains: Array.from({ length: 100 }, () => long),
      },
      hypotheses: Array.from({ length: 30 }, () => long),
      evidenceSummary: {
        discoveredPeople: Array.from({ length: 30 }, () => long),
        relatedOrganizations: Array.from({ length: 30 }, () => long),
        searchGaps: Array.from({ length: 30 }, () => long),
        negativeFindings: Array.from({ length: 30 }, () => long),
      },
      specialistRoster: Array.from({ length: 50 }, (_, i) => ({ id: "specialist-" + i + long, title: long, status: "ready" })),
      actionQueue,
      contactRoutes: Array.from({ length: 40 }, () => ({
        vectorType: "email",
        value: long,
        personName: long,
        role: long,
        relationship: long,
        state: "review_only",
        sourceUrls: [long, long, long],
      })),
      humanDirectives: Array.from({ length: 30 }, () => long),
      decisionLog: Array.from({ length: 30 }, (_, i) => ({ iteration: i, decision: long, reason: long, createdAt: "2026-10-09" })),
      rightHandAdvice: { provider: "groq", model: "test-model", status: "completed", actionId: "x", decision: long, reason: long, confidence: 0.8, error: null, createdAt: "2026-10-09", ignoredPayload: long.repeat(10) },
      bossPlan: { outcome: "proceed", actionId: "action-1", decision: long, progressAssessment: long, rightHandDisposition: "accept", rightHandNote: long },
      nextBestAction: { id: "next", title: long, purpose: long, specialistId: long, tools: [long], priority: 1, rationale: long },
      lastUpdatedBy: "test",
      researchDepth: undefined,
      noProgressStreak: 10,
    } as unknown as Parameters<typeof buildApexAtlasBossPlanPrompt>[0]["file"];

    const prompt = buildApexAtlasBossPlanPrompt({
      iteration: 42,
      rightHandAdvice: file.rightHandAdvice,
      file,
    });
    expect(prompt.length).toBeLessThanOrEqual(getApexAtlasBossPlanPromptMaxChars());
    expect(prompt).toContain("You are the Apex Atlas Boss.");
    expect(prompt).toContain("[APEX BOSS PLAN PROMPT BOUND:");
    expect(prompt).toContain("RETURN ONE JSON OBJECT ONLY");
    expect(prompt).toContain("Iteration: 42");
    expect(prompt).not.toContain("ignoredPayload");
  });

});
