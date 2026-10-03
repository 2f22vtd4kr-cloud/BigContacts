#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/groq-right-hand-reasoning.ts"), "utf8");
const checks = [
  ["primary Groq GPT-OSS 120B", source.includes('GROQ_RIGHT_HAND_MODEL = "openai/gpt-oss-120b"')],
  ["fallback Groq GPT-OSS 20B", source.includes('"openai/gpt-oss-20b"')],
  ["role-scoped Right-hand key", source.includes("GROQ_RIGHT_HAND_API_KEY")],
  ["Groq chat endpoint", source.includes("https://api.groq.com/openai/v1/chat/completions")],
  ["Groq model catalog", source.includes("https://api.groq.com/openai/v1/models")],
  ["provider identity Groq", source.includes('provider: "groq"')],
  ["bounded 429/503 retries", source.includes("MAX_429_RETRIES_PER_MODEL = 1") && source.includes("MAX_503_RETRIES_PER_MODEL = 1")],
  ["structured thrown diagnostics", source.includes("JSON.stringify(describeThrownProviderError(error))")],
  ["20K prompt bound", source.includes("20_000") && source.includes("upstream case-context compaction is required")],
  ["explicit readiness", source.includes("runGroqRightHandReadiness")],
];
let failed=false;
for(const [name,ok] of checks){console.log((ok?"PASS ":"FAIL ")+name);if(!ok)failed=true;}
if(failed)process.exit(1);
