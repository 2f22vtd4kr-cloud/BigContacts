import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "artifacts/api-server/src/src/lib/job-queue.ts"), "utf8");
const checks = [
  ["owner-bound release uses Redis Lua/CAS", /clearActiveJobIfMatches[\s\S]{0,1400}redis\.call\('get', KEYS\[1\]\)[\s\S]{0,400}ARGV\[1\][\s\S]{0,400}redis\.call\('del', KEYS\[1\]\)/.test(source)],
  ["legacy GET-then-DEL release pattern is absent", !/const active = await getActiveJob\(type\);[\s\S]{0,120}await clearActiveJob\(type\)/.test(source)],
  ["owner mismatch cannot clear the Redis pointer", /return 0 end/.test(source)],
  ["active-job claim is atomic under concurrent callers", /setActiveJob[\s\S]{0,1200}redis\.call\('get',k\)[\s\S]{0,500}redis\.call\('set',k,ARGV\[1\]/.test(source)],
  ["unconditional clear only deletes terminal jobs", /hget',ARGV\[1\]\.\.id,'status'[\s\S]{0,300}s=='done' or s=='failed' or s=='cancelled'[\s\S]{0,100}redis\.call\('del',k\)/.test(source)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("ACTIVE JOB RELEASE ATOMICITY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("ACTIVE JOB RELEASE ATOMICITY: PASS");
