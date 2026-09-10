import fs from "node:fs";
import { execFileSync } from "node:child_process";

const targets = [
  "artifacts/api-server/src/src/lib/atlas-orchestrator.ts",
  "artifacts/api-server/src/lib/atlas-orchestrator.ts",
];

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

for (const path of targets) {
  if (!fs.existsSync(path)) continue;
  let source = fs.readFileSync(path, "utf8");
  const marker = "if (rawHandle || emailForHolehe) {";
  const start = source.indexOf(marker);
  if (start >= 0) {
    const open = source.indexOf("{", start + marker.length - 1);
    const end = findBlockEnd(source, open);
    if (end < 0) throw new Error(`deterministic Atlas OSINT retirement: could not parse ${path}`);
    source = source.slice(0, start) + "// Deterministic Maigret/Holehe fan-out retired: Investigator capabilities own this research decision.\n" + source.slice(end);
    console.log(`deterministic Atlas OSINT retirement: removed scripted Maigret/Holehe block from ${path}`);
  }
  source = source.replace(/import \{ runHolehe, runMaigret \} from "\.\/python-tools";\n/g, "");
  source = source.replace(/import \{ runMaigret, runHolehe \} from "\.\/python-tools";\n/g, "");
  if (/runMaigret\(|runHolehe\(/.test(source)) throw new Error(`deterministic Atlas OSINT retirement: live Python OSINT call remains in ${path}`);
  fs.writeFileSync(path, source);
}

// The legacy Atlas router is still useful for status/stop telemetry, but its
// historical POST launch must never be another executable research plane.
execFileSync(process.execPath, ["scripts/apply-retire-legacy-atlas-launch.mjs"], { stdio: "inherit" });
