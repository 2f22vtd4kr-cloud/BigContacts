#!/usr/bin/env node
/**
 * Replit preflight — presence only (never values).
 * One Redis is enough. Extras are optional.
 */
const required = ["DATABASE_URL"];
const redisAny = ["REDIS_URL_1", "REDIS_URL"];
const searchAny = ["SERPER_API_KEY", "TAVILY_API_KEY", "EXA_API_KEY", "EXA_API_KEY_1"];
const digLlmAny = ["GROQ_API_KEY", "GEMINI_API_KEY", "MISTRAL_API_KEY", "NVIDIA_NIM_API_KEY"];
const optional = [
  "SCRAPFLY_API_KEY",
  "ZENROWS_API_KEY",
  "WHOISJSON_API_KEY",
  "WHOXY_API_KEY",
  "COMPANIES_HOUSE_API_KEY",
  "REDIS_URL_2",
  "REDIS_URL_3",
];

function present(name) {
  const v = process.env[name];
  return Boolean(v && String(v).trim() && !String(v).includes("YOUR_"));
}
function anyPresent(names) {
  return names.some(present);
}

console.log("Apex Atlas — env preflight (presence only)\n");

let bad = 0;
for (const k of required) {
  const ok = present(k);
  if (!ok) bad++;
  console.log(`${ok ? "OK  " : "MISS"} required  ${k}`);
}
const redisOk = anyPresent(redisAny);
if (!redisOk) bad++;
console.log(`${redisOk ? "OK  " : "MISS"} required  REDIS_URL_1 or REDIS_URL (one is enough)`);

const searchOk = anyPresent(searchAny);
const llmOk = anyPresent(digLlmAny);
console.log(`${searchOk ? "OK  " : "MISS"} for dig   search (SERPER|TAVILY|EXA)`);
console.log(`${llmOk ? "OK  " : "MISS"} for dig   dig LLM (GROQ|GEMINI|MISTRAL|NVIDIA)`);
if (!searchOk || !llmOk) {
  console.log("\nWARN  bureauIntegrity will be critical until search + dig LLM keys are set and API restarted.");
}

const auto = String(process.env.ENABLE_AUTO_PIPELINE || "false").toLowerCase();
console.log(`${auto === "false" || auto === "0" || auto === "" ? "OK  " : "WARN"} flag     ENABLE_AUTO_PIPELINE should be false (now: ${auto || "unset→false"})`);

console.log("\nOptional:");
for (const k of optional) {
  console.log(`${present(k) ? "OK  " : "—   "} optional ${k}`);
}

console.log(bad ? `\nRESULT  incomplete (${bad} required missing)` : "\nRESULT  required slots present");
process.exit(bad ? 1 : 0);
