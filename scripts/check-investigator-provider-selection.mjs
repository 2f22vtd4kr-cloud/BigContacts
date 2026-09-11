import fs from "node:fs";
const core = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");
const wrapper = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research.ts", "utf8");
const ssrf = fs.readFileSync("artifacts/api-server/src/src/lib/ssrf-safe-fetch.ts", "utf8");
const context = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-execution-context.ts", "utf8");
const failures = [];
if (/orderedProviders\s*=\s*\[selectedInvestigatorLlm,\s*\.\.\.otherProviders\]/.test(core)) failures.push("selected Investigator still has silent cross-provider fallback");
if (/for\s*\(const \[name, fn\] of orderedProviders\)/.test(core)) failures.push("ReAct llmStep still iterates an ordered multi-Investigator provider list");
if (/otherProviders/.test(core)) failures.push("ReAct core still contains an alternate Investigator provider set");
if (!/const fn = selectedInvestigatorLlm === "groq"/.test(core)) failures.push("ReAct llmStep does not visibly bind the provider adapter to the Boss-selected Investigator");
if (!/fallback:\s*\[\]/.test(core)) failures.push("ReAct result does not explicitly report an empty provider fallback set");
if (!/investigator:\$\{selectedInvestigator\}/.test(wrapper)) failures.push("agentic execution scope does not carry the selected Investigator");
if (!/getAgenticSelectedInvestigator/.test(context)) failures.push("execution context does not expose the selected Investigator");
if (!/Cross-provider Investigator fallback blocked/.test(ssrf)) failures.push("SSRF/network boundary lacks a selected-provider fallback tripwire");
if (failures.length) { console.error("INVESTIGATOR PROVIDER SELECTION: FAIL"); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log("INVESTIGATOR PROVIDER SELECTION: PASS — one explicit Investigator provider per act; cross-provider fallback structurally blocked");