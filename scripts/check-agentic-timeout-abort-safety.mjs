import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research-core.ts");
const source = fs.readFileSync(target, "utf8");

const required = [
  "signal?: AbortSignal",
  "const runController = new AbortController()",
  "const timeout = setTimeout(() => runController.abort(), hardTimeoutMs)",
  "await acquireProviderSlot(parentSignal)",
  "fn(prompt, controller.signal)",
  "MAX_ITER = Number.POSITIVE_INFINITY",
  "requestedIterations > 0 ? requestedIterations : Number.POSITIVE_INFINITY",
  "status: \"cancelled\"",
];
for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`agentic timeout-abort guard failed: missing ${marker}`);
}
if (source.includes("Math.min(MAX_ITER,")) throw new Error("agentic timeout-abort guard failed: an upper iteration ceiling was reintroduced");

console.log("agentic timeout-abort safety guard: PASS — timeout owns duration; no action-count ceiling");
