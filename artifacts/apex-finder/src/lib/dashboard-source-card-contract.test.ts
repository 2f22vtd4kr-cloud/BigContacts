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

  it("labels review-lead URLs as source links, not necessarily fetched sources", () => {
    const start = dashboardSource.indexOf("function ReviewLeadCard(");
    const end = dashboardSource.indexOf("\n}\n\nexport default function Dashboard()", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const reviewCardSource = dashboardSource.slice(start, end);
    expect(reviewCardSource).toContain("source link");
    expect(reviewCardSource).not.toContain("fetched source");
    expect(reviewCardSource).toContain("Fetched-source support");
    expect(reviewCardSource).toContain('lead.verificationLevel === "search_result_lead"');
    expect(reviewCardSource).toContain("Verification pending");
  });
});
