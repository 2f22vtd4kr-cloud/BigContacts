import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const files={bureau:path.join(root,"artifacts/apex-finder/src/components/bureau-ops-stage.tsx"),model:path.join(root,"artifacts/apex-finder/src/lib/reactor-live-model.ts"),page:path.join(root,"artifacts/apex-finder/src/pages/reactor.tsx")};
for(const file of Object.values(files))if(!fs.existsSync(file))throw new Error(`Missing Reactor Live source: ${file}`);
const bureauText=fs.readFileSync(files.bureau,"utf8"),modelText=fs.readFileSync(files.model,"utf8"),pageText=fs.readFileSync(files.page,"utf8");
const forbiddenSyntheticQuery=/return\s+e\.targetName\s*\?\s*`\$\{e\.targetName\}\s+contact\s+email\s+phone`/;
const explicitQueryContract=/Deliberately no target-name fallback[\s\S]*?explicitResearchQuery/;
const explicitQueryOnly=/return\s+cleanResearchText\(match\?\.\[1\]/;
const forbiddenFiction=/Working on this person|Math\.min\(100,\s*42\)|width:\s*"42%"/;
if(forbiddenSyntheticQuery.test(bureauText)){console.error("FAIL  BureauOpsStage still fabricates a search query from targetName");process.exit(1);}
if(!explicitQueryContract.test(modelText)){console.error("FAIL  Reactor Live model is missing the explicit-query/no-fallback contract");process.exit(1);}
if(!explicitQueryOnly.test(modelText)){console.error("FAIL  explicitResearchQuery still has a non-explicit fallback path");process.exit(1);}
if(forbiddenFiction.test(pageText)){console.error("FAIL  Reactor page contains hard-coded synthetic live-state copy/progress");console.error("      Live progress and current-work copy must come from recorded Bureau telemetry.");process.exit(1);}
console.log("PASS  no synthetic target-name query fallback");
console.log("PASS  explicit research-query contract present");
console.log("PASS  only explicitly recorded query text can enter the Reactor query surface");
console.log("PASS  Reactor page contains no known hard-coded live-state fiction");
console.log("\nReactor Live no-fabrication gate passed.");
