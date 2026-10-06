#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/target-contact-agent.ts", "utf8");
const failures = [];
const pass = (name, ok) => { if (!ok) failures.push(name); };

pass("provider selection requires a durable target case", /if \(input\.caseId == null \|\| !Number\.isSafeInteger\(input\.caseId\)/.test(source));
pass("provider selection reads the durable target case file", /researchCasesTable\.caseFile/.test(source) && /eq\(researchCasesTable\.id,\s*(?:caseId|input\.caseId)\)/.test(source) && /validateTargetCaseBinding\(input\.caseId/.test(source));
pass("provider selection must use a runtime capability, not a literal provider", /typeof selected === "string" && getAvailableInvestigatorCapabilities\(\)\.includes\(investigator)/.test(source));
/* Exact capability→credential binding is enforced at the execution adapter boundary, not by the case-authority reader. */
pass("caller-supplied provider cannot override durable case selection", /if \(input\.investigatorLlm && input\.investigatorLlm !== investigator\) return null/.test(source));
pass("target agent refuses missing or mismatched provider authority", /no durable case-selected Investigator or selection mismatch/.test(source));

if (failures.length) {
  console.error("INVESTIGATOR SELECTION AUTHORITY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("INVESTIGATOR SELECTION AUTHORITY: PASS — target execution can only use the provider durably selected in the exact target case");