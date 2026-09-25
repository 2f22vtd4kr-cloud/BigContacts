import { describe, expect, it } from "vitest";
import { classifyApexError } from "../lib/apex-user-errors";

describe("Apex user-facing error classification", () => {
  it("explains temporary Gemini Boss unavailability without suggesting role-breaking fallback", () => {
    const error = classifyApexError("Gemini Boss was unavailable after bounded same-role model fallback; no Groq/Mistral Investigator fallback is permitted.");
    expect(error.code).toBe("GEMINI_BOSS_UNAVAILABLE");
    expect(error.severity).toBe("degraded");
    expect(error.retryable).toBe(true);
    expect(error.nextSteps.join(" ")).not.toMatch(/use Groq|use Mistral/i);
  });

  it("treats provider limits as recoverable warnings", () => {
    const error = classifyApexError("provider returned HTTP 429 rate limit");
    expect(error.code).toBe("PROVIDER_RATE_LIMIT");
    expect(error.severity).toBe("warning");
    expect(error.retryable).toBe(true);
  });

  it("treats persistence failures as critical", () => {
    const error = classifyApexError("Postgres relation research_cases does not exist");
    expect(error.code).toBe("DATABASE_FAILURE");
    expect(error.severity).toBe("critical");
  });

  it("keeps insufficient evidence informational", () => {
    const error = classifyApexError("couldn't verify enough evidence");
    expect(error.code).toBe("INSUFFICIENT_EVIDENCE");
    expect(error.severity).toBe("info");
  });
});
