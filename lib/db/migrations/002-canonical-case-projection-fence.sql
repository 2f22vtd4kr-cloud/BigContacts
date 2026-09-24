-- Apex Atlas projection fence hardening.
-- Run after 001-apex-invariants.sql and before starting the API process.
-- A stale worker may finish in-flight work after an operator stop or lease loss;
-- the durable marker itself must therefore be immutable at the database boundary.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public.apex_research_case_terminal_projection_fence()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF OLD.status = 'cancelled' AND (
    NEW.status IS DISTINCT FROM OLD.status
    OR NEW.current_action IS DISTINCT FROM OLD.current_action
  ) THEN
    RAISE EXCEPTION 'research case % is durably cancelled; stale workers cannot rewrite terminal cancellation state', OLD.id
      USING ERRCODE='55000';
  END IF;

  IF OLD.status = 'review'
     AND OLD.current_action IN ('canonical-atlas-cancelled', 'canonical-lease-lost')
     AND (
       NEW.status IS DISTINCT FROM OLD.status
       OR NEW.current_action IS DISTINCT FROM OLD.current_action
     ) THEN
    RAISE EXCEPTION 'research case % has an immutable canonical cancellation/lease-loss marker; stale workers cannot overwrite it', OLD.id
      USING ERRCODE='55000';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS apex_research_case_terminal_projection_fence ON public.research_cases;
CREATE TRIGGER apex_research_case_terminal_projection_fence
BEFORE UPDATE ON public.research_cases
FOR EACH ROW
EXECUTE FUNCTION public.apex_research_case_terminal_projection_fence();

COMMIT;
