import fs from "node:fs";

const registry = fs.readFileSync("artifacts/api-server/src/src/lib/registry-client.ts", "utf8");
const gleif = fs.readFileSync("artifacts/api-server/src/src/lib/gleif-client.ts", "utf8");
const core = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(registry.includes("signal?: AbortSignal;"), "registry public search contract lacks AbortSignal");
assert(registry.includes("const { query, registry, limit = 10, signal } = params;"), "registry entrypoint does not read AbortSignal");
assert(registry.includes("function createRegistryRequestSignal"), "registry lacks a shared timeout-plus-caller cancellation composition helper");
assert(registry.includes("AbortSignal.any([signal, timeoutSignal])"), "registry timeout helper does not compose caller cancellation with the local timeout");
assert(registry.includes("searchSecEdgar(query.trim(), limit, signal)"), "SEC registry call does not receive AbortSignal");
assert(registry.includes("searchCompaniesHouse(query.trim(), apiKey, limit, signal)"), "Companies House registry call does not receive AbortSignal");
assert(registry.includes("searchGleif(query.trim(), limit, signal)"), "GLEIF registry call does not receive AbortSignal");
for (const name of ["searchOpenCorporates", "searchCompaniesHouse", "searchSecEdgar", "searchBrreg", "searchAres", "searchBodacc", "searchCvrDenmark", "searchZefixSwitzerland", "searchOffeneregisterGermany", "searchBolagsverketSweden", "searchYtjFinland", "searchAtokaItaly", "searchBormeSpain", "searchKvkNetherlands", "searchKboBelgium"]) {
  assert(new RegExp(`async function ${name}\\([\\s\\S]*signal\\?: AbortSignal`).test(registry), `${name} lacks AbortSignal parameter`);
}
assert(gleif.includes("signal?: AbortSignal"), "GLEIF client lacks AbortSignal contract");
assert(gleif.includes("const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(12_000)]) : AbortSignal.timeout(12_000)"), "GLEIF transport does not compose caller cancellation with bounded timeout");
assert(gleif.includes("signal: requestSignal"), "GLEIF fetch does not use its composed cancellation signal");
assert(registry.includes("signal: createRegistryRequestSignal(signal,"), "registry HTTP calls do not use the composed cancellation boundary");
assert(!/signal:\s*AbortSignal\.timeout\(/.test(registry), "registry contains timeout-only HTTP transport that ignores caller cancellation");
assert(core.includes("limit: 8, signal: runController.signal"), "canonical ReAct registry action does not pass run cancellation");
if (failures.length) {
  console.error("AGENTIC REGISTRY SIGNAL: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("AGENTIC REGISTRY SIGNAL: PASS");