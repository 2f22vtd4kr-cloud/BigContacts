#!/usr/bin/env node
/**
 * Canonical Apex Atlas provider-role migration.
 *
 * Purpose: replace the obsolete NVIDIA/z-AI right-hand implementation with
 * DeepSeek-V4-Flash-0731 served through NVIDIA Integrate, without touching the
 * independent Groq -> Mistral Dig investigator lane.
 *
 * This script is intentionally fail-closed: it checks expected anchors before
 * writing, skips archives/conversation snapshots, never reads or prints secret
 * values, and is safe to run repeatedly.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skip = new Set([".git", ".conversation", "node_modules", "dist", "docs/archive"]);
const textExt = new Set([".ts", ".tsx", ".js", ".mjs", ".md", ".json"]);

function shouldSkip(rel) {
  const p = rel.replaceAll("\\", "/");
  return [...skip].some((x) => p === x || p.startsWith(`${x}/`));
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(root, abs).replaceAll("\\", "/");
    if (shouldSkip(rel)) continue;
    if (entry.isDirectory()) walk(abs, out);
    else if (textExt.has(path.extname(entry.name))) out.push(rel);
  }
  return out;
}

const files = walk(root);
const rightHandFile = "artifacts/api-server/src/src/lib/nvidia-nim-case-reasoning.ts";
if (!files.includes(rightHandFile)) throw new Error(`missing expected right-hand file: ${rightHandFile}`);

let changed = 0;
const touched = [];

function rewrite(rel, transform, required = []) {
  const abs = path.join(root, rel);
  let s = fs.readFileSync(abs, "utf8");
  for (const anchor of required) {
    if (!s.includes(anchor)) throw new Error(`${rel}: expected anchor missing: ${anchor}`);
  }
  const next = transform(s);
  if (next !== s) {
    fs.writeFileSync(abs, next);
    changed += 1;
    touched.push(rel);
  }
}

// 1. The existing implementation file is retained to minimize import churn,
// but its public symbols, credential, model, and role become DeepSeek-canonical.
rewrite(rightHandFile, (s) => s
  .replaceAll("NvidiaNim", "DeepSeek")
  .replaceAll("NVIDIA_NIM", "DEEPSEEK")
  .replaceAll("NVIDIA_API_KEY", "DEEPSEEK_API_KEY")
  .replaceAll("NVIDIA_KEY", "DEEPSEEK_API_KEY")
  .replace(/\(process\.env\.DEEPSEEK_MODEL \|\| process\.env\.DEEPSEEK_AGENTIC_MODEL \|\| \"[^\"]+\"\)\.trim\(\)/,
    '(process.env.DEEPSEEK_MODEL || "deepseek-ai/deepseek-v4-flash-0731").trim()')
  .replaceAll("nvidia/nemotron-3-nano-30b-a3b", "deepseek-ai/deepseek-v4-flash-0731")
  .replaceAll("NVIDIA NIM", "DeepSeek via NVIDIA Integrate")
  .replaceAll("nvidia-nim", "deepseek-right-hand")
  .replaceAll("NIM", "DeepSeek"),
  ["NVIDIA_NIM_CASE_REASONING_MODEL", "getNvidiaNimKey", "runNvidiaNimCaseReasoning"]);

// 2. Update all active source/docs references to the renamed right-hand API.
for (const rel of files) {
  if (rel === rightHandFile) continue;
  const abs = path.join(root, rel);
  const original = fs.readFileSync(abs, "utf8");
  if (!/(NvidiaNim|NVIDIA_NIM|z-AI|z.ai|GLM|nvidia-right-hand)/.test(original)) continue;

  let next = original
    .replaceAll("runNvidiaNimDiscoveryAdvice", "runDeepSeekDiscoveryAdvice")
    .replaceAll("runNvidiaNimCaseReasoning", "runDeepSeekCaseReasoning")
    .replaceAll("runNvidiaNimFreeJson", "runDeepSeekFreeJson")
    .replaceAll("runNvidiaNimFinalReview", "runDeepSeekFinalReview")
    .replaceAll("getNvidiaNimCaseReasoningStatus", "getDeepSeekCaseReasoningStatus")
    .replaceAll("NvidiaNimCaseReasoningStatus", "DeepSeekCaseReasoningStatus")
    .replaceAll("NvidiaNimCaseReasoningResult", "DeepSeekCaseReasoningResult")
    .replaceAll("NvidiaNimDiscoveryAdviceResult", "DeepSeekDiscoveryAdviceResult")
    .replaceAll("NVIDIA_NIM_CASE_REASONING_MODEL", "DEEPSEEK_RIGHT_HAND_MODEL")
    .replaceAll("NVIDIA_NIM_API_KEY", "DEEPSEEK_API_KEY")
    .replaceAll("NVIDIA_API_KEY", "DEEPSEEK_API_KEY")
    .replaceAll("NVIDIA_KEY", "DEEPSEEK_API_KEY")
    .replaceAll("nvidia-right-hand", "deepseek-right-hand")
    .replaceAll("nvidia-nim", "deepseek")
    .replaceAll("z-AI / GLM", "DeepSeek-V4-Flash-0731")
    .replaceAll("z-AI/GLM", "DeepSeek-V4-Flash-0731")
    .replaceAll("z-AI", "DeepSeek")
    .replaceAll("z.ai", "DeepSeek")
    .replaceAll("GLM", "DeepSeek-V4-Flash-0731")
    .replaceAll("NVIDIA NIM", "DeepSeek via NVIDIA Integrate");

  // Do not alter the independent Dig failover chain. DeepSeek is right-hand only.
  if (/DIG_INVESTIGATOR_FAILOVER_CHAIN/.test(next)) {
    next = next
      .replaceAll("Groq -> Mistral -> DeepSeek", "Groq -> Mistral")
      .replaceAll("Groq / Mistral / Gemini / NVIDIA failover", "Groq / Mistral failover");
  }

  if (next !== original) {
    fs.writeFileSync(abs, next);
    changed += 1;
    touched.push(rel);
  }
}

// 3. The role contract is explicit and must not drift back to NVIDIA generic.
const roleFiles = [
  "artifacts/api-server/src/src/lib/case-bureau.ts",
  "artifacts/api-server/src/src/lib/case-bureau-prompt.ts",
];
for (const rel of roleFiles) {
  const abs = path.join(root, rel);
  let s = fs.readFileSync(abs, "utf8");
  s = s
    .replaceAll('provider: "nvidia-nim"', 'provider: "deepseek"')
    .replaceAll('lane: "nvidia-right-hand"', 'lane: "deepseek-right-hand"')
    .replaceAll('provider: "nvidia-nim"', 'provider: "deepseek"')
    .replaceAll("RIGHT-HAND ADVICE (DeepSeek", "RIGHT-HAND ADVICE (DeepSeek")
    .replaceAll("NVIDIA NIM — advisory only", "NVIDIA Integrate — DeepSeek advisory only")
    .replaceAll("NVIDIA NIM", "NVIDIA Integrate — DeepSeek")
    .replaceAll("z-AI / GLM", "DeepSeek-V4-Flash-0731")
    .replaceAll("z-AI/GLM", "DeepSeek-V4-Flash-0731")
    .replaceAll("z-AI", "DeepSeek")
    .replaceAll("GLM", "DeepSeek-V4-Flash-0731");
  if (nextHasDifference(s, abs)) {
    fs.writeFileSync(abs, s);
    changed += 1;
    touched.push(rel);
  }
}

function nextHasDifference(next, abs) {
  return next !== fs.readFileSync(abs, "utf8");
}

// 4. Make the new environment contract obvious in package-level docs.
for (const rel of ["README.md", "docs/PRE_REPLIT_GO.md", "docs/REPLIT_NEW_ACCOUNT_SETUP.md", "docs/REPLIT_UPDATE_PROMPT_LATEST.md", "docs/REPLIT_DEPLOY.md", "docs/RUN_BUREAU.md", "docs/bureau-plan/19_SECRETS_AND_ENV.md"]) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  const original = fs.readFileSync(abs, "utf8");
  const next = original
    .replaceAll("NVIDIA_NIM_API_KEY", "DEEPSEEK_API_KEY")
    .replaceAll("NVIDIA_API_KEY", "DEEPSEEK_API_KEY")
    .replaceAll("z-AI / GLM", "DeepSeek-V4-Flash-0731")
    .replaceAll("z-AI/GLM", "DeepSeek-V4-Flash-0731")
    .replaceAll("z-AI", "DeepSeek")
    .replaceAll("z.ai", "DeepSeek")
    .replaceAll("GLM", "DeepSeek-V4-Flash-0731")
    .replaceAll("NVIDIA NIM", "DeepSeek via NVIDIA Integrate");
  if (next !== original) {
    fs.writeFileSync(abs, next);
    changed += 1;
    touched.push(rel);
  }
}

// 5. Verify no active (non-archive/non-conversation) file still declares the
// obsolete right-hand key/role. Historical archive snapshots are intentionally
// left untouched.
const remaining = [];
for (const rel of walk(root)) {
  const s = fs.readFileSync(path.join(root, rel), "utf8");
  if (/NVIDIA_NIM_API_KEY|NVIDIA NIM.*right.?hand|z-AI.*right.?hand|z-AI \/ GLM/.test(s)) remaining.push(rel);
}
if (remaining.length) {
  throw new Error(`obsolete active right-hand references remain:\n${remaining.join("\n")}`);
}

// 6. Confirm the Dig hardening still names only Groq -> Mistral.
const hardening = fs.readFileSync(path.join(root, "scripts/apply-agentic-concurrency-hardening.mjs"), "utf8");
if (!hardening.includes("DIG_INVESTIGATOR_FAILOVER_CHAIN") || !hardening.includes("Groq -> Mistral")) {
  throw new Error("Dig investigator failover contract was not preserved as Groq -> Mistral");
}

console.log(`DeepSeek right-hand migration complete: ${changed} files changed.`);
console.log("Canonical right-hand: DEEPSEEK_API_KEY -> NVIDIA Integrate -> deepseek-ai/deepseek-v4-flash-0731");
console.log("Canonical Dig investigator: Groq -> Mistral (unchanged)");
console.log("No secret values were read for output or modified by this script.");
if (touched.length) console.log(`Touched: ${[...new Set(touched)].join(", ")}`);
try {
  console.log(`Git status:\n${execFileSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" }).trim()}`);
} catch {}
