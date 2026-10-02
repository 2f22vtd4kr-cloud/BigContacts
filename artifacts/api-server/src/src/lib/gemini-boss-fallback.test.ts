import { describe, expect, it } from "vitest";
import {
  formatGeminiBossAttemptSummary,
  type GeminiBossAttemptDiagnostic,
} from "./case-bureau";

describe("Boss fallback diagnostics", () => {
  it("preserves model/status/provider-code attribution in attempt order", () => {
    const attempts: GeminiBossAttemptDiagnostic[] = [
      {
        model: "openai/gpt-oss-120b",
        keyName: "GROQ_API_KEY",
        httpStatus: 503,
        providerErrorCode: null,
        failureClass: "provider_unavailable",
      },
      {
        model: "openai/gpt-oss-20b",
        keyName: "GROQ_API_KEY",
        httpStatus: 429,
        providerErrorCode: "rate_limit_exceeded",
        failureClass: "rate_limited",
      },
      {
        model: "openai/gpt-oss-120b",
        keyName: "GROQ_API_KEY_1",
        httpStatus: 503,
        providerErrorCode: null,
        failureClass: "provider_unavailable",
      },
    ];

    expect(formatGeminiBossAttemptSummary(attempts)).toBe(
      "openai/gpt-oss-120b=HTTP 503, openai/gpt-oss-20b=HTTP 429 (rate_limit_exceeded), openai/gpt-oss-120b=HTTP 503",
    );
  });

  it("does not expose credential names in the formatted runtime summary", () => {
    const attempts: GeminiBossAttemptDiagnostic[] = [{
      model: "openai/gpt-oss-20b",
      keyName: "GROQ_API_KEY_12",
      httpStatus: 503,
      providerErrorCode: null,
      failureClass: "provider_unavailable",
    }];

    const summary = formatGeminiBossAttemptSummary(attempts);
    expect(summary).toBe("openai/gpt-oss-20b=HTTP 503");
    expect(summary).not.toContain("GROQ_API_KEY_12");
  });
});
