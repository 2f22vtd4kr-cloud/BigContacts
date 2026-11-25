import { describe, expect, it } from "vitest";
import { resolveCanonicalAtlasRunTimeoutMs, resolveCanonicalAtlasTargetCount } from "../lib/atlas-launch-defaults";

describe("canonical Atlas operator spending cap", () => {
  it("defaults to one target investigation without deciding which candidate the models select", () => {
    expect(resolveCanonicalAtlasTargetCount()).toBe(1);
    expect(resolveCanonicalAtlasTargetCount(undefined)).toBe(1);
  });

  it("defaults the global Atlas run budget to 30 minutes and preserves the hard 30-minute cap", () => {
    expect(resolveCanonicalAtlasRunTimeoutMs()).toBe(30 * 60 * 1_000);
    expect(resolveCanonicalAtlasRunTimeoutMs(undefined)).toBe(30 * 60 * 1_000);
    expect(resolveCanonicalAtlasRunTimeoutMs(15 * 60 * 1_000)).toBe(15 * 60 * 1_000);
    expect(resolveCanonicalAtlasRunTimeoutMs(45 * 60 * 1_000)).toBe(30 * 60 * 1_000);
    expect(resolveCanonicalAtlasRunTimeoutMs(30_000)).toBe(2 * 60 * 1_000);
    expect(resolveCanonicalAtlasRunTimeoutMs("invalid")).toBe(30 * 60 * 1_000);
  });

  it("clamps explicit operator budgets to the supported safe range", () => {
    expect(resolveCanonicalAtlasTargetCount(3)).toBe(3);
    expect(resolveCanonicalAtlasTargetCount(0)).toBe(1);
    expect(resolveCanonicalAtlasTargetCount(-4)).toBe(1);
    expect(resolveCanonicalAtlasTargetCount(999)).toBe(25);
    expect(resolveCanonicalAtlasTargetCount("not-a-number")).toBe(1);
  });
});
