import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetPath = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research-core.ts");
if (!fs.existsSync(targetPath)) throw new Error(`harvest-domain egress quarantine: missing ${targetPath}`);

function findBlockEnd(source, openIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];
    if (lineComment) { if (ch === "\n") lineComment = false; continue; }
    if (blockComment) { if (ch === "*" && next === "/") { blockComment = false; i++; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "/" && next === "/") { lineComment = true; i++; continue; }
    if (ch === "/" && next === "*") { blockComment = true; i++; continue; }
    if (ch === "\"" || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

let source = fs.readFileSync(targetPath, "utf8");
const marker = 'if (action.action === "harvest_domain") {';
const start = source.indexOf(marker);
if (start < 0) {
  if (/runTheHarvester\(/.test(source)) throw new Error("harvest-domain egress quarantine: executor remains but harvest branch anchor is missing");
  console.log("harvest-domain egress quarantine: no live harvest branch/executor present");
  process.exit(0);
}
const open = source.indexOf("{", start + marker.length - 1);
const end = findBlockEnd(source, open);
if (end < 0) throw new Error("harvest-domain egress quarantine: could not parse harvest branch");

const replacement = `if (action.action === "harvest_domain") {
        // theHarvester accepts a model-selected destination and performs its own
        // network I/O. Until a real sandbox/egress broker exists, fail closed
        // rather than allowing it to bypass Node SSRF/quota enforcement.
        lastObservation = "HARVEST_DOMAIN blocked: network-capable subprocess egress is not yet governed by the canonical Apex egress boundary.";
        record.execution = "blocked";
        record.observation = lastObservation;
      }`;
source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(targetPath, source);
console.log("harvest-domain egress quarantine: theHarvester execution now fails closed pending governed subprocess egress");
