import fs from "node:fs";

const control = fs.readFileSync("artifacts/api-server/src/src/lib/atlas-control-decision.ts", "utf8");
const compactor = fs.readFileSync("artifacts/api-server/src/src/lib/investigation-context-compaction.ts", "utf8");
const checks = [
  ["discovery control imports semantic context compaction", /import \{ compactInvestigationContext \}/.test(control)],
  ["discovery control compacts the state before model review", /const compactState = compactInvestigationContext\(/.test(control)],
  ["discovery control supplies structured trajectory records to compaction", /trajectoryRecords: structuredTrajectory/.test(control)],
  ["discovery control supplies evidence attribution state", /evidenceGraphSummaries:/.test(control)],
  ["Right Hand must complete before Gemini controls transition", /if \(rightHand\.status !== "completed"\)/.test(control)],
  ["discovery transition fails closed when Right Hand is unavailable", /Atlas transition is fail-closed/.test(control)],
  ["discovery control decisions have idempotent case-turn correlation", /atlas-control:case:\$\{input\.caseId\}:turn:\$\{input\.controlTurn\}/.test(control)],
  ["compactor bounds model-facing context", /DEFAULT_MAX_CHARS = 32_000/.test(compactor) && /MAX_MAX_CHARS = 64_000/.test(compactor)],
  ["compactor removes recursive prior context", /removeNestedPrior/.test(compactor)],
  ["compactor prefers structured observations", /Recent structured Investigator observations/.test(compactor)],
  ["compactor retains evidence attribution", /Evidence attribution state/.test(compactor)],
];
let failed = false;
for (const [name, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed = true; }
if (failed) process.exit(1);
