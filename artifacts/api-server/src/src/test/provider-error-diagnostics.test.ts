import { describe, expect, it } from "vitest";
import {
  classifyProviderHttpStatus,
  providerErrorCode,
  classifyThrownProviderError,
  describeThrownProviderError,
  summarizeProviderBody,
} from "../lib/provider-error-diagnostics";

describe("provider error diagnostics", () => {
  it("classifies AbortError as a timeout unless the caller explicitly marks cancellation", () => {
    const timeout = new DOMException("The operation was aborted", "AbortError");

    expect(classifyThrownProviderError(timeout)).toBe("timeout");
    expect(classifyThrownProviderError(timeout, true)).toBe("cancelled");
  });

  it("describes transport causes without exposing raw error messages", () => {
    const error = Object.assign(new TypeError("fetch failed"), {
      code: "UND_ERR_CONNECT_TIMEOUT",
      cause: Object.assign(new Error("socket detail"), {
        code: "ECONNRESET",
        syscall: "connect",
        hostname: "generativelanguage.googleapis.com",
      }),
    });
    const diagnostic = describeThrownProviderError(error);
    expect(diagnostic.errorName).toBe("TypeError");
    expect(diagnostic.errorCode).toBe("UND_ERR_CONNECT_TIMEOUT");
    expect(diagnostic.causeCode).toBe("ECONNRESET");
    expect(diagnostic.causeHostname).toBe("generativelanguage.googleapis.com");
    expect(diagnostic.messageDigest).toMatch(/^[a-f0-9]{16}$/);
    expect(JSON.stringify(diagnostic)).not.toContain("socket detail");
  });

  it("recognizes a daily-quota message even when the provider uses generic too_many_requests", () => {
    expect(providerErrorCode(JSON.stringify({ error: { code: "too_many_requests", message: "Free Tier limit of 500 requests per day has been exceeded." } }))).toBe("quota_exceeded");
  });

  it("keeps ordinary burst too_many_requests transient", () => {
    expect(providerErrorCode(JSON.stringify({ error: { code: "too_many_requests", message: "Too many requests in a short period." } }))).toBe("too_many_requests");
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
