#!/usr/bin/env node
import fs from "node:fs";
const args=process.argv.slice(2); const requireComplete=args.includes("--require-complete"); const [gtFile,runsFile]=args.filter(x=>x!=="--require-complete");
if(!gtFile||!runsFile){console.error("Usage: node scripts/validate-research-campaign.mjs <ground-truth.json> <runs.json>");process.exit(2);}
const gt=JSON.parse(fs.readFileSync(gtFile,"utf8")), doc=JSON.parse(fs.readFileSync(runsFile,"utf8")), runs=Array.isArray(doc)?doc:doc.runs;
if(gt.schemaVersion!=="research-gauntlet-v1"||gt.status!=="grounded-reviewed") throw new Error("Ground truth must be grounded-reviewed.");
if(!Array.isArray(runs)) throw new Error("runs[] required.");
const cases=new Map(gt.cases.map(c=>[String(c.caseId),c])); const runIds=new Set(), trialKeys=new Set(); const envelopes=new Set();
for(const r of runs){
 const key=String(r.runId||""); if(!key||runIds.has(key)) throw new Error("Run IDs must be unique and non-empty.");
 runIds.add(key);
 const trial=String(r.trialId||""); const caseId=String(r.caseId||""); if(!trial||!cases.has(caseId)) throw new Error("Each run requires a known caseId and trialId.");
 const tk=caseId+"::"+trial; if(trialKeys.has(tk)) throw new Error("Duplicate case/trial: "+tk); trialKeys.add(tk);
 const env=JSON.stringify(r.taskEnvelope??{}); envelopes.add(env);
 if(!Array.isArray(r.observations)||!Array.isArray(r.trajectory)) throw new Error("Run "+key+" lacks observations/trajectory arrays.");
 const obsIds=r.observations.map(o=>String(o?.id||"")); if(obsIds.some(x=>!x)||new Set(obsIds).size!==obsIds.length) throw new Error("Run "+key+" has invalid observation IDs.");
 const obs=new Set(obsIds);
 for(const item of [...(r.claims||[]),...(r.contacts||[])]) for(const id of item.supportingObservationIds||[]) if(!obs.has(String(id))) throw new Error("Run "+key+" references unknown observation "+id+".");
 for(const f of r.failureRecords||[]) for(const id of f.evidenceObservationIds||[]) if(!obs.has(String(id))) throw new Error("Run "+key+" failure references unknown observation "+id+".");
}
if(envelopes.size>1) throw new Error("Matched campaign requires one shared task envelope.");
const missing=[...cases.keys()].filter(id=>!runs.some(r=>String(r.caseId)===id));
const grouped=[...new Map([...cases.keys()].map(id=>[id,runs.filter(r=>String(r.caseId)===id)])).entries()];
const under=grouped.filter(([,rs])=>rs.length<3).map(([id,rs])=>({caseId:id,trials:rs.length}));
const over=grouped.filter(([,rs])=>rs.length>3).map(([id,rs])=>({caseId:id,trials:rs.length}));
const result={schemaVersion:"research-campaign-v1",registryVersion:gt.version,caseCount:gt.cases.length,runCount:runs.length,missingCases:missing,underSampled:under,overSampled:over,matchedTaskEnvelope:envelopes.size===1,threeTrialsPerCase:under.length===0&&over.length===0};
console.log(JSON.stringify(result,null,2));
if(requireComplete && (gt.cases.length<50||missing.length||under.length||over.length||envelopes.size!==1)) process.exitCode=1;
