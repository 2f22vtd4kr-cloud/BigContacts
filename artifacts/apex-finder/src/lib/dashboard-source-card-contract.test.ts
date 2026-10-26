import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dashboardSource = readFileSync(new URL("../pages/dashboard.tsx", import.meta.url), "utf8");

describe("dashboard source-card snippet honesty", () => {
  it("renders search snippets as unverified context, separate from fetched page excerpts", () => {
    expect(dashboardSource).toContain("lead.searchSnippet && !hasFetchedExcerpt");
    expect(dashboardSource).toContain("Unverified search snippet");
    expect(dashboardSource).toContain("text-unverified-search-snippet-");
    expect(dashboardSource).toContain("The page was fetched, but no structured entity claim was emitted.");
    expect(dashboardSource).toContain("Not an entity / not HNWI evidence");
    expect(dashboardSource).toContain("badge-review-lead-");
    expect(dashboardSource).toContain("Search lead · unverified");
  });
});
