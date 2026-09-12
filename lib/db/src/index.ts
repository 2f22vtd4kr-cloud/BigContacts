import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const MAX_EVENTS_PER_CASE = 50_000;
const MAX_CASE_FILE_BYTES = 1_048_576;
const MAX_ENTITY_METADATA_BYTES = 262_144;
const MAX_ENTITY_NOTES_BYTES = 65_536;
const MAX_ENTITY_SOURCE_REGISTRIES_BYTES = 131_072;
const MAX_ENTITY_RESIDENCES_BYTES = 131_072;

async function ensureResearchCaseEventsImmutable(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('apex:research_case_events:immutability'))");
    await client.query(`
      DO $$
      DECLARE null_correlation_count bigint; oversized_payload_count bigint; oversized_case_count bigint; oversized_case_file_count bigint;
              oversized_metadata_count bigint; oversized_notes_count bigint; oversized_sources_count bigint; oversized_residences_count bigint;
              invalid_score_count bigint; invalid_contact_confidence_count bigint;
      BEGIN
        IF to_regclass('public.research_case_events') IS NULL THEN
          RAISE EXCEPTION 'Apex research_case_events ledger is missing; refusing to start without the provenance ledger';
        END IF;
        IF to_regclass('public.research_cases') IS NULL THEN
          RAISE EXCEPTION 'Apex research_cases table is missing; refusing to start without durable case state';
        END IF;
        IF to_regclass('public.entities') IS NULL THEN
          RAISE EXCEPTION 'Apex entities table is missing; refusing to start without durable contact state';
        END IF;
        SELECT count(*) INTO null_correlation_count FROM public.research_case_events WHERE correlation_key IS NULL;
        IF null_correlation_count > 0 THEN
          RAISE EXCEPTION 'Apex research_case_events contains % NULL correlation_key row(s); refusing to enable mandatory event identity', null_correlation_count USING ERRCODE = '55000';
        END IF;
        SELECT count(*) INTO oversized_payload_count FROM public.research_case_events WHERE octet_length(payload) > 131072;
        IF oversized_payload_count > 0 THEN
          RAISE EXCEPTION 'Apex research_case_events contains % payload(s) larger than 131072 bytes; refusing to enable the bounded ledger', oversized_payload_count USING ERRCODE = '55000';
        END IF;
        SELECT count(*) INTO oversized_case_count FROM (
          SELECT case_id FROM public.research_case_events GROUP BY case_id HAVING count(*) > 50000
        ) bounded_cases;
        IF oversized_case_count > 0 THEN
          RAISE EXCEPTION 'Apex research_case_events contains % case(s) above the 50000-event lifecycle ceiling; refusing startup until archived/remediated', oversized_case_count USING ERRCODE = '55000';
        END IF;
        SELECT count(*) INTO oversized_case_file_count FROM public.research_cases WHERE octet_length(case_file) > 1048576;
        IF oversized_case_file_count > 0 THEN
          RAISE EXCEPTION 'Apex research_cases contains % case_file value(s) larger than 1048576 bytes; refusing startup until archived/remediated', oversized_case_file_count USING ERRCODE = '55000';
        END IF;
        SELECT count(*) INTO oversized_metadata_count FROM public.entities WHERE metadata IS NOT NULL AND octet_length(metadata) > 262144;
        IF oversized_metadata_count > 0 THEN
          RAISE EXCEPTION 'Apex entities contains % metadata value(s) larger than 262144 bytes; refusing startup', oversized_metadata_count USING ERRCODE = '55000';
        END IF;
        SELECT count(*) INTO oversized_notes_count FROM public.entities WHERE notes IS NOT NULL AND octet_length(notes) > 65536;
        IF oversized_notes_count > 0 THEN
          RAISE EXCEPTION 'Apex entities contains % notes value(s) larger than 65536 bytes; refusing startup', oversized_notes_count USING ERRCODE = '55000';
        END IF;
        SELECT count(*) INTO oversized_sources_count FROM public.entities WHERE source_registries IS NOT NULL AND octet_length(source_registries) > 131072;
        IF oversized_sources_count > 0 THEN
          RAISE EXCEPTION 'Apex entities contains % source_registries value(s) larger than 131072 bytes; refusing startup', oversized_sources_count USING ERRCODE = '55000';
        END IF;
        SELECT count(*) INTO oversized_residences_count FROM public.entities WHERE known_residences IS NOT NULL AND octet_length(known_residences) > 131072;
        IF oversized_residences_count > 0 THEN
          RAISE EXCEPTION 'Apex entities contains % known_residences value(s) larger than 131072 bytes; refusing startup', oversized_residences_count USING ERRCODE = '55000';
        END IF;
        SELECT count(*) INTO invalid_score_count FROM public.entities WHERE bayesian_score < 0 OR bayesian_score > 1 OR bayesian_score IS NULL;
        IF invalid_score_count > 0 THEN
          RAISE EXCEPTION 'Apex entities contains % invalid bayesian_score value(s); expected 0..1', invalid_score_count USING ERRCODE = '55000';
        END IF;
        SELECT count(*) INTO invalid_contact_confidence_count FROM public.entities WHERE contact_confidence < 0 OR contact_confidence > 100 OR contact_confidence IS NULL;
        IF invalid_contact_confidence_count > 0 THEN
          RAISE EXCEPTION 'Apex entities contains % invalid contact_confidence value(s); expected 0..100', invalid_contact_confidence_count USING ERRCODE = '55000';
        END IF;

        ALTER TABLE public.research_case_events ALTER COLUMN correlation_key SET NOT NULL;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.research_case_events'::regclass AND conname = 'research_case_events_payload_size_ck') THEN
          ALTER TABLE public.research_case_events ADD CONSTRAINT research_case_events_payload_size_ck CHECK (octet_length(payload) <= 131072);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.research_cases'::regclass AND conname = 'research_cases_case_file_size_ck') THEN
          ALTER TABLE public.research_cases ADD CONSTRAINT research_cases_case_file_size_ck CHECK (octet_length(case_file) <= 1048576);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.entities'::regclass AND conname = 'entities_metadata_size_ck') THEN
          ALTER TABLE public.entities ADD CONSTRAINT entities_metadata_size_ck CHECK (metadata IS NULL OR octet_length(metadata) <= 262144);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.entities'::regclass AND conname = 'entities_notes_size_ck') THEN
          ALTER TABLE public.entities ADD CONSTRAINT entities_notes_size_ck CHECK (notes IS NULL OR octet_length(notes) <= 65536);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.entities'::regclass AND conname = 'entities_sources_size_ck') THEN
          ALTER TABLE public.entities ADD CONSTRAINT entities_sources_size_ck CHECK (source_registries IS NULL OR octet_length(source_registries) <= 131072);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.entities'::regclass AND conname = 'entities_residences_size_ck') THEN
          ALTER TABLE public.entities ADD CONSTRAINT entities_residences_size_ck CHECK (known_residences IS NULL OR octet_length(known_residences) <= 131072);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.entities'::regclass AND conname = 'entities_bayesian_score_range_ck') THEN
          ALTER TABLE public.entities ADD CONSTRAINT entities_bayesian_score_range_ck CHECK (bayesian_score >= 0 AND bayesian_score <= 1);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.entities'::regclass AND conname = 'entities_contact_confidence_range_ck') THEN
          ALTER TABLE public.entities ADD CONSTRAINT entities_contact_confidence_range_ck CHECK (contact_confidence >= 0 AND contact_confidence <= 100);
        END IF;
        CREATE OR REPLACE FUNCTION public.apex_research_case_events_immutable() RETURNS trigger LANGUAGE plpgsql AS $fn$
        BEGIN RAISE EXCEPTION 'research_case_events is append-only; % is forbidden', TG_OP USING ERRCODE = '55000'; END; $fn$;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.research_case_events'::regclass AND tgname = 'apex_research_case_events_no_update_delete') THEN
          CREATE TRIGGER apex_research_case_events_no_update_delete BEFORE UPDATE OR DELETE ON public.research_case_events FOR EACH ROW EXECUTE FUNCTION public.apex_research_case_events_immutable();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.research_case_events'::regclass AND tgname = 'apex_research_case_events_no_truncate') THEN
          CREATE TRIGGER apex_research_case_events_no_truncate BEFORE TRUNCATE ON public.research_case_events FOR EACH STATEMENT EXECUTE FUNCTION public.apex_research_case_events_immutable();
        END IF;
        CREATE OR REPLACE FUNCTION public.apex_research_case_events_replay_integrity() RETURNS trigger LANGUAGE plpgsql AS $fn$
        DECLARE existing_payload text; event_count bigint; stored_job_id text; event_job_id text;
        BEGIN
          IF NEW.correlation_key IS NULL THEN RAISE EXCEPTION 'research_case_events correlation_key is mandatory' USING ERRCODE = '23502'; END IF;
          PERFORM pg_advisory_xact_lock(hashtext('apex:research_case_events:case:' || NEW.case_id::text));
          SELECT count(*) INTO event_count FROM public.research_case_events WHERE case_id = NEW.case_id;
          IF event_count >= 50000 THEN
            RAISE EXCEPTION 'research case % has reached the 50000-event lifecycle ceiling; refusing another event', NEW.case_id USING ERRCODE = '54000';
          END IF;
          IF NEW.payload IS NOT NULL AND NEW.payload::jsonb ? 'jobId' THEN
            event_job_id := NULLIF(btrim(NEW.payload::jsonb ->> 'jobId'), '');
            IF event_job_id IS NOT NULL THEN
              SELECT NULLIF(btrim(case_file::jsonb ->> 'jobId'), '') INTO stored_job_id FROM public.research_cases WHERE id = NEW.case_id FOR KEY SHARE;
              IF stored_job_id IS NULL OR stored_job_id IS DISTINCT FROM event_job_id THEN
                RAISE EXCEPTION 'research_case_events job binding mismatch: case_id=%, event_job_id=%', NEW.case_id, event_job_id USING ERRCODE = '55000';
              END IF;
            END IF;
          END IF;
          PERFORM pg_advisory_xact_lock(hashtext('apex:research_case_events:replay:' || NEW.case_id::text || ':' || NEW.correlation_key));
          SELECT payload INTO existing_payload FROM public.research_case_events WHERE case_id = NEW.case_id AND correlation_key = NEW.correlation_key LIMIT 1;
          IF FOUND AND existing_payload IS DISTINCT FROM NEW.payload THEN
            RAISE EXCEPTION 'research_case_events correlation key replay has different payload: case_id=%, correlation_key=%', NEW.case_id, NEW.correlation_key USING ERRCODE = '55000';
          END IF;
          RETURN NEW;
        END; $fn$;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.research_case_events'::regclass AND tgname = 'apex_research_case_events_replay_integrity') THEN
          CREATE TRIGGER apex_research_case_events_replay_integrity BEFORE INSERT ON public.research_case_events FOR EACH ROW EXECUTE FUNCTION public.apex_research_case_events_replay_integrity();
        END IF;

        CREATE OR REPLACE FUNCTION public.apex_agentic_promotion_active_case() RETURNS trigger LANGUAGE plpgsql AS $fn$
        DECLARE old_provenance jsonb; new_provenance jsonb; entry record; job_id text; active_case_count bigint;
        BEGIN
          IF TG_OP <> 'UPDATE' OR NEW.metadata IS NOT DISTINCT FROM OLD.metadata THEN RETURN NEW; END IF;
          BEGIN old_provenance := COALESCE(OLD.metadata::jsonb -> 'agenticContactProvenance', '{}'::jsonb); EXCEPTION WHEN others THEN old_provenance := '{}'::jsonb; END;
          BEGIN new_provenance := COALESCE(NEW.metadata::jsonb -> 'agenticContactProvenance', '{}'::jsonb); EXCEPTION WHEN others THEN RETURN NEW; END;
          FOR entry IN SELECT key, value FROM jsonb_each(new_provenance) LOOP
            IF old_provenance ? entry.key AND (old_provenance -> entry.key) IS NOT DISTINCT FROM entry.value THEN CONTINUE; END IF;
            job_id := NULLIF(btrim(entry.value ->> 'jobId'), '');
            IF job_id IS NULL THEN
              RAISE EXCEPTION 'agentic contact promotion requires a durable job identity for entity %', NEW.id USING ERRCODE = '55000';
            END IF;
            SELECT count(*) INTO active_case_count
            FROM public.research_cases
            WHERE target_entity_id = NEW.id
              AND status = 'active'
              AND (
                NULLIF(btrim(case_file::jsonb ->> 'atlasJobId'), '') = job_id
                OR NULLIF(btrim(case_file::jsonb ->> 'jobId'), '') = job_id
              );
            IF active_case_count = 0 THEN
              RAISE EXCEPTION 'agentic contact promotion is fenced: entity % has no active target case bound to job %', NEW.id, job_id USING ERRCODE = '55000';
            END IF;
          END LOOP;
          RETURN NEW;
        END; $fn$;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.entities'::regclass AND tgname = 'apex_agentic_promotion_active_case') THEN
          CREATE TRIGGER apex_agentic_promotion_active_case BEFORE UPDATE ON public.entities FOR EACH ROW EXECUTE FUNCTION public.apex_agentic_promotion_active_case();
        END IF;

        CREATE OR REPLACE FUNCTION public.apex_research_case_cancellation_fence() RETURNS trigger LANGUAGE plpgsql AS $fn$
        BEGIN
          IF OLD.status = 'review'
             AND OLD.current_action IN ('canonical-atlas-cancelled', 'canonical-lease-lost')
             AND NEW.status = 'active' THEN
            RAISE EXCEPTION 'research case % is durably fenced after cancellation/lease loss; a stale worker cannot reactivate it', NEW.id USING ERRCODE = '55000';
          END IF;
          RETURN NEW;
        END; $fn$;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.research_cases'::regclass AND tgname = 'apex_research_case_cancellation_fence') THEN
          CREATE TRIGGER apex_research_case_cancellation_fence BEFORE UPDATE ON public.research_cases FOR EACH ROW EXECUTE FUNCTION public.apex_research_case_cancellation_fence();
        END IF;

        REVOKE UPDATE, DELETE, TRUNCATE ON public.research_case_events FROM PUBLIC;
      END $$;
    `);
  } finally { client.release(); }
}

await ensureResearchCaseEventsImmutable();
export const db = drizzle(pool, { schema });
export * from "./schema";
