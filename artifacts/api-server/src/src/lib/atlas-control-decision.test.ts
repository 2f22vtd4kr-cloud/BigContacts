import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ATLAS_BOSS_CONTROL_PROMPT_BUDGET,
  ATLAS_BOSS_OPENING_CONTROL_RESPONSE_FORMAT,
  ATLAS_RIGHT_HAND_CONTROL_PROMPT_BUDGET,
  ATLAS_RIGHT_HAND_CONTROL_RESPONSE_FORMAT,
  atlasLeadUtilizationLaw,
  atlasRegistryFeasibilityLaw,
  buildAtlasBossControlPrompt,
  buildAtlasPinnedControlState,
  validateAtlasRightHandControl,
  normalizeAtlasRightHandControl,
  normalizeAtlasRightHandControlResponse,
  buildAtlasRightHandControlPrompt,
  compactAtlasInvestigatorReport,
  normalizeAtlasOpeningRightHandApprovalReview,
  normalizeAtlasOpeningRightHandReview,
  validateAtlasOpeningRightHandReview,
  validateAtlasOpeningRightHandApprovalReview,
} from "./atlas-control-decision";

const leadUrl = "https://businesssearch.ohiosos.gov/";

function pinnedStateWithUnfetchedLead(): string {
  return buildAtlasPinnedControlState({
    activeScope: "Public company-register investigation in the stated region.",
    leadInventory: {
      searchResultLeadUrlCount: 1,
      successfullyFetchedLeadUrlCount: 0,
      unfetchedLeadUrlCount: 1,
      failedLeadUrlCount: 0,
      blockedLeadUrlCount: 0,
      unfetchedLeadUrls: [leadUrl],
      unfetchedLeadObservations: [{ turn: 1, action: "web_search", leadUrlCount: 1, observation: "CKX Lands appears in a transaction announcement; the result is not yet fetched." }],
      failedLeadUrls: [],
      blockedLeadUrls: [],
    },
    admittedCandidates: [],
    findings: [],
    missionBudget: { investigatorActionsUsed: 5, globalActionsRemaining: 3, discoveryActionsRemaining: 0, discoverySearchActionsUsed: 2, discoverySearchActionsRemaining: 0, targetResearchReserveRemaining: 2 },
  });
}

function reportWithUnfetchedLead(): string {
  return JSON.stringify({
    provider: "groq",
    status: "failed",
    stopReason: "ITERATION_BUDGET",
    searches: 1,
    visits: 0,
    findings: [],
    modelFindings: [],
    openQuestions: [{
      turn: 4,
      action: "parallel_web_search",
      execution: "success",
      observation: "Search results returned a government registry URL.",
      observedUrls: [],
      unfetchedLeadUrls: [leadUrl],
      stopReason: null,
      failureDomain: null,
      failureKind: null,
    }],
  });
}

