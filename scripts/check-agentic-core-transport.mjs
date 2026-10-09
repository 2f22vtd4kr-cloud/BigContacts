#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const core = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research-core.ts"), "utf8");
const ssrf = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/ssrf-safe-fetch.ts"), "utf8");
const browser = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/browser-fetch-core.ts"), "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };
assert(/from "\.\/ssrf-safe-fetch"/.test(core), "ReAct core does not import the canonical SSRF-safe transport.");
assert(/safeOutboundFetch\("https:\/\/api\.groq\.com/.test(core), "Groq Investigator calls do not use safeOutboundFetch.");
assert(/gatedSafeOutboundFetch\("https:\/\/google\.serper\.dev/.test(core) && /gatedSafeOutboundFetch[\s\S]*?safeOutboundFetch\(input, init\)/.test(core), "Serper search calls do not use the gated SSRF-safe transport.");
assert(/gatedSafeOutboundFetch\("https:\/\/api\.tavily\.com/.test(core), "Tavily search calls do not use the gated SSRF-safe transport.");
assert(/gatedSafeOutboundFetch\("https:\/\/api\.exa\.ai/.test(core), "Exa search calls do not use the gated SSRF-safe transport.");
assert(/gatedSafeOutboundFetch\(url/.test(core), "Investigator page visits do not use the gated SSRF-safe transport.");
assert(!/\bfetch\(/.test(core), "ReAct core still contains a direct fetch call outside the canonical transport boundary.");
assert(/redirect: "manual"/.test(ssrf), "Canonical SSRF transport does not force manual redirect semantics.");
assert(/MAX_RESPONSE_BYTES/.test(ssrf) && /res\.destroy/.test(ssrf), "Canonical SSRF transport is missing its streaming response ceiling.");
assert(/MAX_REQUEST_BYTES/.test(ssrf) && /readRequestBodyCapped/.test(ssrf), "Canonical SSRF transport is missing a bounded request-body ceiling.");
assert(/runProviderCall\\(\\{ provider, account: new URL\\(url\\)\\.hostname, signal \\}, \\(\\) => safeOutboundFetch\\(url, init\\)\\)/.test(browser), "browser scraping provider calls must use the canonical SSRF-safe transport.");
assert(!/runProviderCall\\(\\{ provider, account: new URL\\(url\\)\\.hostname, signal \\}, \\(\\) => fetch\\(url, init\\)\\)/.test(browser), "browser provider adapters must not bypass the canonical transport via direct fetch.");
if (failures.length) { console.error("AGENTIC CORE TRANSPORT: FAIL"); for (const f of failures) console.error(`- ${f}`); process.exit(1); }
console.log("AGENTIC CORE TRANSPORT: PASS");
