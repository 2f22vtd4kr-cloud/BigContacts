import fs from "node:fs";

const route = fs.readFileSync("artifacts/api-server/src/src/routes/search.ts", "utf8");
const orchestrator = fs.readFileSync("artifacts/api-server/src/src/lib/agent-orchestrator.ts", "utf8");
const checks = [
  ["query length is bounded", /MAX_QUERY_CHARS\s*=\s*2_000/.test(route) && /slice\(\s*0\s*,\s*MAX_QUERY_CHARS\s*\)/.test(route)],
  ["filter cardinality is bounded", /MAX_FILTER_VALUES\s*=\s*25/.test(route) && /slice\(\s*0\s*,\s*MAX_FILTER_VALUES\s*\)/.test(route)],
  ["search result limit is bounded", /Math\.min\(\s*200/.test(route) && /Math\.min\(\s*50/.test(route)],
  ["offset is bounded and non-negative", /MAX_OFFSET\s*=\s*100_000/.test(route) && /Math\.max\(\s*0/.test(route)],
  ["asset lookup uses parameterized inArray", /inArray\(assetsTable\.ownerEntityId\s*,\s*ids\)/.test(route) && !/ARRAY\[\$\{ids\.join/.test(route)],
  ["filter booleans require literal true", /body\.hotOnly\s*===\s*true/.test(route) && /body\.filterHasContact\s*===\s*true/.test(route)],
  ["intelligent search accepts the frontend source-filter contract", /filterSources=boundedStringList\(body\.filterSources\)/.test(route) && /sourceNeedle/.test(route) && /filterSources\.some/.test(route)],
  ["intelligent search geography uses token boundaries", /function containsBoundaryTerm/.test(route) && /containsBoundaryTerm\(r\.nationality,j\)/.test(route) && /containsBoundaryTerm\(r\.knownResidences,j\)/.test(route)],
  ["explicit intelligent filters are resolved before orchestration", /resolveExplicitFilterIds/.test(route) && /const forcedFilterIds=await resolveExplicitFilterIds/.test(route) && /orchestrate\([^;]*forcedFilterIds/.test(route)],
  ["orchestration carries forced eligibility into hybrid retrieval", /retrieve\(query,plan,forcedFilterIds\)/.test(orchestrator) && /if\(forcedFilterIds\)/.test(orchestrator)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("SEARCH ROUTE BOUNDS: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("SEARCH ROUTE BOUNDS: PASS");