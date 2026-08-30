#!/usr/bin/env node
/**
 * Discovery quality guard.
 *
 * This is intentionally a narrow integrity test, not a target-ranking engine.
 * It verifies that the model-selected discovery path retains its identity /
 * provenance boundary and practical-reachability guidance.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const discovery = fs.readFileSync(
  path.join(root, "artifacts/api-server/src/src/lib/discovery-agent.ts"),
  "utf8",
);
const admit = fs.readFileSync(
  path.join(root, "artifacts/api-server/src/src/lib/discovery-agent-admit.ts"),
  "utf8",
);

const requiredDiscovery = [
  "isWellFormedPersonCandidate",
  "LIST_ONLY_SOURCE_PATTERNS",
  "hasIndependentSource",
  "practical reachability",
  "Do not use Forbes/Bloomberg-style billionaire or richest-person lists as a default discovery strategy.",
  "If you encounter a billionaire list, pivot",
];

const failures = [];
for (const marker of requiredDiscovery) {
  if (!discovery.includes(marker)) failures.push(`discovery-agent.ts missing: ${marker}`);
}

if (/MODEL TARGET|rankDiscoveryReviewCandidates|shouldRejectTarget\(fitness\)/i.test(admit)) {
  failures.push("discovery-agent-admit.ts contains a target-ranking / legacy admission marker");
}
if (!/if \(options\.modelSelected\)[\s\S]*?isWellFormedPersonCandidate/.test(admit)) {
  failures.push("model-selected admission is not visibly gated by identity/provenance validation");
}
if (/options\.modelSelected[\s\S]{0,800}evaluateTargetFitness/.test(admit)) {
  failures.push("model-selected admission must not call evaluateTargetFitness");
}

if (failures.length) {
  console.error("FAIL: discovery quality regression");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("OK: discovery remains model-selected with identity/provenance safety and practical-reachability guidance");
