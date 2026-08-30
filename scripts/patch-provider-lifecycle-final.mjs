import fs from "node:fs";

const path = "artifacts/api-server/src/src/lib/agentic-web-research.ts";
let s = fs.readFileSync(path, "utf8");
let changes = 0;

function replace(pattern, replacement) {
  if (!pattern.test(s)) return;
  const next = s.replace(pattern, replacement);
  if (next !== s) changes++;
  s = next;
}

// This was a concrete copy/paste defect: the Mistral branch reported itself as Serper.
replace(
  /logger\.warn\(\{ provider: "serper", status: resp\.status \}, "agentic provider rejected request"\);/g,
  'logger.warn({ provider: "mistral", status: resp.status, model }, "agentic provider rejected request");',
);

// NVIDIA's public catalog currently marks Nemotron 3 Nano 30B's free endpoint
// deprecated while Nemotron 3.5 Lightning is the current agentic model. Do not
// spend the provider circuit on a known-deprecated free endpoint.
replace(
  /"nvidia\/nemotron-3-nano-30b-a3b",\n    "nvidia\/nemotron-3\.5-lightning-30b-a3b",/,
  '"nvidia/nemotron-3.5-lightning-30b-a3b",\n    "nvidia/nemotron-3-super-120b-a12b",',
);
replace(
  /"nvidia\/nemotron-3-nano-30b-a3b",\n    "nvidia\/nemotron-3\.5-lightning-30b-a3b",/,
  '"nvidia/nemotron-3.5-lightning-30b-a3b",\n    "nvidia/nemotron-3-super-120b-a12b",',
);

// The default remains operator-overridable through NVIDIA_AGENTIC_MODEL / NIM_MODEL.
// This invariant is intentionally simple: no hard-coded deprecated free endpoint.
if (/"nvidia\/nemotron-3-nano-30b-a3b"/.test(s) && !/NVIDIA_NIM_MODEL/.test(s)) {
  throw new Error("deprecated NVIDIA Nano model remains without an operator override");
}

fs.writeFileSync(path, s);
console.log(`[apex-provider-lifecycle] normalized provider lifecycle (${changes} change(s))`);
