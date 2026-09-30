#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(repoRoot, "artifacts/api-server/src/src/lib/case-bureau.ts"), "utf8");
const pool = fs.readFileSync(path.join(repoRoot, "artifacts/api-server/src/src/lib/gemini-model-pool.ts"), "utf8");

const checks = [
  ["Boss uses the shared stable Gemini text model pool", source.includes('chooseGeminiControlModels("boss"') && source.includes("chooseAvailableGeminiControlModels")],
  ["Boss prefers Gemini 3.8 Flash but has multiple stable fallbacks", pool.includes('"gemini-3.8-flash"') && pool.includes('"gemini-3.7-flash"') && pool.includes('"gemini-3.5-flash-lite"')],
  ["Live/audio/preview models are excluded from the text control registry", !pool.includes('"gemini-3.8-live"') && !pool.includes("-preview") && !pool.includes("-image") && !pool.includes("-tts")],
  ["Boss uses the shared model-specific thinking contract", source.includes("getGeminiThinkingLevel(model)")],
  ["Daily quota exhaustion rotates to another eligible model", source.includes("markGeminiModelDailyQuotaExhausted") && source.includes("phase: \"daily_quota_model_cooldown\"") && source.includes("continue;")],
  ["Persistent burst 429 advances to the next same-role model", source.includes('phase: "rate_limit_model_fallback"') && source.includes("advancing to the next bounded same-role Gemini text model")],
  ["Boss remains text-only and never substitutes an Investigator provider", source.includes("Gemini is a text-only Boss")],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
