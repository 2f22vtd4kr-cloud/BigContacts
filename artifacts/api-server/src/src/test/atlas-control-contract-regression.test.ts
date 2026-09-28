import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const controlSource = readFileSync(resolve(process.cwd(), "src/src/lib/atlas-control-decision.ts"), "utf8");
const bossSource = readFileSync(resolve(process.cwd(), "src/src/lib/case-bureau.ts"), "utf8");

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
    expect(controlSource).toContain("ALLOWED_ACTIONS.has(rightDecision as AtlasControlAction)");
    expect(controlSource).toContain("requestedConfidence !== null");
    expect(controlSource).toContain('reason: "Gemini returned an invalid Atlas control action; fail-closed."');
  });
});
