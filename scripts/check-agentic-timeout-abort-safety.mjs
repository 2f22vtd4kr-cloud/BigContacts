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
  "Math.min(MAX_ITER, Math.max(1, requestedIterations))",
  "status: \"cancelled\"",
];
for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`agentic timeout-abort guard failed: missing ${marker}`);
}

console.log("agentic timeout-abort safety guard: PASS");
