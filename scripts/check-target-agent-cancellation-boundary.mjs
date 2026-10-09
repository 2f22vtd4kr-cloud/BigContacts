import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const target=fs.readFileSync(path.join(root,"artifacts/api-server/src/src/lib/target-contact-agent.ts"),"utf8");
const runner=fs.readFileSync(path.join(root,"artifacts/api-server/src/src/lib/canonical-single-target-runner.ts"),"utf8");
const discovery=fs.readFileSync(path.join(root,"artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts"),"utf8");
const oversight=fs.readFileSync(path.join(root,"artifacts/api-server/src/src/lib/target-act-oversight.ts"),"utf8");
const checks=[
["target Investigator accepts cancellation callback",target.includes("shouldCancel?: () => boolean | Promise<boolean>")],
["target Investigator passes cancellation into canonical ReAct",target.includes("shouldCancel: input.shouldCancel")],
["target Investigator exposes serialized live-step callback",target.includes("onInvestigationAct?:")],
["target Investigator serializes durable live-step callbacks",target.includes("investigationEventChain = investigationEventChain.then")],
["target Investigator drains durable live-step callbacks before completion",target.includes("await investigationEventChain;")],
["canonical target runner checks cancellation through authoritative durable reads",runner.includes("getJobStrict(atlasJobId)")&&runner.includes('job.status === "cancelled"')&&!/await getJob\(atlasJobId\)/.test(runner)],
["canonical target runner supplies cancellation to Investigator",runner.includes("shouldCancel: async () =>")],
["discovery catch confirms persisted cancellation instead of matching error text",/durableJob = await getJobStrict\(atlasJobId\)/.test(discovery)&&/durableJob\?\.status === "cancelled"/.test(discovery)&&discovery.includes("jobStateUnavailable")&&!/rawMessage\.includes\("Canonical Atlas job cancelled;"/.test(discovery)],
["target oversight atomically persists immutable Investigator observation events",/db\.transaction\(async\(tx\)/.test(oversight)&&/actorRole:"head_investigator"/.test(oversight)&&/eventType:"tool_observation"/.test(oversight)],
["target oversight atomically persists immutable Boss decision events",/db\.transaction\(async\(tx\)/.test(oversight)&&/actorRole:"groq_boss"/.test(oversight)&&/eventType:"control_decision"/.test(oversight)],
["target observation persistence is idempotently correlated",/onConflictDoNothing\(\{target:\[researchCaseEventsTable\.caseId,researchCaseEventsTable\.correlationKey\]\}\)/.test(oversight)],
["target oversight evidence graphs bind claims to persisted source-action events",/sourceKey=`investigator-observation:/.test(oversight)&&/eventType:"observation",status:sourceRecord.execution/.test(oversight)&&/sourceEventIds\.set\(sourceTurn,sourceEventId\)/.test(oversight)&&/sourceEventIds\.get\(source\.turn\)/.test(oversight)&&/buildActEvidenceGraphs\(caseId,safeAct,eventId,runId,sourceEventIds\)/.test(oversight)],
["target source-observation replay payload is deterministic and immutable",/sourcePayload=\{\.\.\.sourcePayloadBase,sourceDigest\};/.test(oversight)&&/Immutable Investigator source observation replay mismatch/.test(oversight)],
["target oversight serializes concurrent control projections",/isolationLevel:"serializable"/.test(oversight)],
];
let failed=false;for(const[name,ok]of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed=true;}if(failed)process.exit(1);