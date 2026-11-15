-- Preserve the latest provider-observed request and token quota headers per model/day.
-- Safe for both fresh installs and databases that already applied migration 005.
BEGIN;
ALTER TABLE public.agentic_llm_daily_usage
  ADD COLUMN IF NOT EXISTS last_rate_limit_remaining_requests integer,
  ADD COLUMN IF NOT EXISTS last_rate_limit_reset_requests_ms integer;
COMMIT;
