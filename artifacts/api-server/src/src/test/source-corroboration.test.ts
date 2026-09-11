import { describe, expect, it } from "vitest";
import { buildClaimSupportGraph, countIndependentSourceHosts, graphHasIndependentCorroboration, meetsTwoSourceRule, isAggregatorHost, hostnameOf, observationsFromSourceUrls, validateClaimSupportGraph } from "../lib/source-corroboration";

describe("source-corroboration", () => {
  it("parses hostname", () => { expect(hostnameOf("https://www.example.com/path")).toBe("example.com"); });
  it("detects aggregator hosts", () => { expect(isAggregatorHost("zoominfo.com")).toBe(true); expect(isAggregatorHost("sec.gov")).toBe(false); });
  it("collapses multiple aggregator URLs to one bucket", () => { expect(countIndependentSourceHosts(["https://www.zoominfo.com/p/a", "https://rocketreach.co/b", "https://apollo.io/c"])).toBe(1); });
  it("counts primary hosts separately (two-source rule)", () => { const urls = ["https://www.sec.gov/Archives/edgar/data/1/a.htm", "https://investor.example.com/contact"]; expect(countIndependentSourceHosts(urls)).toBe(2); expect(meetsTwoSourceRule(urls)).toBe(true); });
  it("one primary + aggregator is two evidence buckets", () => { expect(meetsTwoSourceRule(["https://investor.example.com/contact", "https://www.zoominfo.com/p/x"])).toBe(true); expect(meetsTwoSourceRule(["https://www.zoominfo.com/p/x"])).toBe(false); });
  it("represents multiple observations supporting one claim without promoting it", () => {
    const observations = observationsFromSourceUrls(["https://company.example/about", "https://filings.example/2026/proxy"], { observedAt: "2026-09-11T12:00:00.000Z", runId: "run-1", caseId: 42, collectionMethod: "browser_fetch", idPrefix: "run-1:claim-1" });
    const graph = buildClaimSupportGraph({ id: "claim:person-role", subject: "John Smith", predicate: "role", object: "CFO of Company X", scope: "candidate", personName: "John Smith" }, observations);
    expect(graph.claims).toHaveLength(1); expect(graph.observations).toHaveLength(2); expect(new Set(graph.observations.map((o) => o.id)).size).toBe(2); expect(graph.edges).toHaveLength(2); expect(graph.edges.every((edge) => edge.kind === "supports")).toBe(true); expect(graphHasIndependentCorroboration(graph)).toBe(true); expect(validateClaimSupportGraph(graph).valid).toBe(true);
  });
  it("rejects a graph containing an unattributed observation", () => {
    const observations = observationsFromSourceUrls(["https://one.example/a"], { observedAt: "2026-09-11T12:00:00.000Z", idPrefix: "test" });
    const graph = buildClaimSupportGraph({ id: "claim:test", subject: "A", predicate: "email", object: "a@example.com", scope: "candidate", personName: "A" }, observations);
    graph.observations.push({ ...observationsFromSourceUrls(["https://unattributed.example/b"], { observedAt: "2026-09-11T12:00:00.000Z", idPrefix: "unattributed" })[0] });
    expect(validateClaimSupportGraph(graph)).toEqual({ valid: false, reason: "graph contains unattributed observations" });
  });
});
