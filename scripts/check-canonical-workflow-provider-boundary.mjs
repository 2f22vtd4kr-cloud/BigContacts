import fs from "node:fs";
import path from "node:path";

const workflowDir = ".github/workflows";
const files = fs.readdirSync(workflowDir).filter((name) => /\.ya?ml$/i.test(name));
const forbidden = [
  "GEMINI_API_KEY",
  "GEMINI_RIGHT_HAND_API_KEY",
  "MISTRAL_API_KEY",
  "MISTRAL_RIGHT_HAND_API_KEY",
];
const failures = [];

for (const file of files) {
  const full = path.join(workflowDir, file);
  const source = fs.readFileSync(full, "utf8");
  for (const token of forbidden) {
    if (source.includes(token)) failures.push(`${full}: retired provider credential ${token}`);
  }
}

const canonical = {
  ".github/workflows/apex-live-audit.yml": ["GROQ_BOSS_API_KEY", "GROQ_RIGHT_HAND_API_KEY", "GROQ_INVESTIGATOR_API_KEY"],
  ".github/workflows/apex-live-audit-resilient.yml": ["GROQ_BOSS_API_KEY", "GROQ_RIGHT_HAND_API_KEY", "GROQ_INVESTIGATOR_API_KEY"],
  ".github/workflows/apex-canonical-runtime-proof.yml": ["GROQ_BOSS_API_KEY", "GROQ_RIGHT_HAND_API_KEY", "GROQ_INVESTIGATOR_API_KEY"],
  ".github/workflows/apex-batch10.yml": ["GROQ_BOSS_API_KEY", "GROQ_RIGHT_HAND_API_KEY", "GROQ_INVESTIGATOR_API_KEY"],
};

for (const [file, required] of Object.entries(canonical)) {
  const source = fs.readFileSync(file, "utf8");
  for (const token of required) {
    if (!source.includes(token)) failures.push(`${file}: missing canonical role credential ${token}`);
  }
}

const live = fs.readFileSync(".github/workflows/apex-live-audit.yml", "utf8");
if (!live.includes("actions/upload-artifact@")) failures.push("apex-live-audit.yml: failed live runs must upload forensic artifacts");
if (!live.includes("/tmp/apex-api.log")) failures.push("apex-live-audit.yml: uploaded evidence must include API logs");
if (!live.includes("/tmp/atlas-trace-final.json")) failures.push("apex-live-audit.yml: failed live runs must collect the final canonical trace");

if (failures.length) {
  console.error("CANONICAL WORKFLOW PROVIDER BOUNDARY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`CANONICAL WORKFLOW PROVIDER BOUNDARY: PASS (${files.length} workflow files checked)`);
