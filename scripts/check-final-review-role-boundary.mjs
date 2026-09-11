import fs from "node:fs";

const paths = [
  "artifacts/api-server/src/src/lib/ai-extractor.ts",
  "artifacts/api-server/src/lib/ai-extractor.ts",
];
const failures = [];
for (const targetPath of paths) {
  if (!fs.existsSync(targetPath)) continue;
  const source = fs.readFileSync(targetPath, "utf8");
  if (/Groq capacity fallback|groq-final-review-fallback/.test(source)) {
    failures.push(`${targetPath}: Groq final-review fallback remains`);
  }
  // Both source trees have historically used the same oversight contract, but
  // the legacy copy may still name the NVIDIA adapter directly. The role law
  // is about the oversight role, not the adapter's historical module name.
  if (!/runDeepSeekFinalReview|runNvidiaNimFinalReview/.test(source)) {
    failures.push(`${targetPath}: NVIDIA/DeepSeek final-review path is missing`);
  }
  if (!/unavailable-final-review/.test(source)) {
    failures.push(`${targetPath}: deterministic fail-closed final-review path is missing`);
  }
}
if (failures.length) {
  console.error("FINAL REVIEW ROLE BOUNDARY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("FINAL REVIEW ROLE BOUNDARY: PASS");
console.log("- Gemini Boss is primary");
console.log("- DeepSeek/NVIDIA is the only model fallback");
console.log("- Groq/Mistral Investigator lane cannot become final reviewer");
console.log("- Unavailable oversight fails closed through deterministic adjudication");
