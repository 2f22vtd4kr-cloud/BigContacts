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

  it("classifies a confirmed Groq Boss service outage as degraded", () => {
    const error = classifyApexError("Groq Boss returned HTTP 503: service unavailable", 503);
    expect(error.code).toBe("GROQ_BOSS_UNAVAILABLE");
    expect(error.provider).toBe("Groq");
  });

  it("does not mislabel a missing Groq Boss credential as an outage", () => {
    const error = classifyApexError("Groq Boss API key missing", 503);
    expect(error.code).toBe("MISSING_CREDENTIAL");
    expect(error.retryable).toBe(false);
  });

  it("keeps Groq Boss authentication failures actionable", () => {
    expect(classifyApexError("Groq Boss unauthorized", 401).code).toBe("AUTH_REQUIRED");
    expect(classifyApexError("Groq Boss forbidden", 403).code).toBe("AUTH_REQUIRED");
  });

  it("keeps Groq Boss quota failures in the rate-limit category", () => {
    expect(classifyApexError("Groq Boss quota exceeded", 429).code).toBe("PROVIDER_RATE_LIMIT");
  });

  it("keeps Groq Boss timeouts in the timeout category", () => {
    expect(classifyApexError("Groq Boss request timed out", 504).code).toBe("PROVIDER_TIMEOUT");
  });

  it("does not mislabel a Groq Investigator outage as a Groq Boss outage", () => {
    const error = classifyApexError("Groq Investigator returned HTTP 503: service unavailable", 503);
    expect(error.code).toBe("SERVICE_FAILURE");
    expect(error.provider).not.toBe("Groq");
  });

  it("recognizes exhausted bounded Groq Boss attempts without an HTTP status", () => {
    const error = classifyApexError("Groq Boss unavailable after bounded model/key attempts.", undefined);
    expect(error.code).toBe("GROQ_BOSS_UNAVAILABLE");
    expect(error.provider).toBe("Groq");
  });
});
