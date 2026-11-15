import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts", "utf8");
const sourcePolicy = fs.readFileSync("artifacts/api-server/src/src/lib/candidate-source-url-union.ts", "utf8");
const epistemic = fs.readFileSync("artifacts/api-server/src/src/lib/research-epistemic-vnext.ts", "utf8");

const partialStart = source.indexOf("async function materializePartialPersonLeadCards");
const partialEnd = source.indexOf("async function materializePartialOrganizationLeadCards", partialStart);
const partialPeople = partialStart >= 0 && partialEnd > partialStart ? source.slice(partialStart, partialEnd) : "";
const strictStart = source.indexOf("async function materializeAtlasAdmissions");
const strictEnd = source.indexOf("\nasync function ", strictStart + 20);
const strictAdmission = strictStart >= 0 ? source.slice(strictStart, strictEnd > strictStart ? strictEnd : undefined) : "";
const corroborationStart = sourcePolicy.indexOf("export function candidateRoleCorroborationSources");
const corroborationEnd = sourcePolicy.indexOf("\nfunction normalizeAdmittedSourceUrl", corroborationStart);
const corroboration = corroborationStart >= 0 && corroborationEnd > corroborationStart
  ? sourcePolicy.slice(corroborationStart, corroborationEnd)
  : "";

const checks = [
  ["candidate admission does not truncate the model-selected frontier", !/\.slice\(0,\s*(?:input\.maxCandidates|targetCount)\)/.test(source)],
  ["provisional person leads are persisted before strict promotion", source.includes("const partialPeople = await materializePartialPersonLeadCards") && source.indexOf("const partialPeople = await materializePartialPersonLeadCards") < source.indexOf("for (const name of candidates)")],
  ["provisional person cards retain search-result leads and fetched sources as distinct evidence tiers", partialPeople.includes("const sourceUrls = fetched ? payload.observedUrls : payload.leadUrls") && partialPeople.includes('verificationLevel: fetched ? "fetched_source" as const : "search_result_lead" as const')],
  ["provisional person-card selection is model-authored and permits an unknown role", partialPeople.includes('finding.scope !== "candidate"') && partialPeople.includes('finding.promotionDecision === "reject"') && partialPeople.includes("const role = finding.role?.trim()") && !partialPeople.includes("DISCOVERY_OWNERSHIP_SIGNALS") && !partialPeople.includes("materialitySignals")],
  ["strict target handoff requires explicit Investigator promotion", strictAdmission.includes('finding.promotionDecision === "promote"') && strictAdmission.includes('finding.scope === "candidate"')],
  ["strict evidence is restricted to the exact Investigator job and run", strictAdmission.includes("payload.jobId !== input.atlasJobId") && strictAdmission.includes("payload.runId !== input.discoveryRunId")],
  ["strict evidence must come from a successful fetched page, not search snippets", corroboration.includes('(observation.action !== "visit" && observation.action !== "browser_fetch") || observation.execution !== "success"')],
  ["the model-selected exact quotation is checked verbatim against its fetched URL", corroboration.includes("observation.observation.includes(quote)") && corroboration.includes("normalizeCandidateIdentityName(quote).includes(normalizeCandidateIdentityName(input.personName))")],
  ["evidence lineage and independent publisher handling remain intact", corroboration.includes("sourceLineageId(sourceUrl, passageFingerprint)") && corroboration.includes("supporting.has(publisher)")],
  ["semantic ownership and materiality wordlists are absent from the canonical source policy", !/DISCOVERY_OWNERSHIP_SIGNALS|materialitySignals|hasDiscoveryOwnershipLeadSignal|hasCredibleDiscoveryWealthPotentialSignal/.test(sourcePolicy)],
  ["review-only admission is transactionally bound to the live discovery case", strictAdmission.includes("db.transaction(async (tx) =>") && strictAdmission.includes("supportingEventId: support.eventId") && strictAdmission.includes("reviewOnly: true")],
  ["missing durable evidence-session creation fails rather than fabricating a card", strictAdmission.includes("if (!session?.id) throw new Error(")],
  ["exact source-span matching supports Unicode identity boundaries", epistemic.includes("hasExactTokenBoundary") && /\p\{L\}/u.test(epistemic)],
  ["community observations retain an explicit lower-trust path in source attribution", fs.readFileSync("artifacts/api-server/src/src/lib/discovery-source-attribution.ts", "utf8").includes("community_user_submitted_unverified")],
  ["terminal discovery status requires model completion plus a durable admitted target", /const durableStatus = discovery\.status === "completed" && discovery\.stopReason === "MODEL_DECIDED_DONE" && !discoveryResourceLimited && admitted\.length > 0 \? "complete" : "review"/.test(source)],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log((ok ? "PASS " : "FAIL ") + label);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log("Discovery admission strategy guard: PASS — model-owned meaning; deterministic provenance and persistence only.");
