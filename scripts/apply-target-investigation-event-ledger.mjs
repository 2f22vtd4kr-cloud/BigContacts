import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const targetFile = path.join(root, "artifacts/api-server/src/src/lib/target-contact-agent.ts");
const runnerFile = path.join(root, "artifacts/api-server/src/src/lib/canonical-single-target-runner.ts");

let target = fs.readFileSync(targetFile, "utf8");
let runner = fs.readFileSync(runnerFile, "utf8");

if (!target.includes("onInvestigationAct?:")) {
  const signatureWithCancellation = 'contextDocument?: string; shouldCancel?: () => boolean | Promise<boolean> }): Promise<TargetContactAgentResult>';
  const signatureWithoutCancellation = 'contextDocument?: string }): Promise<TargetContactAgentResult>';
  const signature = target.includes(signatureWithCancellation) ? signatureWithCancellation : signatureWithoutCancellation;
  if (!target.includes(signature)) throw new Error("target-agent signature anchor missing");
  target = target.replace(signature, 'contextDocument?: string; shouldCancel?: () => boolean | Promise<boolean>; onInvestigationAct?: (step: { action: string; provider?: string; query?: string; url?: string; summary?: string }) => void | Promise<void> }): Promise<TargetContactAgentResult>');
}
if (!target.includes("void input.onInvestigationAct?.({ action: step.action")) {
  const liveAnchor = 'onLiveStep: (step) => { try { spanFromLiveStep';
  if (!target.includes(liveAnchor)) throw new Error("target-agent live-step anchor missing");
  target = target.replace(liveAnchor, 'onLiveStep: (step) => { void input.onInvestigationAct?.({ action: step.action, provider: step.provider, query: step.query, url: step.url, summary: step.summary }); try { spanFromLiveStep');
}

if (!runner.includes('onInvestigationAct: async (step) =>')) {
  const callAnchor = 'hardTimeoutMs, contextDocument, shouldCancel: async () => { const job = await getJob(atlasJobId); return !job || job.status === "failed" || job.status === "cancelled"; } });';
  if (!runner.includes(callAnchor)) throw new Error("canonical target runner call anchor missing; cancellation hardening must run first");
  const callback = 'hardTimeoutMs, contextDocument, shouldCancel: async () => { const job = await getJob(atlasJobId); return !job || job.status === "failed" || job.status === "cancelled"; }, onInvestigationAct: async (step) => { await db.insert(researchCaseEventsTable).values({ caseId, iteration: baseIteration + 3 + pass, actorRole: step.action === "done" ? "head_investigator" : "specialist", eventType: step.action === "done" ? "decision" : "observation", status: "recorded", summary: `Investigator ${step.action}${step.query ? ` · ${step.query}` : step.url ? ` · ${step.url}` : ""}`.slice(0, 1000), payload: JSON.stringify({ investigatorLlm: boss.investigatorLlm, action: step.action, provider: step.provider, query: step.query, url: step.url, summary: step.summary }) }); } });';
  runner = runner.replace(callAnchor, callback);
}

if (!target.includes("onInvestigationAct?:")) throw new Error("target-agent event callback signature missing");
if (!target.includes("void input.onInvestigationAct?.({ action: step.action")) throw new Error("target-agent event callback propagation missing");
if (!runner.includes("onInvestigationAct: async (step) =>")) throw new Error("target runner event ledger callback missing");
if (!runner.includes("researchCaseEventsTable).values({ caseId, iteration: baseIteration + 3 + pass")) throw new Error("target runner event ledger persistence missing");

fs.writeFileSync(targetFile, target);
fs.writeFileSync(runnerFile, runner);
console.log("Target Investigator event-ledger boundary applied.");
