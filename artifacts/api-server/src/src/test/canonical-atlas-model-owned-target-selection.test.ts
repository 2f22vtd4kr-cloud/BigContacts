import { describe, expect, it } from "vitest";
import { resolveCanonicalAtlasTargetCount } from "../lib/atlas-launch-defaults";

describe("canonical Atlas operator spending cap", () => {
  it("defaults to one target investigation without deciding which candidate the models select", () => {
    expect(resolveCanonicalAtlasTargetCount()).toBe(1);
    expect(resolveCanonicalAtlasTargetCount(undefined)).toBe(1);
  });

  it("clamps explicit operator budgets to the supported safe range", () => {
    expect(resolveCanonicalAtlasTargetCount(3)).toBe(3);
    expect(resolveCanonicalAtlasTargetCount(0)).toBe(1);
    expect(resolveCanonicalAtlasTargetCount(-4)).toBe(1);
    expect(resolveCanonicalAtlasTargetCount(999)).toBe(25);
    expect(resolveCanonicalAtlasTargetCount("not-a-number")).toBe(1);
  });
});
