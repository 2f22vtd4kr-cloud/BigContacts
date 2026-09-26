import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = {
  orientation: path.join(root, "artifacts/api-server/src/src/lib/apex-bureau-orientation.ts"),
  research: path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research-core.ts"),
  bureau: path.join(root, "artifacts/api-server/src/src/lib/case-bureau.ts"),
  rightHand: path.join(root, "artifacts/api-server/src/src/lib/gemini-right-hand-reasoning.ts"),
  pass: path.join(root, "artifacts/api-server/src/src/lib/bureau-agentic-pass.ts"),
  target: path.join(root, "artifacts/api-server/src/src/lib/target-contact-agent.ts"),
  architecture: path.join(root, "docs/APEX_AUTONOMOUS_MISSION_BOOTSTRAP.md"),
  firstDecision: path.join(root, "docs/APEX_FIRST_DECISION_CONTRACT.md"),
};

const source = Object.fromEntries(Object.entries(required).map(([name, file]) => {
  if (!fs.existsSync(file)) throw new Error(`missing mission-bootstrap file: ${file}`);
  return [name, fs.readFileSync(file, "utf8")];
}));

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(/APEX_INSTITUTIONAL_MISSION_VERSION\s*=/.test(source.orientation), "canonical orientation is not versioned as an institutional contract.");
assert(/APEX_WHAT_IS_ATLAS\s*=/.test(source.orientation), "canonical orientation has no institutional Apex identity/mission constant.");
assert(/AI-driven investigatory bureau/.test(source.orientation), "canonical orientation does not identify Apex as an AI-driven investigatory bureau.");
assert(/RESEARCH JUDGMENT/.test(source.orientation), "canonical orientation does not establish standing research judgment.");
assert(/PROVENANCE/.test(source.orientation), "canonical orientation does not establish standing provenance/evidence discipline.");
assert(/MODEL ROLE SEPARATION/.test(source.orientation), "canonical orientation does not establish model role separation.");
assert(/INSTITUTIONAL BOOTSTRAP/.test(source.orientation), "canonical orientation does not establish institutional bootstrap independent of operator input.");
assert(/PRE-INVESTIGATION CONTRACT/.test(source.orientation), "canonical orientation does not establish a pre-investigation contract.");
assert(/before any operator supplies case-specific instructions/i.test(source.orientation), "institutional purpose is not explicitly established before operator input.");
assert(/Operator input/i.test(source.architecture), "mission bootstrap document does not distinguish operator input from institutional purpose.");
assert(/cannot redefine Apex's institutional purpose/i.test(source.architecture), "mission bootstrap document does not forbid operator input from redefining institutional purpose.");
assert(/APEX INSTITUTIONAL MISSION/.test(source.firstDecision), "first-decision contract omits institutional mission from the context order.");
assert(/ROLE PURPOSE/.test(source.firstDecision), "first-decision contract omits role purpose.");
assert(/DURABLE CASE CONTEXT/.test(source.firstDecision), "first-decision contract omits durable case context.");
assert(/first model-facing decision/i.test(source.firstDecision), "first-decision contract does not define the first model-facing decision.");
assert(/apexOrientationCompact/.test(source.orientation), "canonical orientation has no compact provider orientation.");
assert(/APEX MISSION CONTRACT v\$\{APEX_INSTITUTIONAL_MISSION_VERSION\}/.test(source.orientation), "compact AI orientation does not expose the institutional mission version.");
assert(/institutional purpose, evidence discipline, autonomy law, and role separation exist before operator case input/i.test(source.orientation), "compact AI orientation does not carry institutional bootstrap context.");
assert(/role purpose exists before discovery\/research begins/i.test(source.orientation), "compact AI orientation does not establish role purpose before discovery/research.");
assert(/Discovery and research are capabilities, not fixed stages/i.test(source.orientation), "compact AI orientation does not reject deterministic discovery/research stages.");
assert(/apexOrientationFor\("boss"\)/.test(source.bureau) || /apexOrientationCompact\("boss"\)/.test(source.bureau), "Boss path does not visibly consume canonical Apex orientation.");
assert(/apexOrientationFor\("right_hand"\)/.test(source.rightHand) || /apexOrientationCompact\("right_hand"\)/.test(source.rightHand), "Right-hand path does not visibly consume canonical Apex orientation.");
assert(/apexOrientationFor\("dig_agent"\)|apexOrientationCompact\("dig_agent"\)/.test(source.research), "Investigator ReAct path does not visibly consume canonical Apex orientation.");
assert(/contextDocument/.test(source.pass), "agentic pass does not expose durable case context to the Investigator.");
assert(/contextDocument/.test(source.target), "target Investigator does not expose durable case context.");
assert(!/fixed\s+(search|research)\s+(order|sequence)/i.test(source.orientation), "orientation teaches a fixed research order.");
assert(!/step\s*1.*web_search.*step\s*2.*visit/is.test(source.orientation), "orientation contains a deterministic web-research sequence.");
assert(!/Begin\. Choose an initial web_search query/i.test(source.research), "ReAct still forces web_search as the initial action; #120 remains unresolved.");
assert(!/\(none — begin with web_search\)/i.test(source.research), "ReAct prompt still tells a contextually autonomous Investigator to begin with web_search.");
assert(!/WHOISJSON|Whoxy|WhoisJSON/i.test(source.orientation), "retired WHOIS provider is still advertised by the canonical orientation.");
assert(!/WHOISJSON|Whoxy|WhoisJSON/i.test(source.research), "retired WHOIS provider is still advertised by the Investigator ReAct surface.");
assert(/buildInvestigatorContext/.test(source.research), "Investigator ReAct prompt does not consume bounded working context.");
assert(/investigation-context-compaction/.test(source.research), "Investigator ReAct path does not import the context-management boundary.");

// Right-hand is Gemini oversight, independent of Boss and never an Investigator fallback.
assert(/GEMINI_RIGHT_HAND_API_KEY/.test(source.rightHand), "Gemini Right-hand does not use the dedicated GEMINI_RIGHT_HAND_API_KEY.");
assert(!/process\.env\.GEMINI_API_KEY/.test(source.rightHand), "Gemini Right-hand still directly reads the Boss GEMINI_API_KEY.");
assert(/gemini-3\.8-flash/i.test(source.rightHand), "Gemini Right-hand model is not pinned to Gemini 3.8 Flash.");
assert(/export const GEMINI_RIGHT_HAND_MODEL = "gemini-3\.8-flash"/.test(source.rightHand), "Gemini Right-hand preferred model must be gemini-3.8-flash.");
assert(/supportedGenerationMethods/.test(source.rightHand), "Gemini Right-hand fallback discovery does not inspect live catalog capabilities.");
assert(/models\?key=|GEMINI_CHAT_API_BASE/.test(source.rightHand), "Gemini Right-hand does not resolve candidates from the live Gemini catalog.");
assert(!/GEMINI_RIGHT_HAND_MODEL_CHAIN/.test(source.rightHand), "Gemini Right-hand still accepts an environment-controlled fallback sequence.");
assert(!/GEMINI_RIGHT_HAND_FALLBACK_MODELS\s*=\s*\[\s*["']gemini-/i.test(source.rightHand), "Gemini Right-hand contains a hard-coded fallback model list.");
assert(/MAX_MODEL_ATTEMPTS/.test(source.rightHand), "Gemini Right-hand fallback attempts are not visibly bounded.");
assert(/catalogModels|compatible/.test(source.rightHand), "Gemini Right-hand does not expose catalog-derived compatible candidates.");
assert(!/DEEPSEEK|NVIDIA_NIM|nvidia/i.test(source.rightHand), "retired DeepSeek/NVIDIA provider remains in the Right-hand implementation.");
assert(/case-file|case file/i.test(source.rightHand) && /brows/i.test(source.rightHand), "Right-hand is not explicitly case-file-only/no-browse.");
assert(/actionId|decision|confidence/.test(source.rightHand), "Right-hand structured decision contract is missing.");
assert(/existing|queued|queue/i.test(source.rightHand), "Right-hand lacks the existing queued-action constraint.");

if (failures.length) {
  console.error("APEX MISSION BOOTSTRAP: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("APEX MISSION BOOTSTRAP: PASS");
console.log("- institutional Apex purpose is a versioned runtime contract");
console.log("- compact provider orientation carries institutional bootstrap");
console.log("- Boss, Gemini Right-hand, and Investigator receive standing role orientation");
console.log("- durable context is part of the Investigator boundary");
console.log("- first-decision contract forbids hidden deterministic sequencing");
console.log("- operator input cannot redefine institutional purpose");
console.log("- first research action remains model-selected");
console.log("- Gemini Right-hand is case-file-only oversight, independent from Boss and Investigator execution");
