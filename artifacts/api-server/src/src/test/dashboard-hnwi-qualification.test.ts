import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboardSource = readFileSync(new URL("../routes/dashboard.ts", import.meta.url), "utf8");

describe("dashboard HNWI evidence qualification", () => {
  it("uses the source-aware qualification predicate for every HNWI dashboard surface", () => {
    expect(dashboardSource).toContain("function qualifiedHnwiCondition()");
    expect(dashboardSource).toContain("personalWealthEvidence");
    expect(dashboardSource).toContain("wealthStatus");
    expect(dashboardSource).toContain("hnwiQualificationStatus");
    expect(dashboardSource).toContain("FAA Releasable Aircraft Database");
    expect(dashboardSource).not.toContain('eq(entitiesTable.type, "HNWI")');
    expect(dashboardSource.match(/qualifiedHnwiCondition\(\)/g)?.length).toBeGreaterThanOrEqual(5);
  });
});
