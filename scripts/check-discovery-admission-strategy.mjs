import fs from "node:fs";

const path = "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts";
const source = fs.readFileSync(path, "utf8");

const forbidden = [
  /\.slice\(0,\s*input\.maxCandidates\)/,
  /\.slice\(0,\s*targetCount\)/,
];

const violations = forbidden.filter((pattern) => pattern.test(source));
if (violations.length) {
  throw new Error(
    "Canonical discovery must not deterministically truncate model-admitted candidates before Gemini chooses among them. Use a hard safety failure/limit that does not select the first N candidates."
  );
}

if (!source.includes("function materializeAtlasAdmissions")) {
  throw new Error("Canonical Atlas admission function is missing; discovery admission boundary cannot be verified.");
}

console.log("Discovery admission strategy guard passed.");
