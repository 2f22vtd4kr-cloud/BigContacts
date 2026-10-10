import { describe, expect, it } from "vitest";
import { boundInvestigatorPromptSection, buildBoundedInvestigatorObjective, buildInvestigatorContext, compactInvestigationContext, getInvestigatorContextBudget, tightenInvestigatorPrompt } from "../lib/investigation-context-compaction";

describe("investigator context compaction", () => {
  it("bounds working context while retaining old source URLs in the archive index", () => {
    const records = Array.from({ length: 30 }, (_, index) => ({
      turn: index + 1, model: "groq:test", action: index % 2 ? "visit" : "web_search", execution: "success",
      observedUrls: ["https://example.com/source/" + (index + 1)], observation: "A".repeat(4_000),
      findings: [{ vectorType: "website", value: "https://example.com/entity/" + (index + 1), sourceUrls: ["https://example.com/source/" + (index + 1)], personName: index === 29 ? "Named Person" : null, role: null, scope: "candidate", note: "observed" }],
    }));
    const context = buildInvestigatorContext({ targetName: "Named Person", objective: "Find a defensible public contact route.", trajectoryRecords: records, lastObservation: "Latest observation " + "B".repeat(8_000), findings: records[29].findings });
    expect(context.length).toBeLessThanOrEqual(getInvestigatorContextBudget().maxChars);
    expect(context).toContain("TURN 30");
    expect(context).toContain("https://example.com/source/30");
    expect(context).toContain("https://example.com/source/30");
    expect(context).toContain("Named Person");
    expect(context).toContain("RESEARCH FRONTIER");
  });

  it("redacts URL credentials from reloaded trajectory, findings, and prior context", () => {
    const secret = "context-oauth-secret";
    const context = buildInvestigatorContext({
      targetName: "Example",
      objective: "Review public sources.",
      priorContext: "Old redirect https://example.com/callback?access_token=" + secret,
      trajectoryRecords: [{
        turn: 4,
        action: "visit",
        execution: "success",
        observedUrls: ["https://example.com/profile?X-Amz-Signature=signature-secret"],
        observation: "Redirected to https://example.com/callback?access_token=" + secret + "&state=known.",
        findings: [{
          vectorType: "website",
          value: "https://example.com/profile",
          sourceUrls: ["https://example.com/profile?token=" + secret],
          personName: "Example Person",
          scope: "candidate",
          note: "Observed https://example.com/contact?api_key=" + secret,
        }],
      }],
      lastObservation: "Latest redirect https://example.com/callback?token=" + secret,
      findings: [],
    });
    expect(context).not.toContain(secret);
    expect(context).not.toContain("signature-secret");
    expect(context).toContain("Example Person");
    expect(context).toContain("REDACTED");
  });

  it("preserves the Boss research question after objective/context compaction", () => {
    const objective = buildBoundedInvestigatorObjective({
      base: "PRIMARY OPERATOR OBJECTIVE BEGIN " + "Context ".repeat(1_500) + " PRIMARY OPERATOR OBJECTIVE END",
      direction: "Verify whether the named director is attributable to the target organization using independent official sources.",
    });
    const context = buildInvestigatorContext({
      targetName: "Target Organization",
      objective,
      priorContext: "DURABLE CASE CONTEXT " + "P".repeat(5_000),
      trajectoryRecords: [{ turn: 12, action: "visit", execution: "success", observedUrls: ["https://official.example/record"], observation: "Existing observed record." }],
      lastObservation: "Latest observation",
      findings: [],
      maxChars: 3_500,
    });

    expect(objective.length).toBeLessThanOrEqual(1_900);
    expect(objective).toContain("PRIMARY CASE OBJECTIVE");
    expect(objective).toContain("PRIMARY OPERATOR OBJECTIVE BEGIN");
    expect(objective).toContain("PRIMARY OPERATOR OBJECTIVE END");
    expect(objective).toContain("CURRENT BOSS-DIRECTED RESEARCH QUESTION");
    expect(objective).toContain("Verify whether the named director");
    expect(objective).toContain("Choose the next research action yourself");
    expect(context).toContain("CURRENT BOSS-DIRECTED RESEARCH QUESTION");
    expect(context).toContain("Verify whether the named director");
    expect(context).toContain("LATEST TRAJECTORY RECORD");
  });

  it("keeps the objective and latest observation explicit", () => {
    const context = buildInvestigatorContext({ targetName: "Alice Example", objective: "Resolve whether Alice Example is the same person as the executive in source B.", trajectoryRecords: [{ turn: 1, action: "web_search", execution: "success", observedUrls: ["https://source-a.example/profile"], observation: "Long old observation" }], lastObservation: "Current source says the role changed.", findings: [] });
    expect(context).toContain("OBJECTIVE: Resolve whether Alice Example is the same person as the executive in source B.");
    expect(context).toContain("LATEST TRAJECTORY RECORD");
    expect(context).toContain("source-a.example/profile");
  });

  it("reserves the latest trajectory record even when earlier state is oversized", () => {
    const context = buildInvestigatorContext({
      targetName: "Named Person",
      objective: "O".repeat(20_000),
      priorContext: "P".repeat(10_000),
      trajectoryRecords: [
        { turn: 1, action: "visit", execution: "success", observedUrls: ["https://old.example/page"], observation: "old evidence" },
        { turn: 2, action: "visit", execution: "success", observedUrls: ["https://latest.example/page"], observation: "LATEST UNIQUE OBSERVATION MUST SURVIVE COMPACTION" },
      ],
      lastObservation: "fallback latest observation",
      findings: [],
    });
    expect(context.length).toBeLessThanOrEqual(getInvestigatorContextBudget().maxChars);
    expect(context).toContain("LATEST TRAJECTORY RECORD");
    expect(context).toContain("https://latest.example/page");
    expect(context).toContain("LATEST UNIQUE OBSERVATION MUST SURVIVE COMPACTION");
  });

  it("keeps exact observed URLs in archived history", () => {
    const context = buildInvestigatorContext({ targetName: "Example", objective: "Verify the target.", trajectoryRecords: [
      { turn: 1, action: "visit", execution: "success", observedUrls: ["https://example.com/a#fragment", "https://example.com/b"], observation: "content" },
      { turn: 2, action: "visit", execution: "success", observedUrls: ["https://example.com/c"], observation: "content" },
      { turn: 3, action: "visit", execution: "success", observedUrls: ["https://example.com/d"], observation: "content" },
    ], lastObservation: "latest", findings: [] });
    expect(context).toContain("https://example.com/a#fragment");
    expect(context).toContain("https://example.com/b");
  });

  it("emergency request-size compaction preserves prompt contract boundaries", () => {
    const prompt = "INSTITUTIONAL CONTRACT\nOBJECTIVE: preserve this\n" + "M".repeat(20_000) + "\nLATEST ACTION INSTRUCTIONS: choose one action and return JSON.";
    const reduced = tightenInvestigatorPrompt(prompt, 12_000);
    expect(reduced.length).toBeLessThanOrEqual(12_000);
    expect(reduced).toContain("INSTITUTIONAL CONTRACT");
    expect(reduced).toContain("LATEST ACTION INSTRUCTIONS");
    expect(reduced).toContain("EMERGENCY REQUEST-SIZE COMPACTION");
  });

  it("keeps state, evidence, and trajectory sections visible in compatibility compaction", () => {
    const result = compactInvestigationContext({
      raw: "CURRENT CASE STATE " + "X".repeat(10_000),
      evidenceGraphSummaries: ["EVIDENCE SOURCE https://evidence.example/source"],
      trajectoryRecords: [{ turn: 4, action: "visit", execution: "success", observedUrls: ["https://trajectory.example/page"], observation: "latest structured observation" }],
      trajectory: ["step4: visit https://trajectory.example/page execution=success observed=https://trajectory.example/page"],
      maxChars: 10_000,
    });
    expect(result).toContain("CURRENT STATE");
    expect(result).toContain("EVIDENCE GRAPH SUMMARY");
    expect(result).toContain("TRAJECTORY RECORDS");
    expect(result).toContain("TRAJECTORY NOTES");
    expect(result).toContain("trajectory.example/page");
  });

  it("honors the small explicit latest-observation budget", () => {
    const value = "LATEST OBSERVATION HEAD " + "X".repeat(5_000) + " LATEST OBSERVATION TAIL";
    const bounded = boundInvestigatorPromptSection(value, 220);
    expect(bounded.length).toBeLessThanOrEqual(220);
    expect(bounded).toContain("LATEST OBSERVATION HEAD");
    expect(bounded).toContain("LATEST OBSERVATION TAIL");
    expect(bounded).toContain("AUXILIARY CONTEXT BOUND");
  });

  it("bounds auxiliary intelligence state independently of trajectory compaction", () => {
    const value = "HEAD STATE " + "X".repeat(40_000) + " LATEST STATE";
    const bounded = boundInvestigatorPromptSection(value, 6_000);
    expect(bounded.length).toBeLessThanOrEqual(6_000);
    expect(bounded).toContain("HEAD STATE");
    expect(bounded).toContain("LATEST STATE");
    expect(bounded).toContain("AUXILIARY CONTEXT BOUND");
  });

  it("keeps the compatibility helper bounded", () => {
    const result = compactInvestigationContext({ raw: "X".repeat(30_000), maxChars: 10_000, trajectory: ["Y".repeat(10_000)], evidenceGraphSummaries: ["Z".repeat(10_000)] });
    expect(result.length).toBeLessThanOrEqual(10_000);
  });
});