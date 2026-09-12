import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/provider-gate.ts"), "utf8");
const checks = [
  ["provider waiter queue has an explicit bound", /APEX_EXTERNAL_MAX_WAITERS/.test(source) && /waiters\.length >= maxWaiters\(\)/.test(source)],
  ["aborted provider waiters are removed", /signal\?\.addEventListener\("abort"/.test(source) && /removeWaiter\(waiter\)/.test(source)],
  ["provider state cardinality is bounded", /APEX_EXTERNAL_MAX_PROVIDER_STATES/.test(source) && /providerStates\.size >= maxProviderStates\(\)/.test(source)],
  ["response cache cardinality is bounded", /APEX_EXTERNAL_MAX_RESPONSE_CACHE_ENTRIES/.test(source) && /responseCache\.size >= maxResponseCacheEntries\(\)/.test(source)],
  ["expired cache entries are pruned", /function pruneResponseCache\(now: number\)/.test(source) && /entry\.expiresAt <= now/.test(source)],
  ["cache keys strip credential query parameters", /for \(const key of \["key", "apikey", "api_key", "token"\]\) parsed\.searchParams\.delete\(key\)/.test(source)],
  ["credential-bearing cache keys retain an account fingerprint", /function cacheKey[\s\S]{0,1200}accountFingerprint\(input, init\)[\s\S]{0,500}return `\$\{provider\}\|\$\{account\}\|/.test(source)],
  ["fetch concurrency acquisition receives the request AbortSignal", /acquireConcurrency\(provider, init\?\.signal\)/.test(source)],
  ["provider snapshot aggregates keyed state instead of assuming bare provider keys", /key\.split\("\\|", 1\)/.test(source)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("PROVIDER GATE RESOURCE BOUNDS: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("PROVIDER GATE RESOURCE BOUNDS: PASS");
