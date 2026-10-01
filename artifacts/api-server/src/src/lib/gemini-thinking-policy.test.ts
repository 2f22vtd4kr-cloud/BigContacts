import { describe, expect, it } from "vitest";
import { selectGeminiThinkingLevel, thinkingLevelForRole } from "./gemini-thinking-policy";

describe("Gemini adaptive thinking policy", () => {
  it("keeps routine Flash-Lite oversight minimal", () => {
    expect(selectGeminiThinkingLevel("gemini-3.5-flash-lite", { routine: true })).toBe("minimal");
    expect(thinkingLevelForRole("right_hand", "gemini-3.5-flash-lite")).toBe("minimal");
  });

  it("raises standard Flash reasoning only when epistemic risk warrants it", () => {
    expect(selectGeminiThinkingLevel("gemini-3.7-flash", { routine: true })).toBe("low");
    expect(selectGeminiThinkingLevel("gemini-3.7-flash", { contradictionPressure: 0.5 })).toBe("medium");
    expect(selectGeminiThinkingLevel("gemini-3.7-flash", { identityAmbiguity: 0.85 })).toBe("high");
  });

  it("forces high reasoning for falsification and terminal decisions", () => {
    expect(selectGeminiThinkingLevel("gemini-3.5-flash-lite", { falsificationRequired: true })).toBe("high");
    expect(selectGeminiThinkingLevel("gemini-3.5-flash-lite", { terminalDecision: true })).toBe("high");
  });

  it("defaults Right-hand to routine policy while allowing explicit risk escalation", () => {
    expect(thinkingLevelForRole("right_hand", "gemini-3.6-flash")).toBe("low");
    expect(thinkingLevelForRole("right_hand", "gemini-3.6-flash", { contradictionPressure: 0.7 })).toBe("high");
  });
});
