import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("review-card source provenance UI contract", () => {
  it("separates source class, contributor, corroboration and fetch mechanism", () => {
    const profile = readFileSync(new URL("../pages/profile.tsx", import.meta.url), "utf8");
    expect(profile).toContain("Source class:");
    expect(profile).toContain("Contributor:");
    expect(profile).toContain("Observed via:");
    expect(profile).toContain("Independent corroboration:");
    expect(profile).toContain("Publisher authority not implied");
    expect(profile).not.toContain("Higher evidence tier");
  });
});
