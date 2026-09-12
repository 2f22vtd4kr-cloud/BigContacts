import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const target=fs.readFileSync(path.join(root,"artifacts/api-server/src/src/lib/target-contact-agent.ts"),"utf8");
const runner=fs.readFileSync(path.join(root,"artifacts/api-server/src/src/lib/canonical-single-target-runner.ts"),"utf8");
const oversight=fs.readFileSync(path.join(root,"artifacts/api-server/src/src/lib/target-act-oversight.ts"),"utf8");
const checks=[
["target Investigator accepts cancellation callback",target.includes("shouldCancel?: () => boolean | Promise<boolean>")],
["target Investigator passes cancellation into canonical ReAct",target.includes("shouldCancel: input.shouldCancel")],
["target Investigator exposes serialized live-step callback",target.includes("onInvestigationAct?:")],
["target Investigator serializes durable live-step callbacks",target.includes("investigationEventChain = investigationEventChain.then")],
["target Investigator drains durable live-step callbacks before completion",target.includes("await investigationEventChain;")],
["canonical target runner checks durable job cancellation",runner.includes("getJob(atlasJobId)")&&runner.includes('job.status === "cancelled"')],
["canonical target runner supplies cancellation to Investigator",runner.includes("shouldCancel: async () =>")],
["target oversight atomically persists immutable Investigator observation events",/db\.transaction\(async\(tx\)/.test(oversight)&&/actorRole:"head_investigator"/.test(oversight)&&/eventType:"tool_observation"/.test(oversight)],
["target oversight atomically persists immutable Boss decision events",/db\.transaction\(async\(tx\)/.test(oversight)&&/actorRole:"gemini_boss"/.test(oversight)&&/eventType:"control_decision"/.test(oversight)],
["target observation persistence is idempotently correlated",/onConflictDoNothing\(\{target:\[researchCaseEventsTable\.caseId,researchCaseEventsTable\.correlationKey\]\}\)/.test(oversight)],
["target oversight is anchored to the observation event",/observationEventId:eventId/.test(oversight)&&/buildActEvidenceGraphs\(caseId,act,eventId,runId\)/.test(oversight)],
];
let failed=false;for(const[name,ok]of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed=true;}if(failed)process.exit(1);