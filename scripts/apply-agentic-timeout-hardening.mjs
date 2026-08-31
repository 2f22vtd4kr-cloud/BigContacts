import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetPath = path.join(repoRoot, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
let s = fs.readFileSync(targetPath, "utf8");

const oldBlock = `    const providerDecisionTimeoutMs = 18_000;\n    const errors: string[] = [];\n\n    for (const [name, fn] of providers) {\n      const timeout = new Promise<never>((_, reject) =>\n        setTimeout(() => reject(new Error(name + ":timeout")), providerDecisionTimeoutMs),\n      );\n      try {\n        if (name === "groq") await waitForGroqAgenticPace();\n        const out = await Promise.race([fn(prompt), timeout]);\n`;
const newBlock = `    const providerDecisionTimeoutMs = Math.max(55_000, Number(process.env.AGENTIC_PROVIDER_DECISION_TIMEOUT_MS || "55000"));\n    const errors: string[] = [];\n\n    for (const [name, fn] of providers) {\n      try {\n        if (name === "groq") await waitForGroqAgenticPace();\n        const out = await new Promise<{ model: string; raw: string } | null>((resolve, reject) => {\n          const timer = setTimeout(() => reject(new Error(name + ":timeout")), providerDecisionTimeoutMs);\n          void fn(prompt).then(\n            (value) => { clearTimeout(timer); resolve(value); },\n            (error) => { clearTimeout(timer); reject(error); },\n          );\n        });\n`;
if (s.includes("providerDecisionTimeoutMs = 18_000")) {
  if (!s.includes(oldBlock)) throw new Error("agentic timeout block anchor is present but exact replacement block was not found");
  s = s.replace(oldBlock, newBlock);
} else if (!s.includes("AGENTIC_PROVIDER_DECISION_TIMEOUT_MS")) {
  throw new Error("agentic timeout hardening anchor missing; refusing ambiguous mutation");
}

const groqStart = s.indexOf("async function callGroqJson");
const groqEnd = s.indexOf("const AGENTIC_ACTION_SCHEMA", groqStart);
if (groqStart < 0 || groqEnd < 0) throw new Error("Groq call block anchors missing");
let groq = s.slice(groqStart, groqEnd);
groq = groq
  .replace(/max_tokens:\s*1536,/, 'max_completion_tokens: 768,\n            reasoning_effort: "low",\n            include_reasoning: false,\n            response_format: { type: "json_object" },')
  .replace(/max_tokens:\s*768,/, 'max_completion_tokens: 768,')
  .replace(/reasoning_effort:\s*"medium"/, 'reasoning_effort: "low"')
  .replace(/signal: AbortSignal\.timeout\(40_000\)/, 'signal: AbortSignal.timeout(50_000)')
  .replace(
    /if \(!resp\.ok\) \{\s*logger\.warn\(\{ provider: "groq", status: resp\.status, model \}, "agentic provider rejected request"\);\s*continue;\s*\}/,
    `if (!resp.ok) {\n          const body = (await resp.text()).slice(0, 700);\n          logger.warn({\n            provider: "groq",\n            status: resp.status,\n            model,\n            retryAfter: resp.headers.get("retry-after"),\n            remainingTokens: resp.headers.get("x-ratelimit-remaining-tokens"),\n            body,\n          }, "agentic provider rejected request");\n          continue;\n        }`,
  );
s = s.slice(0, groqStart) + groq + s.slice(groqEnd);

// Durable history/findings remain intact; only the model-facing state is compacted
// to stay below low-tier provider token ceilings after a search result arrives.
s = s.replace(/\.slice\(0, MAX_OBS\) \|\| "\(none — begin with web_search\)"/g, '.slice(0, 2200) || "(none — begin with web_search)"');
s = s.replace(/\.slice\(0, 20\)\n\s*\.map\(/, '.slice(0, 8)\n    .map(');
s = s.replace(/input\.history\.length > 14 \? input\.history\.slice\(-14\) : input\.history/g, 'input.history.length > 8 ? input.history.slice(-8) : input.history');
s = s.replace(/OBJECTIVE: \$\{input\.objective\}/g, 'OBJECTIVE: ${input.objective.slice(0, 1200)}');

fs.writeFileSync(targetPath, s);
console.log("Applied agentic latency hardening: provider deadline >=55s, Groq 768-token low-reasoning JSON turns, compact model-facing state, and provider rejection diagnostics");
