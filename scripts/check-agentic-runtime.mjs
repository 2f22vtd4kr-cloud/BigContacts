import fs from "node:fs";

const file = "artifacts/api-server/src/src/lib/agentic-web-research.ts";
const source = fs.readFileSync(file, "utf8");
const workflow = fs.readFileSync(".github/workflows/apex-live-audit.yml", "utf8");
const compatibilityHardener = fs.readFileSync("scripts/apply-agentic-runtime-hardening.mjs", "utf8");

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

// The role separation is architectural, not merely documentary. The generated
// Dig llmStep must contain only Dig-capable providers. Gemini and NVIDIA are
// allowed to exist in this module for Boss/right-hand adapters, but neither may
// be selected by the investigator loop.
const llmStepMatch = source.match(
  /async function llmStep\(prompt: string\): Promise<\{ model: string; raw: string \} \| null> \{([\s\S]*?)\n\}\n\nfunction formatFindingsBag/,
);
if (!llmStepMatch) throw new Error("agentic runtime invariant failed: llmStep implementation missing");
const llmStep = llmStepMatch[1]!;
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

// The live audit must not launch merely because Boss/right-hand providers work.
// Discovery/Dig requires an actual investigator provider. This prevents the
// exact failure mode where Gemini/NVIDIA preflight was green while Dig had no
// usable model and the ten-target run spent its budget producing zero research.
if (!/let digReady = false;/.test(workflow)) {
  throw new Error("live audit provider gate missing digReady state");
}
if (!/capability:'dig'/.test(workflow) || !/if \(ok\) digReady = true/.test(workflow)) {
  throw new Error("live audit provider gate does not mark Groq/Mistral as Dig-capable");
}
if (!/const ready = digReady;/.test(workflow) || !/if \(!digReady\)/.test(workflow)) {
  throw new Error("live audit must gate launch on an actual Dig provider generation");
}
if (/const ready = (?:false|bossReady \|\| rightHandReady)/.test(workflow)) {
  throw new Error("live audit incorrectly treats Boss/right-hand readiness as Dig readiness");
}

// Compatibility hardening must have one owner. It may not contain a second
// provider router that can reintroduce Gemini/NVIDIA into Dig.
if (!/delegat(?:e|es) to the canonical hardener/i.test(compatibilityHardener)) {
  throw new Error("compatibility hardener is not delegated to the canonical hardener");
}
if (/\[\s*\[?\s*["']gemini["']\s*,\s*callGeminiJson|["']nvidia["']\s*,\s*callNvidiaJson/.test(compatibilityHardener)) {
  throw new Error("compatibility hardener contains a forbidden Boss/right-hand Dig provider tuple");
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
