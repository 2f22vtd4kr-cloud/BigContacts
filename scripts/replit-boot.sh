#!/usr/bin/env bash
set -euo pipefail
export CI=true
export PORT="${PORT:-8080}"
export ENABLE_AUTO_PIPELINE="${ENABLE_AUTO_PIPELINE:-false}"
export APEX_SKIP_SEMANTIC="${APEX_SKIP_SEMANTIC:-1}"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"
export NPM_CONFIG_REGISTRY="${NPM_CONFIG_REGISTRY:-https://registry.npmjs.org}"
# Replit's single long-running API workflow can legitimately spend several
# minutes inside one standard Dig. Disable stale auto-clear for this managed
# process; operators can still stop/clear a job explicitly through atlas-lock.
export ATLAS_DISABLE_AUTO_CLEAR="${ATLAS_DISABLE_AUTO_CLEAR:-true}"
# Single Upstash secret is enough: REDIS_URL_1 is the bureau permanent store.
export ENABLE_REDIS_ON_BOOT="${ENABLE_REDIS_ON_BOOT:-true}"
if [[ -z "${REDIS_URL:-}" && -n "${REDIS_URL_1:-}" ]]; then
  export REDIS_URL="${REDIS_URL_1}"
fi
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
echo "[replit-boot] $(git log -1 --oneline 2>/dev/null || echo unknown)"
fuser -k "${PORT}/tcp" 2>/dev/null || true
sleep 1
# Runtime hardening is canonical source now. Boot must never rewrite TS files.
# Production schema changes are an explicit deployment operation, never an
# implicit side effect of starting a replica. Set APEX_ALLOW_SCHEMA_PUSH=true
# only during a deliberate schema migration window.
if [[ "${APEX_ALLOW_SCHEMA_PUSH:-false}" == "true" ]]; then
  pnpm --filter @workspace/db run push
else
  echo "[replit-boot] schema push skipped (set APEX_ALLOW_SCHEMA_PUSH=true only for an explicit migration)"
fi
if [[ ! -f artifacts/apex-finder/dist/public/index.html ]]; then
  pnpm --dir artifacts/apex-finder run build
fi
test -f artifacts/apex-finder/dist/public/index.html
pnpm --dir artifacts/api-server run build
exec pnpm --filter @workspace/api-server run start
