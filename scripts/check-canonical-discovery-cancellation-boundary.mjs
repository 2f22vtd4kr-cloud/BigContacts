import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const discovery = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts"), "utf8");
const continuation = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts"), "utf8");
const agentic = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts"), "utf8");
const checks = [
  ["canonical discovery uses the canonical agentic wrapper", /runBureauAgenticWebPass\(/.test(discovery) && /runAgenticWebResearch/.test(agentic)],
  ["agentic discovery creates a run abort controller", /input\.mode === "discovery"[\s\S]{0,1800}new AbortController\(\)/.test(agentic)],
  ["agentic discovery propagates caller cancellation", /input\.signal\?\.addEventListener\("abort", abortExternal/.test(agentic)],
  ["agentic discovery has an explicit deadline timer", /input\.mode === "discovery"[\s\S]{0,1800}setTimeout\(\(\) => controller\.abort\(\), requestedHardTimeout\)/.test(agentic)],
  ["agentic discovery checks durable job state when a job is supplied", /input\.mode === "discovery"[\s\S]{0,2600}const job = await getJob\(input\.jobId\)/.test(agentic) && /job\.status !== "running"/.test(agentic)],
  ["agentic discovery passes cancellation into the canonical core", /input\.mode === "discovery"[\s\S]{0,2600}shouldCancel: async \(\) =>/.test(agentic) && /signal: controller\.signal/.test(agentic)],
  ["canonical discovery continuation has a durable cancellation callback", /const shouldCancel = async \(\): Promise<boolean>/.test(continuation) && /getJob\(jobId\)/.test(continuation)],
  ["canonical discovery continuation passes cancellation into Investigator execution", /runBureauAgenticWebPass\([\s\S]{0,1800}shouldCancel\s*\}\)/.test(continuation)],
  ["canonical discovery continuation checks cancellation after model stages", /cancelled after Right-hand review/.test(continuation) && /cancelled before Investigator admission/.test(continuation)],
  ["canonical discovery continuation checks cancellation immediately before durable projection", /cancelled before durable projection/.test(continuation)],
  ["canonical discovery continuation marks cancelled work non-authoritative", /canonical-continuation-cancelled/.test(continuation) && /status: cancelled/.test(continuation)],
];

const discoveryStart = agentic.indexOf('if (input.mode === "discovery")');
const controllerIndex = agentic.indexOf("const controller = new AbortController();", discoveryStart);
const cancellationListenerIndex = agentic.indexOf('input.signal?.addEventListener("abort", abortExternal', controllerIndex);
const deadlineTimerIndex = agentic.indexOf("const deadlineTimer = setTimeout(() => controller.abort(), requestedHardTimeout);", controllerIndex);
const coreDelegationIndex = agentic.indexOf("core.runAgenticWebResearch(discoveryInput)", controllerIndex);
checks.push([
  "discovery installs its abort/cancellation fence before delegating to core",
  discoveryStart >= 0 && controllerIndex > discoveryStart && cancellationListenerIndex > controllerIndex && deadlineTimerIndex > cancellationListenerIndex && coreDelegationIndex > deadlineTimerIndex,
]);

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
