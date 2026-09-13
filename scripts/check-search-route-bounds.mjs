import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/routes/search.ts", "utf8");
const checks = [
  ["query length is bounded", /MAX_QUERY_CHARS\s*=\s*2_000/.test(source) && /slice\(\s*0\s*,\s*MAX_QUERY_CHARS\s*\)/.test(source)],
  ["filter cardinality is bounded", /MAX_FILTER_VALUES\s*=\s*25/.test(source) && /slice\(\s*0\s*,\s*MAX_FILTER_VALUES\s*\)/.test(source)],
  ["search result limit is bounded", /Math\.min\(\s*200/.test(source) && /Math\.min\(\s*50/.test(source)],
  ["offset is bounded and non-negative", /MAX_OFFSET\s*=\s*100_000/.test(source) && /Math\.max\(\s*0/.test(source)],
  ["asset lookup uses parameterized inArray", /inArray\(assetsTable\.ownerEntityId\s*,\s*ids\)/.test(source) && !/ARRAY\[\$\{ids\.join/.test(source)],
  ["filter booleans require literal true", /body\.hotOnly\s*===\s*true/.test(source) && /body\.filterHasContact\s*===\s*true/.test(source)],
  ["intelligent search accepts the frontend source-filter contract", /filterSources=boundedStringList\(body\.filterSources\)/.test(source) && /sourceNeedle/.test(source) && /filterSources\.some/.test(source)],
  ["intelligent search geography uses token boundaries", /function containsBoundaryTerm/.test(source) && /containsBoundaryTerm\(r\.nationality,j\)/.test(source) && /containsBoundaryTerm\(r\.knownResidences,j\)/.test(source)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("SEARCH ROUTE BOUNDS: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("SEARCH ROUTE BOUNDS: PASS");