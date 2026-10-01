#!/usr/bin/env node
/** Presence/shape-only. Validates the canonical provider/integration names and separate API security controls; never prints values. */
const NAMES = ["REDIS_URL_1","GROQ_API_KEY","GEMINI_API_KEY","MISTRAL_API_KEY","HF_TOKEN","SERPER_API_KEY","TAVILY_API_KEY","SERPAPI_KEY","EXA_API_KEY","SCRAPFLY_API_KEY","ZENROWS_API_KEY","COMPANIES_HOUSE_API_KEY","GEMINI_RIGHT_HAND_API_KEY"];
const AUTH = { APEX_API_AUTH_TOKEN: 32, APEX_OPERATOR_PASSWORD: 16, APEX_SESSION_SECRET: 32 };
function value(name) { const raw = process.env[name]; return raw == null ? "" : String(raw).trim(); }
function present(name) { const v = value(name); return Boolean(v && !v.includes("YOUR_")); }
function validAtLeast(name, minimum) { const v = value(name); return Boolean(v && !v.includes("YOUR_") && v.length >= minimum); }
console.log("Apex Atlas preflight — canonical 13 provider/integration secrets + separate API security boundary.\n");
let providerMiss = 0;
for (const k of NAMES) { let ok = present(k); if (k === "REDIS_URL_1" && !ok) ok = present("REDIS_URL"); if (!ok) providerMiss++; console.log(`${ok ? "SET " : "MISS"}  ${k}`); }
let authMiss = 0;
console.log("\nSeparate API/browser authentication controls (not counted among provider/integration keys):");
for (const [k, minimum] of Object.entries(AUTH)) { const ok = validAtLeast(k, minimum); if (!ok) authMiss++; console.log(`${ok ? "SET " : "MISS"}  ${k} (min ${minimum} chars)`); }
if (present("DATABASE_URL")) console.log("\nOK    DATABASE_URL (platform-managed — not an operator ask)"); else console.log("\nNOTE  DATABASE_URL not in process env (platform may inject it at runtime)");
for (const k of ["DEEPSEEK_API_KEY","WHOISJSON_API_KEY","WHOXY_API_KEY","WHOXY_KEY","NVIDIA_NIM_API_KEY"]) if (present(k)) console.log(`NOTE  ${k} present — retired/legacy and not part of the active contract.`);
const totalMissing = providerMiss + authMiss;
if (totalMissing) console.log(`\n${totalMissing} required value(s) missing or invalid — complete the active provider secrets and/or deployment authentication controls.`); else console.log("\nAll active provider/integration names and the separate production authentication boundary are valid.");
console.log("No secrets were modified.");
process.exit(totalMissing ? 1 : 0);
