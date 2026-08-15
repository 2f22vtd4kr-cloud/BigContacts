#!/usr/bin/env node
/**
 * Replit / deploy preflight — prints which env slots are present (never values).
 * Run: node scripts/replit-preflight.mjs
 */
const required = [
  "DATABASE_URL",
  "REDIS_URL",
  "REDIS_URL_1",
];
const stronglyRecommended = [
  "REDIS_URL_2",
  "REDIS_URL_3",
  "REDIS_URL_4",
  "REDIS_URL_5",
  "GROQ_API_KEY",
  "GEMINI_API_KEY",
  "NVIDIA_NIM_API_KEY",
  "MISTRAL_API_KEY",
  "TAVILY_API_KEY",
  "SERPER_API_KEY",
  "SCRAPFLY_API_KEY",
  "ZENROWS_API_KEY",
  "WHOISJSON_API_KEY",
  "WHOISJSON_KEY",
  "WHOXY_API_KEY",
  "COMPANIES_HOUSE_API_KEY",
  "HF_TOKEN",
  "EXA_API_KEY",
  "EXA_API_KEY_1",
  "EXA_API_KEY_2",
];
const flags = [
  "ENABLE_AUTO_PIPELINE",
  "RESEARCH_DEPTH",
  "LOG_LEVEL",
  "PORT",
  "PLAYWRIGHT_ENABLED",
];

function present(name) {
  const v = process.env[name];
  return Boolean(v && String(v).trim() && !String(v).includes("YOUR_"));
}

console.log("Apex Atlas — env preflight (presence only)\n");
let missingReq = 0;
for (const k of required) {
  const ok = present(k);
  if (!ok) missingReq++;
  console.log(`${ok ? "OK " : "MISS"}  required  ${k}`);
}
console.log("");
for (const k of stronglyRecommended) {
  console.log(`${present(k) ? "OK " : "—  "}  recommend ${k}`);
}
console.log("");
for (const k of flags) {
  const v = process.env[k];
  console.log(`FLAG  ${k}=${v === undefined ? "(unset)" : JSON.stringify(v)}`);
}
console.log("");
if (process.env.ENABLE_AUTO_PIPELINE === "true") {
  console.log("WARN: ENABLE_AUTO_PIPELINE=true — continuous runs enabled. Prefer false until intentional.");
}
if (missingReq) {
  console.log(`FAIL: ${missingReq} required env missing. API may boot degraded or refuse DB.`);
  process.exit(1);
}
console.log("PASS: required env present. Still restart API after secret changes; curl /api/healthz.");
