import fs from "node:fs";

const targets = [
  "artifacts/api-server/src/src/routes/entities.ts",
  "artifacts/api-server/src/src/lib/atlas-orchestrator.ts",
];

function findCallEnd(source, openIndex) {
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
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

function findStatementStart(source, callStart) {
  const lineStart = source.lastIndexOf("\n", callStart - 1) + 1;
  return lineStart;
}

function findStatementEnd(source, callEnd) {
  let i = callEnd;
  while (i < source.length && /[ \t]/.test(source[i])) i++;
  if (source[i] === ";") return i + 1;
  return callEnd;
}

for (const path of targets) {
  let source = fs.readFileSync(path, "utf8");
  let removed = 0;
  for (;;) {
    const marker = "expandSecondaryPublicSurface(";
    const call = source.indexOf(marker);
    if (call < 0) break;
    const open = source.indexOf("(", call + marker.length - 1);
    const end = findCallEnd(source, open);
    if (end < 0) throw new Error(`secondary-surface retirement: could not parse call in ${path}`);
    const statementStart = findStatementStart(source, call);
    const statementEnd = findStatementEnd(source, end);
    source = source.slice(0, statementStart) + source.slice(statementEnd);
    removed++;
  }
  source = source.replace(/,\s*expandSecondaryPublicSurface\s*\}/g, " }");
  source = source.replace(/\{\s*expandSecondaryPublicSurface,\s*/g, "{ ");
  source = source.replace(/import\s*\{\s*expandSecondaryPublicSurface\s*,?\s*/g, "import { ");
  fs.writeFileSync(path, source);
  console.log(`secondary-surface retirement: removed ${removed} live call(s) from ${path}`);
}
