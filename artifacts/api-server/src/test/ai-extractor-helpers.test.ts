import { describe, expect, it } from "vitest";
import { extractJsonObject } from "../lib/ai-extractor";

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
});