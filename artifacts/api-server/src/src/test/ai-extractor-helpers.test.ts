import { describe, expect, it } from "vitest";
import { buildPerplexityPrompt, extractJsonObject } from "../lib/ai-extractor";

describe("AI response safety helpers", () => {
  it("extracts the first balanced JSON object instead of greedily merging objects", () => {
    const raw = '```json\n{"email":"first@example.org","nested":{"ok":true}}\n```\n{"ignored":true}';
    expect(extractJsonObject(raw)).toBe('{"email":"first@example.org","nested":{"ok":true}}');
  });

  it("handles braces inside quoted strings", () => {
    expect(extractJsonObject('prefix {"basis":"text with } brace","email":null} suffix'))
      .toBe('{"basis":"text with } brace","email":null}');
  });

  it("rejects incomplete or non-object responses", () => {
    expect(extractJsonObject("not json")).toBeNull();
    expect(extractJsonObject('{"email":"broken"')).toBeNull();
  });

  it("does not ask person research for a general organization email", () => {
    const prompt = buildPerplexityPrompt("Jane Doe", "HNWI", "US");
    expect(prompt).toContain("personal/direct email for the named individual only");
    expect(prompt).not.toContain('"email": "general org contact email or null"');
    expect(prompt).toContain('"instagram": "personal Instagram URL or null"');
    expect(prompt).not.toContain('"instagram": "org Instagram URL or null"');
    expect(prompt).toContain("corporate headquarters number");
  });

  it("keeps organization email wording scoped to organization research", () => {
    const prompt = buildPerplexityPrompt("Example Holdings", "Corporation", "US");
    expect(prompt).toContain('"email": "general organization contact email or null"');
    expect(prompt).toContain('"instagram": "organization Instagram URL or null"');
    expect(prompt).not.toContain("personal/direct email for the named individual only");
  });

  it("requires identity anchors and claim-level evidence before promoting findings", () => {
    const prompt = buildPerplexityPrompt("Example Holdings", "Corporation", "US", { city: "New York" });
    expect(prompt).toContain("target fingerprint first");
    expect(prompt).toContain("at least two independent anchors");
    expect(prompt).toContain("claim-level provenance");
    expect(prompt).toContain("Reject entity drift");
    expect(prompt).toContain("A username match, email-platform presence");
    expect(prompt).toContain('"identityAssessment": "confirmed | probable | ambiguous | not_established"');
    expect(prompt).toContain('"negativeFindings"');
    expect(prompt).toContain('"searchGaps"');
  });
});