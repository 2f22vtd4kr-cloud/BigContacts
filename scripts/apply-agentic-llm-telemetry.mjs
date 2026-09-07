import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
let s = fs.readFileSync(target, "utf8");

const telemetryImport = 'import { recordAgenticLlmAttempt } from "./agentic-llm-telemetry";';
if (!s.includes(telemetryImport)) {
  const anchor = 'import { withProviderScope } from "./provider-gate";';
  if (!s.includes(anchor)) throw new Error("telemetry import anchor missing");
  s = s.replace(anchor, anchor + "\n" + telemetryImport);
}

function ensureAttemptInstrumentation(block, loopAnchor, provider) {
  if (!block.includes(loopAnchor)) throw new Error(`${provider} model loop anchor missing`);
  const keyAnchor = provider === "Groq" ? "  if (!keys.length) return null;\n" : "  if (!key) return null;\n";
  if (!block.includes("let telemetryAttemptCount = 0;")) {
    if (!block.includes(keyAnchor)) throw new Error(`${provider} telemetry initialization anchor missing`);
    block = block.replace(keyAnchor, keyAnchor + "  let telemetryAttemptCount = 0;\n");
  }
  if (!block.includes("const telemetryStartedAt = Date.now();")) {
    const tryAnchor = provider === "Groq" ? "      try {" : "    try {";
    if (!block.includes(tryAnchor)) throw new Error(`${provider} telemetry try anchor missing`);
    block = block.replace(tryAnchor, provider === "Groq"
      ? "      telemetryAttemptCount += 1;\n      const telemetryStartedAt = Date.now();\n      try {"
      : "    telemetryAttemptCount += 1;\n    const telemetryStartedAt = Date.now();\n    try {");
  }
  return block;
}

const groqStart = s.indexOf("async function callGroqJson");
const groqEnd = s.indexOf("async function callMistralJson", groqStart);
if (groqStart < 0 || groqEnd < 0) throw new Error("Groq/Mistral anchors missing");
let groq = s.slice(groqStart, groqEnd);
groq = ensureAttemptInstrumentation(groq, "    for (const model of GROQ_CHAT_MODELS) {", "Groq");

if (!groq.includes("recordAgenticLlmAttempt({")) {
  const rawAnchor = '        const raw = data.choices?.[0]?.message?.content?.trim() ?? "";';
  if (!groq.includes(rawAnchor)) throw new Error("Groq raw-response anchor missing");
  groq = groq.replace(rawAnchor, rawAnchor + '\n        recordAgenticLlmAttempt({ provider: "groq", model, promptChars: prompt.length, status: resp.status, success: Boolean(raw), promptTokens: data.usage?.prompt_tokens, completionTokens: data.usage?.completion_tokens, totalTokens: data.usage?.total_tokens, cachedPromptTokens: data.usage?.prompt_tokens_details?.cached_tokens, latencyMs: Date.now() - telemetryStartedAt, retryIndex: telemetryAttemptCount, reason: raw ? undefined : "empty_response" });');
}

if (!groq.includes("reason: \"provider_rejected\"")) {
  const anchor = '          continue;\n        }';
  if (!groq.includes(anchor)) throw new Error("Groq provider rejection anchor missing");
  groq = groq.replace(anchor, '          recordAgenticLlmAttempt({ provider: "groq", model, promptChars: prompt.length, status: resp.status, success: false, latencyMs: Date.now() - telemetryStartedAt, retryIndex: telemetryAttemptCount, reason: "provider_rejected" });\n' + anchor);
}

if (!groq.includes('reason: resp.status === 429 ? "rate_limited"')) {
  const anchor = '            if (resp.status === 429) return null;';
  if (!groq.includes(anchor)) throw new Error("Groq terminal provider anchor missing");
  groq = groq.replace(anchor, '            recordAgenticLlmAttempt({ provider: "groq", model, promptChars: prompt.length, status: resp.status, success: false, latencyMs: Date.now() - telemetryStartedAt, retryIndex: telemetryAttemptCount, reason: resp.status === 429 ? "rate_limited" : "provider_auth" });\n' + anchor);
}

