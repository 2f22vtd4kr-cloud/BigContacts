import fs from "node:fs";

const file = "artifacts/api-server/src/src/lib/agentic-web-research.ts";
const source = fs.readFileSync(file, "utf8");

const required = [
  ["all Gemini keys are enumerated", /GEMINI_API_KEY_\$\{i \+ 1\}/],
  ["Gemini 3.7 is the default current model", /"gemini-3\.7-flash"/],
  ["Gemini uses high thinking", /thinkingLevel:\s*"high"/],
  ["Gemini action schema is present", /const AGENTIC_ACTION_SCHEMA =/],
  ["Gemini action JSON is fail-closed parsed", /function parseAction\(raw: string\): AgentAction \| null/],
  ["provider decision deadline is not the old 18s cap", /providerDecisionTimeoutMs = 55_000/],
  ["default iteration budget is expanded", /const MAX_ITER = 40;/],
];

for (const [label, pattern] of required) {
  if (!pattern.test(source)) throw new Error(`agentic runtime invariant failed: ${label}`);
}

if (/const maxIter = Math\.min\(input\.maxIterations \?\? MAX_ITER, 24\)/.test(source)) {
  throw new Error("agentic runtime invariant failed: hidden 24-iteration ceiling");
}

const forbidden = [
  ["undefined Serper model logger", /logger\.warn\(\{ provider:\s*"serper"[^}]*model[^}]*\}/],
  ["forced stagnation nudge", /\[STAGNATION\]/],
  ["forced first-search completion gate", /done_rejected \(no research yet\)/],
  ["automatic post-search visit instruction", /Soft nudge: if we already have company-looking URLs/],
  ["Gemini temperature clamp", /generationConfig:[\s\S]{0,250}temperature:\s*0\.25/],
];

for (const [label, pattern] of forbidden) {
  if (pattern.test(source)) throw new Error(`agentic runtime invariant failed: ${label}`);
}

console.log("agentic runtime invariants: PASS");
