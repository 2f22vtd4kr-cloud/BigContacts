import { describe, expect, it } from "vitest";
import { hasResearchProviderKey } from "../lib/research-key-readiness";

describe("hasResearchProviderKey", () => {
  it("returns false when only durable or cache Redis URLs are configured", () => {
    expect(hasResearchProviderKey({ REDIS_URL_1: "redacted", REDIS_URL: "redacted" })).toBe(false);
  });

  it("ignores blank provider credentials", () => {
    expect(hasResearchProviderKey({ GROQ_API_KEY: "   ", SERPER_API_KEY: "\n" })).toBe(false);
  });

  it("returns true for a configured model or research-source provider credential", () => {
    expect(hasResearchProviderKey({ GROQ_API_KEY: "redacted" })).toBe(true);
    expect(hasResearchProviderKey({ SERPER_API_KEY: "redacted" })).toBe(true);
  });

  it("does not count retired model keys or unrelated environment values as research readiness", () => {
    expect(hasResearchProviderKey({ REDIS_URL_1: "redacted", ANTHROPIC_API_KEY: "redacted" })).toBe(false);
    expect(hasResearchProviderKey({ NODE_ENV: "production" })).toBe(false);
  });
});
