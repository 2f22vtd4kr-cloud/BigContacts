import { describe, expect, it } from "vitest";
import {
  classifyProviderHttpStatus,
  classifyThrownProviderError,
  summarizeProviderBody,
} from "../lib/provider-error-diagnostics";

describe("provider error diagnostics", () => {
  it("classifies AbortError as a timeout unless the caller explicitly marks cancellation", () => {
    const timeout = new DOMException("The operation was aborted", "AbortError");

    expect(classifyThrownProviderError(timeout)).toBe("timeout");
    expect(classifyThrownProviderError(timeout, true)).toBe("cancelled");
  });

  it("classifies provider HTTP status codes without exposing response bodies", () => {
    expect(classifyProviderHttpStatus(400)).toBe("invalid_request");
    expect(classifyProviderHttpStatus(429)).toBe("rate_limited");
    expect(classifyProviderHttpStatus(503)).toBe("provider_unavailable");

    const summary = summarizeProviderBody(JSON.stringify({
      error: {
        code: "INVALID_ARGUMENT",
        message: "secret provider response must not be logged",
      },
    }));

    expect(summary.errorCode).toBe("INVALID_ARGUMENT");
    expect(summary.errorMessageChars).toBe(43);
    expect(JSON.stringify(summary)).not.toContain("secret provider response must not be logged");
  });
});
