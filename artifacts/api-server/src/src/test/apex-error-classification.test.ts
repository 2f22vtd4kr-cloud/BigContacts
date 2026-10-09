import { describe, expect, it } from "vitest";
import { classifyApexError, isApexUserError } from "../../../../apex-finder/src/lib/apex-errors";

describe("Apex user-facing provider error classification", () => {
  it("accepts only complete, render-safe user error payloads", () => {
    expect(isApexUserError({
      code: "EXAMPLE", severity: "warning", title: "Example", message: "Message",
      why: "Reason", nextSteps: ["Retry"], retryable: true,
    })).toBe(true);
    expect(isApexUserError({ severity: "unknown", title: "Broken" })).toBe(false);
    expect(isApexUserError("server supplied a string")).toBe(false);
    expect(isApexUserError(null)).toBe(false);
  });

  it("classifies a confirmed Gemini service outage as degraded", () => {
    const error = classifyApexError("Gemini returned HTTP 503: service unavailable", 503);
    expect(error.code).toBe("GEMINI_BOSS_UNAVAILABLE");
    expect(error.provider).toBe("Gemini");
  });

  it("does not mislabel a missing Gemini credential as an outage", () => {
    const error = classifyApexError("Gemini Boss API key missing", 503);
    expect(error.code).toBe("MISSING_CREDENTIAL");
    expect(error.retryable).toBe(false);
  });

  it("keeps Gemini authentication failures actionable", () => {
    expect(classifyApexError("Gemini Boss unauthorized", 401).code).toBe("AUTH_REQUIRED");
    expect(classifyApexError("Gemini Boss forbidden", 403).code).toBe("AUTH_REQUIRED");
  });

  it("keeps Gemini quota failures in the rate-limit category", () => {
    expect(classifyApexError("Gemini Boss quota exceeded", 429).code).toBe("PROVIDER_RATE_LIMIT");
  });

  it("keeps Gemini timeouts in the timeout category", () => {
    expect(classifyApexError("Gemini Boss request timed out", 504).code).toBe("PROVIDER_TIMEOUT");
  });
});
