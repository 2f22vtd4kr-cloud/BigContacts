#!/usr/bin/env node
/**
 * Discovery quality guard.
 *
 * This is intentionally a narrow integrity test, not a target-ranking engine.
 * It verifies that model-selected discovery retains its identity/provenance
 * boundary and the research-judgment guidance that keeps the agent focused on
 * realistic people rather than fame/list enumeration.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const discovery = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/discovery-agent.ts"), "utf8");
const admit = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/discovery-agent-admit.ts"), "utf8");
const orientation = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/apex-bureau-orientation.ts"), "utf8");
const repair = fs.readFileSync(path.join(root, "scripts/apply-apex-identity-integrity-fix.mjs"), "utf8");

const requiredDiscovery = [
  "isWellFormedPersonCandidate",
  "LIST_ONLY_SOURCE_PATTERNS",
  "hasIndependentSource",
  "hasStrongIdentityEvidence",
  "DISCOVERY ASSIGNMENT",
  "information gain",
  "Do not spend discovery iterations on Forbes/Bloomberg/richest/billionaire rankings",
  "BAD DISCOVERY BEHAVIOR",
  "GOOD DISCOVERY BEHAVIOR",
  "Before every action, silently sanity-check the direction",
  "If a company is discovered before its principal, that company is an intermediate lead",
  "Before finishing, ask yourself: do I have a full personal name",
  "state\\s+st",
];

const requiredOrientation = [
  "DISCOVERY ECONOMICS",
  "RESEARCH JUDGMENT",
  "A billionaire list is usually a low-yield lead, not a discovery strategy",
  "Do not continue a weak search avenue just because it returns many results",
];

const failures = [];
for (const marker of requiredDiscovery) {
  if (!discovery.includes(marker)) failures.push(`discovery-agent.ts missing: ${marker}`);
}
for (const marker of requiredOrientation) {
  if (!orientation.includes(marker)) failures.push(`apex-bureau-orientation.ts missing: ${marker}`);
}

const strongEvidenceDefinitionCount = (discovery.match(/function hasStrongIdentityEvidence\s*\(/g) || []).length;
if (strongEvidenceDefinitionCount !== 1) {
  failures.push(`discovery-agent.ts must contain exactly one hasStrongIdentityEvidence definition; found ${strongEvidenceDefinitionCount}`);
}

const strongEvidenceGate = `if (!hasStrongIdentityEvidence({ name: n, role: extra.role, company: extra.company, basis: extra.basis, sourceUrls })) return;`;
const strongEvidenceGateCount = (discovery.match(new RegExp(strongEvidenceGate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
if (strongEvidenceGateCount !== 1) {
  failures.push(`discovery-agent.ts must apply the source-bound gate exactly once; found ${strongEvidenceGateCount}`);
}

if (!repair.includes("s.split(gate).join(\"\")")) failures.push("identity repair script is not idempotent");
if (!repair.includes("state\\\\s+st")) failures.push("identity repair script does not preserve the State St regression repair");

const modelBranchStart = admit.indexOf("if (options.modelSelected)");
const modelBranchEnd = admit.indexOf("const fitness =", modelBranchStart);
const modelBranch = modelBranchStart >= 0 && modelBranchEnd > modelBranchStart ? admit.slice(modelBranchStart, modelBranchEnd) : "";

if (!modelBranch.includes("isWellFormedPersonCandidate")) failures.push("model-selected admission is not visibly gated by identity/provenance validation");
if (modelBranch.includes("evaluateTargetFitness") || modelBranch.includes("shouldRejectTarget")) failures.push("model-selected admission must not call target-fitness ranking/rejection");

if (failures.length) {
  console.error("FAIL: discovery quality regression");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("OK: discovery remains model-selected with identity/provenance safety and practical-reachability research judgment");
