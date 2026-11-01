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
      failedLeadUrls: [],
      blockedLeadUrls: [],
    },
    admittedCandidates: [],
    findings: [],
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

  it("shows Right-hand that search leads are not evidence and blocks are not negative findings", () => {
    const prompt = buildAtlasRightHandControlPrompt({
      investigatorReport: compactAtlasInvestigatorReport(reportWithUnfetchedLead()),
      pinnedControlState: pinnedStateWithUnfetchedLead(),
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

  it("restricts the opening Boss response to start or stop with no target or direction", () => {
    expect(ATLAS_BOSS_OPENING_CONTROL_RESPONSE_FORMAT.schema.properties.action.enum).toEqual(["continue_discovery", "stop"]);
    expect(ATLAS_BOSS_OPENING_CONTROL_RESPONSE_FORMAT.schema.properties.candidateName.type).toBe("null");
    expect(ATLAS_BOSS_OPENING_CONTROL_RESPONSE_FORMAT.schema.properties.candidateType.type).toBe("null");
    expect(ATLAS_BOSS_OPENING_CONTROL_RESPONSE_FORMAT.schema.properties.direction.type).toBe("null");
  });

  it("fits the full opening objective without duplicating it in pinned control state", () => {
    const humanObjective = `Find source-backed private-business owners with realistic professional contact routes. ${"Use observed public evidence and do not invent geography. ".repeat(34)}`;
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
    expect(prompt).toContain("Right-hand advice");
    expect(prompt.length).toBeLessThanOrEqual(ATLAS_BOSS_CONTROL_PROMPT_BUDGET);
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

  it("keeps the Right-hand focused on an available target and does not request geography expansion", () => {
    const prompt = buildAtlasRightHandControlPrompt({
      investigatorReport: compactAtlasInvestigatorReport(reportWithUnfetchedLead()),
      compactState: "One official registry result identifies a potentially relevant company.",
      pinnedControlState: "One source-attributed organization review target is available.",
    });
    expect(prompt).toContain("when one relevant source-attributed review target is available");
    expect(prompt).toContain("Do not request more broad discovery");
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
  it("does not veto Boss decisions when Right-hand is unavailable on a later turn", () => {
    const source = readFileSync(new URL("./atlas-control-decision.ts", import.meta.url), "utf8");
    expect(source).toContain("Right-hand is advisory on every turn");
    expect(source).not.toContain('if (rightHand.status !== "completed" && !input.rightHandOverride) return finalize');
    const prompt = buildAtlasBossControlPrompt({
      investigatorReport: compactAtlasInvestigatorReport(reportWithUnfetchedLead()),
      compactState: "Durable case state is available.",
      rightHand: { status: "unavailable", decision: null, reason: null, direction: null, confidence: null, model: "none", error: "provider unavailable" },
    });
    expect(prompt).toContain("If Right-hand is unavailable, make an independent Boss decision");
  });
});

