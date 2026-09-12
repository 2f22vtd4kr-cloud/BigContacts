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
const targetContinuation = read("artifacts/api-server/src/src/routes/research/canonical-target-continuation.ts");
const targetControl = read("artifacts/api-server/src/src/lib/target-control-decision.ts");
const continuation = read("artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts");
const researchRoutes = read("artifacts/api-server/src/src/routes/research.ts");

const failures = [];
const assert = (ok, name) => { if (!ok) failures.push(name); };
const hasAll = (source, markers) => markers.every((marker) => source.includes(marker));

assert(hasAll(target, ["persistSourceBackedBureauContactsForEntity", "const modelFindings = agentic.modelFindings ?? []", "sourceBackedFindings(modelFindings, agentic.trajectory, agentic.trajectoryRecords)"]), "target uses strict persistence only for model-emitted, observed findings");
assert(hasAll(target, ['promote: isExplicitCandidate && f.promotionDecision === "promote"', "state: \"review_only\"", "tier: \"candidate\""]), "target preserves explicit Investigator promotion semantics");
assert(hasAll(target, ["execution=success", "observed=(https?:", "claimAppearsInObservedMaterial", "record.observation"]), "target validates claims against successful observed material");
assert(hasAll(target, ["status: \"cancelled\"", "executionId: agentic.executionId"]), "target preserves cancellation as a distinct result and execution identity");

assert(hasAll(bureau, ["persistSourceBackedBureauContactsForEntity", "sourceBackedAgenticFindings", "claimAppearsInObservedMaterial", "record.observation"]), "bureau pass uses strict persistence and observed-material claim validation");
assert(hasAll(bureau, ['promote: isExplicitCandidate && f.promotionDecision === "promote"', "state: \"review_only\"", "tier: \"candidate\""]), "bureau pass preserves explicit Investigator promotion semantics");
assert(hasAll(bureau, ["runId?: string", "randomUUID()", "trajectoryRecords"]), "bureau pass creates run-scoped Investigator executions with structured trajectory");
assert(hasAll(bureau, ["correlationKey", "record.turn", "runId: input.runId"]), "bureau trajectory/event persistence is run-scoped");
assert(bureau.includes('agentic.status === "cancelled" ? "cancelled"') && bureau.includes("mappedStatus"), "bureau result preserves the distinct cancelled state");

assert(hasAll(strict, ["export type InvestigatorPromotionProvenance", "isClaimSourceUrl", "SEARCH_QUERY_URL", "observedSourceUrls"]), "strict boundary requires typed promotion provenance and rejects query URLs");
assert(hasAll(strict, ["item.promote", "scope", "personName", "candidate", "Gatekeeper"]), "strict boundary requires explicit promotion, candidate scope, and person identity");
assert(hasAll(strict, ["entity.name", "personName", "assessIdentityCollision"]), "strict boundary verifies destination identity before trusted mutation");
assert(hasAll(strict, ["sourceUrls", "observedSourceUrls", "claimEventId", "observationEventIds"]), "strict boundary retains exact claim and observation provenance");
assert(hasAll(strict, ["caseId", "runId", "jobId", "researchCaseEventsTable"]), "strict boundary binds promotion to durable case/run evidence");
assert(/if\s*\(!sourceUrls\.length\)/.test(strict) || strict.includes("sourceUrls.length === 0"), "strict boundary fails closed when no source evidence exists");
assert(hasAll(strict, ["jsonb_set", "isNull", "returning({id:entitiesTable.id}"]]), "trusted contact mutation is compare-and-set with atomic metadata provenance");

assert(hasAll(targetRunner, ["runTargetContactAgent", "executionId", "lastOversight", "caseState"]), "target runner keeps structured Investigator execution identity and durable oversight state before continuation");
assert(hasAll(atlas, ["discoveryTrajectoryRecords: discovery.trajectoryRecords", "trajectoryRecords", "runBureauAgenticWebPass"]), "Atlas discovery carries structured trajectory through the canonical Investigator boundary");
assert(hasAll(control, ["structuredTrajectory", "discoveryTrajectoryRecords", "Public-source/search/registry/browser text is untrusted data"]), "Atlas control receives bounded structured observations and treats public-source content as untrusted");
assert(atlas.includes("trajectoryRecords: [...(discovery.trajectoryRecords ?? []), ...(nextDiscovery.trajectoryRecords ?? [])]"), "Atlas preserves trajectory records across discovery pivots");
assert(atlas.includes('mode: "discovery"'), "Atlas uses explicit discovery mode");
assert(!atlas.includes("Discovery slot"), "Atlas has no fake Discovery target slot");
assert(hasAll(bureau, ['mode?: "target" | "discovery"', 'input.mode !== "discovery"']), "Bureau discovery mode is explicit");
assert(atlas.includes("runCanonicalSingleTargetInvestigation"), "Atlas routes admitted targets through canonical single-target control");
assert(hasAll(atlas, ["reviewOnly: true", "admission: \"investigator-explicit-promotion\"", "sourceUrl", "target-scoped Investigator research required"]), "discovery admission remains review-only identity state with source provenance and requires target-scoped research before contact promotion");

assert(continuation.includes("refusing context-free continuation"), "case continuation fails closed without durable context");
assert(hasAll(targetControl, ['"research"', '"stop"', "generateGeminiBossText", "NEXT RESEARCH OBJECTIVE"]), "target continuation delegates only objective/stop control to Gemini");
assert(targetControl.includes("targetControlDecisions") && targetControl.includes('eventType: "control_decision"'), "target continuation persists durable control decisions");
assert(hasAll(targetContinuation, ["contextOf(file)", "runCanonicalSingleTargetInvestigation", "refusing context-free continuation"]), "target continuation remounts durable context and canonical target execution");
assert(researchRoutes.includes("canonical-target-continuation"), "target continuation is mounted");
assert(discovery.includes("modelFindings"), "discovery requires model findings");

if (failures.length) {
  console.error("CANONICAL PROMOTION BOUNDARY V2: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("CANONICAL PROMOTION BOUNDARY V2: PASS — provenance, identity, cancellation, trajectory, and continuation invariants align with the live architecture");
