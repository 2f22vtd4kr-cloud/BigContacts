import fs from "node:fs";

const runner = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts", "utf8");
const agentic = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research.ts", "utf8");
const checks = [
  ["canonical runner invokes exactly one Investigator iteration", /maxIterations:\s*1/.test(runner)],
  ["canonical runner reads durable oversight after each act", /readOversight\(caseState\)/.test(runner)],
  ["canonical runner blocks on stop", /if \(lastOversight\.action === "stop"\) break/.test(runner)],
  ["canonical runner fails closed when oversight is unavailable", /!lastOversight \|\| lastOversight\.status !== "completed"/.test(runner)],
  ["redirect becomes a research objective, not a tool command", /Gemini research objective/.test(runner)],
  ["agentic entrypoint performs Right Hand + Boss review after an act", /await reviewTargetInvestigationAct\(/.test(agentic)],
  ["discovery is not accidentally target-gated", /input\.mode === "discovery"/.test(agentic)],
];
let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
