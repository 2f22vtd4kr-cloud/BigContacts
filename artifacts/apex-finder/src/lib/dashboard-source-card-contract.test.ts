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
    expect(reviewCardSource).toContain("lead.limitations");
    expect(reviewCardSource).toContain('aria-label="Attributable source links"');
    expect(reviewCardSource).toContain('target="_blank"');
    expect(reviewCardSource).toContain("Open gaps · ");
  });
});


const dataSources = readFileSync(new URL("../pages/data-sources.tsx", import.meta.url), "utf8");

describe("Western registry seed source-catalogue honesty", () => {
  it("exposes the composite Western batch as one action rather than three false source-specific actions", () => {
    expect(dataSources).toContain('id: "western-multi-registry"');
    expect(dataSources).toContain('label: "Western Multi-Registry Pipeline"');
    expect(dataSources).toContain("Start and monitor this pipeline in the Mass Seed Operations panel");
    expect(dataSources).toContain('endpoint: "/api/ingest/western-hnwi"');
    expect(dataSources).toContain('jobType: "western-hnwi"');
    expect(dataSources).not.toContain('endpoint: "/api/ingest/western-hnwi"');
    expect(dataSources).toContain("SEC EDGAR SC 13D/G and DEF 14A");
    expect(dataSources).toContain("BRREG Norway");
    expect(dataSources).toContain("Companies House UK when its API key is configured");
    expect(dataSources).toContain("not a source-isolated SEC, BRREG, or Companies House run");
    expect(dataSources).not.toContain('id: "sec-edgar"');
    expect(dataSources).not.toContain('id: "companies-house"');
    expect(dataSources).not.toContain('id: "brreg"');
  });

  it("keeps FAA and Land Registry as distinct bulk-ingestion actions", () => {
    expect(dataSources).toContain('id: "faa"');
    expect(dataSources).toContain('endpoint: "/api/ingest/faa"');
    expect(dataSources).toContain('id: "land-registry"');
    expect(dataSources).toContain('endpoint: "/api/ingest/land-registry"');
  });
});
