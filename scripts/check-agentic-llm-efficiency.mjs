import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research-core.ts");
const source = fs.readFileSync(target, "utf8");

const required = [
  'from "./agentic-llm-telemetry"',
  "recordAgenticLlmAttempt({",
  "agentic provider retry policy",
  "if (resp.status === 429) return null;",
];
for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`agentic LLM efficiency guard failed: missing ${marker}`);
}

const telemetryCount = (source.match(/recordAgenticLlmAttempt\(\{/g) || []).length;
if (telemetryCount < 4) throw new Error(`agentic LLM efficiency guard failed: expected Groq/Mistral success+failure telemetry, found ${telemetryCount}`);

console.log("agentic LLM efficiency guard: PASS");
