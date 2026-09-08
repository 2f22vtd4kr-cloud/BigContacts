#!/bin/bash
# ============================================================
# Apex Atlas — Post-Merge / Cold-Start Verification
#
# Imports must never rewrite canonical runtime source. Historical
# apply-* scripts remain available for archaeology only; production
# source changes belong in Git and must be committed explicitly.
# ============================================================

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== [1/5] Installing dependencies ==="
if ! pnpm install --frozen-lockfile; then
  echo "ERROR: frozen-lockfile install failed. Refusing to mutate source or reconcile silently."
  exit 1
fi

echo "=== [2/5] Applying DB schema (additive) ==="
pnpm --filter @workspace/db run push || echo "WARN: db push failed — check DATABASE_URL"

echo "=== [3/5] Checking for synthetic data ==="
if ! bash scripts/check-no-synthetic-data.sh; then
  echo "ERROR: synthetic data guard reported violations."
  exit 1
fi
echo "Synthetic data guard: clean"

echo "=== [4/5] Installing Python OSINT tools (Holehe · Maigret · Sherlock) ==="
bash scripts/install-python-tools.sh || echo "WARN: Python OSINT install incomplete"
echo "=== [5/5] Verifying canonical architecture (NO APPLY SCRIPTS) ==="
pnpm run check:bureau
pnpm --dir artifacts/api-server run typecheck
pnpm --dir artifacts/apex-finder run build
pnpm --dir artifacts/api-server run build

# The build/test lifecycle is now required to be source-pure. Any tracked
# mutation is a hard failure instead of something a Replit boot script repairs.
if ! git diff --quiet -- . ':(exclude)pnpm-lock.yaml'; then
  echo "ERROR: build/check lifecycle mutated tracked source."
  git diff --stat
  git diff -- . ':(exclude)pnpm-lock.yaml'
  exit 1
fi

echo ""
echo "Post-merge verification finished. Canonical source was not rewritten."
echo "If a check fails, fix the source, commit it, and rerun verification."
echo "Start workflows: Redis → artifacts/api-server: API Server → artifacts/apex-finder: web"
echo "RESEARCH_DEPTH=fast|standard|deep"
echo "Discovery: model-selected mixed-source people discovery"
echo "Bureau Live: /api/ingest/bureau-stream on Intelligence Reactor"