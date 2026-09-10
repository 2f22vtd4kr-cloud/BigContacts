import fs from "node:fs";

const targetPath = "artifacts/api-server/src/src/lib/agentic-web-research-core.ts";
let source = fs.readFileSync(targetPath, "utf8");

const stale = 'const result = await lookupDomainSurface(action.domain);';
const canonical = 'const result = await lookupDomainSurface(action.domain, { signal: runController.signal });';

if (source.includes(canonical)) {
  console.log("agentic domain signal hardening: already applied");
  process.exit(0);
}

const matches = source.split(stale).length - 1;
if (matches !== 1) {
  throw new Error(`agentic domain signal hardening: expected exactly one canonical call, found ${matches}`);
}

source = source.replace(stale, canonical);
fs.writeFileSync(targetPath, source);
console.log("agentic domain signal hardening: applied");
