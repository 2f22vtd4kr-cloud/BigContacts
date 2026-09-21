#!/usr/bin/env node
import fs from "node:fs";
const file=process.argv[2]; if(!file){console.error("Usage: node scripts/validate-failure-records.mjs <runs.json>");process.exit(2);}
const doc=JSON.parse(fs.readFileSync(file,"utf8")), runs=Array.isArray(doc)?doc:doc.runs; if(!Array.isArray(runs)) throw new Error("runs[] required.");
const allowed=new Set(["IDENTITY_COLLISION","IDENTITY_OVERCOMMITMENT","INSUFFICIENT_EVIDENCE","MISLEADING_SEARCH_RESULT","STALE_SOURCE","COPIED_CONTACT","WRONG_ENTITY","CONTACT_MISATTRIBUTION","CONTRADICTION_MISCLASSIFICATION","MISSED_PIVOT","UNNECESSARY_PIVOT","TOOL_SELECTION_ERROR","PREMATURE_STOP","LATE_STOP","PROMPT_INJECTION","SOURCE_QUALITY_ERROR","SYSTEM_FAILURE"]);
const ids=new Set();
for(const run of runs) for(const f of run.failureRecords||[]){
 const id=String(f.failureId||""); if(!id||ids.has(id)) throw new Error("Failure IDs must be unique/non-empty: "+id); ids.add(id);
 if(!allowed.has(String(f.class))) throw new Error("Unknown failure class: "+f.class);
 if(!["low","medium","high","critical"].includes(String(f.severity))) throw new Error("Invalid failure severity for "+id);
 if(!String(f.description||"")||!String(f.rootCause||"")) throw new Error("Failure "+id+" lacks description/rootCause.");
 const obs=new Set((run.observations||[]).map(o=>String(o?.id||"")));
 for(const oid of f.evidenceObservationIds||[]) if(!obs.has(String(oid))) throw new Error("Failure "+id+" references unknown observation "+oid);
}
console.log(JSON.stringify({valid:true,runCount:runs.length,failureCount:ids.size},null,2));
