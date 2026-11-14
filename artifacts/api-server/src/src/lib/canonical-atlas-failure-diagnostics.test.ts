import { describe, expect, it } from "vitest";
import { classifyCanonicalAtlasFailure } from "./canonical-atlas-failure-diagnostics";

describe("canonical Atlas nested provider failure classification", () => {
  it("preserves a nested local Groq cooldown as a provider-capacity failure", () => {
    const quota = Object.assign(new Error("token-window cooldown"), {
      name: "ProviderQuotaError",
      code: "cooldown",
    });
    const wrapped = new Error("Boss control request could not proceed", {
      cause: new Error("provider adapter rejected the request", { cause: quota }),
    });

    expect(classifyCanonicalAtlasFailure({
      stage: "oversight_control_decision",
      error: wrapped,
    })).toEqual({ domain: "model_provider", kind: "local_provider_cooldown" });
  });

  it("preserves a nested local provider budget exhaustion category", () => {
    const quota = Object.assign(new Error("provider budget exhausted"), {
      name: "ProviderQuotaError",
      code: "budget_exhausted",
    });
    const wrapped = new Error("Boss control request failed", { cause: quota });

    expect(classifyCanonicalAtlasFailure({
      stage: "oversight_control_decision",
      error: wrapped,
    })).toEqual({ domain: "model_provider", kind: "local_provider_budget_exhausted" });
  });

  it("reads an HTTP rate-limit status through an ordinary wrapper", () => {
    const wrapped = new Error("Boss control request failed", {
      cause: Object.assign(new Error("upstream returned too many requests"), { status: 429 }),
    });

    expect(classifyCanonicalAtlasFailure({
      stage: "oversight_control_decision",
      error: wrapped,
    })).toEqual({ domain: "model_provider", kind: "provider_rate_limited" });
  });

  it("parses a string HTTP status code through a nested wrapper", () => {
    const wrapped = new Error("Boss control request failed", {
      cause: new Error("provider adapter failed", {
        cause: Object.assign(new Error("upstream returned too many requests"), { status: "429" }),
      }),
    });

    expect(classifyCanonicalAtlasFailure({
      stage: "oversight_control_decision",
      error: wrapped,
    })).toEqual({ domain: "model_provider", kind: "provider_rate_limited" });
  });

  it("bounds and cycle-protects nested cause traversal", () => {
    const first = new Error("first");
    const second = new Error("second");
    Object.defineProperty(first, "cause", { value: second });
    Object.defineProperty(second, "cause", { value: first });
    expect(classifyCanonicalAtlasFailure({
      stage: "oversight_control_decision",
      error: first,
    })).toEqual({ domain: "unexpected_programming_error", kind: "unexpected_exception" });
  });
});
