#!/usr/bin/env node
import fs from "node:fs";
const file=process.argv[2];
if(!file){console.error("Usage: node scripts/validate-research-run.mjs <run.json>");process.exit(2);}
const doc=JSON.parse(fs.readFileSync(file,"utf8"));
if(doc.schemaVersion!=="research-run-v1") throw new Error("Unknown run schemaVersion.");
for(const k of ["caseId","system","trialId"]) if(!doc[k]) throw new Error("Missing "+k);
if(!Array.isArray(doc.observations)||!Array.isArray(doc.trajectory)) throw new Error("observations and trajectory are required.");
const ids=doc.observations.map(o=>String(o?.id||""));
if(ids.some(Boolean)===false||ids.some(x=>!x)||new Set(ids).size!==ids.length) throw new Error("Observation IDs must be unique and non-empty.");
const known=new Set(ids);
for(const collection of ["claims","contacts","contradictions"]){
 for(const item of doc[collection]||[]){
  for(const id of item.supportingObservationIds||[]) if(!known.has(String(id))) throw new Error(collection+" references unknown observation "+id);
 }
}
for(const item of doc.failureRecords||[]) for(const id of item.evidenceObservationIds||[]) if(!known.has(String(id))) throw new Error("failure record references unknown observation "+id);
if(!["verified","insufficient_evidence","wrong_answer","system_failure","cancelled","exhausted","contradicted"].includes(String(doc.outcome))) throw new Error("Invalid outcome.");
console.log(JSON.stringify({valid:true,schemaVersion:doc.schemaVersion,caseId:doc.caseId,trialId:doc.trialId,observations:ids.length,trajectory:doc.trajectory.length},null,2));
