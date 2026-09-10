import fs from "node:fs";

const schema = fs.readFileSync("lib/db/src/schema/research_case_events.ts", "utf8");
const caseData = fs.readFileSync("artifacts/api-server/src/src/routes/research/case-data.ts", "utf8");

const checks = [
  ["canonical event sequence is database id", schema.includes("caseEventSequenceIdx: index(\"research_case_events_case_id_id_idx\").on(table.caseId, table.id)")],
  ["actor roles are explicitly enumerated", schema.includes("researchCaseEventActorRoleSchema = z.enum") && schema.includes("\"gemini_boss\"") && schema.includes("\"right_hand\"")],
  ["event types are explicitly enumerated", schema.includes("researchCaseEventTypeSchema = z.enum") && schema.includes("\"observation\"") && schema.includes("\"decision\"")],
  ["payload must be a JSON object", schema.includes("research case event payload must be a JSON object") && schema.includes("!Array.isArray(parsed)")],
  ["summary has a bounded size", schema.includes("summary: z.string().trim().min(1).max(2000)")],
  ["status has a bounded size", schema.includes("status: z.string().trim().min(1).max(64)")],
  ["case event API reads use immutable id ordering", caseData.includes(".orderBy(researchCaseEventsTable.id)") && !caseData.includes(".orderBy(desc(researchCaseEventsTable.createdAt))")],
];

const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) throw new Error(`Research case event schema guard failed: ${failed.join("; ")}`);
console.log(`Research case event schema guard passed (${checks.length} invariants).`);
