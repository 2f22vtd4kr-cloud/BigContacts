import { describe, expect, it } from "vitest";
import { hasResearchProviderKey } from "../lib/research-key-readiness";

describe("hasResearchProviderKey", () => {
  it("returns false when only durable or cache Redis URLs are configured", () => {
    expect(hasResearchProviderKey({ REDIS_URL_1: "redacted", REDIS_URL: "redacted" })).toBe(false);
  });

  it("ignores blank canonical provider credentials", () => {
    expect(hasResearchProviderKey({ GROQ_BOSS_API_KEY: "   ", SERPER_API_KEY: "\n" })).toBe(false);
  });

  it("returns true for a configured canonical model or research-source credential", () => {
    expect(hasResearchProviderKey({ GROQ_BOSS_API_KEY: "redacted" })).toBe(true);
    expect(hasResearchProviderKey({ GROQ_INVESTIGATOR_API_KEY_1: "redacted" })).toBe(true);
    expect(hasResearchProviderKey({ SERPER_API_KEY: "redacted" })).toBe(true);
    expect(hasResearchProviderKey({ SERPAPI_KEY: "redacted" })).toBe(true);
  });

  it("does not count retired/generic model keys, HF_TOKEN alone, or unrelated environment values as research readiness", () => {
    expect(hasResearchProviderKey({ REDIS_URL_1: "redacted", ANTHROPIC_API_KEY: "redacted" })).toBe(false);
    expect(hasResearchProviderKey({ GEMINI_API_KEY: "redacted" })).toBe(false);
    expect(hasResearchProviderKey({ GEMINI_RIGHT_HAND_API_KEY: "redacted" })).toBe(false);
    expect(hasResearchProviderKey({ MISTRAL_API_KEY: "redacted" })).toBe(false);
    expect(hasResearchProviderKey({ PERPLEXITY_API_KEY: "redacted" })).toBe(false);
    expect(hasResearchProviderKey({ GROQ_API_KEY: "redacted" })).toBe(false);
    expect(hasResearchProviderKey({ SERPAPI_API_KEY: "redacted" })).toBe(false);
    expect(hasResearchProviderKey({ HF_TOKEN: "redacted" })).toBe(false);
    expect(hasResearchProviderKey({ NODE_ENV: "production" })).toBe(false);
  });
});
