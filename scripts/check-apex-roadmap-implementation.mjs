#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const required=[
 "docs/APEX_ROADMAP_10_PHASE_IMPLEMENTATION.md",
 "docs/APEX_FAILURE_OBSERVATORY.md",
 "benchmarks/research-gauntlet-v1.json",
 "benchmarks/research-run-v1.example.json",
 "benchmarks/research-failure-v1.json",
 "benchmarks/evidence-graph-v2.schema.json",
 "benchmarks/source-intelligence-v1.schema.json",
 "scripts/validate-evidence-graph.mjs",
 "scripts/validate-research-campaign.mjs",
 "scripts/validate-failure-records.mjs",
 "benchmarks/research-runs-v1.example.json",
 "scripts/validate-research-gauntlet.mjs",
 "scripts/validate-research-run.mjs",
 "scripts/score-research-campaign.mjs",
 "scripts/build-failure-observatory.mjs"
];
for(const f of required) if(!fs.existsSync(path.join(root,f))) throw new Error("Missing roadmap artifact: "+f);
const core=fs.readFileSync(path.join(root,"artifacts/api-server/src/src/lib/agentic-web-research-core.ts"),"utf8");
if(!core.includes('INVESTIGATOR_LLM_CAPABILITY_POOL = ["groq", "mistral"]')) throw new Error("Investigator pool contract drifted.");
for(const marker of ["MAX_ITER = 64","MAX_OBS = 16_000","MAX_TRAJECTORY_RECORDS = 512"]) if(!core.includes(marker)) throw new Error("Safety ceiling missing: "+marker);
const obs=fs.readFileSync(path.join(root,"artifacts/api-server/src/src/lib/target-act-oversight.ts"),"utf8");
for(const marker of ["tool_observation","control_decision","fail-closed"]) if(!obs.toLowerCase().includes(marker.toLowerCase())) throw new Error("Oversight durability marker missing: "+marker);
const prompt=core.toLowerCase();
for(const marker of ["you own the research trajectory","never inherit the target name as proof","only you may author a person identity"]) if(!prompt.includes(marker)) throw new Error("Investigator autonomy/evidence law missing: "+marker);
const uiFiles=["artifacts/apex-finder/src/pages/profile.tsx","artifacts/apex-finder/src/pages/research.tsx","artifacts/apex-finder/src/pages/graph.tsx","artifacts/apex-finder/src/router.tsx"]; for(const f of uiFiles) if(!fs.existsSync(path.join(root,f))) throw new Error("Investigator workstation surface missing: "+f);
const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
for(const s of ["check:research-run","bench:campaign","bench:failure-observatory","check:evidence-graph","check:research-campaign","check:failure-records","build:research-gauntlet","bench:empirical-campaign"]) if(!pkg.scripts?.[s]) throw new Error("Package script missing: "+s);
console.log("Apex 10-phase implementation contract: PASS");
