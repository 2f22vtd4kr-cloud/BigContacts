import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/browser-fetch-core.ts", "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(source.includes("MAX_BROWSER_FETCH_SCOPES = 256"), "browser fetch scope map lacks a finite maximum scope count");
assert(source.includes("function rememberBrowserFetchScope"), "browser fetch scope insertion is not centralized behind the bounded allocator");
assert(/browserFetchCounts\.size\s*>=\s*MAX_BROWSER_FETCH_SCOPES/.test(source), "browser fetch scope allocator does not evict when the scope budget is full");
assert(/browserFetchCounts\.keys\(\)\.next\(\)\.value/.test(source), "browser fetch scope allocator does not evict the oldest scope");
assert(source.includes("rememberBrowserFetchScope(scope, count + 1)"), "browser fetch path does not use the bounded scope allocator");

if (failures.length) {
  console.error("BROWSER FETCH MEMORY BOUND: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("BROWSER FETCH MEMORY BOUND: PASS");
