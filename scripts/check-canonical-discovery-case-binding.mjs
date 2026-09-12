import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts"), "utf8");
const checks = [
  ["explicit discoveryCaseId is validated", /opts\.discoveryCaseId\s*\?\s*await assertDiscoveryCaseBinding\(/.test(source)],
  ["discovery case must be discovery case type", /caseType === \"discovery\"/.test(source)],
  ["discovery case is bound to the current Atlas job", /state\.jobId !== atlasJobId/.test(source)],
  ["investigator authority is preserved across resumed discovery", /state\.investigatorLlm !== investigatorLlm/.test(source)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("CANONICAL DISCOVERY CASE BINDING: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("CANONICAL DISCOVERY CASE BINDING: PASS");
