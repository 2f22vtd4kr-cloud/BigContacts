import fs from "node:fs";

const file = "artifacts/api-server/src/src/lib/agentic-web-research.ts";
const source = fs.readFileSync(file, "utf8");

const required = [
  ["all Gemini keys are enumerated", /GEMINI_API_KEY_\$\{i \+ 1\}/],
  ["Gemini 3.7 is the default current model", /"gemini-3\.7-flash"/],
  ["Gemini uses high thinking", /thinkingLevel:\s*"high"/],
  ["provider decision deadline is not the old 18s cap", /providerDecisionTimeoutMs = 55_000/],
];

for (const [label, pattern] of required) {
  if (!pattern.test(source)) throw new Error(`agentic runtime invariant failed: ${label}`);
}

const forbidden = [
  ["undefined Serper model logger", /provider:\s*"mistral",\s*status:\s*resp\.status,\s*model \}/],
  ["undefined model variable in Serper error path", /logger\.warn\(\{[^}]*provider:\s*"serper"[^}]*model[^}]*\}/],
  ["forced stagnation nudge", /\[STAGNATION\]/],
  ["forced first-search completion gate", /done_rejected \(no research yet\)/],
  ["automatic post-search visit instruction", /Soft nudge: if we already have company-looking URLs/],
];

for (const [label, pattern] of forbidden) {
  if (pattern.test(source)) throw new Error(`agentic runtime invariant failed: ${label}`);
}

console.log("agentic runtime invariants: PASS");
