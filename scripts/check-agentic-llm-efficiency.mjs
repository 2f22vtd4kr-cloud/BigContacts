import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research-core.ts");
const source = fs.readFileSync(target, "utf8");

const required = [
  'from "./agentic-llm-telemetry"',
  "recordAgenticLlmAttempt({",
  "const models = [process.env.MISTRAL_AGENTIC_MODEL",
  "for (const key of keys) for (const model of GROQ_CHAT_MODELS)",
  "if ([401, 403, 429].includes(response.status)) break;",
  "setAgenticLlmHealth(false, null, `${selectedInvestigatorLlm}:selected provider unavailable`)",
];
for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`agentic LLM efficiency guard failed: missing ${marker}`);
}

const telemetryCount = (source.match(/recordAgenticLlmAttempt\(\{/g) || []).length;
if (telemetryCount < 4) throw new Error(`agentic LLM efficiency guard failed: expected provider success+failure telemetry, found ${telemetryCount}`);

// Provider choice is already fixed by the Boss-selected Investigator adapter. This guard
// must verify bounded attempts and fail-closed unavailability, not encode a retry/fallback
// strategy that could turn into deterministic research/provider sequencing.
if (!/const fn = selectedInvestigatorLlm === "groq" \?/.test(source)) {
  throw new Error("agentic LLM efficiency guard failed: direct selected-provider boundary is missing");
}
if (!/return \{ \.\.\.result, fallback: \[\] \}/.test(source)) {
  throw new Error("agentic LLM efficiency guard failed: provider fallback telemetry must remain empty");
}

console.log("agentic LLM efficiency guard: PASS — selected-provider calls are bounded, instrumented, and fail closed without cross-provider fallback");
