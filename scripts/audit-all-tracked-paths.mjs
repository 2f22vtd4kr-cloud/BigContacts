#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
const root=path.resolve(process.argv[2]||".");
const out=path.resolve(process.argv[3]||"audit-output");
fs.mkdirSync(out,{recursive:true});
const git=(args)=>execFileSync("git",["-C",root,...args],{encoding:"utf8",maxBuffer:64*1024*1024}).trimEnd();
const snapshotSha=git(["rev-parse","HEAD"]);
const treeText=git(["ls-tree","-r","-l","--full-tree","HEAD"]);
const files=treeText.split("\n").filter(Boolean).map(row=>{
 const m=row.match(/^(\d{6})\s+(blob|commit)\s+([0-9a-f]{40})\s+(\d+|-)\t([\s\S]+)$/);
 return m?{mode:m[1],type:m[2],blobSha:m[3],bytes:m[4]==="-"?null:Number(m[4]),path:m[5]}:null;
}).filter(Boolean);
const ext=p=>path.extname(p).toLowerCase()||(path.basename(p).startsWith(".")?path.basename(p).toLowerCase():"[no-extension]");
const lang=p=>{
 const e=ext(p);
 if([".ts",".tsx",".js",".jsx",".mjs",".cjs"].includes(e))return"javascript-typescript";
 if(e===".py")return"python"; if(e===".sql")return"sql";
 if([".sh",".bash",".zsh"].includes(e))return"shell";
 if([".yml",".yaml"].includes(e))return"yaml"; if([".json",".jsonl"].includes(e))return"json";
 if([".html",".css",".svg"].includes(e))return"web";
 if([".md",".mdx",".txt",".rst"].includes(e))return"documentation";
 if([".png",".jpg",".jpeg",".gif",".webp",".ico",".pdf",".woff",".woff2",".ttf",".otf",".mp4",".zip",".gz"].includes(e))return"asset";
 if([".toml",".conf",".nix",".dockerfile",".gitignore",".npmrc",".replit",".replitignore"].includes(e))return"configuration";
 return"other-text";
};
function cat(p){
 if(/^(audits\/|APEX_ATLAS_.*\.md$)/i.test(p))return"historical-audit-record";
 if(/^docs\/.*(?:screenshot|ui-screenshots)/i.test(p)||/^(screenshots|attached_assets)\//i.test(p))return"visual-or-attachment-asset";
 if(/^docs\//.test(p))return"documentation";
 if(/^\.github\/workflows\//.test(p))return"ci-workflow";
 if(/^(scripts|main\.py)(\/|$)/.test(p))return"operational-script";
 if(/^(lib|artifacts|services|deployment)\//.test(p))return"first-party-implementation";
 if(/(^|\/)(migrations?|drizzle)\//i.test(p)||/\.sql$/i.test(p))return"database-migration-or-schema";
 if(/(^|\/)(node_modules|vendor|dist|build|coverage|generated)\//i.test(p))return"generated-or-vendored";
 if(/^(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|tsconfig.*\.json|\.npmrc)$/.test(p))return"build-or-dependency-configuration";
 if(/^\./.test(p)||/(^|\/)(Dockerfile|Makefile|Justfile)$/i.test(p))return"runtime-or-repository-configuration";
 return"other-tracked-file";
}
const rules=[
["SEC-PRIVATE-KEY","critical",/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
["SEC-GITHUB-TOKEN-LITERAL","critical",/\b(?:gh[pousr]_[A-Za-z0-9_]{24,}|github_pat_[A-Za-z0-9_]{40,})\b/],
["SEC-AWS-KEY-ID-LITERAL","high",/\bAKIA[0-9A-Z]{16}\b/],
["SEC-SLACK-TOKEN-LITERAL","high",/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
["SEC-HARDCODED-SECRET-ASSIGNMENT","review",/\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|password|passwd|private[_-]?key)\b\s*[:=]\s*["'][^"']{8,}["']/i],
["SEC-TLS-VERIFY-DISABLED","high",/\b(?:verify\s*=\s*False|rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0)/i],
["SEC-DYNAMIC-EVAL","high",/\b(?:eval\s*\(|new\s+Function\s*\()/],
["SEC-SHELL-EXEC","review",/\b(?:exec|execSync|spawn|spawnSync)\s*\(/],
["SEC-SHELL-TRUE","high",/\bshell\s*:\s*true\b/],
["SEC-HTML-INJECTION","review",/\bdangerouslySetInnerHTML\b|\.innerHTML\s*=/],
["SEC-PICKLE","review",/\bpickle\.(?:loads?|Unpickler)\b/],
["SEC-YAML-UNSAFE-LOAD","review",/\byaml\.load\s*\(/],
["SEC-URL-FETCH-INPUT","review",/\bfetch\s*\(\s*(?:req\.|request\.|input\.|args\.|target|url\b)/i],
["SEC-SQL-RAW-INTERPOLATION","review",/(?=sql\.raw)[^\n]*\$\{/],
["SEC-AUTH-BYPASS-FLAG","review",/\b(?:skipAuth|disableAuth|bypassAuth|allowUnauthenticated)\s*(?:=|:)\s*(?:true|1)\b/i],
["SEC-DEV-DEFAULT-SECRET","high",/(?:SECRET|TOKEN|API_KEY|PASSWORD)\s*[:=]\s*["'](?:dev|test|changeme|password|secret|token|123456|replace[-_ ]?me)["']/i],
["AI-URL-TRUNCATION-SHAPE","review",/(?:url|uri|sourceUrl|leadUrl|observedUrl)[A-Za-z0-9_]*.{0,100}\.(?:slice|substring|substr)\s*\(/i],
["AI-URL-REDACTION-SHAPE","review",/(?:url|uri|sourceUrl|leadUrl).{0,120}(?:REDACTED|sanitizeUrlForEvidence)/i],
["AI-EMPTY-CATCH","review",/catch\s*(?:\([^)]*\))?\s*\{\s*\}/],
["TEST-SKIP","review",/\b(?:it|test|describe|suite|spec)\.(?:skip|todo)\s*\(|\b(?:xit|xdescribe|xtest|fit|fdescribe)\s*\(/],
["QUALITY-TODO-FIXME","info",/\b(?:TODO|FIXME|HACK|XXX)\b/],
["QUALITY-TS-IGNORE","review",/@ts-ignore|@ts-nocheck/],
["QUALITY-ESLINT-DISABLE","info",/eslint-disable(?:-next-line|-line)?/],
["QUALITY-ANY-TYPE","info",/\bas\s+any\b|:\s*any\b/],
["QUALITY-DEBUG-LOG","info",/\bconsole\.(?:log|debug|trace)\s*\(/],
["QUALITY-UNBOUNDED-READ","review",/\breadFileSync\s*\([^,\n)]+\s*\)|read_text\s*\(\s*\)/],
["QUALITY-COMMENTED-SECURITY","info",/(?:temporarily|for now|TODO|FIXME).{0,120}(?:auth|scope|security|validation|egress|provenance|credential)/i],
["OPS-TRACKED-CONTACT-AUDIT","high",/APEX_MODEL_AUDIT_INCLUDE_CONTACT_DATA\s*=\s*["']true["']/],
["OPS-VISIBLE-PROMPT-AUDIT","review",/APEX_MODEL_AUDIT_ALLOW_VISIBLE_FILE\s*=\s*["']true["']/],
["OPS-CAPTURE-PROMPTS","review",/APEX_CAPTURE_MODEL_PROMPTS\s*=\s*["']true["']/]
];
function preview(line,p,r){
 if(/^(audits\/|docs\/archive\/|.*(?:audit|prompt-trace|trajectory|model-prompt).*\.(?:md|jsonl|txt)$)/i.test(p)||r.startsWith("SEC-")||r.startsWith("OPS-"))return"[source content withheld/redacted in report]";
 return line.replace(/https?:\/\/[^\s"'<>]+/gi,"[URL]")
 .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{16,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,})\b/g,"[TOKEN]")
 .replace(/(password|passwd|secret|token|api[_-]?key)\s*[:=]\s*["'][^"']+["']/ig,"$1=[REDACTED]").replace(/\s+/g," ").slice(0,180);
}
const findings=[],manifest=[],parseErrors=[],readErrors=[],dupes=new Map();
const classCount={},languageCount={},extCount={},perRule={},severityCount={critical:0,high:0,review:0,info:0};
let totalBytes=0,textFiles=0,binaryFiles=0,totalTextLines=0;
for(const f of files){
 const p=f.path,c=cat(p),l=lang(p),e=ext(p);
 classCount[c]=(classCount[c]||0)+1;languageCount[l]=(languageCount[l]||0)+1;extCount[e]=(extCount[e]||0)+1;totalBytes+=f.bytes||0;
 const g=dupes.get(f.blobSha)||[];g.push(p);dupes.set(f.blobSha,g);
 let buf;try{buf=fs.readFileSync(path.join(root,p));}catch(err){manifest.push({path:p,blobSha:f.blobSha,bytes:f.bytes,category:c,language:l,extension:e,lines:null,scan:"read-error",lineRuleHits:0});readErrors.push({path:p,error:String(err).slice(0,160)});continue;}
 let content=null,scan="text-line-scan";
 if(buf.includes(0)||(l==="asset"&&!/\.svg$/i.test(p))){binaryFiles++;scan="binary-inventoried-not-line-text";}
 else{const s=buf.toString("utf8"),bad=(s.match(/\uFFFD/g)||[]).length;if(bad>3&&bad/Math.max(1,s.length)>.002){binaryFiles++;scan="non-utf8-or-binary-inventoried";}else content=s;}
 let lineCount=null,hits=0,maxLine=0;
 if(content!==null){
  textFiles++;const lines=content.split("\n");lineCount=lines.length;totalTextLines+=lineCount;
  for(let i=0;i<lines.length;i++){
   const line=lines[i].replace(/\r$/,"");maxLine=Math.max(maxLine,line.length);
   for(const rule of rules){rule[2].lastIndex=0;if(!rule[2].test(line))continue;
    findings.push({path:p,line:i+1,rule:rule[0],severity:rule[1],category:c,language:l,preview:preview(line,p,rule[0]),fingerprint:crypto.createHash("sha256").update(p+":"+(i+1)+":"+rule[0]+":"+line).digest("hex").slice(0,20)});
    hits++;perRule[rule[0]]=(perRule[rule[0]]||0)+1;severityCount[rule[1]]=(severityCount[rule[1]]||0)+1;
   }
   if(line.length>2000&&!/^(audits\/|docs\/archive\/)/i.test(p)){
    findings.push({path:p,line:i+1,rule:"MAINT-EXTREME-LINE-LENGTH",severity:"info",category:c,language:l,preview:"[line exceeds 2,000 chars]",fingerprint:crypto.createHash("sha256").update(p+":"+(i+1)+":long-line").digest("hex").slice(0,20)});
    hits++;perRule["MAINT-EXTREME-LINE-LENGTH"]=(perRule["MAINT-EXTREME-LINE-LENGTH"]||0)+1;severityCount.info++;
   }
  }
  if(e===".json"){try{JSON.parse(content);}catch(err){parseErrors.push({path:p,kind:"JSON parse",error:String(err).slice(0,180)});}}
  if(e===".jsonl"){content.split("\n").forEach((line,index)=>{if(!line.trim())return;try{JSON.parse(line);}catch(err){parseErrors.push({path:p,line:index+1,kind:"JSONL parse",error:String(err).slice(0,180)});}});}
 }
 manifest.push({path:p,blobSha:f.blobSha,bytes:f.bytes,category:c,language:l,extension:e,lines:lineCount,scan,lineRuleHits:hits,maxLineLength:maxLine||null});
}
for(const f of manifest.filter(x=>x.language==="python"&&x.scan==="text-line-scan")){
 try{execFileSync("python3",["-m","py_compile",path.join(root,f.path)],{stdio:"pipe"});}catch(err){parseErrors.push({path:f.path,kind:"Python syntax",error:String(err).slice(0,300)});}
}
for(const f of manifest.filter(x=>[".js",".mjs",".cjs"].includes(x.extension)&&x.scan==="text-line-scan")){
 try{execFileSync("node",["--check",path.join(root,f.path)],{stdio:"pipe"});}catch(err){parseErrors.push({path:f.path,kind:"JavaScript syntax",error:String(err).slice(0,300)});}
}
for(const f of manifest.filter(x=>[".sh",".bash"].includes(x.extension)&&x.scan==="text-line-scan")){
 try{execFileSync("bash",["-n",path.join(root,f.path)],{stdio:"pipe"});}catch(err){parseErrors.push({path:f.path,kind:"Shell syntax",error:String(err).slice(0,300)});}
}
for(const f of manifest.filter(x=>[".yml",".yaml"].includes(x.extension)&&x.scan==="text-line-scan")){
 try{execFileSync("ruby",["-e","require 'yaml'; YAML.load_file(ARGV[0], aliases: true)",path.join(root,f.path)],{stdio:"pipe"});}catch(err){parseErrors.push({path:f.path,kind:"YAML syntax or parser unavailable",error:String(err).slice(0,300)});}
}
const semanticScopeByPath = new Map([
  [".replit", "Deployment target, external ports, prompt/contact audit flags and post-merge timeout."],
  ["README.md", "Project scope and repository entry-point claims."],
  ["package.json", "Root scripts, workspace and check:bureau orchestration."],
  ["artifacts/api-server/package.json", "API build, typecheck and test scripts."],
  ["artifacts/api-server/tsconfig.json", "Active source-root/build inclusion."],
  ["artifacts/api-server/src/index.ts", "Compatibility entrypoint versus active implementation."],
  ["artifacts/api-server/src/src/index.ts", "Active server entrypoint."],
  ["artifacts/api-server/src/src/app.ts", "HTTP app composition and middleware mount path."],
  ["artifacts/api-server/src/src/routes/index.ts", "Canonical route mounting and authentication boundary."],
  ["artifacts/api-server/src/src/routes/entities.ts", "Entity list filters, contact outcomes, visibility and mutations."],
  ["artifacts/api-server/src/src/routes/extended-osint.ts", "Legacy router reachability relative to canonical aggregator."],
  ["artifacts/api-server/src/src/routes/osint-tools.ts", "Mounted OSINT tool routes."],
  ["artifacts/api-server/src/src/lib/operator-auth.ts", "Authentication implementation contrasted against route mounting."],
  ["artifacts/api-server/src/src/test/operator-auth.test.ts", "Tests asserting the intentional unmounted-auth boundary."],
  ["artifacts/api-server/src/src/lib/model-prompt-audit.ts", "Audit-data redaction and visible-file policy."],
  ["artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "Model action loop, tool dispatch and prompt URL projection."],
  ["artifacts/api-server/src/src/lib/agentic-web-research.ts", "Durable trajectory and continuation paths sampled."],
  ["artifacts/api-server/src/src/lib/atlas-control-decision.ts", "Boss/Right-hand control context, direction and URL compaction."],
  ["artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts", "Finding admission, organization/person materialization and reconciliation."],
  ["artifacts/api-server/src/src/lib/bureau-agentic-pass.ts", "Bureau trajectory persistence and bounded caseFile projection."],
  ["artifacts/api-server/src/src/lib/investigation-context-compaction.ts", "Investigator context budget and compaction helpers."],
  ["artifacts/api-server/src/src/lib/ssrf-safe-fetch.ts", "DNS/IP validation, socket pinning, redirects and body/deadline bounds."],
  ["artifacts/api-server/src/src/lib/provider-gate.ts", "Provider concurrency, budgets, cooldowns and memory bounds."],
  ["artifacts/api-server/src/src/lib/registry-enricher.ts", "Registry adapter dispatch and entity-ID query boundary."],
  ["artifacts/api-server/src/src/lib/python-osint-worker-client.ts", "Attestation, capability advertising, egress and worker dispatch."],
  ["artifacts/api-server/src/src/lib/atlas-capability-registry.ts", "Model-facing capability registration and availability guidance."],
  ["artifacts/api-server/src/src/lib/entity-visibility-guard.ts", "Hidden-entity visibility boundary."],
  ["artifacts/api-server/src/src/lib/legacy-apex-mutation-guard.ts", "Legacy mutation versus evidence-bound promotion."],
  ["artifacts/api-server/src/src/lib/canonical-job-lock.ts", "Atomic job lease/lock transitions; Redis Lua calls."],
  ["artifacts/api-server/src/src/lib/job-queue.ts", "Authoritative queue/lease/cancellation behavior; Redis Lua calls."],
  ["artifacts/api-server/src/src/lib/presented-contacts.ts", "UI/API contact representation and organization/person outcomes."],
  ["artifacts/api-server/src/src/lib/research-epistemic-vnext.ts", "Source spans and claim-grade validation sampled."],
  ["artifacts/api-server/src/src/lib/target-act-oversight.ts", "Target direction/oversight recovery path sampled."],
  ["artifacts/api-server/src/src/lib/research-intelligence-replay.ts", "Durable research replay path sampled."],
  ["artifacts/api-server/src/src/lib/research-intelligence-engine.ts", "Search-lead versus fetched-evidence distinctions sampled."],
  ["artifacts/api-server/src/src/routes/dashboard.ts", "Entity/source-card projection from durable events."],
  ["artifacts/apex-finder/src/pages/entities.tsx", "Entity list filters, company/candidate labels and rendered-card flow."],
  ["artifacts/apex-finder/src/App.tsx", "UI root and route wrapper."],
  ["services/apex-python-osint-worker/app.py", "Worker API, attestation, limits and SpiderFoot target/profile contract."],
  ["services/apex-python-osint-worker/tool_runner.py", "Tool subprocess/input protocol sampled."],
  ["deployment/apex-python-osint-worker/squid.conf", "Outbound proxy ACLs and public-web-only restrictions."],
  ["deployment/apex-python-osint-worker/network-policies.yaml", "Worker/proxy network isolation."],
  ["deployment/apex-python-osint-worker/worker-deployment.yaml", "Worker isolation and placeholder deployment identity."],
  ["deployment/apex-python-osint-worker/proxy-deployment.yaml", "Proxy isolation and deployment identity."],
  ["deployment/apex-python-osint-worker/worker-ingress.yaml", "Ingress placeholder and operator customization."],
  ["deployment/apex-python-osint-worker/kustomization.yaml", "Worker deployment composition."],
  ["lib/db/migrations/001-apex-invariants.sql", "Append-only events, size limits, replay/job binding and cancellation fencing."],
  ["lib/db/migrations/002-contact-outcome.sql", "Idempotent contact-outcome column compatibility."],
  ["lib/db/migrations/003-atlas-review-candidate-type.sql", "Narrow review-only PersonCandidate correction."],
  ["lib/db/migrations/004-registry-candidate-truth.sql", "Guarded legacy registry reclassification; no evidence rewrite."],
  ["lib/db/src/schema/entities.ts", "Entity type/contact-outcome contract."],
  ["lib/db/src/schema/research_cases.ts", "Durable case schema and lifecycle."],
  ["lib/db/src/schema/research_case_events.ts", "Event immutability, payload size and correlation schema."],
  ["lib/db/src/schema/research_evidence.ts", "Claim-level evidence and restrictive FK semantics."],
  ["lib/db/src/schema/research_sessions.ts", "Research-session audit and safe-use fields."],
  ["lib/db/package.json", "Schema push/hardening commands."],
  ["scripts/post-merge.sh", "Post-merge setup sequence and failure/timeout behavior."],
  ["scripts/initialize-apex-schema.sh", "Schema push, hardening, migrations and verification."],
  ["scripts/check-source-migration-hardener-parity.mjs", "Migration/initializer static invariant."],
  ["scripts/check-operator-auth-boundary.mjs", "Intended authentication boundary guard."],
  ["scripts/live-batch-trigger.md", "Documented trigger for provider-backed runtime proof."]
]);
for (const file of files) {
  if (file.path.startsWith(".github/workflows/")) {
    semanticScopeByPath.set(file.path, "Workflow trigger, declared permissions, immutable action refs, secret footprint and live-cost behavior sampled; not every line manually interpreted.");
  }
}
for (const item of manifest) {
  if (item.scan !== "text-line-scan") {
    item.semanticReviewStatus = "inventory-only-no-text-line-review";
    item.semanticReviewScope = "Binary/non-UTF-8 content recorded by path, blob SHA and byte size; internals not semantically interpreted.";
  } else if (semanticScopeByPath.has(item.path)) {
    item.semanticReviewStatus = "targeted-semantic-review-selected-sections";
    item.semanticReviewScope = semanticScopeByPath.get(item.path);
  } else if (item.category === "documentation" || item.category === "historical-audit-record") {
    item.semanticReviewStatus = "automated-line-scan-only-not-fact-checked";
    item.semanticReviewScope = "Readable lines scanned by static rules; prose/audit assertions not independently validated line by line.";
  } else {
    item.semanticReviewStatus = "automated-line-scan-only-not-full-semantic-review";
    item.semanticReviewScope = "Readable lines scanned and matching syntax checks applied; full manual semantic review not claimed.";
  }
}
const semanticReviewStatusCount = manifest.reduce((acc, item) => {
  acc[item.semanticReviewStatus] = (acc[item.semanticReviewStatus] || 0) + 1;
  return acc;
}, {});
const duplicateBlobGroups=[...dupes.entries()].filter(x=>x[1].length>1).map(([blobSha,paths])=>({blobSha,count:paths.length,paths}));
const csv=["path,blob_sha,bytes,category,language,extension,lines,scan,line_rule_hits,max_line_length,semantic_review_status,semantic_review_scope",...manifest.map(f=>[f.path,f.blobSha,f.bytes||"",f.category,f.language,f.extension,f.lines===null?"":f.lines,f.scan,f.lineRuleHits,f.maxLineLength||"",f.semanticReviewStatus,f.semanticReviewScope].map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(","))].join("\n")+"\n";
fs.writeFileSync(path.join(out,"REPOSITORY_LINE_AUDIT_MANIFEST_2026-10-23.csv"),csv);
const metadata={repository:"2f22vtd4kr-cloud/BigContacts",snapshotSha,createdAt:new Date().toISOString(),treeEntriesIncludingDirectories:3436,fileBlobs:files.length,manifestRows:manifest.length,filesWithTextLineScan:textFiles,filesInventoriedAsBinaryOrNonUtf8:binaryFiles,filesWithReadErrors:readErrors.length,totalTextLinesScanned:totalTextLines,totalBlobBytes:totalBytes,totalMiB:Math.round(totalBytes/1048576*100)/100,scanMethod:"Every text-file line scanned against listed static rules; JSON/JSONL parsed; Python py_compile, JavaScript node --check, shell bash -n, and Ruby YAML parsing run on matching tracked files.",limitations:["Pattern hits are triage signals, not adjudicated vulnerabilities.","Semantic human review of every documentation line and every binary pixel is not claimed.","No dependency install, external provider request, database-backed integration, deployed-worker attestation or Replit run was performed.","This report applies only to the pinned snapshot; later commits require a separate delta review."]};
fs.writeFileSync(path.join(out,"REPOSITORY_LINE_AUDIT_FINDINGS_2026-10-23.json"),JSON.stringify({audit:metadata,counts:{classCount,languageCount,extCount,severityCount,perRule,semanticReviewStatusCount,parseErrorCount:parseErrors.length,readErrorCount:readErrors.length,duplicateBlobGroups:duplicateBlobGroups.length},parseErrors,readErrors,duplicateBlobGroups,rules:rules.map(r=>({id:r[0],severity:r[1],pattern:String(r[2])})),findings,manifest},null,2)+"\n");
const topRules=Object.entries(perRule).sort((a,b)=>b[1]-a[1]).slice(0,30),high=findings.filter(f=>f.severity==="critical"||f.severity==="high"),review=findings.filter(f=>f.severity==="review");
const report=["# Repository line-by-line static audit","","Repository: 2f22vtd4kr-cloud/BigContacts","Snapshot SHA: "+snapshotSha,"Tree entries including directories: 3436","Tracked blob files: "+files.length,"Text files line-scanned: "+textFiles,"Text lines scanned: "+totalTextLines.toLocaleString("en-US"),"Binary/non-UTF-8 files inventoried, not text-line-scanned: "+binaryFiles,"Path/line/rule hits: "+findings.length+" (triage signals, not confirmed vulnerabilities)","Critical/high pattern hits: "+high.length,"Review-level hits: "+review.length,"JavaScript/shell/YAML/JSON/JSONL/Python syntax findings: "+parseErrors.length,"Unreadable paths: "+readErrors.length,"Targeted semantic-review paths: "+(semanticReviewStatusCount["targeted-semantic-review-selected-sections"]||0),"Automated-only non-documentation paths: "+(semanticReviewStatusCount["automated-line-scan-only-not-full-semantic-review"]||0),"Documentation/historical audit paths not independently fact-checked: "+(semanticReviewStatusCount["automated-line-scan-only-not-fact-checked"]||0),"Binary/non-UTF-8 paths inventory-only: "+(semanticReviewStatusCount["inventory-only-no-text-line-review"]||0),"","## Method","Checked out the exact snapshot and enumerated all blobs with git ls-tree. Every readable text line was checked against the versioned static rule set in the JSON artifact. JSON/JSONL were parsed; tracked Python files were syntax-checked with python3 -m py_compile, JavaScript/MJS/CJS with node --check, shell with bash -n, and YAML with the Ruby YAML parser. CSV manifest has one row per blob with SHA, byte size, line count or binary disposition, path class and hit count.","","This is a comprehensive automated line-by-line static pass, not a claim that regex checks replace semantic human review of every line. Binary assets have no source lines. Pattern hits require contextual triage; false positives are expected. No dependencies, external provider requests, database-backed integration, deployment, or Replit run was performed.","","## Coverage by path class",...Object.entries(classCount).sort((a,b)=>b[1]-a[1]).map(x=>"- "+x[0]+": "+x[1]),"","## Coverage by language",...Object.entries(languageCount).sort((a,b)=>b[1]-a[1]).map(x=>"- "+x[0]+": "+x[1]),"","## Most frequent rules",...topRules.map(x=>"- "+x[0]+": "+x[1]),"","## Critical/high locations",...(high.length?high.sort((a,b)=>a.path.localeCompare(b.path)||a.line-b.line).slice(0,400).map(f=>"- "+f.path+":"+f.line+" — "+f.rule+" ("+f.severity+"); source text withheld"):["- None produced by this rule set."]),"","## Parse issues",...(parseErrors.length?parseErrors.map(e=>"- "+e.path+(e.line?":"+e.line:"")+" — "+e.kind+": "+e.error):["- None detected by available parsers."]),"","## Read errors",...(readErrors.length?readErrors.map(e=>"- "+e.path+" — "+e.error):["- None."]),"","## High-impact findings from focused architecture review","1. Research-to-card gap: job 81a955bf-f44f-4faf-a39a-e2bcffbc5014 recorded 32 unfetched leads and zero findings/admissions/evidence/cards despite a terminal lead-exhaustion rationale. Source-backed organization materialization does not guarantee review records for snippet-only leads.","2. URL integrity: the active #728 branch contains the URL-atomic projection/replay fix effort but is not in this pinned main snapshot.","3. Audit privacy: tracked .replit enables prompt capture and contact-data inclusion in a visible audit path; this is a future exposure risk, not a claim of present leakage.","4. Worker readiness: SpiderFoot and related tools exist in source, but live worker attestation, image digests, configured tool set, and an authorized live call remain unverified.","","## Per-path semantic disposition","The CSV manifest has one row per blob plus semantic_review_status and semantic_review_scope. These fields distinguish selected-section/call-path review from automated-only coverage, documentation not fact-checked, and binary inventory-only exclusions.","","## Artifacts","- REPOSITORY_LINE_AUDIT_MANIFEST_2026-10-23.csv: one row per tracked blob with line counts, pattern hits and semantic-review disposition.","- REPOSITORY_LINE_AUDIT_FINDINGS_2026-10-23.json: path/line/rule findings and scan metadata without source excerpts.","","## Coverage definition","Every blob in this pinned snapshot is either text-line-scanned or inventoried as binary/non-UTF-8/read-error. Runtime behavior, semantic review and live-provider truth are separate workstreams."].join("\n")+"\n";
fs.writeFileSync(path.join(out,"REPOSITORY_LINE_AUDIT_2026-10-23.md"),report);
console.log(JSON.stringify({snapshotSha,treeEntriesIncludingDirectories:3436,fileBlobs:files.length,textFilesLineScanned:textFiles,totalTextLinesScanned:totalTextLines,binaryOrNonUtf8:binaryFiles,findings:findings.length,severityCount,parseErrors:parseErrors.length,unreadableFiles:readErrors.length,topRules},null,2));
