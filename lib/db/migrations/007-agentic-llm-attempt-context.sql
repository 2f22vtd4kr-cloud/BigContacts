-- Preserve the provider's observed reasoning-token count and the most
-- recent request's investigation context in the aggregate per-model/day ledger.
-- No prompts, completions, contact values, target names or source text are stored.
BEGIN;
ALTER TABLE public.agentic_llm_daily_usage
  ADD COLUMN IF NOT EXISTS reasoning_tokens integer NOT NULL DEFAULT 0 CHECK (reasoning_tokens >= 0),
  ADD COLUMN IF NOT EXISTS last_job_id text,
  ADD COLUMN IF NOT EXISTS last_case_id integer,
  ADD COLUMN IF NOT EXISTS last_role text,
  ADD COLUMN IF NOT EXISTS last_decision_id text,
  ADD COLUMN IF NOT EXISTS last_cognitive_task text,
  ADD COLUMN IF NOT EXISTS last_iteration integer,
  ADD COLUMN IF NOT EXISTS last_request_success boolean,
  ADD COLUMN IF NOT EXISTS last_request_at timestamptz;
COMMIT;
