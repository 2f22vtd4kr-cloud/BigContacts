#!/usr/bin/env node
/**
 * Presence-only preflight. Never prints values.
 * Never writes env or Secrets. Operator owns keys.
 * Exit 0 always so automation does not "fix" secrets on failure.
 */
function present(name) {
  const v = process.env[name];
  return Boolean(v && String(v).trim() && !String(v).includes("YOUR_"));
}
function any(names) {
  return names.some(present);
}

console.log("Apex Atlas preflight — presence only. Do not edit Secrets.\n");

const db = present("DATABASE_URL");
const redis = any(["REDIS_URL_1", "REDIS_URL"]);
const search = any(["SERPER_API_KEY", "TAVILY_API_KEY", "EXA_API_KEY", "EXA_API_KEY_1"]);
const llm = any(["GROQ_API_KEY", "GEMINI_API_KEY", "MISTRAL_API_KEY", "NVIDIA_NIM_API_KEY"]);

console.log(`${db ? "OK" : "MISS"}  database`);
console.log(`${redis ? "OK" : "MISS"}  redis (one URL is enough)`);
console.log(`${search ? "OK" : "MISS"}  search lane`);
console.log(`${llm ? "OK" : "MISS"}  dig LLM lane`);

const auto = String(process.env.ENABLE_AUTO_PIPELINE || "").toLowerCase();
if (auto && auto !== "false" && auto !== "0") {
  console.log("WARN  ENABLE_AUTO_PIPELINE is on — set false for operator dig tests");
} else {
  console.log("OK    ENABLE_AUTO_PIPELINE off/unset");
}

if (!search || !llm) {
  console.log("\nNOTE  healthz may report bureauIntegrity=critical until operator adds search + dig LLM secrets and restarts API.");
  console.log("      This script will not and must not write Secrets.");
}
console.log("\nDone. No secrets were modified.");
process.exit(0);
