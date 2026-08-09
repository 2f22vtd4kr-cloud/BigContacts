#!/bin/bash
# ============================================================
# ApexFinder Pro — Post-Merge / Cold-Start Setup
#
# Runs automatically after every GitHub import merge.
# Safe to run repeatedly (idempotent).
#
# What this does:
#   1. Installs all pnpm workspace dependencies
#   2. Applies any new DB schema columns/tables (additive only)
#   3. Verifies no synthetic data crept in
#   4. Installs Python OSINT tools
#   5. Applies Bureau investigation-progress wire-up (idempotent)
#
# What happens automatically AFTER this (on API server boot):
#   - Ghost active-job locks from the previous process are cleared
#   - If the DB is empty, FAA + Land Registry + Western HNWI
#     ingestion start automatically (see src/lib/startup.ts)
#
# IMPORTANT — Upstash dedup across imports:
#   The Upstash dedup set (apex:dedup:hnwi) persists across imports.
#   If FAA inserts 0 records after a fresh import, it means all records
#   are already in the dedup set from a prior session.
#   To re-ingest from scratch: DELETE /api/ingest/dedup  (clears the set)
#   The cold-start auto-ingestion does NOT clear dedup — it respects it.
#
# Secrets needed (set once in Replit Secrets, persist across imports):
#   SESSION_SECRET          — Express session signing
#   REDIS_URL_1             — Upstash Redis (dedup + job state persistence)
#   COMPANIES_HOUSE_API_KEY — UK officer address enrichment (optional but recommended)
# ============================================================

set -e

echo "=== [1/5] Installing dependencies ==="
pnpm install --frozen-lockfile

echo "=== [2/5] Applying DB schema (additive) ==="
pnpm --filter @workspace/db run push

echo "=== [3/5] Checking for synthetic data ==="
bash scripts/check-no-synthetic-data.sh

echo "=== [4/5] Installing Python OSINT tools (Holehe · Maigret) ==="
# MANDATORY — Apex Atlas must not run research without these tools installed.
# Holehe: email → 120+ platform presence check
# Maigret: username → 3,000+ social platform dossier
bash scripts/install-python-tools.sh

echo "=== [5/5] Applying Bureau investigation-progress wire-up ==="
# Idempotent: wires investigationProgress + Apex Atlas Boss prompt + verified-personal UI markers
# Modules already on main; this completes case-bureau.ts + research.tsx integration.
if [ -f scripts/apply-bureau-progress.mjs ]; then
  node scripts/apply-bureau-progress.mjs
else
  echo "WARN: scripts/apply-bureau-progress.mjs missing — skip (pull latest main)"
fi

echo ""
echo "✅ Post-merge setup complete."
echo "   Start workflows: Redis → API Server → apex-finder web"
echo "   All Python OSINT tools (Holehe, Maigret) verified above."
echo "   API server will auto-start ingestion if DB is empty."
