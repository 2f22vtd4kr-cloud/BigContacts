import fs from "node:fs";

const path = "artifacts/api-server/src/src/lib/bureau-agentic-pass.ts";
let source = fs.readFileSync(path, "utf8");

if (!source.includes("let investigationEventChain = Promise.resolve();")) {
  const invocation = '    const agentic = await runAgenticWebResearch({';
  if (!source.includes(invocation)) throw new Error("bureau ReAct invocation anchor missing");
  source = source.replace(invocation, '    let investigationEventChain = Promise.resolve();\n    const agentic = await runAgenticWebResearch({');
}

const fireAndForget = 'onLiveStep: (step) => { void input.onInvestigationAct?.({ action: step.action, provider: step.provider, query: step.query, url: step.url, summary: step.summary }); void publishBureauEvent';
const ordered = 'onLiveStep: (step) => { investigationEventChain = investigationEventChain.then(async () => { await input.onInvestigationAct?.({ action: step.action, provider: step.provider, query: step.query, url: step.url, summary: step.summary }); }); void publishBureauEvent';
if (source.includes(fireAndForget)) source = source.replace(fireAndForget, ordered);

if (!source.includes("await investigationEventChain;")) {
  const drainAnchor = '    if (durableCaseId != null && mode === "discovery") await persistDiscoveryTrajectory';
  if (!source.includes(drainAnchor)) throw new Error("bureau event-chain drain anchor missing");
  source = source.replace(drainAnchor, '    await investigationEventChain;\n    if (durableCaseId != null && mode === "discovery") await persistDiscoveryTrajectory');
}

if (!source.includes("investigationEventChain = investigationEventChain.then")) throw new Error("bureau Investigator events are not serialized");
if (!source.includes("await investigationEventChain;")) throw new Error("bureau Investigator events are not drained before completion");

fs.writeFileSync(path, source);
console.log("Bureau Investigator event callbacks are now ordered and drained before pass completion.");
