import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scanRoots = [
  path.join(root, "artifacts/api-server/src/src/lib"),
  path.join(root, "artifacts/api-server/src/routes"),
];
const forbidden = /\b(?:gemini|mistral)\b/i;
const failures = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:ts|tsx|mjs)$/.test(entry.name) && !/\.test\.(?:ts|tsx)$/.test(entry.name)) {
      const source = fs.readFileSync(full, "utf8");
      if (forbidden.test(source)) failures.push(path.relative(root, full));
    }
  }
}

for (const dir of scanRoots) walk(dir);

const investigator = fs.readFileSync(
  path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research-core.ts"),
  "utf8",
);
const boss = fs.readFileSync(
  path.join(root, "artifacts/api-server/src/src/lib/groq-boss.ts"),
  "utf8",
);
const rightHand = fs.readFileSync(
  path.join(root, "artifacts/api-server/src/src/lib/groq-right-hand-reasoning.ts"),
  "utf8",
);

if (!/selectedInvestigatorLlm === "groq"/.test(investigator)) failures.push("Investigator is not structurally bound to the canonical Groq adapter.");
if (!/GROQ_BOSS_MODEL/.test(boss) || !/provider:s*"groq"/.test(boss)) failures.push("Boss canonical Groq provider surface is missing.");
if (!/GROQ_RIGHT_HAND_MODEL/.test(rightHand) || !/provider:s*"groq"/.test(rightHand)) failures.push("Right-hand canonical Groq provider surface is missing.");

if (failures.length) {
  console.error("RETIRED LLM SURFACES: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("RETIRED LLM SURFACES: PASS — Gemini/Mistral are absent from active runtime source; Groq owns Boss, Right-hand and Investigator.");
