#!/usr/bin/env node
import fs from "node:fs";
const file=process.argv[2]; if(!file){console.error("Usage: node scripts/validate-research-gauntlet.mjs <artifact.json>");process.exit(2);}
const doc=JSON.parse(fs.readFileSync(file,"utf8"));
if(doc.schemaVersion==="research-gauntlet-v1"){
 const cases=doc.cases||[];
 if(!Array.isArray(cases)||cases.length<30||doc.targetCaseCount<30)throw new Error("Registry must define at least 30 cases.");
 if(doc.targetCaseCount!==cases.length)throw new Error(`targetCaseCount ${doc.targetCaseCount} does not equal cases.length ${cases.length}.`);
 if(doc.status!=="grounded-reviewed")throw new Error("Registry must be grounded-reviewed before scoring.");
 const ids=new Set(); const claimIds=new Set();
 for(const c of cases){
  if(!c.caseId||ids.has(c.caseId)||!c.classification||c.groundTruthStatus!=="ready"||c.reviewStatus!=="independently-cross-checked")throw new Error("Invalid or unreviewed registry case: "+c.caseId);
  ids.add(c.caseId);
  const gt=c.groundTruth;
  if(!gt||!Array.isArray(gt.identities)||!Array.isArray(gt.claims)||!Array.isArray(gt.contacts)||!Array.isArray(gt.contradictions))throw new Error("Case "+c.caseId+" is missing ground truth arrays.");
  const sources=Array.isArray(c.sources)?c.sources:[];
  if(sources.length<2||sources.some(s=>!s.url||s.independentReview!==true))throw new Error("Case "+c.caseId+" needs at least two independently reviewed source records.");
  for(const claim of gt.claims){
   if(!claim.id||claimIds.has(claim.id)||!claim.subjectIdentityId||!claim.predicate||claim.object===undefined||!Array.isArray(claim.requiredSourceUrls)||claim.requiredSourceUrls.length<2)throw new Error("Claim in "+c.caseId+" lacks two required source URLs or has a duplicate id."); claimIds.add(claim.id);
  }
 }
 console.log(JSON.stringify({valid:true,type:"registry",cases:cases.length,target:doc.targetCaseCount,status:doc.status},null,2)); process.exit(0);
}
if(doc.schemaVersion==="research-run-v1"){if(!doc.caseId||!doc.system||!doc.trialId||!Array.isArray(doc.observations))throw new Error("Run requires caseId/system/trialId/observations."); const ids=doc.observations.map(o=>o&&o.id); if(ids.some(x=>!x)||ids.length!==new Set(ids).size)throw new Error("Observation IDs must be unique and non-empty."); console.log(JSON.stringify({valid:true,type:"run",caseId:doc.caseId,trialId:doc.trialId,observations:ids.length},null,2));process.exit(0);}
if(doc.schemaVersion==="research-runs-v1"){if(!Array.isArray(doc.runs))throw new Error("research-runs-v1 requires runs[]."); for(const run of doc.runs)if(!run.caseId||!run.system||!run.trialId)throw new Error("Each run needs caseId/system/trialId."); console.log(JSON.stringify({valid:true,type:"runs",count:doc.runs.length},null,2));process.exit(0);}
throw new Error("Unknown Gauntlet schemaVersion.");