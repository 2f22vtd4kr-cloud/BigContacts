import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts", "utf8");
const continuation = fs.readFileSync("artifacts/api-server/src/src/routes/research/canonical-target-continuation.ts", "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };
assert(continuation.indexOf("groq-target-control-pending") >= 0
  && continuation.indexOf("groq-target-control-pending") < continuation.indexOf("decideTargetNextAction({"),
  "target continuation must durably bind its new job before the Boss decision helper persists control");
assert((continuation.match(/locked\.caseFile !== current\.caseFile/g) ?? []).length === 1
  && continuation.indexOf("locked.caseFile !== current.caseFile") < continuation.indexOf("decideTargetNextAction({"),
  "the original case-file snapshot may be compared only before the continuation's own control-decision write");
assert(continuation.indexOf('if (decision.status !== "completed")')
  < continuation.indexOf('if (decision.action === "stop")')
  && continuation.includes('status: failedCase ? "failed" : "cancelled", outcome: "incomplete"')
  && continuation.includes('status: "done", progress: 5, total: 5, outcome: "complete"'),
  "unavailable control must fail incomplete and remain separate from a successful model-selected stop");
assert(/async function releaseContinuationLane\(jobId: string\)/.test(continuation)
  && /clearActiveJobIfOwned\("atlas-run", jobId\)/.test(continuation)
  && /releaseCanonicalJob\("atlas-run", jobId\)/.test(continuation)
  && /await releaseContinuationLane\(jobId\)/.test(continuation),
  "all early continuation exits must clear the owned active pointer and stop the canonical lease timer");
assert(/const durableOwner = parseFile\(locked\.caseFile\)/.test(continuation)
  && /durableOwner\.atlasJobId \?\? durableOwner\.jobId/.test(continuation)
  && /await isCanonicalJobOwner\("atlas-run", jobId\)/.test(continuation),
  "target continuation authorization projection must revalidate durable case ownership and live lease");

assert(/nextFile = \{ \.\.\.lockedFile, atlasJobId: jobId, jobId,/.test(continuation), "target continuation must durably rebind the case to its new canonical Atlas job before remounting the target runner");
assert((continuation.match(/async function transitionClaimedTargetCase\(/g) ?? []).length === 1
  && (continuation.match(/transitionClaimedTargetCase\(\{ caseId, jobId, currentAction: "target-control-error" \}\)/g) ?? []).length >= 2
  && continuation.includes('transitionClaimedTargetCase({ caseId, jobId, currentAction: "groq-target-stop" })'),
  "stop, unavailable and catch transitions share one guarded case-state transition helper");
assert(/\.from\(researchCasesTable\)\.where\(eq\(researchCasesTable\.id, input\.caseId\)\)\.for\("update"\)/.test(continuation)
  && (continuation.match(/isCanonicalJobOwner\("atlas-run", input\.jobId\)/g) ?? []).length >= 2
  && /if \(!\(await isCanonicalJobOwner\("atlas-run", input\.jobId\)\)\) throw new Error/.test(continuation),
  "target case transitions lock the durable row and recheck the live lease before commit");


assert(!source.includes("releaseCanonicalJob"), "single-target runner must not release the Atlas lane owned by its caller");
assert(!source.includes("releaseCanonicalJob(\"atlas-run\""), "target execution must not release the outer canonical Atlas lock");
assert(/runCanonicalSingleTargetInvestigation\(atlasJobId/.test(source), "canonical target runner must remain job-bound");

if (failures.length) {
  console.error("CANONICAL TARGET LOCK OWNERSHIP: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("CANONICAL TARGET LOCK OWNERSHIP: PASS");
