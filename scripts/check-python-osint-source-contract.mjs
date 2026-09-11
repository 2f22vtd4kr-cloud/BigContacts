import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/python-tools.ts", "utf8");
const gate = 'if (!PYTHON_OSINT_EGRESS_GOVERNED) return { ...base, error: PYTHON_OSINT_EGRESS_ERROR };';

const checks = [
  ["Python OSINT source fails closed", source.includes("const PYTHON_OSINT_EGRESS_GOVERNED = false;")],
  ["quarantine explains the missing governed boundary", source.includes("subprocess network egress is not yet governed by the Apex sandbox/egress boundary")],
  ["Holehe is gated", source.includes(gate)],
  ["Maigret is gated", source.includes(gate)],
  ["Sherlock is gated", source.includes(gate)],
  ["theHarvester is gated", source.includes(gate)],
  ["Python deep research is gated", /runOpenDeepResearch[\s\S]{0,360}PYTHON_OSINT_EGRESS_GOVERNED/.test(source)],
];

if (source.split(gate).length - 1 < 4) checks[2][1] = false;

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
