import fs from "node:fs";

const files = [
  "docs/BUREAU_REACT_ARCHITECTURE.md",
  "docs/bureau-plan/01_PRODUCT_LAW_AND_CONTROL_PLANE.md",
  "docs/bureau-plan/02_FREE_REACT_AND_TOOL_SURFACE.md",
  "docs/bureau-plan/10_TOOL_CATALOG.md",
  "docs/bureau-plan/20_DIG_LOOP_STATE_MACHINE.md",
  "docs/bureau-plan/31_BOSS_RIGHT_HAND_PROTOCOL.md",
  "docs/bureau-plan/94_MODEL_ROUTING_TABLE.md",
  "docs/bureau-plan/227_BUREAU_CONTROL_FLOW.md",
];

const failures = [];
const forbidden = [
  "Groq → Mistral → Gemini → NVIDIA",
  "Groq -> Mistral -> Gemini -> NVIDIA",
  "Dig investigators | Groq → Mistral → Gemini → NVIDIA",
  "deterministic recovery only after dig LLM total fail",
  "template fallback",
  "NVIDIA NIM as right-hand",
  "Right-hand = **NVIDIA**",
  "Right-hand | **NVIDIA**",
  "Right-hand = NVIDIA NIM",
  "Right-hand | NVIDIA NIM",
  "z-AI / GLM",
  "z-AI/GLM",
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
  if (!/Boss\s*=\s*\*\*Gemini\*\*|\*\*Boss\*\*.*Gemini|Boss.*Gemini/.test(source)) {
    failures.push(`${file}: missing Gemini Boss declaration`);
  }
  if (!/Right-hand.*DeepSeek|DeepSeek.*right-hand/i.test(source)) {
    failures.push(`${file}: missing DeepSeek right-hand declaration`);
  }
  if (!/Groq\s*(?:→|->)\s*Mistral/.test(source)) {
    failures.push(`${file}: missing Groq → Mistral investigator declaration`);
  }
  if (!/NVIDIA Integrate/i.test(source)) {
    failures.push(`${file}: missing NVIDIA Integrate transport declaration`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`provider-role documentation OK (${files.length} canonical docs)`);
