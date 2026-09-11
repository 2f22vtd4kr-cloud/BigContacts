#!/usr/bin/env node
import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const checks = [];
const pass = (name, ok) => checks.push([name, Boolean(ok)]);

const wrapper = read("artifacts/api-server/src/src/lib/agentic-web-research.ts");
const agentic = read("artifacts/api-server/src/src/lib/agentic-web-research-core.ts");
const strict = read("artifacts/api-server/src/src/lib/bureau-contact-persist-strict.ts");
const batch = read(".github/workflows/apex-batch10.yml");
const discovery = read("artifacts/api-server/src/src/lib/discovery-agent.ts");
const orchestrator = read("artifacts/api-server/src/src/lib/atlas-orchestrator.ts");
const registry = read("artifacts/api-server/src/src/lib/registry-client.ts");
const pythonTools = read("artifacts/api-server/src/src/lib/python-tools.ts");
const aiExtractor = read("artifacts/api-server/src/src/lib/ai-extractor.ts");
const entities = read("artifacts/api-server/src/src/routes/entities.ts");
const legacyAtlas = read("artifacts/api-server/src/src/routes/atlas.ts");
const legacyGuard = read("artifacts/api-server/src/src/lib/legacy-apex-mutation-guard.ts");
const launchQuarantine = read("artifacts/api-server/src/src/lib/legacy-atlas-launch-quarantine.ts");
const routesIndex = read("artifacts/api-server/src/src/routes/index.ts");
const canonicalLaunch = read("artifacts/api-server/src/src/routes/research/canonical-atlas-launch.ts");
const packageJson = read("artifacts/api-server/package.json");
const canonicalRunner = read("artifacts/api-server/src/src/lib/canonical-single-target-runner.ts");

const canonicalSources = [wrapper, agentic, strict, batch, discovery, orchestrator, registry, pythonTools, aiExtractor, entities, legacyAtlas, legacyGuard, launchQuarantine, routesIndex, canonicalLaunch, canonicalRunner];

