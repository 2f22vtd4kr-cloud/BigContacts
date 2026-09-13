import { pgTable, serial, text, doublePrecision, integer, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { entitiesTable } from "./entities";

/** Historical research session. Entity deletion is restricted so the session, run events, path, and outreach audit cannot be silently erased. */
export const researchSessionsTable = pgTable("research_sessions", {
  id: serial("id").primaryKey(),
  targetEntityId: integer("target_entity_id").notNull().references(() => entitiesTable.id, { onDelete: "restrict" }),
  winningPath: text("winning_path"),
  mctsSteps: text("mcts_steps"),
  generatedPitch: text("generated_pitch"),
  safeUseStatus: text("safe_use_status").notNull().default("manual_review"),
  safeUseReviewedAt: timestamp("safe_use_reviewed_at", { withTimezone: true }),
  safeUseNote: text("safe_use_note"),
  crmStatus: text("crm_status").notNull().default("Lead Gen"),
  lastContactDate: date("last_contact_date", { mode: "string" }),
  followUpDate: date("follow_up_date", { mode: "string" }),
  notes: text("notes"),
  bayesianScoreAtRuntime: doublePrecision("bayesian_score_at_runtime"),
  pathScore: doublePrecision("path_score"),
  identityScore: doublePrecision("identity_score"),
  ownershipScore: doublePrecision("ownership_score"),
  contactScore: doublePrecision("contact_score"),
  accessScore: doublePrecision("access_score"),
  wealthScore: doublePrecision("wealth_score"),
  freshnessScore: doublePrecision("freshness_score"),
  sourceQualityScore: doublePrecision("source_quality_score"),
  scoreBreakdown: text("score_breakdown"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
export const insertResearchSessionSchema = createInsertSchema(researchSessionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResearchSession = z.infer<typeof insertResearchSessionSchema>;
export type ResearchSession = typeof researchSessionsTable.$inferSelect;
