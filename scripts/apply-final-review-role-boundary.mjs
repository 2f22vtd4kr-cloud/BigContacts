import fs from "node:fs";

const paths = [
  "artifacts/api-server/src/src/lib/ai-extractor.ts",
  "artifacts/api-server/src/lib/ai-extractor.ts",
];

for (const targetPath of paths) {
  if (!fs.existsSync(targetPath)) continue;
  let source = fs.readFileSync(targetPath, "utf8");
  const marker = /\n  \/\/ 3\) Groq capacity fallback \(multi-model\)[\s\S]*?\n  return adjudicateFinalTargetReview\(input, \{\}, "unavailable-final-review"\);/;
  if (marker.test(source)) {
    source = source.replace(marker, "\n  return adjudicateFinalTargetReview(input, {}, \"unavailable-final-review\");");
    fs.writeFileSync(targetPath, source);
    console.log(`final-review role boundary: removed Groq reviewer fallback from ${targetPath}`);
  }
  if (/Groq capacity fallback|groq-final-review-fallback/.test(source)) {
    throw new Error(`final-review role boundary: forbidden Groq reviewer path remains in ${targetPath}`);
  }
}
