import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const target = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/target-contact-agent.ts"), "utf8");
const runner = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/canonical-single-target-runner.ts"), "utf8");

const checks = [
  ["target Investigator accepts cancellation callback", target.includes("shouldCancel?: () => boolean | Promise<boolean>")],
  ["target Investigator passes cancellation into canonical ReAct", target.includes("shouldCancel: input.shouldCancel")],
  ["target Investigator exposes append-only event callback", target.includes("onInvestigationAct?:")],
  ["target Investigator forwards action events", target.includes("void input.onInvestigationAct?.({ action: step.action")],
  ["canonical target runner checks durable job cancellation", runner.includes("getJob(atlasJobId)") && runner.includes('job.status === "cancelled"')],
  ["canonical target runner supplies cancellation to Investigator", runner.includes("shouldCancel: async () =>")],
  ["canonical target runner persists Investigator action events", runner.includes("onInvestigationAct: async (step) =>") && runner.includes("researchCaseEventsTable).values({ caseId, iteration: baseIteration + 3 + pass")],
  ["Investigator completion is represented as a decision event", runner.includes('step.action === "done" ? "decision" : "observation"')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