describe("Atlas control-plane lead continuity", () => {
  it("states the exact GLEIF ownership boundary for advisory roles", () => {
    expect(atlasRegistryFeasibilityLaw()).toContain("not a natural-person shareholder or beneficial-owner search");
    expect(atlasRegistryFeasibilityLaw()).toContain("must never be described as surfacing disclosed owners/shareholders");
  });
  it("pins executable action budgets so supervisors cannot confuse local and global limits", () => {
    const pinned = pinnedStateWithUnfetchedLead();
    expect(pinned).toContain("AUTHORITATIVE EXECUTABLE ACTION BUDGET");
    expect(pinned).toContain('"globalActionsRemaining":3');
    expect(pinned).toContain('"discoverySearchActionsRemaining":0');
  });

  it("preserves explicitly unfetched search leads in the compact Investigator report", () => {
    const compact = compactAtlasInvestigatorReport(reportWithUnfetchedLead());
    expect(compact).toContain('"unfetchedLeadUrls"');
    expect(compact).toContain(leadUrl);
    expect(compact).toContain('"visits": 0');
  });

  it("preserves complete source URLs longer than 300 characters in supervisor reports", () => {
    const longUrl = "https://registry.example.test/records/" + "a".repeat(320);
    const report = JSON.parse(compactAtlasInvestigatorReport(JSON.stringify({
      provider: "groq",
      status: "completed",
      searches: 1,
      visits: 0,
      findings: [],
      modelFindings: [],
      openQuestions: [{
        turn: 1,
        action: "web_search",
        execution: "success",
        observation: "Official registry result returned.",
        observedUrls: [longUrl],
        unfetchedLeadUrls: [longUrl],
      }],
    }))) as { latestQuestions: Array<{ observedUrls: string[]; unfetchedLeadUrls: string[] }> };

    expect(report.latestQuestions[0].observedUrls).toEqual([longUrl]);
    expect(report.latestQuestions[0].unfetchedLeadUrls).toEqual([longUrl]);
  });

  it("omits an oversized URL atomically and records that it was omitted from the supervisor prompt", () => {
    const oversizedUrl = "https://registry.example.test/records/" + "z".repeat(700);
    const compact = compactAtlasInvestigatorReport(JSON.stringify({
      provider: "groq",
      status: "completed",
      searches: 1,
      visits: 0,
      findings: [],
      modelFindings: [],
      openQuestions: [{
        turn: 1,
        action: "web_search",
        execution: "success",
        observation: "Official registry result returned.",
        observedUrls: [],
        unfetchedLeadUrls: [oversizedUrl],
      }],
    }));
    const report = JSON.parse(compact) as { latestQuestions: Array<{ unfetchedLeadUrls: string[]; unfetchedLeadUrlCount: number; unfetchedLeadUrlsOmittedFromPromptCount: number }> };
    expect(report.latestQuestions[0].unfetchedLeadUrls).toEqual([]);
    expect(report.latestQuestions[0].unfetchedLeadUrlCount).toBe(1);
    expect(report.latestQuestions[0].unfetchedLeadUrlsOmittedFromPromptCount).toBe(1);
    expect(compact).not.toContain(oversizedUrl.slice(0, 220));
  });

  it("keeps pinned lead URLs intact or records whole-item omission", () => {
    const longUrl = "https://registry.example.test/records/" + "b".repeat(320);
    const makeInput = (url: string) => ({
      activeScope: "Public company-register investigation in the stated region.",
      leadInventory: {
        searchResultLeadUrlCount: 1,
        successfullyFetchedLeadUrlCount: 0,
        unfetchedLeadUrlCount: 1,
        failedLeadUrlCount: 0,
        blockedLeadUrlCount: 0,
        unfetchedLeadUrls: [url],
        failedLeadUrls: [],
        blockedLeadUrls: [],
      },
      admittedCandidates: [],
      findings: [],
    });
    const pinned = buildAtlasPinnedControlState(makeInput(longUrl));
    expect(pinned).toContain(longUrl);
    expect(pinned.match(/https:\/\/registry\.example\.test\/records\/[b]+/)?.[0]).toBe(longUrl);
    expect(pinned).not.toContain("[URL omitted whole]");

    const oversizedUrl = "https://registry.example.test/records/" + "c".repeat(700);
    const omitted = buildAtlasPinnedControlState(makeInput(oversizedUrl));
    expect(omitted).toContain("1 URL(s) omitted whole from this prompt sample");
    expect(omitted).not.toContain(oversizedUrl.slice(0, 110));
  });

  it("keeps mandatory lead counts and one exact unfetched URL in the Right-hand prompt", () => {
    const urls = [
      "https://www.crunchbase.com/hub/information-technology-companies-less-than-500m-in-revenue",
      "https://www.inc.com/inc5000",
      "https://www.cbinsights.com/research-unicorn-companies",
      "https://blog.equityzen.com/the-next-list-emerging-private-companies",
      "https://en.wikipedia.org/wiki/List_of_unicorn_startup_companies",
      "https://foundercollective.medium.com/50-big-companies-that-started-with-little-or-no-money-4ef1b68aac25",
    ];
    const pinnedControlState = buildAtlasPinnedControlState({
      activeScope: "Find source-backed private technology company leads.",
      leadInventory: {
        searchResultLeadUrlCount: urls.length,
        successfullyFetchedLeadUrlCount: 0,
        unfetchedLeadUrlCount: urls.length - 1,
        failedLeadUrlCount: 1,
        blockedLeadUrlCount: 0,
        unfetchedLeadUrls: urls.filter((url) => url !== urls[1]),
        failedLeadUrls: [{
          url: urls[1],
          action: "visit",
          execution: "http_error",
          failureDomain: "external_page_fetch",
          failureKind: "http_error",
        }],
        blockedLeadUrls: [],
      },
      admittedCandidates: [],
      findings: [],
    });
    const prompt = buildAtlasRightHandControlPrompt({
      investigatorReport: compactAtlasInvestigatorReport(JSON.stringify({
        provider: "groq-investigator-1",
        status: "completed",
        searches: 1,
        visits: 1,
        findings: [],
        modelFindings: [],
        openQuestions: [{
          turn: 3,
          action: "visit",
          execution: "http_error",
          observation: "HTTP 403 from one search-result lead.",
          observedUrls: [],
          unfetchedLeadUrls: urls.filter((url) => url !== urls[1]),
          failureDomain: "external_page_fetch",
          failureKind: "http_error",
        }],
      })),
      compactState: "Five search-result leads remain unfetched; one page returned HTTP 403.",
      pinnedControlState,
    });

    expect(prompt.length).toBeLessThanOrEqual(ATLAS_RIGHT_HAND_CONTROL_PROMPT_BUDGET);
    expect(prompt).toContain("AUTHORITATIVE DURABLE LEAD COUNTS");
    expect(prompt).toContain(urls[0]);
    expect(prompt).toContain("Inc. 5000/fast-growth/unicorn rankings");
    expect(prompt).toContain("ranking-only mentions are leads, not qualified targets");
    expect(prompt).toContain("Only exact admitted name/type pairs may be recommended");
    expect(prompt).toContain("Operating-company targets need evidence of current operations and objective fit");
    expect(prompt).toContain("apply private/mid-market constraints only when the human explicitly requests them");
    expect(prompt).toContain("Find source-backed private technology company leads.");
  });

  it("bounds huge unvisited search descriptions while retaining lead counts and an exact URL", () => {
    const leadUrl = "https://www.example.test/releases/company-announcement";
    const pinnedControlState = buildAtlasPinnedControlState({
      activeScope: "Discover objective-relevant companies and preserve useful partial leads.",
      leadInventory: {
        searchResultLeadUrlCount: 18,
        successfullyFetchedLeadUrlCount: 0,
        unfetchedLeadUrlCount: 18,
        failedLeadUrlCount: 0,
        blockedLeadUrlCount: 0,
        unfetchedLeadUrls: [leadUrl],
        failedLeadUrls: [],
        blockedLeadUrls: [],
        unfetchedLeadObservations: [{
          turn: 3,
          action: "web_search",
          leadUrlCount: 18,
          observation: "CKX Lands announced a material investment transaction. " + "LONG_RESULT_DETAIL ".repeat(500) + " TAIL_RESULT_SENTINEL",
        }],
      },
      admittedCandidates: [],
      findings: [],
    });
    const contextLine = pinnedControlState.split("\n").find((line) => line.startsWith("ACTUAL UNFETCHED SEARCH-RESULT CONTEXT"));
    expect(contextLine).toBeDefined();
    expect(contextLine!.length).toBeLessThanOrEqual(1_180);
    expect(contextLine).toContain("additional result text omitted; relevance unknown");
    expect(contextLine).toContain("TAIL_RESULT_SENTINEL");

    const prompt = buildAtlasRightHandControlPrompt({
      investigatorReport: "18 unfetched leads remain; no lead has been fetched.",
      compactState: "No fetched evidence has been established.",
      pinnedControlState,
    });

    expect(prompt.length).toBeLessThanOrEqual(ATLAS_RIGHT_HAND_CONTROL_PROMPT_BUDGET);
    expect(prompt).toContain("AUTHORITATIVE DURABLE LEAD COUNTS");
    expect(prompt).toContain('"unfetchedLeadUrlCount":18');
    expect(prompt).toContain(leadUrl);
    expect(prompt).toContain("ACTUAL UNFETCHED SEARCH-RESULT CONTEXT");
    expect(prompt).toContain("additional result text omitted; relevance unknown");
    expect(prompt).toContain("CKX Lands announced a material investment transaction");
    expect(prompt).toContain("TAIL_RESULT_SENTINEL");
    expect(prompt).not.toContain("LONG_RESULT_DETAIL ".repeat(500));
  });

  it("preserves provider-specific descriptions from the latest mixed-source batch within supervisor budgets", () => {
    const observations = [
      { turn: 1, action: "web_search", leadUrlCount: 6, observation: "provider=serper: SERPER_RESULT: ownership announcement identifies a private investor and operating company. " + "SERPER_DETAIL ".repeat(25) },
      { turn: 2, action: "web_search", leadUrlCount: 6, observation: "provider=tavily: TAVILY_RESULT: official filing index lists company officers and identifiers. " + "TAVILY_DETAIL ".repeat(25) },
      { turn: 3, action: "web_search", leadUrlCount: 6, observation: "provider=exa: EXA_RESULT: acquisition report names a buyer, seller and transaction date. " + "EXA_DETAIL ".repeat(25) },
    ];
    const state = buildAtlasPinnedControlState({
      activeScope: "Mixed-source discovery under the active case objective.",
      leadInventory: {
        searchResultLeadUrlCount: 18,
        successfullyFetchedLeadUrlCount: 0,
        unfetchedLeadUrlCount: 18,
        failedLeadUrlCount: 0,
        blockedLeadUrlCount: 0,
        unfetchedLeadUrls: [leadUrl],
        unfetchedLeadObservations: observations,
        failedLeadUrls: [],
        blockedLeadUrls: [],
      },
      admittedCandidates: [],
      findings: [],
    });
    const contextLine = state.split("\n").find((line) => line.startsWith("ACTUAL UNFETCHED SEARCH-RESULT CONTEXT"));
    expect(contextLine).toBeDefined();
    expect(contextLine!.length).toBeGreaterThan(720);
    expect(contextLine!.length).toBeLessThanOrEqual(2_520);
    expect(contextLine).toContain("SERPER_RESULT");
    expect(contextLine).toContain("TAVILY_RESULT");
    expect(contextLine).toContain("EXA_RESULT");
    expect(contextLine).toContain("unvisitedLeadCount=6");
    expect(state).toContain('"unfetchedLeadUrlCount":18');

    const rightHandPrompt = buildAtlasRightHandControlPrompt({
      investigatorReport: "18 unfetched leads remain; none has been fetched.",
      compactState: "No fetched evidence has been established.",
      pinnedControlState: state,
    });
    expect(rightHandPrompt.length).toBeLessThanOrEqual(ATLAS_RIGHT_HAND_CONTROL_PROMPT_BUDGET);
    expect(rightHandPrompt).toContain("SERPER_RESULT");
    expect(rightHandPrompt).toContain("TAVILY_RESULT");
    expect(rightHandPrompt).toContain("EXA_RESULT");

    const bossPrompt = buildAtlasBossControlPrompt({
      investigatorReport: "18 unfetched leads remain; none has been fetched.",
      compactState: "No fetched evidence has been established.",
      pinnedControlState: state,
      rightHand: {
        status: "completed",
        decision: "continue_discovery",
        reason: "The latest same-case parallel search contains unvisited item-level leads.",
        direction: null,
        confidence: 0.8,
        model: "test-model",
        error: null,
      },
    });
    expect(bossPrompt.length).toBeLessThanOrEqual(ATLAS_BOSS_CONTROL_PROMPT_BUDGET);
    expect(bossPrompt).toContain("SERPER_RESULT");
    expect(bossPrompt).toContain("TAVILY_RESULT");
    expect(bossPrompt).toContain("EXA_RESULT");
    expect(bossPrompt).toContain('"unfetchedLeadUrlCount":18');
    expect(bossPrompt).toContain(leadUrl);
  });

  it("keeps full lead counts and a small set of complete URLs when Boss pinned state is crowded", () => {
    const urls = Array.from({ length: 18 }, (_, index) =>
      `https://registry.example.test/search/lead-${index + 1}?source=official`,
    );
    const pinnedControlState = buildAtlasPinnedControlState({
      activeScope: "Public-company discovery under the exact accepted objective.",
      leadInventory: {
        searchResultLeadUrlCount: 18,
        successfullyFetchedLeadUrlCount: 0,
        unfetchedLeadUrlCount: 18,
        failedLeadUrlCount: 0,
        blockedLeadUrlCount: 0,
        unfetchedLeadUrls: urls,
        failedLeadUrls: [],
        blockedLeadUrls: [],
      },
      admittedCandidates: [],
      findings: [],
    });
    expect(pinnedControlState).toContain('"searchResultLeadUrlCount":18');
    expect(pinnedControlState).toContain('"unfetchedLeadUrlCount":18');
    expect(pinnedControlState).toContain(urls[0]!);
    expect(pinnedControlState).toContain(urls[1]!);
    expect(pinnedControlState).not.toContain(urls[2]!);
    expect(pinnedControlState).toContain("16 URL(s) omitted whole from this prompt sample");

    const prompt = buildAtlasBossControlPrompt({
      investigatorReport: "Search completed with no fetched findings.",
      compactState: "The durable case retains all 18 search leads.",
      pinnedControlState,
      rightHand: {
        status: "completed",
        decision: "continue_discovery",
        reason: "Search leads remain unvisited.",
        direction: null,
        confidence: 0.8,
        model: "test-model",
        error: null,
      },
    });
    expect(prompt.length).toBeLessThanOrEqual(ATLAS_BOSS_CONTROL_PROMPT_BUDGET);
    expect(prompt).toContain('"unfetchedLeadUrlCount":18');
    expect(prompt).toContain(urls[0]!);
    expect(prompt).toContain(urls[1]!);
    expect(prompt).toContain("complete routes remain in durable case state");
  });

  it("shows Right-hand that search leads are not evidence and blocks are not negative findings", () => {
    const prompt = buildAtlasRightHandControlPrompt({
      investigatorReport: compactAtlasInvestigatorReport(reportWithUnfetchedLead()),
      pinnedControlState: pinnedStateWithUnfetchedLead(),
      compactState: "Successful searches: 1. Successful visits: 0. A preflight action was blocked before outbound execution.",
    });
    expect(prompt).toContain(leadUrl);
    expect(prompt).toContain("unfetchedLeadUrls");
    expect(pinnedStateWithUnfetchedLead()).toContain("ACTUAL UNFETCHED SEARCH-RESULT CONTEXT");
    expect(pinnedStateWithUnfetchedLead()).toContain("CKX Lands appears in a transaction announcement");
    expect(prompt).toContain("Search URLs/snippets remain leads, not evidence until fetched.");
    expect(prompt).toContain("A blocked request cannot support a claim that a registry or sector lacks ownership information.");
  });

  it("shows Boss the same lead provenance without prescribing a fixed tool order", () => {
    const prompt = buildAtlasBossControlPrompt({
      investigatorReport: compactAtlasInvestigatorReport(reportWithUnfetchedLead()),
      pinnedControlState: pinnedStateWithUnfetchedLead(),
      compactState: "Successful searches: 1. Successful visits: 0. A preflight action was blocked before outbound execution.",
      rightHand: {
        status: "completed",
        decision: "continue_discovery",
        reason: "A useful in-scope lead remains unvisited.",
        direction: null,
        confidence: 0.8,
        model: "test-model",
        error: null,
      },
    });
    expect(prompt).toContain(leadUrl);
    expect(prompt).toContain("unfetchedLeadUrls");
    expect(prompt).toContain("A blocked request cannot support a claim that a registry or sector lacks ownership information.");
    expect(prompt).toContain("Do not prescribe a fixed provider, query, tool, source class, or action sequence.");
  });

  it("applies household-name reachability realism without excluding objective-fit companies", () => {
    const bossPrompt = buildAtlasBossControlPrompt({
      investigatorReport: compactAtlasInvestigatorReport(reportWithUnfetchedLead()),
      compactState: "Generic prospect discovery; source-backed review leads remain unverified.",
      pinnedControlState: pinnedStateWithUnfetchedLead(),
      rightHand: {
        status: "completed",
        decision: "continue_discovery",
        reason: "A useful in-scope lead remains unvisited.",
        direction: null,
        confidence: 0.8,
        model: "test-model",
        error: null,
      },
    });
    const rightHandPrompt = buildAtlasRightHandControlPrompt({
      investigatorReport: compactAtlasInvestigatorReport(reportWithUnfetchedLead()),
      compactState: "Generic prospect discovery; source-backed review leads remain unverified.",
      pinnedControlState: pinnedStateWithUnfetchedLead(),
    });

    expect(bossPrompt).toContain("globally famous/household-name individuals are presumptively poor practical prospects");
    expect(bossPrompt).toContain("the human explicitly names or requests prominent public figures");
    expect(bossPrompt).toContain("Generic corporate, press or investor-relations channels do not qualify as individual access");
    expect(bossPrompt).toContain("well-known/public companies remain eligible when objective-fit");
    expect(bossPrompt).not.toContain("anti-famous");

    expect(rightHandPrompt).toContain("globally famous/household-name individuals are presumptively poor practical prospects");
    expect(rightHandPrompt).toContain("explicit human request");
    expect(rightHandPrompt).toContain("generic corporate, press or IR channels are not personal access");
    expect(rightHandPrompt).toContain("well-known brands remain eligible when objective-fit");
  });

  it("restricts the opening Boss response to start or stop with no target or direction", () => {
    expect(ATLAS_BOSS_OPENING_CONTROL_RESPONSE_FORMAT.schema.properties.action.enum).toEqual(["continue_discovery", "stop"]);
    expect(ATLAS_BOSS_OPENING_CONTROL_RESPONSE_FORMAT.schema.properties.candidateName.type).toBe("null");
    expect(ATLAS_BOSS_OPENING_CONTROL_RESPONSE_FORMAT.schema.properties.candidateType.type).toBe("null");
    expect(ATLAS_BOSS_OPENING_CONTROL_RESPONSE_FORMAT.schema.properties.direction.type).toBe("null");
  });

  it("fits the full opening objective without duplicating it in pinned control state", () => {
    const humanObjective = `Find source-backed private-business owners with realistic professional contact routes. ${"Use observed public evidence and do not invent geography. ".repeat(12)}`.trim();
    const prompt = buildAtlasBossControlPrompt({
      opening: true,
      humanObjective,
      investigatorReport: JSON.stringify({
        stage: "opening_adjudication",
        bossInitialReport: "One unverified candidate hypothesis.",
        bossInitialDirections: ["Verify the named person's role and ownership from fetched public sources."],
        bossUncertainties: ["Ownership and contact details are not evidence until independently observed."],
      }),
      compactState: `# Apex Atlas — Investigation Context\n## Objective\n${humanObjective}\n## Discovery status\nOpening review is complete; no Investigator action has executed.`,
      pinnedControlState: [
        "OPENING CONTROL STATE: Boss has not activated a research direction.",
        "OBJECTIVE SOURCE: The complete current human objective is in COMPLETE DISCOVERY STATE; do not add geography absent from it.",
        "Initial hypotheses are unverified and are not evidence.",
      ].join("\n"),
      rightHand: {
        status: "completed",
        decision: "recommend",
        reason: "One in-scope hypothesis can be checked against observed evidence.",
        direction: null,
        confidence: 0.8,
        model: "test-model",
        error: null,
      },
    });

    expect(prompt).toContain(humanObjective);
    expect(prompt.split(humanObjective).length - 1).toBe(1);
    expect(prompt).not.toContain("One unverified candidate hypothesis");
    expect(prompt).not.toContain("Verify the named person's role and ownership");
    expect(prompt).not.toContain("HUMAN OBJECTIVE: The complete current human objective is in COMPLETE DISCOVERY STATE");
    expect(prompt).toContain("Choose only continue_discovery or stop.");
    expect(prompt).toContain("RIGHT-HAND ADVICE");
    expect(prompt).toContain("RUNTIME SOURCE/REGISTRY FEASIBILITY");
    expect(prompt).toContain("RUNTIME-CALLABLE REGISTRY IDS (randomized)");
    expect(prompt).toContain("SOURCE-MIX CONTRACT");
    expect(prompt).toContain("Investigator chooses exact targets, registry IDs, queries, providers, tools, order and stopping");
    expect(prompt.length).toBeLessThanOrEqual(ATLAS_BOSS_CONTROL_PROMPT_BUDGET);
  });

  it("grounds both supervisors in runtime registry capabilities and evidence-backed field assumptions", () => {
    const law = atlasRegistryFeasibilityLaw();
    expect(law).toContain("RUNTIME-CALLABLE REGISTRY IDS");
    expect(law).toContain("RUNTIME-CALLABLE REGISTRY IDS (randomized)");
    expect(law).toContain("SOURCE-MIX CONTRACT");
    expect(law).toContain("public-web discovery");
    expect(law).toContain("sec-edgar");
    expect(law).not.toContain("inbiz");
    expect(law).toContain("Generic agency pages are web sources, not native registry adapters");
    expect(law).toContain("Do not infer searchable fields or ownership from an adapter ID");
    expect(law).toContain("A jurisdiction-specific registry is eligible only when its jurisdiction is grounded");
    expect(law).toContain("if no jurisdiction is supplied, do not create one");
    expect(atlasLeadUtilizationLaw()).toContain("Do not treat lack of findings from snippets");
    expect(atlasLeadUtilizationLaw()).toContain("Do not label an unvisited result generic");
    expect(atlasLeadUtilizationLaw()).toContain("relevance is unknown, not disproven");
    expect(atlasLeadUtilizationLaw()).toContain("not a fixed action sequence");

    const input = {
      investigatorReport: compactAtlasInvestigatorReport(reportWithUnfetchedLead()),
      compactState: "Search results include a government landing page; no fetched ownership records.",
      rightHand: {
        status: "completed" as const,
        decision: "pivot_discovery",
        reason: "The source path remains unverified.",
        direction: "Test whether public filings identify members of private firms in a specified jurisdiction.",
        confidence: 0.7,
        model: "test-model",
        error: null,
      },
    };
    expect(buildAtlasRightHandControlPrompt(input)).toContain("RUNTIME-CALLABLE REGISTRY IDS");
    expect(buildAtlasBossControlPrompt(input)).toContain("RUNTIME-CALLABLE REGISTRY IDS");
    expect(buildAtlasRightHandControlPrompt(input)).toContain("SOURCE-MIX CONTRACT");
    expect(buildAtlasBossControlPrompt(input)).toContain("SOURCE-MIX CONTRACT");
    expect(buildAtlasRightHandControlPrompt(input)).toContain("LEAD-UTILIZATION JUDGMENT");
    expect(buildAtlasBossControlPrompt(input)).toContain("LEAD-UTILIZATION JUDGMENT");
    expect(buildAtlasRightHandControlPrompt(input)).toContain("A generic agency landing page does not prove that a dedicated register exists");
    expect(buildAtlasBossControlPrompt(input)).toContain("A generic agency landing page does not prove that a dedicated register exists");
  });

  it("keeps the Right-hand focused on an available target and does not request geography expansion", () => {
    const prompt = buildAtlasRightHandControlPrompt({
      investigatorReport: compactAtlasInvestigatorReport(reportWithUnfetchedLead()),
      compactState: "One official registry result identifies a potentially relevant company.",
      pinnedControlState: "One source-attributed organization review target is available.",
    });
    expect(prompt).toContain("If a useful source-attributed company/person/asset target is already available, recommend investigating it now.");
    expect(prompt).toContain("Do not delay for broad discovery, a larger pool or geography comparison.");
    expect(prompt).toContain("do not invent, compare, or broaden geography");
    expect(prompt).not.toContain("broader discovery has greater expected information gain");
    expect(prompt).not.toContain("one actual geography/jurisdiction");
  });

  it("bounds the post-discovery Right-hand control prompt and rationale contract", () => {
    const prompt = buildAtlasRightHandControlPrompt({
      investigatorReport: JSON.stringify({
        provider: "groq",
        status: "completed",
        searches: 12,
        visits: 1,
        findings: [],
        openQuestions: [{ action: "web_search", execution: "success", unfetchedLeadUrls: ["https://businesssearch.ohiosos.gov/"] }],
        repeatedHistory: "low-value historical detail ".repeat(1_000),
      }),
      compactState: "Latest durable state and source observations. ".repeat(4_000),
      pinnedControlState: [
        "ACTIVE ACCEPTED BOSS SCOPE: Midwest family-owned manufacturers in Minnesota and Wisconsin.",
        "AUTHORITATIVE DURABLE LEAD COUNTS: unfetchedLeadUrlCount=1.",
        "UNFETCHED (not fetched/not blocked): https://businesssearch.ohiosos.gov/",
      ].join("\n"),
    });

    expect(ATLAS_RIGHT_HAND_CONTROL_PROMPT_BUDGET).toBe(7_200);
    expect(prompt.length).toBeLessThanOrEqual(ATLAS_RIGHT_HAND_CONTROL_PROMPT_BUDGET);
    expect(prompt).toContain("SOURCE-ROUTE RECOVERY JUDGMENT");
    expect(prompt).toContain("LEAD-UTILIZATION JUDGMENT");
    expect(prompt).toContain("PINNED AUTHORITATIVE CASE STATE (survives history compaction)");
    expect(prompt).toContain("ACTIVE ACCEPTED BOSS SCOPE: Midwest family-owned manufacturers in Minnesota and Wisconsin.");
    expect(prompt).toContain("https://businesssearch.ohiosos.gov/");
    expect(ATLAS_RIGHT_HAND_CONTROL_RESPONSE_FORMAT.schema.properties.reason.maxLength).toBe(600);
    expect(ATLAS_RIGHT_HAND_CONTROL_RESPONSE_FORMAT.schema.properties.direction.maxLength).toBe(600);
    expect(ATLAS_RIGHT_HAND_CONTROL_RESPONSE_FORMAT.schema.required).toEqual([
      "decision", "reason", "direction", "confidence",
    ]);
    expect(validateAtlasRightHandControl({
      decision: "continue_discovery", reason: "Supported lead remains.", direction: null, confidence: 0.8,
    })).toBe(true);
    expect(normalizeAtlasRightHandControl({
      decision: "continue_discovery", reason: "35 same-scope leads remain.", direction: "continue_discovery", confidence: "high",
    })).toEqual({ decision: "continue_discovery", reason: "35 same-scope leads remain.", direction: null, confidence: 0.85 });
    expect(normalizeAtlasRightHandControl({
      decision: "pivot_discovery", reason: "Try another source family.", direction: "a different sector", confidence: "very high",
    })).toBeNull();
    expect(normalizeAtlasRightHandControlResponse(JSON.stringify({
      decision: "continue_discovery", reason: "35 same-scope leads remain.",
      direction: "continue_discovery", confidence: "high",
    }))).toEqual({
      decision: "continue_discovery", reason: "35 same-scope leads remain.",
      direction: null, confidence: 0.85,
    });
    expect(normalizeAtlasRightHandControlResponse(JSON.stringify({
      decision: "continue_discovery", reason: "Supported lead remains.",
      direction: null, confidence: "very high",
    }))).toBeNull();
    expect(normalizeAtlasRightHandControl({
      decision: "continue_discovery", reason: "r".repeat(601), direction: null, confidence: "high",
    })).toBeNull();
    expect(normalizeAtlasRightHandControl({
      decision: "pivot_discovery", reason: "Try a different source family.", direction: "d".repeat(601), confidence: 0.8,
    })).toBeNull();
    expect(validateAtlasRightHandControl({
      decision: "continue_discovery", reason: "r".repeat(601), direction: null, confidence: 0.8,
    })).toBe(false);
    expect(validateAtlasRightHandControl({
      decision: "pivot_discovery", reason: "Supported alternative.", direction: "d".repeat(601), confidence: 0.8,
    })).toBe(false);
  });

});


