import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const schema = fs.readFileSync("lib/db/src/schema/research_case_events.ts", "utf8");
const caseData = fs.readFileSync("artifacts/api-server/src/src/routes/research/case-data.ts", "utf8");
const replay = fs.readFileSync("artifacts/api-server/src/src/lib/research-case-replay.ts", "utf8");
const targetControl = fs.readFileSync("artifacts/api-server/src/src/lib/target-control-decision.ts", "utf8");
const bureauPass = fs.readFileSync("artifacts/api-server/src/src/lib/bureau-agentic-pass.ts", "utf8");

const allowedEventTypes = new Set(["case_opened", "decision", "control_decision", "assignment", "observation", "tool_observation", "claim", "promotion", "validation", "projection", "directive", "status"]);
const allowedActorRoles = new Set(["head_investigator", "gemini_boss", "right_hand", "specialist", "human_operator", "system", "bureau"]);

const writerFiles = [];
function collectTsFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "test" || entry.name === "__tests__") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectTsFiles(full);
    else if (/\.tsx?$/.test(entry.name)) writerFiles.push(full);
  }
}
collectTsFiles(path.join(root, "artifacts/api-server/src/src"));
const writerViolations = [];
for (const file of writerFiles) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/eventType\s*:\s*["']([^"']+)["']/g)) {
    if (!allowedEventTypes.has(match[1])) writerViolations.push(`${path.relative(root, file)}: unknown eventType ${match[1]}`);
  }
  for (const match of source.matchAll(/actorRole\s*:\s*["']([^"']+)["']/g)) {
    if (!allowedActorRoles.has(match[1])) writerViolations.push(`${path.relative(root, file)}: unknown actorRole ${match[1]}`);
  }
}

const checks = [
  ["canonical event sequence is database id", schema.includes("caseEventSequenceIdx: index(\"research_case_events_case_id_id_idx\").on(table.caseId, table.id)")],
  ["autonomous event correlation has a unique database key", schema.includes("caseEventCorrelationUniqueIdx: uniqueIndex(\"research_case_events_case_id_correlation_key_uidx\").on(table.caseId, table.correlationKey)")],
  ["actor roles are explicitly enumerated", schema.includes("researchCaseEventActorRoleSchema = z.enum") && schema.includes("\"gemini_boss\"") && schema.includes("\"right_hand\"") && schema.includes("\"bureau\"")],
  ["event types include claim, promotion, validation, and projection", schema.includes("researchCaseEventTypeSchema = z.enum") && schema.includes("\"claim\"") && schema.includes("\"promotion\"") && schema.includes("\"validation\"") && schema.includes("\"projection\"")],
  ["payload must be a JSON object", schema.includes("research case event payload must be a JSON object") && schema.includes("!Array.isArray(parsed)")],
  ["summary has a bounded size", schema.includes("summary: z.string().trim().min(1).max(2000)")],
  ["status has a bounded size", schema.includes("status: z.string().trim().min(1).max(64)")],
  ["case event API reads use immutable id ordering", caseData.includes(".orderBy(researchCaseEventsTable.id)") && !caseData.includes(".orderBy(desc(researchCaseEventsTable.createdAt))")],
  ["replay accepts canonical actor roles", replay.includes("\"bureau\"") && replay.includes("\"head_investigator\"") && replay.includes("\"gemini_boss\"")],
  ["replay accepts canonical control and trajectory events", replay.includes('"control_decision"') && replay.includes('"tool_observation"')],
  ["replay validates validation and projection causal edges", replay.includes("validationCount") && replay.includes("projectionCount") && replay.includes("validationEventId") && replay.includes("promotionEventId")],
  ["target control writes a declared event type", targetControl.includes('eventType: "control_decision"') && schema.includes('"control_decision"')],
  ["bureau trajectory writes declared event types", bureauPass.includes('eventType = record.action === "done" ? "decision" : "tool_observation"') && schema.includes('"tool_observation"')],
  ["bureau trajectory has claim/promotion graph hooks", bureauPass.includes('eventType: "claim"') && bureauPass.includes('eventType: "promotion"')],
  ["claim graph references observation event ids", bureauPass.includes("observationEventIds") && bureauPass.includes("claimEventId")],
  ["trajectory graph uses correlation keys", bureauPass.includes("correlationKey") && bureauPass.includes("jobId") && bureauPass.includes("record.turn")],
  ["all canonical literal event writers use declared vocabularies", writerViolations.length === 0],
];

if (writerViolations.length) console.error(writerViolations.join("\n"));
const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) throw new Error(`Research case event schema guard failed: ${failed.join("; ")}`);
console.log(`Research case event schema guard passed (${checks.length} invariants; ${writerFiles.length} canonical TypeScript files scanned; negative test fixtures excluded from writer census).`);
