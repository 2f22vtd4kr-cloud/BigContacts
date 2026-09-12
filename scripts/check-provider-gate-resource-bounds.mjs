import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/provider-gate.ts"), "utf8");
const checks = [
  ["provider waiter queue has an explicit bound", /APEX_EXTERNAL_MAX_WAITERS/.test(source) && /waiters\.length >= maxWaiters\(\)/.test(source)],
  ["aborted provider waiters are removed", /signal\?\.addEventListener\("abort"/.test(source) && /removeWaiter\(waiter\)/.test(source)],
  ["provider state cardinality is bounded", /APEX_EXTERNAL_MAX_PROVIDER_STATES/.test(source) && /providerStates\.size >= maxProviderStates\(\)/.test(source)],
  ["response cache cardinality is bounded", /APEX_EXTERNAL_MAX_RESPONSE_CACHE_ENTRIES/.test(source) && /responseCache\.size >= maxResponseCacheEntries\(\)/.test(source)],
  ["response cache aggregate bytes are bounded", /APEX_EXTERNAL_MAX_RESPONSE_CACHE_BYTES/.test(source) && /responseCacheBytes/.test(source) && /responseCacheBytes \+ bytes > limit/.test(source)],
  ["expired cache entries are pruned", /function pruneResponseCache\(now: number\)/.test(source) && /entry\.expiresAt <= now/.test(source)],
  ["credential query parameters are normalized before cache identity", /QUERY_CREDENTIAL_KEYS/.test(source) && /stripCredentialQueryParams\(parsed\)/.test(source) && /key\.toLowerCase\(\)/.test(source)],
  ["credential-bearing GETs are excluded from the public cache", /headers\.has\("authorization"\)/.test(source) && /headers\.has\("x-api-key"\)/.test(source) && /headers\.has\("cookie"\)/.test(source) && /return null/.test(source)],
  ["cache identity includes common content variants", /headers\.get\("accept"\)/.test(source) && /headers\.get\("accept-language"\)/.test(source) && /headers\.get\("user-agent"\)/.test(source) && /variantHash/.test(source)],
  ["private and Set-Cookie responses are excluded from cache", /hasSetCookie/.test(source) && /no-store\|private/.test(source)],
  ["incoming response size is checked against the aggregate cache budget", /body\.byteLength <= maxResponseCacheBytes\(\)/.test(source) && /makeRoomForResponse\(body\.byteLength\)/.test(source)],
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
