import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = {
  engine: path.join(root, "artifacts/api-server/src/src/lib/research-intelligence-engine.ts"),
  wrapper: path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts"),
  oversight: path.join(root, "artifacts/api-server/src/src/lib/target-act-oversight.ts"),
};

for (const [name, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) throw new Error("missing epistemic resume boundary file: " + name);
}

const engine = fs.readFileSync(files.engine, "utf8");
const wrapper = fs.readFileSync(files.wrapper, "utf8");
const oversight = fs.readFileSync(files.oversight, "utf8");

const required = [
  ["engine restoreContext", engine.includes("restoreContext(context: IntelligenceContext)"),
   "ResearchIntelligenceEngine must expose deterministic durable-state restoration."],
  ["model hypothesis ingestion", engine.includes(`const modelHypothesis = typeof input.args?.hypothesis === "string"`),
   "model-authored hypotheses must enter epistemic state."],
  ["case state restore", wrapper.includes("intelligence.restoreContext(durableIntelligence)") && wrapper.includes("intelligence.restoreContext(oversightContext.intelligenceState)"),
   "both discovery and target execution paths must restore durable epistemic state."],
  ["target evidence projection", oversight.includes("caseFile.evidenceState=intelligenceState"),
   "target oversight must persist the epistemic projection in the same transaction as the act/control checkpoint."],
  ["target state input", oversight.includes("intelligenceState?:IntelligenceContext|null"),
   "target oversight must accept the current epistemic projection explicitly."],
];

for (const [name, ok, message] of required) {
  if (!ok) throw new Error("epistemic resume boundary failed: " + name + " — " + message);
}

console.log("epistemic resume boundary: PASS");