if (!groq.includes("reason: err?.message ?? \"exception\"")) {
  const catchAnchor = '} catch (err: any) { logger.warn({ provider: "agentic", model, error: err?.message }, "agentic provider call failed"); continue; }';
  if (!groq.includes(catchAnchor)) throw new Error("Groq catch anchor missing");
  groq = groq.replace(catchAnchor, '} catch (err: any) { recordAgenticLlmAttempt({ provider: "groq", model, promptChars: prompt.length, status: err?.name === "TimeoutError" ? "timeout" : "error", success: false, latencyMs: Date.now() - telemetryStartedAt, retryIndex: telemetryAttemptCount, reason: err?.message ?? "exception" }); logger.warn({ provider: "agentic", model, error: err?.message }, "agentic provider call failed"); continue; }');
}

s = s.slice(0, groqStart) + groq + s.slice(groqEnd);

const mistralStart = s.indexOf("async function callMistralJson");
const mistralEnd = s.indexOf("/**\n * INVESTIGATOR_POOL_RETRY", mistralStart);
if (mistralStart < 0 || mistralEnd < 0) throw new Error("Mistral end anchor missing");
let mistral = s.slice(mistralStart, mistralEnd);
mistral = ensureAttemptInstrumentation(mistral, "  for (const model of models) {", "Mistral");

if (!mistral.includes("recordAgenticLlmAttempt({")) {
  const rawAnchor = '      const raw = data.choices?.[0]?.message?.content?.trim() ?? "";';
  if (!mistral.includes(rawAnchor)) throw new Error("Mistral raw-response anchor missing");
  mistral = mistral.replace(rawAnchor, rawAnchor + '\n      recordAgenticLlmAttempt({ provider: "mistral", model, promptChars: prompt.length, status: resp.status, success: Boolean(raw), promptTokens: data.usage?.prompt_tokens, completionTokens: data.usage?.completion_tokens, totalTokens: data.usage?.total_tokens, cachedPromptTokens: data.usage?.prompt_tokens_details?.cached_tokens, latencyMs: Date.now() - telemetryStartedAt, retryIndex: telemetryAttemptCount, reason: raw ? undefined : "empty_response" });');
}

if (!mistral.includes("reason: \"provider_rejected\"")) {
  const anchor = '        continue;\n      }';
  if (!mistral.includes(anchor)) throw new Error("Mistral provider rejection anchor missing");
  mistral = mistral.replace(anchor, '        recordAgenticLlmAttempt({ provider: "mistral", model, promptChars: prompt.length, status: resp.status, success: false, latencyMs: Date.now() - telemetryStartedAt, retryIndex: telemetryAttemptCount, reason: "provider_rejected" });\n' + anchor);
}

if (!mistral.includes('reason: resp.status === 429 ? "rate_limited"')) {
  const anchor = '          if (resp.status === 429) return null;';
  if (!mistral.includes(anchor)) throw new Error("Mistral terminal provider anchor missing");
  mistral = mistral.replace(anchor, '          recordAgenticLlmAttempt({ provider: "mistral", model, promptChars: prompt.length, status: resp.status, success: false, latencyMs: Date.now() - telemetryStartedAt, retryIndex: telemetryAttemptCount, reason: resp.status === 429 ? "rate_limited" : "provider_auth" });\n' + anchor);
}

if (!mistral.includes("reason: err?.message ?? \"exception\"")) {
  const catchAnchor = '} catch (err: any) { logger.warn({ provider: "agentic", model, error: err?.message }, "agentic provider call failed"); continue; }';
  if (!mistral.includes(catchAnchor)) throw new Error("Mistral catch anchor missing");
  mistral = mistral.replace(catchAnchor, '} catch (err: any) { recordAgenticLlmAttempt({ provider: "mistral", model, promptChars: prompt.length, status: err?.name === "TimeoutError" ? "timeout" : "error", success: false, latencyMs: Date.now() - telemetryStartedAt, retryIndex: telemetryAttemptCount, reason: err?.message ?? "exception" }); logger.warn({ provider: "agentic", model, error: err?.message }, "agentic provider call failed"); continue; }');
}

s = s.slice(0, mistralStart) + mistral + s.slice(mistralEnd);

fs.writeFileSync(target, s);
console.log("Applied Investigator LLM usage telemetry: one event per physical attempt, including terminal provider failures; tokens, cached input tokens, latency; no prompt/content/secrets stored; idempotent");
