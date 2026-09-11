#!/usr/bin/env node
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const hardeners = [
  "apply-harvest-domain-egress-quarantine.mjs",
  "apply-agentic-domain-signal-hardening.mjs",
  "apply-final-review-role-boundary.mjs",
  "apply-retire-secondary-surface-calls.mjs",
  "apply-investigator-identity-observation-boundary.mjs",
  "apply-registry-cancellation-boundary.mjs",
  "apply-agentic-registry-signal-wiring.mjs",
  "apply-retire-deterministic-atlas-osint.mjs",
  "apply-retire-legacy-atlas-launch.mjs",
];
for (const script of hardeners) execFileSync(process.execPath, [`scripts/${script}`], { stdio: "inherit" });

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
const packageJson = read("artifacts/api-server/package.json");

pass("Investigator wrapper mounts canonical core", wrapper.includes("agentic-web-research-core"));
pass("Investigator adapter pool contains Groq", /callGroqJson/.test(agentic));
pass("Investigator adapter pool contains Mistral", /callMistralJson/.test(agentic));
pass("Boss-selected Investigator reaches llmStep", /investigatorLlm\?: "groq" \| "mistral"/.test(agentic) && /selectedInvestigatorLlm/.test(agentic));
pass("selected Investigator is first-class, not a fixed research stage", /const orderedProviders = selectedInvestigatorLlm/.test(agentic));
pass("no forced search-provider order", !/Prefer Serper.*Tavily.*Exa/i.test(agentic) && !/Serper\s*[→>-]+\s*Tavily\s*[→>-]+\s*Exa/i.test(agentic));
pass("canonical Dig lane has no Gemini implementation", !/callGeminiJson/.test(agentic));
pass("canonical Dig lane has no NVIDIA implementation", !/callNvidiaJson/.test(agentic));
pass("strict boundary does not import legacy projector", !/from [\"']\.\/bureau-contact-persist[\"']/.test(strict));
pass("strict boundary has explicit investigator selection API", /applyInvestigatorSelectedContactToEntityCard/.test(strict));
pass("strict boundary rejects query URLs", /SEARCH_QUERY_URL/.test(strict) && /efts\\?\.sec\\?\.gov/.test(strict));
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
pass("registry transport composes cancellation with timeout", registry.includes("signal: signal ?? AbortSignal.timeout("));
pass("registry has no timeout-only fetch signal", !/signal:\s*AbortSignal\.timeout\(/.test(registry));
pass("Python subprocesses have AbortSignal", /signal\?: AbortSignal/.test(pythonTools));
pass("Python subprocesses use detached POSIX groups", /detached: process\.platform !== "win32"/.test(pythonTools));
pass("Python subprocess cancellation has hard kill backstop", /SIGKILL/.test(pythonTools));
pass("harvest_domain fails closed pending governed egress", /HARVEST_DOMAIN blocked: network-capable subprocess egress is not yet governed/.test(agentic) && !/runTheHarvester\(/.test(agentic));
pass("Groq is not a final reviewer", !/Groq capacity fallback|groq-final-review-fallback/.test(aiExtractor));
pass("DeepSeek final review remains available", /runDeepSeekFinalReview/.test(aiExtractor));
pass("final review fails closed", /unavailable-final-review/.test(aiExtractor));
pass("canonical secondary research caller is retired", !/\bexpandSecondaryPublicSurface\s*\(/.test(entities));
pass("canonical observation layer does not inherit target identity", !/personName:\s*(?:targetName|name)\b/.test(agentic));
pass("Atlas does not script Python OSINT", !/runMaigret\(|runHolehe\(|runSherlock\(|runTheHarvester\(|rawHandle \|\| emailForHolehe/.test(orchestrator));
pass("legacy Atlas launch is quarantined", /router\.post\(\"\/ingest\/atlas-run\"[\s\S]{0,500}status\(410\)/.test(legacyAtlas));
pass("legacy Atlas route cannot call historical orchestrator", !/runAtlasPipeline\(|from [\"']\.\.\/lib\/atlas-orchestrator[\"']/.test(legacyAtlas));
pass("username migration hardener is no longer in API scripts", !packageJson.includes("apply-agentic-username-capability-split.mjs"));

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log(`\nApex launch gate: ${checks.length} checks passed.`);
