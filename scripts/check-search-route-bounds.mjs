import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/routes/search.ts", "utf8");
const checks = [
  ["query length is bounded", /MAX_QUERY_CHARS\s*=\s*2_000/.test(source) && /slice\(0, MAX_QUERY_CHARS\)/.test(source)],
  ["filter cardinality is bounded", /MAX_FILTER_VALUES\s*=\s*25/.test(source) && /slice\(0, MAX_FILTER_VALUES\)/.test(source)],
  ["search result limit is bounded", /Math\.min\(200/.test(source) && /Math\.min\(50/.test(source)],
  ["offset is bounded and non-negative", /MAX_OFFSET\s*=\s*100_000/.test(source) && /Math\.max\(0/.test(source)],
  ["asset lookup uses parameterized inArray", /inArray\(assetsTable\.ownerEntityId, ids\)/.test(source) && !/ARRAY\[\$\{ids\.join/.test(source)],
  ["filter booleans require literal true", /body\.hotOnly === true/.test(source) && /body\.filterHasContact === true/.test(source)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("SEARCH ROUTE BOUNDS: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("SEARCH ROUTE BOUNDS: PASS");
