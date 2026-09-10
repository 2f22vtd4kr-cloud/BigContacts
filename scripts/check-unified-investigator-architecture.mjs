import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = {
  research: path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research-core.ts"),
  bureau: path.join(root, "artifacts/api-server/src/src/lib/case-bureau.ts"),
  prompt: path.join(root, "artifacts/api-server/src/src/lib/case-bureau-prompt.ts"),
  pass: path.join(root, "artifacts/api-server/src/src/lib/bureau-agentic-pass.ts"),
  canonicalCase: path.join(root, "artifacts/api-server/src/src/routes/research/canonical-case-discovery.ts"),
  caseData: path.join(root, "artifacts/api-server/src/src/routes/research/case-data.ts"),
  caseRetirement: path.join(root, "artifacts/api-server/src/src/routes/research/legacy-case-execution-retirement.ts"),
  canonicalAtlas: path.join(root, "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts"),
  atlasControl: path.join(root, "artifacts/api-server/src/src/lib/atlas-control-decision.ts"),
  canonicalTarget: path.join(root, "artifacts/api-server/src/src/lib/canonical-single-target-runner.ts"),
  targetAgent: path.join(root, "artifacts/api-server/src/src/lib/target-contact-agent.ts"),
  launchRoute: path.join(root, "artifacts/api-server/src/routes/atlas.ts"),
  researchRoutes: path.join(root, "artifacts/api-server/src/src/routes/research.ts"),
  legacyResearchRoutes: path.join(root, "artifacts/api-server/src/routes/research.ts"),
  apiRoutes: path.join(root, "artifacts/api-server/src/routes/index.ts"),
  entrypoint: path.join(root, "artifacts/api-server/src/src/index.ts"),
  startupRecovery: path.join(root, "artifacts/api-server/src/src/lib/startup-recovery.ts"),
  orientation: path.join(root, "artifacts/api-server/src/src/lib/apex-bureau-orientation.ts"),
  finalReview: path.join(root, "artifacts/api-server/src/src/lib/ai-extractor.ts"),
  legacyFinalReview: path.join(root, "artifacts/api-server/src/lib/ai-extractor.ts"),
  architecture: path.join(root, "docs/BUREAU_REACT_ARCHITECTURE.md"),
};

