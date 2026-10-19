import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/python-tools.ts", "utf8");
const client = fs.readFileSync("artifacts/api-server/src/src/lib/python-osint-worker-client.ts", "utf8");
const sandbox = fs.readFileSync("artifacts/api-server/src/src/lib/python-sandbox-contract.ts", "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(source.includes("executePythonOsintTool") && source.includes("executeTool("), "Python OSINT adapters do not route through the canonical worker client");
assert(client.includes("authorizePythonSandboxRequest"), "Python OSINT boundary does not require sandbox authorization");
assert(client.includes('capability: "network_osint"') && client.includes('destinationPolicy: "approved-public-web-only"'), "Python network capability is not explicitly authorized");
assert(sandbox.includes("PYTHON_SANDBOX_UNAVAILABLE_REASON"), "Python OSINT boundary lacks canonical unavailable reason");
assert(client.includes("if (!authorization.allowed) throw new Error"), "blocked worker capability does not fail closed with an explicit error");
assert(source.includes("available: false"), "Python capability defaults are not unavailable");
assert(client.includes('if (item.state !== "attested") return false'), "Python availability is not tied to verified attestation");
assert(client.includes('item.allowedCapabilities.includes("network_osint")'), "Python availability does not require network_osint capability attestation");
assert(client.includes("APEX_PYTHON_OSINT_EXPECTED_WORKER_IMAGE_DIGEST") && client.includes("APEX_PYTHON_OSINT_EXPECTED_PROXY_IMAGE_DIGEST"), "API does not independently pin immutable worker/proxy digests");
assert(!/from "node:child_process"|from "child_process"/.test(source), "python-tools directly imports child_process and can bypass the worker boundary");
assert(!/execFile|spawn\(|spawnSync\(|exec\(/.test(source), "python-tools directly invokes subprocess execution and can bypass the worker boundary");

if (failures.length) {
  console.error("PYTHON OSINT FAIL-CLOSED: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("PYTHON OSINT FAIL-CLOSED: PASS");
