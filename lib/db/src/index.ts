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

        CREATE OR REPLACE FUNCTION public.apex_research_case_events_replay_integrity()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $fn$
        DECLARE
          existing_payload text;
        BEGIN
          IF NEW.correlation_key IS NULL THEN
            RETURN NEW;
          END IF;

          -- Serialize writers for the same logical event key. Without this,
          -- two concurrent INSERT ... ON CONFLICT DO NOTHING statements can
          -- each validate against an empty snapshot and the loser can silently
          -- discard a different payload after the unique-index race.
          PERFORM pg_advisory_xact_lock(
            hashtext('apex:research_case_events:replay:' || NEW.case_id::text || ':' || NEW.correlation_key)
          );

          SELECT payload
            INTO existing_payload
            FROM public.research_case_events
           WHERE case_id = NEW.case_id
             AND correlation_key = NEW.correlation_key
           LIMIT 1;

          IF FOUND AND existing_payload IS DISTINCT FROM NEW.payload THEN
            RAISE EXCEPTION 'research_case_events correlation key replay has different payload: case_id=%, correlation_key=%', NEW.case_id, NEW.correlation_key
              USING ERRCODE = '55000';
          END IF;

          RETURN NEW;
        END;
        $fn$;

        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger
          WHERE tgrelid = 'public.research_case_events'::regclass
            AND tgname = 'apex_research_case_events_replay_integrity'
        ) THEN
          CREATE TRIGGER apex_research_case_events_replay_integrity
            BEFORE INSERT ON public.research_case_events
            FOR EACH ROW EXECUTE FUNCTION public.apex_research_case_events_replay_integrity();
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