const source = Object.fromEntries(Object.entries(files).map(([name, file]) => {
  if (!fs.existsSync(file)) throw new Error(`missing required architecture file: ${file}`);
  return [name, fs.readFileSync(file, "utf8")];
}));
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(!/DEEPSEEK_INVESTIGATOR_MODEL|\["deepseek",\s*callDeepSeekJson\]|\bname === "deepseek"/.test(source.research), "DeepSeek is present in the Investigator adapter pool; DeepSeek must remain Right-hand only.");
assert(!/Gemini.*Investigator fallback|investigator.*Gemini.*fallback/i.test(source.prompt + source.bureau), "Gemini appears to be an Investigator fallback.");
assert(!/Groq\s*[→>-]+\s*Mistral|Mistral\s*[→>-]+\s*Groq/.test(source.research + source.bureau + source.prompt), "Active runtime still contains a Groq→Mistral Investigator chain.");
assert(!/Prefer\s+Serper.*Tavily.*Exa/i.test(source.research), "Active research runtime contains a ranked Serper→Tavily→Exa preference list.");
assert(!/const\s+serper\s*=.*\n\s*if\s*\(serper.*\n\s*const\s+tavily\s*=.*\n\s*if\s*\(tavily.*\n\s*const\s+exa\s*=/s.test(source.research), "Active research runtime contains deterministic sequential search-provider selection.");
assert(!/web_search routes Serper\s*[→>-]+\s*Tavily/i.test(source.orientation), "Investigator orientation still teaches a fixed search-provider route.");

assert(!/Begin\. Choose an initial web_search query/i.test(source.research), "Investigator ReAct still contains a forced initial web_search instruction.");
assert(!/web_search[^\n]*provider[^\n]*undefined|provider[^\n]*fallback[^\n]*web_search/i.test(source.research), "web_search appears to have an implicit provider-selection fallback.");

assert(!/generateGroqBossText|Groq text fallback for Boss/i.test(source.bureau), "Groq is still exposed as a Boss planning fallback.");
const groqFinalFallback = /groq-final-review-fallback/i;
assert(!groqFinalFallback.test(source.finalReview), "Groq is still exposed as a final card review/decision layer in canonical source.");
assert(!groqFinalFallback.test(source.legacyFinalReview), "Groq is still exposed as a final card review/decision layer in legacy source.");

assert(/investigatorLlm/.test(source.bureau), "Boss plan does not expose investigatorLlm.");
assert(/investigatorLlm/.test(source.pass), "ReAct pass does not accept investigatorLlm.");
assert(/investigatorLlm/.test(source.research), "ReAct research runtime does not receive investigatorLlm.");
assert(/runBureauAgenticWebPass\(\{[\s\S]*?investigatorLlm\s*:/.test(source.canonicalCase), "Case discovery invocation is not visibly bound to the Boss-selected Investigator.");
assert(/runBureauAgenticWebPass\(\{[\s\S]*?caseId\s*,/.test(source.canonicalCase), "Canonical case discovery does not mount its durable discovery case context into the Investigator.");
assert(/investigatorLlm\s*:/.test(source.canonicalAtlas), "Canonical Atlas discovery does not bind the selected Investigator.");
assert(/runBureauAgenticWebPass\(\{[\s\S]*?caseId\s*:/.test(source.canonicalAtlas), "Canonical Atlas discovery does not mount a durable discovery case context into the Investigator.");
assert(/decideAtlasNextAction\s*\(/.test(source.canonicalAtlas), "Canonical Atlas discovery does not delegate the next research action to the AI control plane.");
assert(/Allowed actions:[\s\S]*continue_discovery[\s\S]*research_candidate[\s\S]*revisit_candidate[\s\S]*pivot_discovery[\s\S]*stop/.test(source.atlasControl), "Atlas control decision does not expose the required model-owned transition actions.");
assert(/resolveGeminiBossModel\s*\(/.test(source.atlasControl) && /runDeepSeekFreeJson\s*\(/.test(source.atlasControl), "Atlas transition control does not use Gemini Boss plus DeepSeek Right-hand oversight.");
assert(/candidateNames\.some\(/.test(source.atlasControl) && /fail-closed/.test(source.atlasControl), "Atlas control decision does not bind target selection to explicit admissions and fail closed.");
assert(/runTargetContactAgent\(\{[\s\S]*?investigatorLlm\s*:/.test(source.canonicalTarget), "Canonical target runner does not bind the selected Investigator into the target Dig.");
assert(/runTargetContactAgent\(\{[\s\S]*?contextDocument\s*:/.test(source.canonicalTarget), "Canonical target runner does not mount durable context into the Target Investigator.");
assert(/refusing context-free Investigator run/.test(source.targetAgent), "Target Investigator does not explicitly refuse context-free execution.");
assert(/const contextDocument = typeof input\.contextDocument === "string" \? input\.contextDocument\.trim\(\) : "";/.test(source.targetAgent), "Target Investigator does not normalize its durable context input.");
assert(/if \(!contextDocument\)\s*\{[\s\S]*?return \{ status: "unavailable"/.test(source.targetAgent), "Target Investigator does not fail closed when durable context is absent.");
assert(/runCanonicalSingleTargetInvestigation/.test(source.launchRoute), "Atlas launch route does not expose the canonical single-target control plane.");

assert(/canonical-case-discovery/.test(source.researchRoutes), "Canonical case-discovery router is not mounted.");
assert(/canonical-case-continuation/.test(source.researchRoutes), "Canonical case-continuation router is not mounted.");
assert(/case-data/.test(source.researchRoutes), "Durable case data router is not mounted.");
assert(/legacy-case-execution-retirement/.test(source.researchRoutes), "Legacy case execution retirement router is not mounted.");
assert(!/from "\.\/research\/cases"/.test(source.researchRoutes), "Legacy mixed research/cases router is still imported by the live canonical research router.");
assert(!/router\.use\(casesRouter\)/.test(source.researchRoutes), "Legacy mixed research/cases router is still mounted by the live canonical research router.");
assert(/status\(410\)/.test(source.caseRetirement), "Legacy case execution retirement router does not return explicit HTTP 410 responses.");
assert(/initial-research/.test(source.caseRetirement) && /admit-candidate/.test(source.caseRetirement) && /promote-target/.test(source.caseRetirement) && /run-boss-review/.test(source.caseRetirement), "Legacy case execution retirement router does not cover every retired manual execution endpoint.");
assert(!/runBureauAgenticWebPass|runBroadDiscovery|runMistralWebSearch|searchRegistry|expandSecondaryPublicSurface/.test(source.caseData), "Case data router contains research execution logic; persistence/read surfaces must remain non-research.");

assert(/canonical-atlas-discovery/.test(source.launchRoute), "Atlas launch route is not wired to canonical model-owned discovery.");
assert(!/atlas-orchestrator/.test(source.launchRoute), "Atlas launch route still imports the legacy deterministic orchestrator.");
assert(!/\brunPhaseJBatch\s*\(|\bexpandSecondaryPublicSurface\s*\(|\brunBroadDiscovery\s*|\brunMcts\s*\(|\brunTargetResearch\s*\(/.test(source.canonicalAtlas), "Canonical Atlas runner contains a retired deterministic research path.");

assert(!/for\s*\(const\s+name\s+of\s+admitted\)[\s\S]{0,12000}runCanonicalSingleTargetInvestigation\s*\(/.test(source.canonicalAtlas), "Canonical Atlas hard-wires discovery→target research as a deterministic phase transition; #134 remains unresolved.");

// The legacy mixed cases.ts research executor is intentionally quarantined by the route
// graph. It is no longer a required live architecture source; deletion/reachability cleanup
// is tracked separately under #129/#138. The live router must not import or mount it.
assert(!/cases\.ts/.test(source.researchRoutes), "Live canonical research router still references quarantined cases.ts.");

assert(!/mctsRouter|bulkRouter/.test(source.legacyResearchRoutes), "Legacy API research router still mounts deterministic MCTS or bulk-hybrid research.");
assert(!/import\s+phaseJRouter\s+from\s+["']\.\/phase-j["']/.test(source.apiRoutes), "Legacy deterministic Phase J router is still imported by the live API route index.");
assert(!/router\.use\(phaseJRouter\)/.test(source.apiRoutes), "Legacy deterministic Phase J router is still mounted in the live API.");

assert(/from "\.\/lib\/startup-recovery"/.test(source.entrypoint), "Live API entrypoint does not use lifecycle-only startup recovery.");
assert(!/from "\.\/lib\/startup"/.test(source.entrypoint), "Live API entrypoint still imports the retired startup research scheduler.");
assert(/Startup recovery complete/.test(source.startupRecovery), "Lifecycle-only startup recovery is missing its explicit no-research completion marker.");
assert(!/runBroadDiscovery|bulk-run|deep-web-osint|social-discovery|messenger-discovery|in-house-enrich/.test(source.startupRecovery), "Lifecycle-only startup recovery contains a research/enrichment trigger.");

assert(!/findingsFrom(?:PeopleSnippet|ProxyPage|IrAndRelatedBlocks|ContactFacts)[\s\S]{0,18000}personName:\s*targetName/.test(source.research), "ReAct observation extraction still injects target-derived personName into deterministic findings; #136 remains unresolved.");
assert(!/findingsFrom(?:PeopleSnippet|ProxyPage|IrAndRelatedBlocks|ContactFacts)[\s\S]{0,18000}scope:\s*"candidate"/.test(source.research), "ReAct observation extraction still manufactures candidate scope before an Investigator promotion decision; #136 remains unresolved.");

assert(/Gemini/.test(source.architecture) && /DeepSeek/.test(source.architecture) && /Investigator LLM pool/.test(source.architecture), "Canonical ReAct architecture document is missing the two-layer role law.");
assert(/no forced search order/i.test(source.architecture), "Canonical ReAct architecture document does not state the no-forced-search-order invariant.");

if (failures.length) {
  console.error("UNIFIED INVESTIGATOR ARCHITECTURE: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("UNIFIED INVESTIGATOR ARCHITECTURE: PASS");
console.log("- Gemini remains Boss only");
console.log("- DeepSeek remains Right-hand only");
console.log("- Groq/Mistral remain Investigator LLMs, not a sequential chain or reviewer tier");
console.log("- Investigator selection propagates into active ReAct paths");
console.log("- Search/browser/registry/OSINT remain model-selected capabilities");
console.log("- Discovery and Target Investigator paths mount durable case context");
console.log("- Discovery cannot deterministically force the next target-research phase");
console.log("- Atlas transition is selected by Gemini after DeepSeek advice and bounded by deterministic safety validation");
console.log("- Startup recovery is lifecycle-only; mass research cannot begin at boot");
console.log("- Legacy deterministic research is not publicly mounted");