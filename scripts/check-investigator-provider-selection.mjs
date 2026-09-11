import fs from "node:fs";
const core = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");
const failures = [];
if (/orderedProviders\s*=\s*\[selectedInvestigatorLlm,\s*\.\.\.otherProviders\]/.test(core)) failures.push("selected Investigator still has silent cross-provider fallback");
if (/for\s*\(const \[name, fn\] of orderedProviders\)/.test(core)) failures.push("ReAct llmStep still iterates an ordered multi-Investigator provider list");
if (!/selectedInvestigatorLlm/.test(core)) failures.push("ReAct llmStep does not visibly bind execution to the Boss-selected Investigator");
if (failures.length) { console.error("INVESTIGATOR PROVIDER SELECTION: FAIL"); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log("INVESTIGATOR PROVIDER SELECTION: PASS — one explicit Investigator provider per act; no silent cross-provider fallback");
