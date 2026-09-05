import fs from "node:fs";

const file = "artifacts/api-server/src/src/lib/agentic-web-research.ts";
const source = fs.readFileSync(file, "utf8");

const marker = "DIG_INVESTIGATOR_FAILOVER_CHAIN";
const llmStart = source.indexOf(marker);
const llmEnd = source.indexOf("function formatFindingsBag", llmStart);
const extractorStart = source.indexOf("function extractContactFactsFromHtml");
const extractorEnd = source.indexOf("function isMostlyBinaryGarbage", extractorStart);

const checks = [
  ["canonical Dig lane marker exists", llmStart >= 0],
  ["Dig lane uses Groq first", llmStart >= 0 && llmEnd > llmStart && /callGroqJson/.test(source.slice(llmStart, llmEnd))],
  ["Dig lane fails over to Mistral", llmStart >= 0 && llmEnd > llmStart && /callMistralJson/.test(source.slice(llmStart, llmEnd))],
  ["Dig lane does not call Gemini", llmStart >= 0 && llmEnd > llmStart && !/callGeminiJson/.test(source.slice(llmStart, llmEnd))],
  ["Dig lane does not call NVIDIA", llmStart >= 0 && llmEnd > llmStart && !/callNvidiaJson/.test(source.slice(llmStart, llmEnd))],
  ["Dig lane uses compact orientation", /apexOrientationCompact\("dig_agent"\)/.test(source.slice(llmStart))],
  ["raw HTML extractor is observation-only", extractorStart >= 0 && extractorEnd > extractorStart && !/\bPERSON\s*:/.test(source.slice(extractorStart, extractorEnd))],
  ["raw HTML extractor has no name promotion", extractorStart >= 0 && extractorEnd > extractorStart && !/\bNAME\s*:/.test(source.slice(extractorStart, extractorEnd))],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exit(1);
console.log(`\nAgentic source parity: ${checks.length} checks passed.`);
