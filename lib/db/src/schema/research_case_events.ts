import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { researchCasesTable } from "./research_cases";

/**
 * Append-only decisions, assignments, tool observations, and human directives.
 *
 * The immutable database `id` is the canonical per-case event sequence.  It is
 * intentionally separate from `iteration`: multiple events can legitimately
 * occur during one ReAct iteration, and iterations can be reused by different
 * actors. Consumers must order a case's ledger by id, never by wall-clock
 * timestamps or by iteration alone.
 */
export const researchCaseEventsTable = pgTable("research_case_events", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id")
    .notNull()
    .references(() => researchCasesTable.id, { onDelete: "cascade" }),
  iteration: integer("iteration").notNull().default(0),
  actorRole: text("actor_role").notNull(), // head_investigator | gemini_boss | right_hand | specialist | human_operator | system
  eventType: text("event_type").notNull(), // case_opened | decision | assignment | observation | tool_observation | directive | status
  status: text("status").notNull().default("recorded"),
  summary: text("summary").notNull(),
  payload: text("payload").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  caseEventSequenceIdx: index("research_case_events_case_id_id_idx").on(table.caseId, table.id),
}));

export const researchCaseEventActorRoleSchema = z.enum([
  "head_investigator",
  "gemini_boss",
  "right_hand",
  "specialist",
  "human_operator",
  "system",
]);

export const researchCaseEventTypeSchema = z.enum([
  "case_opened",
  "decision",
  "assignment",
  "observation",
  "tool_observation",
  "directive",
  "status",
]);

const eventPayloadSchema = z.string().refine((value) => {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
  } catch {
    return false;
  }
}, "research case event payload must be a JSON object");

export const insertResearchCaseEventSchema = createInsertSchema(researchCaseEventsTable)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    actorRole: researchCaseEventActorRoleSchema,
    eventType: researchCaseEventTypeSchema,
    status: z.string().trim().min(1).max(64),
    summary: z.string().trim().min(1).max(2000),
    payload: eventPayloadSchema,
  });

export type InsertResearchCaseEvent = z.infer<typeof insertResearchCaseEventSchema>;
export type ResearchCaseEvent = typeof researchCaseEventsTable.$inferSelect;