describe("Boss control prompt budget recovery", () => {
  it("keeps mandatory pinned state while shedding oversized optional history and route samples", () => {
    const leadUrls = Array.from({ length: 12 }, (_, index) =>
      `https://registry.example.test/records/company-${index + 1}?source=official`,
    );
    const pinnedControlState = buildAtlasPinnedControlState({
      activeScope: "Find operating B2B companies and current business decision-makers; use public professional sources only.",
      leadInventory: {
        searchResultLeadUrlCount: 12,
        successfullyFetchedLeadUrlCount: 1,
        unfetchedLeadUrlCount: 10,
        failedLeadUrlCount: 1,
        blockedLeadUrlCount: 0,
        unfetchedLeadUrls: leadUrls,
        unfetchedLeadObservations: [{
          turn: 1,
          action: "web_search",
          leadUrlCount: 12,
          observation: "Relevant company and decision-maker search results. " + "OPTIONAL_RESULT_DETAIL ".repeat(900),
        }],
        failedLeadUrls: [{
          url: "https://registry.example.test/failed-route",
          action: "visit",
          execution: "http_error",
          failureDomain: "external_page_fetch",
        }],
        blockedLeadUrls: [],
      },
      admittedCandidates: [{
        name: "Northstar Industrial Systems",
        role: "Chief Financial Officer",
        sourceUrls: ["https://northstar.example/about"],
        targetType: "organization",
      }],
      findings: [],
    });

    const prompt = buildAtlasBossControlPrompt({
      investigatorReport: "Large report history. " + "OPTIONAL_REPORT_DETAIL ".repeat(2_000),
      compactState: "Large durable historical projection. " + "OPTIONAL_HISTORY_DETAIL ".repeat(4_000),
      pinnedControlState,
      rightHand: {
        status: "completed",
        decision: "continue_discovery",
        reason: "The current run retains an unvisited source lead.",
        direction: null,
        confidence: 0.8,
        model: "test-model",
        error: null,
      },
    });

    expect(prompt.length).toBeLessThanOrEqual(ATLAS_BOSS_CONTROL_PROMPT_BUDGET);
    expect(prompt).toContain("Find operating B2B companies and current business decision-makers; use public professional sources only.");
    expect(prompt).toContain("Northstar Industrial Systems");
    expect(prompt).toContain('"unfetchedLeadUrlCount":10');
    expect(prompt).toContain(leadUrls[0]);
    expect(prompt).not.toContain("OPTIONAL_HISTORY_DETAIL ".repeat(100));
    expect(prompt).not.toContain("OPTIONAL_REPORT_DETAIL ".repeat(100));
    expect(prompt).toContain("Optional control context omitted");
  });

  it("fails closed when mandatory exact target inventory cannot fit", () => {
    const oversizedTargetInventory = "COMPLETE AVAILABLE REVIEW TARGETS " + "EXACT_TARGET ".repeat(20_000);
    expect(() => buildAtlasBossControlPrompt({
      investigatorReport: "",
      compactState: "",
      pinnedControlState: [
        "ACTIVE ACCEPTED BOSS SCOPE: Exact scope.",
        oversizedTargetInventory,
        "AUTHORITATIVE DURABLE LEAD COUNTS: searchResultLeadUrlCount=0; unfetchedLeadUrlCount=0.",
        "CONTROL LAW: Search leads are not evidence.",
      ].join("\n"),
      rightHand: {
        status: "unavailable",
        decision: null,
        reason: null,
        direction: null,
        confidence: null,
        model: "none",
        error: "unavailable",
      },
    })).toThrow(/mandatory scope, complete review-target inventory/);
  });
});

