import fs from "node:fs";

const path = "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts";
const source = fs.readFileSync(path, "utf8");
const identityMatcherPath = "artifacts/api-server/src/src/lib/identity-text-match.ts";
const identityMatcher = fs.readFileSync(identityMatcherPath, "utf8");

const forbidden = [
  /\.slice\(0,\s*input\.maxCandidates\)/,
  /\.slice\(0,\s*targetCount\)/,
];

const violations = forbidden.filter((pattern) => pattern.test(source));
if (violations.length) {
  throw new Error(
    "Canonical discovery must not deterministically truncate model-admitted candidates. Enforce hard resource limits without selecting the first N candidates."
  );
}

// Keep the runtime's shared, token-boundary matcher on both the admission
// support check and the evidence-event lookup. Checking only a local helper
// definition allowed substring matching to be reintroduced at call sites.
const matcherCallCount = (source.match(/candidateIdentityObserved\(name,\s*payload\.observation\)/g) ?? []).length;
const importsSharedMatcher = /import\s*\{\s*candidateIdentityObserved\s*\}\s*from\s*["']\.\/identity-text-match["']/.test(source);
const matcherUsesTokenBoundaries = identityMatcher.includes("` ${normalizedText} `.includes(` ${normalizedName} `)");

if (!importsSharedMatcher || matcherCallCount < 2 || !matcherUsesTokenBoundaries || !identityMatcher.includes("normalizedName.length >= 3")) {
  throw new Error("Canonical discovery admission must use the shared token-boundary identity matcher for both observation support and persisted evidence.");
}

if (!/db\.transaction\(async \(tx\) => \{[\s\S]*tx\.update\(researchCasesTable\)[\s\S]*tx\.insert\(researchCaseEventsTable\)/.test(source)) {
  throw new Error("Canonical discovery projection and immutable admission event must be persisted atomically.");
}

if (!source.includes("function materializeAtlasAdmissions")) {
  throw new Error("Canonical Atlas admission function is missing; discovery admission boundary cannot be verified.");
}

console.log("Discovery admission strategy guard passed.");
