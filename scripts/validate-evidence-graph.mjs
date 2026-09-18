#!/usr/bin/env node
import fs from "node:fs";
const file=process.argv[2];
if(!file){console.error("Usage: node scripts/validate-evidence-graph.mjs <graph.json>");process.exit(2);}
const g=JSON.parse(fs.readFileSync(file,"utf8"));
for(const k of ["entities","hypotheses","claims","observations","sources","contradictions"]) if(!Array.isArray(g[k])) throw new Error(k+" must be an array.");
const obs=new Set(g.observations.map(o=>String(o?.id||""))); if(obs.size!==g.observations.length||[...obs].some(x=>!x)) throw new Error("Observation ids must be unique/non-empty.");
const sourceUrls=new Set(g.sources.map(s=>String(s?.url||"")).filter(Boolean));
for(const o of g.observations){
 if(!o.url||!o.retrievedAt||!o.sourceClass||!o.execution) throw new Error("Observation missing provenance fields.");
 if(!sourceUrls.has(String(o.url))) throw new Error("Observation source is absent from sources: "+o.url);
}
for(const h of g.hypotheses||[]) for(const id of [...(h.supportingObservationIds||[]),...(h.disconfirmingObservationIds||[])]) if(!obs.has(String(id))) throw new Error("Hypothesis references unknown observation.");
for(const c of g.claims||[]) for(const id of c.supportingObservationIds||[]) if(!obs.has(String(id))) throw new Error("Claim references unknown observation.");
for(const c of g.contradictions||[]) if(!c.claimA||!c.claimB||!c.resolutionStatus) throw new Error("Contradiction missing resolution fields.");
console.log(JSON.stringify({valid:true,entities:g.entities.length,hypotheses:g.hypotheses.length,claims:g.claims.length,observations:g.observations.length,sources:g.sources.length,contradictions:g.contradictions.length},null,2));
