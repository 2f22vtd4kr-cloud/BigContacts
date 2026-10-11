import { afterEach, describe, expect, it, vi } from "vitest";
import { recordAgenticLlmAttempt, resetAgenticLlmTelemetry } from "./agentic-llm-telemetry";

afterEach(() => {
  vi.restoreAllMocks();
  resetAgenticLlmTelemetry();
});

describe("Investigator LLM telemetry privacy", () => {
  it("preserves allowlisted generic provider diagnostics", () => {
    const output = vi.spyOn(console, "log").mockImplementation(() => {});
    recordAgenticLlmAttempt({
      provider: "groq",
      model: "openai/gpt-oss-120b",
      promptChars: 120,
      status: 400,
      success: false,
      retryIndex: 1,
      providerErrorCode: "json_validate_failed",
      providerErrorType: "tokens",
    });
    const record = JSON.parse(String(output.mock.calls[0]?.[0]));
    expect(record.providerErrorCode).toBe("json_validate_failed");
    expect(record.providerErrorType).toBe("tokens");
  });

  it("hashes provider-controlled diagnostic text instead of writing it to logs", () => {
    const output = vi.spyOn(console, "log").mockImplementation(() => {});
    const secretCode = "alice@example.com Authorization: Bearer PRIVATE_PROVIDER_DETAIL";
    const secretType = "contact notes and confidential research context";
    const longUntrustedLabel = "provider-private-field-".repeat(500);
    recordAgenticLlmAttempt({
      provider: "groq",
      model: "openai/gpt-oss-120b",
      promptChars: 2400,
      status: 400,
      success: false,
      retryIndex: 1,
      providerErrorCode: secretCode,
      providerErrorType: secretType,
      reason: longUntrustedLabel,
    });
    const line = String(output.mock.calls[0]?.[0]);
    const record = JSON.parse(line);
    for (const secret of ["alice@example.com", "PRIVATE_PROVIDER_DETAIL", "confidential research context", "provider-private-field-"]) {
      expect(line).not.toContain(secret);
    }
    expect(record.providerErrorCode).toMatch(/^opaque:[a-f0-9]{16}$/);
    expect(record.providerErrorType).toMatch(/^opaque:[a-f0-9]{16}$/);
    expect(record.reason).toMatch(/^opaque:[a-f0-9]{16}$/);
    expect(line.length).toBeLessThan(2000);
  });
});
