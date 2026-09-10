import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "artifacts/api-server/src/src/lib/canonical-single-target-runner.ts");
let source = fs.readFileSync(file, "utf8");

const needle = 'hardTimeoutMs, contextDocument });';
if (source.includes(needle) && !source.includes('shouldCancel: async () =>')) {
  const replacement = 'hardTimeoutMs, contextDocument, shouldCancel: async () => { const job = await getJob(atlasJobId); return !job || job.status === "failed" || job.status === "cancelled"; } });';
  source = source.replace(needle, replacement);
}
if (!source.includes('shouldCancel: async () =>')) throw new Error('canonical target runner cancellation callback was not installed');
fs.writeFileSync(file, source);
console.log('Canonical target runner cancellation boundary applied.');
