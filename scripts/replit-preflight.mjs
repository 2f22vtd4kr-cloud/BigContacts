#!/usr/bin/env node
/** Presence/shape-only. Validates the canonical 14 provider/integration names; never prints values. */
const NAMES = [
  "REDIS_URL_1",
  "GROQ_API_KEY",
  "GEMINI_API_KEY",
  "DEEPSEEK_API_KEY",
  "MISTRAL_API_KEY",
  "HF_TOKEN",
  "SERPER_API_KEY",
  "TAVILY_API_KEY",
  "SERPAPI_KEY",
  "EXA_API_KEY",
  "SCRAPFLY_API_KEY",
  "ZENROWS_API_KEY",
  "COMPANIES_HOUSE_API_KEY",
  "WHOISJSON_API_KEY",
];
function value(name) {
  const raw = process.env[name];
  return raw == null ? "" : String(raw).trim();
}
function present(name) {
  const v = value(name);
  return Boolean(v && !v.includes("YOUR_"));
}
console.log("Apex Atlas preflight — canonical 14 provider/integration secrets (1 Redis, 1 EXA, DeepSeek right-hand, no WHOXY, no DATABASE_URL ask).\n");
let miss = 0;
for (const k of NAMES) {
  let ok = present(k);
  if (k === "REDIS_URL_1" && !ok) ok = present("REDIS_URL");
  if (k === "EXA_API_KEY" && !ok) ok = present("EXA_1") || present("EXA_2");
  if (!ok) miss++;
  console.log(`${ok ? "SET " : "MISS"}  ${k}`);
}
if (present("DATABASE_URL")) console.log("OK    DATABASE_URL (platform-managed — not an operator ask)");
else console.log("NOTE  DATABASE_URL not in process env (Replit may inject at runtime)");
console.log("NOTE  API/browser authentication controls (APEX_API_AUTH_TOKEN, APEX_OPERATOR_PASSWORD, APEX_SESSION_SECRET) are deployment security configuration, not part of the canonical 14 provider/integration secret list.");
if (present("WHOXY_API_KEY") || present("WHOXY_KEY")) {
  console.log("NOTE  WHOXY is set but not part of the ask-list (legacy).");
}
for (const k of ["REDIS_URL_2", "REDIS_URL_3", "REDIS_URL_4", "REDIS_URL_5"]) {
  if (present(k)) console.log(`NOTE  ${k} present — prefer REDIS_URL_1 only on free tier`);
}
if (present("NVIDIA_NIM_API_KEY")) console.log("NOTE  NVIDIA_NIM_API_KEY is present but obsolete for the canonical DeepSeek right-hand role.");
console.log(miss ? `\n${miss} missing or invalid — operator completes provider Secrets.` : "\nAll canonical 14 provider/integration names are present.");
console.log("No secrets were modified.");
process.exit(0);
