#!/usr/bin/env node
/**
 * Presence-only preflight for the FULL secret set (no required/optional tiers).
 * Never prints values. Never writes Secrets.
 */
const NAMES = [
  "DATABASE_URL",
  "REDIS_URL",
  "REDIS_URL_1",
  "REDIS_URL_2",
  "REDIS_URL_3",
  "REDIS_URL_4",
  "REDIS_URL_5",
  "GEMINI_API_KEY",
  "NVIDIA_NIM_API_KEY",
  "GROQ_API_KEY",
  "MISTRAL_API_KEY",
  "SERPER_API_KEY",
  "TAVILY_API_KEY",
  "EXA_API_KEY",
  "EXA_1",
  "EXA_2",
  "SCRAPFLY_API_KEY",
  "ZENROWS_API_KEY",
  "WHOISJSON_API_KEY",
  "WHOXY_API_KEY",
  "COMPANIES_HOUSE_API_KEY",
  "HF_TOKEN",
];

function present(name) {
  const v = process.env[name];
  return Boolean(v && String(v).trim() && !String(v).includes("YOUR_"));
}

console.log("Apex Atlas — full secrets presence (no tiers). Do not edit Secrets here.\n");
let miss = 0;
for (const k of NAMES) {
  const ok = present(k);
  if (!ok) miss++;
  console.log(`${ok ? "SET " : "MISS"}  ${k}`);
}
const auto = String(process.env.ENABLE_AUTO_PIPELINE || "").toLowerCase();
console.log(`\nFLAG  ENABLE_AUTO_PIPELINE=${auto || "unset (treat as false)"}`);
console.log(miss ? `\n${miss} names missing from process env — operator must complete Secrets for a full bureau.` : "\nAll listed names present in process env.");
console.log("No secrets were modified.");
process.exit(0);
