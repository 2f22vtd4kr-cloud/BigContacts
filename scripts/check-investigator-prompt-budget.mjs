#!/usr/bin/env node
import fs from "node:fs";

const core = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");
const telemetry = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-llm-telemetry.ts", "utf8");
const compaction = fs.readFileSync("artifacts/api-server/src/src/lib/investigation-context-compaction.ts", "utf8");

const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(/MAX_PROVIDER_PROMPT_CHARS = 9_000/.test(core), "final Investigator provider prompt ceiling must be 9,000 characters");
assert(/maxChars: 3_900/.test(core), "working Investigator context must use the tighter 3,900-character budget");
assert(/const cognitiveState = boundInvestigatorPromptSection\(/.test(core) && /input\.intelligenceContext \|\| "RESEARCH INTELLIGENCE STATE: not yet populated\."/s.test(core) && /1_200,\n  \);/.test(core), "intelligence state must be bounded to 1,200 characters");
assert(/const capabilityGuidance = boundInvestigatorPromptSection\(renderAtlasCapabilityGuidanceCompact\(\), 1_200\)/.test(core), "capability guidance must be explicitly bounded");
assert(/function buildStepPrompt/.test(core), "Investigator prompt builder is present");
assert(/INVESTIGATOR_SYSTEM_PROMPT/.test(core) && /MAX_PROVIDER_PROMPT_CHARS - INVESTIGATOR_SYSTEM_PROMPT\(\)\.length/.test(core), "final prompt ceiling must reserve space for the stable system message");
const stepStart = core.indexOf("export function buildStepPrompt");
const stepEnd = core.indexOf("export function discoveryTerminalGate", stepStart);
const stepPrompt = stepStart >= 0 && stepEnd > stepStart ? core.slice(stepStart, stepEnd) : "";
assert(!/apexOrientationCompact\("dig_agent"\)/.test(stepPrompt), "institutional orientation must not be duplicated inside the dynamic user prompt");
assert(!/JSON\.stringify\(AGENTIC_ACTION_SCHEMA\)/.test(stepPrompt), "full action schema must not be duplicated inside the dynamic user prompt");
assert(/DISCOVERY QUALITY GATE:/.test(stepPrompt), "discovery anchor quality gate must remain explicit");
assert(/rateLimitRemainingTokens/.test(telemetry) && /rateLimitResetTokensMs/.test(telemetry), "safe token rate-limit telemetry must be emitted");
assert(/systemPromptChars/.test(telemetry) && /userPromptChars/.test(telemetry) && /totalPromptChars/.test(telemetry), "prompt telemetry must distinguish system, user, and total message characters");
assert(/waitForKnownGroqTokenWindow/.test(core) && /quota_unavailable/.test(core), "known token-window exhaustion must be handled before another provider request");
assert(/const DEFAULT_MAX_CHARS = 4_200/.test(compaction), "context compaction default must remain reduced");
assert(/LATEST TRAJECTORY RECORD \(must remain visible to the next Investigator\)/.test(compaction), "latest trajectory record must have an explicit prompt-preservation section");
if (failures.length) {
  console.error("INVESTIGATOR PROMPT BUDGET: FAIL");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}
console.log("INVESTIGATOR PROMPT BUDGET: PASS");
