import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const discovery = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts"), "utf8");
const agentic = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts"), "utf8");
const checks = [
  ["canonical discovery uses the canonical agentic wrapper", /runBureauAgenticWebPass\(/.test(discovery) && /runAgenticWebResearch/.test(agentic)],
  ["agentic discovery creates a run abort controller", /input\.mode === "discovery"[\s\S]{0,1800}new AbortController\(\)/.test(agentic)],
  ["agentic discovery propagates caller cancellation", /input\.signal\?\.addEventListener\("abort", abortExternal/.test(agentic)],
  ["agentic discovery has an explicit deadline timer", /input\.mode === "discovery"[\s\S]{0,1800}setTimeout\(\(\) => controller\.abort\(\), requestedHardTimeout\)/.test(agentic)],
  ["agentic discovery checks durable job state when a job is supplied", /input\.mode === "discovery"[\s\S]{0,2600}const job = await getJob\(input\.jobId\)/.test(agentic) && /job\.status !== "running"/.test(agentic)],
  ["agentic discovery passes cancellation into the canonical core", /input\.mode === "discovery"[\s\S]{0,2600}shouldCancel: async \(\) =>/.test(agentic) && /signal: controller\.signal/.test(agentic)],
  ["discovery delegates only after installing the cancellation fence", agentic.includes("return { ...(await core.runAgenticWebResearch(discoveryInput)), executionId };")],
];
let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
