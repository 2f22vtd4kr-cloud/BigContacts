import fs from "node:fs";

const runner = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts", "utf8");
const agentic = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research.ts", "utf8");
const oversight = fs.readFileSync("artifacts/api-server/src/src/lib/target-act-oversight.ts", "utf8");
const evidence = fs.readFileSync("artifacts/api-server/src/src/lib/source-corroboration.ts", "utf8");
const mutationGuard = fs.readFileSync("artifacts/api-server/src/src/lib/legacy-apex-mutation-guard.ts", "utf8");
const checks = [
  ["canonical runner invokes exactly one Investigator iteration", /maxIterations:\s*1/.test(runner)],
  ["canonical runner reads durable act oversight after each act", /readOversight\(caseState\)/.test(runner)],
  ["canonical runner honors the durable Boss continuation decision", /readContinuationControl\(caseState\)/.test(runner)],
  ["canonical runner blocks on stop", /if \(lastOversight\.action === "stop"\) break/.test(runner)],
  ["canonical runner fails closed when oversight is unavailable", /!lastOversight \|\| lastOversight\.status !== "completed"/.test(runner)],
  ["redirect becomes a research objective, not a tool command", /Gemini research objective/.test(runner)],
  ["canonical runner establishes one global target deadline", /const deadline = Date\.now\(\) \+ hardTimeoutMs/.test(runner)],
  ["canonical runner refuses to start a sub-30-second act", /remainingMs < 30_000/.test(runner)],
  ["canonical agentic target wrapper actively aborts at its deadline", /setTimeout\(\(\) => overallController\.abort\(\), requestedHardTimeout\)/.test(agentic)],
  ["canonical agentic target wrapper clears its deadline timer", /clearTimeout\(deadlineTimer\)/.test(agentic)],
  ["target control context is mandatory", /if \(!oversightContext\)/.test(agentic)],
  ["missing target control context fails closed", /CONTROL_CONTEXT_UNAVAILABLE/.test(agentic)],
  ["act cancellation observes the global deadline", /Date\.now\(\) >= deadline/.test(runner)],
  ["agentic entrypoint performs Right Hand + Boss review after an act", /await reviewTargetInvestigationAct\(/.test(agentic)],
  ["completed act is durably persisted before Right Hand review", /persistInvestigatorObservation\(/.test(oversight)],
  ["observation event is written as head-investigator tool observation", /actorRole: "head_investigator"/.test(oversight) && /eventType: "tool_observation"/.test(oversight)],
  ["observation event is idempotently correlated by case, run and turn", /investigator-act:case:\$\{caseId\}:run:\$\{runId\}:turn:\$\{controlTurn\}/.test(oversight)],
  ["oversight event is correlated by case, run and turn", /target-oversight:case:\$\{caseId\}:run:\$\{runId\}:turn:\$\{controlTurn\}/.test(oversight)],
  ["agentic wrapper passes execution identity to oversight", /runId: executionId/.test(agentic)],
  ["evidence graph observations can carry immutable event IDs", /eventId\?: number \| null/.test(evidence)],
  ["canonical act graphs require immutable observation anchors", /validateClaimSupportGraph\(graph, true\)/.test(oversight)],
  ["Right Hand is mandatory before Boss continuation", /if \(rightHand\.status !== "completed"\)/.test(oversight)],
  ["Right Hand failure stops the next Investigator act", /DeepSeek\/NVIDIA Right Hand oversight was unavailable/.test(oversight)],
  ["Boss stop has a distinct external stop reason", /stopReason: "BOSS_STOP"/.test(agentic)],
  ["Investigator completion has a distinct external stop reason", /stopReason: "INVESTIGATOR_DONE"/.test(agentic)],
  ["control unavailability has a distinct external stop reason", /stopReason: "CONTROL_UNAVAILABLE"/.test(agentic)],
  ["discovery is not accidentally target-gated", /input\.mode === "discovery"/.test(agentic)],
  ["direct Apex entity contact PATCH is guarded", /isDirectEntityCardPatch\(req\.path\)/.test(mutationGuard)],
  ["Apex contact fields are explicitly enumerated at the card boundary", /DIRECT_CONTACT_FIELDS/.test(mutationGuard) && /contactOutcome/.test(mutationGuard) && /metadata/.test(mutationGuard)],
  ["legacy enrichment routes remain retired", /RETIRED_MUTATING_ENRICHMENT_PATHS/.test(mutationGuard) && /status\(410\)/.test(mutationGuard)],
];
let failed = false;
for (const [name, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed = true; }
if (failed) process.exit(1);
