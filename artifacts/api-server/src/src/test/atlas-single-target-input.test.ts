import { describe, expect, it } from "vitest";
import { parseCanonicalSingleTargetId } from "../middlewares/normalize-atlas-launch-body";

describe("canonical Atlas single-target launch input", () => {
  it("keeps an omitted target in discovery mode", () => {
    expect(parseCanonicalSingleTargetId({ targetCount: 3 })).toEqual({ kind: "omitted" });
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
