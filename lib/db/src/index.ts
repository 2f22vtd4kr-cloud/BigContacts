import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function ensureResearchCaseEventsImmutable(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('apex:research_case_events:immutability'))");
    await client.query(`
      DO $$
      BEGIN
        IF to_regclass('public.research_case_events') IS NULL THEN
          RAISE EXCEPTION 'Apex research_case_events ledger is missing; refusing to start without the provenance ledger';
        END IF;

        CREATE OR REPLACE FUNCTION public.apex_research_case_events_immutable()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $fn$
        BEGIN
          RAISE EXCEPTION 'research_case_events is append-only; % is forbidden', TG_OP
            USING ERRCODE = '55000';
        END;
        $fn$;

        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger
          WHERE tgrelid = 'public.research_case_events'::regclass
            AND tgname = 'apex_research_case_events_no_update_delete'
        ) THEN
          CREATE TRIGGER apex_research_case_events_no_update_delete
            BEFORE UPDATE OR DELETE ON public.research_case_events
            FOR EACH ROW EXECUTE FUNCTION public.apex_research_case_events_immutable();
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger
          WHERE tgrelid = 'public.research_case_events'::regclass
            AND tgname = 'apex_research_case_events_no_truncate'
        ) THEN
          CREATE TRIGGER apex_research_case_events_no_truncate
            BEFORE TRUNCATE ON public.research_case_events
            FOR EACH STATEMENT EXECUTE FUNCTION public.apex_research_case_events_immutable();
        END IF;

        REVOKE UPDATE, DELETE, TRUNCATE ON public.research_case_events FROM PUBLIC;
      END $$;
    `);
  } finally {
    client.release();
  }
}

// The control/provenance ledger must be immutable before any application query
// can rely on it. A missing ledger is a startup failure, not a degraded mode.
await ensureResearchCaseEventsImmutable();

export const db = drizzle(pool, { schema });

export * from "./schema";
