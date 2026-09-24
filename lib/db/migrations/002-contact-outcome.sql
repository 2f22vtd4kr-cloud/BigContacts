-- Apex Atlas schema compatibility: persist the current J0 contact outcome contract.
-- Run explicitly during the development schema migration window:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f lib/db/migrations/002-contact-outcome.sql
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '90s';

DO $$
BEGIN
  IF to_regclass('public.entities') IS NULL THEN
    RAISE EXCEPTION 'Apex entities table is missing; refusing contact_outcome migration';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'entities'
      AND column_name = 'contact_outcome'
  ) THEN
    ALTER TABLE public.entities ADD COLUMN contact_outcome text;
  END IF;
END $$;

COMMIT;
