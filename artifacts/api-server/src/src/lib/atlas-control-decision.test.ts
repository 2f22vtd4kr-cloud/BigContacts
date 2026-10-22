import { describe, expect, it } from "vitest";
import {
  ATLAS_RIGHT_HAND_CONTROL_PROMPT_BUDGET,
  ATLAS_RIGHT_HAND_CONTROL_RESPONSE_FORMAT,
  atlasLeadUtilizationLaw,
  atlasRegistryFeasibilityLaw,
  buildAtlasBossControlPrompt,
  validateAtlasRightHandControl,
  buildAtlasRightHandControlPrompt,
  compactAtlasInvestigatorReport,
} from "./atlas-control-decision";

const leadUrl = "https://businesssearch.ohiosos.gov/";

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
  it("preserves explicitly unfetched search leads in the compact Investigator report", () => {
    const compact = compactAtlasInvestigatorReport(reportWithUnfetchedLead());
    expect(compact).toContain('"unfetchedLeadUrls"');
    expect(compact).toContain(leadUrl);
    expect(compact).toContain('"visits": 0');
  });

  it("shows Right-hand that search leads are not evidence and blocks are not negative findings", () => {
    const prompt = buildAtlasRightHandControlPrompt({
      investigatorReport: compactAtlasInvestigatorReport(reportWithUnfetchedLead()),
      compactState: "Successful searches: 1. Successful visits: 0. A preflight action was blocked before outbound execution.",
    });
    expect(prompt).toContain(leadUrl);
    expect(prompt).toContain("unfetchedLeadUrls");
    expect(prompt).toContain("these are leads, not evidence");
    expect(prompt).toContain("A blocked request cannot support a claim that a registry or sector lacks ownership information.");
  });

  it("shows Boss the same lead provenance without prescribing a fixed tool order", () => {
    const prompt = buildAtlasBossControlPrompt({
      investigatorReport: compactAtlasInvestigatorReport(reportWithUnfetchedLead()),
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
  it("grounds both supervisors in runtime registry capabilities and evidence-backed field assumptions", () => {
    const law = atlasRegistryFeasibilityLaw();
    expect(law).toContain("RUNTIME-CALLABLE REGISTRY IDS");
    expect(law).toContain("sec-edgar");
    expect(law).not.toContain("inbiz");
    expect(law).toContain("A generic agency landing page does not prove that a dedicated register exists");
    expect(law).toContain("frame it as a testable hypothesis");
    expect(atlasLeadUtilizationLaw()).toContain("Do not treat lack of findings from snippets");
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
    expect(buildAtlasRightHandControlPrompt(input)).toContain("LEAD-UTILIZATION JUDGMENT");
    expect(buildAtlasBossControlPrompt(input)).toContain("LEAD-UTILIZATION JUDGMENT");
    expect(buildAtlasRightHandControlPrompt(input)).toContain("A generic agency landing page does not prove that a dedicated register exists");
    expect(buildAtlasBossControlPrompt(input)).toContain("A generic agency landing page does not prove that a dedicated register exists");
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
    });

    expect(ATLAS_RIGHT_HAND_CONTROL_PROMPT_BUDGET).toBe(9_600);
    expect(prompt.length).toBeLessThanOrEqual(ATLAS_RIGHT_HAND_CONTROL_PROMPT_BUDGET);
    expect(ATLAS_RIGHT_HAND_CONTROL_RESPONSE_FORMAT.schema.properties.reason.maxLength).toBe(600);
    expect(ATLAS_RIGHT_HAND_CONTROL_RESPONSE_FORMAT.schema.properties.direction.maxLength).toBe(600);
    expect(ATLAS_RIGHT_HAND_CONTROL_RESPONSE_FORMAT.schema.required).toEqual([
      "decision", "reason", "direction", "confidence",
    ]);
    expect(validateAtlasRightHandControl({
      decision: "continue_discovery", reason: "Supported lead remains.", direction: null, confidence: 0.8,
    })).toBe(true);
    expect(validateAtlasRightHandControl({
      decision: "continue_discovery", reason: "r".repeat(601), direction: null, confidence: 0.8,
    })).toBe(false);
    expect(validateAtlasRightHandControl({
      decision: "pivot_discovery", reason: "Supported alternative.", direction: "d".repeat(601), confidence: 0.8,
    })).toBe(false);
  });

});


