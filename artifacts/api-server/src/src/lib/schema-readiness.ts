import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const REQUIRED_COLUMNS: Record<string, readonly string[]> = {
  research_cases: ["id", "target_entity_id", "case_type", "status", "case_file", "current_action", "iteration"],
  research_case_events: ["id", "case_id", "iteration", "actor_role", "event_type", "status", "summary", "correlation_key", "payload"],
  entities: ["id", "name", "type", "phone", "phone_source", "email", "metadata", "contact_confidence", "contact_outcome"],
  research_sessions: ["id", "target_entity_id", "winning_path", "safe_use_status", "crm_status"],
  research_run_events: ["id"],
  research_evidence: ["id", "session_id", "entity_id", "claim_type", "claim", "status", "confidence", "observed_at", "freshness_score", "metadata"],
  contact_evidence: ["id", "entity_id", "vector_type", "value", "source", "source_url", "source_reliability", "identity_match", "recency_score", "directness_score", "independent_corroboration", "validation_status", "observed_at", "metadata"],
};

export type SchemaReadiness = {
  ready: boolean;
  missingTables: string[];
  missingColumns: Array<{ table: string; column: string }>;
  missingInvariants: string[];
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

  const missingInvariants: string[] = [];
  if (missingTables.length === 0) {
    const invariantRows = await db.execute(sql`
      SELECT tgname AS name, NULL::text AS definition
      FROM pg_trigger
      WHERE NOT tgisinternal
        AND tgenabled = 'O'
        AND tgrelid IN ('public.research_case_events'::regclass, 'public.research_cases'::regclass, 'public.entities'::regclass)
        AND tgname IN (
          'apex_research_case_events_no_update_delete',
          'apex_research_case_events_no_truncate',
          'apex_research_case_events_replay_integrity',
          'apex_research_case_cancellation_fence',
          'apex_agentic_promotion_active_case'
        )
      UNION ALL
      SELECT indexname AS name, NULL::text AS definition
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'research_case_events'
        AND indexname = 'research_case_events_case_id_correlation_key_uidx'
    `);
    const functionRows = await db.execute(sql`
      SELECT p.proname AS name, pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'apex_research_case_events_replay_integrity'
    `);
    const presentInvariants = new Set((invariantRows.rows as Array<{ name?: string }>).map((row) => row.name).filter((name): name is string => typeof name === "string"));
    const replayFunction = (functionRows.rows as Array<{ definition?: string }>)[0]?.definition ?? "";
    if (!replayFunction.includes("atlasJobId")) missingInvariants.push("apex_research_case_events_replay_integrity:atlasJobId-binding");
    for (const invariant of [
      "apex_research_case_events_no_update_delete",
      "apex_research_case_events_no_truncate",
      "apex_research_case_events_replay_integrity",
      "apex_research_case_cancellation_fence",
      "apex_agentic_promotion_active_case",
      "research_case_events_case_id_correlation_key_uidx",
    ]) {
      if (!presentInvariants.has(invariant)) missingInvariants.push(invariant);
    }
  }
  return { ready: missingTables.length === 0 && missingColumns.length === 0 && missingInvariants.length === 0, missingTables, missingColumns, missingInvariants };
}