pass("launch gate inspects source without executing repository code", !canonicalSources.some((source) => /execFileSync\(|spawnSync\(|child_process/.test(source)));
pass("Investigator wrapper mounts canonical core", wrapper.includes("agentic-web-research-core"));
pass("Investigator adapter pool contains Groq", /callGroqJson/.test(agentic));
pass("Investigator adapter pool contains Mistral", /callMistralJson/.test(agentic));
pass("Boss-selected Investigator reaches llmStep", /investigatorLlm\?: "groq" \| "mistral"/.test(agentic) && /selectedInvestigatorLlm/.test(agentic) && /llmStep/.test(agentic));
pass("selected Investigator is first-class, not a fixed research stage", /selectedInvestigatorLlm/.test(agentic) && !/const orderedProviders\s*=/.test(agentic) && !/selectedInvestigatorLlm\s*,\s*\.\.\./.test(agentic));
pass("no forced search-provider order", !/Prefer Serper.*Tavily.*Exa/i.test(agentic) && !/Serper\s*[→>-]+\s*Tavily\s*[→>-]+\s*Exa/i.test(agentic));
pass("canonical Dig lane has no Gemini implementation", !/callGeminiJson/.test(agentic));
pass("canonical Dig lane has no NVIDIA implementation", !/callNvidiaJson/.test(agentic));
pass("strict boundary does not import legacy projector", !/from [\"']\.\/bureau-contact-persist[\"']/.test(strict));
pass("strict boundary has explicit investigator selection API", /applyInvestigatorSelectedContactToEntityCard/.test(strict));
pass("strict boundary rejects query URLs", /SEARCH_QUERY_URL/.test(strict) && /search-index/.test(strict));
pass("strict promotion is entity-bound", /expectedEntityId/.test(strict) && /caseRow\.targetEntityId!==expectedEntityId/.test(strict));
pass("strict promotion wins only an empty destination field", /or\(isNull\(fieldColumn\),eq\(fieldColumn,\"\"\)\)/.test(strict));
pass("strict promotion merges provenance atomically", /jsonb_set\(/.test(strict) && /\.returning\(\{id:entitiesTable\.id\}\)/.test(strict));
pass("manual live audit is bounded to three targets", /[\"']targetCount[\"']\s*:\s*3/.test(batch) && !/[\"']targetCount[\"']\s*:\s*10/.test(batch));
pass("manual audit runs agentic runtime checks", /check:agentic-runtime/.test(batch));
pass("discovery emits model-selection progress", /onSlotProgress\?/.test(discovery));
pass("orchestrator defaults target limit to three", /opts\.targetCount \?\? 3/.test(orchestrator));
pass("orchestrator does not force a ten-target default", !/opts\.targetCount \?\? 10/.test(orchestrator));
pass("first Investigator action is not seeded with web_search", !/Begin\. Choose an initial web_search query/i.test(agentic) && !/\(none — begin with web_search\)/i.test(agentic));
pass("Maigret is individually selectable", agentic.includes('"footprint_username_maigret"'));
pass("Sherlock is individually selectable", agentic.includes('"footprint_username_sherlock"'));
pass("compound username action is gone", !/action === "footprint_username"/.test(agentic));
pass("Maigret receives run cancellation", /runMaigret\([^\n]*signal:\s*runController\.signal/.test(agentic));
pass("Sherlock receives run cancellation", /runSherlock\([^\n]*signal:\s*runController\.signal/.test(agentic));
pass("registry receives run cancellation", agentic.includes("limit: 8, signal: runController.signal"));
pass("registry transport composes caller cancellation with local timeout", registry.includes("function createRegistryRequestSignal") && registry.includes("AbortSignal.any([signal, timeoutSignal])"));
pass("registry has no timeout-only fetch signal", !/signal:\s*AbortSignal\.timeout\(/.test(registry));
pass("Python OSINT source fails closed", pythonTools.includes("authorizePythonSandboxRequest") && pythonTools.includes("available: false"));
pass("Python OSINT does not directly spawn subprocesses", !/from [\"']node:child_process[\"']|from [\"']child_process[\"']|execFile|spawn\(|spawnSync\(/.test(pythonTools));
pass("Python OSINT availability requires attestation", pythonTools.includes('state === "attested"') && pythonTools.includes('allowedCapabilities.includes("network_osint")'));
pass("harvest_domain is fail-closed behind the Python sandbox contract", /runTheHarvester/.test(agentic) && pythonTools.includes('available: false') && pythonTools.includes('const blocked = authorizeNetworkPython(options.signal)'));
pass("Groq is not a final reviewer", !/Groq capacity fallback|groq-final-review-fallback/.test(aiExtractor));
pass("DeepSeek final review remains available", /runDeepSeekFinalReview/.test(aiExtractor));
pass("final review fails closed", /unavailable-final-review/.test(aiExtractor));
pass("legacy entity contact-repair routes are retired at the mutation boundary", legacyGuard.includes("/entities/rehydrate-contacts") && legacyGuard.includes("/entities/fix-outcome-honesty"));
pass("canonical observation layer does not inherit target identity", !/personName:\s*(?:targetName|name)\b/.test(agentic));
pass("canonical Atlas launch does not import the historical orchestrator", !/atlas-orchestrator|runAtlasPipeline/.test(canonicalLaunch));
pass("canonical target runner does not import the historical orchestrator", !/atlas-orchestrator|runAtlasPipeline/.test(canonicalRunner));
pass("historical Atlas launch has defense-in-depth quarantine", /legacyAtlasLaunchQuarantine/.test(routesIndex) && /POST.*\/ingest\/atlas-run/.test(launchQuarantine) && /status\(410\)/.test(launchQuarantine));
const canonicalMount = routesIndex.indexOf("router.use(canonicalAtlasLaunchRouter)");
const quarantineMount = routesIndex.indexOf("router.use(legacyAtlasLaunchQuarantine)");
const legacyMount = routesIndex.indexOf("router.use(atlasRouter)");
pass("historical Atlas router is not the canonical launch boundary", canonicalMount >= 0 && quarantineMount > canonicalMount && legacyMount > quarantineMount);
pass("legacy Atlas launch cannot be reached through the quarantine boundary", /router\.post\(\"\/ingest\/atlas-run\"/.test(legacyAtlas) && /Legacy Atlas launch route retired/.test(launchQuarantine));
pass("username migration hardener is no longer in API scripts", !packageJson.includes("apply-agentic-username-capability-split.mjs"));
pass("canonical target runner steps one Investigator act", /maxIterations:\s*1/.test(canonicalRunner));
pass("canonical target runner requires durable oversight", /!lastOversight \|\| lastOversight\.status !== "completed"/.test(canonicalRunner));
pass("canonical target runner uses one global deadline", /const deadline = Date\.now\(\) \+ hardTimeoutMs/.test(canonicalRunner));
pass("canonical target runner releases the Atlas lock owner-atomically", /releaseCanonicalJob\("atlas-run", atlasJobId\)/.test(canonicalRunner) && !/clearActiveJobIfMatches\("atlas-run", atlasJobId\)/.test(canonicalRunner));
pass("target wrapper fails closed without control context", /CONTROL_CONTEXT_UNAVAILABLE/.test(wrapper));
pass("target wrapper actively aborts at global deadline", /setTimeout\(\(\) => overallController\.abort\(\), requestedHardTimeout\)/.test(wrapper));

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log(`\nApex launch gate: ${checks.length} checks passed.`);