describe("Atlas control prompt preserves authoritative case-wide lead state", () => {
  it("keeps top-level lead counts and URL examples during report compaction and outside supervisor report clipping", () => {
    const raw = JSON.parse(reportWithUnfetchedLead()) as Record<string, unknown>;
    raw.searchResultLeadUrlCount = 70;
    raw.successfullyFetchedLeadUrlCount = 12;
    raw.unfetchedLeadUrlCount = 32;
    raw.failedLeadUrlCount = 4;
    raw.blockedLeadUrlCount = 1;
    raw.unfetchedLeadUrls = [leadUrl, "https://example.org/second-unfetched"];
    raw.failedLeadUrls = [{ url: "https://example.net/failed", action: "visit", execution: "http_error", failureDomain: "external_page_fetch", failureKind: "request_failure" }];
    raw.blockedLeadUrls = [{ url: "https://example.gov/blocked", action: "visit", failureDomain: "preflight", failureKind: "scope_guard" }];
    raw.findings = Array.from({ length: 8 }, (_, index) => ({
      vectorType: "other", value: "long factual finding " + index, personName: null, role: null,
      scope: "organization", sourceUrls: [leadUrl], note: "f".repeat(1_000),
    }));
    raw.repeatedHistory = "large middle context ".repeat(2_000);
    const report = compactAtlasInvestigatorReport(JSON.stringify(raw));
    expect(report).toContain('"unfetchedLeadUrlCount": 32');
    expect(report).toContain('"unfetchedLeadUrls"');
    expect(report).toContain(leadUrl);
    expect(report).toContain('"failedLeadUrlCount": 4');
    expect(report).toContain('"blockedLeadUrlCount": 1');

    const rightHandPrompt = buildAtlasRightHandControlPrompt({ investigatorReport: report, compactState: "compact durable case context" });
    const bossPrompt = buildAtlasBossControlPrompt({
      investigatorReport: report,
      compactState: "compact durable case context",
      rightHand: { status: "completed", decision: "continue_discovery", reason: "There are unfetched leads.", direction: null, confidence: 0.8, model: "test-model", error: null },
    });
    for (const prompt of [rightHandPrompt, bossPrompt]) {
      expect(prompt).toContain("AUTHORITATIVE CASE-WIDE LEAD INVENTORY");
      expect(prompt).toContain("unfetchedLeadUrlCount=32");
      expect(prompt).toContain(leadUrl);
      expect(prompt).toContain("https://example.org/second-unfetched");
      expect(prompt).toContain("failedLeadUrlCount=4");
      expect(prompt).toContain("blockedLeadUrlCount=1");
    }
    expect(rightHandPrompt.length).toBeLessThanOrEqual(9_600);
    expect(bossPrompt.length).toBeLessThanOrEqual(12_976);
  });

  it("makes explicit that Boss, not Right-hand, owns whether to adopt a proposed direction", () => {
    const report = compactAtlasInvestigatorReport(reportWithUnfetchedLead());
    const prompt = buildAtlasBossControlPrompt({
      investigatorReport: report,
      compactState: "Current accepted objective is a broad owner/operator discovery mission.",
      rightHand: { status: "completed", decision: "continue_discovery", reason: "Explore Nordic public registries.", direction: "Investigate regional private manufacturers in Sweden using official business registers.", confidence: 0.8, model: "test-model", error: null },
    });
    expect(prompt).toContain("Right-hand remains advisory");
    expect(prompt).toContain("a null direction means deliberately continuing the existing accepted objective");
  });
});
