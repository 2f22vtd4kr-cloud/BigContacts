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
const targetControl = read("artifacts/api-server/src/src/lib/target-control-decision.ts");
const targetContinuation = read("artifacts/api-server/src/src/routes/research/canonical-target-continuation.ts");
const control = read("artifacts/api-server/src/src/lib/atlas-control-decision.ts");
const continuation = read("artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts");
const researchRoutes = read("artifacts/api-server/src/src/routes/research.ts");
const claimValidator = (source) => {
  const start = source.indexOf("function claimAppearsInObservedMaterial");
  const end = source.indexOf("\n}", start);
  const body = start >= 0 && end > start ? source.slice(start, end + 2) : "";
  return body.includes("for (const record of records)")
    && body.includes("record.observation")
    && body.includes("valueObserved")
    && body.includes("identityObserved")
    && body.includes("supportingObservationCount")
    && !body.includes("matching.map")
    && !body.includes('.join("\\n")');
};
const checks = [
  ["target Dig uses strict persistence", target.includes("persistSourceBackedBureauContactsForEntity")],
  ["target Dig does not legacy-rehydrate", !target.includes("rehydrateEntityCardFromEvidence")],
  ["target contact preserves investigator promotion", target.includes('promote: isExplicitCandidate && f.promotionDecision === "promote"')],
  ["target Dig persists only model-emitted findings", target.includes("const modelFindings = agentic.modelFindings ?? []") && target.includes("sourceBackedFindings(modelFindings, agentic.trajectory, agentic.trajectoryRecords") && !target.includes("sourceBackedFindings(agentic.findings, agentic.trajectory)")],
  ["target Dig supplies successful observed provenance", target.includes("execution=success") && target.includes("observed=(https?:")],
  ["target Dig validates claims against observed material", target.includes("claimAppearsInObservedMaterial") && target.includes("record.observation")],
  ["target claim binding supports multi-observation attribution", claimValidator(target)],
  ["target preserves cancellation as a distinct result state", target.includes('agentic.status === "cancelled" ? "cancelled"') && target.includes('status: "cancelled"')],
  ["target Dig exposes structured trajectory records", target.includes("trajectoryRecords: AgenticTrajectoryRecord[]") && target.includes("trajectoryRecords: agentic.trajectoryRecords")],
  ["bureau pass uses strict persistence", bureau.includes("persistSourceBackedBureauContactsForEntity")],
  ["bureau pass preserves explicit investigator promotion", bureau.includes('promote: isExplicitCandidate && f.promotionDecision === "promote"')],
  ["bureau pass uses only model-emitted findings", bureau.includes("const modelFindings = agentic.modelFindings ?? []") && bureau.includes("sourceBackedAgenticFindings(modelFindings, agentic.trajectory, agentic.trajectoryRecords)") && !bureau.includes("sourceBackedAgenticFindings(agentic.findings, agentic.trajectory)")],
  ["bureau pass validates claims against observed material", bureau.includes("claimAppearsInObservedMaterial") && bureau.includes("record.observation")],
  ["bureau claim binding supports multi-observation attribution", claimValidator(bureau)],
  ["bureau preserves cancellation as a distinct result state", bureau.includes('agentic.status === "cancelled" ? "cancelled"') && bureau.includes('status: "cancelled"')],
  ["bureau creates a distinct run id per Investigator execution", bureau.includes("const runId = input.runId?.trim() || randomUUID()") && bureau.includes("runId?: string")],
  ["bureau trajectory correlation is run-scoped", bureau.includes("const correlationKey = `${input.runId}:turn:${record.turn}:trajectory`")],
  ["bureau claim correlation is run-scoped", bureau.includes("const claimKey = `${input.runId}:turn:${record.turn}:claim:")],
  ["bureau promotion correlation is run-scoped", bureau.includes("const promotionKey = `${claimKey}:promotion`")],
  ["bureau persists run id in event payloads", bureau.includes("runId: input.runId")],
  ["strict boundary requires explicit promotion for card mutation", strict.includes("if (row.item.promote !== true) continue")],
  ["strict boundary requires candidate scope", strict.includes('String(row.item.scope ?? "").toLowerCase() !== "candidate"')],
  ["strict boundary requires explicit person identity", strict.includes('typeof row.item.personName === "string"')],
  ["strict boundary requires destination person identity", strict.includes("entity.name.trim().toLowerCase() !== personName.toLowerCase()") && strict.includes('["HNWI", "Gatekeeper"].includes(entity.type)')],
  ["strict boundary retains exact claim provenance", strict.includes("sourceUrls: candidate.sourceUrls") && strict.includes("observedSourceUrls: candidate.sourceUrls")],
  ["strict boundary retains run correlation", strict.includes("jobId?: string | null") && strict.includes("jobId: jobId ?? null")],
  ["strict boundary requires run-scoped observed provenance", strict.includes("observedSourceBackedBureauContacts") && strict.includes("observedSourceUrls") && !strict.includes("getDiscoveryTrace")],
  ["strict boundary rejects search-query provenance", strict.includes("SEARCH_QUERY_URL") && strict.includes("isClaimSourceUrl")],
  ["strict boundary fails closed without source", strict.includes("if (!sourceUrls.length) continue")],
  ["target oversight mounts structured trajectory", targetRunner.includes("trajectoryRecords") && targetRunner.includes("Structured Investigator turns")],
  ["Atlas control receives structured trajectory", atlas.includes("discoveryTrajectoryRecords: discovery.trajectoryRecords")],
  ["Atlas control prompts include structured observations", control.includes("STRUCTURED OBSERVATIONS") && control.includes("discoveryTrajectoryRecords")],
  ["Atlas preserves trajectory records across discovery pivots", atlas.includes("trajectoryRecords: [...(discovery.trajectoryRecords ?? []), ...(nextDiscovery.trajectoryRecords ?? [])]")],
  ["Atlas uses explicit discovery mode", atlas.includes('mode: "discovery", targetName: ""')],
  ["Atlas has no fake Discovery slot target", !atlas.includes("Discovery slot")],
  ["Bureau discovery mode is explicit", bureau.includes('mode?: "target" | "discovery"') && bureau.includes("input.mode !== \"discovery\"")],
  ["Atlas routes targets through canonical single-target control plane", atlas.includes("runCanonicalSingleTargetInvestigation")],
  ["discovery admission passes validated source provenance into strict persistence", atlas.includes('"canonical-agentic-discovery"') && atlas.includes('input.atlasJobId, [sourceUrl]')],
  ["continuation fails closed without durable context", continuation.includes("refusing context-free continuation")],
  ["target continuation uses minimal objective/stop disposition", targetControl.includes('"research"') && targetControl.includes('"stop"') && !targetControl.includes('"continue_target"') && !targetControl.includes('"revisit_target"') && !targetControl.includes('"pivot_target"')],
  ["target continuation delegates next research objective to Gemini", targetControl.includes("generateGeminiBossText") && targetControl.includes("You own this decision") && targetControl.includes("NEXT RESEARCH OBJECTIVE")],
  ["target continuation persists durable control decisions", targetControl.includes("targetControlDecisions") && targetControl.includes("eventType: \"control_decision\"")],
  ["target continuation remounts durable context", targetContinuation.includes("contextOf(file)") && targetContinuation.includes("runCanonicalSingleTargetInvestigation")],
  ["target continuation is mounted", researchRoutes.includes("canonical-target-continuation")],
  ["target continuation rejects context-free cases", targetContinuation.includes("refusing context-free continuation")],
  ["discovery requires model findings", discovery.includes("modelFindings")],
];
const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
if (failed.length) { console.error(`Canonical promotion boundary failed: ${failed.join(", ")}`); process.exit(1); }
console.log(`Canonical promotion boundary: ${checks.length}/${checks.length} checks passed`);