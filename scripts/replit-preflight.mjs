#!/usr/bin/env node
/** Presence-only. Pre–master-plan set: one Redis, no WHOXY. Never prints values. */
const NAMES = [
  "DATABASE_URL",
  "REDIS_URL_1",
  "GROQ_API_KEY",
  "GEMINI_API_KEY",
  "NVIDIA_NIM_API_KEY",
  "MISTRAL_API_KEY",
  "HF_TOKEN",
  "SERPER_API_KEY",
  "TAVILY_API_KEY",
  "SERPAPI_KEY",
  "EXA_1",
  "EXA_2",
  "SCRAPFLY_API_KEY",
  "ZENROWS_API_KEY",
  "COMPANIES_HOUSE_API_KEY",
  "WHOISJSON_API_KEY",
];
function present(name) {
  const v = process.env[name];
  return Boolean(v && String(v).trim() && !String(v).includes("YOUR_"));
}
console.log("Apex Atlas preflight — full set (1 Redis, no WHOXY). No secret values.\n");
let miss = 0;
for (const k of NAMES) {
  const ok = present(k) || (k === "REDIS_URL_1" && present("REDIS_URL"));
  if (!ok) miss++;
  console.log(`${ok ? "SET " : "MISS"}  ${k}`);
}
if (present("WHOXY_API_KEY") || present("WHOXY_KEY")) {
  console.log("NOTE  WHOXY is set but not part of the boot ask-list (legacy).");
}
for (const k of ["REDIS_URL_2", "REDIS_URL_3", "REDIS_URL_4", "REDIS_URL_5"]) {
  if (present(k)) console.log(`NOTE  ${k} present — prefer REDIS_URL_1 only on free tier`);
}
console.log(miss ? `\n${miss} missing — operator completes Secrets.` : "\nAll listed names present.");
console.log("No secrets were modified.");
process.exit(0);
