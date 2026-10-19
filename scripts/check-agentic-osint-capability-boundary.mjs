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
if (!core.includes("if (!actionAllowlist.includes(action)) return null;") || !core.includes("parseAction(llm.raw, actionAllowlistForTurn)")) throw new Error("OSINT capability boundary invariant failed: model output is not checked against the action allowlist captured for its decision");
if (!core.includes("actionAllowlist: actionAllowlistForTurn") || !core.includes("structuredActionResponseFormat(model, actionAllowlist)")) throw new Error("OSINT capability boundary invariant failed: prompt, strict schema, and parser do not share one decision-scoped action allowlist");
if (!core.includes("describeAgentActionParseFailure(raw, actionAllowlist)") || !core.includes("describeAgentActionParseFailure(llm.raw, actionAllowlistForTurn)")) throw new Error("OSINT capability boundary invariant failed: parse diagnostics do not use the decision-scoped allowlist");
if (!core.includes("enum: [...MODEL_SELECTABLE_AGENT_ACTIONS]")) throw new Error("OSINT capability boundary invariant failed: base schema is not tied to the base executable action set");
if (!core.includes("getModelSelectableAgentActions()") || !core.includes("getAvailablePythonOsintActions()")) throw new Error("OSINT capability boundary invariant failed: worker actions are not derived from signed availability");
if (!core.includes('runtimePhase = "worker_availability_refresh"; await refreshPythonOsintToolAvailability(runController.signal)')) throw new Error("OSINT capability boundary invariant failed: runtime must refresh the worker attestation before each Investigator decision");
if (!core.includes("selectableActions.filter((action) => action !== \"browser_fetch\")")) throw new Error("OSINT capability boundary invariant failed: configured browser filtering is disconnected from runtime actions");
if (!core.includes("applyPythonToolExecutionMetadata(record, result, runController.signal)")) throw new Error("OSINT capability boundary invariant failed: worker execution metadata is not persisted in the trajectory");
if (!core.includes('record.execution = "partial"') || !core.includes('status === "completed"')) throw new Error("OSINT capability boundary invariant failed: partial worker output is promoted to success");
if (!workerClient.includes('new URL("/v1/cancel", config.baseUrl)') || !workerClient.includes("requestRemoteCancellation")) throw new Error("OSINT capability boundary invariant failed: aborted research does not request remote cancellation");
if (!workerClient.includes("workerImageDigest") || !workerClient.includes("egressProxyImageDigest")) throw new Error("OSINT capability boundary invariant failed: worker/proxy image identity is not present in the client provenance contract");
if (!workerClient.includes("APEX_PYTHON_OSINT_EXPECTED_WORKER_IMAGE_DIGEST") || !workerClient.includes("APEX_PYTHON_OSINT_EXPECTED_PROXY_IMAGE_DIGEST")) throw new Error("OSINT capability boundary invariant failed: immutable image identities are not independently pinned by the API");
if (!core.includes("assignSearchResultLeads(record, result.observations.map((item: any) => item.sourceUrl)")) throw new Error("OSINT capability boundary invariant failed: SpiderFoot source URLs must remain leads, not visited evidence");
if (!workerClient.includes("signatureMatches") || !workerClient.includes("X-Apex-Request-Signature")) throw new Error("OSINT capability boundary invariant failed: worker protocol is not signed");
if (!adapters.includes("executePythonOsintTool") || !adapters.includes("executionMetadata(response)")) throw new Error("OSINT capability boundary invariant failed: wrappers discard canonical worker provenance");
if (!adapters.includes("No canonical non-AI execution adapter exists")) throw new Error("OSINT capability boundary invariant failed: model-backed deep research must remain separate from non-AI tools");

console.log("agentic OSINT capability boundary: PASS — dynamic attested tools, canonical action dispatch, cancellation, and lead-only provenance");
