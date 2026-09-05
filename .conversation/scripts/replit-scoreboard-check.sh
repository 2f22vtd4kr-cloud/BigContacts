#!/usr/bin/env bash
# Operator scoreboard check after re-cook (Vol 68/76/100).
set -euo pipefail
HOST="${1:-http://127.0.0.1:8080}"
echo "== healthz =="
curl -sS "$HOST/api/healthz" | head -c 2000 || true
echo
echo "== scoreboard-snapshot =="
curl -sS "$HOST/api/ingest/scoreboard-snapshot?limit=20"
echo
echo "== tip =="
git rev-parse --short HEAD 2>/dev/null || true
