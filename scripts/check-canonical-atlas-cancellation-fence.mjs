import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts"), "utf8");
const checks = [];
const add = (name, ok) => checks.push([name, Boolean(ok)]);
const fence = "await assertAtlasJobActive(atlasJobId);";
const fencedAround = (token) => {
  let from = source.indexOf("export async function runCanonicalAtlasPipeline");
  if (from < 0) return false;
  const before = source.indexOf(fence, from);
  if (before < 0) return false;
  const at = source.indexOf(token, before + fence.length);
  if (at < 0) return false;
  const after = source.indexOf(fence, at + token.length);
  return after >= 0;
};

add("canonical Atlas pipeline reads durable job cancellation state", /async function assertAtlasJobActive\(jobId: string\)/.test(source) && /const job = await getJob\(jobId\)/.test(source));
add("opening Right-hand stage is fenced before and after execution", fencedAround("runDeepSeekFreeJson"));
add("opening Gemini Boss stage is fenced before and after execution", fencedAround("runGeminiBossDiscovery"));
add("Investigator discovery is fenced before and after execution", fencedAround("runBureauAgenticWebPass"));
add("control decisions are fenced before and after Boss control", fencedAround("decideAtlasNextAction"));
add("target investigation is fenced against cancellation", fencedAround("runCanonicalSingleTargetInvestigation"));
add("cancelled pipeline cannot project done", /await assertAtlasJobActive\(atlasJobId\);[\s\S]*?await updateJob\(atlasJobId, \{ status: "done"/.test(source));
add("cancelled jobs are persisted as cancelled/incomplete", /const cancelled = message\.includes\("Canonical Atlas job cancelled;"\)/.test(source) && /status: cancelled \? "cancelled" : "failed"/.test(source) && /outcome: "incomplete"/.test(source));
add("failed jobs are not misclassified as cancellation", /job\.status === "failed"/.test(source) && /Canonical Atlas job already failed/.test(source));

const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("CANONICAL ATLAS CANCELLATION FENCE: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("CANONICAL ATLAS CANCELLATION FENCE: PASS");
