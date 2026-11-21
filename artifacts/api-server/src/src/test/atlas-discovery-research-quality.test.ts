import { describe, expect, it } from "vitest";
import {
  buildDiscoveryLeadUtilizationState,
  buildDiscoveryRetrievalFeedback,
  buildDiscoveryWorkingMemoryContext,
  type AgenticTrajectoryRecord,
} from "../lib/agentic-web-research-core";

describe("AI-led discovery research quality context", () => {
  const firstUrl = "https://acme.example/leadership";
  const secondUrl = "https://northstar.example/about";
  const thirdUrl = "https://regional.example/story";
  const records: AgenticTrajectoryRecord[] = [
    {
      turn: 1,
      model: "investigator",
      action: "web_search",
      args: {
        query: "operating companies and current principals",
        provider: "serper",
        hypothesis: "Regional operating-company coverage may identify principals",
        purpose: "Identify a current operating company and a source-backed decision-maker",
      },
      execution: "success",
      observation: [
        "WEB_SEARCH provider=serper",
        "Acme Holdings leadership page",
        "URL: " + firstUrl,
        "Snippet: Acme Holdings operates industrial services and names its managing director.",
        "Northstar Group company profile",
        "URL: " + secondUrl,
        "Snippet: Northstar Group describes its operating businesses and current leadership.",
        "Regional company profile",
        "URL: " + thirdUrl,
        "Snippet: Regional profile mentions a privately held operating business.",
      ].join("\n"),
      leadUrls: [firstUrl, secondUrl, thirdUrl],
      observedUrls: [],
      findings: [{
        vectorType: "other",
        value: "Acme Holdings",
        personName: null,
        role: null,
        scope: "organization",
        sourceUrls: [firstUrl],
        note: "Named in a search result; operating status and relevance still require verification.",
        reviewOnly: true,
      }],
    },
    {
      turn: 2,
      model: "investigator",
      action: "visit",
      args: { url: firstUrl, hypothesis: "The leadership page may verify current management", purpose: "Verify the named company's current leadership" },
      execution: "http_error",
      observation: "HTTP 403; the page could not be retrieved.",
      observedUrls: [],
      findings: [],
      failureDomain: "tool_execution",
      failureKind: "request_failure",
    },
    {
      turn: 3,
      model: "investigator",
      action: "browser_fetch",
      args: { url: secondUrl, hypothesis: "A different public page may expose company identity", purpose: "Verify company identity from an accessible source" },
      execution: "blocked",
      observation: "Provider policy blocked the requested retrieval before outbound fetch.",
      observedUrls: [],
      findings: [],
      failureDomain: "tool_execution",
      failureKind: "scope_guard",
    },
  ];

  it("preserves search-result title/snippet pairs even after failed or blocked fetch attempts", () => {
    const state = buildDiscoveryLeadUtilizationState(records);
    expect(state.searchResultLeadUrlCount).toBe(3);
    expect(state.unfetchedLeadUrlCount).toBe(1);
    expect(state.failedLeadUrls).toEqual([expect.objectContaining({ url: firstUrl, execution: "http_error" })]);
    expect(state.blockedLeadUrls).toEqual([expect.objectContaining({ url: secondUrl })]);
    const excerpts = state.unfetchedLeadObservations.map((item) => item.observation).join("\n");
    expect(excerpts).toContain(firstUrl);
    expect(excerpts).toContain(secondUrl);
    expect(excerpts).toContain("Acme Holdings leadership page");
    expect(excerpts).toContain("Northstar Group company profile");
  });

  it("reconstructs hypotheses, review-only leads, source status and search context for the Investigator", () => {
    const memory = JSON.parse(buildDiscoveryWorkingMemoryContext(records)) as {
      leadInventory: { unfetchedLeadUrls: string[]; unverifiedTitleSnippetPairs: Array<{ observation: string }> };
      retrievalOutcomes: { failedLeadUrls: Array<{ url: string }>; blockedLeadUrls: Array<{ url: string }> };
      modelAuthoredResearchIntent: Array<{ hypothesis: string | null; purpose: string | null }>;
      provisionalReviewLeads: Array<{ name: string; scope: string; sourceUrls: string[] }>;
    };
    expect(memory.leadInventory.unfetchedLeadUrls).toContain(thirdUrl);
    expect(memory.retrievalOutcomes.failedLeadUrls[0]?.url).toBe(firstUrl);
    expect(memory.retrievalOutcomes.blockedLeadUrls[0]?.url).toBe(secondUrl);
    expect(memory.modelAuthoredResearchIntent[0]?.hypothesis).toContain("Regional operating-company");
    expect(memory.modelAuthoredResearchIntent[0]?.purpose).toContain("current operating company");
    expect(memory.provisionalReviewLeads).toContainEqual(expect.objectContaining({
      name: "Acme Holdings",
      scope: "organization",
      sourceUrls: [firstUrl],
    }));
  });

  it("tells the Investigator to adapt retrieval without treating failures as disproof or prescribing a route", () => {
    const feedback = buildDiscoveryRetrievalFeedback(records);
    expect(feedback).toContain("does not disprove the lead");
    expect(feedback).toContain("materially changed retrieval hypothesis");
    expect(feedback).toContain(firstUrl);
    expect(feedback).toContain(secondUrl);
    expect(feedback).toContain("no particular route or sequence is prescribed");
  });

  it("does not add route-adaptation instructions when no fetch has failed or been blocked", () => {
    expect(buildDiscoveryRetrievalFeedback(records.slice(0, 1))).toBeNull();
  });
});
