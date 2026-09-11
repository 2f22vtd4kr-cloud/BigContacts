import fs from "node:fs";

const control = fs.readFileSync("artifacts/api-server/src/src/lib/atlas-control-decision.ts", "utf8");
const compactor = fs.readFileSync("artifacts/api-server/src/src/lib/investigation-context-compaction.ts", "utf8");
const bureau = fs.readFileSync("artifacts/api-server/src/src/lib/bureau-agentic-pass.ts", "utf8");
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
  ["discovery durable projection is explicit", /DURABLE CASE MEMORY PROJECTION/.test(bureau)],
  ["discovery durable projection is bounded", /trajectory\.slice\(-100\)/.test(bureau) && /trajectoryRecords\.slice\(-100\)/.test(bureau) && /\.slice\(0, 28000\)/.test(bureau)],
  ["discovery durable projection stores structured Investigator records", /investigatorTrajectoryRecords: trajectoryRecords/.test(bureau)],
  ["discovery trajectory is also retained in the immutable event ledger", /eventType = record\.action === "done" \? "decision" : "tool_observation"/.test(bureau) && /researchCaseEventsTable/.test(bureau)],
  ["discovery trajectory events have run-turn correlation", /\$\{input\.runId\}:turn:\$\{record\.turn\}:trajectory/.test(bureau)],
  ["discovery claims retain immutable observation-event anchors", /observationEventIds: resolvedObservationIds/.test(bureau)],
  ["discovery promotions reference the immutable claim event", /claimEventId, decision: finding\.promotionDecision/.test(bureau)],
  ["durable discovery projection does not recursively copy the prior context document", !/memoryProjection\s*=\s*\{[^}]*contextDocument/s.test(bureau)],
];
let failed = false;
for (const [name, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed = true; }
if (failed) process.exit(1);
