#!/usr/bin/env node
import fs from "node:fs";
const control = fs.readFileSync("artifacts/api-server/src/src/lib/atlas-control-decision.ts", "utf8");
const atlas = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts", "utf8");
const targetRunner = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts", "utf8");
const terminalAuthority = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-terminal-authority.ts", "utf8");
const continuation = fs.readFileSync("artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts", "utf8");
const continuationChecks = [
  ["discovery continuation iteration is not allocated from an unlocked snapshot", !/const iteration=Number\(current\.iteration\?\?0\)\+1/.test(continuation)],
  ["discovery continuation allocates iteration from locked durable case row", /iteration=Number\(locked\.iteration\?\?0\)\+1/.test(continuation) && /\\.for\\("update"\\)/.test(continuation)],
];
const targetContinuation = fs.readFileSync("artifacts/api-server/src/src/routes/research/canonical-target-continuation.ts", "utf8");
const targetContinuationChecks = [
  ["target continuation reads durable control_decision history", /eventType, "control_decision"/.test(targetContinuation) && /orderBy\(desc\(researchCaseEventsTable\.id\)\)/.test(targetContinuation)],
  ["target continuation persists the allocated control turn to the case projection", /currentAction: `groq-\$\{decision\.action\}`[\s\S]*iteration: controlTurn/.test(targetContinuation)],
];
const checks = [
  ["control decision imports durable case tables", /researchCasesTable/.test(control) && /researchCaseEventsTable/.test(control)],
  ["control decision writes a durable control_decision event", /eventType:\s*[\"']control_decision[\"']/.test(control)],
  ["control decision records Boss action and candidate", /action:\s*input\.decision\.action/.test(control) && /candidateName:\s*input\.decision\.candidateName/.test(control)],
  ["control decision records Right-hand state", /rightHand:\s*input\.decision\.rightHand/.test(control)],
  ["control decision records control turn", /controlTurn:\s*input\.controlTurn/.test(control)],
  ["control decision persistence is transactional", /await db\.transaction\(async \(tx\) =>/.test(control) && /await tx\.insert\(researchCaseEventsTable\)/.test(control) && /await tx\.update\(researchCasesTable\)/.test(control)],
  ["control case row is locked while persisting", /\.from\(researchCasesTable\)\.where\(eq\(researchCasesTable\.id, input\.caseId\)\)\.for\(\"update\"\)/.test(control)],
  ["control replay uses an exact case/job/turn correlation key", /atlas-control:case:\$\{input\.caseId\}:job:\$\{input\.jobId \?\? "legacy"\}:turn:\$\{input\.controlTurn\}/.test(control)],
  ["control replay collision is fail-closed", /Atlas control replay collision/.test(control) && /existingEvent\.payload !== payloadJson/.test(control)],
  ["control decision persistence catches storage failure", /catch\s*\(error\).*logger\.error[\s\S]*return false/.test(control)],
  ["control decision persistence exposes durable failure", /Failed to persist Atlas control decision/.test(control)],
  ["control decision finalization converts persistence failure into fail-closed stop", /const persisted = await persistControlDecision/.test(control) && /transition is fail-closed/.test(control)],
  ["control decision requires durable case ID", /caseId:\s*number;/.test(control) && /requires a valid durable caseId/.test(control)],
  ["control decision requires positive control turn", /controlTurn:\s*number;/.test(control) && /requires a valid positive controlTurn/.test(control)],
  ["persistence cannot silently skip a missing case ID", !/if\s*\(!input\.caseId\)\s*return/.test(control)],
  ["canonical Atlas passes durable discovery case ID", /caseId:\s*discoveryCaseId/.test(atlas)],
  ["canonical Atlas passes control turn", /controlTurn:\s*controlTurns/.test(atlas)],
  ["canonical discovery opens Groq Boss before Groq Right-hand review", /runGroqBossDiscovery\([\s\S]*?runGroqRightHandFreeJson/.test(atlas)],
  ["canonical Atlas fails closed when Right-hand is unavailable", /rightHandRaw\.status\s*!==\s*["\']completed["\'][\s\S]{0,1200}(?:throw new Error|status:\s*["\']review["\'])/.test(atlas)],
  ["canonical Atlas fails closed on invalid Right-hand oversight JSON", /rightHandRaw\.status === ["\']completed["\'][\s\S]{0,800}JSON\.parse/.test(atlas)],
  ["discovery-only completion requires Investigator terminal done", /discovery\.status === "completed" && discovery\.stopReason === "MODEL_DECIDED_DONE"/.test(atlas)],
  ["resource-limited discovery remains reviewable", /durableStatus = discovery\.status === "completed" && discovery\.stopReason === "MODEL_DECIDED_DONE" && !investigatorResourceLimited && admitted\.length > 0 \? "complete" : "review"/.test(atlas)],
  ["full Atlas completion requires evidence-backed Investigator terminal state and deadline", /const evidenceBackedTerminal =/.test(atlas) && /const finalIncomplete = investigatorResourceLimited \|\| deadlineExceeded \|\| finalControlAction !== "stop" \|\| !evidenceBackedTerminal/.test(atlas)],
];
checks.push(["canonical Atlas unexpected failures close the durable discovery case",/canonical-atlas-failed/.test(atlas)&&/status: "review"/.test(atlas)&&/researchCasesTable\.caseFile/.test(atlas)]);
checks.push(["discovery exposes a per-act durable trajectory callback",/onTrajectoryRecord\?:/.test(fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research.ts","utf8"))&&/await input\.onTrajectoryRecord\?\.\(normalizedRecord\)/.test(fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research.ts","utf8"))]);
const wrapperSource = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research.ts", "utf8");
const actInputStart = wrapperSource.indexOf("const actInput: RunInput =");
const actInputEnd = wrapperSource.indexOf("const actResult = await core.runAgenticWebResearch(actInput);", actInputStart);
const actInputSource = actInputStart >= 0 && actInputEnd > actInputStart ? wrapperSource.slice(actInputStart, actInputEnd) : "";
checks.push(["all one-action core calls defer durable trajectory callbacks to normalized wrapper checkpoints", (wrapperSource.match(/const actInput: RunInput =/g) ?? []).length === 2 && (wrapperSource.match(/onTrajectoryRecord: undefined/g) ?? []).length === 2 && !/onTrajectoryRecord:\s*input\.onTrajectoryRecord/.test(wrapperSource) && (wrapperSource.match(/await input\.onTrajectoryRecord\?\.\(normalizedRecord\)/g) ?? []).length >= 3 && /normalizedRecord\.action = "verification_required"/.test(wrapperSource) && /normalizedRecord\.execution = "blocked"/.test(wrapperSource) && /records = \[\.\.\.records, normalizedRecord\];\s*await input\.onTrajectoryRecord\?\.\(normalizedRecord\);\s*actionsSinceCheckpoint/.test(wrapperSource)]);
checks.push(["target and discovery turns retain bounded model-owned continuation context", /CONTINUATION STATE: Continue from accumulated durable observations/.test(wrapperSource) && /RECENT PRIOR ACTS \(newest last\)/.test(wrapperSource) && (wrapperSource.match(/priorContext: buildContinuationState/g) ?? []).length === 2]);
const coreInvestigator = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts","utf8");
checks.push(["core Investigator emits sanitized trajectory records through one awaited callback boundary",/onTrajectoryRecord\?:/.test(coreInvestigator)&&/async function emitSanitizedTrajectoryRecord\(record: AgenticTrajectoryRecord\): Promise<void>\s*\{\s*await input\.onTrajectoryRecord\?\.\(sanitizeObservableValue\(record\)\);/.test(coreInvestigator)&&/await emitSanitizedTrajectoryRecord\(records\[records\.length - 1\]!\)/.test(coreInvestigator)&&/await emitSanitizedTrajectoryRecord\(record\)/.test(coreInvestigator)&&(coreInvestigator.match(/await emitSanitizedTrajectoryRecord\(/g)||[]).length >= 15]);
checks.push(["Investigator prompt exposes concrete provider values",/VALID PROVIDERS: web_search\/parallel_web_search = serper \| tavily \| exa/.test(fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts","utf8"))&&/provider=\$\{c\.action === "web_search" \? "serper\|tavily\|exa"/.test(fs.readFileSync("artifacts/api-server/src/src/lib/atlas-capability-registry.ts","utf8"))]);
checks.push(["discovery forwards the cumulative current-run trajectory into canonical persistence",/onTrajectoryRecord:mode==="discovery"&&durableCaseId!=null\?async\(record\)=>\{discoveryTrajectoryRecords=\[\.\.\.discoveryTrajectoryRecords\.filter\(\(prior\)=>prior\.turn!==record\.turn\),record\]\.sort\(\(a,b\)=>a\.turn-b\.turn\);await persistDiscoveryTrajectory/.test(fs.readFileSync("artifacts/api-server/src/src/lib/bureau-agentic-pass.ts","utf8"))]);
checks.push(["successful finalized discovery claims join current and replayed source observations",/for\(const record of offsetRecords\.filter\(\(candidate\)=>input\.finalize===true&&candidate\.action==="done"&&candidate\.execution==="success"\)\)/.test(fs.readFileSync("artifacts/api-server/src/src/lib/bureau-agentic-pass.ts","utf8"))&&/claimAppearsInObservedMaterial\(finding,groundingRecords\)/.test(fs.readFileSync("artifacts/api-server/src/src/lib/bureau-agentic-pass.ts","utf8"))&&/candidate\.durableEventId!=null/.test(fs.readFileSync("artifacts/api-server/src/src/lib/bureau-agentic-pass.ts","utf8"))&&/uniqueObservationEventIds/.test(fs.readFileSync("artifacts/api-server/src/src/lib/bureau-agentic-pass.ts","utf8"))&&/observationTurns=offsetRecords\.filter/.test(fs.readFileSync("artifacts/api-server/src/src/lib/bureau-agentic-pass.ts","utf8"))]);
checks.push(["candidate contact evidence requires bounded same-source co-binding",/bindExactSourceSpan\(observationText,cleanValue,personName,320\)\?\.exact/.test(fs.readFileSync("artifacts/api-server/src/src/lib/bureau-contact-persist-strict.ts","utf8"))&&/hasBoundPhoneAndIdentity/.test(fs.readFileSync("artifacts/api-server/src/src/lib/bureau-contact-persist-strict.ts","utf8"))]);
checks.push(["terminal target evidence uses a bounded 320-character identity/value binding",/const combinedSpan = bindExactSourceSpan\(source\.observation, value, subject, 320\)/.test(fs.readFileSync("artifacts/api-server/src/src/lib/research-intelligence-engine.ts","utf8"))]);
checks.push(["discovery checkpoint persistence is deduplicated by run and turn",/existingTrajectoryKeys/.test(fs.readFileSync("artifacts/api-server/src/src/lib/bureau-agentic-pass.ts","utf8"))&&/:turn:\$\{record\.turn\}:trajectory/.test(fs.readFileSync("artifacts/api-server/src/src/lib/bureau-agentic-pass.ts","utf8"))]);
checks.push(["partial discovery checkpoints do not finalize the run",fs.readFileSync("artifacts/api-server/src/src/lib/bureau-agentic-pass.ts","utf8").includes("const nextRunIds=input.finalize?[...new Set([...existingRunIds,input.runId])]:existingRunIds")&&/existingRunIds\.includes\(input\.runId\) && !input\.finalize/.test(fs.readFileSync("artifacts/api-server/src/src/lib/bureau-agentic-pass.ts","utf8"))]);
checks.push(["durable Atlas control projection is bounded",/history\.splice\(0, Math\.max\(0, history\.length - 32\)\)/.test(control)]);
checks.push(["discovery target admission is bound to the owning durable entity",/metadata\.discoveryCaseId/.test(atlas)&&/refusing ambiguous same-name target research/.test(atlas)]);
checks.push(["terminal Boss decision is captured before stop breaks control loop",/finalControlAction = decision\.action;\s*if \(decision\.action === "stop"\) break/.test(atlas)]);
checks.push(["repeated Investigator provider-unavailable discovery episodes are bounded",/maxConsecutiveInvestigatorProviderUnavailable = 2/.test(atlas)&&/isInvestigatorProviderUnavailable/.test(atlas)&&/canonical-investigator-provider-unavailable/.test(atlas)&&/refusing further AI control churn/.test(atlas)]);
checks.push(["hard Investigator quota is classified distinctly from transient unavailability",/isInvestigatorHardQuotaExhausted/.test(atlas)&&/upstream_quota_exhausted/.test(atlas)&&/groqHardRequestQuota/.test(fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts","utf8"))]);
checks.push(["hard Investigator quota recovery is Boss-directed and excludes exhausted capabilities",/reassignInvestigatorAfterHardQuota/.test(atlas)&&/excludedInvestigatorLlm/.test(fs.readFileSync("artifacts/api-server/src/src/lib/case-bureau.ts","utf8"))&&/excludedInvestigatorLlm: \[\.\.\.quotaExhaustedInvestigators\]/.test(atlas)]);
checks.push(["hard quota reassignment is durably persisted as a Boss assignment",/eventType: "assignment"/.test(atlas)&&/upstream_quota_exhausted/.test(atlas)&&/investigatorCapabilityHistory/.test(atlas)&&/actorRole: "groq_boss"/.test(atlas)]);
checks.push(["exhausted Investigator capability cannot be silently reselected for target research",/excludedInvestigatorLlm: \[\.\.\.quotaExhaustedInvestigators\]/.test(atlas)&&/excludedInvestigatorLlm\?: readonly InvestigatorCapability\[\]/.test(fs.readFileSync("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts","utf8"))]);
checks.push(["target Investigator hard quota has Boss-directed recovery",/isHardQuotaResult/.test(fs.readFileSync("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts","utf8"))&&/reassignTargetInvestigatorAfterHardQuota/.test(fs.readFileSync("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts","utf8"))&&/upstream_quota_exhausted/.test(fs.readFileSync("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts","utf8"))]);
checks.push(["target Investigator iterations are charged to the Atlas global ceiling",/remainingTargetIterations = Math\.max\(0, depth\.agenticMaxIterations - investigatorIterationsUsed\)/.test(atlas)&&/maxInvestigatorIterations: remainingTargetIterations/.test(atlas)&&/investigatorIterationsUsed \+= Math\.max\(0, targetResult\.investigatorIterationsUsed\)/.test(atlas)]);
checks.push(["incomplete Atlas terminal preserves truthful reason",/finalCaseAction = finalIncomplete[\s\S]{0,700}canonical-evidence-terminal-incomplete/.test(atlas)]);
checks.push(["target terminal requires completed oversight status", /isCanonicalTargetEpisodeComplete\(\{[\s\S]{0,650}oversightStatus: lastOversight\?\.status \?\? null[\s\S]{0,200}oversightAction: lastOversight\?\.action/.test(targetRunner)]);
checks.push(["target terminal authority includes cancellation, resource and deadline fences", /input\.oversightStatus === "completed"[\s\S]*input\.oversightAction === "stop"[\s\S]*!input\.cancelled[\s\S]*!input\.resourceLimited[\s\S]*!input\.deadlineExceeded/.test(terminalAuthority)]);

let failed = false; for (const [label, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"} ${label}`); if (!ok) failed = true; }
if (failed) { console.error("Atlas control durability guard failed."); process.exit(1); }

console.log("Atlas control durability guard passed.");