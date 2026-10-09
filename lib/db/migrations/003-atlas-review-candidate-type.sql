-- Apex Atlas: review-only discovered people are not established HNWIs.
-- Run explicitly against the intended database after deploying the code:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f lib/db/migrations/003-atlas-review-candidate-type.sql
-- Only reclassify rows carrying the canonical discovery admission markers.
-- Malformed/legacy metadata is left untouched for manual review.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '90s';

DO $$
DECLARE
  candidate record;
  parsed_metadata jsonb;
BEGIN
  IF to_regclass('public.entities') IS NULL THEN
    RAISE EXCEPTION 'Apex entities table is missing; refusing candidate taxonomy migration';
  END IF;

  FOR candidate IN
    SELECT id, metadata
    FROM public.entities
    WHERE type = 'HNWI'
      AND metadata IS NOT NULL
      AND metadata LIKE '%investigator-explicit-promotion%'
  LOOP
    BEGIN
      parsed_metadata := candidate.metadata::jsonb;
      IF jsonb_typeof(parsed_metadata) = 'object'
        AND parsed_metadata->>'reviewOnly' = 'true'
        AND parsed_metadata->>'admission' = 'investigator-explicit-promotion'
      THEN
        UPDATE public.entities
        SET type = 'PersonCandidate', updated_at = now()
        WHERE id = candidate.id AND type = 'HNWI';
      END IF;
    EXCEPTION
      WHEN invalid_text_representation THEN
        -- Preserve malformed historical metadata rather than casting it in bulk.
        CONTINUE;
    END;
  END LOOP;
END $$;

COMMIT;
