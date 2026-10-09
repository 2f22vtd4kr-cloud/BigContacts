-- Apex Atlas: reclassify only still-pending legacy registry rows whose old
-- ingestion logic overstated a person's wealth or misclassified a corporate filer.
-- Review this migration before running it against a production database:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f lib/db/migrations/004-registry-candidate-truth.sql
--
-- This migration is intentionally narrower than "all rows that ever had a filing":
-- it requires the old ingestion markers, exact source/form metadata, pending
-- enrichment, and no explicit trusted-admission marker. It never rewrites evidence.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '90s';

DO $$
DECLARE
  candidate record;
  parsed_metadata jsonb;
  source_name text;
  normalized_form text;
  next_type text;
  correction_reason text;
  observed_at text;
  corrected_count bigint := 0;
BEGIN
  IF to_regclass('public.entities') IS NULL THEN
    RAISE EXCEPTION 'Apex entities table is missing; refusing registry-classification correction';
  END IF;

  FOR candidate IN
    SELECT id, type, metadata, estimated_net_worth, contact_outcome
    FROM public.entities
    WHERE type IN ('HNWI', 'Gatekeeper')
      AND metadata IS NOT NULL
      AND (metadata LIKE '%companies-house-officers%' OR metadata LIKE '%sec-edgar%')
      AND (metadata LIKE '%westernIngest%' OR metadata LIKE '%randomDiscovery%')
      AND (metadata LIKE '%needsEnrichment%')
  LOOP
    BEGIN
      parsed_metadata := candidate.metadata::jsonb;
    EXCEPTION
      WHEN invalid_text_representation THEN
        -- Historical malformed metadata is left untouched for manual review.
        CONTINUE;
    END;

    IF jsonb_typeof(parsed_metadata) <> 'object' THEN
      CONTINUE;
    END IF;

    -- Preserve rows that have an explicit trusted promotion/adjudication marker,
    -- or a source-level confirmation. Registry provenance alone is insufficient.
    IF parsed_metadata->>'admission' = 'investigator-explicit-promotion'
       OR parsed_metadata->>'wealthStatus' IN ('verified', 'established')
       OR parsed_metadata->>'reviewOnly' = 'false'
    THEN
      CONTINUE;
    END IF;

    IF parsed_metadata->>'needsEnrichment' <> 'true'
       OR NOT (
         parsed_metadata->>'westernIngest' = 'true'
         OR parsed_metadata->>'randomDiscovery' = 'true'
       )
    THEN
      CONTINUE;
    END IF;

    source_name := lower(COALESCE(parsed_metadata->>'source', ''));
    normalized_form := upper(regexp_replace(
      COALESCE(parsed_metadata->>'formType', ''),
      '[[:space:]/]+',
      '',
      'g'
    ));
    next_type := NULL;
    correction_reason := NULL;

    IF source_name = 'companies-house-officers'
       AND candidate.type IN ('HNWI', 'Gatekeeper')
    THEN
      next_type := 'PersonCandidate';
      correction_reason := 'Companies House officer appointment is not proof of personal wealth or a trusted gatekeeper role.';
    ELSIF source_name = 'sec-edgar'
       AND (normalized_form LIKE 'SC13D%' OR normalized_form LIKE 'SC13G%')
       AND candidate.type IN ('HNWI', 'Gatekeeper')
    THEN
      next_type := 'PersonCandidate';
      correction_reason := 'SEC beneficial-ownership filing is a review lead; personal identity, current ownership, and wealth threshold require adjudication.';
    ELSIF source_name = 'sec-edgar'
       AND normalized_form LIKE 'DEF14A%'
       AND candidate.type = 'Gatekeeper'
    THEN
      next_type := 'Corporation';
      correction_reason := 'SEC DEF 14A identifies a proxy-statement filer; it does not make the filer a personal gatekeeper.';
    END IF;

    IF next_type IS NULL THEN
      CONTINUE;
    END IF;

    observed_at := COALESCE(parsed_metadata->>'lastObservedAt', parsed_metadata->>'lastVerified');
    parsed_metadata := parsed_metadata - 'lastVerified';

    IF next_type = 'PersonCandidate' THEN
      parsed_metadata := parsed_metadata || jsonb_build_object(
        'reviewOnly', true,
        'wealthStatus', 'unverified',
        'proximityScore', 3,
        'confidence', 'LOW',
        'lastObservedAt', observed_at,
        'classificationCorrectionReason', correction_reason,
        'classificationCorrectedAt', now()::text
      );
    ELSE
      parsed_metadata := parsed_metadata || jsonb_build_object(
        'reviewOnly', false,
        'wealthStatus', 'not_assessed',
        'proximityScore', 3,
        'confidence', 'LOW',
        'lastObservedAt', observed_at,
        'classificationCorrectionReason', correction_reason,
        'classificationCorrectedAt', now()::text
      );
    END IF;

    UPDATE public.entities
    SET type = next_type,
        bayesian_score = LEAST(COALESCE(bayesian_score, 0.15), 0.25),
        metadata = parsed_metadata::text,
        updated_at = now()
    WHERE id = candidate.id
      AND type = candidate.type;

    corrected_count := corrected_count + 1;
  END LOOP;

  RAISE NOTICE 'Registry classification migration corrected % pending legacy row(s)', corrected_count;
END $$;

COMMIT;
