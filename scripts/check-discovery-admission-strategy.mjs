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

// The selected supporting event carries the same token-boundary identity proof
// that is persisted as source evidence; do not require duplicate matcher calls.
const matcherCallCount = (source.match(/candidateIdentityObserved\(name,\s*payload\.observation\)/g) ?? []).length;
const importsSharedMatcher = /import\s*\{[^}]*\bcandidateIdentityObserved\b[^}]*\}\s*from\s*["\']\.\/identity-text-match["\']/.test(source);
const matcherUsesTokenBoundaries = identityMatcher.includes("` ${normalizedText} `.includes(` ${normalizedName} `)");

if (!importsSharedMatcher || matcherCallCount < 1 || !matcherUsesTokenBoundaries || !identityMatcher.includes("normalizedName.length >= 3") || !source.includes("supportingEventId: supportingEvent.id") || !source.includes("sourceUrl: normalizedSource")) {
  throw new Error("Canonical discovery admission must bind persisted evidence to the same token-boundary identity-supporting event.");
}

if (!/db\.transaction\(async \(tx\) => \{[\s\S]*tx\.update\(researchCasesTable\)[\s\S]*tx\.insert\(researchCaseEventsTable\)/.test(source)) {
  throw new Error("Canonical discovery projection and immutable admission event must be persisted atomically.");
}

if (!source.includes("function materializeAtlasAdmissions")) {
  throw new Error("Canonical Atlas admission function is missing; discovery admission boundary cannot be verified.");
}


const durableAdmissionChecks = [
  ["all equivalent promoted candidate findings contribute their source URLs", source.includes("candidateSourceUrlsForIdentity({") && source.includes("findings: input.findings")],
  ["search-result endpoints are excluded from claim-grade discovery evidence", source.includes("isClaimGradeDiscoverySourceUrl") && source.includes("isClaimGradeSourceUrl: isClaimGradeDiscoverySourceUrl")],
  ["case projection and control receive only durable supporting URLs", source.includes("admittedCandidateSources.map(({ name, sourceUrls })") && source.includes("admittedCandidates: admittedCandidateSources.map(({ name, sourceUrls })")],

  ["only source-backed durable admissions are returned to control", source.includes("return { names: durableCandidates.map(({ name }) => name), candidates: durableCandidates, materialized, evidenceRows }") && source.includes("if (materializedAdmission.durableEvidence) durableCandidateSources.push({ name, sourceUrl: normalizedSource })")],
  ["admission requires a successful retrieved page in the same Investigator run", /payload\.runId === input\.discoveryRunId[\s\S]*directSourceAction[\s\S]*payload\.execution === "success"[\s\S]*candidateSourceUrls\.includes\(normalized\)/.test(source)],
  ["a missing admission evidence session fails the transaction closed", source.includes("if (!session?.id) throw new Error(")],
  ["discovery-only completion requires at least one durable admission", /const durableStatus = discovery\.status === "completed" && discovery\.stopReason === "MODEL_DECIDED_DONE" && !investigatorResourceLimited && admitted\.length > 0 \? "complete" : "review"/.test(source)],
  ["discovery terminal authority cannot be set by model completion alone", /latestEvidenceBackedTerminal: "discovery" \| "target" \| null = discovery\.status === "completed" && discovery\.stopReason === "MODEL_DECIDED_DONE" && admitted\.length > 0 \? "discovery" : null/.test(source)],
  ["candidate deduplication uses the shared normalized identity", source.includes("normalizeCandidateIdentityName(name)") && source.includes("const identity = normalizeCandidateIdentityName(name)")],
];
for (const [name, ok] of durableAdmissionChecks) {
  console.log((ok ? "PASS " : "FAIL ") + name);
  if (!ok) process.exitCode = 1;
}

console.log("Discovery admission strategy guard passed.");
