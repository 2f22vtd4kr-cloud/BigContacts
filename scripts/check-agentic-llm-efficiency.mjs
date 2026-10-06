import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research-core.ts");
const source = fs.readFileSync(target, "utf8");
const telemetry = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/agentic-llm-telemetry.ts"), "utf8");

const required = [
  'from "./agentic-llm-telemetry"',
  "recordAgenticLlmAttempt({",
  "async function callGroqJson",
  "rankGroqModelsForTask",
  "if (response.status === 401 || response.status === 403) break;",
  "response.status === 429",
  "investigatorCapabilityKeyName(selectedInvestigatorLlm)",
  "fallback: []",
  "investigatorCapabilityKeyName(investigatorCapability)",
  "promptTokens: data.usage?.prompt_tokens",
  "cachedPromptTokens: data.usage?.prompt_tokens_details?.cached_tokens",
];
for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`agentic LLM efficiency guard failed: missing ${marker}`);
}

const telemetryCount = (source.match(/recordAgenticLlmAttempt\(\{/g) || []).length;
if (!/promptTokens\?: number/.test(telemetry) || !/cachedPromptTokens\?: number/.test(telemetry)) throw new Error("agentic LLM efficiency guard failed: token telemetry fields are missing");

if (telemetryCount < 2) throw new Error(`agentic LLM efficiency guard failed: expected provider success+failure telemetry, found ${telemetryCount}`);

// Provider choice is fixed by the Boss-selected Investigator adapter.
// Routing may choose among Groq models, but it must never change provider role.
if (!/const fn = selectedInvestigatorLlm && investigatorCapabilityKeyName\(selectedInvestigatorLlm\)/.test(source)) {
  throw new Error("agentic LLM efficiency guard failed: direct selected-provider boundary is missing");
}
if (!/return \{ \.\.\.result, fallback: \[\] \}/.test(source)) {
  throw new Error("agentic LLM efficiency guard failed: provider fallback telemetry must remain empty");
}

console.log("agentic LLM efficiency guard: PASS — selected-provider calls are bounded, instrumented, and fail closed without cross-provider fallback");
