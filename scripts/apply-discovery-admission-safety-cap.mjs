import fs from "node:fs";

const path = "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts";
let source = fs.readFileSync(path, "utf8");
const old = '  const admitted = uniqueNames(input.findings.filter((f) => f.promotionDecision === "promote").filter((f) => f.scope === "candidate").filter((f) => typeof f.personName === "string" && f.personName.trim().length >= 3).filter((f) => Array.isArray(f.sourceUrls) && f.sourceUrls.some(isObservedHttpSource)).map((f) => f.personName as string)).slice(0, input.maxCandidates);';
const next = '  const admitted = uniqueNames(input.findings.filter((f) => f.promotionDecision === "promote").filter((f) => f.scope === "candidate").filter((f) => typeof f.personName === "string" && f.personName.trim().length >= 3).filter((f) => Array.isArray(f.sourceUrls) && f.sourceUrls.some(isObservedHttpSource)).map((f) => f.personName as string));\n  if (admitted.length > input.maxCandidates) throw new Error(`Discovery admission safety cap exceeded (${admitted.length} > ${input.maxCandidates}); refusing to deterministically select candidates.`);';
if (source.includes(next)) {
  console.log("Discovery admission safety cap already applied.");
  process.exit(0);
}
if (!source.includes(old)) throw new Error("Expected deterministic discovery admission truncation was not found; refusing to mutate source.");
source = source.replace(old, next);
fs.writeFileSync(path, source);
console.log("Applied fail-closed discovery admission safety cap.");
