#!/usr/bin/env node
/** Presence-only check for active provider and operator-auth secrets; never prints values. */
const NAMES = ["COMPANIES_HOUSE_API_KEY","EXA_API_KEY","GROQ_BOSS_API_KEY","GROQ_RIGHT_HAND_API_KEY","GROQ_INVESTIGATOR_API_KEY","HF_TOKEN","GROQ_INVESTIGATOR_API_KEY_1","REDIS_URL_1","SCRAPFLY_API_KEY","SERPER_API_KEY","TAVILY_API_KEY","ZENROWS_API_KEY"];
const AUTH_NAMES = ["APEX_OPERATOR_PASSWORD","APEX_API_AUTH_TOKEN","APEX_SESSION_SECRET"];
function value(name) { const raw = process.env[name]; return raw == null ? "" : String(raw).trim(); }
function present(name) { const v = value(name); return Boolean(v && !v.includes("YOUR_")); }
const developmentMode = process.env.NODE_ENV === "development";
console.log(`Apex Atlas preflight — active provider/integration secrets (presence only); operator auth: ${developmentMode ? "bypassed in development" : "required"}.\n`);
let providerMiss = 0;
for (const k of NAMES) { const ok = present(k); if (!ok) providerMiss++; console.log(`${ok ? "SET " : "MISS "} ${k}`); }
let authMiss = 0;
if (developmentMode) {
  console.log("SKIP operator-auth secrets — development mode does not require APEX_OPERATOR_PASSWORD, APEX_API_AUTH_TOKEN, or APEX_SESSION_SECRET.");
} else {
  const authMinimum = { APEX_OPERATOR_PASSWORD: 16, APEX_API_AUTH_TOKEN: 32, APEX_SESSION_SECRET: 32 };
  for (const k of AUTH_NAMES) {
    const ok = value(k).length >= authMinimum[k];
    if (!ok) authMiss++;
    console.log(`${ok ? "SET " : "MISS "} ${k} (minimum ${authMinimum[k]} characters)`);
  }
}
if (present("DATABASE_URL")) console.log("\nOK    DATABASE_URL (platform-managed — not an operator ask)"); else console.log("\nNOTE  DATABASE_URL not in process env (platform may inject it at runtime)");
for (const k of ["DEEPSEEK_API_KEY","WHOISJSON_API_KEY","WHOXY_API_KEY","WHOXY_KEY","NVIDIA_NIM_API_KEY"]) if (present(k)) console.log(`NOTE  ${k} present — retired/legacy and not part of the active contract.`);
if (providerMiss) console.log(`\n${providerMiss} active provider/integration secret(s) are missing.`); else console.log("All active provider/integration secrets are present.");
if (authMiss) console.log(`\n${authMiss} required operator-auth secret(s) are missing or too short. Protected routes will fail closed.`);
console.log("No secrets were modified.");
process.exit(providerMiss || authMiss ? 1 : 0);
