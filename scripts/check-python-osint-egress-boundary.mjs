import fs from "node:fs";

const pythonSource = fs.readFileSync("artifacts/api-server/src/src/lib/python-tools.ts", "utf8");
const coreSource = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");

const checks = [
  ["Python OSINT is fail-closed behind the sandbox contract", pythonSource.includes("authorizePythonSandboxRequest") && pythonSource.includes("PYTHON_SANDBOX_UNAVAILABLE_REASON")],
  ["Python network capability is explicitly constrained to approved public web", pythonSource.includes('capability: "network_osint"') && pythonSource.includes('destinationPolicy: "approved-public-web-only"')],
  ["all network-capable Python tools call the common authorization gate", (pythonSource.match(/authorizeNetworkPython\(options\.signal\)/g) ?? []).length >= 4],
  ["Python tool availability requires attested network capability", pythonSource.includes('sandbox.state === "attested"') && pythonSource.includes('network_osint')],
  ["theHarvester remains behind the same sandbox contract", pythonSource.includes("runTheHarvester") && pythonSource.includes("authorizeNetworkPython")],
  ["canonical ReAct passes cancellation into theHarvester", coreSource.includes("runTheHarvester") && coreSource.includes("signal: runController.signal")],
  ["canonical ReAct treats theHarvester as a capability, not a deterministic research step", coreSource.includes('action === "harvest_domain"') && coreSource.includes("runTheHarvester")],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
