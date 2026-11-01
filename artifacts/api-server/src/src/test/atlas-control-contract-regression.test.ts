import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveBossAdjudicatedOpeningDirection, resolveBossDirectedDiscoveryObjective, restorePersistedDiscoveryObjective, validateResearchObjective } from "../lib/research-objective";
import { buildGroqBossDiscoveryPrompt } from "../lib/case-bureau";
import { classifyCanonicalAtlasFailure } from "../lib/canonical-atlas-failure-diagnostics";
import { atlasBudgetInterpretationLaw, atlasSourceRouteRecoveryLaw, ATLAS_BOSS_CONTROL_PROMPT_BUDGET, ATLAS_OPENING_RIGHT_HAND_REVIEW_RESPONSE_FORMAT, buildAtlasBossControlPrompt, buildAtlasControlEventPayload, buildAtlasPinnedControlState, buildAtlasRightHandControlPrompt, compactAtlasInvestigatorReport, isRecoverableAtlasControlRejection, classifyAtlasBossContractFailure, classifyAtlasBossGenerationFailure, diagnoseAtlasBossControlContract, normalizeAtlasControlAction, validateAtlasBossControl, validateAtlasOpeningRightHandReview, validateAtlasRightHandControl } from "../lib/atlas-control-decision";

const controlSource = readFileSync(resolve(process.cwd(), "src/src/lib/atlas-control-decision.ts"), "utf8");
const bossSource = readFileSync(resolve(process.cwd(), "src/src/lib/groq-boss.ts"), "utf8");
const rightHandSource = readFileSync(resolve(process.cwd(), "src/src/lib/groq-right-hand-reasoning.ts"), "utf8");
const canonicalDiscoverySource = readFileSync(resolve(process.cwd(), "src/src/lib/canonical-atlas-discovery.ts"), "utf8");
const canonicalContinuationSource = readFileSync(resolve(process.cwd(), "src/src/routes/research/canonical-case-continuation.ts"), "utf8");
const bureauPassSource = readFileSync(resolve(process.cwd(), "src/src/lib/bureau-agentic-pass.ts"), "utf8");
const agenticResearchSource = readFileSync(resolve(process.cwd(), "src/src/lib/agentic-web-research.ts"), "utf8");
const agenticCoreSource = readFileSync(resolve(process.cwd(), "src/src/lib/agentic-web-research-core.ts"), "utf8");
const canonicalTargetSource = readFileSync(resolve(process.cwd(), "src/src/lib/canonical-single-target-runner.ts"), "utf8");

describe("Atlas control-plane contract regression", () => {
  it("persists finite safe diagnostic stage/domain/kind labels at the canonical failure boundary", () => {
    const canonical = canonicalDiscoverySource;
    expect(canonical).toContain("classifyCanonicalAtlasFailure({ stage: failureStage, error, cancelled, jobStateUnavailable, jobMissing, jobStateMismatch, leaseLost })");
    expect(canonical).toContain("failureDomain=${failureDiagnostic.domain}");
    expect(canonical).toContain("failureKind=${failureDiagnostic.kind}");
    expect(canonical).toContain('failureStage = "model_action_validation"');
    expect(canonical).toContain('failureStage = "terminal_persistence"');
    expect(canonical).toContain('failureStage = "job_state_or_lease"');
    expect(canonical).toContain("let failureStatePersistenceFailed = false;");
    expect(canonical).toContain("failureStatePersistence=case_update_failed");
    expect(canonical).toContain("failureStatePersistenceFailed = true;");
    expect(canonical).toContain("const terminalMessage = failureStatePersistenceFailed ?");
    expect(bureauPassSource).toContain("failureDomain:record.failureDomain??null,failureKind:record.failureKind??null");
    expect(classifyCanonicalAtlasFailure({ stage: "tool_execution", error: new Error("tool failed") })).toEqual({ domain: "tool_execution", kind: "request_failure" });
  });
});

