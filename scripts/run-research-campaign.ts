#!/usr/bin/env node
import fs from "node:fs";
import { db, entitiesTable, researchCasesTable } from "@workspace/db";
import { eq } from "../lib/db/node_modules/drizzle-orm";
import { createJob, setActiveJob, clearActiveJobIfOwned, getJob } from "../artifacts/api-server/src/src/lib/job-queue";
import { runCanonicalSingleTargetInvestigation } from "../artifacts/api-server/src/src/lib/canonical-single-target-runner";

const [groundTruthFile, outputFile] = process.argv.slice(2);
if (!groundTruthFile || !outputFile) {
  console.error("Usage: node scripts/run-research-campaign.mjs <ground-truth.json> <runs.json>");
  process.exit(2);
}
const gt = JSON.parse(fs.readFileSync(groundTruthFile, "utf8"));
if (gt.schemaVersion !== "research-gauntlet-v1" || gt.status !== "grounded-reviewed") throw new Error("Ground truth must be grounded-reviewed.");
const cases = Array.isArray(gt.cases) ? gt.cases : [];
const trials = Math.max(1, Number(process.env.CAMPAIGN_TRIALS ?? 3));
const timeoutMs = Math.min(600000, Math.max(30000, Number(process.env.CAMPAIGN_TARGET_TIMEOUT_MS ?? 70000)));
const maxCases = Math.min(cases.length, Math.max(1, Number(process.env.CAMPAIGN_CASE_LIMIT ?? cases.length)));
const selectedCases = cases.slice(0, maxCases);
const systemVersion = String(process.env.GITHUB_SHA ?? "local");
const taskEnvelope = { maxIterations: 64, maxObservations: 16000, maxTrajectoryRecords: 512, researchDepth: "standard", targetTimeoutMs: timeoutMs, investigatorPool: ["groq", "mistral"], oversight: ["gemini-right-hand", "gemini-boss"] };
const runs = [];

