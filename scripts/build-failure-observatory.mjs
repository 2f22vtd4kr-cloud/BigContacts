#!/usr/bin/env node
import fs from "node:fs";
const file=process.argv[2];
if(!file){console.error("Usage: node scripts/build-failure-observatory.mjs <runs.json>");process.exit(2);}
const doc=JSON.parse(fs.readFileSync(file,"utf8")); const runs=Array.isArray(doc)?doc:doc.runs;
if(!Array.isArray(runs)) throw new Error("Expected runs[]");
const allowed=new Set(["IDENTITY_COLLISION","IDENTITY_OVERCOMMITMENT","INSUFFICIENT_EVIDENCE","MISLEADING_SEARCH_RESULT","STALE_SOURCE","COPIED_CONTACT","WRONG_ENTITY","CONTACT_MISATTRIBUTION","CONTRADICTION_MISCLASSIFICATION","MISSED_PIVOT","UNNECESSARY_PIVOT","TOOL_SELECTION_ERROR","PREMATURE_STOP","LATE_STOP","PROMPT_INJECTION","SOURCE_QUALITY_ERROR","SYSTEM_FAILURE"]);
const records=[]; const counts={};
for(const run of runs){
 for(const f of run.failureRecords||[]){
  if(!allowed.has(String(f.class))) throw new Error("Unknown failure class: "+f.class);
  const r={failureId:String(f.failureId||""),runId:String(run.runId||""),caseId:String(run.caseId||""),class:String(f.class),severity:String(f.severity||"medium"),evidenceObservationIds:(f.evidenceObservationIds||[]).map(String),description:String(f.description||""),rootCause:String(f.rootCause||""),regressionCaseId:f.regressionCaseId??null};
  if(!r.failureId||!r.runId||!r.caseId||!r.description||!r.rootCause) throw new Error("Incomplete failure record.");
  records.push(r); counts[r.class]=(counts[r.class]||0)+1;
 }
}
console.log(JSON.stringify({schemaVersion:"research-failure-observatory-v1",runCount:runs.length,failureCount:records.length,byClass:counts,records},null,2));
