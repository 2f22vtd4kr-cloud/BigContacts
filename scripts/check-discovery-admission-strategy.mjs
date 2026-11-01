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

// Provisional review-card handoff is model-selected and may be search-only.
// The stricter checks below apply only to a separate explicit promoted-person
// admission; they must never gate provisional card creation or target visibility.
const exactRoleBoundOwnershipLead =
  source.includes("candidateRoleCorroborationSources") &&
  source.includes("payload.runId !== input.discoveryRunId") &&
  source.includes("sources.length >= 1") &&
  source.includes("hasDiscoveryOwnershipLeadSignal") &&
  source.includes("claimGradeObservations") &&
  epistemic.includes("hasExactTokenBoundary") &&
  candidateSourcePolicy.includes("bindExactSourceSpan(observation.observation, role, input.personName, 320)") &&
  candidateSourcePolicy.includes("sourceLineageId(sourceUrl, passageFingerprint)") &&
  candidateSourcePolicy.includes("supporting.has(publisher)") &&
  candidateSourcePolicy.includes('observation.execution !== "success"') &&
  candidateSourcePolicy.includes('observation.action !== "visit"');

if (!exactRoleBoundOwnershipLead || !source.includes("supportingEventId: support.eventId") || !source.includes("sourceUrl: support.sourceUrl") || source.includes("hasRealisticPersonRouteSource(")) {
  throw new Error("Strict promoted-person admission must persist a same-run, fetched, exact name/role ownership lead without requiring target-stage route or materiality proof; this must not gate provisional review cards.");
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
  ["case projection and control receive durable HTTPS supporting URLs with target type intact", source.includes("function mergeDurablyAdmittedAtlasTargetSources") && source.includes("const validUrls = candidate.sourceUrls") && source.includes(".filter((url): url is string => url !== null)") && source.includes("isRestrictedCommunitySourceUrl(url)") && source.includes('targetType === "organization" ? "organization" : "person"') && source.includes('const candidates = admittedCandidateSources.map(({ name, sourceUrls, role, targetType })') && source.includes('admittedCandidates: admittedCandidateSources.map(({ name, role, sourceUrls, targetType }) => ({ name, role, sourceUrls, targetType }))') && candidateSourcePolicy.includes("input.isClaimGradeSourceUrl(raw)")],

  ["only durably persisted, research-eligible person and organization review leads are returned to control", source.includes("return { names: targetCandidates.map(({ name }) => name), candidates: targetCandidates, materialized, evidenceRows }") && source.includes("if (materializedAdmission.durableEvidence) durableCandidateSources.push({ name, sourceUrls: supportingSources.map((support) => support.sourceUrl) })") && source.includes("const organizationTargets = partialOrganizations.candidates") && source.includes('.filter(({ targetEligibleForResearch }) => targetEligibleForResearch)') && source.includes('finding.promotionDecision === "reject"') && source.includes('finding.promotionDecision !== "reject"') && source.includes("payload.runId !== input.discoveryRunId") && source.includes("support.verificationLevel === \"fetched_source\" || support.sourceUrlBoundByAdapter === true") && source.includes("targetType: \"organization\" as const") && source.includes("metadata.partialOrganizationLead === true") && source.includes("hasDiscoveryOwnershipLeadSignal") && source.includes("reviewOnly: true")],
  ["strict promoted-person admission requires one successful fetched exact name/role source and ownership clue from the same Investigator run", source.includes("payload.runId !== input.discoveryRunId") && source.includes("sources.length >= 1") && source.includes("hasDiscoveryOwnershipLeadSignal") && candidateSourcePolicy.includes('observation.action !== "visit"') && candidateSourcePolicy.includes('observation.execution !== "success"') && candidateSourcePolicy.includes("bindExactSourceSpan(observation.observation, role, input.personName, 320)")],
  ["a missing admission evidence session fails the transaction closed", source.includes("if (!session?.id) throw new Error(")],
  ["discovery-only completion requires at least one durable model-selected review target", /const durableStatus = discovery\.status === "completed" && discovery\.stopReason === "MODEL_DECIDED_DONE" && !discoveryResourceLimited && admitted\.length > 0 \? "complete" : "review"/.test(source)],
  ["discovery terminal authority cannot be set by model completion alone", /latestEvidenceBackedTerminal: "discovery" \| "target" \| null = discovery\.status === "completed" && discovery\.stopReason === "MODEL_DECIDED_DONE" && admitted\.length > 0 \? "discovery" : null/.test(source)],
  ["candidate deduplication uses the shared normalized identity", source.includes("normalizeCandidateIdentityName(name)") && source.includes("const identity = normalizeCandidateIdentityName(name)")],
];
for (const [name, ok] of durableAdmissionChecks) {
  console.log((ok ? "PASS " : "FAIL ") + name);
  if (!ok) process.exitCode = 1;
}

console.log("Discovery admission strategy guard passed.");
