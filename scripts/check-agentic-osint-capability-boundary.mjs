import fs from "node:fs";

const corePath = "artifacts/api-server/src/src/lib/agentic-web-research-core.ts";
const core = fs.readFileSync(corePath, "utf8");
const workerClient = fs.readFileSync("artifacts/api-server/src/src/lib/python-osint-worker-client.ts", "utf8");
const adapters = fs.readFileSync("artifacts/api-server/src/src/lib/python-tools.ts", "utf8");

const required = [
  'action: "footprint_username_maigret"',
  'action: "footprint_username_sherlock"',
  'action: "footprint_email"',
  'action: "harvest_domain"',
  'action: "footprint_spiderfoot"',
];
for (const marker of required) if (!core.includes(marker)) throw new Error(`OSINT capability boundary invariant failed: missing ${marker}`);

for (const action of ["footprint_username_maigret", "footprint_username_sherlock", "footprint_email", "harvest_domain", "footprint_spiderfoot"]) {
  if (core.includes('  "' + action + '",')) throw new Error("OSINT action must not be statically selectable without attestation: " + action);
  if (!core.includes('action === "' + action + '"')) throw new Error("Canonical dispatcher missing tool action: " + action);
}
if (/action === "footprint_username"/.test(core)) throw new Error("OSINT capability boundary invariant failed: compound footprint_username remains model-selectable");
if (/\["footprint_email", "footprint_username",/.test(core)) throw new Error("OSINT capability boundary invariant failed: legacy username action remains in schema");
if (!core.includes("runController.signal")) throw new Error("OSINT capability boundary invariant failed: canonical actions lack run-scoped cancellation");
if (!core.includes("if (!isModelSelectableAgentAction(action)) return null;")) throw new Error("OSINT capability boundary invariant failed: JSON-object fallback can invoke a hidden action");
if (!core.includes("enum: [...MODEL_SELECTABLE_AGENT_ACTIONS]")) throw new Error("OSINT capability boundary invariant failed: base schema is not tied to the base executable action set");
if (!core.includes("getModelSelectableAgentActions()") || !core.includes("getAvailablePythonOsintActions()")) throw new Error("OSINT capability boundary invariant failed: worker actions are not derived from signed availability");
if (!core.includes("await refreshPythonOsintToolAvailability(input.signal)")) throw new Error("OSINT capability boundary invariant failed: runtime did not refresh worker attestation before research");
if (!core.includes("selectableActions.filter((action) => action !== \"browser_fetch\")")) throw new Error("OSINT capability boundary invariant failed: configured browser filtering is disconnected from runtime actions");
if (!core.includes("applyPythonToolExecutionMetadata(record, result, runController.signal)")) throw new Error("OSINT capability boundary invariant failed: worker execution metadata is not persisted in the trajectory");
if (!core.includes("assignSearchResultLeads(record, result.observations.map((item: any) => item.sourceUrl)")) throw new Error("OSINT capability boundary invariant failed: SpiderFoot source URLs must remain leads, not visited evidence");
if (!workerClient.includes("signatureMatches") || !workerClient.includes("X-Apex-Request-Signature")) throw new Error("OSINT capability boundary invariant failed: worker protocol is not signed");
if (!adapters.includes("executePythonOsintTool") || !adapters.includes("executionMetadata(response)")) throw new Error("OSINT capability boundary invariant failed: wrappers discard canonical worker provenance");
if (!adapters.includes("No canonical non-AI execution adapter exists")) throw new Error("OSINT capability boundary invariant failed: model-backed deep research must remain separate from non-AI tools");

console.log("agentic OSINT capability boundary: PASS — dynamic attested tools, canonical action dispatch, cancellation, and lead-only provenance");
