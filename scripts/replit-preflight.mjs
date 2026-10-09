#!/usr/bin/env node
/** Presence-only check for active provider keys and required operator auth controls; never prints values. */
const AUTH_NAMES = ["APEX_API_AUTH_TOKEN","APEX_OPERATOR_PASSWORD","APEX_SESSION_SECRET"];
const NAMES = ["COMPANIES_HOUSE_API_KEY","EXA_API_KEY","GROQ_BOSS_API_KEY","GROQ_RIGHT_HAND_API_KEY","GROQ_INVESTIGATOR_API_KEY","HF_TOKEN","GROQ_INVESTIGATOR_API_KEY_1","REDIS_URL_1","SCRAPFLY_API_KEY","SERPAPI_KEY","SERPER_API_KEY","TAVILY_API_KEY","ZENROWS_API_KEY"];
function value(name) { const raw = process.env[name]; return raw == null ? "" : String(raw).trim(); }
function present(name) { const v = value(name); return Boolean(v && !v.includes("YOUR_")); }
console.log("Apex Atlas preflight — active provider secrets (presence only).\n");
let providerMiss = 0;
let authMiss = 0;
for (const k of NAMES) { const ok = present(k); if (!ok) providerMiss++; console.log(`${ok ? "SET " : "MISS "} ${k}`); }
for (const k of AUTH_NAMES) { const ok = present(k) && value(k).length >= (k === "APEX_OPERATOR_PASSWORD" ? 16 : 32); if (!ok) authMiss++; console.log(`${ok ? "SET " : "MISS "} ${k} (presence/length only)`); }
if (present("DATABASE_URL")) console.log("\nOK    DATABASE_URL (platform-managed — not an operator ask)"); else console.log("\nNOTE  DATABASE_URL not in process env (platform may inject it at runtime)");
for (const k of ["DEEPSEEK_API_KEY","WHOISJSON_API_KEY","WHOXY_API_KEY","WHOXY_KEY","NVIDIA_NIM_API_KEY"]) if (present(k)) console.log(`NOTE  ${k} present — retired/legacy and not part of the active contract.`);
if (providerMiss) console.log(`\n${providerMiss} active provider secret(s) are missing.`); else console.log("All 13 active provider/integration secrets are present.");
if (authMiss) console.log(`${authMiss} required operator authentication control(s) are missing or below minimum length.`); else console.log("All 3 required operator authentication controls are configured.");
console.log("No secrets were modified.");
process.exit(providerMiss || authMiss ? 1 : 0);
