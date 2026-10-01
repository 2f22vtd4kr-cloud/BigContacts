import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateAtlasBossControl, validateAtlasRightHandControl } from "../lib/atlas-control-decision";

const controlSource = readFileSync(resolve(process.cwd(), "src/src/lib/atlas-control-decision.ts"), "utf8");
const bossSource = readFileSync(resolve(process.cwd(), "src/src/lib/case-bureau.ts"), "utf8");
const rightHandSource = readFileSync(resolve(process.cwd(), "src/src/lib/gemini-right-hand-reasoning.ts"), "utf8");

describe("Atlas control-plane contract regression", () => {
  it("requires strict structured schemas at both Gemini control boundaries", () => {
    expect(controlSource).toContain("ATLAS_RIGHT_HAND_CONTROL_RESPONSE_FORMAT");
    expect(bossSource).toContain("GEMINI_BOSS_PLAN_RESPONSE_FORMAT");
    expect(bossSource).toContain("generateGeminiBossText(selection, planPrompt, { responseFormat: GEMINI_BOSS_PLAN_RESPONSE_FORMAT");
    expect(controlSource).toContain("ATLAS_BOSS_CONTROL_RESPONSE_FORMAT");
    expect(controlSource).toContain('required: ["decision", "reason", "direction", "confidence"]');
    expect(controlSource).toContain('required: ["action", "candidateName", "direction", "reason", "confidence"]');
    expect(controlSource).toContain("additionalProperties: false");
    expect(bossSource).toContain(`required: ["outcome", "actionId", "decision", "reason", "investigatorPrompt", "investigatorLlm", "restrictions", "tools", "evidenceRequirements", "confidence", "progressAssessment", "reprioritize", "suggestedScope", "rightHandDisposition", "rightHandNote"]`);
    expect(bossSource).toContain("additionalProperties: false");
    expect(controlSource).toContain("runGeminiRightHandFreeJson(");
    expect(controlSource).toContain("ATLAS_RIGHT_HAND_CONTROL_RESPONSE_FORMAT).catch");
    expect(controlSource).toContain("generateGeminiBossText(selection, prompt, { responseFormat: ATLAS_BOSS_CONTROL_RESPONSE_FORMAT");
  });

  it("keeps local validation after provider structured-output compatibility fallback", () => {
    expect(controlSource).toContain("const rightHandContractValid =");
    expect(controlSource).toContain("const bossContractValid =");
    expect(controlSource).toContain("validateAtlasRightHandControl(rightParsed)");
    expect(controlSource).toContain("validateAtlasBossControl(parsed)");
    expect(rightHandSource).toContain("rateLimitRetryDelayMs");
    expect(rightHandSource).toContain("phase: \"rate_limit_backoff\"");
    expect(rightHandSource).toContain("if (response.status === 429)");
    expect(rightHandSource).toContain("const resolvedChain = await resolveModelChain(modelScope, entry.key);");
    expect(rightHandSource).toContain("for (const model of resolvedChain.slice(0, MAX_MODEL_ATTEMPTS))");
    expect(rightHandSource).toContain("gemini-model-pool");
    expect(rightHandSource).toContain("gemini-3.5-flash-lite");
    expect(rightHandSource).toContain("gemini-3.8-flash");
    expect(rightHandSource).toContain("chooseAvailableGeminiControlModels");
    expect(rightHandSource).toContain("GEMINI_CHAT_API_BASE");
    expect(rightHandSource).toContain("/v1beta/models");
    expect(rightHandSource).not.toContain("GEMINI_RIGHT_HAND_MODEL_CHAIN");
    expect(rightHandSource).not.toMatch(/GEMINI_RIGHT_HAND_FALLBACK_MODELS\s*=\s*\[\s*["']gemini-/i);
    expect(rightHandSource).toContain("No Groq/Mistral substitution is permitted here.");
    expect(rightHandSource).toContain("Never browse or act as Investigator");
    expect(controlSource).toContain("INVESTIGATOR TEXT REPORT");
    expect(rightHandSource).toContain("MAX_RATE_LIMIT_RETRIES = 1");
    expect(rightHandSource).toContain("clearTimeout(timer);");
    expect(rightHandSource).toContain("const retryController = new AbortController();");
    expect(rightHandSource).toContain("const retryAttemptTimeoutMs = Math.min(");
    expect(rightHandSource).toContain("const retryTimer = setTimeout(() => retryController.abort(), retryAttemptTimeoutMs);");
    expect(rightHandSource).toContain("clearTimeout(retryTimer);");
    expect(rightHandSource).toContain("bounded same-model recovery");
    expect(controlSource).toContain('reason: "Gemini returned an invalid Atlas control action; fail-closed."');
  });
  it("replays valid and malformed provider contracts through the real validators", () => {
    expect(validateAtlasRightHandControl({
      decision: "continue_discovery",
      reason: "The current evidence is insufficient.",
      direction: "Search a new lane.",
      confidence: 0.7,
    })).toBe(true);
    expect(validateAtlasRightHandControl({
      decision: "stop",
      reason: "The case is exhausted.",
      direction: null,
      confidence: 0.9,
    })).toBe(true);
    expect(validateAtlasRightHandControl({
      decision: "continue discovery",
      reason: "Invalid non-contract action label.",
      direction: "Search.",
      confidence: 0.5,
    })).toBe(false);
    expect(validateAtlasRightHandControl({
      decision: "stop",
      reason: "Missing confidence.",
      direction: null,
    })).toBe(false);

    expect(validateAtlasBossControl({
      action: "research_candidate",
      candidateName: "Example Person",
      direction: "Verify the role.",
      reason: "Candidate is admitted.",
      confidence: 0.8,
    })).toBe(true);
    expect(validateAtlasBossControl({
      action: "stop",
      candidateName: null,
      direction: null,
      reason: "No further justified work.",
      confidence: 0.9,
    })).toBe(true);
    expect(validateAtlasBossControl({
      action: "invented_action",
      candidateName: null,
      direction: null,
      reason: "Invalid.",
      confidence: 0.9,
    })).toBe(false);
  });

});