describe("Boss-owned target handoff judgment", () => {
  it("keeps target handoff as a model decision when source-attributed review targets exist", () => {
    const prompt = buildAtlasBossControlPrompt({
      investigatorReport: "One relevant source-attributed company has been admitted.",
      compactState: "One source-attributed admitted review target is available.",
      pinnedControlState: "ADMITTED REVIEW TARGETS: Northstar Manufacturing (organization), source URL observed.",
      rightHand: {
        status: "completed",
        decision: "investigate_now",
        reason: "The admitted company is relevant to the objective.",
        direction: null,
        confidence: 0.9,
        model: "test-model",
        error: null,
      },
    });
    expect(prompt).toContain("TARGET-HANDOFF CONSIDERATION (Boss judgment, not an execution gate)");
    expect(prompt).toContain("continue_discovery or pivot_discovery remains valid");
    expect(prompt).toContain("A review target is a lead, not proof or promotion");
    expect(prompt).not.toContain("MANDATORY EARLY HANDOFF");
    expect(prompt).not.toContain("continue_discovery and pivot_discovery are invalid");
  });
});

describe("Atlas Boss direction adoption", () => {
  it("requires Boss to explicitly carry an adopted Right-hand direction into the accepted objective", () => {
    const prompt = buildAtlasBossControlPrompt({
      investigatorReport: compactAtlasInvestigatorReport(reportWithUnfetchedLead()),
      compactState: "Current accepted objective is a broad owner/operator discovery mission.",
      rightHand: { status: "completed", decision: "continue_discovery", reason: "Explore Nordic public registries.", direction: "Investigate regional private manufacturers in Sweden using official business registers.", confidence: 0.8, model: "test-model", error: null },
    });
    expect(prompt).toContain("Right-hand is advisory");
    expect(prompt).toContain("null keeps the accepted scope");
    expect(prompt).toContain("preceding Investigator episode executed no external research action");
    expect(prompt).toContain("structured direction field");
  });
});

