import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");
const canonical = 'lookupDomainSurface(action.domain, { signal: runController.signal })';
const stale = 'lookupDomainSurface(action.domain)';

if (!source.includes(canonical)) {
  throw new Error("agentic domain signal invariant failed: canonical domain lookup does not receive runController.signal");
}
if (source.includes(stale)) {
  throw new Error("agentic domain signal invariant failed: stale uncancelled domain lookup remains");
}
console.log("agentic domain signal invariant: PASS");
