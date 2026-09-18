#!/usr/bin/env node
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const [gtFile,runsFile,outFile]=process.argv.slice(2);
if(!gtFile||!runsFile){console.error("Usage: node scripts/score-research-campaign.mjs <ground-truth.json> <runs.json> [output.json]");process.exit(2);}
const gt=JSON.parse(fs.readFileSync(gtFile,"utf8")), runsDoc=JSON.parse(fs.readFileSync(runsFile,"utf8")), runs=Array.isArray(runsDoc)?runsDoc:runsDoc.runs;
if(gt.schemaVersion!=="research-gauntlet-v1"||gt.status!=="grounded-reviewed") throw new Error("Ground truth must be grounded-reviewed.");
execFileSync(process.execPath, ["scripts/validate-research-campaign.mjs", gtFile, runsFile], { stdio: "inherit" });
if(!Array.isArray(runs)) throw new Error("runs[] required.");
const cases=new Map(gt.cases.map(c=>[String(c.caseId),c])); const byCase=new Map();
for(const r of runs){ if(!cases.has(String(r.caseId))) throw new Error("Unknown case "+r.caseId); (byCase.get(String(r.caseId))||byCase.set(String(r.caseId),[]).get(String(r.caseId))).push(r); }
const missing=[...cases.keys()].filter(id=>(byCase.get(id)||[]).length===0);
const underSampled=[...byCase.entries()].filter(([,rs])=>rs.length<3).map(([id,rs])=>({caseId:id,trials:rs.length}));
const outcomes={}; for(const r of runs){const k=String(r.outcome||"unknown");outcomes[k]=(outcomes[k]||0)+1;}
const overSampled=[...byCase.entries()].filter(([,rs])=>rs.length>3).map(([id,rs])=>({caseId:id,trials:rs.length}));
const systemFailures=runs.filter(r=>r.outcome==="system_failure").length;
const report={schemaVersion:"research-campaign-results-v1",registryVersion:gt.version,caseCount:gt.cases.length,runCount:runs.length,minimumTrialsPerCase:3,exactTrialsPerCase:3,missingCases:missing,underSampled,overSampled,outcomes,systemFailures,releaseGateEligible:gt.cases.length>=50&&runs.length===gt.cases.length*3&&missing.length===0&&underSampled.length===0&&overSampled.length===0&&systemFailures===0};
fs.writeFileSync(outFile||"research-campaign-results.json",JSON.stringify(report,null,2)+"\\n");
console.log(JSON.stringify(report,null,2));
if(missing.length||underSampled.length||overSampled.length) process.exitCode=1;
