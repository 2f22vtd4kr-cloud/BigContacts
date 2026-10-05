import fs from "node:fs";
const read=(p)=>fs.readFileSync(p,"utf8");
const core=read("artifacts/api-server/src/src/lib/agentic-web-research-core.ts");
const browser=read("artifacts/api-server/src/src/lib/browser-fetch-core.ts");
const domain=read("artifacts/api-server/src/src/lib/domain-surface.ts");
const gate=read("artifacts/api-server/src/src/lib/provider-gate.ts");
const failures=[];
const check=(ok,msg)=>{if(!ok) failures.push(msg);};
check(/action === "browser_fetch"[\s\S]*?cleanText\(value\.provider/.test(core),"browser_fetch must require a model-selected provider.");
check(/action === "domain_lookup"[\s\S]*?cleanText\(value\.provider/.test(core),"domain_lookup must require a model-selected provider.");
check(/provider: \{ type: \[\"string\",\"null\"\], enum: \[\"serper\",\"tavily\",\"exa\",\"rdap\",\"whoisjson\",\"scrapfly\",\"zenrows\",\"browserless\",\"playwright\",null\] \}/.test(core),"structured action schema must admit explicit domain/browser providers.");
check(/options\.provider \? attempts\.filter/.test(browser) && !/for \(const \[provider, fn\] of attempts\) \{/.test(browser),"browser retrieval must execute only the selected provider.");
check(/provider: DomainLookupProvider/.test(domain) && /if \(options\.provider === "rdap"\)/.test(domain) && !/Promise\.all\(\[rdap, whoisjson\]/.test(domain),"domain lookup must execute only the selected provider.");
check(/"playwright":"scrape"/.test(gate) && /rdap:"registry"/.test(gate),"explicit browser/RDAP providers must have scoped provider budgets.");
if(failures.length){console.error("MODEL PROVIDER CHOICE BOUNDARY: FAIL");for(const f of failures)console.error("- "+f);process.exit(1);}
console.log("MODEL PROVIDER CHOICE BOUNDARY: PASS");
