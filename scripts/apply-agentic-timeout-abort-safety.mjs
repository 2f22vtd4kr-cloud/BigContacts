import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
let s = fs.readFileSync(target, "utf8");

const alreadyApplied = [
  "signal?: AbortSignal",
  "signal: signal ?? AbortSignal.timeout(50_000)",
  "signal: signal ?? AbortSignal.timeout(45_000)",
  "const controller = new AbortController()",
  "fn(prompt, controller.signal)",
].every((marker) => s.includes(marker));

if (alreadyApplied) {
  console.log("Investigator timeout-abort safety already applied; no source mutation");
  process.exit(0);
}

function replaceOnce(from, to, label) {
  if (!s.includes(from)) throw new Error(`timeout-abort safety anchor missing: ${label}`);
  s = s.replace(from, to);
}

// Give llmStep ownership of cancellation so its wall-clock timeout cannot leave
// a provider fetch running after the logical step has already failed.
replaceOnce(
  'async function callGroqJson(prompt: string): Promise<{ model: string; raw: string } | null> {',
  'async function callGroqJson(prompt: string, signal?: AbortSignal): Promise<{ model: string; raw: string } | null> {',
  "Groq signature",
);
replaceOnce(
  'signal: AbortSignal.timeout(50_000),',
  'signal: signal ?? AbortSignal.timeout(50_000),',
  "Groq fetch signal",
);
replaceOnce(
  'async function callMistralJson(prompt: string): Promise<{ model: string; raw: string } | null> {',
  'async function callMistralJson(prompt: string, signal?: AbortSignal): Promise<{ model: string; raw: string } | null> {',
  "Mistral signature",
);
replaceOnce(
  'signal: AbortSignal.timeout(45_000),',
  'signal: signal ?? AbortSignal.timeout(45_000),',
  "Mistral fetch signal",
);

replaceOnce(
  'const providers: Array<[string, (prompt: string) => Promise<{ model: string; raw: string } | null>]> = [',
  'const providers: Array<[string, (prompt: string, signal?: AbortSignal) => Promise<{ model: string; raw: string } | null>]> = [',
  "provider callback type",
);
replaceOnce(
  '[["groq", callGroqJson] as [string, (prompt: string) => Promise<{ model: string; raw: string } | null>]]',
  '[["groq", callGroqJson] as [string, (prompt: string, signal?: AbortSignal) => Promise<{ model: string; raw: string } | null>]]',
  "Groq provider tuple type",
);
replaceOnce(
  '[["mistral", callMistralJson] as [string, (prompt: string) => Promise<{ model: string; raw: string } | null>]]',
  '[["mistral", callMistralJson] as [string, (prompt: string, signal?: AbortSignal) => Promise<{ model: string; raw: string } | null>]]',
  "Mistral provider tuple type",
);

const oldPromise = `const timer = setTimeout(() => reject(new Error(name + ":timeout")), providerDecisionTimeoutMs);\n          void fn(prompt).then(`;
const newPromise = `const controller = new AbortController();\n          const timer = setTimeout(() => { controller.abort(); reject(new Error(name + ":timeout")); }, providerDecisionTimeoutMs);\n          void fn(prompt, controller.signal).then(`;
replaceOnce(oldPromise, newPromise, "provider decision cancellation");

fs.writeFileSync(target, s);
console.log("Applied Investigator timeout-abort safety: logical provider timeout now aborts the underlying fetch; idempotent");
