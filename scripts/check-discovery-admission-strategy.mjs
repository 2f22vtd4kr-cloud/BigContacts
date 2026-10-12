import fs from "node:fs";

const path = "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts";
const source = fs.readFileSync(path, "utf8");
const candidateSourcePolicyPath = "artifacts/api-server/src/src/lib/candidate-source-url-union.ts";
const candidateSourcePolicy = fs.readFileSync(candidateSourcePolicyPath, "utf8");
const epistemicPath = "artifacts/api-server/src/src/lib/research-epistemic-vnext.ts";
const epistemic = fs.readFileSync(epistemicPath, "utf8");

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

// Admission is grounded in the same Investigator run, and the canonical
// source policy requires an exact, bounded name+role span on independent
// publishers. Identical supporting passages are one lineage unit, not two.
const exactRoleBoundCorroboration =
  source.includes("candidateRoleCorroborationSources") &&
  source.includes("payload.runId !== input.discoveryRunId") &&
  source.includes("sources.length >= 2") &&
  epistemic.includes("hasExactTokenBoundary") &&
  candidateSourcePolicy.includes("bindExactSourceSpan(observation.observation, role, input.personName, 320)") &&
  candidateSourcePolicy.includes("sourceLineageId(sourceUrl, passageFingerprint)") &&
  candidateSourcePolicy.includes("supporting.has(publisher)");

if (!exactRoleBoundCorroboration || !source.includes("supportingEventId: support.eventId") || !source.includes("sourceUrl: support.sourceUrl")) {
  throw new Error("Canonical discovery admission must persist candidate-specific, token-bound identity/role evidence from independent observed sources.");
}

if (!/db\.transaction\(async \(tx\) => \{[\s\S]*tx\.update\(researchCasesTable\)[\s\S]*tx\.insert\(researchCaseEventsTable\)/.test(source)) {
  throw new Error("Canonical discovery projection and immutable admission event must be persisted atomically.");
}

if (!source.includes("function materializeAtlasAdmissions")) {
  throw new Error("Canonical Atlas admission function is missing; discovery admission boundary cannot be verified.");
}


const durableAdmissionChecks = [
  ["all equivalent promoted candidate findings contribute source URLs to role corroboration", source.includes("candidateRoleCorroborationSources") && candidateSourcePolicy.includes("findings: input.findings") && candidateSourcePolicy.includes("candidateSourceUrlsForIdentity({")],
  ["search-result endpoints are excluded from claim-grade discovery evidence", source.includes("isClaimGradeDiscoverySourceUrl") && source.includes("isClaimGradeSourceUrl: isClaimGradeDiscoverySourceUrl")],
  ["case projection and control receive only durable supporting URLs", source.includes("admittedCandidateSources.map(({ name, sourceUrls })") && source.includes("admittedCandidates: admittedCandidateSources.map(({ name, sourceUrls })")],

  ["only two-source durable admissions are returned to control", source.includes("return { names: durableCandidates.map(({ name }) => name), candidates: durableCandidates, materialized, evidenceRows }") && source.includes("if (materializedAdmission.durableEvidence) durableCandidateSources.push({ name, sourceUrls: supportingSources.map((support) => support.sourceUrl) })")],
  ["admission requires two successful direct source observations in the same Investigator run", source.includes("payload.runId !== input.discoveryRunId") && source.includes("sources.length >= 2") && candidateSourcePolicy.includes('observation.action !== "visit"') && candidateSourcePolicy.includes('observation.execution !== "success"')],
  ["a missing admission evidence session fails the transaction closed", source.includes("if (!session?.id) throw new Error(")],
  ["discovery-only completion requires at least one durable admission", /const durableStatus = discovery\.status === "completed" && discovery\.stopReason === "MODEL_DECIDED_DONE" && !discoveryResourceLimited && admitted\.length > 0 \? "complete" : "review"/.test(source)],
  ["discovery terminal authority cannot be set by model completion alone", /latestEvidenceBackedTerminal: "discovery" \| "target" \| null = discovery\.status === "completed" && discovery\.stopReason === "MODEL_DECIDED_DONE" && admitted\.length > 0 \? "discovery" : null/.test(source)],
  ["candidate deduplication uses the shared normalized identity", source.includes("normalizeCandidateIdentityName(name)") && source.includes("const identity = normalizeCandidateIdentityName(name)")],
];
for (const [name, ok] of durableAdmissionChecks) {
  console.log((ok ? "PASS " : "FAIL ") + name);
  if (!ok) process.exitCode = 1;
}

console.log("Discovery admission strategy guard passed.");
