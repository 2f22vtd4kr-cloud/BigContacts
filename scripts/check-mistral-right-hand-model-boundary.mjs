#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(repoRoot, "artifacts/api-server/src/src/lib/mistral-right-hand-reasoning.ts"), "utf8");

const checks = [
  ["Right-hand primary uses Mistral Small 4", source.includes('MISTRAL_RIGHT_HAND_MODEL = "mistral-small-2603"')],
  ["Right-hand uses a role-scoped credential namespace", source.includes('const MISTRAL_KEY_ENV = "MISTRAL_RIGHT_HAND_API_KEY"') && source.includes("MISTRAL_RIGHT_HAND_API_KEY_${i + 2}") && !source.includes('"MISTRAL_API_KEY"')],
  ["Right-hand uses the Mistral Chat Completions boundary", source.includes("https://api.mistral.ai/v1/chat/completions") && source.includes("Authorization")],
  ["Right-hand uses a live Mistral model catalog", source.includes("https://api.mistral.ai/v1/models") && source.includes("catalogCandidates")],
  ["Right-hand is explicitly provider-scoped to Mistral", source.includes('provider:"mistral"') || source.includes('provider: "mistral"')],
  ["Right-hand never acts as Investigator", source.includes("Never browse or act as Investigator")],
  ["Provider retries are bounded", source.includes("MAX_503_RETRIES_PER_MODEL = 1") && source.includes("MAX_429_RETRIES_PER_MODEL = 1")],
  ["Oversized model-facing context fails closed", source.includes("upstream case-context compaction is required") && source.includes("MAX_PROMPT_CHARS = 20_000")],
  ["Explicit readiness is separate from ordinary status", source.includes("runMistralRightHandReadiness")],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
