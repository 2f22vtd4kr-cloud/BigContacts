import fs from "node:fs";

const wrapper = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research.ts", "utf8");
const source = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");
const targetAgent = fs.readFileSync("artifacts/api-server/src/src/lib/target-contact-agent.ts", "utf8");
const orientation = fs.readFileSync("artifacts/api-server/src/src/lib/apex-bureau-orientation.ts", "utf8");
const bossPrompt = fs.readFileSync("artifacts/api-server/src/src/lib/case-bureau-prompt.ts", "utf8");
const extractorStart = source.indexOf("function extractContactFactsFromHtml");
const extractorNextFunction = extractorStart >= 0 ? source.indexOf("function ", extractorStart + 1) : -1;
const extractorEnd = extractorNextFunction > extractorStart ? extractorNextFunction : source.length;
const extractorSource = extractorStart >= 0 ? source.slice(extractorStart, extractorEnd) : "";

const checks = [
  ["canonical investigator wrapper exists", wrapper.includes("agentic-web-research-core")],
  ["canonical investigator uses runtime capability registry", source.includes("getAvailableInvestigatorCapabilities") && source.includes("investigatorCapabilityKeyName")],
  ["selected capability reaches Groq execution adapter", /callGroqJson\\(promptValue, signalValue, cognitiveTask, selectedInvestigatorLlm(?:,|\\))/.test(source)],
  ["selected capability is not a closed vendor contract", !/FAILOVER_CHAIN:\s*Groq -> Groq/.test(source)],
  ["investigator lane does not call Gemini", !/callGeminiJson|GEMINI_API_KEY/i.test(source)],
  ["investigator lane does not call NVIDIA", !/callNvidiaJson|NVIDIA_API_KEY/i.test(source)],
  ["Dig lane uses compact orientation", /apexOrientationCompact\("dig_agent"\)/.test(source)],
  ["raw HTML extractor is observation-only", extractorSource.length > 0 && !/\bPERSON\s*:/.test(extractorSource)],
  ["raw HTML extractor has no name promotion", extractorSource.length > 0 && !/\bNAME\s*:/.test(extractorSource)],
  ["search capability pool exposes multiple backends", /Serper|Tavily|Exa/.test(source)],
  ["canonical Investigator does not import deterministic orchestrator strategy", !/agent-orchestrator|expandQuery|planQuery|mcts-agent/.test(wrapper + targetAgent)],
  ["canonical orientation is not a retired vendor contract", !/Gemini|Mistral|Perplexity/i.test(orientation)],
  ["canonical Boss prompt is not a retired vendor contract", !/Gemini|Mistral|Perplexity/i.test(bossPrompt)],
  ["canonical target wrapper is not a retired vendor contract", !/Gemini|Mistral|Perplexity/i.test(wrapper)],
  ["canonical Investigator core is not a retired vendor contract", !/Gemini|Mistral|Perplexity/i.test(source)],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exit(1);
console.log(`\nAgentic source parity: ${checks.length} checks passed.`);
