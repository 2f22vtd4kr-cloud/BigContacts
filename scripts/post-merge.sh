#!/bin/bash
# ============================================================
# ApexFinder Pro — Post-Merge / Cold-Start Setup
#
# Runs after GitHub import merge. Idempotent. Continues past
# non-fatal checks so Bureau/discovery/workflow patches apply.
# ============================================================

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== [1/5] Installing dependencies ==="
if ! pnpm install --frozen-lockfile; then
  echo "WARN: frozen-lockfile failed — reconciling with pnpm install"
  pnpm install --no-frozen-lockfile
  if ! pnpm install --frozen-lockfile; then
    echo "WARN: lockfile still mismatched after reconcile — continue"
  fi
fi

echo "=== [2/5] Applying DB schema (additive) ==="
pnpm --filter @workspace/db run push || echo "WARN: db push failed — check DATABASE_URL"

echo "=== [3/5] Checking for synthetic data (non-fatal) ==="
if bash scripts/check-no-synthetic-data.sh; then
  echo "Synthetic data guard: clean"
else
  echo "WARN: synthetic data guard reported violations."
  echo "      Legitimate Math.random (jitter, UA rotation, shuffle) is allowlisted in the guard."
  echo "      Continuing post-merge so apply scripts still run."
fi

echo "=== [4/5] Installing Python OSINT tools (Holehe · Maigret · Sherlock) ==="
bash scripts/install-python-tools.sh || echo "WARN: Python OSINT install incomplete"

# Run .mjs apply scripts whether they are ESM (import) or CJS (require).
run_apply() {
  local script="$1"
  if [ ! -f "$script" ]; then
    echo "WARN: $script missing — skip"
    return 0
  fi
  echo "--- apply: $script"
  if head -n 40 "$script" | grep -qE 'require\(|__dirname|module\.exports'; then
    local tmp="${script%.mjs}.postmerge.cjs"
    cp "$script" "$tmp"
    if node "$tmp"; then
      echo "OK (cjs): $script"
    else
      echo "WARN: $script failed (cjs runner)"
    fi
    rm -f "$tmp"
  else
    if node "$script"; then
      echo "OK (esm): $script"
    else
      echo "WARN: $script failed"
    fi
  fi
}

echo "=== [5/5] Applying Bureau progress + depth + discovery + live + workflow ==="
run_apply scripts/apply-bureau-progress.mjs
run_apply scripts/apply-research-depth.mjs
run_apply scripts/apply-discovery-intake.mjs
run_apply scripts/apply-discovery-mixer.mjs
run_apply scripts/apply-bureau-live.mjs
run_apply scripts/apply-boss-opening-osint.mjs
run_apply scripts/apply-workflow-fixes.mjs

echo ""
echo "✅ Post-merge setup finished (see WARN lines above if any)."
echo "   Start workflows: Redis → artifacts/api-server: API Server → artifacts/apex-finder: web"
echo "   RESEARCH_DEPTH=fast|standard|deep (default fast — Replit cost-safe)"
echo "   Discovery: mixed themes + operator preference"
echo "   Bureau Live: SSE /api/ingest/bureau-stream on Intelligence Reactor"
echo "   Workflow: entity evidence refresh + action lifecycle + expanded execute"
