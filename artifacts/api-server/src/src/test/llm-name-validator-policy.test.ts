import { describe, expect, it } from "vitest";
import { isStructurallyValidCandidateName } from "../lib/llm-name-validator-policy";

describe("structural candidate-name validation", () => {
  it.each([
    "Li",
    "X",
    "Cher",
    "3M",
    "Na",
    "李",
    "王小明",
    "محمد",
    "김민수",
    "Жан",
    "José María de la Cruz",
    "Jean-Baptiste O'Neil",
    "Northstar Holdings",
    "A".repeat(120),
  ])("accepts valid Unicode, short, single-token, multi-part or long candidate %s", (name) => {
    expect(isStructurallyValidCandidateName(name)).toBe(true);
  });

  it.each([
    "",
    "   ",
    "---",
    "…",
    "123456",
    "unknown",
    "Unknown Person",
    "none",
    "NULL",
    "undefined",
    "anonymous",
    "redacted",
    "withheld",
    "confidential",
    "not available",
    "not provided",
    "no name",
    "unidentified",
    "not known",
    "not disclosed",
    "Name\u0000Invalid",
  ])("rejects empty, malformed, control-character or placeholder value %s", (value) => {
    expect(isStructurallyValidCandidateName(value)).toBe(false);
  });

  it("does not coerce non-string values into candidate names", () => {
    expect(isStructurallyValidCandidateName(null)).toBe(false);
    expect(isStructurallyValidCandidateName(undefined)).toBe(false);
    expect(isStructurallyValidCandidateName(123)).toBe(false);
    expect(isStructurallyValidCandidateName({ name: "Ada Lovelace" })).toBe(false);
  });

  it("does not classify personhood or reject organization-like names", () => {
    expect(isStructurallyValidCandidateName("Northstar Holdings")).toBe(true);
    expect(isStructurallyValidCandidateName("The Example Family Trust")).toBe(true);
  });

  it("does not impose a maximum name length or silently truncate identity", () => {
    const longName = "A".repeat(1000);
    expect(isStructurallyValidCandidateName(longName)).toBe(true);
    expect(longName).toHaveLength(1000);
  });
});
