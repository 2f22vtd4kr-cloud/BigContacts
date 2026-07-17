import { pgTable, serial, text, doublePrecision, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const entitiesTable = pgTable("entities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'HNWI' | 'Corporation' | 'Trust' | 'Gatekeeper'
  bayesianScore: doublePrecision("bayesian_score").notNull().default(0.05),
  nationality: text("nationality"),
  estimatedNetWorth: doublePrecision("estimated_net_worth"),
  knownResidences: text("known_residences"), // JSON array stored as text
  linkedinUrl: text("linkedin_url"),
  phone: text("phone"),
  email: text("email"),
  contactMethod: text("contact_method"), // 'WhatsApp' | 'Email' | 'LinkedIn' | 'Signal'
  notes: text("notes"),
  sourceRegistries: text("source_registries"), // JSON array stored as text
  metadata: text("metadata"), // JSON blob
  isHot: boolean("is_hot").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEntitySchema = createInsertSchema(entitiesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEntity = z.infer<typeof insertEntitySchema>;
export type Entity = typeof entitiesTable.$inferSelect;
