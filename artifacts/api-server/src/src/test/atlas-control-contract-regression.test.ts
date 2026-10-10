import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateResearchObjective } from "../lib/research-objective";
import { ATLAS_BOSS_CONTROL_PROMPT_BUDGET, ATLAS_OPENING_RIGHT_HAND_REVIEW_RESPONSE_FORMAT, buildAtlasBossControlPrompt, buildAtlasControlEventPayload, buildAtlasRightHandControlPrompt, classifyAtlasBossContractFailure, classifyAtlasBossGenerationFailure, diagnoseAtlasBossControlContract, validateAtlasBossControl, validateAtlasOpeningRightHandReview, validateAtlasRightHandControl } from "../lib/atlas-control-decision";

const controlSource = readFileSync(resolve(process.cwd(), "src/src/lib/atlas-control-decision.ts"), "utf8");
const bossSource = readFileSync(resolve(process.cwd(), "src/src/lib/groq-boss.ts"), "utf8");
const rightHandSource = readFileSync(resolve(process.cwd(), "src/src/lib/groq-right-hand-reasoning.ts"), "utf8");
const canonicalDiscoverySource = readFileSync(resolve(process.cwd(), "src/src/lib/canonical-atlas-discovery.ts"), "utf8");
const bureauPassSource = readFileSync(resolve(process.cwd(), "src/src/lib/bureau-agentic-pass.ts"), "utf8");
const agenticResearchSource = readFileSync(resolve(process.cwd(), "src/src/lib/agentic-web-research.ts"), "utf8");
const agenticCoreSource = readFileSync(resolve(process.cwd(), "src/src/lib/agentic-web-research-core.ts"), "utf8");
const canonicalTargetSource = readFileSync(resolve(process.cwd(), "src/src/lib/canonical-single-target-runner.ts"), "utf8");

