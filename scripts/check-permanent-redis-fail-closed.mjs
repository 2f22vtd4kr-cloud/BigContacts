import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/redis.ts", "utf8");
const policy = fs.readFileSync("artifacts/api-server/src/src/lib/permanent-redis-policy.ts", "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(/export function getPermanentClient\(\): Redis \| null/.test(source), "canonical permanent Redis client accessor missing");
assert(source.includes("selectCanonicalPermanentSlotIndex(_permanentClients, _quotaExhaustedSlots)"), "canonical state must select only REDIS_URL_1");
assert(!source.includes("return _permanentClients.find("), "canonical state must not fail over across independent Redis databases");
assert(policy.includes("return primary?.status === \"ready\" && !quotaExhausted.has(0) ? 0 : null"), "canonical slot policy must fail closed when primary is unavailable or exhausted");
assert(source.includes("return client ? [client] : [];"), "strict Redis callers must see only the canonical state slot");
assert(/export async function withPermanentClient[\s\S]*const client = getPermanentClient\(\)/.test(source), "stateful permanent commands must use the canonical-only accessor");
assert(/export function getContactCacheClient[\s\S]*selectContactCacheSlotIndex\(_permanentClients, _quotaExhaustedSlots\)/.test(source), "only disposable contact cache may select its own fallback");
assert(policy.includes("return secondary?.status === \"ready\" && !quotaExhausted.has(1) ? 1 : null"), "contact cache fallback is restricted to REDIS_URL_2");
assert(!/connectPermanentRedis\(\)[\s\S]{0,300}_quotaExhaustedSlots\.clear\(\)/.test(source), "reconnect must not reset sticky quota-exhaustion flags");
assert(/tryRecoverExhaustedSlots\(\): Promise<number> \{\s*return 0;/.test(source), "quota-capped slots must not be probed automatically");
assert(!/return alive \?\? _localClient/.test(source), "permanent Redis access must never fall back to local Redis");

if (failures.length) {
  console.error("PERMANENT REDIS FAIL-CLOSED: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("PERMANENT REDIS FAIL-CLOSED: PASS");
