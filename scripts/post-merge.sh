#!/bin/bash
# ============================================================
# ApexFinder Pro — Post-Merge / Cold-Start Setup
#
# Runs automatically after every GitHub import merge.
# Safe to run repeatedly (idempotent).
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

echo "=== [5/5] Applying Bureau progress + research-depth + discovery mixer ==="
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
if [ -f scripts/apply-discovery-mixer.mjs ]; then
  node scripts/apply-discovery-mixer.mjs
else
  echo "WARN: scripts/apply-discovery-mixer.mjs missing — skip"
fi

echo ""
echo "✅ Post-merge setup complete."
echo "   Start workflows: Redis → API Server → apex-finder web"
echo "   RESEARCH_DEPTH=fast|standard|deep (default fast — Replit cost-safe)"
echo "   Discovery: randomized mix of Western registries + FAA + web recipes"
echo "   All Python OSINT tools (Holehe, Maigret) verified above."
echo "   API server will auto-start ingestion if DB is empty."
