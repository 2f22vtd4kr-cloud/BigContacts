import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
let s = fs.readFileSync(file, "utf8");

const marker = "INVESTIGATOR_LLM_CAPABILITY_POOL";
const helperMarker = "async function callDeepSeekJson";

// Keep the checked-in source and the build-time canonicalizer aligned. This is
// deliberately provider-neutral: adding another investigator adapter only
// requires a new adapter + env key, not a new research architecture.
if (!s.includes(helperMarker)) {
  const anchor = "async function llmStep(prompt: string): Promise<{ model: string; raw: string } | null> {";
  if (!s.includes(anchor)) throw new Error("investigator capability pool: llmStep anchor not found");

  const helper = `async function callDeepSeekJson(prompt: string): Promise<{ model: string; raw: string } | null> {\n  const key = (process.env.DEEPSEEK_API_KEY ?? "").trim();\n  if (!key) return null;\n  try {\n    const resp = await fetch("https://api.deepseek.com/chat/completions", {\n      method: "POST",\n      headers: { Authorization: \`Bearer \${key}\`, "Content-Type": "application/json" },\n      body: JSON.stringify({\n        model: process.env.DEEPSEEK_INVESTIGATOR_MODEL || "deepseek-chat",\n        temperature: 0.1,\n        messages: [\n          { role: "system", content: "You are the autonomous web-research investigator. Choose the next research action from the supplied tool contract. Return only the requested JSON action." },\n          { role: "user", content: prompt },\n        ],\n      }),\n      signal: AbortSignal.timeout(18_000),\n    });\n    if (!resp.ok) return null;\n    const data = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };\n    const raw = data.choices?.[0]?.message?.content ?? "";\n    return raw ? { model: process.env.DEEPSEEK_INVESTIGATOR_MODEL || "deepseek-chat", raw } : null;\n  } catch {\n    return null;\n  }\n}\n\n`;
  s = s.replace(anchor, helper + anchor);
}

const start = s.indexOf("const providers: Array<[string, (prompt: string) => Promise<{ model: string; raw: string } | null>]>");
if (start < 0) throw new Error("investigator capability pool: provider array not found");
const end = s.indexOf("    ];", start);
if (end < 0) throw new Error("investigator capability pool: provider array terminator not found");

const replacement = `const providers: Array<[string, (prompt: string) => Promise<{ model: string; raw: string } | null>]> = [\n      // Current configured investigator adapters. Order is availability/fallback, not role hierarchy.\n      ...(process.env.GROQ_API_KEY ? [["groq", callGroqJson] as [string, (prompt: string) => Promise<{ model: string; raw: string } | null>]] : []),\n      ...(process.env.MISTRAL_API_KEY ? [["mistral", callMistralJson] as [string, (prompt: string) => Promise<{ model: string; raw: string } | null>]] : []),\n      ...(process.env.DEEPSEEK_API_KEY ? [["deepseek", callDeepSeekJson] as [string, (prompt: string) => Promise<{ model: string; raw: string } | null>]] : []),\n    ];`;
s = s.slice(0, start) + replacement + s.slice(end + 6);

if (!s.includes(marker)) {
  s = s.replace(
    "/**\n * DIG_INVESTIGATOR_FAILOVER_CHAIN:",
    "/**\n * INVESTIGATOR_LLM_CAPABILITY_POOL: provider-neutral investigator adapters.\n * The list is extensible; provider order is availability fallback only.\n *\n * DIG_INVESTIGATOR_FAILOVER_CHAIN:"
  );
}

fs.writeFileSync(file, s);
console.log("Investigator LLM capability pool applied.");
