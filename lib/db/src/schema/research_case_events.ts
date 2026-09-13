import { sql } from "drizzle-orm";
import { pgTable, serial, integer, text, timestamp, index, uniqueIndex, check } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { researchCasesTable } from "./research_cases";
export const RESEARCH_CASE_EVENT_PAYLOAD_MAX_BYTES = 128 * 1024;
export const researchCaseEventsTable = pgTable("research_case_events", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => researchCasesTable.id, { onDelete: "restrict" }),
  iteration: integer("iteration").notNull().default(0),
  actorRole: text("actor_role").notNull(),
  eventType: text("event_type").notNull(),
  status: text("status").notNull().default("recorded"),
  summary: text("summary").notNull(),
  payload: text("payload").notNull().default("{}"),
  correlationKey: text("correlation_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  caseEventSequenceIdx: index("research_case_events_case_id_id_idx").on(table.caseId, table.id),
  caseEventCorrelationUniqueIdx: uniqueIndex("research_case_events_case_id_correlation_key_uidx").on(table.caseId, table.correlationKey),
  caseEventPayloadSizeCheck: check("research_case_events_payload_size_ck", sql`octet_length(${table.payload}) <= ${RESEARCH_CASE_EVENT_PAYLOAD_MAX_BYTES}`),
}));
export const researchCaseEventActorRoleSchema = z.enum(["head_investigator","gemini_boss","right_hand","specialist","human_operator","system","bureau"]);
export const researchCaseEventTypeSchema = z.enum(["case_opened","decision","control_decision","assignment","observation","tool_observation","claim","promotion","validation","projection","directive","status"]);
const eventPayloadSchema = z.string().max(RESEARCH_CASE_EVENT_PAYLOAD_MAX_BYTES, `research case event payload must be <= ${RESEARCH_CASE_EVENT_PAYLOAD_MAX_BYTES} characters`).refine((value) => { try { const parsed: unknown = JSON.parse(value); return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed); } catch { return false; } }, "research case event payload must be a JSON object");
export const insertResearchCaseEventSchema = createInsertSchema(researchCaseEventsTable).omit({ id: true, createdAt: true }).extend({ actorRole: researchCaseEventActorRoleSchema, eventType: researchCaseEventTypeSchema, status: z.string().trim().min(1).max(64), summary: z.string().trim().min(1).max(2000), payload: eventPayloadSchema, correlationKey: z.string().trim().min(1).max(500) });
export type InsertResearchCaseEvent = z.infer<typeof insertResearchCaseEventSchema>;
export type ResearchCaseEvent = typeof researchCaseEventsTable.$inferSelect;
