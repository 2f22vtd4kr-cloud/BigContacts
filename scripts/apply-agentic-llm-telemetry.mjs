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
if (!groq.includes("recordAgenticLlmAttempt({")) {
  groq = groq.replace(
    "  if (!keys.length) return null;\n",
    "  if (!keys.length) return null;\n  let telemetryAttemptCount = 0;\n",
  );
  const fetchAnchor = '        const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {';
  if (!groq.includes(fetchAnchor)) throw new Error("Groq fetch anchor missing");
  groq = groq.replace(fetchAnchor, '        telemetryAttemptCount += 1;\n        const telemetryStartedAt = Date.now();\n' + fetchAnchor);
  const parseAnchor = '        const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };';
  if (!groq.includes(parseAnchor)) throw new Error("Groq response parse anchor missing");
  groq = groq.replace(parseAnchor, `        const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } } };\n        recordAgenticLlmAttempt({ provider: "groq", model, promptChars: prompt.length, status: resp.status, success: true, promptTokens: data.usage?.prompt_tokens, completionTokens: data.usage?.completion_tokens, totalTokens: data.usage?.total_tokens, cachedPromptTokens: data.usage?.prompt_tokens_details?.cached_tokens, latencyMs: Date.now() - telemetryStartedAt, retryIndex: telemetryAttemptCount });`);
  const rejection = groq.match(/if \(!resp\.ok\) \{[\s\S]*?\n\s*continue;\n\s*\}/);
  if (!rejection) throw new Error("Groq rejection block missing");
  const rejectedBlock = rejection[0];
  groq = groq.replace(rejectedBlock, rejectedBlock.replace(/\n(\s*)continue;/, '\n$1recordAgenticLlmAttempt({ provider: "groq", model, promptChars: prompt.length, status: resp.status, success: false, latencyMs: Date.now() - telemetryStartedAt, retryIndex: telemetryAttemptCount, reason: "provider_rejected" });\n$1continue;'));
}
s = s.slice(0, groqStart) + groq + s.slice(groqEnd);

const mistralStart = s.indexOf("async function callMistralJson");
const mistralEnd = s.indexOf("/**\n * INVESTIGATOR_POOL_RETRY", mistralStart);
if (mistralStart < 0 || mistralEnd < 0) throw new Error("Mistral end anchor missing");
let mistral = s.slice(mistralStart, mistralEnd);
if (!mistral.includes("recordAgenticLlmAttempt({")) {
  mistral = mistral.replace(
    "  if (!key) return null;\n",
    "  if (!key) return null;\n  let telemetryAttemptCount = 0;\n",
  );
  const fetchAnchor = '      const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {';
  if (!mistral.includes(fetchAnchor)) throw new Error("Mistral fetch anchor missing");
  mistral = mistral.replace(fetchAnchor, '      telemetryAttemptCount += 1;\n      const telemetryStartedAt = Date.now();\n' + fetchAnchor);
  const parseAnchor = '      const data = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };';
  if (!mistral.includes(parseAnchor)) throw new Error("Mistral response parse anchor missing");
  mistral = mistral.replace(parseAnchor, `      const data = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } } };\n      recordAgenticLlmAttempt({ provider: "mistral", model, promptChars: prompt.length, status: resp.status, success: true, promptTokens: data.usage?.prompt_tokens, completionTokens: data.usage?.completion_tokens, totalTokens: data.usage?.total_tokens, cachedPromptTokens: data.usage?.prompt_tokens_details?.cached_tokens, latencyMs: Date.now() - telemetryStartedAt, retryIndex: telemetryAttemptCount });`);
  const rejection = mistral.match(/if \(!resp\.ok\) \{[\s\S]*?\n\s*continue;\n\s*\}/);
  if (!rejection) throw new Error("Mistral rejection block missing");
  const rejectedBlock = rejection[0];
  mistral = mistral.replace(rejectedBlock, rejectedBlock.replace(/\n(\s*)continue;/, '\n$1recordAgenticLlmAttempt({ provider: "mistral", model, promptChars: prompt.length, status: resp.status, success: false, latencyMs: Date.now() - telemetryStartedAt, retryIndex: telemetryAttemptCount, reason: "provider_rejected" });\n$1continue;'));
}
s = s.slice(0, mistralStart) + mistral + s.slice(mistralEnd);

fs.writeFileSync(target, s);
console.log("Applied Investigator LLM usage telemetry: tokens, cached input tokens, latency, attempts, failures; no prompt/content/secrets stored; idempotent");
