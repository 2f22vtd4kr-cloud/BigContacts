import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetPath = path.join(repoRoot, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
let s = fs.readFileSync(targetPath, "utf8");

// The investigator providers have their own fetch timeouts (40–50s). The old
// 18s Promise.race could abandon a still-running provider call, release the
// concurrency slot, and—under strict unhandled-rejection behavior—kill the API.
// Keep the timeout above the provider's own deadline and consume the provider
// promise explicitly so a late rejection can never escape the race.
const oldBlock = `    const providerDecisionTimeoutMs = 18_000;\n    const errors: string[] = [];\n\n    for (const [name, fn] of providers) {\n      const timeout = new Promise<never>((_, reject) =>\n        setTimeout(() => reject(new Error(name + ":timeout")), providerDecisionTimeoutMs),\n      );\n      try {\n        if (name === "groq") await waitForGroqAgenticPace();\n        const out = await Promise.race([fn(prompt), timeout]);\n`;

const newBlock = `    const providerDecisionTimeoutMs = Math.max(45_000, Number(process.env.AGENTIC_PROVIDER_DECISION_TIMEOUT_MS || "45000"));\n    const errors: string[] = [];\n\n    for (const [name, fn] of providers) {\n      try {\n        if (name === "groq") await waitForGroqAgenticPace();\n        const out = await new Promise<{ model: string; raw: string } | null>((resolve, reject) => {\n          const timer = setTimeout(() => reject(new Error(name + ":timeout")), providerDecisionTimeoutMs);\n          void fn(prompt).then(\n            (value) => { clearTimeout(timer); resolve(value); },\n            (error) => { clearTimeout(timer); reject(error); },\n          );\n        });\n`;

if (s.includes("providerDecisionTimeoutMs = 18_000")) {
  if (!s.includes(oldBlock)) {
    throw new Error("agentic timeout block anchor is present but exact replacement block was not found");
  }
  s = s.replace(oldBlock, newBlock);
} else if (!s.includes("AGENTIC_PROVIDER_DECISION_TIMEOUT_MS")) {
  throw new Error("agentic timeout hardening anchor missing; refusing ambiguous mutation");
}

fs.writeFileSync(targetPath, s);
console.log("Applied agentic provider timeout hardening: provider deadline >=45s; late provider rejections consumed; no premature 18s race");
