import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const REQUIRED_COLUMNS: Record<string, readonly string[]> = {
  research_cases: ["id", "target_entity_id", "case_type", "status", "case_file", "current_action", "iteration"],
  research_case_events: ["id", "case_id", "correlation_key", "payload"],
  entities: ["id"],
  research_sessions: ["id"],
  research_run_events: ["id"],
  research_evidence: ["id"],
  contact_evidence: ["id"],
};

export type SchemaReadiness = {
  ready: boolean;
  missingTables: string[];
  missingColumns: Array<{ table: string; column: string }>;
};

export async function checkAtlasSchemaReadiness(): Promise<SchemaReadiness> {
  const rows = await db.execute(sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('research_cases','research_case_events','entities','research_sessions','research_run_events','research_evidence','contact_evidence')
  `);

  const present = new Map<string, Set<string>>();
  for (const row of rows.rows as Array<{ table_name?: string; column_name?: string }>) {
    if (!row.table_name || !row.column_name) continue;
    const columns = present.get(row.table_name) ?? new Set<string>();
    columns.add(row.column_name);
    present.set(row.table_name, columns);
  }

  const missingTables: string[] = [];
  const missingColumns: Array<{ table: string; column: string }> = [];
  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    const presentColumns = present.get(table);
    if (!presentColumns) {
      missingTables.push(table);
      continue;
    }
    for (const column of columns) {
      if (!presentColumns.has(column)) missingColumns.push({ table, column });
    }
  }

  return { ready: missingTables.length === 0 && missingColumns.length === 0, missingTables, missingColumns };
}
