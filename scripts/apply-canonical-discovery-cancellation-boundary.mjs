import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts");
let source = fs.readFileSync(file, "utf8");

if (!source.includes("getJob")) {
  source = source.replace('import { updateJob, clearActiveJobIfOwned } from "./job-queue";', 'import { getJob, updateJob, clearActiveJobIfOwned } from "./job-queue";');
}
const callNeedle = 'hardTimeoutMs: opts.targetTimeoutMs ?? depth.agenticHardTimeoutMs });';
const callReplacement = 'hardTimeoutMs: opts.targetTimeoutMs ?? depth.agenticHardTimeoutMs, shouldCancel: async () => { const job = await getJob(atlasJobId); return !job || job.status === "failed" || job.status === "cancelled"; } });';
const matches = source.split(callNeedle).length - 1;
if (matches > 0) source = source.replaceAll(callNeedle, callReplacement);
if (!source.includes('shouldCancel: async () => { const job = await getJob(atlasJobId);')) throw new Error("canonical discovery cancellation boundary was not installed");
fs.writeFileSync(file, source);
console.log(`Canonical discovery cancellation boundary applied to ${Math.max(0, matches)} Investigator launches.`);
