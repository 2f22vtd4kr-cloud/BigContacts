import fs from "node:fs";

const schema = fs.readFileSync("lib/db/src/schema/research_case_events.ts", "utf8");
const caseData = fs.readFileSync("artifacts/api-server/src/src/routes/research/case-data.ts", "utf8");
const replay = fs.readFileSync("artifacts/api-server/src/src/lib/research-case-replay.ts", "utf8");
const targetControl = fs.readFileSync("artifacts/api-server/src/src/lib/target-control-decision.ts", "utf8");
const bureauPass = fs.readFileSync("artifacts/api-server/src/src/lib/bureau-agentic-pass.ts", "utf8");

const checks = [
  ["canonical event sequence is database id", schema.includes("caseEventSequenceIdx: index(\"research_case_events_case_id_id_idx\").on(table.caseId, table.id)")],
  ["actor roles are explicitly enumerated", schema.includes("researchCaseEventActorRoleSchema = z.enum") && schema.includes("\"gemini_boss\"") && schema.includes("\"right_hand\"") && schema.includes("\"bureau\"")],
  ["event types are explicitly enumerated", schema.includes("researchCaseEventTypeSchema = z.enum") && schema.includes("\"observation\"") && schema.includes("\"decision\"") && schema.includes("\"control_decision\"") && schema.includes("\"tool_observation\"")],
  ["payload must be a JSON object", schema.includes("research case event payload must be a JSON object") && schema.includes("!Array.isArray(parsed)")],
  ["summary has a bounded size", schema.includes("summary: z.string().trim().min(1).max(2000)")],
  ["status has a bounded size", schema.includes("status: z.string().trim().min(1).max(64)")],
  ["case event API reads use immutable id ordering", caseData.includes(".orderBy(researchCaseEventsTable.id)") && !caseData.includes(".orderBy(desc(researchCaseEventsTable.createdAt))")],
  ["replay accepts every canonical actor role", replay.includes("\"bureau\"") && replay.includes("\"head_investigator\"") && replay.includes("\"gemini_boss\"")],
  ["replay accepts every canonical control/trajectory event", replay.includes("\"control_decision\"") && replay.includes("\"tool_observation\"")],
  ["target control writes a declared event type", targetControl.includes('eventType: "control_decision"') && schema.includes('"control_decision"')],
  ["bureau trajectory writes a declared tool event type", bureauPass.includes('eventType = record.action === "done" ? "decision" : "tool_observation"') && schema.includes('"tool_observation"')],
];

const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) throw new Error(`Research case event schema guard failed: ${failed.join("; ")}`);
console.log(`Research case event schema guard passed (${checks.length} invariants).`);
