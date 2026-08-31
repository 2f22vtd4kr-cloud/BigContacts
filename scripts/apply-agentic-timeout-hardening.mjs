import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetPath = path.join(repoRoot, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
let s = fs.readFileSync(targetPath, "utf8");

// Provider calls have their own fetch deadlines. The old 18s Promise.race could
// abandon a still-running provider call, release the concurrency slot, and make
// the discovery batch spend its whole wall clock waiting on a serialized pool.
// Keep the decision deadline above the provider deadline and consume the promise
// explicitly so a late rejection cannot escape the race.
const oldBlock = `    const providerDecisionTimeoutMs = 18_000;\n    const errors: string[] = [];\n\n    for (const [name, fn] of providers) {\n      const timeout = new Promise<never>((_, reject) =>\n        setTimeout(() => reject(new Error(name + ":timeout")), providerDecisionTimeoutMs),\n      );\n      try {\n        if (name === "groq") await waitForGroqAgenticPace();\n        const out = await Promise.race([fn(prompt), timeout]);\n`;

const newBlock = `    const providerDecisionTimeoutMs = Math.max(55_000, Number(process.env.AGENTIC_PROVIDER_DECISION_TIMEOUT_MS || "55000"));\n    const errors: string[] = [];\n\n    for (const [name, fn] of providers) {\n      try {\n        if (name === "groq") await waitForGroqAgenticPace();\n        const out = await new Promise<{ model: string; raw: string } | null>((resolve, reject) => {\n          const timer = setTimeout(() => reject(new Error(name + ":timeout")), providerDecisionTimeoutMs);\n          void fn(prompt).then(\n            (value) => { clearTimeout(timer); resolve(value); },\n            (error) => { clearTimeout(timer); reject(error); },\n          );\n        });\n`;

if (s.includes("providerDecisionTimeoutMs = 18_000")) {
  if (!s.includes(oldBlock)) throw new Error("agentic timeout block anchor is present but exact replacement block was not found");
  s = s.replace(oldBlock, newBlock);
} else if (!s.includes("AGENTIC_PROVIDER_DECISION_TIMEOUT_MS")) {
  throw new Error("agentic timeout hardening anchor missing; refusing ambiguous mutation");
}

// Live ReAct turns only need a compact action object. GPT-OSS supports explicit
// reasoning effort and JSON-object mode; keeping the action response compact
// avoids spending the entire provider deadline on an oversized repairable turn.
const groqStart = s.indexOf('async function callGroqJson');
const groqEnd = s.indexOf('const AGENTIC_ACTION_SCHEMA', groqStart);
if (groqStart < 0 || groqEnd < 0) throw new Error("Groq call block anchors missing");
const groq = s.slice(groqStart, groqEnd);
const tunedGroq = groq
  .replace('max_tokens: 1536,', 'max_tokens: 1024,\n            reasoning_effort: "medium",\n            include_reasoning: false,\n            response_format: { type: "json_object" },')
  .replace('signal: AbortSignal.timeout(40_000),', 'signal: AbortSignal.timeout(50_000),');
if (tunedGroq === groq && !groq.includes('reasoning_effort: "medium"')) {
  throw new Error("Groq latency tuning anchor missing; refusing ambiguous mutation");
}
s = s.slice(0, groqStart) + tunedGroq + s.slice(groqEnd);

fs.writeFileSync(targetPath, s);
console.log("Applied agentic provider timeout hardening: decision deadline >=55s; Groq live turns bounded at 50s with compact JSON/medium reasoning; late provider rejections consumed");
