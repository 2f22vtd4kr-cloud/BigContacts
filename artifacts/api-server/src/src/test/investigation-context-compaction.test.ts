import { describe, expect, it } from "vitest";
import { extractAiContextUrls, splitAiContextIntoChunks } from "../lib/ai-investigation-context-compaction";
import { boundInvestigatorPromptSection, buildBoundedInvestigatorObjective, buildInvestigatorContext, compactCanonicalDiscoveryContinuationContext, compactInvestigationContext, compactPromptSectionPreservingUrlTokens, getInvestigatorContextBudget, shouldCreateInvestigatorResearchMemory, tightenInvestigatorPrompt } from "../lib/investigation-context-compaction";

describe("AI-driven investigation memory compaction transport", () => {
  it("splits only for transport and retains every source character and repeated URL", () => {
    const url = "https://registry.example.test/filings/ownership-record-123";
    const source = (
      "EARLY FACT: The filing names Alice Example as a director. " +
      "Historical evidence and unresolved question. ".repeat(8) +
      "FIRST SOURCE: " + url + ". The filing is a lead until fetched.\n" +
      "MIDDLE CONTEXT: " + "boilerplate that must be summarized by the model, not dropped by chunking. ".repeat(3) +
      "\nSECOND SOURCE REFERENCE: " + url + ". Re-check only if new evidence justifies it."
    );
    const chunks = splitAiContextIntoChunks(source, 180);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("")).toBe(source);
    expect(chunks.reduce((count, chunk) => count + chunk.split(url).length - 1, 0)).toBe(2);
    expect(extractAiContextUrls(source)).toEqual([url]);
  });

  it("keeps oversized URL tokens atomic even if the soft chunk budget must be exceeded", () => {
    const url = "https://registry.example.test/" + "x".repeat(230);
    const source = "A".repeat(90) + " " + url + " " + "B".repeat(90);
    const chunks = splitAiContextIntoChunks(source, 160);
    expect(chunks.join("")).toBe(source);
    expect(chunks.reduce((count, chunk) => count + chunk.split(url).length - 1, 0)).toBe(1);
  });
});

