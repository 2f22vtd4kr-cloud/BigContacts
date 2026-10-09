import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = {
  engine: path.join(root, "artifacts/api-server/src/src/lib/research-intelligence-engine.ts"),
  wrapper: path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts"),
  replay: path.join(root, "artifacts/api-server/src/src/lib/research-intelligence-replay.ts"),
  oversight: path.join(root, "artifacts/api-server/src/src/lib/target-act-oversight.ts"),
  discovery: path.join(root, "artifacts/api-server/src/src/lib/bureau-agentic-pass.ts"),
};

for (const [name, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) throw new Error("missing epistemic resume boundary file: " + name);
}

const engine = fs.readFileSync(files.engine, "utf8");
const wrapper = fs.readFileSync(files.wrapper, "utf8");
const replay = fs.readFileSync(files.replay, "utf8");
const oversight = fs.readFileSync(files.oversight, "utf8");
const discovery = fs.readFileSync(files.discovery, "utf8");

const required = [
  ["engine restoreContext", engine.includes("restoreContext(context: IntelligenceContext)"),
   "ResearchIntelligenceEngine must expose deterministic durable-state restoration."],
  ["model hypothesis ingestion", engine.includes(`const modelHypothesis = typeof input.args?.hypothesis === "string"`),
   "model-authored hypotheses must enter epistemic state."],
  ["event-backed case replay", wrapper.includes("loadDurableInvestigatorRecords(input.caseId)") && wrapper.includes("loadDurableInvestigatorRecords(oversightContext.caseId)") && (wrapper.match(/replayInvestigatorIntelligence\(/g) ?? []).length >= 2,
   "both discovery and target paths must rebuild intelligence from durable Investigator events."],
  ["legacy projection fallback", replay.includes("if (!records.length)") && replay.includes("engine.restoreContext(legacyContext)"),
   "cases without a replayable event history must retain a safe legacy-state restoration path."],
  ["sequence-ordered event source", wrapper.includes("orderBy(asc(researchCaseEventsTable.id))") && replay.includes("[...events].sort((a, b) => a.id - b.id)"),
   "durable acts must replay by immutable database sequence, not timestamps or prompt order."],
  ["source event IDs survive replay", replay.includes("durableEventId: event.id") && wrapper.includes("groundingTrajectoryRecords: [...historyRecords"),
   "replayed source observations must retain immutable event IDs and be available to downstream grounding."],
  ["claims persist only after successful finalization", discovery.includes('input.finalize===true&&candidate.action==="done"&&candidate.execution==="success"') && discovery.includes("candidate.durableEventId!=null") && discovery.includes("uniqueObservationEventIds"),
   "claim events must not be written from blocked/interim terminal acts and must link durable prior source events."],
  ["target evidence projection", oversight.includes("caseFile.evidenceState=intelligenceState"),
   "target oversight must persist the epistemic projection in the same transaction as the act/control checkpoint."],
  ["target state input", oversight.includes("intelligenceState?:IntelligenceContext|null"),
   "target oversight must accept the current epistemic projection explicitly."],
];

for (const [name, ok, message] of required) {
  if (!ok) throw new Error("epistemic resume boundary failed: " + name + " — " + message);
}

console.log("epistemic resume boundary: PASS");
