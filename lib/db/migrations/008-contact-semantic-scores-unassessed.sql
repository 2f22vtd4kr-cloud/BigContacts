-- Semantic contact scores are unassessed unless an Investigator decision is durably present.
-- Preserve historical heuristic values in explicitly named legacy columns before
-- clearing the active score fields; old heuristics must never masquerade as model assessments.
BEGIN;
ALTER TABLE public.contact_evidence
  ADD COLUMN IF NOT EXISTS legacy_source_reliability double precision,
  ADD COLUMN IF NOT EXISTS legacy_identity_match double precision,
  ADD COLUMN IF NOT EXISTS legacy_recency_score double precision,
  ADD COLUMN IF NOT EXISTS legacy_directness_score double precision;

UPDATE public.contact_evidence
SET legacy_source_reliability = COALESCE(legacy_source_reliability, source_reliability),
    legacy_identity_match = COALESCE(legacy_identity_match, identity_match),
    legacy_recency_score = COALESCE(legacy_recency_score, recency_score),
    legacy_directness_score = COALESCE(legacy_directness_score, directness_score)
WHERE source_reliability IS NOT NULL
   OR identity_match IS NOT NULL
   OR recency_score IS NOT NULL
   OR directness_score IS NOT NULL;

ALTER TABLE public.contact_evidence
  ALTER COLUMN source_reliability DROP NOT NULL,
  ALTER COLUMN identity_match DROP NOT NULL,
  ALTER COLUMN recency_score DROP NOT NULL,
  ALTER COLUMN directness_score DROP NOT NULL;

UPDATE public.contact_evidence
SET source_reliability = NULL,
    identity_match = NULL,
    recency_score = NULL,
    directness_score = NULL;
COMMIT;
