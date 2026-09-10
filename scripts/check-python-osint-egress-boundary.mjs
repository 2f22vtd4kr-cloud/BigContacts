import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/python-tools.ts", "utf8");
const gate = 'if (!PYTHON_OSINT_EGRESS_GOVERNED) return { ...base, error: PYTHON_OSINT_EGRESS_ERROR };';
const gateCount = source.split(gate).length - 1;

const checks = [
  ["Python OSINT egress is explicitly quarantined", source.includes("const PYTHON_OSINT_EGRESS_GOVERNED = false;")],
  ["Python OSINT quarantine has a non-bypassable error message", source.includes("subprocess network egress is not yet governed")],
  ["all three username/email network tools are gated", gateCount >= 3],
  ["theHarvester remains fail-closed in the canonical ReAct boundary", fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8").includes("HARVEST_DOMAIN blocked")],
];
let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
