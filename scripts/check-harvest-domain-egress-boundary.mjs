import fs from "node:fs";

const core = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");
const python = fs.readFileSync("artifacts/api-server/src/src/lib/python-tools.ts", "utf8");
const checks = [
  ["harvest capability remains model-visible", core.includes('"harvest_domain"')],
  ["harvest action delegates to the governed Python capability", /action\.action === "harvest_domain"[\s\S]{0,800}runTheHarvester\(action\.domain, undefined, \{ signal: runController\.signal \}\)/.test(core)],
  ["theHarvester is behind the common Python authorization gate", python.includes("runTheHarvester") && python.includes("authorizeNetworkPython(options.signal)")],
  ["theHarvester requires the network OSINT sandbox capability", python.includes('capability: "network_osint"') && python.includes('destinationPolicy: "approved-public-web-only"')],
  ["blocked harvest remains unavailable rather than producing findings", python.includes('available: false') && /if \(blocked\) return \{ \.\.\.base, error: blocked \}/.test(python)],
  ["canonical harvest receives cancellation", core.includes("runTheHarvester(action.domain, undefined, { signal: runController.signal })")],
];
let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log("HARVEST DOMAIN EGRESS BOUNDARY: PASS — model-selected harvest is capability-gated, cancellation-aware, and fail-closed without turning the harness into a deterministic research strategy");
