import { pgTable, serial, integer, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { researchCasesTable } from "./research_cases";

/**
 * Append-only decisions, assignments, observations, claims, promotions, validations,
 * projections, and directives.
 *
 * The immutable database `id` is the canonical per-case event sequence. It is
 * intentionally separate from `iteration`: multiple events can legitimately
 * occur during one ReAct iteration, and iterations can be reused by different
 * actors. Consumers must order a case's ledger by id, never by wall-clock
 * timestamps or by iteration alone.
 *
 * `correlationKey` is an optional durable idempotency key. New autonomous
 * trajectory events should populate it from the durable run id, turn, and
 * event role so a retry cannot append a second logical event.
 *
 * Validation and projection are explicit ledger stages. A validation event must
 * reference the claim it adjudicates; a projection event must reference the
 * validated/promotion boundary that authorized the durable card projection.
 * These event types are schema vocabulary first; writers must still populate
 * their causal references before they are considered complete evidence-chain
 * records.
 */
export const researchCaseEventsTable = pgTable("research_case_events", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id")
    .notNull()
    .references(() => researchCasesTable.id, { onDelete: "cascade" }),
  iteration: integer("iteration").notNull().default(0),
  actorRole: text("actor_role").notNull(), // head_investigator | gemini_boss | right_hand | specialist | human_operator | system | bureau
  eventType: text("event_type").notNull(), // case_opened | decision | control_decision | assignment | observation | tool_observation | claim | promotion | validation | projection | directive | status
  status: text("status").notNull().default("recorded"),
  summary: text("summary").notNull(),
  payload: text("payload").notNull().default("{}"),
  correlationKey: text("correlation_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  caseEventSequenceIdx: index("research_case_events_case_id_id_idx").on(table.caseId, table.id),
  caseEventCorrelationUniqueIdx: uniqueIndex("research_case_events_case_id_correlation_key_uidx").on(table.caseId, table.correlationKey),
}));

export const researchCaseEventActorRoleSchema = z.enum([
  "head_investigator",
  "gemini_boss",
  "right_hand",
  "specialist",
  "human_operator",
  "system",
  "bureau",
]);

export const researchCaseEventTypeSchema = z.enum([
  "case_opened",
  "decision",
  "control_decision",
  "assignment",
  "observation",
  "tool_observation",
  "claim",
  "promotion",
  "validation",
  "projection",
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
    correlationKey: z.string().trim().min(1).max(500).nullable().optional(),
  });

export type InsertResearchCaseEvent = z.infer<typeof insertResearchCaseEventSchema>;
export type ResearchCaseEvent = typeof researchCaseEventsTable.$inferSelect;
