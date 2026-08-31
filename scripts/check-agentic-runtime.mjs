import fs from "node:fs";

const file = "artifacts/api-server/src/src/lib/agentic-web-research.ts";
const source = fs.readFileSync(file, "utf8");
const workflow = fs.readFileSync(".github/workflows/apex-live-audit.yml", "utf8");
const compatibilityHardener = fs.readFileSync("scripts/apply-agentic-runtime-hardening.mjs", "utf8");
const canonicalHardener = fs.readFileSync("scripts/apply-agentic-concurrency-hardening.mjs", "utf8");

const required = [
  ["Gemini provider implementation remains available for Boss", /GEMINI_API_KEY_/],
  ["Gemini 3.7 is an available current model", /gemini-3\.7-flash/],
  ["Gemini uses high thinking", /thinkingLevel.*high/],
  ["Gemini action schema is present", /const AGENTIC_ACTION_SCHEMA =/],
  ["Gemini action JSON is fail-closed parsed", /function parseAction/],
  ["Dig provider decision deadline is bounded", /providerDecisionTimeoutMs = 18_000/],
  ["Dig investigator failover starts with Groq", /DIG_INVESTIGATOR_FAILOVER_CHAIN[\s\S]*\["groq", callGroqJson\]/],
  ["Dig investigator failover uses Mistral second", /\["groq", callGroqJson\][\s\S]*\["mistral", callMistralJson\]/],
  ["provider decisions are bounded across concurrent targets", /MAX_CONCURRENT_AGENTIC_PROVIDER_DECISIONS/],
  ["provider failures do not use a global cross-target circuit", /activeAgenticProviderDecisions/],
  ["default iteration budget is expanded", /const MAX_ITER = 40;/],
];

for (const [label, pattern] of required) {
  if (!pattern.test(source)) throw new Error(`agentic runtime invariant failed: ${label}`);
}

const llmStepMatch = source.match(
  /async function llmStep\(prompt: string\): Promise<\{ model: string; raw: string \} \| null> \{([\s\S]*?)\n\}\n\nfunction formatFindingsBag/,
);
if (!llmStepMatch) throw new Error("agentic runtime invariant failed: llmStep implementation missing");
const llmStep = llmStepMatch[1];
if (!/\["groq", callGroqJson\]/.test(llmStep) || !/\["mistral", callMistralJson\]/.test(llmStep)) {
  throw new Error("agentic runtime invariant failed: Dig llmStep must expose Groq -> Mistral");
}
if (/callGeminiJson|callNvidiaJson|\["gemini"|\["nvidia"/.test(llmStep)) {
  throw new Error("agentic runtime invariant failed: Boss/right-hand provider leaked into Dig investigator lane");
}
if (!/DIG_INVESTIGATOR_FAILOVER_CHAIN:[^\n]*Groq -> Mistral/.test(source)) {
  throw new Error("agentic runtime invariant failed: missing explicit Dig provider-role marker");
}

if (source.includes("const maxIter = Math.min(input.maxIterations ?? MAX_ITER, 24)")) {
  throw new Error("agentic runtime invariant failed: hidden 24-iteration ceiling");
}
if (source.includes("agenticProviderCircuitUntil")) {
  throw new Error("agentic runtime invariant failed: module-global provider circuit can contaminate concurrent targets");
}

// The live audit must prove readiness of the actual web-research capability,
// not merely that the Boss or right-hand model can generate text. Keep these
// assertions semantic enough to survive harmless formatting changes in the
// workflow while still preventing role leakage.
if (!/const groqProbe\s*=\s*async \(\)\s*=>[\s\S]*?openaiProbe\(\s*['"]groq['"][\s\S]*?['"]dig['"]\)/.test(workflow)) {
  throw new Error("live audit provider gate missing Groq Dig probe");
}
if (!/const mistralProbe\s*=\s*async \(\)\s*=>[\s\S]*?openaiProbe\(\s*['"]mistral['"][\s\S]*?['"]dig['"]\)/.test(workflow)) {
  throw new Error("live audit provider gate missing Mistral Dig probe");
}
if (!/groqProbe[\s\S]*?if \(ok\)\s*digReady\s*=\s*true/.test(workflow)) {
  throw new Error("live audit Groq probe does not promote successful generation to Dig readiness");
}
if (!/mistralProbe[\s\S]*?if \(ok\)\s*digReady\s*=\s*true/.test(workflow)) {
  throw new Error("live audit Mistral probe does not promote successful generation to Dig readiness");
}
if (!/const ready\s*=\s*digReady;/.test(workflow) || !/if \(!digReady\)/.test(workflow)) {
  throw new Error("live audit must gate launch on an actual Dig provider generation");
}
if (/const ready = (?:false|bossReady \|\| rightHandReady)/.test(workflow)) {
  throw new Error("live audit incorrectly treats Boss/right-hand readiness as Dig readiness");
}
if (!/openaiProbe\(\s*['"]nvidia-nim['"][\s\S]*?['"]right_hand['"]\)/.test(workflow)) {
  throw new Error("live audit right-hand probe is not explicitly capability-scoped");
}

// Compatibility hardener is intentionally a thin delegating wrapper. Assert
// the actual executable relationship instead of matching prose, so this gate
// cannot pass merely because a comment says "delegate".
if (!/const canonical\s*=\s*path\.join\(here,\s*["']apply-agentic-concurrency-hardening\.mjs["']\)/.test(compatibilityHardener)) {
  throw new Error("compatibility hardener does not resolve the canonical hardener");
}
if (!/spawnSync\(process\.execPath,\s*\[canonical\]/.test(compatibilityHardener)) {
  throw new Error("compatibility hardener does not execute the canonical hardener");
}
if (/\[\s*\[?\s*["']gemini["']\s*,\s*callGeminiJson|["']nvidia["']\s*,\s*callNvidiaJson/.test(compatibilityHardener)) {
  throw new Error("compatibility hardener contains a forbidden Boss/right-hand Dig provider tuple");
}

// Deterministic page enrichment may recover literal contact tokens, but it
// must not be an identity authority. The canonical hardener replaces the
// legacy extractor with an observation-only implementation before build.
if (!/Observation-only contact enrichment/.test(canonicalHardener)) {
  throw new Error("observation identity boundary missing from canonical hardener");
}
if (!/const observationBoundaryRe\s*=/.test(canonicalHardener) || !/const observationReplacement\s*=/.test(canonicalHardener)) {
  throw new Error("canonical hardener does not define an explicit observation replacement");
}
if (!/return facts\.join/.test(canonicalHardener)) {
  throw new Error("canonical hardener observation replacement does not preserve literal contact facts");
}
if (/push\(`PERSON:/.test(canonicalHardener)) {
  throw new Error("canonical hardener still manufactures PERSON findings from page extraction");
}

const forbidden = [
  ["forced stagnation nudge", /\[STAGNATION\]/],
  ["forced first-search completion gate", /done_rejected \(no research yet\)/],
  ["automatic post-search visit instruction", /Soft nudge: if we already have company-looking URLs/],
  ["Gemini temperature clamp", /generationConfig:[\s\S]{0,250}temperature:\s*0\.25/],
];

for (const [label, pattern] of forbidden) {
  if (pattern.test(source)) throw new Error(`agentic runtime invariant failed: ${label}`);
}

console.log("agentic runtime invariants: PASS");