describe("Atlas control-plane contract regression", () => {
  it("preserves Investigator tool choice across Boss-directed discovery continuations", () => {
    for (const direction of [
      "Use parallel_web_search for the next step.",
      "Call visit on the source page.",
      "Search with SpiderFoot to enumerate contacts.",
      "Switch to TheHarvester.",
      "Route via browser_fetch.",
      "Investigate this URL: https://example.test/person",
    ]) {
      expect(validateResearchObjective(direction).valid, direction).toBe(false);
    }

    for (const objective of [
      "Investigate leadership changes at regional payment companies and verify candidate identity from public evidence.",
      "Find independent coverage of an acquisition and determine which named executives have source-backed roles.",
      "Reassess the open evidence and choose the highest-information next action yourself.",
    ]) {
      expect(validateResearchObjective(objective), objective).toEqual({ valid: true, direction: objective });
    }

    expect(canonicalDiscoverySource).toMatch(/import \{[^}]*\bvalidateResearchObjective\b[^}]*\} from "\.\/research-objective";/);
    const validationIndex = canonicalDiscoverySource.indexOf("validateResearchObjective(proposedDirection)");
    const handoffIndex = canonicalDiscoverySource.indexOf('runBureauAgenticWebPass({ mode: "discovery", targetName: "", objective: directedObjective');
    expect(validationIndex).toBeGreaterThan(-1);
    expect(handoffIndex).toBeGreaterThan(validationIndex);
  });

  it("recovers from a rejected Boss pivot without executing its prescribed URL/tool", () => {
    const rejectedBranchStart = canonicalDiscoverySource.indexOf("if (!validatedDirection.valid) {");
    const acceptedPivotBoundary = canonicalDiscoverySource.indexOf("// Only a valid pivot that actually starts a new Investigator episode supersedes", rejectedBranchStart);
    const rejectedBranch = canonicalDiscoverySource.slice(rejectedBranchStart, acceptedPivotBoundary);
    expect(rejectedBranchStart).toBeGreaterThan(-1);
    expect(acceptedPivotBoundary).toBeGreaterThan(rejectedBranchStart);
    expect(rejectedBranch).toContain('currentAction: "canonical-control-direction-rejected"');
    expect(rejectedBranch).toContain('status: "rejected"');
    expect(rejectedBranch).toContain("investigatorActionExecuted: false");
    expect(rejectedBranch).toContain("continue;");
    expect(rejectedBranch).not.toContain("Canonical Atlas rejected a Boss direction");
    expect(rejectedBranch).not.toContain("latestEvidenceBackedTerminal = null");
    const acceptedPivotTerminalReset = canonicalDiscoverySource.indexOf("latestEvidenceBackedTerminal = null;", acceptedPivotBoundary);
    const nextInvestigatorPass = canonicalDiscoverySource.indexOf('runBureauAgenticWebPass({ mode: "discovery", targetName: "", objective: directedObjective', acceptedPivotTerminalReset);
    expect(acceptedPivotTerminalReset).toBeGreaterThan(acceptedPivotBoundary);
    expect(nextInvestigatorPass).toBeGreaterThan(acceptedPivotTerminalReset);
    expect(canonicalDiscoverySource).toContain("controlValidationFeedback: directionValidationFeedback ?");
    expect(controlSource).toContain('controlValidationFeedback: typeof parsed.controlValidationFeedback === "string"');
    expect(validateResearchObjective("Fetch https://example.test/filing.pdf and extract the officers.").valid).toBe(false);
  });

  it("requires both opening and ongoing Right-hand reviews to flag unsupported scope", () => {
    expect(canonicalDiscoverySource).toContain("Boss report (unverified control hypothesis, not source evidence)");
    expect(canonicalDiscoverySource).toContain("Flag unsupported sectors, geographies, company premises, or targets rather than repeating them as facts.");
    expect(canonicalDiscoverySource).toContain("Internal memory, storage, and workflow terminology is not a research lead.");
    expect(controlSource).toContain("Compare proposed directions with the human objective and observed sources; flag unsupported sectors, geographies, company premises, or targets rather than repeating them as facts.");
    expect(controlSource).toContain("Internal memory, storage, and workflow terminology is not a research lead.");
  });

  it("records an Investigator provider-error turn before fail-closed termination", () => {
    const investigatorSource = readFileSync(resolve(process.cwd(), "src/src/lib/agentic-web-research-core.ts"), "utf8");

    expect(investigatorSource).toContain('action: "investigator_provider_error"');
    expect(investigatorSource).toContain('records.push(providerErrorRecord);');
    expect(investigatorSource).toContain("INVESTIGATOR_PROVIDER_ERROR");
    expect(investigatorSource).toContain('return resultBase("unavailable", i + 1, "LLM_UNAVAILABLE", lastObservation)');
  });


  it("requires strict structured schemas at both canonical control boundaries", () => {
    expect(controlSource).toContain("ATLAS_RIGHT_HAND_CONTROL_RESPONSE_FORMAT");
    expect(controlSource).toContain("ATLAS_BOSS_CONTROL_RESPONSE_FORMAT");
    expect(controlSource).toContain("runGroqRightHandFreeJson(");
    expect(controlSource).toContain("generateGroqBossText(selection, prompt, { responseFormat: ATLAS_BOSS_CONTROL_RESPONSE_FORMAT");
    expect(controlSource).toContain('required: ["decision", "reason", "direction", "confidence"]');
    expect(controlSource).toContain('action: { type: "string", enum: ["continue_discovery", "research_candidate", "revisit_candidate", "pivot_discovery", "stop"] }');
    expect(controlSource).toContain('required: ["action", "candidateName", "direction", "reason", "confidence"]');
    expect(controlSource).toContain("additionalProperties: false");
    expect(rightHandSource).toContain('response_format:useJsonObjectFallback?{type:"json_object"}:structuredResponseFormat');
    expect(rightHandSource).toContain('type:"json_schema"');
    expect(rightHandSource).toContain("strict:true");
    expect(bossSource).toContain("responseFormat");
  });

  it("keeps local validation after provider structured-output compatibility handling", () => {
    expect(controlSource).toContain("const rightHandContractValid =");
    expect(controlSource).toContain("const bossContractValid =");
    expect(controlSource).toContain("validateAtlasRightHandControl(rightParsed)");
    expect(controlSource).toContain("validateAtlasBossControl(parsed)");
    expect(controlSource).not.toContain("Mistral Right-hand");
    expect(controlSource).toContain("Groq Boss");
    expect(controlSource).toContain("Groq Boss owns Atlas control decisions");
    expect(controlSource).toContain("Groq Right-hand provides independent oversight");
    expect(rightHandSource).toContain("MAX_429_RETRIES_PER_MODEL");
    expect(rightHandSource).toContain("MAX_503_RETRIES_PER_MODEL");
    expect(rightHandSource).toContain("clearTimeout(timer);");
    expect(rightHandSource).toContain("bounded control-plane budget");
    expect(rightHandSource).toContain("GROQ_RIGHT_HAND_API_KEY");
    expect(rightHandSource).not.toContain("GEMINI_CHAT_API_BASE");
    expect(rightHandSource).not.toContain("generativelanguage.googleapis.com");
    expect(controlSource).not.toContain("Gemini control decision");
    expect(controlSource).not.toContain("Gemini is Boss");
  });

  it("bounds the fully composed Right-hand control prompt after all framing is added", () => {
    const prompt = buildAtlasRightHandControlPrompt({
      investigatorReport: "LATEST REPORT " + "R".repeat(20_000) + " REPORT TAIL",
      compactState: "CURRENT DURABLE STATE " + "S".repeat(30_000) + " STATE TAIL",
    });

    expect(prompt.length).toBeLessThanOrEqual(18_976);
    expect(prompt).toContain("APEX ATLAS");
    expect(prompt).toContain("LATEST REPORT");
    expect(prompt).toContain("STATE TAIL");
    expect(prompt).toContain("durable case state remains authoritative");
  });


  it("bounds the fully composed Boss control prompt after all framing is added", () => {
    const prompt = buildAtlasBossControlPrompt({
      investigatorReport: "LATEST REPORT " + "R".repeat(40_000) + " REPORT TAIL",
      compactState: "CURRENT DURABLE STATE " + "S".repeat(80_000) + " STATE TAIL",
      rightHand: {
        status: "completed",
        decision: "continue_discovery",
        reason: "R".repeat(10_000),
        direction: "D".repeat(10_000),
        confidence: 0.7,
        model: "openai/gpt-oss-120b",
        error: null,
      },
    });

    expect(prompt.length).toBeLessThanOrEqual(ATLAS_BOSS_CONTROL_PROMPT_BUDGET);
    expect(prompt).toContain("APEX ATLAS");
    expect(prompt).toContain("LATEST REPORT");
    expect(prompt).toContain("STATE TAIL");
    expect(prompt).toContain("RIGHT-HAND ADVICE");
  });

  it("classifies provider generation failures before any response parsing", () => {
    expect(classifyAtlasBossGenerationFailure({
      error: "Groq Boss prompt exceeds the bounded control-plane budget of 20000 characters; upstream case-context compaction is required.",
      attempts: [],
    })).toBe("CONTROL_PROMPT_TOO_LARGE");

    expect(classifyAtlasBossGenerationFailure({
      error: "Groq Boss unavailable after bounded model/key attempts.",
      attempts: [{ httpStatus: 429 }],
    })).toBe("CONTROL_PROVIDER_RATE_LIMIT");

    expect(classifyAtlasBossGenerationFailure({
      error: "Groq Boss unavailable after bounded model/key attempts.",
      attempts: [{ httpStatus: 500 }],
    })).toBe("CONTROL_PROVIDER_HTTP_ERROR");

    expect(classifyAtlasBossGenerationFailure({
      error: "Groq Boss local provider gate blocked further attempts (budget_exhausted).",
      attempts: [{ httpStatus: null, providerErrorCode: "budget_exhausted", failureClass: "rate_limited" }],
    })).toBe("CONTROL_PROVIDER_RATE_LIMIT");

    expect(classifyAtlasBossGenerationFailure({
      error: "Groq Boss returned an empty control response.",
      attempts: [],
    })).toBe("CONTROL_EMPTY_RESPONSE");
  });

  it("classifies malformed JSON and schema-invalid Boss responses separately", () => {
    expect(classifyAtlasBossContractFailure("{not-json}", null)).toBe("CONTROL_INVALID_JSON");
    expect(classifyAtlasBossContractFailure(JSON.stringify({ action: "bogus" }), { action: "bogus" })).toBe("CONTROL_SCHEMA_INVALID");
  });

  it("refuses control persistence after the discovery case leaves active state", () => {
    expect(controlSource).toContain('status: researchCasesTable.status');
    expect(controlSource).toContain('if (caseRow.status !== "active") throw new Error');
    expect(controlSource).toContain("refusing stale control persistence");
  });

  it("persists the same status in the immutable event payload and event row", () => {
    const decision = {
      status: "unavailable" as const,
      action: "stop" as const,
      candidateName: null,
      direction: null,
      reason: "Provider unavailable.",
      confidence: null,
      rightHand: {
        status: "unavailable" as const,
        decision: null,
        reason: null,
        direction: null,
        confidence: null,
        model: "none",
        error: "CONTROL_PROMPT_TOO_LARGE",
      },
      bossModel: "openai/gpt-oss-120b",
      error: "stage=groq_boss; category=CONTROL_PROMPT_TOO_LARGE",
    };

    const payload = buildAtlasControlEventPayload({ decision, controlTurn: 4 });
    expect(payload.status).toBe(decision.status);
    expect(JSON.parse(JSON.stringify(payload)).status).toBe("unavailable");
    expect(controlSource).toContain("status: input.decision.status");
    expect(controlSource).toContain("failureClass=${failureClass ?? \"none\"}");
    expect(bossSource).toContain("isLocalProviderQuotaError(error)");
  });

  it("diagnoses Boss contract failures without retaining raw provider content", () => {
    expect(diagnoseAtlasBossControlContract(null, null)).toEqual(expect.objectContaining({ parseStatus: "missing", contentChars: 0 }));
    expect(diagnoseAtlasBossControlContract("{not-json}", null)).toEqual(expect.objectContaining({ parseStatus: "malformed_json", contentChars: 10 }));
    expect(diagnoseAtlasBossControlContract(JSON.stringify({ action: "bogus", candidateName: 7, direction: null, confidence: "high" }), {
      action: "bogus", candidateName: 7, direction: null, confidence: "high", extra: true,
    })).toEqual(expect.objectContaining({ parseStatus: "object", unexpectedFields: ["extra"], invalidFields: ["action", "candidateName", "confidence", "reason"] }));
  });

  it("replays valid and malformed provider contracts through the real validators", () => {
    expect(validateAtlasRightHandControl({
      decision: "continue_discovery",
      reason: "The current evidence is insufficient.",
      direction: "Search a new lane.",
      confidence: 0.7,
    })).toBe(true);
    expect(validateAtlasRightHandControl({
      decision: "stop",
      reason: "The case is exhausted.",
      direction: null,
      confidence: 0.9,
    })).toBe(true);
    expect(validateAtlasRightHandControl({
      decision: "continue discovery",
      reason: "Invalid non-contract action label.",
      direction: "Search.",
      confidence: 0.5,
    })).toBe(false);
    expect(validateAtlasRightHandControl({
      decision: "stop",
      reason: "Missing confidence.",
      direction: null,
    })).toBe(false);
    expect(validateAtlasRightHandControl({
      decision: "stop",
      reason: "extra field",
      direction: null,
      confidence: 0.9,
      extra: true,
    })).toBe(false);

    expect(validateAtlasBossControl({
      action: "research_candidate",
      candidateName: "Example Person",
      direction: "Verify the role.",
      reason: "Candidate is admitted.",
      confidence: 0.8,
    })).toBe(true);
    expect(validateAtlasBossControl({
      action: "stop",
      candidateName: null,
      direction: null,
      reason: "No further justified work.",
      confidence: 0.9,
    })).toBe(true);
    expect(validateAtlasBossControl({
      action: "invented_action",
      candidateName: null,
      direction: null,
      reason: "Invalid.",
      confidence: 0.9,
    })).toBe(false);
    expect(validateAtlasBossControl({
      action: "pivot_discovery",
      candidateName: null,
      direction: null,
      reason: "Missing pivot direction.",
      confidence: 0.8,
    })).toBe(false);
    expect(validateAtlasBossControl({
      action: "continue_discovery",
      candidateName: "Unexpected Person",
      direction: null,
      reason: "Candidate field must be null.",
      confidence: 0.8,
    })).toBe(false);
    expect(validateAtlasBossControl({
      action: "research_candidate",
      candidateName: "Example Person",
      direction: "Verify the role.",
      reason: "Candidate is admitted.",
      confidence: 0.8,
    })).toBe(true);
    expect(validateAtlasRightHandControl({
      decision: "pivot_discovery",
      reason: "Missing pivot direction.",
      direction: null,
      confidence: 0.8,
    })).toBe(false);
  });

  it("requires a complete, bounded schema-valid opening Right-hand review before Investigator execution", () => {
    const valid = {
      decision: "Proceed, with source-quality caution",
      reason: "The assignment is coherent but the first evidence should come from a primary source.",
      focusLanes: ["official leadership page", "registry records"],
      confidence: 0.82,
    };
    expect(validateAtlasOpeningRightHandReview(valid)).toBe(true);
    expect(validateAtlasOpeningRightHandReview(null)).toBe(false);
    expect(validateAtlasOpeningRightHandReview({ ...valid, unexpected: true })).toBe(false);
    expect(validateAtlasOpeningRightHandReview({ ...valid, reason: "  " })).toBe(false);
    expect(validateAtlasOpeningRightHandReview({ ...valid, focusLanes: [""] })).toBe(false);
    expect(validateAtlasOpeningRightHandReview({ ...valid, focusLanes: Array.from({ length: 9 }, () => "lane") })).toBe(false);
    expect(validateAtlasOpeningRightHandReview({ ...valid, confidence: 1.2 })).toBe(false);
    expect(validateAtlasOpeningRightHandReview({ ...valid, decision: "d".repeat(301) })).toBe(false);

    expect(ATLAS_OPENING_RIGHT_HAND_REVIEW_RESPONSE_FORMAT.schema.required).toEqual(["decision", "reason", "focusLanes", "confidence"]);
    expect(ATLAS_OPENING_RIGHT_HAND_REVIEW_RESPONSE_FORMAT.schema.additionalProperties).toBe(false);
    expect(canonicalDiscoverySource).toContain("ATLAS_OPENING_RIGHT_HAND_REVIEW_RESPONSE_FORMAT");
    expect(canonicalDiscoverySource).toContain("validateAtlasOpeningRightHandReview(parsed)");
    expect(canonicalDiscoverySource).toContain("Right-hand returned an empty opening review response.");
    expect(canonicalDiscoverySource).toContain("if (rightHand.error || rightHand.status !== \"completed\")");
    expect(canonicalTargetSource).toContain("ATLAS_OPENING_RIGHT_HAND_REVIEW_RESPONSE_FORMAT");
    expect(canonicalTargetSource).toContain("validateAtlasOpeningRightHandReview(parsed)");
    expect(canonicalTargetSource).toContain("!rightHandRaw.raw?.trim()");
  });

  it("merges each Boss-directed discovery episode into cumulative state exactly once", () => {
    // The cumulative merge belongs at the continuation boundary. A second
    // spread from nextDiscovery inflated all counts and duplicated findings,
    // trajectory entries, and provenance after each successful pivot.
    expect(canonicalDiscoverySource.match(/discovery = mergeDiscoveryResults\(discovery, nextDiscovery\);/g)).toHaveLength(1);
    expect(canonicalDiscoverySource).not.toContain(
      "searches: discovery.searches + nextDiscovery.searches, visits: discovery.visits + nextDiscovery.visits, iterations: discovery.iterations + nextDiscovery.iterations",
    );
  });


  it("carries discovery search history across Boss-directed episodes and quota recovery", () => {
    expect(canonicalDiscoverySource).toContain("priorTrajectoryRecords: discovery.trajectoryRecords ?? []");
    expect(canonicalDiscoverySource).toContain("priorTrajectoryRecords: [...priorTrajectoryRecords, ...(result.trajectoryRecords ?? [])]");
    expect(bureauPassSource).toContain("priorTrajectoryRecords:input.priorTrajectoryRecords");
    expect(agenticResearchSource.match(/priorTrajectoryRecords: \[\.\.\.historyRecords, \.\.\.records\.map\(/g) ?? []).toHaveLength(2);
    expect(agenticResearchSource).toContain("sourceObservations: history.map");
    expect(agenticResearchSource).toContain("loadDurableInvestigatorRecords");
    expect(readFileSync(resolve(process.cwd(), "src/src/lib/research-intelligence-engine.ts"), "utf8")).toContain("sourceObservationsByUrl");
  });


  it("passes the current model terminal findings into the discovery source gate", () => {
    expect(agenticCoreSource).toContain("discoveryTerminalGate([...priorTrajectoryRecords, ...records.slice(0, -1), { ...record, findings: action.findings }])");
  });

  it("rejects out-of-range confidence and overlong Atlas control fields instead of clamping them", () => {
    const rightHand = { decision: "stop", reason: "The case is exhausted.", direction: null, confidence: 0.8 };
    expect(validateAtlasRightHandControl({ ...rightHand, confidence: 1.2 })).toBe(false);
    expect(validateAtlasRightHandControl({ ...rightHand, confidence: -0.1 })).toBe(false);
    expect(validateAtlasRightHandControl({ ...rightHand, reason: "r".repeat(1_201) })).toBe(false);
    expect(validateAtlasRightHandControl({ ...rightHand, direction: "d".repeat(1_201) })).toBe(false);
    const boss = { action: "stop", candidateName: null, direction: null, reason: "No further justified work.", confidence: 0.8 };
    expect(validateAtlasBossControl({ ...boss, confidence: 1.2 })).toBe(false);
    expect(validateAtlasBossControl({ ...boss, confidence: -0.1 })).toBe(false);
    expect(validateAtlasBossControl({ ...boss, reason: "r".repeat(1_201) })).toBe(false);
    expect(validateAtlasBossControl({ ...boss, direction: "d".repeat(1_201) })).toBe(false);
  });

});
