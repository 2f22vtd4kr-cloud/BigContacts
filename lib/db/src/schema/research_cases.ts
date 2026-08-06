import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { entitiesTable } from "./entities";

/**
 * One durable, target-scoped investigation. The JSON caseFile is a compact
 * working snapshot; the append-only case events table remains the audit trail.
 */
export const researchCasesTable = pgTable("research_cases", {
  id: serial("id").primaryKey(),
  targetEntityId: integer("target_entity_id")
    .notNull()
    .references(() => entitiesTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("ready"), // ready | active | paused | complete | review
  directorMode: text("director_mode").notNull().default("local_planner"), // local_planner | llm_director
  directorModel: text("director_model"),
  objective: text("objective").notNull(),
  motivation: text("motivation").notNull(),
  caseFile: text("case_file").notNull().default("{}"),
  currentAction: text("current_action"),
  iteration: integer("iteration").notNull().default(0),
  lastDecisionAt: timestamp("last_decision_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertResearchCaseSchema = createInsertSchema(researchCasesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertResearchCase = z.infer<typeof insertResearchCaseSchema>;
export type ResearchCase = typeof researchCasesTable.$inferSelect;