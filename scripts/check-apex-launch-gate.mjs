#!/usr/bin/env node
import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const checks = [];
const pass = (name, ok) => checks.push([name, Boolean(ok)]);

const wrapper = read("artifacts/api-server/src/src/lib/agentic-web-research.ts");
const agentic = read("artifacts/api-server/src/src/lib/agentic-web-research-core.ts");
const strict = read("artifacts/api-server/src/src/lib/bureau-contact-persist-strict.ts");
const batch = read(".github/workflows/apex-batch10.yml");
const discovery = read("artifacts/api-server/src/src/lib/discovery-agent.ts");
const orchestrator = read("artifacts/api-server/src/src/lib/atlas-orchestrator.ts");

pass("Investigator wrapper mounts canonical core", wrapper.includes("agentic-web-research-core"));
pass("Investigator adapter pool contains Groq", /callGroqJson/.test(agentic));
pass("Investigator adapter pool contains Mistral", /callMistralJson/.test(agentic));
pass("Boss-selected Investigator reaches llmStep", /investigatorLlm\?: "groq" \| "mistral"/.test(agentic) && /selectedInvestigatorLlm/.test(agentic));
pass("selected Investigator is first-class, not a fixed research stage", /const orderedProviders = selectedInvestigatorLlm/.test(agentic) && /providers\.filter\(\(\[name\]\) => name === selectedInvestigatorLlm\)/.test(agentic));
pass("no forced search-provider order", !/Prefer Serper.*Tavily.*Exa/i.test(agentic) && !/const serper[\s\S]*const tavily[\s\S]*const exa/.test(agentic));
pass("canonical Dig lane has no Gemini implementation", !/callGeminiJson/.test(agentic));
pass("canonical Dig lane has no NVIDIA implementation", !/callNvidiaJson/.test(agentic));
pass("strict boundary does not import legacy projector", !/from [\"']\.\/bureau-contact-persist[\"']/.test(strict));
pass("strict boundary has explicit investigator selection API", /applyInvestigatorSelectedContactToEntityCard/.test(strict));
pass(
  "strict boundary rejects query URLs",
  /SEARCH_QUERY_URL/.test(strict) && /efts\\?\.sec\\?\.gov/.test(strict),
);
pass(
  "manual live audit is bounded to three targets",
  /[\"']targetCount[\"']\s*:\s*3/.test(batch) && !/[\"']targetCount[\"']\s*:\s*10/.test(batch),
);
pass("manual audit runs agentic runtime checks", /check:agentic-runtime/.test(batch));
pass("discovery emits model-selection progress", /onSlotProgress\?/.test(discovery));
pass("orchestrator defaults target limit to three", /opts\.targetCount \?\? 3/.test(orchestrator));
pass("orchestrator does not force a ten-target default", !/opts\.targetCount \?\? 10/.test(orchestrator));

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log(`\nApex launch gate: ${checks.length} checks passed.`);