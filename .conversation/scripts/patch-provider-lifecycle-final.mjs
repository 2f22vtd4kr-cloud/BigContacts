import fs from "node:fs";

const path = "artifacts/api-server/src/src/lib/agentic-web-research.ts";
let s = fs.readFileSync(path, "utf8");
let changes = 0;

function replaceOnce(pattern, replacement) {
  if (!pattern.test(s)) return;
  const next = s.replace(pattern, replacement);
  if (next !== s) changes++;
  s = next;
}

replaceOnce(
  /async function toolWebSearchSerper[\s\S]*?logger\.warn\(\{ provider: "mistral", status: resp\.status, model \}, "agentic provider rejected request"\);/,
  (block) => block.replace(
    'logger.warn({ provider: "mistral", status: resp.status, model }, "agentic provider rejected request");',
    'logger.warn({ provider: "serper", status: resp.status }, "agentic provider rejected request");',
  ),
);

replaceOnce(
  /async function callMistralJson[\s\S]*?logger\.warn\(\{ provider: "serper", status: resp\.status \}, "agentic provider rejected request"\);/,
  (block) => block.replace(
    'logger.warn({ provider: "serper", status: resp.status }, "agentic provider rejected request");',
    'logger.warn({ provider: "mistral", status: resp.status, model }, "agentic provider rejected request");',
  ),
);

replaceOnce(
  /const models = \[[\s\S]*?"nvidia\/nemotron-3-nano-30b-a3b",\n\s*"nvidia\/nemotron-3\.5-lightning-30b-a3b",/,
  (block) => block.replace(
    '"nvidia/nemotron-3-nano-30b-a3b",\n    "nvidia/nemotron-3.5-lightning-30b-a3b",',
    '"nvidia/nemotron-3.5-lightning-30b-a3b",\n    "nvidia/nemotron-3-super-120b-a12b",',
  ),
);

if (/"nvidia\/nemotron-3-nano-30b-a3b"/.test(s)) {
  throw new Error("deprecated NVIDIA Nano model remains in agentic provider pool");
}

fs.writeFileSync(path, s);
console.log(`[apex-provider-lifecycle] normalized provider lifecycle (${changes} change(s))`);
