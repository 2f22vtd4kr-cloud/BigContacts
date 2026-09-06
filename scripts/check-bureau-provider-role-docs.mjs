import fs from "node:fs";

const files = [
  "docs/BUREAU_REACT_ARCHITECTURE.md",
  "docs/bureau-plan/20_DIG_LOOP_STATE_MACHINE.md",
  "docs/bureau-plan/94_MODEL_ROUTING_TABLE.md",
  "docs/bureau-plan/227_BUREAU_CONTROL_FLOW.md",
  "docs/bureau-plan/434_PROVIDER_ROLE_SOURCE_OF_TRUTH.md",
];

const failures = [];
const forbidden = [
  "Groq → Mistral → Gemini → NVIDIA",
  "Groq -> Mistral -> Gemini -> NVIDIA",
  "Dig investigators | Groq → Mistral → Gemini → NVIDIA",
  "Dig investigator = Groq → Mistral",
  "Dig investigator = Groq -> Mistral",
  "Dig / Investigator = Groq → Mistral",
  "Dig / Investigator = Groq -> Mistral",
  "additional model-decision step",
  "additional Investigator decision layer",
  "separate Investigator decision model",
  "DeepSeek/NVIDIA as an Investigator",
  "DeepSeek via NVIDIA NIM is an Investigator",
  "Gemini as an Investigator",
];

for (const file of files) {
  if (!fs.existsSync(file)) {
    failures.push(`${file}: missing canonical provider-role document`);
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  for (const phrase of forbidden) {
    if (source.includes(phrase)) failures.push(`${file}: stale provider/control-plane phrase: ${phrase}`);
  }
  if (!/Boss.*Gemini/i.test(source)) failures.push(`${file}: missing Gemini Boss declaration`);
  if (!/Right-hand.*DeepSeek|DeepSeek.*right-hand/i.test(source)) failures.push(`${file}: missing DeepSeek right-hand declaration`);
  if (!/Investigator LLM pool/i.test(source)) failures.push(`${file}: missing Investigator LLM pool declaration`);
  if (!/two AI layers|two-layer/i.test(source)) failures.push(`${file}: missing two-layer architecture declaration`);
  if (!/Tavily.*Exa|Exa.*Tavily/i.test(source)) failures.push(`${file}: missing search capability surface`);
  if (!/Scrapfly.*ZenRows|ZenRows.*Scrapfly/i.test(source)) failures.push(`${file}: missing browser/fetch capability surface`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`provider-role documentation OK (${files.length} canonical docs)`);
