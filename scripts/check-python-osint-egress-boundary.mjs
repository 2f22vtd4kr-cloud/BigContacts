import fs from "node:fs";

const pythonSource = fs.readFileSync("artifacts/api-server/src/src/lib/python-tools.ts", "utf8");
const sandbox = fs.readFileSync("artifacts/api-server/src/src/lib/python-sandbox-contract.ts", "utf8");
const client = fs.readFileSync("artifacts/api-server/src/src/lib/python-osint-worker-client.ts", "utf8");
const worker = fs.readFileSync("services/apex-python-osint-worker/app.py", "utf8");
const attestor = fs.readFileSync("scripts/attest-python-osint-worker.py", "utf8");
const policies = fs.readFileSync("deployment/apex-python-osint-worker/network-policies.yaml", "utf8");
const dockerfile = fs.readFileSync("services/apex-python-osint-worker/Dockerfile", "utf8");

const checks = [
  ["Node API has no local unrestricted network subprocess", pythonSource.includes("executePythonOsintTool") && !pythonSource.includes("child_process")],
  ["local sandbox state remains fail-closed", sandbox.includes('return { state: "unavailable"') && sandbox.includes("No local assertion or environment variable")],
  ["remote workers require a signed, expiring attestation", client.includes("signatureMatches") && client.includes("MAX_ATTESTATION_LIFETIME_MS") && client.includes("authorizePythonSandboxRequest")],
  ["worker rejects requests without a trusted isolation proof", worker.includes("load_isolation_proof()") && worker.includes("Trusted network-isolation attestation is unavailable.")],
  ["worker API validates exact tool arguments and bounds", worker.includes("model_config = ConfigDict(extra=\"forbid\")") && worker.includes("def validate_args") && worker.includes("maxOutputBytes")],
  ["worker launches subprocesses with time/output/process limits", worker.includes('"/usr/bin/prlimit"') && worker.includes("max_output_bytes") && worker.includes("kill_process_tree")],
  ["worker enforces per-tool readiness before advertise/execute", worker.includes("initialize_cli_tool_readiness") && worker.includes("resolve_worker_tools")],
  ["SpiderFoot is module-allowlisted, bounded, and cancelled", worker.includes("SPIDERFOOT_ALLOWED_MODULES") && worker.includes("stopscan") && worker.includes("PROFILE_MODULES")],
  ["NetworkPolicy restricts worker to DNS plus dedicated proxy", policies.includes("apex-osint-worker-egress") && policies.includes("apex-osint-egress-proxy")],
  ["proxy policy blocks private/reserved destinations on IPv4 and IPv6", policies.includes("0.0.0.0/0") && policies.includes("::/0") && policies.includes("169.254.0.0/16") && policies.includes("fc00::/7")],
  ["live deployment attestor checks network policies and direct-egress denial", attestor.includes("verify_network_policies") && attestor.includes("DIRECT_BLOCKED") && attestor.includes("METADATA_BLOCKED")],
  ["private keys and worker credentials are not baked into the image", dockerfile.includes("USER 10001:10001") && !dockerfile.includes("APEX_PYTHON_SANDBOX_TOKEN=")],
  ["theHarvester cancellation is threaded through canonical ReAct", pythonSource.includes("runTheHarvester") && fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8").includes('runTheHarvester(action.domain, undefined, { signal: runController.signal })')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
