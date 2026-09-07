import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
let s = fs.readFileSync(target, "utf8");

const start = s.indexOf("async function callMistralJson");
const end = s.indexOf("/**\n * INVESTIGATOR_POOL_RETRY", start);
if (start < 0 || end < 0) throw new Error("Mistral output-cap anchors missing");
let block = s.slice(start, end);
if (!block.includes("max_tokens: 768")) {
  if (!block.includes("max_tokens: 1536")) throw new Error("Mistral max_tokens anchor missing; refusing ambiguous mutation");
  block = block.replace("max_tokens: 1536", "max_tokens: 768");
}
s = s.slice(0, start) + block + s.slice(end);
fs.writeFileSync(target, s);
console.log("Applied Investigator output cap: Mistral ReAct JSON max_tokens=768 (idempotent)");
