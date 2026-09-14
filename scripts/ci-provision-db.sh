#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"

MIGRATION_DIR="./drizzle"
rm -rf "$MIGRATION_DIR"
trap 'rm -rf "$MIGRATION_DIR"' EXIT

timeout 120s pnpm exec drizzle-kit generate \
  --config ./drizzle.config.ts \
  --name ci_schema \
  --ignore-conflicts

shopt -s nullglob
migrations=("$MIGRATION_DIR"/*/migration.sql)
if [ "${#migrations[@]}" -eq 0 ]; then
  echo "CI database provisioning generated no migration SQL" >&2
  exit 1
fi

for migration in "${migrations[@]}"; do
  echo "Applying generated schema migration: ${migration}"
  timeout 120s psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"
done
