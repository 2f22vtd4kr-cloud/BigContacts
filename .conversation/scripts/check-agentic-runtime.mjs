import fs from "node:fs";

const file = "artifacts/api-server/src/src/lib/agentic-web-research.ts";
const source = fs.readFileSync(file, "utf8");
const workflow = fs.readFileSync(".github/workflows/apex-live-audit.yml", "utf8");
const compatibilityHardener = fs.readFileSync("scripts/apply-agentic-runtime-hardening.mjs", "utf8");
const canonicalHardener = fs.readFileSync("scripts/apply-agentic-concurrency-hardening.mjs", "utf8");
const apexRuntimeShim = fs.readFileSync("artifacts/apex-runtime/lib/agentic-web-research.ts", "utf8");

if (!/^\/\*\*[\s\S]*Compatibility shim only[\s\S]*export \* from \"\.\.\/\.\.\/api-server\/src\/src\/lib\/agentic-web-research\.ts\";\s*$/m.test(apexRuntimeShim)) {
  throw new Error("apex-runtime invariant failed: stale standalone agentic implementation is not quarantined to canonical production source");
}

const required = [
  ["Dig action schema is present", /const AGENTIC_ACTION_SCHEMA =/],
  ["Dig action JSON is fail-closed parsed", /function parseAction/],
  ["Dig provider decision deadline is bounded", /providerDecisionTimeoutMs = Math\.max\(55_000, Number\(process\.env\.AGENTIC_PROVIDER_DECISION_TIMEOUT_MS/],
  ["late provider rejections are consumed", /void fn\(prompt\)\.then\([\s\S]*?clearTimeout\(timer\)/],
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
// The Dig module must not carry dormant Boss provider implementation.
if (/GEMINI_API_KEY_|async function callGeminiJson\b/.test(source)) {
  throw new Error("agentic runtime invariant failed: dormant Gemini provider remains in production Dig module");
}

// Keep the production Dig module free of dormant Boss/right-hand HTTP callers.
if (/async function callNvidiaJson\b/.test(source)) {
  throw new Error("agentic runtime invariant failed: dormant NVIDIA Dig HTTP helper remains in production module");
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

if (!/async function probe\(url,key,model,provider\)/.test(workflow)) {
  throw new Error("live audit provider gate missing generic capability probe");
}
if (!/const groq = await probe\([\s\S]*?["']groq-dig["']\)/.test(workflow)) {
  throw new Error("live audit provider gate missing Groq Dig probe");
}
if (!/const mistral = await probe\([\s\S]*?["']mistral-dig["']\)/.test(workflow)) {
  throw new Error("live audit provider gate missing Mistral Dig probe");
}
if (!/digReady = groq \|\| mistral;/.test(workflow)) {
  throw new Error("live audit provider gate does not derive Dig readiness from Groq/Mistral");
}
if (!/if\(!digReady\)/.test(workflow)) {
  throw new Error("live audit must gate launch on an actual Dig provider generation");
}
if (!/probe\([\s\S]*?["']nvidia-right-hand["']\)/.test(workflow)) {
  throw new Error("live audit right-hand probe is not explicitly capability-scoped");
}

if (!/const canonical\s*=\s*path\.join\(here,\s*["']apply-agentic-concurrency-hardening\.mjs["']\)/.test(compatibilityHardener)) {
  throw new Error("compatibility hardener does not resolve the canonical hardener");
}
if (!/spawnSync\(process\.execPath,\s*\[canonical\]/.test(compatibilityHardener)) {
  throw new Error("compatibility hardener does not execute the canonical hardener");
}
if (/\[\s*\[?\s*["']gemini["']\s*,\s*callGeminiJson|["']nvidia["']\s*,\s*callNvidiaJson/.test(compatibilityHardener)) {
  throw new Error("compatibility hardener contains a forbidden Boss/right-hand Dig provider tuple");
}

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
