#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/case-bureau.ts", "utf8");

const checks = [
  ["Boss primary remains Gemini 3.1 Flash-Lite", source.includes('GEMINI_BOSS_PREFERRED_MODEL = "gemini-3.1-flash-lite"')],
  ["Gemini 3.8 Flash is an explicit Boss fallback", source.includes('GEMINI_BOSS_FALLBACK_MODELS: readonly string[] = ["gemini-3.8-flash"]')],
  ["Boss admits stable Flash and Flash-Lite candidates", source.includes('/^gemini-\\d+(?:\\.\\d+)?-flash(?:-lite)?$/i.test(name)')],
  ["Live/audio models are excluded from Boss candidates", source.includes("! /image|audio|embedding|tts|live|transcribe|deep-research|robotics|aqa|latest|preview|experimental/i.test(name)") || source.includes("! /image|audio|embedding|tts|live|transcribe|deep-research|robotics|aqa|latest|preview|experimental/i.test(name)")],
  ["daily quota exhaustion does not model-hop", source.includes('providerErrorCodeValue === "quota_exceeded"') && source.includes("no equivalent-model fallback will repair the project quota")],
  ["persistent burst 429 can advance to the next same-role model", source.includes('phase: "rate_limit_model_fallback"') && source.includes("advancing to the next bounded same-role Gemini text model")],
  ["Boss remains text-only", source.includes("Gemini is a text-only Boss")],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
