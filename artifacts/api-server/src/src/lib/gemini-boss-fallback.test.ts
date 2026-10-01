import { describe, expect, it } from "vitest";
import {
  formatGeminiBossAttemptSummary,
  type GeminiBossAttemptDiagnostic,
} from "./case-bureau";

describe("Gemini Boss fallback diagnostics", () => {
  it("preserves model/status/provider-code attribution in attempt order", () => {
    const attempts: GeminiBossAttemptDiagnostic[] = [
      {
        model: "gemini-3.8-flash",
        keyName: "GEMINI_API_KEY",
        httpStatus: 503,
        providerErrorCode: null,
        failureClass: "provider_unavailable",
      },
      {
        model: "gemini-3.5-flash",
        keyName: "GEMINI_API_KEY",
        httpStatus: 429,
        providerErrorCode: "rate_limit_exceeded",
        failureClass: "rate_limited",
      },
      {
        model: "gemini-3.8-flash",
        keyName: "GEMINI_API_KEY_1",
        httpStatus: 503,
        providerErrorCode: null,
        failureClass: "provider_unavailable",
      },
    ];

    expect(formatGeminiBossAttemptSummary(attempts)).toBe(
      "gemini-3.8-flash=HTTP 503, gemini-3.5-flash=HTTP 429 (rate_limit_exceeded), gemini-3.8-flash=HTTP 503",
    );
  });

  it("does not expose credential names in the formatted runtime summary", () => {
    const attempts: GeminiBossAttemptDiagnostic[] = [{
      model: "gemini-3.5-flash",
      keyName: "GEMINI_API_KEY_12",
      httpStatus: 503,
      providerErrorCode: null,
      failureClass: "provider_unavailable",
    }];

    const summary = formatGeminiBossAttemptSummary(attempts);
    expect(summary).toBe("gemini-3.5-flash=HTTP 503");
    expect(summary).not.toContain("GEMINI_API_KEY_12");
  });
});
