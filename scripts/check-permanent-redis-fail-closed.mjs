import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/redis.ts", "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(/export function getPermanentClient\(\): Redis \| null/.test(source), "permanent Redis client accessor missing");
assert(/return _permanentClients\.find\(/.test(source), "permanent Redis accessor must select only permanent slots");
assert(!/return alive \?\? _localClient/.test(source), "permanent Redis accessor must not fall back to local Redis");
assert(/export async function withPermanentClient[\s\S]*const client = getPermanentClient\(\)/.test(source), "permanent commands must use the permanent-only accessor");
assert(/export function getContactCacheClient[\s\S]*const slot2 = _permanentClients\[1\]/.test(source), "contact-cache fallback must remain inside permanent Redis slots");

if (failures.length) {
  console.error("PERMANENT REDIS FAIL-CLOSED: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("PERMANENT REDIS FAIL-CLOSED: PASS");
