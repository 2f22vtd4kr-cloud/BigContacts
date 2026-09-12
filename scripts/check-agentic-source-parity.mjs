import fs from "node:fs";

const wrapper = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research.ts", "utf8");
const source = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");
const targetAgent = fs.readFileSync("artifacts/api-server/src/src/lib/target-contact-agent.ts", "utf8");

const marker = "INVESTIGATOR_LLM_CAPABILITY_POOL";
const llmStart = source.indexOf(marker);
const llmEnd = source.indexOf("function formatFindingsBag", llmStart);
const extractorStart = source.indexOf("function extractContactFactsFromHtml");
const extractorNextFunction = extractorStart >= 0 ? source.indexOf("function ", extractorStart + 1) : -1;
const extractorEnd = extractorNextFunction > extractorStart ? extractorNextFunction : source.length;
const extractorSource = extractorStart >= 0 ? source.slice(extractorStart, extractorEnd) : "";

const checks = [
  ["canonical investigator wrapper exists", wrapper.includes("agentic-web-research-core")],
  ["canonical investigator LLM capability marker exists", llmStart >= 0],
  ["investigator lane defines provider adapters", llmStart >= 0 && llmEnd > llmStart && /callGroqJson|callMistralJson/.test(source.slice(llmStart, llmEnd))],
  ["investigator lane is not a closed vendor contract", llmStart >= 0 && llmEnd > llmStart && !/FAILOVER_CHAIN:\s*Groq -> Mistral/.test(source.slice(llmStart, llmEnd))],
  ["investigator lane does not call Gemini", llmStart >= 0 && llmEnd > llmStart && !/callGeminiJson/.test(source.slice(llmStart, llmEnd))],
  ["investigator lane does not call NVIDIA", llmStart >= 0 && llmEnd > llmStart && !/callNvidiaJson/.test(source.slice(llmStart, llmEnd))],
  ["Dig lane uses compact orientation", /apexOrientationCompact\("dig_agent"\)/.test(source.slice(llmStart))],
  ["raw HTML extractor is observation-only", extractorSource.length > 0 && !/\bPERSON\s*:/.test(extractorSource)],
  ["raw HTML extractor has no name promotion", extractorSource.length > 0 && !/\bNAME\s*:/.test(extractorSource)],
  ["search capability pool exposes multiple backends", /Serper|Tavily|Exa/.test(source)],
  ["canonical Investigator does not import deterministic orchestrator strategy", !/agent-orchestrator|expandQuery|planQuery|mcts-agent/.test(wrapper + targetAgent)],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exit(1);
console.log(`\nAgentic source parity: ${checks.length} checks passed.`);
