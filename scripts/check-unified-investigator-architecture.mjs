import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = {
  research: path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research-core.ts"),
  bureau: path.join(root, "artifacts/api-server/src/src/lib/case-bureau.ts"),
  prompt: path.join(root, "artifacts/api-server/src/src/lib/case-bureau-prompt.ts"),
  pass: path.join(root, "artifacts/api-server/src/src/lib/bureau-agentic-pass.ts"),
  cases: path.join(root, "artifacts/api-server/src/src/routes/research/cases.ts"),
  canonicalCase: path.join(root, "artifacts/api-server/src/src/routes/research/canonical-case-discovery.ts"),
  canonicalAtlas: path.join(root, "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts"),
  canonicalTarget: path.join(root, "artifacts/api-server/src/src/lib/canonical-single-target-runner.ts"),
  targetAgent: path.join(root, "artifacts/api-server/src/src/lib/target-contact-agent.ts"),
  launchRoute: path.join(root, "artifacts/api-server/src/routes/atlas.ts"),
  researchRoutes: path.join(root, "artifacts/api-server/src/src/routes/research.ts"),
  apiRoutes: path.join(root, "artifacts/api-server/src/routes/index.ts"),
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
assert(/runBureauAgenticWebPass\(\{[\s\S]*?investigatorLlm\s*:/.test(source.canonicalCase + source.cases), "Case discovery invocation is not visibly bound to the Boss-selected Investigator.");
assert(/runBureauAgenticWebPass\(\{[\s\S]*?caseId\s*,/.test(source.canonicalCase), "Canonical case discovery does not mount its durable discovery case context into the Investigator.");
assert(/investigatorLlm\s*:/.test(source.canonicalAtlas), "Canonical Atlas discovery does not bind the selected Investigator.");
assert(/runBureauAgenticWebPass\(\{[\s\S]*?caseId\s*:/.test(source.canonicalAtlas), "Canonical Atlas discovery does not mount a durable discovery case context into the Investigator.");
assert(/runTargetContactAgent\(\{[\s\S]*?investigatorLlm\s*:/.test(source.canonicalTarget), "Canonical target runner does not bind the selected Investigator into the target Dig.");
assert(/runTargetContactAgent\(\{[\s\S]*?contextDocument\s*:/.test(source.canonicalTarget), "Canonical target runner does not mount durable context into the Target Investigator.");
assert(/refusing context-free Investigator run/.test(source.targetAgent), "Target Investigator does not explicitly refuse context-free execution.");
assert(/const contextDocument = typeof input\.contextDocument === "string" \? input\.contextDocument\.trim\(\) : "";/.test(source.targetAgent), "Target Investigator does not normalize its durable context input.");
assert(/if \(!contextDocument\)\s*\{[\s\S]*?return \{ status: "unavailable"/.test(source.targetAgent), "Target Investigator does not fail closed when durable context is absent.");
assert(/runCanonicalSingleTargetInvestigation/.test(source.launchRoute), "Atlas launch route does not expose the canonical single-target control plane.");

assert(/canonical-case-discovery/.test(source.researchRoutes), "Canonical case-discovery router is not mounted.");
assert(/router\.use\(canonicalCaseDiscoveryRouter\)[\s\S]*router\.use\(casesRouter\)/.test(source.researchRoutes), "Legacy cases router is mounted before canonical case discovery.");

assert(/canonical-atlas-discovery/.test(source.launchRoute), "Atlas launch route is not wired to canonical model-owned discovery.");
assert(!/atlas-orchestrator/.test(source.launchRoute), "Atlas launch route still imports the legacy deterministic orchestrator.");
assert(!/\brunPhaseJBatch\s*\(|\bexpandSecondaryPublicSurface\s*\(|\brunBroadDiscovery\s*|\brunMcts\s*\(|\brunTargetResearch\s*\(/.test(source.canonicalAtlas), "Canonical Atlas runner contains a retired deterministic research path.");

assert(!/import\s+phaseJRouter\s+from\s+["']\.\/phase-j["']/.test(source.apiRoutes), "Legacy deterministic Phase J router is still imported by the live API route index.");
assert(!/router\.use\(phaseJRouter\)/.test(source.apiRoutes), "Legacy deterministic Phase J router is still mounted in the live API.");

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
console.log("- Legacy deterministic research is not publicly mounted");