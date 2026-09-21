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

echo "[apex-schema] verifying required Apex durable tables..."
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
  ];
  const result = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1::text[])",
    [required],
  );
  const found = new Set(result.rows.map((row) => row.table_name));
  const missing = required.filter((name) => !found.has(name));
  if (missing.length) throw new Error(`Apex schema verification failed; missing: ${missing.join(", ")}`);
  console.log("[apex-schema] required durable tables present.");
} finally {
  await pool.end();
}
NODE
)

echo "[apex-schema] complete. Disable APEX_ALLOW_SCHEMA_PUSH before ordinary application boot."
