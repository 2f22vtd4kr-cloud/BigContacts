import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/target-contact-agent.ts", "utf8");

const required = [
  ["target Investigator is explicitly model-owned", /Target contact Investigator — model owns findings/],
  ["target objective gives the Investigator action autonomy", /There is no fixed checklist, provider order, query sequence, or mandatory hop order/],
  ["target objective does not prescribe a provider sequence", !/use (?:Groq|Mistral|Gemini|DeepSeek)[^\n]*(?:then|before|after)[^\n]*(?:Groq|Mistral|Gemini|DeepSeek)/i.test(source)],
  ["target objective does not prescribe a URL sequence", !/first (?:visit|search|open)[^\n]*(?:then|next)[^\n]*(?:visit|search|open)/i.test(source)],
  ["target findings still require observed-source provenance", /Every contact finding must carry the exact public URL where that value was observed/],
];

let failed = false;
for (const [name, ok] of required) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
