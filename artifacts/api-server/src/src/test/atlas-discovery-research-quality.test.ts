import { describe, expect, it } from "vitest";
import {
  buildDiscoveryLeadUtilizationState,
  buildDiscoveryRetrievalFeedback,
  buildDiscoveryWorkingMemoryContext,
  buildStepPrompt,
  parseAgentAction,
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
      failureKind: "out_of_scope_action",
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
      unresolvedResearchQuestions: Array<{ question: string; status: "open" | "blocked" }>;
      provisionalReviewLeads: Array<{ name: string; scope: string; sourceUrls: string[] }>;
    };
    expect(memory.leadInventory.unfetchedLeadUrls).toContain(thirdUrl);
    expect(memory.retrievalOutcomes.failedLeadUrls[0]?.url).toBe(firstUrl);
    expect(memory.retrievalOutcomes.blockedLeadUrls[0]?.url).toBe(secondUrl);
    expect(memory.modelAuthoredResearchIntent[0]?.hypothesis).toContain("Regional operating-company");
    expect(memory.modelAuthoredResearchIntent[0]?.purpose).toContain("current operating company");
    expect(memory.unresolvedResearchQuestions).toContainEqual(expect.objectContaining({
      question: "Identify a current operating company and a source-backed decision-maker",
      status: "open",
    }));
    expect(memory.unresolvedResearchQuestions).toContainEqual(expect.objectContaining({
      question: "Verify company identity from an accessible source",
      status: "blocked",
    }));
    expect(memory.provisionalReviewLeads).toContainEqual(expect.objectContaining({
      name: "Acme Holdings",
      scope: "organization",
      sourceUrls: [firstUrl],
    }));
  });

  it("never treats a search-result finding as answering its research purpose", () => {
    const searchRecord: AgenticTrajectoryRecord = {
      ...records[0]!,
      findings: [{ ...records[0]!.findings[0]!, reviewOnly: undefined }],
    };
    const memory = JSON.parse(buildDiscoveryWorkingMemoryContext([searchRecord])) as {
      unresolvedResearchQuestions: Array<{ question: string; status: "open" | "blocked" }>;
    };
    expect(memory.unresolvedResearchQuestions).toContainEqual(expect.objectContaining({
      question: "Identify a current operating company and a source-backed decision-maker",
      status: "open",
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

  it("preserves an explicit terminal organization review-card selection without admitting the company", () => {
    const promotionReason = "Preserve this explicitly selected company as a review-only lead for later verification.";
    const finding = {
      vectorType: "other",
      value: "Acme Holdings",
      personName: null,
      role: null,
      scope: "organization",
      sourceUrls: [firstUrl],
      note: "The same-run search result explicitly names Acme Holdings; operating status and ownership remain unverified.",
      contactAttribution: "organization",
      exactQuote: "Acme Holdings",
      identityAssessment: "unresolved",
      identityRationale: "Only a search-result name is available; identity and ownership need verification.",
      hypothesisRelation: "supports",
      hypothesisRationale: "The result is relevant to the objective but does not establish the underlying claims.",
      relationshipType: null,
      temporalStatus: "unclear",
      interpretationConfidence: 0.55,
      ambiguityNotes: "Search-result evidence only.",
      promotionDecision: "promote",
      promotionReason,
    };
    const parsed = parseAgentAction(JSON.stringify({
      action: "done",
      query: null, provider: null, url: null, email: null, username: null, domain: null, registry: null,
      thought: "Finish this discovery episode while preserving the selected review lead.",
      hypothesis: "The company may be an objective-relevant operating business.",
      purpose: "Preserve a named company for target-scoped verification.",
      expectedInformationGain: 0.7,
      locale: null, market: null, target: null, targetType: null, profile: null, sources: [], searches: [],
      findings: [finding],
    }), ["done"]);
    expect(parsed?.action).toBe("done");
    if (parsed?.action !== "done") throw new Error("Expected a parsed terminal discovery action.");
    expect(parsed.findings[0]).toMatchObject({
      value: "Acme Holdings",
      scope: "organization",
      promotionDecision: "promote",
      promotionReason,
    });
    expect(parsed.findings[0]?.reviewOnly).not.toBe(true);
    expect(parsed.partialFindings[0]).toMatchObject({
      value: "Acme Holdings",
      scope: "organization",
      reviewOnly: true,
    });
    expect(parsed.partialFindings[0]?.promotionDecision).toBeUndefined();

    const withoutReason = parseAgentAction(JSON.stringify({
      action: "done",
      query: null, provider: null, url: null, email: null, username: null, domain: null, registry: null,
      thought: "Finish without creating a review card.",
      hypothesis: "The company may be relevant.",
      purpose: "Complete the research episode.",
      expectedInformationGain: 0.5,
      locale: null, market: null, target: null, targetType: null, profile: null, sources: [], searches: [],
      findings: [{ ...finding, promotionReason: "" }],
    }), ["done"]);
    expect(withoutReason?.action).toBe("done");
    if (withoutReason?.action === "done") {
      expect(withoutReason.findings[0]?.promotionDecision).toBeUndefined();
    }
  });

  it("keeps lead handoff and adaptive retrieval guidance in the actual bounded Investigator prompt", () => {
    const prompt = buildStepPrompt({
      targetName: "",
      objective: "Identify operating companies and their current decision-makers.",
      history: [],
      trajectoryRecords: records,
      lastObservation: records[2]!.observation ?? "",
      findings: [],
      intelligenceContext: 'RESEARCH INTELLIGENCE STATE: {"openQuestions":["Verify operating status"],"researchQuestions":[{"question":"Verify the current decision-maker","status":"blocked"}],"frontier":{"unresolvedPressure":0.25},"stoppingAssessment":{"unresolvedQuestions":2,"recommendation":"continue"}}',
      mode: "discovery",
      actionAllowlist: ["web_search"],
    });
    expect(prompt).toContain("DISCOVERY LEAD HANDOFF: REQUIRED MODEL JUDGMENT");
    expect(prompt).toContain("findings[]");
    expect(prompt).toContain("DISCOVERY RETRIEVAL ADAPTATION");
    expect(prompt).toContain(firstUrl);
    expect(prompt).toContain("Acme Holdings leadership page");
    expect(prompt).toContain("Northstar Group company profile");
    expect(prompt).toContain("Do not bypass them");
    expect(prompt).toContain("researchQuestions");
    expect(prompt).toContain('"unresolvedQuestions":2');
    expect(prompt).toContain("unresolvedPressure");
  });

  it("keeps the explicit terminal review-card option separate from company admission", () => {
    const prompt = buildStepPrompt({
      targetName: "",
      objective: "Identify relevant operating companies and their current decision-makers.",
      history: [],
      trajectoryRecords: records,
      lastObservation: "The search result names Acme Holdings.",
      findings: [],
      mode: "discovery",
      actionAllowlist: ["web_search", "done"],
    });
    expect(prompt).toContain("TERMINAL REVIEW-CARD HANDOFF");
    expect(prompt).toContain("promotionDecision=promote");
    expect(prompt).toContain("not company admission");
    expect(prompt).toContain("search_result_lead remains unverified");
  });

  it("does not add route-adaptation instructions when no fetch has failed or been blocked", () => {
    expect(buildDiscoveryRetrievalFeedback(records.slice(0, 1))).toBeNull();
  });
});
