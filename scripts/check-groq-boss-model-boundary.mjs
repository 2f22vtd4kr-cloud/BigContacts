#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const boss = fs.readFileSync(path.join(repoRoot, "artifacts/api-server/src/src/lib/groq-boss.ts"), "utf8");
const bureau = fs.readFileSync(path.join(repoRoot, "artifacts/api-server/src/src/lib/case-bureau.ts"), "utf8");
const status = fs.readFileSync(path.join(repoRoot, "artifacts/api-server/src/src/routes/system-status.ts"), "utf8");

const checks = [
  ["Boss adapter uses Groq GPT-OSS 120B as primary", boss.includes('GROQ_BOSS_MODEL = "openai/gpt-oss-120b"')],
  ["Boss has GPT-OSS 20B bounded fallback", boss.includes('"openai/gpt-oss-20b"') && boss.includes("MAX_MODEL_ATTEMPTS = 2")],
  ["Boss uses the Groq OpenAI-compatible chat endpoint", boss.includes("https://api.groq.com/openai/v1/chat/completions") && boss.includes("Authorization:")],
  ["Boss uses GPT-OSS reasoning levels and hides reasoning output", boss.includes("reasoning_effort") && boss.includes("include_reasoning: false")],
  ["Boss uses strict JSON Schema when a control schema is supplied", boss.includes('type: "json_schema"') && boss.includes("strict: true") && bureau.includes("additionalProperties: false")],
  ["Boss prompt is bounded for the free-tier token budget", boss.includes("MAX_PROMPT_CHARS = 20_000") && boss.includes("APEX CONTROL-CONTEXT TRUNCATED")],
  ["Boss has bounded 503 recovery and bounded short 429 recovery", boss.includes("MAX_503_RETRIES_PER_MODEL = 1") && boss.includes("MAX_429_RETRIES_PER_MODEL = 1") && boss.includes("delay <= 2_500")],
  ["Canonical Bureau Boss call surface delegates to Groq", bureau.includes("return generateGroqBossText(selection, prompt, options)") && bureau.includes("return resolveGroqBossModel(preferredKeyName)")],
  ["Ordinary system status is Groq-local and does not perform provider readiness I/O", status.includes("const groqBoss=getGroqBossStatus()") && status.includes('router.post("/system/diagnostics/groq-readiness"') && !status.includes("await getGroqBossStatus()")],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);