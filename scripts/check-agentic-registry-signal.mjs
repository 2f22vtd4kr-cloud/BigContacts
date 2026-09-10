import fs from "node:fs";

const registry = fs.readFileSync("artifacts/api-server/src/src/lib/registry-client.ts", "utf8");
const core = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };
assert(registry.includes("signal?: AbortSignal;"), "registry public search contract lacks AbortSignal");
assert(registry.includes("const { query, registry, limit = 10, signal } = params;"), "registry entrypoint does not read AbortSignal");
assert(registry.includes("searchSecEdgar(query.trim(), limit, signal)"), "SEC registry call does not receive AbortSignal");
assert(registry.includes("searchCompaniesHouse(query.trim(), apiKey, limit, signal)"), "Companies House registry call does not receive AbortSignal");
assert(registry.includes("signal: signal ?? AbortSignal.timeout("), "registry HTTP calls do not compose caller cancellation with bounded timeout");
assert(!/signal:\s*AbortSignal\.timeout\(/.test(registry), "registry contains timeout-only HTTP transport that ignores caller cancellation");
assert(core.includes("limit: 8, signal: runController.signal"), "canonical ReAct registry action does not pass run cancellation");
if (failures.length) {
  console.error("AGENTIC REGISTRY SIGNAL: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("AGENTIC REGISTRY SIGNAL: PASS");
