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
#   5. Applies Bureau investigation-progress + research-depth wire-up
# ============================================================

set -e

echo "=== [1/5] Installing dependencies ==="
pnpm install --frozen-lockfile

echo "=== [2/5] Applying DB schema (additive) ==="
pnpm --filter @workspace/db run push

echo "=== [3/5] Checking for synthetic data ==="
bash scripts/check-no-synthetic-data.sh

echo "=== [4/5] Installing Python OSINT tools (Holehe · Maigret) ==="
bash scripts/install-python-tools.sh

echo "=== [5/5] Applying Bureau progress + research-depth wire-up ==="
if [ -f scripts/apply-bureau-progress.mjs ]; then
  node scripts/apply-bureau-progress.mjs
else
  echo "WARN: scripts/apply-bureau-progress.mjs missing — skip"
fi
if [ -f scripts/apply-research-depth.mjs ]; then
  node scripts/apply-research-depth.mjs
else
  echo "WARN: scripts/apply-research-depth.mjs missing — skip"
fi

echo ""
echo "✅ Post-merge setup complete."
echo "   Start workflows: Redis → API Server → apex-finder web"
echo "   Optional: RESEARCH_DEPTH=fast|standard|deep (default standard)"
echo "   All Python OSINT tools (Holehe, Maigret) verified above."
echo "   API server will auto-start ingestion if DB is empty."
