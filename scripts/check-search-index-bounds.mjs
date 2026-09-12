import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bm25 = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/bm25.ts"), "utf8");
const tfidf = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/tfidf-embedder.ts"), "utf8");
const checks = [
  ["BM25 corpus is bounded", /APEX_MAX_BM25_INDEX_DOCS/.test(bm25) && /limit\(MAX_BM25_INDEX_DOCS\(\)\)/.test(bm25)],
  ["BM25 per-document text is bounded", /MAX_DOC_TEXT_CHARS\s*=\s*2_000/.test(bm25) && /\.slice\(0, MAX_DOC_TEXT_CHARS\)/.test(bm25)],
  ["BM25 query and topK are bounded", /query\.slice\(0, 2_000\)/.test(bm25) && /safeTopK/.test(bm25)],
  ["BM25 term frequency is precomputed", /termCounts: Map<string, number>/.test(bm25) && /doc\.termCounts\.get\(qTerm\)/.test(bm25)],
  ["TF-IDF corpus is bounded", /APEX_MAX_TFIDF_CORPUS_DOCS/.test(tfidf) && /limit\(MAX_TFIDF_CORPUS_DOCS\(\)\)/.test(tfidf)],
  ["TF-IDF per-document text is bounded", /MAX_DOC_TEXT_CHARS\s*=\s*2_000/.test(tfidf) && /\.slice\(0, MAX_DOC_TEXT_CHARS\)/.test(tfidf)],
  ["TF-IDF query and topK are bounded", /safeQuery = query\.trim\(\)\.slice\(0, 2_000\)/.test(tfidf) && /safeTopK/.test(tfidf)],
];
const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("SEARCH INDEX BOUNDS: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("SEARCH INDEX BOUNDS: PASS");
