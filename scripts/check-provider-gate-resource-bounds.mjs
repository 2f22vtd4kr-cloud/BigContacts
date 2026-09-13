import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/provider-gate.ts"), "utf8");
const checks = [
  ["provider waiter queue has an explicit bound", /maxWaiters\s*=\s*\(\)\s*=>?/.test(source) && /waiters\.length\s*>=\s*maxWaiters\(\)/.test(source) || /maxWaiters\(\)/.test(source) && /waiters\.length\s*>=\s*maxWaiters\(\)/.test(source)],
  ["aborted provider waiters are removed", /signal\?\.addEventListener\(\s*"abort"/.test(source) && /removeWaiter\(waiter\)/.test(source)],
  ["provider state cardinality is bounded", /maxProviderStates\s*=/.test(source) && /providerStates\.size\s*>=\s*maxProviderStates\(\)/.test(source)],
  ["response cache cardinality is bounded", /maxResponseCacheEntries\s*=/.test(source) && /responseCache\.size\s*>=\s*maxResponseCacheEntries\(\)/.test(source)],
  ["response cache aggregate bytes are bounded", /maxResponseCacheBytes\s*=/.test(source) && /responseCacheBytes\s*\+\s*bytes\s*>\s*limit/.test(source)],
  ["expired cache entries are pruned", /function pruneResponseCache\(now:number\)/.test(source) && /entry\.expiresAt\s*<=\s*now/.test(source)],
  ["credential query parameters are normalized before cache identity", /QUERY_CREDENTIAL_KEYS/.test(source) && /stripCredentialQueryParams\(parsed\)/.test(source) && /key\.toLowerCase\(\)/.test(source)],
  ["credential-bearing GETs are excluded from the public cache", /headers\.has\(\"authorization\"\)/.test(source) && /headers\.has\(\"x-api-key\"\)/.test(source) && /headers\.has\(\"cookie\"\)/.test(source) && /return null/.test(source)],
  ["cache identity includes common content variants", /headers\.get\(\"accept\"\)/.test(source) && /headers\.get\(\"accept-language\"\)/.test(source) && /headers\.get\(\"user-agent\"\)/.test(source) && /variantHash/.test(source)],
  ["private and Set-Cookie responses are excluded from cache", /hasSetCookie/.test(source) && /no-store\|private/.test(source)],
  ["incoming response size is checked against the aggregate cache budget", /body\.byteLength<=maxResponseCacheBytes\(\)/.test(source) && /makeRoomForResponse\(body\.byteLength\)/.test(source)],
  ["fetch concurrency acquisition receives the request AbortSignal", /acquireConcurrency\(provider,init\?\.signal\)/.test(source)],
  ["provider/account state keys remain composite and bounded", /providerStateKey\(provider:ExternalProvider,account:string\):string=>`\$\{provider\}\|\$\{account\}`/.test(source) && /maxProviderStates\(\)/.test(source)],
  ["provider snapshot aggregates composite state by provider", /const provider=key\.split\(\"\\|\",1\)/.test(source) && /byProvider\.get\(provider\)/.test(source) && /byProvider\.set\(provider,current\)/.test(source)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("PROVIDER GATE RESOURCE BOUNDS: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("PROVIDER GATE RESOURCE BOUNDS: PASS");
