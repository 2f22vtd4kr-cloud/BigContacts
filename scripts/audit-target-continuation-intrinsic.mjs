#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const runner = read("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts");
const control = read("artifacts/api-server/src/src/lib/target-control-decision.ts");
const continuation = read("artifacts/api-server/src/src/routes/research/canonical-target-continuation.ts");

const checks = [
  ["target control vocabulary exists", /continue_target/.test(control) && /revisit_target/.test(control) && /pivot_target/.test(control) && /stop/.test(control)],
  ["target control is Gemini-owned", /generateGeminiBossText/.test(control) && /You own this decision/.test(control)],
  ["target control is durable", /targetControlDecisions/.test(control) && /eventType: \"control_decision\"/.test(control)],
  ["continuation route requires durable context", /refusing context-free continuation/.test(continuation)],
  ["canonical single-target runner invokes target control directly", /decideTargetNextAction/.test(runner)],
  ["canonical single-target runner contains the continuation action vocabulary", /continue_target/.test(runner) && /revisit_target/.test(runner) && /pivot_target/.test(runner)],
  ["canonical single-target runner does not unconditionally finalize immediately after one Investigator pass", /targetControlDecisions/.test(runner)],
];

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
  console.error(`Intrinsic target continuation audit failed: ${failed.join(", ")}`);
  process.exit(1);
}
console.log(`Intrinsic target continuation audit: ${checks.length}/${checks.length} checks passed`);
