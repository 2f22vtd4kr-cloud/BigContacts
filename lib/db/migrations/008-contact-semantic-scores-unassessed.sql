-- Semantic contact scores are unassessed unless an Investigator decision is durably present.
-- Historical numeric heuristics were not model assessments; clear them rather than
-- presenting them as neutral confidence or source-quality scores.
BEGIN;
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
