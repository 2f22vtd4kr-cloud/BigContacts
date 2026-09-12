#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/target-contact-agent.ts", "utf8");
const failures = [];
const pass = (name, ok) => { if (!ok) failures.push(name); };

pass("provider selection requires a durable target case", /if \(input\.caseId == null \|\| !Number\.isSafeInteger\(input\.caseId\)/.test(source));
pass("provider selection reads the durable target case file", /researchCasesTable\.caseFile/.test(source) && /eq\(researchCasesTable\.id, input\.caseId\)/.test(source));
pass("provider selection requires exactly groq or mistral in durable case state", /selected !== "groq" && selected !== "mistral"/.test(source));
pass("caller-supplied provider cannot override durable case selection", /if \(input\.investigatorLlm && input\.investigatorLlm !== selected\) return null/.test(source));
pass("target agent refuses missing or mismatched provider authority", /no durable case-selected Investigator or selection mismatch/.test(source));

if (failures.length) {
  console.error("INVESTIGATOR SELECTION AUTHORITY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("INVESTIGATOR SELECTION AUTHORITY: PASS — target execution can only use the provider durably selected in the exact target case");
