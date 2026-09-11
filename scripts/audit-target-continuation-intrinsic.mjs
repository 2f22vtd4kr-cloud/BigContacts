#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const runner = read("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts");
const control = read("artifacts/api-server/src/src/lib/target-control-decision.ts");
const continuation = read("artifacts/api-server/src/src/routes/research/canonical-target-continuation.ts");

const controlCall = runner.indexOf("decideTargetNextAction(");
const investigatorCall = runner.indexOf("runTargetContactAgent(");
const loopStart = runner.indexOf("for (pass = 1; pass <= maxPasses; pass++)");
const finalReview = runner.indexOf("const finalBoss = await runGeminiBossDiscovery");
const stopGate = runner.indexOf("if (stoppedByBoss)");
const controlAfterLoopStart = loopStart >= 0 && controlCall > loopStart;
const controlBeforeFinalReview = controlCall >= 0 && finalReview >= 0 && controlCall < finalReview;
const investigatorBeforeControl = investigatorCall >= 0 && controlCall > investigatorCall;
const finalReviewIsStopGated = stopGate >= 0 && finalReview > stopGate;

const checks = [
  ["target control uses minimal research/stop disposition", /"research"/.test(control) && /"stop"/.test(control) && !/continue_target/.test(control) && !/revisit_target/.test(control) && !/pivot_target/.test(control)],
  ["target control is Gemini-owned", /generateGeminiBossText/.test(control) && /You own this decision/.test(control)],
  ["target control is durable", /targetControlDecisions/.test(control) && /eventType: \"control_decision\"/.test(control)],
  ["continuation route requires durable context", /refusing context-free continuation/.test(continuation)],
  ["canonical runner imports target control", /import \{ decideTargetNextAction/.test(runner)],
  ["canonical runner has an explicit Investigator-pass loop", loopStart >= 0 && /maxPasses/.test(runner)],
  ["canonical runner invokes target control after Investigator work", investigatorBeforeControl && controlAfterLoopStart],
  ["canonical runner leaves research trajectory to the Investigator", !/continue_target/.test(runner) && !/revisit_target/.test(runner) && !/pivot_target/.test(runner)],
  ["canonical runner gates final Boss review on Gemini stop", finalReviewIsStopGated && controlBeforeFinalReview],
  ["canonical runner persists control decisions through the control component", /persistContext\([^\n]*head_investigator/.test(runner) && /decideTargetNextAction/.test(runner)],
];

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
  console.error(`Intrinsic target continuation audit failed: ${failed.join(", ")}`);
  process.exit(1);
}
console.log(`Intrinsic target continuation audit: ${checks.length}/${checks.length} checks passed`);