import { describe, expect, it } from "vitest";
import { runGeminiDeepResearchEscalation } from "./gemini-deep-research-escalation";

describe("Gemini Deep Research escalation", () => {
  it("remains disabled in the free-tier baseline", async () => {
    const previous = process.env.APEX_ENABLE_GEMINI_DEEP_RESEARCH;
    delete process.env.APEX_ENABLE_GEMINI_DEEP_RESEARCH;
    const result = await runGeminiDeepResearchEscalation({ objective: "verify one unresolved claim", context: "test" });
    expect(result.status).toBe("unavailable");
    expect(result.interactionId).toBeNull();
    if (previous) process.env.APEX_ENABLE_GEMINI_DEEP_RESEARCH = previous;
  });
});
