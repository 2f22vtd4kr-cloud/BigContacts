#!/usr/bin/env node
/** Presence-only check for core runtime, search, and operator-auth secrets; never prints values. */
const REQUIRED_NAMES = ["GROQ_BOSS_API_KEY", "GROQ_RIGHT_HAND_API_KEY", "GROQ_INVESTIGATOR_API_KEY"];
const SEARCH_PROVIDER_NAMES = ["SERPER_API_KEY", "TAVILY_API_KEY", "EXA_API_KEY"];
const OPTIONAL_NAMES = ["COMPANIES_HOUSE_API_KEY", "GROQ_INVESTIGATOR_API_KEY_1", "SCRAPFLY_API_KEY", "ZENROWS_API_KEY"];
const AUTH_NAMES = ["APEX_OPERATOR_PASSWORD", "APEX_API_AUTH_TOKEN", "APEX_SESSION_SECRET"];
function value(name) { const raw = process.env[name]; return raw == null ? "" : String(raw).trim(); }
function present(name) { const v = value(name); return Boolean(v && !v.includes("YOUR_")); }
const developmentMode = process.env.NODE_ENV === "development";
console.log(`Apex Atlas preflight — core runtime and configured integrations (presence only); operator auth: ${developmentMode ? "bypassed in development" : "required"}.\n`);
let requiredMiss = 0;
for (const k of REQUIRED_NAMES) { const ok = present(k); if (!ok) requiredMiss++; console.log(`${ok ? "SET " : "MISS "} ${k}`); }
const redisConfigured = present("REDIS_URL") || present("REDIS_URL_1");
if (!redisConfigured) requiredMiss++;
console.log(`${redisConfigured ? "SET " : "MISS "} REDIS_URL or REDIS_URL_1`);
const searchProviderConfigured = SEARCH_PROVIDER_NAMES.some(present);
if (!searchProviderConfigured) requiredMiss++;
console.log(`${searchProviderConfigured ? "SET " : "MISS "} at least one search provider (${SEARCH_PROVIDER_NAMES.join(", ")})`);
console.log("\nOptional integrations (missing keys disable only their corresponding capability):");
for (const k of OPTIONAL_NAMES) console.log(`${present(k) ? "SET " : "SKIP"} ${k}`);
for (const k of SEARCH_PROVIDER_NAMES) console.log(`${present(k) ? "SET " : "SKIP"} ${k}`);
let authMiss = 0;
if (developmentMode) {
  console.log("\nSKIP operator-auth secrets — development mode does not require APEX_OPERATOR_PASSWORD, APEX_API_AUTH_TOKEN, or APEX_SESSION_SECRET.");
} else {
  const authMinimum = { APEX_OPERATOR_PASSWORD: 16, APEX_API_AUTH_TOKEN: 32, APEX_SESSION_SECRET: 32 };
  for (const k of AUTH_NAMES) {
    const ok = value(k).length >= authMinimum[k];
    if (!ok) authMiss++;
    console.log(`${ok ? "SET " : "MISS "} ${k} (minimum ${authMinimum[k]} characters)`);
  }
}
if (present("DATABASE_URL")) console.log("\nOK    DATABASE_URL (platform-managed)"); else console.log("\nNOTE  DATABASE_URL not in process env (platform may inject it at runtime)");
for (const k of ["DEEPSEEK_API_KEY","WHOISJSON_API_KEY","WHOXY_API_KEY","WHOXY_KEY","NVIDIA_NIM_API_KEY"]) if (present(k)) console.log(`NOTE  ${k} present — retired/legacy and not part of the active contract.`);
if (requiredMiss) console.log(`\n${requiredMiss} required core runtime/search credential(s) are missing.`); else console.log("Core runtime and at least one search provider are configured.");
if (authMiss) console.log(`\n${authMiss} required operator-auth secret(s) are missing or too short. Protected routes will fail closed.`);
console.log("No secrets were modified.");
process.exit(requiredMiss || authMiss ? 1 : 0);
