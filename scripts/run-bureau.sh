#!/usr/bin/env bash
# Canonical Apex Atlas bureau launch — same body as UI and api defaults.
set -euo pipefail
BASE="${1:-http://127.0.0.1:8080}"
BODY='{
  "discoveryFirst": true,
  "targetCount": 50,
  "researchLimit": 10,
  "runResearch": true,
  "hotLeadsOnly": false,
  "skipFaa": true,
  "broadCategories": 3,
  "batchSize": 50,
  "phaseJBatchSize": 10,
  "targetTimeoutMs": 420000
}'
echo "POST ${BASE}/api/ingest/atlas-run"
curl -sS -X POST "${BASE}/api/ingest/atlas-run" \
  -H "Content-Type: application/json" \
  -d "${BODY}"
echo