describe("Atlas Right-hand opening review normalization", () => {
  const valid = {
    approval: "approve",
    decision: "The opening scope has a plausible public-source path.",
    reason: "The scope is concrete and the evidence remains unverified until fetched.",
    focusLanes: ["official company filings", "company contact pages"],
    confidence: 0.7,
  };

  it("bounds harmless format drift while requiring a valid explicit approval", () => {
    const normalized = normalizeAtlasOpeningRightHandApprovalReview({
      ...valid,
      extraModelField: "unused",
      decision: "D".repeat(350),
      reason: "R".repeat(1_250),
      focusLanes: ["  official filing  ", "", ...Array.from({ length: 9 }, (_, i) => `lane-${i}`)],
    });
    expect(normalized).not.toBeNull();
    expect(validateAtlasOpeningRightHandApprovalReview(normalized)).toBe(true);
    expect(Object.keys(normalized ?? {}).sort()).toEqual(["approval", "confidence", "decision", "focusLanes", "reason"]);
    expect(normalized?.approval).toBe("approve");
    expect((normalized?.decision as string).length).toBe(300);
    expect((normalized?.reason as string).length).toBe(1_200);
    expect(normalized?.focusLanes).toEqual([
      "official filing",
      "lane-0",
      "lane-1",
      "lane-2",
      "lane-3",
      "lane-4",
      "lane-5",
      "lane-6",
    ]);
  });

  it("never repairs an ambiguous approval, invalid confidence, or missing required values", () => {
    expect(normalizeAtlasOpeningRightHandApprovalReview({ ...valid, approval: "maybe" })).toBeNull();
    expect(normalizeAtlasOpeningRightHandApprovalReview({ ...valid, confidence: 1.5 })).toBeNull();
    expect(normalizeAtlasOpeningRightHandApprovalReview({ ...valid, reason: 12 })).toBeNull();
    expect(normalizeAtlasOpeningRightHandApprovalReview({ ...valid, focusLanes: ["ok", 12] })).toBeNull();
    expect(normalizeAtlasOpeningRightHandApprovalReview({ decision: "x", reason: "y" })).toBeNull();
  });
});

