#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(repoRoot, "artifacts/api-server/src/src/lib/gemini-right-hand-reasoning.ts"), "utf8");

const checks = [
  ["Gemini 3.8 Flash is an explicit same-role fallback", source.includes('["gemini-3.8-flash"]')],
  ["Right-hand primary remains Gemini 3.1 Flash-Lite", source.includes('GEMINI_RIGHT_HAND_MODEL = "gemini-3.1-flash-lite"')],
  ["Live models are excluded from catalog candidates", source.includes("! /image|audio|embedding|tts|live|transcribe|deep-research|robotics|aqa|preview|experimental/i.test(name)") || source.includes("!/image|audio|embedding|tts|live|transcribe|deep-research|robotics|aqa|preview|experimental/i.test(name)")],
  ["standard Flash and Flash-Lite candidates are restricted to stable model IDs", source.includes('/^gemini-\\d+(?:\\.\\d+)?-flash(?:-lite)?$/i.test(name)')],
  ["daily quota exhaustion does not model-hop", source.includes('providerErrorCodeValue === "quota_exceeded"')],
  ["429 recovery happens only after the bounded same-model retry", source.includes("rate_limit_retry_resolved") && source.includes("continue;")],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
