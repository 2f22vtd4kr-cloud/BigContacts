import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts"), "utf8");
const checks = [
  ["canonical Atlas pipeline reads durable job cancellation state", /async function assertAtlasJobActive\(jobId: string\)/.test(source) && /const job = await getJob\(jobId\)/.test(source)],
  ["opening Right-hand/Boss stages are cancellation-fenced", /await assertAtlasJobActive\(atlasJobId\);[\s\S]{0,500}runDeepSeekFreeJson/.test(source) && /runGeminiBossDiscovery[\s\S]{0,120}await assertAtlasJobActive\(atlasJobId\)/.test(source)],
  ["Investigator discovery is fenced before and after execution", /await assertAtlasJobActive\(atlasJobId\);[\s\S]{0,500}runBureauAgenticWebPass[\s\S]{0,300}await assertAtlasJobActive\(atlasJobId\)/.test(source)],
  ["control decisions are fenced before and after Boss control", /while \(controlTurns < maxControlTurns\)[\s\S]{0,600}await assertAtlasJobActive\(atlasJobId\)[\s\S]{0,900}decideAtlasNextAction[\s\S]{0,300}await assertAtlasJobActive\(atlasJobId\)/.test(source)],
  ["target investigation is fenced against cancellation", /await assertAtlasJobActive\(atlasJobId\);[\s\S]{0,300}runCanonicalSingleTargetInvestigation[\s\S]{0,300}await assertAtlasJobActive\(atlasJobId\)/.test(source)],
  ["cancelled pipeline cannot project done", /await assertAtlasJobActive\(atlasJobId\);[\s\S]{0,300}await updateJob\(atlasJobId, \{ status: "done"/.test(source)],
  ["cancellation is persisted as cancelled/incomplete", /const cancelled = message\.includes\("cancelled or failed"\)/.test(source) && /status: cancelled \? "cancelled" : "failed"/.test(source) && /outcome: "incomplete"/.test(source)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("CANONICAL ATLAS CANCELLATION FENCE: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("CANONICAL ATLAS CANCELLATION FENCE: PASS");
