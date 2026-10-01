#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(repoRoot, "artifacts/api-server/src/src/lib/gemini-right-hand-reasoning.ts"), "utf8");
const pool = fs.readFileSync(path.join(repoRoot, "artifacts/api-server/src/src/lib/gemini-model-pool.ts"), "utf8");

const checks = [
  ["Right-hand primary uses the high-volume Gemini 3.5 Flash-Lite model", source.includes('GEMINI_RIGHT_HAND_MODEL = "gemini-3.5-flash-lite"')],
  ["Right-hand has the full stable Gemini text fallback pool", source.includes('"gemini-3.1-flash-lite"') && source.includes('"gemini-3.8-flash"') && source.includes("chooseAvailableGeminiControlModels")],
  ["Live/audio/preview models are excluded from the text control registry", !pool.includes('"gemini-3.8-live"') && !pool.includes("-preview") && !pool.includes("-image") && !pool.includes("-tts")],
  ["Right-hand uses the shared model-specific thinking contract", source.includes("getGeminiThinkingLevel(model)")],
  ["Daily quota exhaustion fails closed without another provider request", source.includes("markGeminiModelDailyQuotaExhausted") && source.includes("phase: \"daily_quota_exhausted\"") && source.includes("daily quota exhaustion") && !source.includes("phase: \"daily_quota_model_cooldown\"")],
  ["Transient 429 recovery is bounded and then advances the model pool", source.includes("MAX_RATE_LIMIT_RETRIES = 1") && source.includes('phase: "rate_limit_model_fallback"') && source.includes("markGeminiModelRateLimited")],
  ["Successful 429 retry responses are returned immediately", source.includes("if (response.ok) return parseGeminiRightHandResponse(responseBody, model);")],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
