#!/usr/bin/env node
/**
 * Discovery quality guard for the current canonical Atlas discovery pipeline.
 * This is an integrity test, not a target-ranking engine. It verifies identity,
 * provenance, model-owned discovery and the canonical Boss/Investigator boundary.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const discovery = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/discovery-agent.ts"), "utf8");
const admit = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/discovery-agent-admit.ts"), "utf8");
const orientation = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/apex-bureau-orientation.ts"), "utf8");
const repair = fs.readFileSync(path.join(root, "scripts/apply-apex-identity-integrity-fix.mjs"), "utf8");
const canonical = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts"), "utf8");
const activeInvestigator = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research-core.ts"), "utf8");
const targetContact = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/target-contact-agent.ts"), "utf8");
const candidateSources = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/candidate-source-url-union.ts"), "utf8");
const checks = [
  [discovery, ["isWellFormedPersonCandidate","LIST_ONLY_SOURCE_PATTERNS","hasIndependentSource","hasStrongIdentityEvidence","DISCOVERY ASSIGNMENT","information gain","Do not spend discovery iterations on Forbes/Bloomberg/richest/billionaire rankings","BAD DISCOVERY BEHAVIOR","GOOD DISCOVERY BEHAVIOR","Before every action, silently sanity-check the direction","If a company is discovered before its principal, that company is an intermediate lead","Before finishing, ask yourself: do I have a full personal name","state\\s+st","proxy_table","deterministic candidate selection rather than model-owned discovery"], "discovery-agent.ts"],
  [orientation, ["DISCOVERY ECONOMICS","RESEARCH JUDGMENT","A billionaire list is usually a low-yield lead, not a discovery strategy","Do not continue a weak search avenue just because it returns many results"], "apex-bureau-orientation.ts"],
  [canonical, ["runGroqBossDiscovery","runBureauAgenticWebPass","runGroqRightHandFreeJson","Investigator chooses every research action","discoveryCaseId","promotionDecision"], "canonical-atlas-discovery.ts"],
  [activeInvestigator, ["DISCOVERY LEAD HANDOFF CONTRACT","YOU decide whether an observed person is worth a provisional review card","source class need not appear in every discovery query","The Investigator decides relevance","News publishers and articles are evidence leads only, never targets or access routes"], "agentic-web-research-core.ts"],
  [canonical, ["hasDiscoveryOwnershipLeadSignal", "claimGradeObservations", "target research must test that, falsify", "realistic route before any contact/wealth promotion"], "canonical-atlas-discovery.ts"],
  [targetContact, ["REALISM / REACHABILITY CONTROL", "material business, ownership stake, investment, asset, exit or control role", "realistic public/professional/intermediary routes", "Prefer a directly published professional contact or documented assistant"], "target-contact-agent.ts"],
  [candidateSources, ["export function isRealisticPersonRouteSourceUrl","DISCOVERY_PRESS_PUBLISHER_DOMAINS","News/blog/article pages are evidence leads, not an access route"], "candidate-source-url-union.ts"],
];
// The active Investigator owns query strategy. Runtime query validation may
// enforce syntax/placeholders and outbound safety, but must not encode publisher,
// source-class, named-anchor, or other relevance/admission preferences.
if (activeInvestigator.includes("hasPressPublisherSiteFilter")
  || activeInvestigator.includes("DISCOVERY_PRESS_PUBLISHER_DOMAINS")
  || activeInvestigator.includes("broad press-publisher-only search without an exact named person/business anchor")) {
  console.error("FAIL: active Investigator still contains a deterministic discovery query-strategy filter");
  process.exit(1);
}
if (!activeInvestigator.includes("Structural/provider-syntax checks only.")
  || !activeInvestigator.includes("model-owned research choices, not runtime admission or relevance policy.")) {
  console.error("FAIL: active Investigator query validator does not declare model-owned query strategy");
  process.exit(1);
}
const failures = [];
for (const [source, markers, label] of checks) for (const marker of markers) if (!source.includes(marker)) failures.push(`${label} missing: ${marker}`);
const strongEvidenceDefinitionCount = (discovery.match(/function hasStrongIdentityEvidence\s*\(/g) || []).length;
if (strongEvidenceDefinitionCount !== 1) failures.push(`discovery-agent.ts must contain exactly one hasStrongIdentityEvidence definition; found ${strongEvidenceDefinitionCount}`);
const strongEvidenceGate = `if (!hasStrongIdentityEvidence({ name: n, role: extra.role, company: extra.company, basis: extra.basis, sourceUrls })) return;`;
if (!discovery.includes(strongEvidenceGate)) failures.push("discovery-agent.ts must apply the source-bound gate exactly once");
const proxyReject = 'if (String(f.role ?? "").trim().toLowerCase() === "proxy_table") continue;';
if (!discovery.includes(proxyReject)) failures.push("discovery-agent.ts must reject deterministic proxy_table candidate findings before admission");
if (!repair.includes("s.split(gate).join(\"\")")) failures.push("identity repair script is not idempotent");
if (!repair.includes("state\\\\s+st")) failures.push("identity repair script does not preserve the State St regression repair");
if (!discovery.includes("const admissionFindings = result.modelFindings ?? [];")) failures.push("discovery-agent.ts must feed only modelFindings into discovery admission");
if (!discovery.includes("const slotCandidates = parsePersonFindings(admissionFindings, result.trajectory ?? []);")) failures.push("discovery-agent.ts must preserve trajectory when applying the admission gate");
if (!discovery.includes("function hasObservedPageSource(sourceUrls: string[], trajectory: string[]): boolean")) failures.push("discovery-agent.ts missing observed-page provenance boundary");
if (!discovery.includes("if (!hasObservedPageSource(sourceUrls, trajectory)) return;")) failures.push("discovery-agent.ts must require candidate source URL to match a visited/fetched page");
const modelBranchStart = admit.indexOf("if (options.modelSelected)");
const modelBranchEnd = admit.indexOf("const fitness =", modelBranchStart);
const modelBranch = modelBranchStart >= 0 && modelBranchEnd > modelBranchStart ? admit.slice(modelBranchStart, modelBranchEnd) : "";
if (!modelBranch.includes("isWellFormedPersonCandidate")) failures.push("model-selected admission is not visibly gated by identity/provenance validation");
if (modelBranch.includes("evaluateTargetFitness") || modelBranch.includes("shouldRejectTarget")) failures.push("model-selected admission must not call target-fitness ranking/rejection");
if (failures.length) { console.error("FAIL: discovery quality regression"); for (const failure of failures) console.error(` - ${failure}`); process.exit(1); }
console.log("OK: canonical discovery remains model-selected with identity/provenance safety and Boss/Investigator separation");
