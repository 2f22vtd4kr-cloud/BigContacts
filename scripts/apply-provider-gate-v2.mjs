import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetPath = path.join(repoRoot, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
const source = fs.readFileSync(targetPath, "utf8");

// apply-agentic-concurrency-hardening.mjs runs immediately before this
// compatibility check in the API build. The canonical hardener owns the
// Investigator provider lane; this script must never resurrect the obsolete
// Groq -> Mistral marker or install a second provider gate.
const canonicalDigLane =
  source.includes("activeAgenticProviderDecisions") &&
  /async function llmStep\(prompt: string, selectedInvestigatorLlm\?: "groq" \| "mistral"\)/.test(source) &&
  source.includes("const MAX_CONCURRENT_AGENTIC_PROVIDER_DECISIONS") &&
  source.includes("const GROQ_AGENTIC_MIN_INTERVAL_MS");

if (!canonicalDigLane) {
  throw new Error(
    "provider gate v2: canonical Investigator provider lane is missing; run apply-agentic-concurrency-hardening.mjs first",
  );
}

if (/DIG_INVESTIGATOR_FAILOVER_CHAIN|Groq -> Mistral/.test(source)) {
  throw new Error("provider gate v2: obsolete Groq -> Mistral architecture marker remains in canonical source");
}

console.log("[apex-provider-gate-v2] canonical Investigator provider gate verified; no-op");
