import { describe, expect, it } from "vitest";
import {
  buildClaimSupportGraph,
  countIndependentSourceHosts,
  graphHasIndependentCorroboration,
  meetsTwoSourceRule,
  isAggregatorHost,
  hostnameOf,
  observationsFromSourceUrls,
} from "../lib/source-corroboration";

describe("source-corroboration", () => {
  it("parses hostname", () => {
    expect(hostnameOf("https://www.example.com/path")).toBe("example.com");
  });

  it("detects aggregator hosts", () => {
    expect(isAggregatorHost("zoominfo.com")).toBe(true);
    expect(isAggregatorHost("sec.gov")).toBe(false);
  });

  it("collapses multiple aggregator URLs to one bucket", () => {
    expect(
      countIndependentSourceHosts([
        "https://www.zoominfo.com/p/a",
        "https://rocketreach.co/b",
        "https://apollo.io/c",
      ]),
    ).toBe(1);
  });

  it("counts primary hosts separately (two-source rule)", () => {
    const urls = [
      "https://www.sec.gov/Archives/edgar/data/1/a.htm",
      "https://investor.example.com/contact",
    ];
    expect(countIndependentSourceHosts(urls)).toBe(2);
    expect(meetsTwoSourceRule(urls)).toBe(true);
  });

  it("one primary + aggregators still needs second primary for two-source", () => {
    expect(
      meetsTwoSourceRule([
        "https://investor.example.com/contact",
        "https://www.zoominfo.com/p/x",
      ]),
    ).toBe(true); // primary + aggregator bucket = 2
    expect(meetsTwoSourceRule(["https://www.zoominfo.com/p/x"])).toBe(false);
  });

  it("represents multiple observations supporting one claim without promoting it", () => {
    const observations = observationsFromSourceUrls([
      "https://company.example/about",
      "https://filings.example/2026/proxy",
    ], {
      observedAt: "2026-09-11T12:00:00.000Z",
      runId: "run-1",
      caseId: 42,
      collectionMethod: "browser_fetch",
    });
    const graph = buildClaimSupportGraph({
      id: "claim:person-role",
      subject: "John Smith",
      predicate: "role",
      object: "CFO of Company X",
      scope: "candidate",
      personName: "John Smith",
    }, observations);

    expect(graph.claims).toHaveLength(1);
    expect(graph.observations).toHaveLength(2);
    expect(graph.edges).toHaveLength(2);
    expect(graph.edges.every((edge) => edge.kind === "supports")).toBe(true);
    expect(graphHasIndependentCorroboration(graph)).toBe(true);
  });
});
