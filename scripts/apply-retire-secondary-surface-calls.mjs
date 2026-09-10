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

const fallback = `const secondary = {\n  linkedin: null,\n  email: null,\n  phone: null,\n  signal: null,\n  website: null,\n  relatedPeople: [],\n};`;

for (const path of targets) {
  let source = fs.readFileSync(path, "utf8");
  const marker = "const secondary = await expandSecondaryPublicSurface(";
  const start = source.indexOf(marker);
  if (start < 0) {
    console.log(`secondary-surface retirement: no live call found in ${path}`);
    continue;
  }
  const open = source.indexOf("(", start + marker.length - 1);
  const end = findCallEnd(source, open);
  if (end < 0) throw new Error(`secondary-surface retirement: could not parse call in ${path}`);
  source = source.slice(0, start) + fallback + source.slice(end).replace(/^;/, "");
  source = source.replace(/,\s*expandSecondaryPublicSurface\s*\}/, " }");
  source = source.replace(/\{\s*expandSecondaryPublicSurface,\s*/g, "{ ");
  fs.writeFileSync(path, source);
  console.log(`secondary-surface retirement: removed live call from ${path}`);
}
