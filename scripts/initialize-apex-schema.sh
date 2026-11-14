#!/usr/bin/env bash
set -euo pipefail

# Deliberate first-time/maintenance schema operation.
# Ordinary API boot intentionally does NOT mutate production schema.
if [[ "${APEX_ALLOW_SCHEMA_PUSH:-false}" != "true" ]]; then
  echo "[apex-schema] refusing implicit schema mutation."
  echo "[apex-schema] re-run with APEX_ALLOW_SCHEMA_PUSH=true during an explicit migration window."
  exit 2
fi

LOCK_DIR="/tmp/apex-schema-push.lock"
LOCK_WAIT_SECONDS="${APEX_SCHEMA_LOCK_WAIT_SECONDS:-120}"
LOCK_START="$(date +%s)"
while ! mkdir "$LOCK_DIR" 2>/dev/null; do
  NOW="$(date +%s)"
  if (( NOW - LOCK_START >= LOCK_WAIT_SECONDS )); then
    echo "[apex-schema] another schema operation is still running after ${LOCK_WAIT_SECONDS}s; refusing to race it."
    exit 11
  fi
  sleep 1
done
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

echo "[apex-schema] acquired single-writer schema lock."
echo "[apex-schema] applying the repository's current Drizzle schema..."
pnpm --filter @workspace/db run push

echo "[apex-schema] applying Apex durable hardening and compatibility migrations..."
pnpm --filter @workspace/db run harden
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f lib/db/migrations/002-contact-outcome.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f lib/db/migrations/003-atlas-review-candidate-type.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f lib/db/migrations/004-registry-candidate-truth.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f lib/db/migrations/005-agentic-llm-daily-usage.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f lib/db/migrations/006-agentic-llm-rate-limit-headers.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f lib/db/migrations/007-agentic-llm-attempt-context.sql

echo "[apex-schema] verifying required Apex durable tables and invariants..."
(cd lib/db && node --input-type=module <<'NODE'
import pg from "pg";
const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be available from the platform for schema verification.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const required = [
    "research_case_events",
    "research_cases",
    "entities",
    "research_sessions",
    "research_run_events",
    "research_evidence",
    "contact_evidence",
    "agentic_llm_daily_usage",
  ];
  const result = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1::text[])",
    [required],
  );
  const found = new Set(result.rows.map((row) => row.table_name));
  const missing = required.filter((name) => !found.has(name));
  if (missing.length) throw new Error(`Apex schema verification failed; missing: ${missing.join(", ")}`);
  const quotaColumns = [
    "last_rate_limit_remaining_tokens",
    "last_rate_limit_reset_tokens_ms",
    "last_rate_limit_remaining_requests",
    "last_rate_limit_reset_requests_ms",
    "reasoning_tokens",
    "last_job_id",
    "last_case_id",
    "last_role",
    "last_decision_id",
    "last_cognitive_task",
    "last_iteration",
    "last_request_success",
    "last_request_at",
  ];
  const columnResult = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='agentic_llm_daily_usage' AND column_name = ANY($1::text[])",
    [quotaColumns],
  );
  const foundColumns = new Set(columnResult.rows.map((row) => row.column_name));
  const missingColumns = quotaColumns.filter((name) => !foundColumns.has(name));
  if (missingColumns.length) throw new Error(`Apex quota ledger verification failed; missing columns: ${missingColumns.join(", ")}`);
  console.log("[apex-schema] required durable tables and quota columns present.");
} finally {
  await pool.end();
}
NODE
)

echo "[apex-schema] complete. Disable APEX_ALLOW_SCHEMA_PUSH before ordinary application boot."
