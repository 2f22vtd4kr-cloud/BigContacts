import fs from "node:fs";

const file = "artifacts/api-server/src/src/lib/agentic-web-research.ts";
const source = fs.readFileSync(file, "utf8");

const required = [
  ["Gemini provider implementation remains available for Boss", /GEMINI_API_KEY_/],
  ["Gemini 3.7 is an available current model", /gemini-3\.7-flash/],
  ["Gemini uses high thinking", /thinkingLevel.*high/],
  ["Gemini action schema is present", /const AGENTIC_ACTION_SCHEMA =/],
  ["Gemini action JSON is fail-closed parsed", /function parseAction/],
  ["Dig provider decision deadline is bounded", /providerDecisionTimeoutMs = 18_000/],
  ["Dig investigator failover starts with Groq", /DIG_INVESTIGATOR_FAILOVER_CHAIN[\s\S]*\["groq", callGroqJson\]/],
  ["Dig investigator failover uses Mistral second", /\["groq", callGroqJson\][\s\S]*\["mistral", callMistralJson\]/],
  ["Dig does not use Boss Gemini provider", /DIG_INVESTIGATOR_FAILOVER_CHAIN[\s\S]*Boss=Gemini/],
  ["Dig does not use right-hand NVIDIA provider", /DIG_INVESTIGATOR_FAILOVER_CHAIN[\s\S]*right-hand=NVIDIA/],
  ["provider decisions are bounded across concurrent targets", /MAX_CONCURRENT_AGENTIC_PROVIDER_DECISIONS/],
  ["provider failures do not use a global cross-target circuit", /activeAgenticProviderDecisions/],
  ["default iteration budget is expanded", /const MAX_ITER = 40;/],
];

for (const [label, pattern] of required) {
  if (!pattern.test(source)) throw new Error(`agentic runtime invariant failed: ${label}`);
}

if (source.includes("const maxIter = Math.min(input.maxIterations ?? MAX_ITER, 24)")) {
  throw new Error("agentic runtime invariant failed: hidden 24-iteration ceiling");
}

if (source.includes("agenticProviderCircuitUntil")) {
  throw new Error("agentic runtime invariant failed: module-global provider circuit can contaminate concurrent targets");
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
