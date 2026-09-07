import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
let s = fs.readFileSync(target, "utf8");

if (!s.includes('from "./agentic-llm-telemetry"')) {
  const anchor = 'import { withProviderScope } from "./provider-gate";';
  if (!s.includes(anchor)) throw new Error("telemetry import anchor missing");
  s = s.replace(anchor, anchor + '\nimport { recordAgenticLlmAttempt } from "./agentic-llm-telemetry";');
}

const groqStart = s.indexOf("async function callGroqJson");
const groqEnd = s.indexOf("async function callMistralJson", groqStart);
if (groqStart < 0 || groqEnd < 0) throw new Error("Groq/Mistral anchors missing");
let groq = s.slice(groqStart, groqEnd);
if (!groq.includes("let telemetryAttemptCount")) {
  groq = groq.replace(
    "  if (!keys.length) return null;\n",
    "  if (!keys.length) return null;\n  let telemetryAttemptCount = 0;\n",
  );
}
if (!groq.includes("event: \"apex_agentic_llm_attempt\"")) {
  const fetchAnchor = '        const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {';
  if (!groq.includes(fetchAnchor)) throw new Error("Groq fetch anchor missing");
  groq = groq.replace(fetchAnchor, '        telemetryAttemptCount += 1;\n' + fetchAnchor);
  const parseAnchor = '        const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };';
  if (!groq.includes(parseAnchor)) throw new Error("Groq response parse anchor missing");
  groq = groq.replace(parseAnchor, `        const data = await resp.json() as {\n          choices?: Array<{ message?: { content?: string } }>;\n          usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };\n        };\n        recordAgenticLlmAttempt({\n          provider: "groq",\n          model,\n          promptChars: prompt.length,\n          status: resp.status,\n          success: true,\n          promptTokens: data.usage?.prompt_tokens,\n          completionTokens: data.usage?.completion_tokens,\n          totalTokens: data.usage?.total_tokens,\n          retryIndex: telemetryAttemptCount,\n        });`);
}
s = s.slice(0, groqStart) + groq + s.slice(groqEnd);

const mistralStart = s.indexOf("async function callMistralJson");
const mistralEnd = s.indexOf("/**\n * INVESTIGATOR_POOL_RETRY", mistralStart);
if (mistralStart < 0 || mistralEnd < 0) throw new Error("Mistral end anchor missing");
let mistral = s.slice(mistralStart, mistralEnd);
if (!mistral.includes("let telemetryAttemptCount")) {
  mistral = mistral.replace(
    "  if (!key) return null;\n",
    "  if (!key) return null;\n  let telemetryAttemptCount = 0;\n",
  );
}
if (!mistral.includes("event: \"apex_agentic_llm_attempt\"")) {
  const fetchAnchor = '      const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {';
  if (!mistral.includes(fetchAnchor)) throw new Error("Mistral fetch anchor missing");
  mistral = mistral.replace(fetchAnchor, '      telemetryAttemptCount += 1;\n' + fetchAnchor);
  const parseAnchor = '      const data = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };';
  if (!mistral.includes(parseAnchor)) throw new Error("Mistral response parse anchor missing");
  mistral = mistral.replace(parseAnchor, `      const data = (await resp.json()) as {\n        choices?: Array<{ message?: { content?: string } }>;\n        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };\n      };\n      recordAgenticLlmAttempt({\n        provider: "mistral",\n        model,\n        promptChars: prompt.length,\n        status: resp.status,\n        success: true,\n        promptTokens: data.usage?.prompt_tokens,\n        completionTokens: data.usage?.completion_tokens,\n        totalTokens: data.usage?.total_tokens,\n        retryIndex: telemetryAttemptCount,\n      });`);
}
s = s.slice(0, mistralStart) + mistral + s.slice(mistralEnd);

fs.writeFileSync(target, s);
console.log("Applied safe Investigator LLM usage telemetry (successful calls only; no prompt/content/secrets stored)");
