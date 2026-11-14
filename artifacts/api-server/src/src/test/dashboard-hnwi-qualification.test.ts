import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboardSource = readFileSync(new URL("../routes/dashboard.ts", import.meta.url), "utf8");
const entitiesSource = readFileSync(new URL("../routes/entities.ts", import.meta.url), "utf8");
const helperSource = readFileSync(new URL("../lib/hnwi-qualification.ts", import.meta.url), "utf8");

describe("dashboard HNWI evidence qualification", () => {
  it("uses the source-aware qualification predicate for every HNWI dashboard surface", () => {
    expect(helperSource).toContain("export function qualifiedHnwiCondition()");
    expect(helperSource).toContain("personalWealthEvidence");
    expect(helperSource).toContain("wealthStatus");
    expect(helperSource).toContain("hnwiQualificationStatus");
    expect(helperSource).toContain("FAA Releasable Aircraft Database");
    expect(dashboardSource).not.toContain('eq(entitiesTable.type, "HNWI")');
    expect(dashboardSource.match(/qualifiedHnwiCondition\(\)/g)?.length).toBeGreaterThanOrEqual(4);
    expect(entitiesSource).toContain('if (type === "HNWI") conditions.push(qualifiedHnwiCondition())');
  });
});
