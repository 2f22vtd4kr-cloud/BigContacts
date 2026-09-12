#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/target-contact-agent.ts", "utf8");
const failures = [];
const pass = (name, ok) => { if (!ok) failures.push(name); };

pass("target agent imports durable research case state", /researchCasesTable/.test(source));
pass("target runs require a durable case id", /caseId == null/.test(source) && /validateTargetCaseBinding\(input\.caseId/.test(source));
pass("target case must be type target", /row\.caseType !== \"target\"/.test(source));
pass("target case must belong to the exact entity", /row\.targetEntityId !== entityId/.test(source));
pass("target runs require an explicit Atlas job id", /!jobId\?\.trim\(\)/.test(source));
pass("target case is bound to the exact Atlas job", /parsed\.atlasJobId === jobId/.test(source));
pass("binding failure stops the Investigator before agentic execution", /refusing target run with an unbound durable case\/job/.test(source));

if (failures.length) {
  console.error("TARGET CASE JOB BINDING: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("TARGET CASE JOB BINDING: PASS — target Investigator execution is bound to the exact durable target case, entity, and Atlas job");
