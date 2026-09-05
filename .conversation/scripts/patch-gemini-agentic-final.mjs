import fs from "node:fs";

const path = "artifacts/api-server/src/src/lib/agentic-web-research.ts";
let s = fs.readFileSync(path, "utf8");
let changes = 0;

// Gemini 3.7 is explicitly optimized for agentic workflows and high thinking.
// A current provider regression has been observed with schema-constrained JSON
// on long, repetitive structured prompts. Apex already has a JSON parser + one
// repair turn, so let the model produce natural JSON rather than imposing the
// response schema on every turn. This removes a decoding constraint, not a
// research constraint.
const schemaLine = /\n\s*responseFormat:\s*\{\s*text:\s*\{\s*mimeType:\s*"application\/json",\s*schema:\s*AGENTIC_ACTION_SCHEMA\s*\}\s*\},/;
if (schemaLine.test(s)) {
  s = s.replace(schemaLine, "");
  changes++;
}

fs.writeFileSync(path, s);
console.log(`[apex-gemini-final] removed schema-constrained Gemini 3.7 decoding (${changes} change(s))`);
