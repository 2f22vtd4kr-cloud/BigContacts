import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "artifacts/api-server/src/src/lib/semantic-engine.ts"), "utf8");
const checks = [
  ["embedding cache has a bounded configurable ceiling", /APEX_MAX_EMBEDDING_CACHE_ENTRIES/.test(source) && /MAX_EMBEDDING_CACHE_ENTRIES/.test(source)],
  ["embedding insertion evicts oldest entries before exceeding the ceiling", /while\s*\(_embCache\.size\s*>=\s*MAX_EMBEDDING_CACHE_ENTRIES\(\)\)/.test(source) && /_embCache\.delete\(oldest\)/.test(source)],
  ["Redis hydration stops at the same ceiling", /if\s*\(_embCache\.size\s*>=\s*MAX_EMBEDDING_CACHE_ENTRIES\(\)\)\s*break/.test(source)],
  ["stored embeddings are dimension validated", /emb\.length !== 384/.test(source) && /byteLength !== 384 \* 4/.test(source)],
  ["semantic query and topK workloads are bounded", /safeQuery = query\.trim\(\)\.slice\(0, 2_000\)/.test(source) && /safeTopK/.test(source)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("SEMANTIC CACHE BOUNDS: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("SEMANTIC CACHE BOUNDS: PASS");
