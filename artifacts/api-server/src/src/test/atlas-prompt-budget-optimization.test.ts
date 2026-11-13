import { describe, expect, it } from "vitest";
import {
  buildAtlasBossControlPrompt,
  buildAtlasRightHandControlPrompt,
  ATLAS_BOSS_CONTROL_PROMPT_BUDGET,
  ATLAS_RIGHT_HAND_PROMPT_BUDGET,
} from "../lib/atlas-control-decision";
import { renderAtlasCapabilityGuidanceCompact, renderAtlasCapabilityGuidance } from "../lib/atlas-capability-registry";
import { buildInvestigatorContext, getInvestigatorContextBudget } from "../lib/investigation-context-compaction";
import { buildGroqInvestigatorRequestBody, buildStepPrompt, discoveryPivotScopeKey } from "../lib/agentic-web-research-core";
import { apexInvestigatorSystemCore } from "../lib/apex-bureau-orientation";
import { buildApexAtlasBossPlanPrompt, getApexAtlasBossPlanPromptMaxChars } from "../lib/case-bureau-prompt";

describe("Apex Atlas prompt budget optimization", () => {
  it("keeps the per-turn capability contract materially smaller than the full registry", () => {
    const full = renderAtlasCapabilityGuidance();
    const compact = renderAtlasCapabilityGuidanceCompact();
    // The compact registry is intentionally bounded below the full registry; keep a small tolerance for registry-label growth.
    expect(compact.length).toBeLessThan(full.length * 0.651);
    expect(compact).toContain("web.search (web_search): providers=serper|tavily|exa");
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

  it("keeps both ends of a live-sized Boss-compacted latest observation through both prompt assembly paths", () => {
    const observation = "LATEST_OBSERVATION_START " + "x".repeat(1_005 - "LATEST_OBSERVATION_START ".length - "LATEST_OBSERVATION_END".length) + "LATEST_OBSERVATION_END";
    expect(observation.length).toBeGreaterThan(900);
    expect(observation.length).toBeLessThan(1_200);
    const promptInput = {
      targetName: "",
      objective: "Identify real operating companies and their current business decision-makers from public professional evidence.",
      history: [],
      trajectoryRecords: [{
        turn: 8,
        model: "groq:test",
        action: "web_search",
        pivotScopeKey: discoveryPivotScopeKey("Identify real operating companies and their current business decision-makers from public professional evidence.") ?? undefined,
        args: { query: "Joe Aguilar LinkedIn" },
        execution: "success" as const,
        observedUrls: ["https://source.example/search-result"],
        leadUrls: [
          "https://source.example/lead-1",
          "https://source.example/lead-2",
          "https://source.example/lead-3",
          "https://source.example/lead-4",
        ],
        observation,
        findings: [],
      }],
      lastObservation: observation,
      findings: [],
      mode: "discovery" as const,
    };
    const promptWithMemory = buildStepPrompt({
      ...promptInput,
      aiCompactedHistoricalContext: "Prior Boss-generated memory: the existing fetched source did not establish a decision-maker role.",
      aiCompactedHistoricalThroughTurn: 7,
    });
    const promptWithoutMemory = buildStepPrompt(promptInput);

    for (const prompt of [promptWithMemory, promptWithoutMemory]) {
      expect(prompt).toContain("LATEST_OBSERVATION_START");
      expect(prompt).toContain("LATEST_OBSERVATION_END");
      expect(prompt).toContain("https://source.example/search-result");
      expect(prompt).toContain("https://source.example/lead-1");
      expect(prompt).toContain("Identify real operating companies and their current business decision-makers");
      expect(prompt).toContain("Follow the active case objective and Boss-approved scope");
      expect(prompt).toContain("B2B requires fetched current role/company connection and professional route");
      expect(prompt).toContain("wealth requires sourced ownership/control/equity/investment and credible wealth potential");
      expect(prompt).not.toContain("people are the ultimate mission");
      expect(prompt).not.toContain("People—not companies or executive prestige");
      expect(prompt).not.toContain("owner/operator, ownership/investment or transaction signal");
      expect(prompt).not.toContain("Seek source-backed ownership/equity/control/investment clues during target research");
    }
  });

  it("keeps the full prompt when it exceeds the preferred provider request target", () => {
    const body = buildGroqInvestigatorRequestBody({
      model: "openai/gpt-oss-20b",
      prompt: "OVERSIZED DYNAMIC STATE ".repeat(2_000)
        + "\n\nOUTPUT CONTRACT: Return exactly ONE root JSON object, no prose. ALL REQUIRED TOP-LEVEL FIELDS: action, query, provider, url, email, username, domain, registry, thought, hypothesis, purpose, expectedInformationGain, locale, market, target, targetType, profile, searches, findings.",
      cognitiveTask: "identity_resolution",
    });
    const messages = body.messages as Array<{ role: string; content: string }>;
    const total = messages.reduce((sum, message) => sum + message.content.length, 0);
    const userMessage = messages.find((message) => message.role === "user")?.content ?? "";
    expect(total).toBeGreaterThan(8_400);
    expect(userMessage.length).toBeGreaterThan(6_800);
    expect(userMessage).toContain("OVERSIZED DYNAMIC STATE ".repeat(2_000));
    expect(userMessage).toContain("ALL REQUIRED TOP-LEVEL FIELDS: action, query, provider");
  });

  it("preserves the complete latest Investigator record above the preferred message target", () => {
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
    const systemInstruction = apexInvestigatorSystemCore() + "\nReturn one JSON action object only.";
    expect(prompt.length + systemInstruction.length).toBeGreaterThan(8_400);
    expect(prompt.length).toBeGreaterThan(8_400 - systemInstruction.length);
    expect(prompt).toMatch(/ALL REQUIRED TOP-LEVEL FIELDS: action,|Required fields: action,query,provider/);
    expect(prompt).toContain("PAGE FORMAT / RETRIEVAL LIMITS:");
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
    expect(prompt).toContain("You are Boss / Head Investigator of Apex Atlas (Groq).");
    expect(prompt).toContain("[APEX BOSS PLAN PROMPT BOUND:");
    expect(prompt).toContain("RETURN ONE JSON OBJECT ONLY");
    expect(prompt).toContain("Iteration: 42");
    expect(prompt).not.toContain("ignoredPayload");
  });

});
