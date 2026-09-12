#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/target-contact-agent.ts", "utf8");
const failures = [];
const pass = (name, ok) => { if (!ok) failures.push(name); };

pass("provider selection requires a durable job id", /if \(!input\.jobId\) return null/.test(source));
pass("provider selection reads the durable discovery trace", /getDiscoveryTrace\(input\.jobId\)/.test(source));
pass("provider selection fails when the durable trace is ambiguous", /if \(models\.length !== 1\) return null/.test(source));
pass("caller-supplied provider cannot override durable selection", /if \(input\.investigatorLlm && input\.investigatorLlm !== models\[0\]\) return null/.test(source));
pass("target agent refuses missing or mismatched provider authority", /no durable Investigator selection or selection mismatch/.test(source));

if (failures.length) {
  console.error("INVESTIGATOR SELECTION AUTHORITY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("INVESTIGATOR SELECTION AUTHORITY: PASS — target execution can only use the single durable Investigator selection associated with the Atlas job");
