#!/usr/bin/env node
import fs from "node:fs";
const control = fs.readFileSync("artifacts/api-server/src/src/lib/atlas-control-decision.ts", "utf8");
const atlas = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts", "utf8");
const continuation = fs.readFileSync("artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts", "utf8");
const continuationChecks = [
  ["discovery continuation iteration is not allocated from an unlocked snapshot", !/const iteration=Number\\(current\\.iteration\\?\\?0\\)\\+1/.test(continuation)],
  ["discovery continuation allocates iteration from locked durable case row", /iteration=Number\\(locked\\.iteration\\?\\?0\\)\\+1/.test(continuation) && /\\.for\\("update"\\)/.test(continuation)],
];
const checks = [
  ["control decision imports durable case tables", /researchCasesTable/.test(control) && /researchCaseEventsTable/.test(control)],
  ["control decision writes a durable control_decision event", /eventType:\s*[\"']control_decision[\"']/.test(control)],
  ["control decision records Boss action and candidate", /action:\s*input\.decision\.action/.test(control) && /candidateName:\s*input\.decision\.candidateName/.test(control)],
  ["control decision records Right-hand state", /rightHand:\s*input\.decision\.rightHand/.test(control)],
  ["control decision records control turn", /controlTurn:\s*input\.controlTurn/.test(control)],
  ["control decision persistence is transactional", /await db\.transaction\(async \(tx\) =>/.test(control) && /await tx\.insert\(researchCaseEventsTable\)/.test(control) && /await tx\.update\(researchCasesTable\)/.test(control)],
  ["control case row is locked while persisting", /\.from\(researchCasesTable\)\.where\(eq\(researchCasesTable\.id, input\.caseId\)\)\.for\(\"update\"\)/.test(control)],
  ["control replay uses an exact case/turn correlation key", /atlas-control:case:\$\{input\.caseId\}:turn:\$\{input\.controlTurn\}/.test(control)],
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
  ["resource-limited discovery remains reviewable", /durableStatus = discovery\.status === "completed" && discovery\.stopReason === "MODEL_DECIDED_DONE" && !investigatorResourceLimited \? "complete" : "review"/.test(atlas)],
  ["full Atlas completion requires evidence-backed Investigator terminal state", /const evidenceBackedTerminal =/.test(atlas)&&/const finalIncomplete = investigatorResourceLimited \|\| finalControlAction !== "stop" \|\| !evidenceBackedTerminal/.test(atlas)],
];
checks.push(["canonical Atlas unexpected failures close the durable discovery case",/canonical-atlas-failed/.test(atlas)&&/status: "review"/.test(atlas)&&/researchCasesTable\.caseFile/.test(atlas)]);
checks.push(["durable Atlas control projection is bounded",/history\.splice\(0, Math\.max\(0, history\.length - 32\)\)/.test(control)]);
checks.push(["discovery target admission is bound to the owning durable entity",/metadata\.discoveryCaseId/.test(atlas)&&/refusing ambiguous same-name target research/.test(atlas)]);
checks.push(["terminal Boss decision is captured before stop breaks control loop",/finalControlAction = decision\.action;\s*if \(decision\.action === "stop"\) break/.test(atlas)]);
checks.push(["target Investigator iterations are charged to the Atlas global ceiling",/remainingTargetIterations = Math\.max\(0, depth\.agenticMaxIterations - investigatorIterationsUsed\)/.test(atlas)&&/maxInvestigatorIterations: remainingTargetIterations/.test(atlas)&&/investigatorIterationsUsed \+= Math\.max\(0, targetResult\.investigatorIterationsUsed\)/.test(atlas)]);
checks.push(["incomplete Atlas terminal preserves truthful reason",/finalCaseAction = finalIncomplete[\s\S]{0,700}canonical-evidence-terminal-incomplete/.test(atlas)]);
let failed = false; for (const [label, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"} ${label}`); if (!ok) failed = true; }
if (failed) { console.error("Atlas control durability guard failed."); process.exit(1); }
console.log("Atlas control durability guard passed.");