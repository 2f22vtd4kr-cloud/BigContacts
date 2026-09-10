import fs from "node:fs";

const path = "artifacts/api-server/src/src/lib/agentic-web-research-core.ts";
let source = fs.readFileSync(path, "utf8");
const oldCall = 'searchRegistry({ query: action.query, registry: action.registry as any, limit: 8 })';
const newCall = 'searchRegistry({ query: action.query, registry: action.registry as any, limit: 8, signal: runController.signal })';
if (source.includes(oldCall)) source = source.replace(oldCall, newCall);
if (!source.includes(newCall)) throw new Error("agentic registry signal wiring: canonical ReAct registry call is not signal-aware");
fs.writeFileSync(path, source);
console.log("agentic registry signal wiring: applied");