describe("investigator context compaction", () => {
  it("does not invoke AI memory compaction on a fresh first turn with no historical Investigator records", () => {
    expect(shouldCreateInvestigatorResearchMemory({ hasExistingMemory: false, historicalRecordCount: 0, sourceChars: 12_000, priorContextChars: 4_000 })).toBe(false);
  });

  it("compacts long control context only when there is actual historical research to summarize", () => {
    expect(shouldCreateInvestigatorResearchMemory({ hasExistingMemory: false, historicalRecordCount: 2, sourceChars: 12_000, priorContextChars: 4_000 })).toBe(true);
    expect(shouldCreateInvestigatorResearchMemory({ hasExistingMemory: true, historicalRecordCount: 2, sourceChars: 12_000, priorContextChars: 4_000 })).toBe(false);
  });
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
    expect(objective).toContain("Treat the Boss-directed question as a hypothesis");
    expect(objective).toContain("feasible public-source question");
    expect(objective).toContain("Keep each action directly relevant to the current question");
    expect(objective).toContain("unrelated homonyms or meanings");
    expect(objective).toContain("CURRENT BOSS-DIRECTED RESEARCH QUESTION");
    expect(objective).toContain("Verify whether the named director");
    expect(objective).toContain("Choose each next action yourself");
    expect(context).toContain("CURRENT BOSS-DIRECTED RESEARCH QUESTION");
    expect(context).toContain("Verify whether the named director");
    expect(context).toContain("LATEST TRAJECTORY RECORD");
  });

  it("preserves the structured Boss question when the per-act wrapper bounds it again", () => {
    const originalDirection = "Perform registry queries on Zefix/Swiss commercial register for family-owned mid-market firms in the target sectors.";
    const first = buildBoundedInvestigatorObjective({
      base: "Discover under-the-radar people with credible wealth potential and realistic public routes.",
      direction: originalDirection,
      maxChars: 1_800,
    });
    const repeated = buildBoundedInvestigatorObjective({
      base: first,
      maxChars: 1_800,
    });

    expect(repeated).toContain("Discover under-the-radar people with credible wealth potential");
    expect(repeated).toContain("CURRENT BOSS-DIRECTED RESEARCH QUESTION");
    expect(repeated).toContain(originalDirection);
    expect(repeated.match(/PRIMARY CASE OBJECTIVE:/g)).toHaveLength(1);
    expect(repeated.match(/CURRENT BOSS-DIRECTED RESEARCH QUESTION/g)).toHaveLength(1);

    const nextDirection = "Verify named owners through official cantonal registry filings.";
    const redirected = buildBoundedInvestigatorObjective({
      base: first,
      direction: nextDirection,
      maxChars: 1_800,
    });
    expect(redirected).toContain(nextDirection);
    expect(redirected).not.toContain(originalDirection);
    expect(redirected.match(/PRIMARY CASE OBJECTIVE:/g)).toHaveLength(1);
  });

  it("preserves a multiline Boss pivot embedded after the marker without a separate direction", () => {
    const objective = buildBoundedInvestigatorObjective({
      base: [
        "PRIMARY OPERATOR OBJECTIVE: discover source-backed named individuals.",
        "BOSS-DIRECTED RESEARCH QUESTION / PIVOT:",
        "Find a named officer in an official SEC filing.",
        "Cross-check the officer role on an official company leadership page.",
      ].join("\n"),
    });

    expect(objective.length).toBeLessThanOrEqual(1_900);
    expect(objective).toContain("CURRENT BOSS-DIRECTED RESEARCH QUESTION");
    expect(objective).toContain("Find a named officer in an official SEC filing.");
    expect(objective).toContain("Cross-check the officer role on an official company leadership page.");
  });

  it("preserves durable source-span bindings and typed failure diagnostics in compacted trajectory memory", () => {
    const context = buildInvestigatorContext({
      targetName: "Example Holdings",
      objective: "Verify the company and its ownership using public sources.",
      trajectoryRecords: [{
        turn: 4, action: "visit", execution: "error", observedUrls: ["https://registry.example.test/company/1"],
        observation: "The provider failed before the page could be observed.",
        failureDomain: "external_page_fetch", failureKind: "request_failure",
        sourceBindings: [{ findingValue: "Example Holdings", sourceUrl: "https://registry.example.test/company/1", sourceTurn: 3, spanStart: 12, spanEnd: 28, pageNumber: 2 }],
      }],
      lastObservation: "The provider failed before the page could be observed.",
      findings: [],
    });
    expect(context).toContain("FAILURE_DIAGNOSTIC: domain=external_page_fetch kind=request_failure");
    expect(context).toContain("SOURCE_SPAN_BINDINGS");
    expect(context).toContain("Example Holdings");
    expect(context).toContain("https://registry.example.test/company/1");
    expect(context).toContain("sourceTurn=3");
    expect(context).toContain("span=12-28");
    expect(context).toContain("page=2");
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

  it("bounds continuation context while preserving case framing and latest durable material", () => {
    const durableContext = [
      "PRIMARY CASE OBJECTIVE: discover source-backed people connected to the original mission.",
      "EARLY CASE HISTORY: " + "historical source and action detail ".repeat(4_000),
      "LATEST DURABLE EVIDENCE: Washington corporate filing search returned leads; no fetched-page finding is established yet.",
    ].join("\n");
    const compacted = compactCanonicalDiscoveryContinuationContext(durableContext, 7_000);

    expect(compacted.length).toBeLessThanOrEqual(7_000);
    expect(compacted).toContain("PRIMARY CASE OBJECTIVE");
    expect(compacted).toContain("DISCOVERY CONTINUATION CONTEXT COMPACTED");
    expect(compacted).toContain("LATEST DURABLE EVIDENCE");
    expect(compacted).toContain("no fetched-page finding is established yet");
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

  it("reallocates space lost to a leading long URL so the fetched-page tail claim survives", () => {
    const longUrl = "https://registry.example.test/filings/" + "a".repeat(95);
    const source = [
      "PDF PAGE " + longUrl,
      "Issuer boilerplate and repeated document headings. ".repeat(70),
      "FACT_AT_END_SENTINEL: The filing states that the company acquired a majority stake in Example Components Private Limited.",
    ].join(" ");
    const compacted = compactPromptSectionPreservingUrlTokens(source, 300);

    expect(compacted.length).toBeLessThanOrEqual(300);
    expect(compacted).toContain("URL tokens intersecting excerpt edges are omitted whole");
    expect(compacted).not.toContain(longUrl.slice(0, 80));
    expect(compacted).toContain("FACT_AT_END_SENTINEL");
    expect(compacted).toContain("acquired a majority stake");
  });

  it("omits whole URL tokens when emergency head-tail compaction would split one", () => {
    const longUrl = "https://registry.example.test/filings/" + "a".repeat(250);
    const source = "H".repeat(60) + " " + longUrl + " " + "T".repeat(140);
    const compacted = compactPromptSectionPreservingUrlTokens(source, 300);

    expect(compacted.length).toBeLessThanOrEqual(300);
    expect(compacted).toContain("URL tokens intersecting excerpt edges are omitted whole");
    expect(compacted).not.toContain(longUrl.slice(0, 80));
    expect(compacted).not.toContain(longUrl);
    expect(compacted.startsWith("H".repeat(40))).toBe(true);
    expect(compacted.endsWith("T".repeat(40))).toBe(true);
  });

  it("preserves a complete long URL instead of shortening it to a misleading prefix", () => {
    const longUrl = "https://registry.example.test/filings/" + "b".repeat(300);
    const compacted = compactPromptSectionPreservingUrlTokens("SOURCE URL: " + longUrl, 500);
    expect(compacted).toContain(longUrl);
    expect(compacted).not.toContain("[URL omitted whole]");
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

  it("does not return the full context when the requested budget is smaller than the omission marker", () => {
    const value = "HEAD " + "X".repeat(20_000) + " TAIL";
    const bounded = boundInvestigatorPromptSection(value, 1);
    expect(bounded.length).toBeLessThanOrEqual(100);
    expect(bounded).toContain("AUXILIARY CONTEXT BOUND");
    expect(bounded).not.toContain("X".repeat(1_000));
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