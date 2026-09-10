import fs from "node:fs";

const path = "artifacts/api-server/src/src/lib/agentic-web-research-core.ts";
let source = fs.readFileSync(path, "utf8");

const replacements = [
  [/personName:\s*targetName\b/g, "personName: null"],
  [/personName:\s*name\b/g, "personName: null"],
];
let changed = false;
for (const [pattern, replacement] of replacements) {
  const next = source.replace(pattern, replacement);
  changed ||= next !== source;
  source = next;
}

if (/personName:\s*targetName\b/.test(source) || /personName:\s*name\b/.test(source)) {
  throw new Error("investigator identity boundary: deterministic target-name attribution remains");
}

fs.writeFileSync(path, source);
console.log(`investigator identity observation boundary: ${changed ? "applied" : "already clean"}`);