describe("Atlas control-plane contract regression", () => {
  it("binds every durable source-observation reader to the requested Atlas job", () => {
    const sourceReaders = [
      canonicalDiscoverySource.slice(
        canonicalDiscoverySource.indexOf("async function materializeAtlasAdmissions"),
        canonicalDiscoverySource.indexOf("export async function checkpointCanonicalDiscoveryFindings"),
      ),
      canonicalDiscoverySource.slice(
        canonicalDiscoverySource.indexOf("export async function reconcileCanonicalDiscoveryCaseReviewCards"),
        canonicalDiscoverySource.indexOf("async function assertAtlasJobActive"),
      ),
      canonicalDiscoverySource.slice(
        canonicalDiscoverySource.indexOf("async function materializePartialPersonLeadCards"),
        canonicalDiscoverySource.indexOf("async function materializePartialOrganizationLeadCards"),
      ),
      canonicalDiscoverySource.slice(
        canonicalDiscoverySource.indexOf("async function materializePartialOrganizationLeadCards"),
        canonicalDiscoverySource.indexOf("export async function runCanonicalAtlasPipeline"),
      ),
    ];
    expect(sourceReaders.every((source) => source.includes("payload.jobId !== input.atlasJobId"))).toBe(true);
  });

  it("does not seed the discovery Boss with a fabricated sector phrase", () => {
    const prompt = buildGroqBossDiscoveryPrompt({
      objective: "Discover real named people for subsequent public-contact research.",
      motivation: "Find verifiable public-source identity anchors.",
      geography: "Public web; geography chosen from the evidence.",
    }, []);
    expect(prompt).not.toContain("durable tree shaft");
    expect(prompt).toContain("This opening call has exactly one responsibility: select an available Investigator execution capability.");
    expect(prompt).toContain("Do not invent or imply that any target has been discovered.");
    expect(prompt).not.toContain("Geographic premise");
    expect(prompt).not.toContain("Global");
  });

  it("keeps the audit's generic wealth mission in discovery mode and still recognizes explicit targets", () => {
    const genericObjective = "Discover under-the-radar people with credible wealth potential and realistic public/professional/intermediary contact routes for later target-scoped research. People—not companies or executive prestige—are the target; companies are leads. Prefer private, mid-market, regional and family businesses; their owners/operators/founders/shareholders; investors and private-capital principals; beneficial/controlling owners; and concession, franchise or license holders. Look for public evidence of ownership/equity/investment/control, material business/property assets or a business exit, and a plausible way to approach the person through public professional or business channels. Do not infer wealth from seniority alone. Do not default to celebrities, billionaire/richest lists, Fortune 500, or global household-brand leadership. A global brand is relevant only when evidence points to a realistic local owner/operator/distributor/franchisee/concession-holder or similar intermediary. Do not spend the opening phase comparing sectors or geographic areas. Select one concrete company, person, or asset candidate from any currently enabled registry/asset register or public-web query that fits the human objective; a single useful candidate is enough to begin target-scoped research. Use only geography explicitly supplied by the human; otherwise do not invent or broaden a jurisdiction. The Investigator chooses each action; no fixed sequence. Promote only exact named people whose role, wealth-potential basis, and realistic approach route are source-supported. Never invent a person, relationship, wealth fact, contact, or URL.";
    const discoveryPrompt = buildGroqBossDiscoveryPrompt({
      objective: genericObjective,
      motivation: "Find evidence-backed people with realistic public routes.",
      geography: "No geography supplied; do not invent or broaden one.",
    }, []);
    expect(discoveryPrompt).toContain(genericObjective);
    expect(discoveryPrompt).toContain("The Investigator will begin target-first discovery under the exact human objective");
    expect(discoveryPrompt).toContain("Do not compare sectors, geographies, or strategies.");
    expect(discoveryPrompt).toContain("Do not add geographic scope or a source preference.");
    expect(discoveryPrompt).not.toContain("TARGET-LOCKED public-web research case");
    expect(discoveryPrompt).not.toContain("Choose one concrete, testable company/person/asset lead");

    const namedTargetPrompt = buildGroqBossDiscoveryPrompt({
      objective: "Find public contact routes for Alice Smith at Acme Capital.",
      motivation: "Verify identity and route attribution from public sources.",
      geography: "Public web.",
    }, []);
    expect(namedTargetPrompt).toContain("Find public contact routes for Alice Smith at Acme Capital.");
    expect(namedTargetPrompt).not.toContain("TARGET-LOCKED public-web research case");
  });

  it("passes the canonical Right-hand control validator into the adapter's bounded model fallback", () => {
    expect(controlSource).toMatch(
      /runGroqRightHandFreeJson\(rightHandPrompt,[\s\S]*?ATLAS_RIGHT_HAND_CONTROL_RESPONSE_FORMAT,[\s\S]*?maxCompletionTokens:\s*768,[\s\S]*?maxAttempts:\s*3,[\s\S]*?maxCompletionTokens:\s*1_024,[\s\S]*?reasoningEffort:\s*["']low["']\s*}\s*}\s*\)/,
    );
    expect(rightHandSource).toContain("if(!validateRaw(raw))");
    expect(rightHandSource).toContain("FORMAT RECOVERY: The previous JSON did not satisfy the caller's exact task-specific contract.");
    expect(rightHandSource).toContain("const extracted=extractJson(raw)");
    expect(rightHandSource).toContain('failureClass:"invalid_contract"');
  });

  it("preserves the active discovery objective on continuation and hands validated pivots to the next Investigator pass", () => {
    const baseObjective = "Find source-backed owners of reachable regional businesses.";
    const pivot = resolveBossDirectedDiscoveryObjective({
      action: "pivot_discovery",
      baseObjective,
      currentObjective: baseObjective,
      direction: "Compare a regional hospitality operator's ownership using local-language filings and independent transaction reporting.",
    });
    expect(pivot.valid).toBe(true);
    if (!pivot.valid) throw new Error(pivot.reason);
    expect(pivot.reusedCurrentObjective).toBe(false);
    expect(pivot.objective).toContain("BOSS-DIRECTED RESEARCH QUESTION / PIVOT:");
    expect(pivot.objective).toContain("independent transaction reporting");

    const continued = resolveBossDirectedDiscoveryObjective({
      action: "continue_discovery",
      baseObjective,
      currentObjective: pivot.objective,
      direction: null,
    });
    expect(continued).toEqual({
      valid: true,
      objective: pivot.objective,
      direction: pivot.objective,
      reusedCurrentObjective: true,
    });

    const invalidPivot = resolveBossDirectedDiscoveryObjective({
      action: "pivot_discovery",
      baseObjective,
      currentObjective: pivot.objective,
      direction: "Fetch https://example.test/registry and list the owners.",
    });

    expect(invalidPivot).toMatchObject({ valid: false });

    const restored = restorePersistedDiscoveryObjective({
      defaultBaseObjective: "fallback mission from a fresh launcher",
      persistedBaseObjective: baseObjective,
      persistedActiveObjective: pivot.objective,
    });
    expect(restored).toEqual({
      baseObjective,
      activeObjective: pivot.objective,
      restoredPivot: true,
    });
    const unsafePersisted = restorePersistedDiscoveryObjective({
      defaultBaseObjective: baseObjective,
      persistedBaseObjective: baseObjective,
      persistedActiveObjective: baseObjective + "\n\nBOSS-DIRECTED RESEARCH QUESTION / PIVOT:\nUse Maigret to fetch https://example.com/profile.",
    });
    expect(unsafePersisted).toEqual({
      baseObjective,
      activeObjective: baseObjective,
      restoredPivot: false,
    });


    expect(canonicalDiscoverySource).toContain("currentObjective: activeDiscoveryObjective");
    expect(canonicalDiscoverySource).toContain("activeDiscoveryObjective = directedObjective");
    expect(canonicalDiscoverySource).toContain("const directedObjective = resolvedObjective.objective;");
    const controlDecisionStart = canonicalDiscoverySource.indexOf("const decision = await decideAtlasNextAction(");
    const controlDecisionEnd = canonicalDiscoverySource.indexOf("if (controlValidationFeedback)", controlDecisionStart);
    const controlDecisionSource = canonicalDiscoverySource.slice(controlDecisionStart, controlDecisionEnd);
    expect(controlDecisionSource).toContain("objective: activeDiscoveryObjective");
    expect(controlDecisionSource).not.toContain("objective: discoveryObjective");
    expect(canonicalDiscoverySource).not.toContain('const proposedDirection = decision.direction || "Reassess the open evidence and choose the highest-information next action yourself."');
    expect(canonicalDiscoverySource).toContain("baseDiscoveryObjective: input.objective, activeDiscoveryObjective: input.objective");
    expect(canonicalDiscoverySource).toContain("restorePersistedDiscoveryObjective({");
    expect(canonicalDiscoverySource).toContain("activeDiscoveryObjective = restored.activeObjective");
    expect(canonicalDiscoverySource).toContain('eventType: "control_objective"');
    const persistenceIndex = canonicalDiscoverySource.indexOf("await persistAcceptedAtlasDiscoveryObjective({");
    const updateObjectiveIndex = canonicalDiscoverySource.indexOf("activeDiscoveryObjective = directedObjective;", persistenceIndex);
    const nextInvestigatorIndex = canonicalDiscoverySource.indexOf('let nextDiscovery = await runBureauAgenticWebPass({ mode: "discovery"', updateObjectiveIndex);
    expect(persistenceIndex).toBeGreaterThan(-1);
    expect(persistenceIndex).toBeLessThan(updateObjectiveIndex);
    expect(updateObjectiveIndex).toBeLessThan(nextInvestigatorIndex);

    expect(canonicalContinuationSource).toContain("restorePersistedDiscoveryObjective({");
    expect(canonicalContinuationSource).toContain("ACTIVE DISCOVERY OBJECTIVE:");
    expect(canonicalContinuationSource).toContain("objective:[activeDiscoveryObjective,");

  });

  it("preserves Investigator tool choice across Boss-directed discovery continuations", () => {
    for (const direction of [
      "Use parallel_web_search for the next step.",
      "Call visit on the source page.",
      "Search with SpiderFoot to enumerate contacts.",
      "Switch to TheHarvester.",
      "Route via browser_fetch.",
      "Use Scrapfly for the next page visit.",
      "Switch to ZenRows to retrieve the source.",
      "Use Browserless for page retrieval.",
      "Call Playwright to inspect the page.",
      "Use RDAP to inspect the domain registration.",
      "Switch to WhoisJSON for domain details.",
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

    expect(canonicalDiscoverySource).toMatch(/import \{[^}]*\bresolveBossDirectedDiscoveryObjective\b[^}]*\} from "\.\/research-objective";/);
    const validationIndex = canonicalDiscoverySource.indexOf("resolveBossDirectedDiscoveryObjective({");
    const handoffIndex = canonicalDiscoverySource.indexOf('runBureauAgenticWebPass({ mode: "discovery", targetName: "", objective: directedObjective');
    expect(validationIndex).toBeGreaterThan(-1);
    expect(handoffIndex).toBeGreaterThan(validationIndex);
  });

  it("recovers from a rejected Boss pivot without executing its prescribed URL/tool", () => {
    const rejectedBranchStart = canonicalDiscoverySource.indexOf("if (!resolvedObjective.valid) {");
    const acceptedPivotBoundary = canonicalDiscoverySource.indexOf("const directedObjective = resolvedObjective.objective;", rejectedBranchStart);
    const rejectedBranch = canonicalDiscoverySource.slice(rejectedBranchStart, acceptedPivotBoundary);
    expect(rejectedBranchStart).toBeGreaterThan(-1);
    expect(acceptedPivotBoundary).toBeGreaterThan(rejectedBranchStart);
    expect(rejectedBranch).toContain('currentAction: "canonical-control-direction-rejected"');
    expect(rejectedBranch).toContain('status: "rejected"');
    expect(rejectedBranch).toContain("investigatorActionExecuted: false");
    expect(rejectedBranch).toContain("continue;");
    expect(rejectedBranch).not.toContain("Canonical Atlas rejected a Boss direction");
    expect(rejectedBranch).toContain("priorAction = previousAcceptedAction;");
    expect(rejectedBranch).toContain("priorCandidate = previousAcceptedCandidate;");
    expect(rejectedBranch).not.toContain("latestEvidenceBackedTerminal = null");
    const budgetGuard = canonicalDiscoverySource.indexOf("if (discoveryBudget < 30_000)", acceptedPivotBoundary);
    const iterationGuard = canonicalDiscoverySource.indexOf("if (remainingInvestigatorIterations <= 0)", acceptedPivotBoundary);
    const acceptedPivotTerminalReset = canonicalDiscoverySource.indexOf("latestEvidenceBackedTerminal = null;", iterationGuard);
    const nextInvestigatorPass = canonicalDiscoverySource.indexOf('runBureauAgenticWebPass({ mode: "discovery", targetName: "", objective: directedObjective', acceptedPivotTerminalReset);
    expect(budgetGuard).toBeGreaterThan(acceptedPivotBoundary);
    expect(iterationGuard).toBeGreaterThan(budgetGuard);
    expect(acceptedPivotTerminalReset).toBeGreaterThan(iterationGuard);
    expect(nextInvestigatorPass).toBeGreaterThan(acceptedPivotTerminalReset);
    expect(canonicalDiscoverySource).toContain("const controlValidationFeedback = rejectedControlDecision;");
    expect(canonicalDiscoverySource).toContain("controlValidationFeedback.kind === \"pivot_direction\"");
    expect(canonicalDiscoverySource).toContain("previous Boss candidate selection at control turn");
    expect(canonicalDiscoverySource).toContain("Do not treat a name in source text or a Right-hand suggestion as candidate admission.");
    expect(canonicalDiscoverySource).toContain("Choose a valid model-owned control action; if more discovery is needed");
    expect(controlSource).toContain("controlValidationFeedback: boundedText(parsed.controlValidationFeedback, 800)");
    expect(controlSource).toContain("compactAtlasInvestigatorReport(input.investigatorReport)");

    const feedback = "Rejected concrete URL/tool destination. No Investigator tool was executed.";
    const investigatorReport = JSON.stringify({ provider: "groq-investigator-1", controlValidationFeedback: feedback, status: "completed", searches: 2, visits: 0, findings: [], modelFindings: [], openQuestions: [] });
    const rightHandPrompt = buildAtlasRightHandControlPrompt({ investigatorReport, compactState: "Current discovery case state." });
    const bossPrompt = buildAtlasBossControlPrompt({ investigatorReport, compactState: "Current discovery case state.", rightHand: { status: "completed", decision: "await_anchor", reason: "Control-only review; no new evidence.", direction: null, confidence: 0.9, model: "openai/gpt-oss-120b", error: null } });
    expect(rightHandPrompt).toContain(feedback);
    expect(bossPrompt).toContain(feedback);
    expect(rightHandPrompt).toContain("realism/targetability constraints outrank Boss suggestions");
    expect(bossPrompt).toContain("Mission priority: the human objective's realistic-targetability constraint outranks generic public-company leadership or fame/ranking suggestions.");
    expect(validateResearchObjective("Fetch https://example.test/filing.pdf and extract the officers.").valid).toBe(false);
  });

  it("requires concrete, executable pivot directions in both ongoing control prompts", () => {
    const investigatorReport = "No-progress scope-recovery feedback: six actions were blocked before any outbound request.";
    const rightHandPrompt = buildAtlasRightHandControlPrompt({ investigatorReport, compactState: "No source-backed findings or admitted candidates." });
    expect(rightHandPrompt).toContain("name the concrete subject or unresolved evidence question");
    expect(rightHandPrompt).toContain("do not invent, compare, or broaden geography");
    expect(rightHandPrompt).not.toContain("a chosen region");

    const bossPrompt = buildAtlasBossControlPrompt({
      investigatorReport,
      compactState: "No source-backed findings or admitted candidates.",
      rightHand: { status: "completed", decision: "pivot_discovery", reason: "The current scope is blocked.", direction: "Shift to a sector-specific approach in a chosen region.", confidence: 0.8, model: "openai/gpt-oss-120b", error: null },
    });
    expect(bossPrompt).toContain("A pivot must be self-contained and executable");
    expect(bossPrompt).toContain("do not broaden or switch jurisdictions as a discovery exercise");
  });

  it("requires both opening and ongoing Right-hand reviews to flag unsupported scope", () => {
    expect(canonicalDiscoverySource).toContain("Independently review the exact human objective and the opening control state.");
    expect(canonicalDiscoverySource).toContain("No Investigator action has executed; there are no source observations or admitted candidates yet.");
    expect(canonicalDiscoverySource).toContain("Do not propose geographic expansion or alternative jurisdictions unless explicitly requested by the human.");
    expect(canonicalDiscoverySource).toContain("Internal memory, storage, and workflow terminology is not a research lead.");
    expect(canonicalDiscoverySource).toContain("The human mission and realistic-targetability rules govern.");
    expect(canonicalDiscoverySource).toContain("Do not compare alternative strategies or introduce a direction before the Investigator returns an actual source observation.");
    expect(controlSource).toContain("If a useful source-attributed company/person/asset target is already available, recommend investigating it now.");
    expect(controlSource).toContain("Internal memory, storage, and workflow terminology is not a research lead.");
  });

  it("preserves the Investigator terminal reason and failure class within the bounded control report", () => {
    const compact = compactAtlasInvestigatorReport(JSON.stringify({
      status: "error",
      stopReason: "PARSE_FAILURE",
      errorSummary: "Investigator returned invalid action contracts; digest=abc123",
      searches: 4,
      visits: 2,
      openQuestions: [{
        turn: 24,
        action: "parse_failure",
        execution: "error",
        observation: "invalid action contract ".repeat(100),
        observedUrls: Array.from({ length: 10 }, (_, index) => "https://source-" + index + ".example.test/page"),
        stopReason: "PARSE_FAILURE",
        failureDomain: "model_action",
        failureKind: "invalid_contract",
      }],
    }));
    const parsed = JSON.parse(compact) as Record<string, unknown>;
    expect(parsed.status).toBe("error");
    expect(parsed.stopReason).toBe("PARSE_FAILURE");
    expect(parsed.errorSummary).toContain("invalid action contracts");
    const questions = parsed.latestQuestions as Array<Record<string, unknown>>;
    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatchObject({
      turn: 24,
      action: "parse_failure",
      execution: "error",
      stopReason: "PARSE_FAILURE",
      failureDomain: "model_action",
      failureKind: "invalid_contract",
    });
    expect(String(questions[0]?.observation)).toHaveLength(600);
    expect(questions[0]?.observedUrls).toHaveLength(4);
    expect(compact.length).toBeLessThan(5_000);
    expect(canonicalDiscoverySource).toContain("stopReason: discovery.stopReason ?? null");
    expect(canonicalDiscoverySource).toContain("failureDomain: record.failureDomain");
    expect(canonicalDiscoverySource).toContain("failureKind: record.failureKind");
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
    expect(controlSource).toContain("responseFormat: input.opening ? ATLAS_BOSS_OPENING_CONTROL_RESPONSE_FORMAT : ATLAS_BOSS_CONTROL_RESPONSE_FORMAT");
    expect(controlSource).toContain('required: ["decision", "reason", "direction", "confidence"]');
    expect(controlSource).toContain('action: { type: "string", enum: ["continue_discovery", "research_candidate", "revisit_candidate", "pivot_discovery", "stop"] }');
    expect(controlSource).toContain('required: ["action", "candidateName", "candidateType", "direction", "reason", "confidence"]');
    expect(controlSource).toContain("additionalProperties: false");
    expect(rightHandSource).toContain('response_format:useJsonObjectFallback?{type:"json_object"}:structuredResponseFormat');
    expect(rightHandSource).toContain('type:"json_schema"');
    expect(rightHandSource).toContain("strict:true");
    expect(bossSource).toContain("responseFormat");
  });

  it("gives the evidence-constrained Boss control decision medium reasoning and enough completion budget", () => {
    expect(controlSource).toContain('maxOutputTokens: 1024, thinkingLevel: "medium"');
    expect(controlSource).not.toContain('maxOutputTokens: 768, thinkingLevel: "low"');
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
    })).toEqual(expect.objectContaining({ parseStatus: "object", unexpectedFields: ["extra"], invalidFields: ["action", "candidateName", "candidateType", "confidence", "reason"], missingFields: ["candidateType", "reason"] }));
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
      candidateType: "person",
      direction: "Verify the role.",
      reason: "Candidate is admitted.",
      confidence: 0.8,
    })).toBe(true);
    expect(validateAtlasBossControl({
      action: "stop",
      candidateName: null,
      candidateType: null,
      direction: null,
      reason: "No further justified work.",
      confidence: 0.9,
    })).toBe(true);

    const paddedStop = {
      action: " stop ",
      candidateName: null,
      candidateType: null,
      direction: null,
      reason: "Whitespace should not change a valid control transition.",
      confidence: 0.9,
    };
    expect(validateAtlasBossControl(paddedStop)).toBe(true);
    expect(normalizeAtlasControlAction(paddedStop.action)).toBe("stop");
    expect(normalizeAtlasControlAction(" RESEARCH_CANDIDATE ")).toBe("research_candidate");
    expect(normalizeAtlasControlAction("invented_action")).toBeNull();
    expect(controlSource).toContain("const requestedAction = normalizeAtlasControlAction(parsed?.action);");
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
      candidateType: "person",
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

  it("preserves the bounded four-field Right-hand review contract for target-stage oversight", () => {
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
    expect(canonicalTargetSource).toContain("ATLAS_OPENING_RIGHT_HAND_REVIEW_RESPONSE_FORMAT");
    expect(canonicalTargetSource).toContain("validateAtlasOpeningRightHandReview(parsed)");
    expect(canonicalTargetSource).toContain("!rightHandRaw.raw?.trim()");
  });

  it("treats the opening Right-hand review as advice that Boss must adjudicate", () => {
    const valid = {
      decision: "Start one immediate source-neutral target-first discovery action.",
      reason: "The cited source-class advantage has not been substantiated.",
      focusLanes: ["begin target-first discovery", "verify one observed candidate"],
      confidence: 0.86,
    };
    expect(validateAtlasOpeningRightHandReview(valid)).toBe(true);
    expect(ATLAS_OPENING_RIGHT_HAND_REVIEW_RESPONSE_FORMAT.schema.required).toEqual(["decision", "reason", "focusLanes", "confidence"]);
    expect(canonicalDiscoverySource).toContain("ATLAS_OPENING_RIGHT_HAND_REVIEW_RESPONSE_FORMAT");
    expect(canonicalDiscoverySource).toContain("validateAtlasOpeningRightHandReview(parsed)");
    expect(canonicalDiscoverySource).toContain('authority: "advisory_only"');
    expect(canonicalDiscoverySource).toContain("rightHandOverride: {");
    expect(canonicalDiscoverySource).toContain("const openingBossDecision = await decideAtlasNextAction({");
    expect(canonicalDiscoverySource).toContain("bossAction: openingBossDecision.action");
    expect(canonicalDiscoverySource).toContain("bossDirection: null");
    expect(canonicalDiscoverySource).toContain("initialBossDirection: null");
    expect(canonicalDiscoverySource).not.toContain("rightHand.approval");
    const reviewCall = canonicalDiscoverySource.indexOf("const rightHandRaw = await import");
    const bossDecisionCall = canonicalDiscoverySource.indexOf("const openingBossDecision = await decideAtlasNextAction(");
    const openingResolution = canonicalDiscoverySource.indexOf("resolveBossAdjudicatedOpeningDirection({");
    const investigatorObjective = canonicalDiscoverySource.indexOf("const openingInvestigatorObjective = [");
    expect(reviewCall).toBeGreaterThan(-1);
    expect(bossDecisionCall).toBeGreaterThan(reviewCall);
    expect(openingResolution).toBeGreaterThan(bossDecisionCall);
    expect(investigatorObjective).toBeGreaterThan(openingResolution);
    const reviewToBoss = canonicalDiscoverySource.slice(reviewCall, bossDecisionCall);
    const reviewProviderAndParse = reviewToBoss.slice(0, reviewToBoss.indexOf('failureStage = "case_persistence";'));
    expect(reviewToBoss).not.toContain('if (rightHandRaw.status !== "completed")');
    expect(reviewProviderAndParse).not.toContain("throw new Error");
    // Cancellation during durable review-event persistence remains fail-closed;
    // provider outage or malformed advisory JSON must instead reach Boss as advice.
    expect(reviewToBoss).toContain("Canonical Atlas discovery case was cancelled before Right-hand opening advisory event.");
    expect(reviewToBoss).toContain("rightHand.error = \"Right-hand returned an invalid advisory review contract.\"");
    expect(controlSource).toContain("if (input.rightHandOverride)");
    expect(controlSource).toContain("rightHand = { ...input.rightHandOverride };");
    expect(controlSource).toContain("Right-hand is advisory on every turn");
    expect(controlSource).not.toContain('if (rightHand.status !== "completed" && !input.rightHandOverride)');
  });

  it("recovers only from an out-of-set candidate selection without relaxing admission", () => {
    expect(isRecoverableAtlasControlRejection({
      status: "unavailable",
      error: "Invalid candidate selection.",
    })).toBe(true);
    expect(isRecoverableAtlasControlRejection({
      status: "unavailable",
      error: "Groq Right-hand was unavailable.",
    })).toBe(false);
    expect(isRecoverableAtlasControlRejection({
      status: "completed",
      error: "Invalid candidate selection.",
    })).toBe(false);

    const rejectionAt = canonicalDiscoverySource.indexOf("if (isRecoverableAtlasControlRejection(decision))");
    const failClosedAt = canonicalDiscoverySource.indexOf('if (decision.status !== "completed")', rejectionAt);
    expect(rejectionAt).toBeGreaterThan(-1);
    expect(failClosedAt).toBeGreaterThan(rejectionAt);
    const recovery = canonicalDiscoverySource.slice(rejectionAt, failClosedAt);
    expect(recovery).toContain('currentAction: "canonical-control-candidate-rejected"');
    expect(recovery).toContain('status: "rejected"');
    expect(recovery).toContain('failureKind: "invalid_candidate_selection"');
    expect(recovery).toContain("admittedCandidateCount: admittedCandidateSources.length");
    expect(recovery).toContain("no target investigation executed");
    expect(recovery).toContain("continue;");
    expect(canonicalDiscoverySource).toContain('rejectedControlDecision = { controlTurn: controlTurns, reason: rejectionReason, kind: "candidate_selection" }');
    expect(canonicalDiscoverySource).toContain("the candidate was absent from the durable admitted-candidate list");
  });

  it("merges each Boss-directed discovery episode once on each mutually exclusive terminal/success branch", () => {
    // The success branch and the fail-closed episode branch are mutually exclusive;
    // each must merge the same episode once so the job projection cannot omit failed-episode activity.
    const mergeCount = canonicalDiscoverySource.match(/discovery = mergeDiscoveryResults\(discovery, nextDiscovery\);/g)?.length ?? 0;
    expect(mergeCount).toBe(2);
    const failureStart = canonicalDiscoverySource.indexOf("if (episodeFailure) {");
    const failureMerge = canonicalDiscoverySource.indexOf("discovery = mergeDiscoveryResults(discovery, nextDiscovery);", failureStart);
    const failureUpdate = canonicalDiscoverySource.indexOf("await updateJob(atlasJobId,", failureStart);
    const successMerge = canonicalDiscoverySource.indexOf("discovery = mergeDiscoveryResults(discovery, nextDiscovery);", failureMerge + 1);
    expect(failureMerge).toBeGreaterThan(failureStart);
    expect(failureMerge).toBeLessThan(failureUpdate);
    expect(successMerge).toBeGreaterThan(failureUpdate);
    expect(canonicalDiscoverySource).not.toContain(
      "searches: discovery.searches + nextDiscovery.searches, visits: discovery.visits + nextDiscovery.visits, iterations: discovery.iterations + nextDiscovery.iterations",
    );
  });


  it("carries discovery search history across Boss-directed episodes and quota recovery", () => {
    expect(canonicalDiscoverySource).toContain("priorTrajectoryRecords: discovery.trajectoryRecords ?? []");
    expect(canonicalDiscoverySource).toContain("priorTrajectoryRecords: [...priorTrajectoryRecords, ...(result.trajectoryRecords ?? [])]");
    expect(bureauPassSource).toContain("priorTrajectoryRecords,investigatorLlm:input.investigatorLlm");
    expect(bureauPassSource).toContain("const replayedTrajectoryRecords=mode===\"discovery\"?await loadDurableTrajectoryRecords(durableCaseId):[];");
    expect(bureauPassSource).toContain("for(const record of replayedTrajectoryRecords)mergedPriorRecords.set(record.turn,record)");
    expect(bureauPassSource).toContain("for(const record of input.priorTrajectoryRecords??[])mergedPriorRecords.set(record.turn,record)");
    expect(agenticResearchSource.match(/priorTrajectoryRecords: \[\.\.\.historyRecords, \.\.\.records\]/g) ?? []).toHaveLength(2);
        expect(agenticResearchSource.match(/const normalizedRecord = \{/g) ?? []).toHaveLength(2);
    expect(agenticResearchSource).toContain("failureDomain: raw.failureDomain ?? scopeGuardDiagnostic.domain");
    expect(agenticResearchSource).toContain("failureKind: raw.failureKind ?? scopeGuardDiagnostic.kind");
    expect(agenticResearchSource).not.toContain("historyRecords.length + record.turn");
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

describe("Run 04 search-lead and route-recovery regression", () => {
  it("keeps search-result URLs as unresolved leads instead of fetched observations", async () => {
    const { assignSearchResultLeads } = await import("../lib/agentic-web-research-core");
    const record: { leadUrls?: string[]; observedUrls: string[] } = {
      leadUrls: [],
      observedUrls: [],
    };

    assignSearchResultLeads(record, [
      "https://registry.example.test/search?id=42",
      "https://registry.example.test/search?id=42",
      "https://company.example.test/about",
      "https://user:pass@private.example.test/search?api_key=secret-value#session",
      "javascript:alert(1)",
      "not a URL",
    ]);

    expect(record.leadUrls).toEqual([
      "https://registry.example.test/search?id=42",
      "https://company.example.test/about",
      "https://private.example.test/search?api_key=%5BREDACTED%5D",
    ]);
    expect(record.leadUrls?.join("\n")).not.toContain("secret-value");
    expect(record.leadUrls?.join("\n")).not.toContain("user:pass");
    expect(record.observedUrls).toEqual([]);
    expect(agenticCoreSource).toContain("assignSearchResultLeads(record, successful.flatMap((result) => result.urls))");
    expect(agenticCoreSource).toContain('assignSearchResultLeads(record, record.execution === "success" ? result.urls : [])');
    expect(agenticCoreSource).toContain('summary: (record.leadUrls?.length ?? 0) + " search-result lead URLs surfaced from independent searches"');
    expect(agenticCoreSource).toContain('summary: `${record.leadUrls?.length ?? 0} search-result lead URLs surfaced`');
  });

  it("distinguishes local episode exhaustion from remaining mission capacity", async () => {
    const { buildMissionActionBudget } = await import("../lib/research-depth");
    const { compactAtlasInvestigatorReport } = await import("../lib/atlas-control-decision");
    const budget = buildMissionActionBudget({
      actionsUsed: 16,
      maximumActions: 20,
      maximumActionsPerEpisode: 6,
      episodeStopReason: "ITERATION_BUDGET",
    });

    expect(budget).toEqual({
      actionsUsed: 16,
      maximumActions: 20,
      actionsRemaining: 4,
      maximumActionsPerEpisode: 6,
      episodeStopReason: "ITERATION_BUDGET",
      episodeLimitReached: true,
      missionLimitReached: false,
    });
    const report = JSON.parse(compactAtlasInvestigatorReport(JSON.stringify({
      provider: "groq-investigator-1",
      status: "completed",
      stopReason: "ITERATION_BUDGET",
      missionActionBudget: budget,
    }))) as Record<string, any>;
    expect(report.missionActionBudget.actionsRemaining).toBe(4);
    expect(report.missionActionBudget.missionLimitReached).toBe(false);
    expect(atlasBudgetInterpretationLaw()).toContain("Do not claim global budget exhaustion while actionsRemaining is greater than zero");
    const rightHandPrompt = buildAtlasRightHandControlPrompt({
      investigatorReport: JSON.stringify(report),
      compactState: JSON.stringify({ missionActionBudget: report.missionActionBudget }),
    });
    const bossPrompt = buildAtlasBossControlPrompt({
      investigatorReport: JSON.stringify(report),
      compactState: JSON.stringify({ missionActionBudget: report.missionActionBudget }),
      rightHand: { status: "completed", decision: "continue or stop based on evidence", reason: "Test only", direction: null, confidence: 0.5, model: "test-model", error: null },
    });
    expect(rightHandPrompt).toContain("episodeStopReason=ITERATION_BUDGET");
    expect(bossPrompt).toContain("actionsRemaining is greater than zero");
    expect(canonicalDiscoverySource).toContain("missionActionBudget: buildMissionActionBudget({");
  });

  it("gives both supervisor prompts source-route recovery guidance without prescribing the next action", () => {
    const rightHandPrompt = buildAtlasRightHandControlPrompt({
      investigatorReport: "A public registry route returned HTTP 403; another successful fetch exposed only a generic agency landing page.",
      compactState: "Observed attempts did not reach entity-level ownership records.",
    });
    const bossPrompt = buildAtlasBossControlPrompt({
      investigatorReport: "A public registry route returned HTTP 403; another successful fetch exposed only a generic agency landing page.",
      compactState: "Observed attempts did not reach entity-level ownership records.",
      rightHand: { status: "completed", decision: "reassess", reason: "The current source route has not yielded entity-level data.", direction: null, confidence: 0.8, model: "test-model", error: null },
    });

    expect(atlasSourceRouteRecoveryLaw()).toContain("Do not pivot only from one jurisdiction to another");
    expect(rightHandPrompt).toContain("SOURCE-ROUTE RECOVERY JUDGMENT");
    expect(bossPrompt).toContain("SOURCE-ROUTE RECOVERY JUDGMENT");
    expect(rightHandPrompt).toContain("Never evade access controls");
    expect(bossPrompt).toContain("The Investigator remains autonomous");
    expect(rightHandPrompt).toContain("Do not claim global budget exhaustion");
    expect(bossPrompt).toContain("Do not claim global budget exhaustion");
  });
});

describe("discovery trajectory turn persistence", () => {
  it("preserves globally numbered Investigator records and only offsets local history text", () => {
    expect(agenticCoreSource).toContain("turn: priorTurnOffset + i + 1");
    expect(bureauPassSource).toContain("turn:Math.max(1,Number(record.turn)||1)");
    expect(bureauPassSource).not.toContain("turn:baseIteration+Math.max(1,Number(record.turn)||1)");
    expect(bureauPassSource).toContain("step${trajectoryTurnOffset+Number(numberString)}:");
    expect(bureauPassSource).toContain("trajectoryTurnOffset:0,finalize:false");
    expect(bureauPassSource).toContain("trajectoryTurnOffset:discoveryTurnOffset,finalize:true");
    expect(bureauPassSource).toContain("const discoveryTurnOffset=Math.max(0,...priorTrajectoryRecords.map((record)=>record.turn));");
    expect(bureauPassSource).not.toContain("baseIteration");
  });
});

describe("canonical Investigator continuation failure handling", () => {
  it("does not allow an errored or empty continuation to fall through into another Boss control turn", () => {
    expect(canonicalDiscoverySource).toContain("classifyInvestigatorEpisodeFailure({");
    expect(canonicalDiscoverySource).toContain('currentAction: "canonical-investigator-episode-failed"');
    expect(canonicalDiscoverySource).toContain("investigator-episode-failure:control:");
    expect(canonicalDiscoverySource).toContain("trajectoryRecordCount");
    expect(canonicalDiscoverySource).toContain("hasExecutedInvestigatorResearchAction(newTrajectoryRecords)");
    expect(canonicalDiscoverySource).toContain("import { classifyInvestigatorEpisodeFailure, hasExecutedInvestigatorResearchAction, summarizeAtlasDiscoveryResearchHealth }");
    expect(canonicalDiscoverySource).not.toContain('!["done", "parse_failure", "investigator_provider_error"].includes(record.action)');
    expect(canonicalDiscoverySource).toContain("const newTrajectoryRecords = nextDiscovery.trajectoryRecords ?? [];");
    expect(canonicalDiscoverySource).toContain("const newTrajectoryRecordCount = newTrajectoryRecords.length;");
    expect(canonicalDiscoverySource).not.toContain("priorTrajectoryRecordCount");
    expect(canonicalDiscoverySource).toContain("failureDomain: diagnostic.domain");
    expect(canonicalDiscoverySource).toContain("await clearActiveJobIfOwned(lockKey, atlasJobId);");
    expect(canonicalDiscoverySource).toContain("return { phase: 3, ingested: 0, enriched: materialized");
  });
});


describe("Boss-adjudicated opening direction", () => {
  it("uses Boss's validated pivot instead of the direction initially proposed to Right-hand", () => {
    const initial = "Investigate privately held manufacturers in Bavaria using public register and company filings.";
    const bossAlternative = "Investigate regional logistics operators in Lower Saxony using public company records and transaction reporting.";
    expect(resolveBossAdjudicatedOpeningDirection({
      bossAction: "pivot_discovery",
      bossDirection: bossAlternative,
      initialBossDirection: initial,
    })).toEqual({
      status: "approved",
      direction: bossAlternative,
      source: "boss_direction",
      reason: null,
    });
  });

  it("lets Boss retain its original hypothesis after weighing contrary Right-hand advice", () => {
    const initial = "Investigate privately held manufacturers in Bavaria using public register and company filings.";
    // Right-hand's opinion is intentionally not an input to the resolver. Boss's
    // final model-authored action is the only authority for scope activation.
    expect(resolveBossAdjudicatedOpeningDirection({
      bossAction: "continue_discovery",
      bossDirection: null,
      initialBossDirection: initial,
    })).toEqual({
      status: "approved",
      direction: initial,
      source: "initial_boss_direction",
      reason: null,
    });
  });

  it("allows Boss to continue the human base objective without adopting an initial direction", () => {
    expect(resolveBossAdjudicatedOpeningDirection({
      bossAction: "continue_discovery",
      bossDirection: null,
      initialBossDirection: null,
    })).toEqual({
      status: "base_scope",
      direction: null,
      source: "base_objective",
      reason: null,
    });
  });

  it("honors a model-authored Boss stop without launching the Investigator", () => {
    expect(resolveBossAdjudicatedOpeningDirection({
      bossAction: "stop",
      bossDirection: null,
      initialBossDirection: "Investigate private manufacturers in Bavaria.",
    })).toMatchObject({ status: "stopped", source: "boss_stop" });
  });

  it("rejects invalid Boss actions, missing pivots and tool/URL directives", () => {
    expect(resolveBossAdjudicatedOpeningDirection({
      bossAction: "research_candidate",
      bossDirection: null,
      initialBossDirection: null,
    }).status).toBe("invalid");
    expect(resolveBossAdjudicatedOpeningDirection({
      bossAction: "pivot_discovery",
      bossDirection: null,
      initialBossDirection: "Investigate private manufacturers in Bavaria.",
    }).status).toBe("invalid");
    for (const bossDirection of [
      "Use parallel_web_search for the next step.",
      "Investigate this URL: https://example.test/person",
      "Search using site:example.com owners Bavaria",
      "x".repeat(1_201),
    ]) {
      const result = resolveBossAdjudicatedOpeningDirection({
        bossAction: "pivot_discovery",
        bossDirection,
        initialBossDirection: "Investigate private manufacturers in Bavaria.",
      });
      expect(result.status).toBe("invalid");
      expect(result.direction).toBeNull();
    }
  });

  it("fails closed on invalid Boss output, not on a Right-hand disagreement or outage", () => {
    const bossCall = canonicalDiscoverySource.indexOf("const openingBossDecision = await decideAtlasNextAction(");
    const invalidBossGuard = canonicalDiscoverySource.indexOf('if (openingBossDecision.status !== "completed")', bossCall);
    const openingResolution = canonicalDiscoverySource.indexOf("resolveBossAdjudicatedOpeningDirection({", bossCall);
    const investigatorObjective = canonicalDiscoverySource.indexOf("const openingInvestigatorObjective = [", openingResolution);
    expect(bossCall).toBeGreaterThan(-1);
    expect(invalidBossGuard).toBeGreaterThan(bossCall);
    expect(openingResolution).toBeGreaterThan(invalidBossGuard);
    expect(investigatorObjective).toBeGreaterThan(openingResolution);
    expect(canonicalDiscoverySource).toContain('currentAction: "groq-boss-opening-stop"');
    expect(canonicalDiscoverySource).toContain("RIGHT-HAND REVIEW: advisory only.");
    expect(canonicalDiscoverySource).not.toContain("Groq Right-hand unavailable; failing closed");
    expect(canonicalDiscoverySource).not.toContain('currentAction: "groq-right-hand-unavailable"');
  });

  it("does not leak unselected Boss hypotheses as active Investigator scope", () => {
    expect(canonicalDiscoverySource).toContain("BOSS FINAL OPENING DECISION:");
    expect(canonicalDiscoverySource).toContain("Only actual same-run Investigator tool observations may establish candidate names, source URLs, relationships, ownership, wealth, or contact routes.");
    expect(canonicalDiscoverySource).not.toContain("openingDirectionResolution.status === \"approved\"");
    expect(canonicalDiscoverySource).not.toContain("Boss-adjudicated direction:");
    expect(canonicalDiscoverySource).toContain("RIGHT-HAND INDEPENDENT ADVICE (non-authoritative):");
    expect(canonicalDiscoverySource).not.toContain("Right-hand opening approval:");
  });
});

describe("scope-recovery control feedback delivery", () => {
  it("survives report compaction while preserving the complete review-target inventory for Boss", () => {
    const feedback = "No-progress scope-recovery feedback (control state, not research evidence): 3 Investigator actions were blocked before outbound execution. Do not prescribe a fixed target, sector, query, provider, source, tool, or action sequence.";
    const compacted = JSON.parse(compactAtlasInvestigatorReport(JSON.stringify({ scopeRecoveryFeedback: feedback }))) as Record<string, unknown>;
    expect(compacted.scopeRecoveryFeedback).toBe(feedback);
    expect(controlSource).toContain("scopeRecoveryFeedback: boundedText(parsed.scopeRecoveryFeedback, 1_200)");
    expect(controlSource).toContain("When supplied scope-recovery feedback reports repeated preflight blocks");
    expect(controlSource).toContain("COMPLETE AVAILABLE REVIEW TARGETS (all model-selected durable targets; exact names and types; no top-N truncation)");
    expect(controlSource).toContain("const rightHandPrompt = buildAtlasRightHandControlPrompt({ investigatorReport, compactState, pinnedControlState: input.pinnedControlState });");
    expect(controlSource).toContain("const prompt = buildAtlasBossControlPrompt({ investigatorReport, compactState, pinnedControlState: input.pinnedControlState, opening: input.opening, humanObjective: input.objective, rightHand });");
  });
});


describe("unresolved template placeholder rejection at the opening boundary", () => {
  it("refuses to activate directions containing unresolved country, location, or templating placeholders", () => {
    for (const firstDirection of [
      "Search the trade register for manufacturers in [Country].",
      "Find private manufacturers and owners in {{country}}.",
      "Find owners of industrial firms in <Country>.",
      "Search the [Location] company directory for manufacturing owners.",
      "Find companies in TBD and identify their owners.",
    ]) {
      const result = resolveBossAdjudicatedOpeningDirection({ bossAction: "pivot_discovery", bossDirection: firstDirection, initialBossDirection: null });
      expect(result.status).toBe("invalid");
      expect(result.direction).toBeNull();
      expect(result.reason).toContain("template placeholder");
    }
  });

  it("keeps unselected Boss hypotheses out of the active Investigator objective", () => {
    expect(canonicalDiscoverySource).toContain("BOSS FINAL OPENING DECISION:");
    expect(canonicalDiscoverySource).toContain("Only actual same-run Investigator tool observations may establish candidate names, source URLs, relationships, ownership, wealth, or contact routes.");
    expect(canonicalDiscoverySource).toContain("RIGHT-HAND INDEPENDENT ADVICE (non-authoritative):");
    expect(canonicalDiscoverySource).not.toContain("rightHand.approval");
    expect(canonicalDiscoverySource).not.toContain("Right-hand opening approval:");
  });
});

describe("model-request audit correlation", () => {
  it("passes durable job/case IDs to control-plane audits whenever the case is known", () => {
    expect(bossSource).toContain("jobId: options?.jobId ?? null");
    expect(bossSource).toContain("caseId: options?.caseId ?? null");
    expect(rightHandSource).toContain("jobId:auditContext?.jobId??null");
    expect(rightHandSource).toContain("caseId:auditContext?.caseId??null");
    expect(controlSource).toContain('{ jobId: input.jobId ?? null, caseId: input.caseId, targetDigest, iteration: input.controlTurn, decisionId, cognitiveTask: "control_advisory" }');
    expect(controlSource).toContain('jobId: input.jobId ?? null, caseId: input.caseId, targetDigest, iteration: input.controlTurn, decisionId, cognitiveTask: "control_decision"');
    expect(canonicalDiscoverySource).toContain("{ jobId: atlasJobId, caseId: discoveryCaseId }");
    expect(canonicalDiscoverySource).toContain("jobId: atlasJobId");
    expect(canonicalDiscoverySource).toContain("caseId: opts.discoveryCaseId ?? null");
  });
});


describe("Atlas supervisor pinned state survives discovery-history compaction", () => {
  const pinned = buildAtlasPinnedControlState({
    activeScope: "Identify beneficial owners of private manufacturing companies in Stockholm County via Swedish public filings",
    leadInventory: {
      searchResultLeadUrlCount: 42,
      successfullyFetchedLeadUrlCount: 10,
      unfetchedLeadUrlCount: 32,
      failedLeadUrlCount: 3,
      blockedLeadUrlCount: 1,
      unfetchedLeadUrls: [
        "https://registry.example.test/company-search",
        "https://industry.example.test/member-directory",
        "https://filings.example.test/private-manufacturer",
      ],
      failedLeadUrls: [{ url: "https://broken.example.test/registry", action: "browser_fetch", execution: "error", failureDomain: "external_page_fetch", failureKind: "request_failure" }],
      blockedLeadUrls: [{ url: "https://blocked.example.test/lookup", action: "visit", failureDomain: "preflight", failureKind: "scope_guard" }],
    },
    admittedCandidates: [],
    findings: [],
  });

  it("pins the active Boss scope and full lead counts outside the compacted historical state", () => {
    expect(pinned).toContain("ACTIVE ACCEPTED BOSS SCOPE");
    expect(pinned).toContain("Stockholm County");
    expect(pinned).toContain('"unfetchedLeadUrlCount":32');
    expect(pinned).toContain("https://registry.example.test/company-search");
    expect(pinned).toContain("FAILED ROUTES");
    expect(pinned).toContain("PREFLIGHT-BLOCKED ROUTES");
    expect(pinned).toContain("Do not say no leads remain if unfetchedLeadUrlCount is positive");
  });

  it("keeps the pinned lead inventory visible to both Right-hand and Boss despite huge history text", () => {
    const rightHandPrompt = buildAtlasRightHandControlPrompt({
      investigatorReport: "report " + "R".repeat(20_000),
      compactState: "history " + "H".repeat(30_000) + " COMPACT HISTORY TAIL",
      pinnedControlState: pinned,
    });
    const bossPrompt = buildAtlasBossControlPrompt({
      investigatorReport: "report " + "R".repeat(40_000),
      compactState: "history " + "H".repeat(80_000) + " COMPACT HISTORY TAIL",
      pinnedControlState: pinned,
      rightHand: { status: "completed", decision: "continue_discovery", reason: "Remaining leads are still listed.", direction: null, confidence: 0.8, model: "test-model", error: null },
    });

    expect(rightHandPrompt).toContain("PINNED AUTHORITATIVE CASE STATE");
    expect(rightHandPrompt).toContain('"unfetchedLeadUrlCount":32');
    expect(rightHandPrompt).toContain("https://registry.example.test/company-search");
    expect(bossPrompt).toContain("PINNED AUTHORITATIVE CASE STATE");
    expect(bossPrompt).toContain('"unfetchedLeadUrlCount":32');
    expect(bossPrompt).toContain("https://registry.example.test/company-search");
    expect(rightHandPrompt.length).toBeLessThanOrEqual(9_600);
    expect(bossPrompt.length).toBeLessThanOrEqual(ATLAS_BOSS_CONTROL_PROMPT_BUDGET);
  });

  it("passes the durable inventory and nonterminal partial findings into control decisions", () => {
    expect(canonicalDiscoverySource).toContain("const controlFindings = [...(discovery.findings ?? []), ...(discovery.partialFindings ?? [])]");
    expect(canonicalDiscoverySource).toContain("buildDiscoveryLeadUtilizationState(discovery.trajectoryRecords ?? [])");
    expect(canonicalDiscoverySource).toContain("buildAtlasPinnedControlState({ activeScope: discoveryPivotScopeKey(activeDiscoveryObjective)");
    expect(canonicalDiscoverySource).toContain("pinnedControlState, investigatorReport:");
  });
});
