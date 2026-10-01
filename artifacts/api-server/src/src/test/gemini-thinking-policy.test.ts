import { describe, expect, it } from "vitest";
import { selectGeminiThinkingLevel } from "../lib/gemini-thinking-policy";

describe("adaptive Gemini thinking", () => {
  it("uses high effort for high-risk identity conflicts", () => {
    expect(selectGeminiThinkingLevel("gemini-3.8-flash", { identityAmbiguity: 0.9, falsificationRequired: true })).toBe("high");
  });
  it("keeps routine lite oversight inexpensive", () => {
    expect(selectGeminiThinkingLevel("gemini-3.5-flash-lite", { routine: true })).toBe("minimal");
  });
  it("uses medium effort for ordinary modern Flash research", () => {
    expect(selectGeminiThinkingLevel("gemini-3.8-flash", {})).toBe("medium");
  });
});
