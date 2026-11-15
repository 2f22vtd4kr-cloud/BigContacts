import fs from "node:fs";
const target=fs.readFileSync("artifacts/api-server/src/src/lib/target-contact-agent.ts","utf8");
const bureau=fs.readFileSync("artifacts/api-server/src/src/lib/bureau-agentic-pass.ts","utf8");
const entrypoint=fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research.ts","utf8");
const runner=fs.readFileSync("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts","utf8");
const oversight=fs.readFileSync("artifacts/api-server/src/src/lib/target-act-oversight.ts","utf8");
const core=fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts","utf8");
const discovery=fs.readFileSync("artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts","utf8");
const checks=[
["target event callback is serialized",/investigationEventChain\s*=\s*investigationEventChain\.then/.test(target)],
["target event callback is drained",/await investigationEventChain;/.test(target)],
["bureau event callback is serialized",/(?:investigationEventChain|eventChain)\s*=\s*(?:investigationEventChain|eventChain)\.then/.test(bureau)],
["bureau event callback is drained",/await (?:investigationEventChain|eventChain);/.test(bureau)],
["target no fire-and-forget investigation callback",!/void input\.onInvestigationAct\?\./.test(target)],
["bureau no fire-and-forget investigation callback",!/void input\.onInvestigationAct\?\./.test(bureau)],
["target Investigator is stepped one act at a time",/maxIterations:\s*1/.test(entrypoint)],
["target act preserves Boss control and conditionally invokes Right-hand for consequential decisions",/await reviewTargetInvestigationAct\(/.test(runner)&&/shouldReviewTargetActWithRightHand/.test(oversight)&&/previousBossDisposition: lastOversight\?\.action/.test(runner)&&/status: "deferred"/.test(oversight)&&/generateGroqBossText/.test(oversight)],
["target opening defers Right-hand until Investigator observations",/rightHandOpening = \{ status: "deferred"/.test(runner)&&!/runGroqRightHandFreeJson/.test(runner)],
["target act lookup is tied to durable case state",/loadTargetActOversightContext\(input\.caseId, input\.targetName\)/.test(entrypoint)],
["discovery bypasses target per-act gate",/input\.mode === "discovery"/.test(entrypoint)],
["oversight has explicit continue redirect stop dispositions",/continue[\s\S]{0,200}redirect[\s\S]{0,200}stop/.test(oversight)],
["consequential Right-hand unavailability fails closed while routine turns defer review",/rightHand.status!==\"completed\"/.test(oversight)&&/shouldReviewTargetActWithRightHand/.test(oversight)&&/status: \"deferred\"/.test(oversight)&&/fail-closed/.test(oversight)],
["oversight persists control decisions",/eventType\s*:\s*"control_decision"/.test(oversight)&&/investigatorActOversight/.test(oversight)],
["target oversight allocates monotonic durable event iterations",/nextResearchCaseEventIteration/.test(oversight)&&/MAX\(\$\{researchCaseEventsTable\.iteration\}\)/.test(oversight)&&/eventIterationFloor=nextResearchCaseEventIteration\(sourceTurn,eventIterationFloor\)/.test(oversight)],
["target replay writes historical source observations before current act and Boss decision",oversight.indexOf("const sourceEventIds")<oversight.indexOf("const inserted=await tx.insert(researchCaseEventsTable)")&&oversight.indexOf("eventType:\"tool_observation\"")<oversight.indexOf("eventType:\"control_decision\"")&&/sourceRecord of \[\.\.\.\(safeAct\.sourceRecords\?\?\[\]\)\]\.sort\(\(a,b\)=>a\.turn-b\.turn\)/.test(oversight)],
["daily token exhaustion is a distinct Investigator result",/status: "completed"[^;]+\| "budget_exhausted"/.test(core)&&/DAILY_TOKEN_BUDGET_EXHAUSTED/.test(core)],
["budget exhaustion parks discovery without another Boss or Investigator call",/discovery\.status === "budget_exhausted"/.test(discovery)&&/targetResult\.budgetExhausted/.test(discovery)&&/daily-token-budget-exhausted/.test(discovery)],
["budget-stopped target cases resume safely under a per-target lock",/atlas-target-case:\$\{target\.id\}/.test(runner)&&/isBudgetStoppedTargetCase/.test(runner)&&/resumeBudgetStoppedCase/.test(runner)&&/previousAtlasJobIds/.test(runner)&&/resuming-after-daily-budget-stop/.test(runner)],
["target budget exhaustion is persisted in the case event stream",/status === "budget_exhausted"/.test(runner)&&/researchCaseEventsTable/.test(runner)&&/daily-token-budget-exhausted/.test(runner)&&/providerEgressAttempted: false/.test(runner)],
];
let failed=false;for(const[name,ok]of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed=true;}if(failed)process.exit(1);
