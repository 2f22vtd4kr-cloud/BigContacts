#!/usr/bin/env node
import fs from "node:fs";

const control = fs.readFileSync("artifacts/api-server/src/src/lib/atlas-control-decision.ts", "utf8");
const atlas = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts", "utf8");

const checks = [
  ["control decision imports durable case tables", /researchCasesTable/.test(control) && /researchCaseEventsTable/.test(control)],
  ["control decision writes a durable control_decision event", /eventType:\s*[\"']control_decision[\"']/.test(control)],
  ["control decision records Boss action and candidate", /action:\s*input\.decision\.action/.test(control) && /candidateName:\s*input\.decision\.candidateName/.test(control)],
  ["control decision records Right-hand state", /rightHand:\s*input\.decision\.rightHand/.test(control)],
  ["control decision records control turn", /controlTurn:\s*input\.controlTurn/.test(control)],
  ["control decision persistence fails closed", /Failed to persist Atlas control decision/.test(control)],
  ["control decision requires durable case ID", /caseId:\s*number;/.test(control) && /requires a valid durable caseId/.test(control)],
  ["control decision requires positive control turn", /controlTurn:\s*number;/.test(control) && /requires a valid positive controlTurn/.test(control)],
  ["persistence cannot silently skip a missing case ID", !/if\s*\(!input\.caseId\)\s*return/.test(control)],
  ["canonical Atlas passes durable discovery case ID", /caseId:\s*discoveryCaseId/.test(atlas)],
  ["canonical Atlas passes control turn", /controlTurn:\s*controlTurns/.test(atlas)],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failed = true;
}
if (failed) {
  console.error("Atlas control durability guard failed.");
  process.exit(1);
}
console.log("Atlas control durability guard passed.");