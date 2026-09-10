#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const target = read("artifacts/api-server/src/src/lib/target-contact-agent.ts");
const bureau = read("artifacts/api-server/src/src/lib/bureau-agentic-pass.ts");
const strict = read("artifacts/api-server/src/src/lib/bureau-contact-persist-strict.ts");
const discovery = read("artifacts/api-server/src/src/lib/discovery-agent.ts");
const atlas = read("artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts");
const targetRunner = read("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts");
const control = read("artifacts/api-server/src/src/lib/atlas-control-decision.ts");
const continuation = read("artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts");

const checks = [
  ["target Dig uses strict persistence", target.includes("persistSourceBackedBureauContactsForEntity")],
  ["target Dig does not legacy-rehydrate", !target.includes("rehydrateEntityCardFromEvidence")],
  ["target contact preserves investigator promotion", target.includes('promote: isExplicitCandidate && f.promotionDecision === "promote"')],
  ["target Dig persists only model-emitted findings", target.includes("const modelFindings = agentic.modelFindings ?? []") && target.includes("sourceBackedFindings(modelFindings, agentic.trajectory, agentic.trajectoryRecords") && !target.includes("sourceBackedFindings(agentic.findings, agentic.trajectory)")],
  ["target Dig supplies successful observed provenance", target.includes("execution=success") && target.includes("observed=(https?:")],
  ["target Dig validates claims against observed material", target.includes("claimAppearsInObservedMaterial") && target.includes("record.observation")],
  ["target Dig exposes structured trajectory records", target.includes("trajectoryRecords: AgenticTrajectoryRecord[]") && target.includes("trajectoryRecords: agentic.trajectoryRecords")],
  ["bureau pass uses strict persistence", bureau.includes("persistSourceBackedBureauContactsForEntity")],
  ["bureau pass preserves explicit investigator promotion", bureau.includes('promote: isExplicitCandidate && f.promotionDecision === "promote"')],
  ["bureau pass uses only model-emitted findings", bureau.includes("const modelFindings = agentic.modelFindings ?? []") && bureau.includes("sourceBackedAgenticFindings(modelFindings, agentic.trajectory, agentic.trajectoryRecords)") && !bureau.includes("sourceBackedAgenticFindings(agentic.findings, agentic.trajectory)")],
  ["bureau pass validates claims against observed material", bureau.includes("claimAppearsInObservedMaterial") && bureau.includes("r.observation")],
  ["strict boundary requires explicit promotion for card mutation", strict.includes("if (row.item.promote !== true) continue")],
  ["strict boundary requires candidate scope", strict.includes('String(row.item.scope ?? "").toLowerCase() !== "candidate"')],
  ["strict boundary requires explicit person identity", strict.includes('typeof row.item.personName === "string"')],
  ["strict boundary requires run-scoped observed provenance", strict.includes("observedSourceBackedBureauContacts") && strict.includes("observedSourceUrls") && !strict.includes("getDiscoveryTrace")],
  ["strict boundary rejects search-query provenance", strict.includes("SEARCH_QUERY_URL") && strict.includes("isClaimSourceUrl")],
  ["strict boundary fails closed without source", strict.includes("if (!sourceUrls.length) continue")],
  ["target oversight mounts structured trajectory", targetRunner.includes("trajectoryRecords") && targetRunner.includes("Structured Investigator turns")],
  ["Atlas control receives structured trajectory", atlas.includes("discoveryTrajectoryRecords: discovery.trajectoryRecords")],
  ["Atlas control prompts include structured observations", control.includes("STRUCTURED OBSERVATIONS") && control.includes("discoveryTrajectoryRecords")],
  ["Atlas preserves trajectory records across discovery pivots", atlas.includes("trajectoryRecords: [...(discovery.trajectoryRecords ?? []), ...(nextDiscovery.trajectoryRecords ?? [])]")],
  ["Atlas routes targets through canonical single-target control plane", atlas.includes("runCanonicalSingleTargetInvestigation")],
  ["continuation fails closed without durable context", continuation.includes("refusing context-free continuation")],
  ["discovery requires model findings", discovery.includes("modelFindings")],
];
const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
if (failed.length) { console.error(`Canonical promotion boundary failed: ${failed.join(", ")}`); process.exit(1); }
console.log(`Canonical promotion boundary: ${checks.length}/${checks.length} checks passed`);
