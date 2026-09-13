import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { entitiesTable } from "./entities";

/**
 * One durable investigation. A case can later become target-scoped after the
 * Boss identifies a candidate. The case and its append-only event ledger are
 * retained even if the target card is removed; targetEntityId is therefore
 * deliberately SET NULL rather than CASCADE.
 */
export const researchCasesTable = pgTable("research_cases", {
  id: serial("id").primaryKey(),
  targetEntityId: integer("target_entity_id")
    .references(() => entitiesTable.id, { onDelete: "set null" }),
  caseType: text("case_type").notNull().default("discovery"),
  status: text("status").notNull().default("ready"),
  directorMode: text("director_mode").notNull().default("gemini_boss_pending"),
  directorProvider: text("director_provider").notNull().default("gemini"),
  directorModel: text("director_model").notNull().default("auto-low-cost-pending"),
  objective: text("objective").notNull(),
  motivation: text("motivation").notNull(),
  openingPrompt: text("opening_prompt").notNull().default(""),
  caseFile: text("case_file").notNull().default("{}"),
  currentAction: text("current_action"),
  iteration: integer("iteration").notNull().default(0),
  lastDecisionAt: timestamp("last_decision_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertResearchCaseSchema = createInsertSchema(researchCasesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResearchCase = z.infer<typeof insertResearchCaseSchema>;
export type ResearchCase = typeof researchCasesTable.$inferSelect;
