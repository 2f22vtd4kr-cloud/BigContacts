import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateAtlasBossControl, validateAtlasRightHandControl } from "../lib/atlas-control-decision";

const controlSource = readFileSync(resolve(process.cwd(), "src/src/lib/atlas-control-decision.ts"), "utf8");
const bossSource = readFileSync(resolve(process.cwd(), "src/src/lib/groq-boss.ts"), "utf8");
const rightHandSource = readFileSync(resolve(process.cwd(), "src/src/lib/mistral-right-hand-reasoning.ts"), "utf8");

describe("Atlas control-plane contract regression", () => {
  it("requires strict structured schemas at both canonical control boundaries", () => {
    expect(controlSource).toContain("ATLAS_RIGHT_HAND_CONTROL_RESPONSE_FORMAT");
    expect(controlSource).toContain("ATLAS_BOSS_CONTROL_RESPONSE_FORMAT");
    expect(controlSource).toContain("runMistralRightHandFreeJson(");
    expect(controlSource).toContain("generateGroqBossText(selection, prompt, { responseFormat: ATLAS_BOSS_CONTROL_RESPONSE_FORMAT");
    expect(controlSource).toContain('required: ["decision", "reason", "direction", "confidence"]');
    expect(controlSource).toContain('required: ["action", "candidateName", "direction", "reason", "confidence"]');
    expect(controlSource).toContain("additionalProperties: false");
    expect(rightHandSource).toContain("response_format:responseFormat(format)");
    expect(rightHandSource).toContain('type:"json_schema"');
    expect(rightHandSource).toContain("strict:true");
    expect(bossSource).toContain("responseFormat");
  });

  it("keeps local validation after provider structured-output compatibility handling", () => {
    expect(controlSource).toContain("const rightHandContractValid =");
    expect(controlSource).toContain("const bossContractValid =");
    expect(controlSource).toContain("validateAtlasRightHandControl(rightParsed)");
    expect(controlSource).toContain("validateAtlasBossControl(parsed)");
    expect(controlSource).toContain("Mistral Right-hand");
    expect(controlSource).toContain("Groq Boss");
    expect(controlSource).toContain("Groq Boss owns Atlas control decisions");
    expect(controlSource).toContain("Mistral Right-hand provides independent oversight");
    expect(rightHandSource).toContain("MAX_429_RETRIES_PER_MODEL");
    expect(rightHandSource).toContain("MAX_503_RETRIES_PER_MODEL");
    expect(rightHandSource).toContain("clearTimeout(timer);");
    expect(rightHandSource).toContain("bounded control-plane budget");
    expect(rightHandSource).toContain("MISTRAL_RIGHT_HAND_API_KEY");
    expect(rightHandSource).not.toContain("GEMINI_CHAT_API_BASE");
    expect(rightHandSource).not.toContain("generativelanguage.googleapis.com");
    expect(controlSource).not.toContain("Gemini control decision");
    expect(controlSource).not.toContain("Gemini is Boss");
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
