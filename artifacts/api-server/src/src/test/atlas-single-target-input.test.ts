import { describe, expect, it } from "vitest";
import { parseCanonicalSingleTargetId } from "../middlewares/normalize-atlas-launch-body";

describe("canonical Atlas single-target launch input", () => {
  it.each([1, 3, 25])("ignores legacy targetCount=%s and remains in model-owned discovery mode", (targetCount) => {
    expect(parseCanonicalSingleTargetId({ targetCount })).toEqual({ kind: "omitted" });
  });

  it.each([42, "42", "0042"])("accepts a positive safe target ID (%s)", (singleTargetId) => {
    expect(parseCanonicalSingleTargetId({ singleTargetId })).toEqual({ kind: "single-target", id: 42 });
  });

  it.each([
    null, "", " ", "not-a-number", true, false, {}, [], 0, -1, 1.5,
    Number.MAX_SAFE_INTEGER + 1, "1e2",
  ])("rejects an invalid explicit target ID (%s)", (singleTargetId) => {
    expect(parseCanonicalSingleTargetId({ singleTargetId })).toEqual({ kind: "invalid" });
  });
});
