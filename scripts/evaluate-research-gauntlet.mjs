#!/usr/bin/env node
import fs from "node:fs";
const readJson=(file)=>JSON.parse(fs.readFileSync(file,"utf8"));
const asSet=(v)=>new Set((v||[]).filter(Boolean));
const mean=(v)=>v.length?v.reduce((a,b)=>a+b,0)/v.length:null;
const rate=(n,d)=>d?n/d:null;
const normUrl=(value)=>{try{const u=new URL(String(value));u.hash="";u.hostname=u.hostname.toLowerCase();u.protocol=u.protocol.toLowerCase();return u.toString().replace(/\/$/,"");}catch{return String(value||"").trim();}};
const observationIndex=(run)=>{
  const byId=new Map();
  const urls=new Map();
  const classes=new Map();
  for(const o of (run.observations||[])){
    const id=String(o?.id||""); if(!id) continue;
    const url=normUrl(o.url||o.observedUrl||o.normalizedUrl||"");
    byId.set(id,{url,sourceClass:String(o.sourceClass||o.sourceType||"unknown")});
    if(url){urls.set(id,url);classes.set(id,String(o.sourceClass||o.sourceType||"unknown"));}
  }
  return {byId,urls,classes};
};
const evidenceCoverage=(refs,gold,idx)=>{
  const observedUrls=asSet(refs.map(id=>idx.urls.get(String(id))).filter(Boolean).map(normUrl));
  const requiredUrls=asSet((gold?.requiredSourceUrls||[]).map(normUrl));
  const requiredClasses=asSet(gold?.requiredSourceClasses||[]);
  const urlsCovered=[...requiredUrls].every(url=>observedUrls.has(url));
  const classByUrl=new Map((gold?.sources||[]).map(source=>[normUrl(source.url), String(source.sourceClass ?? "unknown")]));
  const classCovered=requiredClasses.length===0 || [...requiredClasses].every(requiredClass=>[...observedUrls].some(url=>classByUrl.get(url)===requiredClass));
  return {urlsCovered,classCovered,covered:urlsCovered&&classCovered};
};
function scoreRun(gt,run){
 const expected=Array.isArray(gt.identities)?gt.identities:[], expectedIds=asSet(expected.filter(x=>!x.distractor).map(x=>String(x.id))), distractors=asSet(expected.filter(x=>x.distractor).map(x=>String(x.id)));
 const evidenceBackedPredictedIds=asSet((run.identities||[]).filter(x=>Array.isArray(x.supportingObservationIds)&&x.supportingObservationIds.length>0).map(x=>String(x.groundTruthIdentityId||""))), predictedIds=evidenceBackedPredictedIds;
 const tp=[...predictedIds].filter(id=>expectedIds.has(id)).length;
 const identityPrecision=rate(tp,predictedIds.size), identityRecall=rate(tp,expectedIds.size), fp=[...predictedIds].filter(id=>!expectedIds.has(id)||distractors.has(id)).length;
 const idx=observationIndex(run);
 const expectedClaims=new Map((gt.claims||[]).map(c=>[String(c.id),c])), claims=Array.isArray(run.claims)?run.claims:[]; let supported=0;
 for(const claim of claims){const e=expectedClaims.get(String(claim.groundTruthClaimId||"")); const refs=(claim.supportingObservationIds||[]).map(String); if(e&&e.subjectIdentityId===claim.groundTruthIdentityId&&e.predicate===claim.predicate&&String(e.object)===String(claim.object)&&evidenceCoverage(refs,e,idx).covered)supported++;}
 const expectedContacts=new Map((gt.contacts||[]).map(c=>[String(c.id),c])), contacts=Array.isArray(run.contacts)?run.contacts:[]; let contactTp=0;
 for(const c of contacts){const e=expectedContacts.get(String(c.groundTruthContactId||"")); const refs=(c.supportingObservationIds||[]).map(String); if(e&&String(c.groundTruthIdentityId||"")===String(e.subjectIdentityId)&&String(c.type||"")===String(e.type)&&String(c.value||"")===String(e.value||"")&&String(c.state||"")===String(e.expectedState||"")&&evidenceCoverage(refs,e,idx).covered)contactTp++;}
 const expectedContradictions=asSet((gt.contradictions||[]).map(c=>String(c.id))), predictedContradictions=asSet((run.contradictions||[]).map(c=>String(c.groundTruthContradictionId||""))), contradictionTp=[...expectedContradictions].filter(id=>predictedContradictions.has(id)).length;
 return {caseId:String(gt.caseId),trialId:String(run.trialId||""),system:String(run.system||""),outcome:String(run.outcome||"unknown"),systemFailure:run.outcome==="system_failure",identityPrecision,identityRecall,falsePositiveIdentityRate:rate(fp,predictedIds.size),claimSupportCorrectness:rate(supported,claims.length),unsupportedClaimRate:rate(claims.length-supported,claims.length),contactPrecision:rate(contactTp,contacts.length),contactRecall:rate(contactTp,expectedContacts.size),contradictionRecall:rate(contradictionTp,expectedContradictions.size),trajectoryLength:Array.isArray(run.trajectory)?run.trajectory.length:null,successfulObservations:(run.observations||[]).filter(o=>o&&o.execution==="success").length,evidenceBackedClaims:supported};
}
const args=process.argv.slice(2); if(args.length!==2){console.error("Usage: node scripts/evaluate-research-gauntlet.mjs <ground-truth.json> <runs.json>");process.exit(2);}
const gtDoc=readJson(args[0]), runsDoc=readJson(args[1]);
if(gtDoc.schemaVersion!=="research-gauntlet-v1")throw new Error("Invalid ground-truth schemaVersion.");
if((gtDoc.cases||[]).some(c=>c.groundTruthStatus!=="ready"||c.reviewStatus!=="independently-cross-checked"))throw new Error("Ground truth is not fully reviewed; scoring is blocked until every case is ready and independently cross-checked.");
const runs=Array.isArray(runsDoc)?runsDoc:runsDoc.runs; if(!Array.isArray(runs))throw new Error("runs must be an array or {runs:[]}.");
const gtById=new Map((gtDoc.cases||[]).map(c=>[String(c.caseId),c]));
const results=runs.map(run=>{const gt=gtById.get(String(run.caseId)); if(!gt)throw new Error("No ground truth for case "+run.caseId); const ids=(run.observations||[]).map(o=>String(o&&o.id||"")); if(ids.some(id=>!id)||ids.length!==new Set(ids).size)throw new Error("Observation IDs must be unique in "+run.caseId+"/"+run.trialId); return scoreRun(gt.groundTruth?{...gt,...gt.groundTruth,caseId:gt.caseId}:gt,run);});
const numeric=["identityPrecision","identityRecall","falsePositiveIdentityRate","claimSupportCorrectness","unsupportedClaimRate","contactPrecision","contactRecall","contradictionRecall"], aggregate=Object.fromEntries(numeric.map(k=>[k,mean(results.map(r=>r[k]).filter(v=>typeof v==="number"))]));
const bySystem={}; for(const row of results)(bySystem[row.system]??=[]).push(row);
const systems=Object.fromEntries(Object.entries(bySystem).map(([system,rows])=>[system,{trials:rows.length,systemFailures:rows.filter(r=>r.systemFailure).length,metrics:Object.fromEntries(numeric.map(k=>[k,mean(rows.map(r=>r[k]).filter(v=>typeof v==="number"))]))}]));
console.log(JSON.stringify({schemaVersion:"research-gauntlet-results-v1",scoredRuns:results.length,aggregate,bySystem:systems,cases:results},null,2));
