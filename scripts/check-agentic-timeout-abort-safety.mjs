import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
const source = fs.readFileSync(target, "utf8");

const required = [
  "signal?: AbortSignal",
  "signal: signal ?? AbortSignal.timeout(50_000)",
  "signal: signal ?? AbortSignal.timeout(45_000)",
  "const controller = new AbortController()",
  "controller.abort(); reject(new Error(name + \":timeout\"))",
  "fn(prompt, controller.signal)",
];
for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`agentic timeout-abort guard failed: missing ${marker}`);
}

console.log("agentic timeout-abort safety guard: PASS");
