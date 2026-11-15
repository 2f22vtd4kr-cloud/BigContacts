#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"

# CI must exercise the same complete, explicitly opted-in schema lifecycle as
# Replit startup. This installs the Drizzle schema, invariants, and committed
# Apex migrations 002–007 (including the durable LLM usage ledger).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

export APEX_ALLOW_SCHEMA_PUSH=true
bash scripts/initialize-apex-schema.sh
