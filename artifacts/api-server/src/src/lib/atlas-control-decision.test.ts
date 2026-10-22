import { describe, expect, it } from "vitest";
import {
  ATLAS_RIGHT_HAND_CONTROL_PROMPT_BUDGET,
  ATLAS_RIGHT_HAND_CONTROL_RESPONSE_FORMAT,
  atlasLeadUtilizationLaw,
  atlasRegistryFeasibilityLaw,
  buildAtlasBossControlPrompt,
  buildAtlasPinnedControlState,
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
    }))) as { openQuestions: Array<{ observedUrls: string[]; unfetchedLeadUrls: string[] }> };

    expect(report.openQuestions[0].observedUrls).toEqual([longUrl]);
    expect(report.openQuestions[0].unfetchedLeadUrls).toEqual([longUrl]);
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
    const report = JSON.parse(compact) as { openQuestions: Array<{ unfetchedLeadUrls: string[]; unfetchedLeadUrlCount: number; unfetchedLeadUrlsOmittedFromPromptCount: number }> };
    expect(report.openQuestions[0].unfetchedLeadUrls).toEqual([]);
    expect(report.openQuestions[0].unfetchedLeadUrlCount).toBe(1);
    expect(report.openQuestions[0].unfetchedLeadUrlsOmittedFromPromptCount).toBe(1);
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
    expect(pinned).not.toContain(longUrl.slice(0, 110));

    const oversizedUrl = "https://registry.example.test/records/" + "c".repeat(700);
    const omitted = buildAtlasPinnedControlState(makeInput(oversizedUrl));
    expect(omitted).toContain("1 URL(s) omitted whole from this prompt sample");
    expect(omitted).not.toContain(oversizedUrl.slice(0, 110));
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


describe("Atlas Boss direction adoption", () => {
  it("requires Boss to explicitly carry an adopted Right-hand direction into the accepted objective", () => {
    const prompt = buildAtlasBossControlPrompt({
      investigatorReport: compactAtlasInvestigatorReport(reportWithUnfetchedLead()),
      compactState: "Current accepted objective is a broad owner/operator discovery mission.",
      rightHand: { status: "completed", decision: "continue_discovery", reason: "Explore Nordic public registries.", direction: "Investigate regional private manufacturers in Sweden using official business registers.", confidence: 0.8, model: "test-model", error: null },
    });
    expect(prompt).toContain("Right-hand is advisory");
    expect(prompt).toContain("null keeps the accepted scope");
  });
});
