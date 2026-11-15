-- Durable per-provider/model/day LLM usage and budget state.
-- No prompt, completion, target, contact or source content is stored.
BEGIN;
CREATE TABLE IF NOT EXISTS public.agentic_llm_daily_usage (
  id serial PRIMARY KEY,
  usage_date date NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  success_count integer NOT NULL DEFAULT 0 CHECK (success_count >= 0),
  failure_count integer NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  prompt_tokens integer NOT NULL DEFAULT 0 CHECK (prompt_tokens >= 0),
  cached_prompt_tokens integer NOT NULL DEFAULT 0 CHECK (cached_prompt_tokens >= 0),
  completion_tokens integer NOT NULL DEFAULT 0 CHECK (completion_tokens >= 0),
  total_tokens integer NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  estimated_tokens integer NOT NULL DEFAULT 0 CHECK (estimated_tokens >= 0),
  reserved_tokens integer NOT NULL DEFAULT 0 CHECK (reserved_tokens >= 0),
  daily_budget_tokens integer NOT NULL DEFAULT 0 CHECK (daily_budget_tokens >= 0),
  budget_exhausted boolean NOT NULL DEFAULT false,
  last_provider_status text,
  last_provider_error_code text,
  last_rate_limit_remaining_tokens integer,
  last_rate_limit_reset_tokens_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agentic_llm_daily_usage_model_day_uidx UNIQUE (usage_date, provider, model)
);
CREATE INDEX IF NOT EXISTS agentic_llm_daily_usage_date_idx
  ON public.agentic_llm_daily_usage (usage_date);
COMMIT;
