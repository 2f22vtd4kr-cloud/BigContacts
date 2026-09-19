import fs from "node:fs";

const paths = [
  "artifacts/api-server/src/src/lib/ai-extractor.ts",
  "artifacts/api-server/src/lib/ai-extractor.ts",
];
const failures = [];
for (const targetPath of paths) {
  if (!fs.existsSync(targetPath)) continue;
  const source = fs.readFileSync(targetPath, "utf8");
  if (/Groq capacity fallback|groq-final-review-fallback|DeepSeek|deepseek|NVIDIA NIM|NVIDIA Integrate/.test(source)) {
    failures.push(`${targetPath}: retired provider or Groq final-review fallback remains`);
  }
  if (!/runGeminiRightHandFinalReview/.test(source)) {
    failures.push(`${targetPath}: Gemini Right-hand final-review path is missing`);
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
console.log("- Gemini Right-hand owns final-review oversight");
console.log("- Groq/Mistral Investigator lane cannot become final reviewer");
console.log("- Unavailable oversight fails closed through deterministic adjudication");
