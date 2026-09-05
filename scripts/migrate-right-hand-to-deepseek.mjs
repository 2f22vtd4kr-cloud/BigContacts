#!/usr/bin/env node
/**
 * Canonical Apex Atlas right-hand provider migration.
 *
 * DeepSeek-V4-Flash-0731 is the right-hand advisor, served through NVIDIA
 * Integrate. The Dig investigator remains Groq -> Mistral.
 *
 * Fail-closed and idempotent: historical .conversation and docs/archive content
 * is intentionally untouched; active source and canonical docs are migrated.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skip = [".git", ".conversation", "node_modules", "dist", "docs/archive"];
const textExt = new Set([".ts", ".tsx", ".js", ".mjs", ".md", ".json"]);
const RIGHT_HAND_FILE = "artifacts/api-server/src/src/lib/nvidia-nim-case-reasoning.ts";
const DEEPSEEK_MODEL = "deepseek-ai/deepseek-v4-flash-0731";
const DEEPSEEK_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";

function isSkipped(rel) {
  const p = rel.replaceAll("\\", "/");
  return skip.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(root, abs).replaceAll("\\", "/");
    if (isSkipped(rel)) continue;
    if (entry.isDirectory()) walk(abs, out);
    else if (textExt.has(path.extname(entry.name))) out.push(rel);
  }
  return out;
}

const files = walk(root);
if (!files.includes(RIGHT_HAND_FILE)) throw new Error(`missing expected right-hand file: ${RIGHT_HAND_FILE}`);

let changed = 0;
const touched = [];

function writeIfChanged(rel, next) {
  const abs = path.join(root, rel);
  const current = fs.readFileSync(abs, "utf8");
  if (next !== current) {
    fs.writeFileSync(abs, next);
    changed += 1;
    touched.push(rel);
  }
}

// Provider implementation: rename the public API, switch credential/model, and
// explicitly enable DeepSeek thinking at high reasoning effort. Keep bounded
// JSON outputs but never let a tiny token budget starve the reasoning model.
{
  const abs = path.join(root, RIGHT_HAND_FILE);
  let s = fs.readFileSync(abs, "utf8");
  for (const anchor of ["NVIDIA_NIM_CASE_REASONING_MODEL", "getNvidiaNimKey", "runNvidiaNimCaseReasoning", "NVIDIA_NIM_CHAT_API"]) {
    if (!s.includes(anchor)) throw new Error(`${RIGHT_HAND_FILE}: expected anchor missing: ${anchor}`);
  }
  s = s
    .replaceAll("NvidiaNim", "DeepSeek")
    .replaceAll("NVIDIA_NIM", "DEEPSEEK")
    .replaceAll("NVIDIA_API_KEY", "DEEPSEEK_API_KEY")
    .replaceAll("NVIDIA_KEY", "DEEPSEEK_API_KEY")
    .replaceAll("nvidia/nemotron-3-nano-30b-a3b", DEEPSEEK_MODEL)
    .replaceAll("NVIDIA NIM", "DeepSeek via NVIDIA Integrate")
    .replaceAll("NVIDIA HTTP", "DeepSeek HTTP")
    .replaceAll("nvidia-nim", "deepseek-right-hand")
    .replaceAll("NIM", "DeepSeek");

  s = s.replace(
    /export const DEEPSEEK_CASE_REASONING_MODEL =\n\s*\(process\.env\.DEEPSEEK_MODEL \|\| process\.env\.DEEPSEEK_AGENTIC_MODEL \|\| "[^"]+"\)\.trim\(\);/,
    `export const DEEPSEEK_CASE_REASONING_MODEL =\n  (process.env.DEEPSEEK_MODEL || "${DEEPSEEK_MODEL}").trim();`,
  );

  // All DeepSeek requests must use the NVIDIA Integrate endpoint and high
  // reasoning. The provider supports reasoning_content/reasoning output.
  s = s.replaceAll(
    'const DEEPSEEK_CHAT_API = "https://integrate.api.nvidia.com/v1/chat/completions";',
    `const DEEPSEEK_CHAT_API = "${DEEPSEEK_ENDPOINT}";`,
  );
  s = s.replaceAll(
    '      body: JSON.stringify({\n        model: DEEPSEEK_CASE_REASONING_MODEL,',
    '      body: JSON.stringify({\n        model: DEEPSEEK_CASE_REASONING_MODEL,\n        temperature: 1,\n        top_p: 0.95,\n        max_tokens: 16384,\n        extra_body: { chat_template_kwargs: { thinking: true, reasoning_effort: "high" } },',
  );

  writeIfChanged(RIGHT_HAND_FILE, s);
}

// Active code references: migrate only explicit provider-role identifiers. Do
// not blanket-rewrite arbitrary "NVIDIA" mentions (e.g. unrelated docs).
const activeSourceFiles = files.filter((rel) => /^(artifacts|lib|scripts)\//.test(rel) && rel !== RIGHT_HAND_FILE);
for (const rel of activeSourceFiles) {
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
    .replaceAll("NVIDIA_NIM_CASE_REASONING_MODEL", "DEEPSEEK_CASE_REASONING_MODEL")
    .replaceAll("NVIDIA_NIM_API_KEY", "DEEPSEEK_API_KEY")
    .replaceAll("NVIDIA_API_KEY", "DEEPSEEK_API_KEY")
    .replaceAll("NVIDIA_KEY", "DEEPSEEK_API_KEY")
    .replaceAll("nvidia-right-hand", "deepseek-right-hand")
    .replaceAll("nvidia-nim", "deepseek")
    .replaceAll("provider: \"nvidia-nim\"", "provider: \"deepseek\"")
    .replaceAll("lane: \"nvidia-right-hand\"", "lane: \"deepseek-right-hand\"")
    .replaceAll("z-AI / GLM", "DeepSeek-V4-Flash-0731")
    .replaceAll("z-AI/GLM", "DeepSeek-V4-Flash-0731")
    .replaceAll("z-AI", "DeepSeek")
    .replaceAll("z.ai", "DeepSeek")
    .replaceAll("GLM", "DeepSeek-V4-Flash-0731")
    .replaceAll("NVIDIA NIM", "DeepSeek via NVIDIA Integrate");

  // Dig must never inherit DeepSeek from a generic replacement.
  if (/DIG_INVESTIGATOR_FAILOVER_CHAIN/.test(next)) {
    next = next
      .replaceAll("Groq -> Mistral -> DeepSeek", "Groq -> Mistral")
      .replaceAll("Groq / Mistral / Gemini / NVIDIA failover", "Groq / Mistral failover")
      .replaceAll("Groq / Mistral / DeepSeek failover", "Groq / Mistral failover");
  }
  writeIfChanged(rel, next);
}

// Canonical role documentation must agree with the runtime contract.
const roleDocs = [
  "docs/BUREAU_REACT_ARCHITECTURE.md",
  "docs/bureau-plan/01_PRODUCT_LAW_AND_CONTROL_PLANE.md",
  "docs/bureau-plan/02_FREE_REACT_AND_TOOL_SURFACE.md",
  "docs/bureau-plan/10_TOOL_CATALOG.md",
  "docs/bureau-plan/20_DIG_LOOP_STATE_MACHINE.md",
  "docs/bureau-plan/31_BOSS_RIGHT_HAND_PROTOCOL.md",
  "docs/bureau-plan/94_MODEL_ROUTING_TABLE.md",
  "docs/bureau-plan/227_BUREAU_CONTROL_FLOW.md",
];
for (const rel of roleDocs) {
  if (!fs.existsSync(path.join(root, rel))) throw new Error(`missing canonical role doc: ${rel}`);
  const original = fs.readFileSync(path.join(root, rel), "utf8");
  let next = original
    .replaceAll("NVIDIA_NIM_API_KEY", "DEEPSEEK_API_KEY")
    .replaceAll("NVIDIA_API_KEY", "DEEPSEEK_API_KEY")
    .replaceAll("NVIDIA NIM", "DeepSeek via NVIDIA Integrate")
    .replaceAll("NVIDIA NIM", "DeepSeek via NVIDIA Integrate")
    .replaceAll("NVIDIA narrator", "DeepSeek right-hand advisor")
    .replaceAll("NVIDIA adaptive fallback", "DeepSeek advisory lane")
    .replaceAll("Right-hand = **NVIDIA**", "Right-hand = **DeepSeek-V4-Flash-0731 via NVIDIA Integrate**")
    .replaceAll("Right-hand | **NVIDIA**", "Right-hand | **DeepSeek-V4-Flash-0731 via NVIDIA Integrate**")
    .replaceAll("right-hand = NVIDIA NIM", "right-hand = DeepSeek-V4-Flash-0731 via NVIDIA Integrate")
    .replaceAll("Right-hand = NVIDIA NIM", "Right-hand = DeepSeek-V4-Flash-0731 via NVIDIA Integrate")
    .replaceAll("Right-hand | NVIDIA NIM", "Right-hand | DeepSeek-V4-Flash-0731 via NVIDIA Integrate")
    .replaceAll("z-AI / GLM", "DeepSeek-V4-Flash-0731")
    .replaceAll("z-AI/GLM", "DeepSeek-V4-Flash-0731")
    .replaceAll("z-AI", "DeepSeek")
    .replaceAll("z.ai", "DeepSeek")
    .replaceAll("GLM", "DeepSeek-V4-Flash-0731");
  writeIfChanged(rel, next);
}

// Operator docs / preflight secret contract.
const operatorDocs = [
  "README.md",
  "docs/PRE_REPLIT_GO.md",
  "docs/REPLIT_NEW_ACCOUNT_SETUP.md",
  "docs/REPLIT_UPDATE_PROMPT_LATEST.md",
  "docs/REPLIT_DEPLOY.md",
  "docs/RUN_BUREAU.md",
  "docs/bureau-plan/19_SECRETS_AND_ENV.md",
];
for (const rel of operatorDocs) {
  if (!fs.existsSync(path.join(root, rel))) continue;
  const original = fs.readFileSync(path.join(root, rel), "utf8");
  const next = original
    .replaceAll("NVIDIA_NIM_API_KEY", "DEEPSEEK_API_KEY")
    .replaceAll("NVIDIA_API_KEY", "DEEPSEEK_API_KEY")
    .replaceAll("z-AI / GLM", "DeepSeek-V4-Flash-0731")
    .replaceAll("z-AI/GLM", "DeepSeek-V4-Flash-0731")
    .replaceAll("z-AI", "DeepSeek")
    .replaceAll("z.ai", "DeepSeek")
    .replaceAll("GLM", "DeepSeek-V4-Flash-0731")
    .replaceAll("NVIDIA NIM", "DeepSeek via NVIDIA Integrate");
  writeIfChanged(rel, next);
}

// Final active-tree invariants. Historical snapshots are intentionally exempt.
const stale = [];
for (const rel of walk(root)) {
  const s = fs.readFileSync(path.join(root, rel), "utf8");
  if (/NVIDIA_NIM_API_KEY|NVIDIA_NIM_MODEL|NVIDIA_AGENTIC_MODEL|nvidia\/nemotron-3-nano-30b-a3b/.test(s)) stale.push(rel);
}
if (stale.length) throw new Error(`obsolete DeepSeek right-hand references remain:\n${stale.join("\n")}`);

const hardening = fs.readFileSync(path.join(root, "scripts/apply-agentic-concurrency-hardening.mjs"), "utf8");
if (!hardening.includes("DIG_INVESTIGATOR_FAILOVER_CHAIN") || !hardening.includes("Groq -> Mistral")) {
  throw new Error("Dig investigator failover contract is not Groq -> Mistral");
}

const provider = fs.readFileSync(path.join(root, RIGHT_HAND_FILE), "utf8");
for (const required of ["DEEPSEEK_API_KEY", DEEPSEEK_MODEL, DEEPSEEK_ENDPOINT, "reasoning_effort: \"high\"", "thinking: true"]) {
  if (!provider.includes(required)) throw new Error(`DeepSeek provider missing required contract: ${required}`);
}

console.log(`DeepSeek right-hand migration complete: ${changed} files changed.`);
console.log(`Canonical right-hand: DEEPSEEK_API_KEY -> NVIDIA Integrate -> ${DEEPSEEK_MODEL}`);
console.log("Canonical Dig investigator: Groq -> Mistral (unchanged)");
console.log("No secret values were read, printed, or modified.");
if (touched.length) console.log(`Touched: ${[...new Set(touched)].join(", ")}`);
try {
  console.log(`Git status:\n${execFileSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" }).trim()}`);
} catch {}