function parseJson(raw) { try { const v = raw ? JSON.parse(raw) : {}; return v && typeof v === "object" ? v : {}; } catch { return {}; } }
function normalizeUrl(raw) { try { const u = new URL(String(raw)); u.hash = ""; u.hostname = u.hostname.toLowerCase(); u.protocol = u.protocol.toLowerCase(); return u.href; } catch { return ""; } }
function collectActs(caseFile) {
  const context = String(caseFile.contextDocument ?? "");
  const marker = /## Durable Investigator act (\d+)\n/g;
  const acts = [];
  let match;
  while ((match = marker.exec(context))) {
    const start = marker.lastIndex;
    const next = context.indexOf("\n\n## Durable Investigator act ", start);
    const raw = context.slice(start, next < 0 ? context.length : next).trim();
    try { acts.push(JSON.parse(raw)); } catch { /* keep going; final job result is still retained */ }
  }
  return acts;
}
function buildObservations(acts, gtCase) {
  const observations = [];
  const sourceClasses = new Map((gtCase.sources ?? []).map(source => [normalizeUrl(source.url), String(source.sourceClass ?? "unknown")]));
  const seen = new Set();
  for (const act of acts) for (const record of act.trajectoryRecords ?? []) {
    if (!["success"].includes(String(record.execution))) continue;
    const urls = Array.isArray(record.observedUrls) ? record.observedUrls.map(normalizeUrl).filter(Boolean) : [];
    for (const url of urls) {
      const id = `${act.executionId ?? "run"}:turn:${record.turn}:url:${observations.length + 1}`;
      if (seen.has(url)) continue;
      seen.add(url);
      observations.push({ id, url, originalUrl: url, normalizedUrl: url, retrievedAt: new Date().toISOString(), sourceClass: sourceClasses.get(url) ?? "public-web", execution: "success", turn: record.turn, collectionMethod: record.action, excerpt: String(record.observation ?? "").slice(0, 1200) });
    }
  }
  for (const act of acts) for (const graph of act.evidenceGraphs ?? []) for (const obs of graph.observations ?? []) {
    const url = normalizeUrl(obs.sourceUrl);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    observations.push({ id: String(obs.id), url, originalUrl: obs.sourceUrl, normalizedUrl: url, retrievedAt: obs.observedAt, sourceClass: sourceClasses.get(url) ?? "public-web", execution: "success", turn: obs.turn ?? null, collectionMethod: obs.collectionMethod ?? "evidence-graph", excerpt: obs.excerpt ?? null });
  }
  return observations;
}
function claimMatchesGroundTruth(claim, gold) {
  if (!gold) return false;
  const same = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();
  const normalize = value => String(value ?? "").trim().replace(/\\s+/g, " ").toLowerCase();
  return same(claim.predicate, gold.predicate) && normalize(claim.object) === normalize(gold.object);
}
function buildClaims(acts, observations, gtCase) {
  const byUrl = new Map(observations.map(o => [normalizeUrl(o.url), o.id]));
  const goldClaims = Array.isArray(gtCase.groundTruth?.claims) ? gtCase.groundTruth.claims : [];
  const claims = [];
  for (const act of acts) for (const graph of act.evidenceGraphs ?? []) {
    const claim = graph.claims?.[0]; if (!claim) continue;
    const refs = (graph.observations ?? []).map(o => byUrl.get(normalizeUrl(o.sourceUrl))).filter(Boolean);
    const matches = goldClaims.filter(candidate => claimMatchesGroundTruth(claim, candidate));
    const gold = matches.length === 1 ? matches[0] : null;
    claims.push({ id: String(claim.id), groundTruthClaimId: gold?.id ?? null, groundTruthIdentityId: gold?.subjectIdentityId ?? null, subject: claim.subject, predicate: claim.predicate, object: claim.object, scope: claim.scope, supportingObservationIds: [...new Set(refs)] });
  }
  return claims;
}
function buildIdentities(acts, targetName, observations) {
  const byUrl = new Map(observations.map(o => [normalizeUrl(o.url), o.id]));
  const promoted = [];
  for (const act of acts) for (const record of act.trajectoryRecords ?? []) for (const finding of record.findings ?? []) {
    if (finding.scope === "candidate" && finding.promotionDecision === "promote" && String(finding.personName ?? "").trim().toLowerCase() === targetName.toLowerCase()) promoted.push(finding);
  }
  if (!promoted.length) return [];
  const supportingObservationIds = [...new Set(promoted.flatMap(f => (Array.isArray(f.sourceUrls) ? f.sourceUrls : []).map(normalizeUrl).map(url => byUrl.get(url)).filter(Boolean)))];
  if (!supportingObservationIds.length) return [];
  return [{ id: targetName + ":target", groundTruthIdentityId: "target", canonicalName: targetName, organization: null, supportingObservationIds }];
}
function makeFailure(run, gtCase, status) {
  if (status === "system_failure") return [{ failureId: `${run.runId}:system`, class: "SYSTEM_FAILURE", severity: "high", evidenceObservationIds: [], description: "Canonical campaign execution failed before producing a completed research result.", rootCause: "The canonical target investigation or required provider/oversight path failed.", regressionCaseId: gtCase.caseId }];
  if (status === "cancelled") return [{ failureId: run.runId + ":cancelled", class: "RESOURCE_LIMITED", severity: "medium", evidenceObservationIds: run.observations.slice(0, 3).map(o => o.id), description: "The campaign run was cancelled before a complete result was produced.", rootCause: "The canonical target investigation was cancelled or exceeded its cancellation boundary.", regressionCaseId: gtCase.caseId }];
  if (run.identities.length === 0) return [{ failureId: `${run.runId}:evidence`, class: "INSUFFICIENT_EVIDENCE", severity: "medium", evidenceObservationIds: run.observations.slice(0, 3).map(o => o.id), description: "The run completed without an evidence-backed promoted identity.", rootCause: "The Investigator did not produce a promoted candidate identity with durable source evidence.", regressionCaseId: gtCase.caseId }];
  return [];
}
async function runOne(gtCase, trialIndex) {
  const startedAt = new Date().toISOString();
  const trialId = `trial-${String(trialIndex).padStart(3, "0")}`;
  const runId = `campaign-${systemVersion.slice(0, 12)}-${gtCase.caseId}-${trialId}`;
  const [entity] = await db.insert(entitiesTable).values({ name: gtCase.target, type: "Person", metadata: JSON.stringify({ companyName: gtCase.groundTruth?.identities?.[0]?.organization ?? null, campaignCaseId: gtCase.caseId }), sourceRegistries: "[]", bayesianScore: 0.5, contactConfidence: 0 }).returning({ id: entitiesTable.id, name: entitiesTable.name, type: entitiesTable.type });
  if (!entity) throw new Error("Failed to create campaign target entity.");
  const jobId = await createJob("atlas-run");
  await setActiveJob("atlas-run", jobId);
  const caseFile = { version: 2, target: entity, atlasJobId: jobId, campaignCaseId: gtCase.caseId, investigatorActOversight: [] };
  const [researchCase] = await db.insert(researchCasesTable).values({
    targetEntityId: entity.id, caseType: "target", status: "active", directorMode: "gemini_boss_pending", directorProvider: "gemini", directorModel: "auto-low-cost-pending",
    objective: String(gtCase.objective), motivation: "Matched Research Gauntlet trial. Preserve the benchmark objective verbatim; the Investigator still owns the research trajectory.",
    openingPrompt: String(gtCase.objective), caseFile: JSON.stringify(caseFile), currentAction: "gemini-opening-assignment", iteration: 0,
  }).returning({ id: researchCasesTable.id });
  if (!researchCase) throw new Error("Failed to create campaign research case.");
  try {
    await runCanonicalSingleTargetInvestigation(jobId, entity.id, { existingCaseId: researchCase.id, researchDepth: "standard", targetTimeoutMs: timeoutMs, initialDirection: String(gtCase.objective) });
  } catch (error) {
    await clearActiveJobIfOwned("atlas-run", jobId).catch(() => undefined);
    return { schemaVersion:"research-run-v1", caseId:gtCase.caseId, system:"apex-canonical", trialId, runId, registryVersion:gt.version, systemVersion, taskEnvelope, configuration:{ investigatorPool:["groq","mistral"], oversight:["gemini-right-hand","gemini-boss"] }, identities:[], claims:[], contacts:[], contradictions:[], observations:[], trajectory:[], outcome:"system_failure", failureRecords:[{ failureId:`${runId}:exception`, class:"SYSTEM_FAILURE", severity:"critical", evidenceObservationIds:[], description:"The canonical campaign invocation threw an exception.", rootCause:String(error?.message ?? error), regressionCaseId:gtCase.caseId }], startedAt, finishedAt:new Date().toISOString() };
  }
  const job = await getJob(jobId);
  const row = await db.select({ caseFile: researchCasesTable.caseFile, status: researchCasesTable.status }).from(researchCasesTable).where(eq(researchCasesTable.id, researchCase.id)).limit(1);
  const state = parseJson(row[0]?.caseFile);
  const acts = collectActs(state);
  const latest = parseJson(job?.result);
  const investigator = latest.investigator ?? {};
  if (!acts.length && investigator.trajectoryRecords) acts.push({ executionId: investigator.executionId, trajectoryRecords: investigator.trajectoryRecords, evidenceGraphs: investigator.evidenceGraphs ?? [] });
  const observations = buildObservations(acts, gtCase);
  const claims = buildClaims(acts, observations, gtCase);
  const identities = buildIdentities(acts, gtCase.target, observations);
  const trajectory = acts.flatMap(a => Array.isArray(a.trajectory) ? a.trajectory : []);
  const status = String(job?.status ?? "failed");
  const outcome = status === "done" && identities.length ? "verified" : status === "done" ? "insufficient_evidence" : status === "cancelled" ? "cancelled" : "system_failure";
  const run = { schemaVersion:"research-run-v1", caseId:gtCase.caseId, system:"apex-canonical", trialId, runId, registryVersion:gt.version, systemVersion, taskEnvelope, configuration:{ investigatorPool:["groq","mistral"], oversight:["gemini-right-hand","gemini-boss"] }, identities, claims, contacts:[], contradictions:[], observations, trajectory, outcome, failureRecords:[], startedAt, finishedAt:new Date().toISOString(), raw:{ jobId, caseId:researchCase.id, jobStatus:status, investigatorModel:investigator.model ?? null, stopReason:investigator.trajectoryRecords?.at(-1)?.stopReason ?? null, completedActs:state.completedActs ?? null, deadlineExceeded:state.deadlineExceeded ?? false, cancelled:state.cancelled ?? false } };
  run.failureRecords = makeFailure(run, gtCase, outcome);
  await clearActiveJobIfOwned("atlas-run", jobId).catch(() => undefined);
  return run;
}

for (let caseIndex = 0; caseIndex < selectedCases.length; caseIndex++) {
  const gtCase = selectedCases[caseIndex];
  for (let trialIndex = 1; trialIndex <= trials; trialIndex++) {
    process.stdout.write(`[campaign] ${caseIndex + 1}/${selectedCases.length} ${gtCase.caseId} trial ${trialIndex}/${trials}\\n`);
    const run = await runOne(gtCase, trialIndex);
    runs.push(run);
    fs.writeFileSync(outputFile, JSON.stringify({ schemaVersion:"research-runs-v1", registryVersion:gt.version, generatedAt:new Date().toISOString(), taskEnvelope, runs }, null, 2) + "\\n");
  }
}
console.log(JSON.stringify({ completedRuns:runs.length, cases:selectedCases.length, trials, outputFile }, null, 2));
