import { describe, expect, it } from "vitest";
import {
  classifyProviderHttpStatus,
  providerErrorCode,
  classifyThrownProviderError,
  describeThrownProviderError,
  isLocalProviderQuotaError,
  summarizeProviderBody,
  safeThrownErrorSummary,
} from "../lib/provider-error-diagnostics";

describe("provider error diagnostics", () => {
  it("identifies local provider-gate quota errors without exposing their messages", async () => {
    const { ProviderQuotaError } = await import("../lib/provider-gate");
    const error = new ProviderQuotaError("budget_exhausted", "groq", 30_000);
    expect(isLocalProviderQuotaError(error)).toBe(true);
    expect(classifyThrownProviderError(error)).toBe("rate_limited");
  });

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

  it("produces durable failure text without leaking raw provider exception messages", () => {
    const secret = "Authorization: Bearer super-secret-token socket details";
    const summary = safeThrownErrorSummary("Canonical target investigation failed", new TypeError(secret));
    expect(summary).toMatch(/^Canonical target investigation failed \(class=TypeError; code=none; digest=[a-f0-9]{16}\)$/);
    expect(summary).not.toContain(secret);
    expect(summary).not.toContain("super-secret-token");
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
    expect(classifyProviderHttpStatus(413)).toBe("request_size");
    expect(classifyProviderHttpStatus(503)).toBe("provider_unavailable");

    const summary = summarizeProviderBody(JSON.stringify({
      error: {
        code: "INVALID_ARGUMENT",
        message: "secret provider response must not be logged",
      },
    }));

    expect(summary.errorCode).toBe("INVALID_ARGUMENT");
    expect(summary.errorMessageChars).toBe(43);
    expect(summary).not.toHaveProperty("errorMessage");
    expect(JSON.stringify(summary)).not.toContain("secret provider response must not be logged");
  });

  it("keeps malformed provider bodies shape-only", () => {
    const summary = summarizeProviderBody("upstream secret provider message");
    expect(summary.bodyKind).toBe("text");
    expect(summary).not.toHaveProperty("errorMessage");
    expect(JSON.stringify(summary)).not.toContain("upstream secret provider message");
  });
});
