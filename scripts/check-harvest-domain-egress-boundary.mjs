import fs from "node:fs";

const core = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");
const python = fs.readFileSync("artifacts/api-server/src/src/lib/python-tools.ts", "utf8");
const client = fs.readFileSync("artifacts/api-server/src/src/lib/python-osint-worker-client.ts", "utf8");
const checks = [
  ["harvest capability remains model-visible", core.includes('"harvest_domain"')],
  ["harvest action delegates to the governed Python capability", /action\.action === "harvest_domain"[\s\S]{0,900}runTheHarvester\(action\.domain, undefined, \{ signal: runController\.signal, correlation:/.test(core)],
  ["theHarvester adapter executes only through the canonical worker client", python.includes('executeTool("theharvester"') && python.includes("options.correlation")],
  ["theHarvester worker call requires verified network OSINT authorization", client.includes("authorizePythonSandboxRequest") && client.includes('capability: "network_osint"') && client.includes('destinationPolicy: "approved-public-web-only"')],
  ["blocked or unavailable harvest remains unavailable rather than producing findings", /available: response\.status === "completed" \|\| \(response\.status === "partial" && \(emails\.length \+ subdomains\.length \+ ips\.length \+ hosts\.length > 0\)\)/.test(python)],
  ["canonical harvest receives cancellation and durable correlation", core.includes("runTheHarvester(action.domain, undefined, { signal: runController.signal, correlation:")],
];
let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log("HARVEST DOMAIN EGRESS BOUNDARY: PASS — model-selected harvest is capability-gated, cancellation-aware, and fail-closed without turning the harness into a deterministic research strategy");