describe("Right-hand advisory authority", () => {
  it("keeps Right-hand advisory while making consequential review conditional", () => {
    const source = readFileSync(new URL("./atlas-control-decision.ts", import.meta.url), "utf8");
    expect(source).toContain("Right-hand remains advisory; Boss owns every control decision.");
    expect(source).toContain("Right-hand review is invoked only for consequential, evidence-bearing");
    expect(source).toContain('status: "deferred"');
    expect(source).toContain('reviewDeferred: input.rightHand.status === "deferred"');
    expect(source).not.toContain('if (rightHand.status !== "completed" && !input.rightHandOverride) return finalize');
    const prompt = buildAtlasBossControlPrompt({
      investigatorReport: compactAtlasInvestigatorReport(reportWithUnfetchedLead()),
      compactState: "Durable case state is available.",
      rightHand: { status: "unavailable", decision: null, reason: null, direction: null, confidence: null, model: "none", error: "provider unavailable" },
    });
    expect(prompt).toContain("If Right-hand is unavailable, make an independent Boss decision");
  });
});

describe("Atlas opening Right-hand advisory normalization", () => {
  it("normalizes the observed rationale alias and textual confidence without changing advisory meaning", () => {
    const normalized = normalizeAtlasOpeningRightHandReview({
      decision: "proceed",
      rationale: "The public-web lane is available; no jurisdiction was supplied.",
      focusLanes: ["public_web"],
      confidence: "high",
    });

    expect(normalized).toEqual({
      decision: "proceed",
      reason: "The public-web lane is available; no jurisdiction was supplied.",
      focusLanes: ["public_web"],
      confidence: 0.75,
    });
    expect(validateAtlasOpeningRightHandReview(normalized)).toBe(true);
  });

  it("preserves a valid numeric confidence and trims harmless whitespace", () => {
    expect(normalizeAtlasOpeningRightHandReview({
      decision: " proceed ",
      reason: "  Continue under the exact human objective. ",
      focusLanes: [" public_web ", " registry:gleif "],
      confidence: 0.73,
    })).toEqual({
      decision: "proceed",
      reason: "Continue under the exact human objective.",
      focusLanes: ["public_web", "registry:gleif"],
      confidence: 0.73,
    });
  });

  it("rejects conflicting aliases, unknown fields, invalid confidence and missing required fields", () => {
    const base = {
      decision: "proceed",
      reason: "Proceed under the exact objective.",
      focusLanes: ["public_web"],
      confidence: 0.75,
    };
    expect(normalizeAtlasOpeningRightHandReview({ ...base, rationale: "A conflicting rationale." })).toBeNull();
    expect(normalizeAtlasOpeningRightHandReview({ ...base, debug: "unexpected" })).toBeNull();
    expect(normalizeAtlasOpeningRightHandReview({ ...base, reason: null, rationale: "Valid-looking alias." })).toBeNull();
    expect(normalizeAtlasOpeningRightHandReview({ ...base, confidence: "certain" })).toBeNull();
    expect(normalizeAtlasOpeningRightHandReview({ ...base, confidence: 1.2 })).toBeNull();
    expect(normalizeAtlasOpeningRightHandReview({ ...base, focusLanes: [" "] })).toBeNull();
    expect(normalizeAtlasOpeningRightHandReview({ decision: "proceed", rationale: "No lanes or confidence." })).toBeNull();
  });

  it("keeps the persisted review schema strict after normalization", () => {
    const raw = {
      decision: "proceed",
      rationale: "The public-web lane is available.",
      focusLanes: ["public_web"],
      confidence: "medium",
    };
    expect(validateAtlasOpeningRightHandReview(raw)).toBe(false);
    expect(validateAtlasOpeningRightHandReview(normalizeAtlasOpeningRightHandReview(raw))).toBe(true);
  });
});

